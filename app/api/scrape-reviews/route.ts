import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type ApifyReviewItem = {
  user?: { username?: string; name?: string };
  reviewer?: { name?: string };
  rating?: number | string;
  stars?: number | string;
  text?: string;
  snippet?: string;
  publishedDate?: string;
  publishedAtDate?: string;
  date?: string;
  ownerResponse?: unknown;
  responseFromOwnerText?: unknown;
  name?: string;
  [key: string]: unknown;
};

type ApifyRun = {
  id: string;
  status: string;
  defaultDatasetId?: string;
};

const APIFY_BASE_URL = "https://api.apify.com/v2";
const ACTOR_IDS = {
  tripadvisor: "Hvp4YfFGyLM635Q2F",
  google: "Xb8osYTtOjlsgI6k9",
  booking: "", // placeholder for now
} as const;

export const runtime = "nodejs";

function normalizeRating(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") {
    const clamped = Math.max(1, Math.min(5, value));
    return Math.round(clamped); // Ensure integer 1-5
  }
  const n = parseInt(String(value), 10);
  if (Number.isNaN(n)) return null;
  const clamped = Math.max(1, Math.min(5, n));
  return Math.round(clamped);
}

function getDayBounds(dateValue: string | null) {
  if (!dateValue) return null;
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return null;

  // Normalize to UTC day bounds so time-of-day differences are ignored.
  const start = new Date(
    Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate(), 0, 0, 0, 0),
  );
  const end = new Date(
    Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate() + 1, 0, 0, 0, 0),
  );

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      hotel_id?: string;
      url?: string;
      platform?: "tripadvisor" | "google" | "booking";
    };
    const { hotel_id, url } = body;
    const platform =
      body.platform === "google"
        ? "google"
        : body.platform === "booking"
          ? "booking"
          : "tripadvisor";

    if (!hotel_id || !url) {
      return NextResponse.json(
        { success: false, error: "hotel_id, url, and platform are required" },
        { status: 400 },
      );
    }

    const apifyToken = process.env.APIFY_API_TOKEN;
    // Debug logging removed (avoid leaking env details in production).
    if (!apifyToken) {
      return NextResponse.json(
        { success: false, error: "APIFY_API_TOKEN is not configured" },
        { status: 500 },
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Supabase environment variables are not configured",
        },
        { status: 500 },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // 2. Start Apify actor run
    const actorId = ACTOR_IDS[platform];
    if (!actorId) {
      return NextResponse.json(
        { success: false, error: `No Apify actor configured for ${platform}` },
        { status: 400 },
      );
    }
    const actorInput =
      platform === "google"
        ? {
            startUrls: [{ url }],
            maxReviews: 20,
            language: "en",
            personalData: true,
          }
        : platform === "booking"
          ? {
              startUrls: [{ url }],
              maxReviews: 20,
              language: "en",
            }
        : {
            startUrls: [{ url }],
            maxReviews: 20,
            language: "en",
          };

    const startRunRes = await fetch(
      `${APIFY_BASE_URL}/acts/${encodeURIComponent(actorId)}/runs`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apifyToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(actorInput),
      },
    );

    if (!startRunRes.ok) {
      const text = await startRunRes.text();
      return NextResponse.json(
        {
          success: false,
          error: "Failed to start Apify run",
          details: text,
        },
        { status: 502 },
      );
    }

    const startRunJson = (await startRunRes.json()) as { data?: ApifyRun };
    const run = startRunJson.data;
    if (!run?.id) {
      return NextResponse.json(
        { success: false, error: "Apify run did not return an id" },
        { status: 502 },
      );
    }

    // 3. Poll run status every 3 seconds until SUCCEEDED
    let runStatus = run.status;
    let datasetId = run.defaultDatasetId;

    const terminalStatuses = new Set([
      "SUCCEEDED",
      "FAILED",
      "ABORTED",
      "TIMED-OUT",
    ]);

    while (!terminalStatuses.has(runStatus)) {
      await sleep(3000);

      const runRes = await fetch(
        `${APIFY_BASE_URL}/actor-runs/${encodeURIComponent(run.id)}`,
        {
          headers: {
            Authorization: `Bearer ${apifyToken}`,
          },
        },
      );

      if (!runRes.ok) {
        const text = await runRes.text();
        return NextResponse.json(
          {
            success: false,
            error: "Failed to poll Apify run",
            details: text,
          },
          { status: 502 },
        );
      }

      const runJson = (await runRes.json()) as { data?: ApifyRun };
      const current = runJson.data;
      if (!current) break;

      runStatus = current.status;
      datasetId = current.defaultDatasetId ?? datasetId;
    }

    if (runStatus !== "SUCCEEDED") {
      return NextResponse.json(
        {
          success: false,
          error: `Apify run did not succeed (status: ${runStatus})`,
        },
        { status: 502 },
      );
    }

    if (!datasetId) {
      return NextResponse.json(
        { success: false, error: "Apify run did not produce a dataset" },
        { status: 502 },
      );
    }

    // 4. Fetch results from dataset
    const itemsRes = await fetch(
      `${APIFY_BASE_URL}/datasets/${encodeURIComponent(datasetId)}/items`,
      {
        headers: {
          Authorization: `Bearer ${apifyToken}`,
        },
      },
    );

    if (!itemsRes.ok) {
      const text = await itemsRes.text();
      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch Apify dataset items",
          details: text,
        },
        { status: 502 },
      );
    }

    const items = (await itemsRes.json()) as ApifyReviewItem[];
    console.log("[scrape-reviews] Apify items returned:", Array.isArray(items) ? items.length : 0);

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    // 5. Build rows; 6. Skip duplicates (same reviewer_name + review_date + hotel_id)
    const reviewerName = (item: ApifyReviewItem) =>
      platform === "google"
        ? item.name ?? item.reviewer?.name ?? "Anonymous"
        : platform === "booking"
          ? String((item.author as string) ?? (item.reviewer as string) ?? "Anonymous")
        : item.user?.name ?? item.user?.username ?? "Anonymous";

    const rowsToInsert: Array<{
      hotel_id: string;
      platform: string;
      reviewer_name: string | null;
      rating: number | null;
      review_text: string | null;
      review_date: string | null;
      sentiment: null;
      responded: boolean;
    }> = [];
    let skippedDuplicates = 0;

    for (const item of items) {
      const name = reviewerName(item);
      const reviewDate =
        platform === "google"
          ? item.publishedAtDate ?? item.date ?? null
          : platform === "booking"
            ? (item.date as string | null | undefined) ??
              (item.stayDate as string | null | undefined) ??
              null
          : item.publishedDate ?? null;
      const rating =
        platform === "google"
          ? normalizeRating(item.stars || item.rating || null)
          : platform === "booking"
            ? normalizeRating(
                (item.rating as number | string | null | undefined) ??
                  (item.score as number | string | null | undefined),
              )
          : normalizeRating(item.rating);
      const reviewText =
        platform === "google"
          ? item.text ?? item.snippet ?? null
          : platform === "booking"
            ? (item.positive as string | null | undefined) ??
              item.text ??
              null
          : item.text ?? null;
      const responded =
        platform === "google"
          ? Boolean(item.responseFromOwnerText)
          : platform === "booking"
            ? false
          : Boolean(item.ownerResponse);

      // Skip duplicate only when reviewer_name matches and review_date is on the same day.
      const dayBounds = getDayBounds(reviewDate);
      let existing: { id: string } | null = null;

      if (dayBounds) {
        const { data } = await supabase
          .from("reviews")
          .select("id")
          .eq("hotel_id", hotel_id)
          .eq("reviewer_name", name)
          .gte("review_date", dayBounds.startIso)
          .lt("review_date", dayBounds.endIso)
          .limit(1)
          .maybeSingle();
        existing = data as { id: string } | null;
      } else {
        const { data } = await supabase
          .from("reviews")
          .select("id")
          .eq("hotel_id", hotel_id)
          .eq("reviewer_name", name)
          .eq("review_date", reviewDate)
          .limit(1)
          .maybeSingle();
        existing = data as { id: string } | null;
      }

      if (existing) {
        skippedDuplicates += 1;
        continue;
      }

      rowsToInsert.push({
        hotel_id,
        platform,
        reviewer_name: name,
        rating,
        review_text: reviewText,
        review_date: reviewDate,
        sentiment: null,
        responded,
      });
    }

    if (rowsToInsert.length === 0) {
      console.log("[scrape-reviews] Duplicates skipped:", skippedDuplicates);
      console.log("[scrape-reviews] Inserted reviews:", 0);
      return NextResponse.json({ success: true, count: 0 });
    }

    const { error: insertError } = await supabase
      .from("reviews")
      .insert(rowsToInsert);

    if (insertError) {
      console.log("[scrape-reviews] Duplicates skipped:", skippedDuplicates);
      console.log("[scrape-reviews] Inserted reviews:", 0);
      console.error("[scrape-reviews] Insert error:", insertError);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to insert reviews into Supabase",
          details: insertError.message,
        },
        { status: 500 },
      );
    }

    console.log("[scrape-reviews] Duplicates skipped:", skippedDuplicates);
    console.log("[scrape-reviews] Inserted reviews:", rowsToInsert.length);

    return NextResponse.json({
      success: true,
      count: rowsToInsert.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}

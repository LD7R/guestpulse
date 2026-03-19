import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type ApifyReviewItem = {
  user?: { username?: string; name?: string };
  rating?: number | string;
  text?: string;
  publishedDate?: string;
  ownerResponse?: unknown;
  [key: string]: unknown;
};

type ApifyRun = {
  id: string;
  status: string;
  defaultDatasetId?: string;
};

const APIFY_BASE_URL = "https://api.apify.com/v2";
const APIFY_ACTOR_ID = "automation-lab~tripadvisor-scraper";

export const runtime = "nodejs";

function normalizeRating(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") {
    const clamped = Math.max(1, Math.min(5, value));
    return Math.round(clamped);
  }
  const n = parseInt(String(value), 10);
  if (Number.isNaN(n)) return null;
  const clamped = Math.max(1, Math.min(5, n));
  return Math.round(clamped);
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      hotel_id?: string;
      tripadvisor_url?: string;
    };
    const { hotel_id, tripadvisor_url } = body;

    if (!hotel_id || !tripadvisor_url) {
      return NextResponse.json(
        { success: false, error: "hotel_id and tripadvisor_url are required" },
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
    const startRunRes = await fetch(
      `${APIFY_BASE_URL}/acts/${encodeURIComponent(APIFY_ACTOR_ID)}/runs`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apifyToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startUrls: [{ url: tripadvisor_url }],
          maxReviews: 50,
          language: "en",
        }),
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

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    // 5. Build rows; 6. Skip duplicates (same reviewer_name + review_date + hotel_id)
    const reviewerName = (item: ApifyReviewItem) =>
      item.user?.name ?? item.user?.username ?? "Anonymous";

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

    for (const item of items) {
      const name = reviewerName(item);
      const reviewDate = item.publishedDate ?? null;
      const rating = normalizeRating(item.rating);
      const reviewText = item.text ?? null;
      const responded = Boolean(item.ownerResponse);

      // Skip duplicate: same reviewer_name + review_date + hotel_id
      const { data: existing } = await supabase
        .from("reviews")
        .select("id")
        .eq("hotel_id", hotel_id)
        .eq("reviewer_name", name)
        .eq("review_date", reviewDate)
        .limit(1)
        .maybeSingle();

      if (existing) continue;

      rowsToInsert.push({
        hotel_id,
        platform: "tripadvisor",
        reviewer_name: name,
        rating,
        review_text: reviewText,
        review_date: reviewDate,
        sentiment: null,
        responded,
      });
    }

    if (rowsToInsert.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    const { error: insertError } = await supabase
      .from("reviews")
      .insert(rowsToInsert);

    if (insertError) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to insert reviews into Supabase",
          details: insertError.message,
        },
        { status: 500 },
      );
    }

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

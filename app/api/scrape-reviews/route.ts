import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type TripAdvisorReview = {
  id?: string;
  userName?: string;
  publishedAt?: string;
  rating?: number | string;
  bubbleRating?: number | string;
  reviewRating?: number | string;
  text?: string;
  title?: string;
  [key: string]: unknown;
};

type ApifyRun = {
  id: string;
  status: string;
  defaultDatasetId?: string;
};

const APIFY_BASE_URL = "https://api.apify.com/v2";
const APIFY_ACTOR_ID = "apify/tripadvisor-scraper";

function normalizeRating(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(n)) return null;
  const clamped = Math.max(1, Math.min(5, n));
  return Math.round(clamped);
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: NextRequest) {
  try {
    const { hotel_id, tripadvisor_url } = (await request.json()) as {
      hotel_id?: string;
      tripadvisor_url?: string;
    };

    if (!hotel_id || !tripadvisor_url) {
      return NextResponse.json(
        { error: "hotel_id and tripadvisor_url are required" },
        { status: 400 },
      );
    }

    const apifyToken = process.env.APIFY_API_TOKEN;
    if (!apifyToken) {
      return NextResponse.json(
        { error: "APIFY_API_TOKEN is not configured" },
        { status: 500 },
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Supabase environment variables are not configured" },
        { status: 500 },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
      },
    });

    // 1–2. Start Apify TripAdvisor scraper run
    const startRunRes = await fetch(
      `${APIFY_BASE_URL}/acts/${encodeURIComponent(APIFY_ACTOR_ID)}/runs`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apifyToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: {
            startUrls: [{ url: tripadvisor_url }],
            maxReviews: 50,
          },
        }),
      },
    );

    if (!startRunRes.ok) {
      const text = await startRunRes.text();
      return NextResponse.json(
        { error: "Failed to start Apify run", details: text },
        { status: 502 },
      );
    }

    const startRunJson = (await startRunRes.json()) as { data?: ApifyRun };
    const run = startRunJson.data;
    if (!run?.id) {
      return NextResponse.json(
        { error: "Apify run did not return an id" },
        { status: 502 },
      );
    }

    // 3. Poll Apify run until finished
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
          { error: "Failed to poll Apify run", details: text },
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
        { error: `Apify run did not succeed (status: ${runStatus})` },
        { status: 502 },
      );
    }

    if (!datasetId) {
      return NextResponse.json(
        { error: "Apify run did not produce a dataset" },
        { status: 502 },
      );
    }

    // 4. Fetch results from Apify dataset
    const itemsRes = await fetch(
      `${APIFY_BASE_URL}/datasets/${encodeURIComponent(
        datasetId,
      )}/items?clean=true&format=json`,
      {
        headers: {
          Authorization: `Bearer ${apifyToken}`,
        },
      },
    );

    if (!itemsRes.ok) {
      const text = await itemsRes.text();
      return NextResponse.json(
        { error: "Failed to fetch Apify dataset items", details: text },
        { status: 502 },
      );
    }

    const items = (await itemsRes.json()) as TripAdvisorReview[];

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    // 5. Insert reviews into Supabase
    const rows = items.map((item) => {
      const rating =
        normalizeRating(item.rating) ??
        normalizeRating(item.bubbleRating) ??
        normalizeRating(item.reviewRating);

      return {
        hotel_id,
        platform: "tripadvisor",
        reviewer_name: item.userName ?? null,
        rating: rating ?? null,
        review_text: item.text ?? item.title ?? null,
        review_date: item.publishedAt ?? null,
        sentiment: null,
        responded: false,
      };
    });

    const { error: insertError, count } = await supabase
      .from("reviews")
      .insert(rows, { count: "exact" });

    if (insertError) {
      return NextResponse.json(
        { error: "Failed to insert reviews into Supabase", details: insertError.message },
        { status: 500 },
      );
    }

    // 6. Return success with count
    return NextResponse.json({
      success: true,
      count: typeof count === "number" ? count : rows.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


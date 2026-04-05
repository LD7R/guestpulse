import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const TERMINAL = ["SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT", "TIMED_OUT"] as const;
const MAX_POLL_MS = 5 * 60 * 1000;

type ApifyRun = {
  id?: string;
  status?: string;
  defaultDatasetId?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      hotel_name?: string;
      city?: string;
      country?: string;
      google_url?: string;
    };

    const { hotel_name, city, country, google_url } = body;

    if (!hotel_name?.trim() && !city?.trim()) {
      return NextResponse.json(
        { success: false, error: "Hotel name or city required" },
        { status: 400 },
      );
    }

    const apifyToken = process.env.APIFY_API_TOKEN;
    if (!apifyToken) {
      return NextResponse.json(
        { success: false, error: "APIFY_API_TOKEN is not configured" },
        { status: 500 },
      );
    }

    const searchQuery = city?.trim()
      ? `boutique hotels in ${city.trim()} ${country?.trim() || ""}`.trim()
      : `hotels near ${hotel_name?.trim() || "hotel"}`;

    const startRunRes = await fetch("https://api.apify.com/v2/acts/Xb8osYTtOjlsgI6k9/runs", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apifyToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        searchStringsArray: [searchQuery],
        maxCrawledPlacesPerSearch: 10,
        language: "en",
        maxReviews: 0,
        exportPlaceUrls: true,
      }),
    });

    const runData = (await startRunRes.json()) as {
      data?: ApifyRun;
      error?: { message?: string };
    };
    const run = runData.data;

    if (!run?.id) {
      const msg = runData.error?.message ?? "Failed to start search";
      return NextResponse.json(
        { success: false, error: startRunRes.ok ? "Failed to start search" : msg },
        { status: 502 },
      );
    }

    let status = run.status ?? "READY";
    let datasetId = run.defaultDatasetId;
    const pollStarted = Date.now();

    while (!TERMINAL.includes(status as (typeof TERMINAL)[number])) {
      if (Date.now() - pollStarted > MAX_POLL_MS) {
        return NextResponse.json(
          { success: false, error: "Search timed out" },
          { status: 504 },
        );
      }
      await new Promise((r) => setTimeout(r, 3000));
      const pollRes = await fetch(`https://api.apify.com/v2/actor-runs/${run.id}`, {
        headers: { Authorization: `Bearer ${apifyToken}` },
      });
      const pollData = (await pollRes.json()) as { data?: ApifyRun };
      status = pollData.data?.status ?? status;
      datasetId = pollData.data?.defaultDatasetId ?? datasetId;
    }

    if (status !== "SUCCEEDED") {
      return NextResponse.json(
        { success: false, error: "Search did not complete" },
        { status: 502 },
      );
    }

    if (!datasetId) {
      return NextResponse.json(
        { success: false, error: "No dataset from search" },
        { status: 502 },
      );
    }

    const itemsRes = await fetch(
      `https://api.apify.com/v2/datasets/${datasetId}/items?clean=true`,
      { headers: { Authorization: `Bearer ${apifyToken}` } },
    );
    const items = (await itemsRes.json()) as unknown;

    const list = Array.isArray(items) ? items : [];

    if (!Array.isArray(list) || list.length === 0) {
      return NextResponse.json({
        success: true,
        competitors: [] as unknown[],
        search_query: searchQuery,
      });
    }

    type PlaceItem = {
      title?: string;
      url?: string;
      website?: string;
      phone?: string;
      address?: string;
      categoryName?: string;
      totalScore?: number;
      reviewsCount?: number;
      googleMapsUrl?: string;
    };

    const ownName = (hotel_name ?? "").toLowerCase().trim();
    const ownFirst = ownName.split(/\s+/).filter(Boolean)[0] ?? "";

    const competitors = (list as PlaceItem[])
      .filter((item) => {
        const itemName = (item.title ?? "").toLowerCase();
        if (ownFirst && itemName.includes(ownFirst)) {
          return false;
        }
        const score = item.totalScore;
        const n = item.reviewsCount ?? 0;
        return score != null && n > 0;
      })
      .slice(0, 8)
      .map((item) => ({
        name: item.title ?? "Unknown Hotel",
        google_url: item.url ?? item.googleMapsUrl ?? "",
        address: item.address ?? "",
        avg_rating: item.totalScore ?? null,
        total_reviews: item.reviewsCount ?? 0,
        category: item.categoryName ?? "Hotel",
        website: item.website ?? "",
        phone: item.phone ?? "",
        tripadvisor_search: `https://www.tripadvisor.com/Search?q=${encodeURIComponent(item.title ?? "")}`,
      }));

    return NextResponse.json({
      success: true,
      competitors,
      search_query: searchQuery,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

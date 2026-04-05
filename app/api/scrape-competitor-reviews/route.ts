/**
 * Run in Supabase:
 * alter table public.competitors
 *   add column if not exists recent_snippets text;
 *
 * Cheap competitor sync: Google Maps place summary + up to 3 review snippets only.
 * TripAdvisor / Booking skipped for competitors.
 */
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase";
import { extractCoordsFromGoogleMapsUrl } from "@/lib/extract-google-maps-coords";

export const runtime = "nodejs";
export const maxDuration = 120;

const APIFY_BASE_URL = "https://api.apify.com/v2";
const GOOGLE_ACTOR = "Xb8osYTtOjlsgI6k9";
const TERMINAL = new Set(["SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT", "TIMED_OUT"]);

type ApifyRun = { id?: string; status?: string; defaultDatasetId?: string };

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readLocation(item: Record<string, unknown>): { lat: number; lng: number } | null {
  const loc = item.location;
  if (loc && typeof loc === "object") {
    const o = loc as Record<string, unknown>;
    const lat = o.lat ?? o.latitude;
    const lng = o.lng ?? o.longitude;
    if (typeof lat === "number" && typeof lng === "number" && !Number.isNaN(lat + lng)) {
      return { lat, lng };
    }
  }
  const gps = item.gpsCoordinates;
  if (gps && typeof gps === "object") {
    const o = gps as Record<string, unknown>;
    const lat = o.latitude ?? o.lat;
    const lng = o.longitude ?? o.lng;
    if (typeof lat === "number" && typeof lng === "number" && !Number.isNaN(lat + lng)) {
      return { lat, lng };
    }
  }
  return null;
}

function parsePlaceSummary(items: unknown[]): {
  totalScore: number | null;
  reviewsCount: number;
  address: string | null;
  lat: number | null;
  lng: number | null;
} | null {
  for (const raw of items) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    const totalScore = typeof item.totalScore === "number" ? item.totalScore : null;
    let reviewsCount = 0;
    if (typeof item.reviewsCount === "number") reviewsCount = item.reviewsCount;
    else if (typeof item.reviewsCount === "string") {
      const n = parseInt(item.reviewsCount, 10);
      reviewsCount = Number.isNaN(n) ? 0 : n;
    }

    if (totalScore == null && reviewsCount === 0) continue;

    const address = typeof item.address === "string" ? item.address : null;
    const loc = readLocation(item);
    return {
      totalScore,
      reviewsCount,
      address,
      lat: loc?.lat ?? null,
      lng: loc?.lng ?? null,
    };
  }
  return null;
}

function parseReviewSnippets(items: unknown[], limit: number): string[] {
  const snippets: string[] = [];
  const seen = new Set<string>();

  for (const raw of items) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;

    const isReviewLike =
      item.stars != null ||
      item.rating != null ||
      item.publishedAtDate != null ||
      item.publishedAtDateTime != null ||
      item.date != null;

    const rawText =
      (typeof item.text === "string" && item.text.trim()
        ? item.text
        : typeof item.snippet === "string"
          ? item.snippet
          : "") || "";

    if (!rawText.trim()) continue;
    if (!isReviewLike && typeof item.totalScore === "number" && rawText.length < 50) continue;

    const slice = rawText.trim().slice(0, 200);
    if (slice.length < 12) continue;
    const key = slice.slice(0, 80);
    if (seen.has(key)) continue;
    seen.add(key);
    snippets.push(slice);
    if (snippets.length >= limit) break;
  }

  return snippets;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { competitor_id?: string };
    const competitorId = body.competitor_id?.trim();
    if (!competitorId) {
      return NextResponse.json({ success: false, error: "competitor_id is required" }, { status: 400 });
    }

    const apifyToken = process.env.APIFY_API_TOKEN;
    if (!apifyToken) {
      return NextResponse.json(
        { success: false, error: "APIFY_API_TOKEN is not configured" },
        { status: 500 },
      );
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { data: comp, error: fetchErr } = await supabase
      .from("competitors")
      .select("id, google_url, name")
      .eq("id", competitorId)
      .maybeSingle();

    if (fetchErr) {
      return NextResponse.json({ success: false, error: fetchErr.message }, { status: 500 });
    }
    if (!comp) {
      return NextResponse.json({ success: false, error: "Competitor not found" }, { status: 404 });
    }

    const googleUrl = typeof comp.google_url === "string" ? comp.google_url.trim() : "";
    if (!googleUrl) {
      return NextResponse.json(
        { success: false, error: "Add a Google Maps URL for this competitor to sync." },
        { status: 400 },
      );
    }

    const startRunRes = await fetch(`${APIFY_BASE_URL}/acts/${encodeURIComponent(GOOGLE_ACTOR)}/runs`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apifyToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startUrls: [{ url: googleUrl }],
        maxReviews: 3,
        language: "en",
      }),
    });

    if (!startRunRes.ok) {
      const text = await startRunRes.text();
      return NextResponse.json(
        { success: false, error: "Failed to start Apify run", details: text },
        { status: 502 },
      );
    }

    const startJson = (await startRunRes.json()) as { data?: ApifyRun };
    const run = startJson.data;
    if (!run?.id) {
      return NextResponse.json({ success: false, error: "Apify did not return a run id" }, { status: 502 });
    }

    let status = run.status ?? "READY";
    let datasetId = run.defaultDatasetId;
    const pollStarted = Date.now();
    const maxPollMs = 3 * 60 * 1000;

    while (!TERMINAL.has(status)) {
      if (Date.now() - pollStarted > maxPollMs) {
        return NextResponse.json({ success: false, error: "Sync timed out" }, { status: 504 });
      }
      await sleep(3000);
      const pollRes = await fetch(`${APIFY_BASE_URL}/actor-runs/${encodeURIComponent(run.id)}`, {
        headers: { Authorization: `Bearer ${apifyToken}` },
      });
      const pollJson = (await pollRes.json()) as { data?: ApifyRun };
      status = pollJson.data?.status ?? status;
      datasetId = pollJson.data?.defaultDatasetId ?? datasetId;
    }

    if (status !== "SUCCEEDED") {
      return NextResponse.json(
        { success: false, error: `Apify run did not succeed (${status})` },
        { status: 502 },
      );
    }

    if (!datasetId) {
      return NextResponse.json({ success: false, error: "No dataset from Apify" }, { status: 502 });
    }

    const itemsRes = await fetch(
      `${APIFY_BASE_URL}/datasets/${encodeURIComponent(datasetId)}/items?clean=true`,
      { headers: { Authorization: `Bearer ${apifyToken}` } },
    );
    const items = (await itemsRes.json()) as unknown[];
    const list = Array.isArray(items) ? items : [];

    const place = parsePlaceSummary(list);
    if (!place) {
      return NextResponse.json(
        {
          success: false,
          error: "Could not read place summary from Google Maps. Check the URL and try again.",
        },
        { status: 502 },
      );
    }

    let snippets: string[] = [];
    const first = list[0];
    if (first && typeof first === "object") {
      const row = first as Record<string, unknown>;
      const nested = row.reviews;
      if (Array.isArray(nested) && nested.length > 0) {
        snippets = nested.slice(0, 3).map((r) => {
          const o = r as Record<string, unknown>;
          const t =
            (typeof o.text === "string" ? o.text : "") ||
            (typeof o.snippet === "string" ? o.snippet : "");
          return t.trim().slice(0, 150);
        }).filter((s) => s.length > 0);
      }
    }
    if (snippets.length === 0) {
      snippets = parseReviewSnippets(list, 3);
    }

    const recentSnippetsJson = JSON.stringify(snippets);

    const urlCoords = extractCoordsFromGoogleMapsUrl(googleUrl);
    const lat = place.lat ?? urlCoords?.latitude ?? null;
    const lng = place.lng ?? urlCoords?.longitude ?? null;

    const nowIso = new Date().toISOString();

    const updatePayload: Record<string, unknown> = {
      avg_rating: place.totalScore,
      total_reviews: place.reviewsCount,
      address: place.address,
      latitude: lat,
      longitude: lng,
      updated_at: nowIso,
      last_synced_at: nowIso,
      recent_snippets: recentSnippetsJson,
    };

    const { error: upErr } = await supabase
      .from("competitors")
      .update(updatePayload)
      .eq("id", competitorId);

    if (upErr) {
      return NextResponse.json({ success: false, error: upErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      avg_rating: place.totalScore,
      total_reviews: place.reviewsCount,
      snippets_count: snippets.length,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

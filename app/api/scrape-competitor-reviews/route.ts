/**
 * Cheap competitor sync: Google Maps place summary + review snippets.
 * competitors.last_synced_at — canonical “last synced”.
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

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { competitor_id?: string; hotel_id?: string };
    const competitorId = body.competitor_id?.trim();
    const bodyHotelId = body.hotel_id?.trim();
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
      .select("id, google_url, name, hotel_id")
      .eq("id", competitorId)
      .maybeSingle();

    if (fetchErr) {
      return NextResponse.json({ success: false, error: fetchErr.message }, { status: 500 });
    }
    if (!comp) {
      return NextResponse.json({ success: false, error: "Competitor not found" }, { status: 404 });
    }

    const { data: ownedHotel, error: ownErr } = await supabase
      .from("hotels")
      .select("id")
      .eq("id", comp.hotel_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (ownErr) {
      return NextResponse.json({ success: false, error: ownErr.message }, { status: 500 });
    }
    if (!ownedHotel) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    if (bodyHotelId && bodyHotelId !== comp.hotel_id) {
      return NextResponse.json(
        { success: false, error: "hotel_id does not match this competitor" },
        { status: 400 },
      );
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
        maxReviews: 1,
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

    const raw = list[0];
    if (!raw || typeof raw !== "object") {
      return NextResponse.json(
        { success: false, error: "Could not read place data from Google Maps. Check the URL and try again." },
        { status: 502 },
      );
    }

    const place = raw as Record<string, unknown>;

    const avg_rating =
      place.totalScore != null && place.totalScore !== ""
        ? Math.round(Number(place.totalScore) * 10) / 10
        : null;

    let total_reviews = 0;
    if (typeof place.reviewsCount === "number") total_reviews = place.reviewsCount;
    else if (typeof place.reviewsCount === "string") {
      const n = parseInt(place.reviewsCount, 10);
      total_reviews = Number.isNaN(n) ? 0 : n;
    }

    const loc = place.location;
    let latitude: number | null = null;
    let longitude: number | null = null;
    if (loc && typeof loc === "object") {
      const o = loc as Record<string, unknown>;
      const lat = o.lat ?? o.latitude;
      const lng = o.lng ?? o.longitude;
      if (typeof lat === "number" && typeof lng === "number") {
        latitude = lat;
        longitude = lng;
      }
    }

    const address = typeof place.address === "string" ? place.address : null;

    const reviewsArr = place.reviews;
    let recent_snippets: string | null = null;
    if (Array.isArray(reviewsArr)) {
      const parts = reviewsArr
        .slice(0, 3)
        .map((r) => {
          if (!r || typeof r !== "object") return "";
          const o = r as Record<string, unknown>;
          const t = typeof o.text === "string" ? o.text : "";
          return t.trim().slice(0, 150);
        })
        .filter(Boolean);
      recent_snippets = parts.length ? parts.join(" | ") : null;
    }

    const urlCoords = extractCoordsFromGoogleMapsUrl(googleUrl);
    if (latitude == null && urlCoords) latitude = urlCoords.latitude;
    if (longitude == null && urlCoords) longitude = urlCoords.longitude;

    const nowIso = new Date().toISOString();

    const updatePayload: Record<string, unknown> = {
      avg_rating,
      total_reviews,
      latitude,
      longitude,
      address,
      recent_snippets,
      last_synced_at: nowIso,
      updated_at: nowIso,
    };

    const { error: upErr } = await supabase.from("competitors").update(updatePayload).eq("id", competitorId);

    if (upErr) {
      return NextResponse.json({ success: false, error: upErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      avg_rating,
      total_reviews,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

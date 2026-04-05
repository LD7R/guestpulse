/**
 * POST { hotel_id } — Apify Google Maps search + Claude Haiku to suggest up to 5 competitors.
 * Requires APIFY_API_TOKEN, ANTHROPIC_API_KEY. Hotel must belong to the authenticated user.
 */
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 300;

const TERMINAL = ["SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT", "TIMED_OUT"] as const;
const MAX_POLL_MS = 5 * 60 * 1000;
const APIFY_ACTOR = "Xb8osYTtOjlsgI6k9";
const APIFY_BASE = "https://api.apify.com/v2";

type ApifyRun = {
  id?: string;
  status?: string;
  defaultDatasetId?: string;
};

type PlaceItem = {
  title?: string;
  url?: string;
  address?: string;
  categoryName?: string;
  categories?: string[];
  totalScore?: number;
  reviewsCount?: number;
  googleMapsUrl?: string;
};

type Suggestion = {
  name: string;
  google_url: string;
  avg_rating: number;
  total_reviews: number;
  address: string;
  latitude: number | null;
  longitude: number | null;
  reason: string;
};

function coordsFromUrl(url: string | null | undefined): { latitude: number; longitude: number } | null {
  const u = url?.trim();
  if (!u) return null;
  const match = u.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (!match) return null;
  return { latitude: parseFloat(match[1]!), longitude: parseFloat(match[2]!) };
}

/** Decode /place/.../ segment from a Google Maps URL when city/country are missing. */
function placeNameFromGoogleUrl(url: string | null | undefined): string | null {
  const u = url?.trim();
  if (!u) return null;
  const m = u.match(/\/place\/([^/@?]+)/);
  if (!m?.[1]) return null;
  try {
    const decoded = decodeURIComponent(m[1].replace(/\+/g, " "));
    const t = decoded.replace(/\/$/, "").trim();
    return t.length > 1 ? t : null;
  } catch {
    return null;
  }
}

function parseSuggestionsJson(text: string): Suggestion[] | null {
  const trimmed = text.trim();
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed as Suggestion[];
  } catch {
    const match = trimmed.match(/\[[\s\S]*\]/);
    if (!match) return null;
    try {
      const parsed = JSON.parse(match[0]) as unknown;
      return Array.isArray(parsed) ? (parsed as Suggestion[]) : null;
    } catch {
      return null;
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { hotel_id?: string };
    const hotelId = body.hotel_id?.trim();
    if (!hotelId) {
      return NextResponse.json({ success: false, error: "hotel_id is required" }, { status: 400 });
    }

    const apifyToken = process.env.APIFY_API_TOKEN;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!apifyToken) {
      return NextResponse.json(
        { success: false, error: "APIFY_API_TOKEN is not configured" },
        { status: 500 },
      );
    }
    if (!anthropicKey) {
      return NextResponse.json(
        { success: false, error: "ANTHROPIC_API_KEY is not configured" },
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

    const { data: hotel, error: hotelErr } = await supabase
      .from("hotels")
      .select("id, name, address, city, country, google_url, tripadvisor_url, latitude, longitude")
      .eq("id", hotelId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (hotelErr) {
      return NextResponse.json({ success: false, error: hotelErr.message }, { status: 500 });
    }
    if (!hotel) {
      return NextResponse.json({ success: false, error: "Hotel not found" }, { status: 404 });
    }

    const { data: reviewRows } = await supabase.from("reviews").select("rating").eq("hotel_id", hotelId);
    const ratings = (reviewRows ?? [])
      .map((r: { rating: number | null }) => r.rating)
      .filter((x): x is number => typeof x === "number" && !Number.isNaN(x));
    const avgRating =
      ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;

    const country = typeof hotel.country === "string" ? hotel.country.trim() : "";
    const city = typeof hotel.city === "string" ? hotel.city.trim() : "";
    const googleUrl = typeof hotel.google_url === "string" ? hotel.google_url.trim() : "";

    let searchQuery: string;
    /** Shown in Claude prompt (city/country or fallback description). */
    let locationLabel: string;

    if (city) {
      searchQuery = country ? `hotels near ${city} ${country}`.trim() : `hotels near ${city}`.trim();
      locationLabel = country ? `${city}, ${country}` : city;
    } else {
      const coords = coordsFromUrl(googleUrl);
      if (coords) {
        searchQuery = country
          ? `hotels near ${coords.latitude},${coords.longitude} ${country}`.trim()
          : `hotels near ${coords.latitude},${coords.longitude}`.trim();
        locationLabel = country
          ? `${coords.latitude}, ${coords.longitude} (${country}, from Google Maps URL)`
          : `${coords.latitude}, ${coords.longitude} (from Google Maps URL)`;
      } else {
        const place = placeNameFromGoogleUrl(googleUrl);
        if (!place) {
          return NextResponse.json(
            {
              success: false,
              error:
                "Add your hotel city and country in Settings, or save a Google Maps URL that includes @coordinates or a /place/ name.",
            },
            { status: 400 },
          );
        }
        searchQuery = country ? `hotels near ${place} ${country}`.trim() : `hotels near ${place}`.trim();
        locationLabel = country ? `${place}, ${country} (from Google Maps URL)` : `${place} (from Google Maps URL)`;
      }
    }

    const startRunRes = await fetch(`${APIFY_BASE}/acts/${encodeURIComponent(APIFY_ACTOR)}/runs`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apifyToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        searchStringsArray: [searchQuery],
        maxCrawledPlacesPerSearch: 10,
        maxReviews: 1,
        language: "en",
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
        return NextResponse.json({ success: false, error: "Search timed out" }, { status: 504 });
      }
      await new Promise((r) => setTimeout(r, 3000));
      const pollRes = await fetch(`${APIFY_BASE}/actor-runs/${run.id}`, {
        headers: { Authorization: `Bearer ${apifyToken}` },
      });
      const pollData = (await pollRes.json()) as { data?: ApifyRun };
      status = pollData.data?.status ?? status;
      datasetId = pollData.data?.defaultDatasetId ?? datasetId;
    }

    if (status !== "SUCCEEDED") {
      return NextResponse.json({ success: false, error: "Search did not complete" }, { status: 502 });
    }

    if (!datasetId) {
      return NextResponse.json({ success: false, error: "No dataset from search" }, { status: 502 });
    }

    const itemsRes = await fetch(
      `${APIFY_BASE}/datasets/${datasetId}/items?clean=true`,
      { headers: { Authorization: `Bearer ${apifyToken}` } },
    );
    const items = (await itemsRes.json()) as unknown;
    const list = Array.isArray(items) ? items : [];

    if (list.length === 0) {
      return NextResponse.json({ success: true, suggestions: [], found: 0, search_query: searchQuery });
    }

    const nearbyHotels = (list as PlaceItem[]).map((h) => {
      const cats =
        Array.isArray(h.categories) && h.categories.length > 0
          ? h.categories
          : h.categoryName
            ? [h.categoryName]
            : [];
      return {
        title: h.title ?? "Unknown",
        totalScore: h.totalScore,
        reviewsCount: h.reviewsCount ?? 0,
        address: h.address ?? "",
        categories: cats,
        url: h.url ?? h.googleMapsUrl ?? "",
      };
    });

    const hotelName = typeof hotel.name === "string" ? hotel.name : "Hotel";
    const hotelAddress = typeof hotel.address === "string" ? hotel.address : "";
    const ratingLabel = avgRating != null ? String(avgRating.toFixed(2)) : "unknown";

    const nearbyBlock = nearbyHotels
      .map((h, i) => {
        const catStr = h.categories?.length ? h.categories.join(", ") : "hotel";
        return `${i + 1}. ${h.title}
   Rating: ${h.totalScore ?? "unknown"}★
   Reviews: ${h.reviewsCount ?? 0}
   Address: ${h.address}
   Category: ${catStr}
   URL: ${h.url}`;
      })
      .join("\n");

    const prompt = `You are a hotel market analyst. 
I need to find the best competitors to benchmark against 
for this hotel:

MY HOTEL:
Name: ${hotelName}
Location: ${locationLabel}
Address: ${hotelAddress}
Current rating: ${ratingLabel}★
TripAdvisor: ${hotel.tripadvisor_url ? "yes" : "no"}

NEARBY HOTELS FOUND:
${nearbyBlock}

Select the 5 most relevant competitors to benchmark against.
Criteria:
- Similar price/service class (similar rating range ±1 star)
- Similar size and type (boutique, business, resort etc)
- Same city or very close area
- Exclude my own hotel if it appears
- Prefer hotels with more reviews (better data)

Respond with ONLY a JSON array, no markdown:
[
  {
    "name": "Hotel Name",
    "google_url": "full google maps url",
    "avg_rating": 4.2,
    "total_reviews": 1234,
    "address": "full address",
    "latitude": -7.123,
    "longitude": 110.456,
    "reason": "Similar boutique style, same area, 4.1★"
  }
]`;

    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const claudeData = (await claudeRes.json()) as {
      content?: Array<{ text?: string }>;
      error?: { message?: string };
    };

    if (!claudeRes.ok) {
      const msg = claudeData.error?.message ?? "Claude request failed";
      return NextResponse.json({ success: false, error: msg }, { status: 502 });
    }

    const text = claudeData.content?.[0]?.text?.trim();
    if (!text) {
      return NextResponse.json({ success: false, error: "Empty AI response" }, { status: 502 });
    }

    let parsed = parseSuggestionsJson(text);
    if (!parsed) {
      return NextResponse.json({ success: false, error: "Could not parse AI response as JSON array" }, { status: 502 });
    }

    parsed = parsed.map((row) => {
      const url = typeof row.google_url === "string" ? row.google_url : "";
      let latitude = typeof row.latitude === "number" ? row.latitude : null;
      let longitude = typeof row.longitude === "number" ? row.longitude : null;
      const fromUrl = coordsFromUrl(url);
      if (fromUrl) {
        latitude = fromUrl.latitude;
        longitude = fromUrl.longitude;
      }
      return {
        name: String(row.name ?? "Unknown"),
        google_url: url,
        avg_rating: typeof row.avg_rating === "number" ? row.avg_rating : 0,
        total_reviews: typeof row.total_reviews === "number" ? row.total_reviews : 0,
        address: typeof row.address === "string" ? row.address : "",
        latitude,
        longitude,
        reason: typeof row.reason === "string" ? row.reason : "",
      };
    });

    return NextResponse.json({
      success: true,
      suggestions: parsed,
      found: parsed.length,
      search_query: searchQuery,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

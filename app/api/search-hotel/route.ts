import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 120;

/* ── Apify polling helper ──────────────────────────────────── */
async function apifyPoll(
  token: string,
  runId: string,
  initialDatasetId: string,
  maxAttempts = 15,
): Promise<{ datasetId: string; succeeded: boolean }> {
  let status = "RUNNING";
  let datasetId = initialDatasetId;
  let attempts = 0;

  while (!["SUCCEEDED", "FAILED", "ABORTED"].includes(status) && attempts < maxAttempts) {
    await new Promise((r) => setTimeout(r, 3000));
    const poll = await fetch(`https://api.apify.com/v2/actor-runs/${runId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const pollData = (await poll.json()) as { data: { status: string; defaultDatasetId: string } };
    status = pollData.data.status;
    datasetId = pollData.data.defaultDatasetId;
    attempts++;
  }

  return { datasetId, succeeded: status === "SUCCEEDED" };
}

async function apifyDataset(token: string, datasetId: string): Promise<Array<Record<string, unknown>>> {
  const res = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return (await res.json()) as Array<Record<string, unknown>>;
}

/* ── Search TripAdvisor via Apify ──────────────────────────── */
async function searchTripAdvisor(token: string, name: string, city: string): Promise<string | null> {
  try {
    const searchUrl =
      `https://www.tripadvisor.com/Search?q=` + encodeURIComponent(`${name} ${city}`.trim());

    const res = await fetch("https://api.apify.com/v2/acts/Hvp4YfFGyLM635Q2F/runs", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ startUrls: [{ url: searchUrl }], maxReviews: 1, language: "en" }),
    });
    const runData = (await res.json()) as { data?: { id: string; defaultDatasetId: string } };
    const runId = runData.data?.id;
    const initialDatasetId = runData.data?.defaultDatasetId;
    if (!runId || !initialDatasetId) return null;

    const { datasetId, succeeded } = await apifyPoll(token, runId, initialDatasetId);
    if (!succeeded) return null;

    const items = await apifyDataset(token, datasetId);
    const url = (items?.[0]?.url as string | undefined) ?? null;
    return url;
  } catch {
    return null;
  }
}

/* ── Search Booking.com via Apify ──────────────────────────── */
async function searchBooking(token: string, name: string, city: string): Promise<string | null> {
  try {
    const searchUrl =
      `https://www.booking.com/searchresults.html?ss=` +
      encodeURIComponent(`${name} ${city}`.trim());

    const res = await fetch("https://api.apify.com/v2/acts/PbMHke3jW25J6hSOA/runs", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ startUrls: [{ url: searchUrl }], maxReviews: 1 }),
    });
    const runData = (await res.json()) as { data?: { id: string; defaultDatasetId: string } };
    const runId = runData.data?.id;
    const initialDatasetId = runData.data?.defaultDatasetId;
    if (!runId || !initialDatasetId) return null;

    const { datasetId, succeeded } = await apifyPoll(token, runId, initialDatasetId);
    if (!succeeded) return null;

    const items = await apifyDataset(token, datasetId);
    const url = (items?.[0]?.url as string | undefined) ?? null;
    return url;
  } catch {
    return null;
  }
}

/* ── Main route ────────────────────────────────────────────── */
export async function POST(request: NextRequest) {
  try {
    const { hotel_name, city, country } = (await request.json()) as {
      hotel_name?: string;
      city?: string;
      country?: string;
    };

    if (!hotel_name) {
      return NextResponse.json({ success: false, error: "Hotel name required" }, { status: 400 });
    }

    const apifyToken = process.env.APIFY_API_TOKEN;
    if (!apifyToken) {
      return NextResponse.json(
        { success: false, error: "APIFY_API_TOKEN not configured" },
        { status: 500 },
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "ANTHROPIC_API_KEY not configured" },
        { status: 500 },
      );
    }

    /* ── Step 1: Google Maps search ─────────────────────────── */
    const searchQuery = city
      ? `${hotel_name} ${city} ${country ?? ""}`.trim()
      : hotel_name;

    const startRes = await fetch("https://api.apify.com/v2/acts/Xb8osYTtOjlsgI6k9/runs", {
      method: "POST",
      headers: { Authorization: `Bearer ${apifyToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        searchStringsArray: [searchQuery],
        maxCrawledPlacesPerSearch: 3,
        maxReviews: 1,
        language: "en",
      }),
    });

    const gmRunData = (await startRes.json()) as {
      data: { id: string; status: string; defaultDatasetId: string };
    };
    const gmRun = gmRunData.data;

    const { datasetId: gmDatasetId, succeeded: gmSucceeded } = await apifyPoll(
      apifyToken,
      gmRun.id,
      gmRun.defaultDatasetId,
      20,
    );

    if (!gmSucceeded) {
      return NextResponse.json({
        success: false,
        error: "Hotel not found. Try adding city name.",
      });
    }

    const gmItems = await apifyDataset(apifyToken, gmDatasetId);

    if (!gmItems || gmItems.length === 0) {
      return NextResponse.json({
        success: false,
        error: "Hotel not found. Try adding city name.",
      });
    }

    const place = gmItems[0]!;

    /* ── Extract Google Maps data ────────────────────────────── */
    const googleUrl =
      (place.url as string | null) ?? (place.googleMapsUrl as string | null) ?? null;
    const location = place.location as { lat?: number; lng?: number } | null;
    const latitude = location?.lat ?? null;
    const longitude = location?.lng ?? null;
    const address = (place.address as string | null) ?? null;
    const website = (place.website as string | null) ?? null;
    const phone = (place.phone as string | null) ?? null;
    const addressParsed = place.addressParsed as {
      city?: string;
      country?: string;
      postalCode?: string;
    } | null;
    const hotelName = (place.title as string | null) ?? hotel_name;
    const hotelCity = (place.city as string | null) ?? addressParsed?.city ?? city ?? "";
    const countryFound =
      (place.countryCode as string | null) ?? addressParsed?.country ?? country ?? null;
    const postalCode =
      (place.postalCode as string | null) ?? addressParsed?.postalCode ?? null;

    /* ── Step 2: Search TripAdvisor + Booking in parallel ───── */
    const [tripadvisorUrl, bookingUrl] = await Promise.all([
      searchTripAdvisor(apifyToken, hotelName, hotelCity),
      searchBooking(apifyToken, hotelName, hotelCity),
    ]);

    /* ── Step 3: Claude generates search-page URLs for the rest  */
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
        messages: [
          {
            role: "user",
            content: `Generate search-results page URLs for this hotel on Yelp, Trip.com, and Expedia.
Use the search/results URL format only — do NOT guess direct hotel page URLs.

Hotel: ${hotelName}
City: ${hotelCity}
Country: ${countryFound ?? ""}

Respond ONLY with this JSON:
{
  "yelp_url": "https://www.yelp.com/search?find_desc=HOTEL_NAME&find_loc=CITY",
  "trip_url": "https://www.trip.com/hotels/list/?city=CITY&keyword=HOTEL_NAME",
  "expedia_url": "https://www.expedia.com/Hotel-Search?destination=CITY+HOTEL_NAME"
}`,
          },
        ],
      }),
    });

    const claudeData = (await claudeRes.json()) as { content?: Array<{ text?: string }> };
    const claudeText = claudeData.content?.[0]?.text?.trim();

    let searchUrls: {
      yelp_url: string | null;
      trip_url: string | null;
      expedia_url: string | null;
    } = { yelp_url: null, trip_url: null, expedia_url: null };

    try {
      const match = claudeText?.match(/\{[\s\S]*\}/);
      if (match) searchUrls = JSON.parse(match[0]) as typeof searchUrls;
    } catch {
      // keep defaults
    }

    /* ── Build url_confidence map ────────────────────────────── */
    const urlConfidence: Record<string, "verified" | "search_page" | "not_found"> = {
      google: googleUrl ? "verified" : "not_found",
      tripadvisor: tripadvisorUrl ? "verified" : "not_found",
      booking: bookingUrl ? "verified" : "not_found",
      yelp: searchUrls.yelp_url ? "search_page" : "not_found",
      trip: searchUrls.trip_url ? "search_page" : "not_found",
      expedia: searchUrls.expedia_url ? "search_page" : "not_found",
    };

    return NextResponse.json({
      success: true,
      hotel: {
        name: hotelName,
        address,
        city: hotelCity || null,
        country: countryFound,
        postal_code: postalCode,
        website,
        phone,
        latitude,
        longitude,
        avg_rating: (place.totalScore as number | null) ?? null,
        total_reviews: (place.reviewsCount as number | null) ?? null,
        google_url: googleUrl,
        tripadvisor_url: tripadvisorUrl,
        booking_url: bookingUrl,
        yelp_url: searchUrls.yelp_url,
        trip_url: searchUrls.trip_url,
        expedia_url: searchUrls.expedia_url,
        url_confidence: urlConfidence,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

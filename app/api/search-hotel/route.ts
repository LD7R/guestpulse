import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

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

    // Step 1: Search Google Maps for the hotel
    const searchQuery = city
      ? `${hotel_name} ${city} ${country ?? ""}`.trim()
      : hotel_name;

    const startRes = await fetch("https://api.apify.com/v2/acts/Xb8osYTtOjlsgI6k9/runs", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apifyToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        searchStringsArray: [searchQuery],
        maxCrawledPlacesPerSearch: 3,
        maxReviews: 1,
        language: "en",
      }),
    });

    const runData = (await startRes.json()) as { data: { id: string; status: string; defaultDatasetId: string } };
    const run = runData.data;

    // Poll for completion
    let status = run.status;
    let datasetId = run.defaultDatasetId;
    let attempts = 0;

    while (!["SUCCEEDED", "FAILED", "ABORTED"].includes(status) && attempts < 20) {
      await new Promise((r) => setTimeout(r, 3000));
      const pollRes = await fetch(`https://api.apify.com/v2/actor-runs/${run.id}`, {
        headers: { Authorization: `Bearer ${apifyToken}` },
      });
      const pollData = (await pollRes.json()) as {
        data: { status: string; defaultDatasetId: string };
      };
      status = pollData.data.status;
      datasetId = pollData.data.defaultDatasetId;
      attempts++;
    }

    // Get results
    const itemsRes = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items`, {
      headers: { Authorization: `Bearer ${apifyToken}` },
    });
    const items = (await itemsRes.json()) as Array<Record<string, unknown>>;

    if (!items || items.length === 0) {
      return NextResponse.json({
        success: false,
        error: "Hotel not found. Try adding city name.",
      });
    }

    const place = items[0]!;

    // Extract Google Maps URL and coordinates
    const googleUrl = (place.url as string | null) ?? (place.googleMapsUrl as string | null) ?? null;
    const location = place.location as { lat?: number; lng?: number } | null;
    const latitude = location?.lat ?? null;
    const longitude = location?.lng ?? null;
    const address = (place.address as string | null) ?? null;
    const website = (place.website as string | null) ?? null;
    const phone = (place.phone as string | null) ?? null;
    const addressParsed = place.addressParsed as { city?: string; country?: string } | null;
    const city_found = (place.city as string | null) ?? addressParsed?.city ?? null;
    const country_found = (place.countryCode as string | null) ?? addressParsed?.country ?? null;
    const title = (place.title as string | null) ?? hotel_name;

    // Step 2: Use Claude AI to find platform URLs
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: `You are a hotel research assistant. Find the review platform URLs for this hotel.

Hotel name: ${title}
Address: ${address ?? "unknown"}
City: ${city_found ?? city ?? "unknown"}
Country: ${country_found ?? country ?? "unknown"}
Website: ${website ?? "unknown"}
Google Maps URL: ${googleUrl ?? "unknown"}

Generate the most likely URLs for this hotel on these platforms.
Use the hotel name and location to construct accurate URLs.
For TripAdvisor and Booking.com use the slug format.
For Yelp use the business name slug.
For Trip.com and Expedia use search URLs.

If you cannot determine a URL with high confidence, return null for that platform.

Respond ONLY with this JSON, no other text:
{
  "tripadvisor_url": "https://www.tripadvisor.com/Hotel_Review-..." or null,
  "booking_url": "https://www.booking.com/hotel/..." or null,
  "yelp_url": "https://www.yelp.com/biz/..." or null,
  "trip_url": "https://www.trip.com/hotels/..." or null,
  "expedia_url": "https://www.expedia.com/..." or null,
  "confidence": {
    "tripadvisor": "high" | "medium" | "low",
    "booking": "high" | "medium" | "low",
    "yelp": "high" | "medium" | "low",
    "trip": "high" | "medium" | "low",
    "expedia": "high" | "medium" | "low"
  }
}`,
          },
        ],
      }),
    });

    const claudeData = (await claudeRes.json()) as {
      content?: Array<{ text?: string }>;
    };
    const claudeText = claudeData.content?.[0]?.text?.trim();

    let platformUrls: {
      tripadvisor_url: string | null;
      booking_url: string | null;
      yelp_url: string | null;
      trip_url: string | null;
      expedia_url: string | null;
      confidence: Record<string, string>;
    } = {
      tripadvisor_url: null,
      booking_url: null,
      yelp_url: null,
      trip_url: null,
      expedia_url: null,
      confidence: {},
    };

    try {
      const match = claudeText?.match(/\{[\s\S]*\}/);
      if (match) {
        platformUrls = JSON.parse(match[0]) as typeof platformUrls;
      }
    } catch {
      // Claude returned unparseable response — keep defaults
    }

    return NextResponse.json({
      success: true,
      hotel: {
        name: title,
        address,
        city: city_found ?? city ?? null,
        country: country_found ?? country ?? null,
        website,
        phone,
        latitude,
        longitude,
        google_url: googleUrl,
        avg_rating: (place.totalScore as number | null) ?? null,
        total_reviews: (place.reviewsCount as number | null) ?? null,
        ...platformUrls,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

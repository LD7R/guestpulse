import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 180;

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-haiku-4-5-20251001";

const PLATFORM_DOMAINS = {
  tripadvisor: "tripadvisor.com",
  google: "google.com/maps",
  booking: "booking.com",
  trip: "trip.com",
  expedia: "expedia.com",
  yelp: "yelp.com",
} as const;

const URL_PATTERNS: Record<Platform, RegExp> = {
  tripadvisor: /tripadvisor\.com\/Hotel_Review-[^/?#"'\s)]+/i,
  google:
    /(google\.[a-z.]+\/maps\/place\/[^?#"'\s)]+|maps\.google\.[a-z.]+\/[^"'\s)]+|g\.co\/[a-z]+\/[^"'\s)]+|goo\.gl\/maps\/[^"'\s)]+)/i,
  booking: /booking\.com\/hotel\/[a-z]{2}\/[^/?#"'\s)]+\.html/i,
  trip: /trip\.com\/hotels\/[^?#"'\s)]+/i,
  expedia: /expedia\.com\/[a-zA-Z0-9-]+-Hotels-[^?#"'\s)]+/i,
  yelp: /yelp\.com\/biz\/[^?#"'\s)]+/i,
};

type Platform = keyof typeof PLATFORM_DOMAINS;

type AnthropicResponse = {
  content?: Array<{ type?: string; text?: string }>;
  error?: { message?: string };
};

type HotelInfo = {
  name?: string;
  address?: string;
  city?: string;
  country?: string;
  postal_code?: string;
  phone?: string;
  website?: string;
  latitude?: number;
  longitude?: number;
  description?: string;
  price_tier?: string;
  target_guest?: string;
  error?: string;
};

async function callClaudeWithSearch(prompt: string, maxTokens: number): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = (await res.json()) as AnthropicResponse;
  if (!res.ok) {
    throw new Error(data.error?.message ?? `Anthropic error (${res.status})`);
  }
  return (data.content ?? [])
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text!)
    .join("");
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeMatchedUrl(matched: string): string {
  if (/^https?:\/\//i.test(matched)) return matched;
  // For Google, some matches already start with a subdomain (maps., g.co, goo.gl)
  // For those, do not prepend "www."
  const startsWithSubdomain = /^(maps\.|m\.|g\.co|goo\.gl)/i.test(matched);
  return startsWithSubdomain ? `https://${matched}` : `https://www.${matched}`;
}

async function searchForRealUrl(
  hotelName: string,
  city: string | null,
  platform: Platform,
): Promise<{ url: string | null; error?: string }> {
  const domain = PLATFORM_DOMAINS[platform];
  const pattern = URL_PATTERNS[platform];
  const query = city
    ? `${hotelName} ${city} site:${domain}`
    : `${hotelName} hotel site:${domain}`;

  try {
    const text = await callClaudeWithSearch(
      `Search for the official ${platform} URL for "${hotelName}"${city ? ` in ${city}` : ""}.

Use the web_search tool with query: ${query}

Then return ONLY the URL of the hotel's listing on ${domain}. The URL must match this pattern: ${pattern}

Return JUST the URL on a single line. If not found, return "NONE".

No commentary. No quotes. Just the URL or NONE.`,
      500,
    );

    const trimmed = text.trim();

    const match = trimmed.match(pattern);
    if (match) {
      return { url: normalizeMatchedUrl(match[0]) };
    }

    if (/\bNONE\b/i.test(trimmed)) {
      return { url: null, error: "Not found" };
    }

    const anyUrlMatch = trimmed.match(
      new RegExp(`https?://[^\\s"'>)]*${escapeRegex(domain)}[^\\s"'>)]*`, "i"),
    );
    if (anyUrlMatch) {
      return { url: anyUrlMatch[0] };
    }

    return { url: null, error: "No matching URL in result" };
  } catch (error) {
    return {
      url: null,
      error: error instanceof Error ? error.message : "Search failed",
    };
  }
}

async function searchGoogleWithFallback(
  hotelName: string,
  city: string | null,
): Promise<{ url: string | null; error?: string }> {
  // Attempt 1: site:google.com/maps via main search
  const first = await searchForRealUrl(hotelName, city, "google");
  if (first.url) return first;

  // Attempt 2: broader query without site: filter
  const query = `"${hotelName}"${city ? ` ${city}` : ""} google maps`;
  try {
    const text = await callClaudeWithSearch(
      `Find the Google Maps URL for "${hotelName}"${city ? ` in ${city}` : ""}.

Use web_search with: ${query}

Return ONLY the Google Maps URL on a single line. Format examples:
- https://www.google.com/maps/place/...
- https://maps.google.com/...
- https://g.co/kgs/...
- https://goo.gl/maps/...

If genuinely not on Google Maps, return "NONE". No commentary.`,
      500,
    );

    const trimmed = text.trim();
    if (/\bNONE\b/i.test(trimmed)) {
      return { url: null, error: "Not on Google Maps" };
    }

    const urlMatch = trimmed.match(
      /https?:\/\/[^\s"'>)]*(google\.[a-z.]+|maps\.google\.[a-z.]+|g\.co|goo\.gl)[^\s"'>)]+/i,
    );
    if (urlMatch) {
      return { url: urlMatch[0] };
    }

    const bareMatch = trimmed.match(URL_PATTERNS.google);
    if (bareMatch) {
      return { url: normalizeMatchedUrl(bareMatch[0]) };
    }

    return { url: null, error: "Not found" };
  } catch (err) {
    return {
      url: null,
      error: err instanceof Error ? err.message : "Search failed",
    };
  }
}

async function verifyUrl(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; GuestPulse/1.0)",
      },
      redirect: "follow",
    });

    clearTimeout(timeout);
    return res.ok || res.status === 405 || res.status === 403;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      query?: string;
      hotel_name?: string;
      city?: string;
      country?: string;
    };

    const queryInput =
      body.query?.trim() ||
      [body.hotel_name, body.city, body.country].filter((s) => s && s.trim()).join(" ").trim();

    if (!queryInput) {
      return NextResponse.json(
        { success: false, error: "Hotel name or query required" },
        { status: 400 },
      );
    }

    console.log("[search-hotel] starting search for:", queryInput);

    const infoText = await callClaudeWithSearch(
      `Find basic information about this hotel:

"${queryInput}"

Use web_search to find the hotel. Return ONLY this JSON, no markdown, no commentary:

{
  "name": "Official hotel name",
  "address": "Street address",
  "city": "City",
  "country": "Country",
  "postal_code": "Postal/ZIP code",
  "phone": "Phone number with country code",
  "website": "Official hotel website URL",
  "latitude": 52.123,
  "longitude": 4.123,
  "description": "1-2 sentence description",
  "price_tier": "budget|mid-range|upscale|luxury",
  "target_guest": "leisure|business|leisure couples|families|etc"
}

If you cannot find the hotel, return: {"error": "not found"}`,
      1200,
    );

    let hotelInfo: HotelInfo | null = null;
    try {
      hotelInfo = JSON.parse(infoText.trim()) as HotelInfo;
    } catch {
      const cleaned = infoText.replace(/```json\n?/gi, "").replace(/```\n?/g, "").trim();
      const fb = cleaned.indexOf("{");
      const lb = cleaned.lastIndexOf("}");
      if (fb !== -1 && lb > fb) {
        try {
          hotelInfo = JSON.parse(cleaned.slice(fb, lb + 1)) as HotelInfo;
        } catch {
          /* ignore */
        }
      }
    }

    if (!hotelInfo || hotelInfo.error || !hotelInfo.name) {
      return NextResponse.json(
        { success: false, error: "Hotel not found. Try a more specific name." },
        { status: 404 },
      );
    }

    console.log("[search-hotel] found basic info:", hotelInfo.name);

    const otherPlatforms: Platform[] = ["tripadvisor", "booking", "trip", "expedia", "yelp"];

    const urlResults = await Promise.all([
      (async () => {
        console.log("[search-hotel] searching google (with fallback)...");
        const result = await searchGoogleWithFallback(
          hotelInfo!.name!,
          hotelInfo!.city ?? null,
        );
        console.log("[search-hotel] google:", result.url ?? result.error);
        return { platform: "google" as Platform, ...result };
      })(),
      ...otherPlatforms.map(async (platform) => {
        console.log(`[search-hotel] searching ${platform}...`);
        const result = await searchForRealUrl(
          hotelInfo!.name!,
          hotelInfo!.city ?? null,
          platform,
        );
        console.log(`[search-hotel] ${platform}:`, result.url ?? result.error);
        return { platform, ...result };
      }),
    ]);

    const platforms: Platform[] = ["google", ...otherPlatforms];

    const verifiedResults = await Promise.all(
      urlResults.map(async (r) => {
        if (!r.url) return { ...r, verified: false };
        const isValid = await verifyUrl(r.url);
        return {
          ...r,
          verified: isValid,
          error: isValid ? undefined : r.error ?? "URL did not respond",
        };
      }),
    );

    const platformUrls: Record<string, string | null> = {};
    const platformStatus: Record<
      string,
      { found: boolean; verified: boolean; error?: string }
    > = {};
    const urlConfidence: Record<string, "verified" | "search_page" | "not_found"> = {};

    for (const r of verifiedResults) {
      platformUrls[`${r.platform}_url`] = r.verified ? r.url : null;
      platformStatus[r.platform] = {
        found: !!r.url,
        verified: r.verified,
        ...(r.error ? { error: r.error } : {}),
      };
      urlConfidence[r.platform] = r.verified
        ? "verified"
        : r.url
          ? "search_page"
          : "not_found";
    }

    const verifiedCount = verifiedResults.filter((r) => r.verified).length;
    console.log("[search-hotel] verified urls:", verifiedCount);

    return NextResponse.json({
      success: true,
      hotel: {
        name: hotelInfo.name,
        address: hotelInfo.address ?? null,
        city: hotelInfo.city ?? null,
        country: hotelInfo.country ?? null,
        postal_code: hotelInfo.postal_code ?? null,
        phone: hotelInfo.phone ?? null,
        website: hotelInfo.website ?? null,
        latitude: typeof hotelInfo.latitude === "number" ? hotelInfo.latitude : null,
        longitude: typeof hotelInfo.longitude === "number" ? hotelInfo.longitude : null,
        description: hotelInfo.description ?? null,
        price_tier: hotelInfo.price_tier ?? null,
        target_guest: hotelInfo.target_guest ?? null,
        avg_rating: null,
        total_reviews: null,
        ...platformUrls,
        url_confidence: urlConfidence,
      },
      platform_status: platformStatus,
      verified_count: verifiedCount,
      total_platforms: platforms.length,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Search failed";
    console.error("[search-hotel] failed:", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

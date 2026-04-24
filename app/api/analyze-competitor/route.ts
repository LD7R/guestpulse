/**
 * POST { entity_type: 'hotel' | 'competitor', entity_id: string }
 * Analyzes a hotel or competitor using Claude and saves USPs, strengths,
 * weaknesses, amenities, price_tier, target_guest back to the DB.
 *
 * SQL to run in Supabase Editor before using this route:
 *
 * -- alter table public.competitors
 * --   add column if not exists description text,
 * --   add column if not exists usps jsonb default '[]',
 * --   add column if not exists strengths jsonb default '[]',
 * --   add column if not exists weaknesses jsonb default '[]',
 * --   add column if not exists amenities jsonb default '[]',
 * --   add column if not exists price_tier text,
 * --   add column if not exists target_guest text,
 * --   add column if not exists last_analyzed_at timestamp;
 * --
 * -- alter table public.hotels
 * --   add column if not exists description text,
 * --   add column if not exists usps jsonb default '[]',
 * --   add column if not exists strengths jsonb default '[]',
 * --   add column if not exists weaknesses jsonb default '[]',
 * --   add column if not exists amenities jsonb default '[]',
 * --   add column if not exists price_tier text,
 * --   add column if not exists target_guest text,
 * --   add column if not exists last_analyzed_at timestamp;
 * --
 * -- grant all on public.competitors to authenticated;
 * -- grant all on public.hotels to authenticated;
 */
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 60;

type AnalysisResult = {
  description: string;
  usps: string[];
  strengths: string[];
  weaknesses: string[];
  amenities: string[];
  price_tier: string;
  target_guest: string;
};

function parseJson<T>(text: string): T | null {
  const cleaned = text.trim().replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
      return JSON.parse(m[0]) as T;
    } catch {
      return null;
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "ANTHROPIC_API_KEY not configured" },
        { status: 500 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      entity_type?: string;
      entity_id?: string;
    };
    const { entity_type, entity_id } = body;

    if (!entity_type || !entity_id) {
      return NextResponse.json(
        { success: false, error: "entity_type and entity_id are required" },
        { status: 400 },
      );
    }
    if (entity_type !== "hotel" && entity_type !== "competitor") {
      return NextResponse.json(
        { success: false, error: "entity_type must be 'hotel' or 'competitor'" },
        { status: 400 },
      );
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    let entityName = "";
    let entityCity = "";
    let entityCountry = "";
    let entityAddress = "";
    let entityAvgRating: number | null = null;
    let entityTotalReviews: number | null = null;
    let reviews: Array<{ rating: unknown; review_text: string | null }> = [];

    if (entity_type === "hotel") {
      const { data: hotelData, error: hErr } = await supabase
        .from("hotels")
        .select("id, name, city, country, address, historical_avg_rating, historical_review_count")
        .eq("id", entity_id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (hErr) {
        return NextResponse.json({ success: false, error: hErr.message }, { status: 500 });
      }
      if (!hotelData) {
        return NextResponse.json({ success: false, error: "Hotel not found" }, { status: 404 });
      }

      const h = hotelData as {
        name?: string | null;
        city?: string | null;
        country?: string | null;
        address?: string | null;
        historical_avg_rating?: number | null;
        historical_review_count?: number | null;
      };
      entityName = h.name ?? "Your hotel";
      entityCity = h.city ?? "";
      entityCountry = h.country ?? "";
      entityAddress = h.address ?? "";
      entityAvgRating = h.historical_avg_rating ?? null;
      entityTotalReviews = h.historical_review_count ?? null;

      const { data: reviewData } = await supabase
        .from("reviews")
        .select("rating, review_text")
        .eq("hotel_id", entity_id)
        .not("review_text", "is", null)
        .neq("review_text", "")
        .neq("review_text", "—")
        .limit(60);
      reviews = (reviewData ?? []) as typeof reviews;
    } else {
      // Competitor — fetch then verify ownership via hotel
      const { data: compData, error: cErr } = await supabase
        .from("competitors")
        .select("id, hotel_id, name, address, avg_rating, total_reviews")
        .eq("id", entity_id)
        .maybeSingle();

      if (cErr) {
        return NextResponse.json({ success: false, error: cErr.message }, { status: 500 });
      }
      if (!compData) {
        return NextResponse.json({ success: false, error: "Competitor not found" }, { status: 404 });
      }

      const comp = compData as {
        hotel_id: string;
        name: string;
        address?: string | null;
        avg_rating?: number | null;
        total_reviews?: number | null;
      };

      // Ownership check
      const { data: ownerHotel } = await supabase
        .from("hotels")
        .select("id, city, country")
        .eq("id", comp.hotel_id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!ownerHotel) {
        return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
      }

      const oh = ownerHotel as { city?: string | null; country?: string | null };
      entityName = comp.name;
      entityCity = oh.city ?? "";
      entityCountry = oh.country ?? "";
      entityAddress = comp.address ?? "";
      entityAvgRating = comp.avg_rating ?? null;
      entityTotalReviews = comp.total_reviews ?? null;

      // Try competitor_reviews table (may be empty — that's OK)
      const { data: reviewData } = await supabase
        .from("competitor_reviews")
        .select("rating, review_text")
        .eq("competitor_id", entity_id)
        .not("review_text", "is", null)
        .neq("review_text", "")
        .limit(60);
      reviews = (reviewData ?? []) as typeof reviews;
    }

    // Sample top 20 reviews by length
    const sampledReviews = [...reviews]
      .sort((a, b) => (b.review_text?.length ?? 0) - (a.review_text?.length ?? 0))
      .slice(0, 20)
      .map((r) => `[${r.rating ?? "?"}★] ${(r.review_text ?? "").trim()}`)
      .join("\n\n");

    const locationStr = [entityCity, entityCountry].filter(Boolean).join(", ");

    const prompt = `You are analyzing a hotel to extract its competitive positioning. Based on the hotel info and guest reviews below, identify specific USPs, strengths, weaknesses, and positioning.

HOTEL NAME: ${entityName}
LOCATION: ${locationStr || "Unknown"}
ADDRESS: ${entityAddress || "Unknown"}
AVG RATING: ${entityAvgRating ?? "N/A"}
TOTAL REVIEWS: ${entityTotalReviews ?? "N/A"}

SAMPLE GUEST REVIEWS:
${sampledReviews || "No reviews available. Base your analysis on the hotel name, location, and rating."}

Analyze this hotel and respond with JSON:

{
  "description": "One-sentence positioning statement (max 120 chars)",
  "usps": ["Unique selling point 1", "Unique selling point 2", "Unique selling point 3"],
  "strengths": ["What guests consistently praise 1", "praise 2", "praise 3", "praise 4"],
  "weaknesses": ["Recurring complaint 1", "complaint 2", "complaint 3"],
  "amenities": ["Notable amenity 1", "amenity 2", "amenity 3", "amenity 4", "amenity 5"],
  "price_tier": "budget | mid-range | upscale | luxury",
  "target_guest": "primary guest segment (e.g. 'business travelers', 'couples', 'families')"
}

Be specific and concrete. Use actual details from reviews where available. Avoid generic statements like "good service" — instead say "24-hour front desk with multilingual staff".

Respond ONLY with the JSON object, no preamble or markdown.`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1500,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = (await res.json()) as {
      content?: Array<{ text?: string; type?: string }>;
      error?: { message?: string };
    };

    if (!res.ok) {
      const msg = data.error?.message ?? `Anthropic error (${res.status})`;
      return NextResponse.json({ success: false, error: msg }, { status: 502 });
    }

    const text = (data.content ?? []).find((c) => c.type === "text")?.text ?? "";
    const analysis = parseJson<AnalysisResult>(text);

    if (!analysis) {
      return NextResponse.json(
        { success: false, error: "Could not parse AI response as JSON" },
        { status: 502 },
      );
    }

    const updatePayload = {
      description: typeof analysis.description === "string" ? analysis.description : null,
      usps: Array.isArray(analysis.usps) ? analysis.usps : [],
      strengths: Array.isArray(analysis.strengths) ? analysis.strengths : [],
      weaknesses: Array.isArray(analysis.weaknesses) ? analysis.weaknesses : [],
      amenities: Array.isArray(analysis.amenities) ? analysis.amenities : [],
      price_tier: typeof analysis.price_tier === "string" ? analysis.price_tier : null,
      target_guest: typeof analysis.target_guest === "string" ? analysis.target_guest : null,
      last_analyzed_at: new Date().toISOString(),
    };

    if (entity_type === "hotel") {
      await supabase.from("hotels").update(updatePayload).eq("id", entity_id);
    } else {
      await supabase.from("competitors").update(updatePayload).eq("id", entity_id);
    }

    return NextResponse.json({ success: true, analysis: updatePayload });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

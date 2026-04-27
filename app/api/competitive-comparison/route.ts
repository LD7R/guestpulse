/**
 * POST { hotel_id: string }
 * Compares the user's hotel to all analyzed competitors and returns
 * unique advantages, competitive gaps, quick wins, and market positioning.
 * Saves the result to competitive_analyses table (30-day TTL).
 *
 * -- Run in Supabase:
 * -- create table if not exists public.competitive_analyses (
 * --   id uuid primary key default gen_random_uuid(),
 * --   hotel_id uuid references public.hotels(id) on delete cascade,
 * --   user_id uuid references auth.users(id),
 * --   analysis jsonb not null,
 * --   generated_at timestamp with time zone default now(),
 * --   expires_at timestamp with time zone
 * --     default (now() + interval '30 days')
 * -- );
 * --
 * -- create index if not exists idx_competitive_analyses_hotel
 * --   on public.competitive_analyses(hotel_id);
 * -- create index if not exists idx_competitive_analyses_expires
 * --   on public.competitive_analyses(expires_at);
 * --
 * -- alter table public.competitive_analyses enable row level security;
 * --
 * -- drop policy if exists "Users view own analyses" on public.competitive_analyses;
 * -- create policy "Users view own analyses" on public.competitive_analyses
 * --   for select using (auth.uid() = user_id);
 * --
 * -- drop policy if exists "Users create own analyses" on public.competitive_analyses;
 * -- create policy "Users create own analyses" on public.competitive_analyses
 * --   for insert with check (auth.uid() = user_id);
 * --
 * -- drop policy if exists "Users delete own analyses" on public.competitive_analyses;
 * -- create policy "Users delete own analyses" on public.competitive_analyses
 * --   for delete using (auth.uid() = user_id);
 * --
 * -- grant all on public.competitive_analyses to authenticated;
 * -- grant all on public.competitive_analyses to service_role;
 */
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

type UniqueAdvantage = {
  advantage: string;
  vs_competitors: string;
  how_to_leverage: string;
};

type CompetitiveGap = {
  gap: string;
  who_has_it: string;
  priority: "high" | "medium" | "low";
  action: string;
};

type QuickWin = {
  win: string;
  impact: string;
  effort: "low" | "medium" | "high";
};

type ComparisonResult = {
  unique_advantages: UniqueAdvantage[];
  competitive_gaps: CompetitiveGap[];
  shared_strengths: string[];
  market_positioning: {
    your_position: string;
    recommended_position: string;
    differentiation_strategy: string;
  };
  quick_wins: QuickWin[];
  long_term_strategy: string;
};

function parseJsonRobust<T>(text: string): { result: T | null; error: string | null } {
  let jsonText = text;

  // Remove markdown code blocks
  jsonText = jsonText.replace(/```json\s*/gi, "");
  jsonText = jsonText.replace(/```\s*/g, "");

  // Find the JSON object by locating first { and last }
  const firstBrace = jsonText.indexOf("{");
  const lastBrace = jsonText.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1) {
    return { result: null, error: `No JSON found in response: ${text.slice(0, 200)}` };
  }

  jsonText = jsonText.slice(firstBrace, lastBrace + 1);

  try {
    return { result: JSON.parse(jsonText) as T, error: null };
  } catch (e) {
    return {
      result: null,
      error: `JSON parse error: ${e instanceof Error ? e.message : String(e)} | Tried: ${jsonText.slice(0, 200)}`,
    };
  }
}

function jsonToStr(val: unknown): string {
  if (!val) return "[]";
  if (typeof val === "string") return val;
  try {
    return JSON.stringify(val);
  } catch {
    return "[]";
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

    const body = (await request.json().catch(() => ({}))) as { hotel_id?: string };
    const hotelId = body.hotel_id?.trim();
    if (!hotelId) {
      return NextResponse.json(
        { success: false, error: "hotel_id is required" },
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

    const { allowed } = rateLimit(`competitive-comparison:${user.id}`, 5, 60_000);
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Try again in a minute." },
        { status: 429 },
      );
    }

    const { data: hotelData, error: hErr } = await supabase
      .from("hotels")
      .select(
        "id, name, historical_avg_rating, historical_review_count, description, usps, strengths, weaknesses, amenities, price_tier, target_guest",
      )
      .eq("id", hotelId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (hErr) {
      return NextResponse.json({ success: false, error: hErr.message }, { status: 500 });
    }
    if (!hotelData) {
      return NextResponse.json({ success: false, error: "Hotel not found" }, { status: 404 });
    }

    const { data: compsData, error: cErr } = await supabase
      .from("competitors")
      .select(
        "id, name, avg_rating, total_reviews, description, usps, strengths, weaknesses, amenities, price_tier, target_guest",
      )
      .eq("hotel_id", hotelId);

    if (cErr) {
      return NextResponse.json({ success: false, error: cErr.message }, { status: 500 });
    }

    const hotel = hotelData as Record<string, unknown>;
    const allCompetitors = (compsData ?? []) as Array<Record<string, unknown>>;
    const analyzedCompetitors = allCompetitors.filter((c) => c.description && c.usps);

    if (analyzedCompetitors.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No competitors analyzed yet. Please analyze your competitors first.",
          needs_analysis: true,
        },
        { status: 400 },
      );
    }

    const hotelSummary = `YOUR HOTEL: ${hotel.name as string}
Description: ${hotel.description ?? "Not yet analyzed"}
Rating: ${hotel.historical_avg_rating ?? "N/A"}★
Reviews: ${hotel.historical_review_count ?? "N/A"}
USPs: ${jsonToStr(hotel.usps)}
Strengths: ${jsonToStr(hotel.strengths)}
Weaknesses: ${jsonToStr(hotel.weaknesses)}
Amenities: ${jsonToStr(hotel.amenities)}
Price tier: ${hotel.price_tier ?? "unknown"}
Target guest: ${hotel.target_guest ?? "unknown"}`;

    const competitorSummaries = analyzedCompetitors
      .map(
        (c) => `COMPETITOR: ${c.name as string}
Description: ${c.description as string}
Rating: ${c.avg_rating ?? "N/A"}★
Reviews: ${c.total_reviews ?? "N/A"}
USPs: ${jsonToStr(c.usps)}
Strengths: ${jsonToStr(c.strengths)}
Weaknesses: ${jsonToStr(c.weaknesses)}
Amenities: ${jsonToStr(c.amenities)}
Price tier: ${c.price_tier ?? "unknown"}
Target guest: ${c.target_guest ?? "unknown"}`,
      )
      .join("\n\n---\n\n");

    const prompt = `You are a hotel competitive strategist. Compare this hotel to its competitors and identify specific competitive advantages, disadvantages, and strategic opportunities.

${hotelSummary}

COMPETITORS:
${competitorSummaries}

{
  "unique_advantages": [
    {
      "advantage": "Specific USP only your hotel has",
      "vs_competitors": "How competitors fall short on this",
      "how_to_leverage": "Specific action to promote this advantage"
    }
  ],
  "competitive_gaps": [
    {
      "gap": "What competitors offer that you don't",
      "who_has_it": "Competitor name",
      "priority": "high | medium | low",
      "action": "Specific action to close this gap"
    }
  ],
  "shared_strengths": [
    "Strengths both you and competitors share (table stakes to maintain)"
  ],
  "market_positioning": {
    "your_position": "Your current market position in 1 sentence",
    "recommended_position": "Where you should reposition in 1 sentence",
    "differentiation_strategy": "How to differentiate from competitors in 1-2 sentences"
  },
  "quick_wins": [
    {
      "win": "Specific improvement you can make quickly",
      "impact": "Why this matters for your competitive position",
      "effort": "low | medium | high"
    }
  ],
  "long_term_strategy": "2-3 sentence strategic recommendation for building lasting competitive advantage"
}

Be specific and concrete. Reference actual competitor names and features. Aim for 3 unique_advantages, 3 competitive_gaps, 3 shared_strengths, 3 quick_wins. Avoid generic advice.

CRITICAL: Respond with ONLY the JSON object. No preamble, no explanation, no markdown code blocks. Start your response with { and end with }. Nothing else.`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2500,
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
    const { result: comparison, error: parseError } = parseJsonRobust<ComparisonResult>(text);

    if (!comparison) {
      console.error("competitive-comparison parse error:", parseError);
      return NextResponse.json(
        { success: false, error: "Could not parse AI comparison response" },
        { status: 502 },
      );
    }

    // Delete any existing analysis for this hotel
    await supabase.from("competitive_analyses").delete().eq("hotel_id", hotelId);

    // Save new analysis with 30-day TTL
    const generatedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: saved, error: saveError } = await supabase
      .from("competitive_analyses")
      .insert({
        hotel_id: hotelId,
        user_id: user.id,
        analysis: comparison,
        generated_at: generatedAt,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (saveError) {
      console.error("Failed to save analysis:", saveError);
    }

    return NextResponse.json({
      success: true,
      comparison,
      generated_at: (saved as Record<string, unknown> | null)?.generated_at as string | undefined ?? generatedAt,
      expires_at: (saved as Record<string, unknown> | null)?.expires_at as string | undefined ?? expiresAt,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

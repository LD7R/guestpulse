import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 60;

type InsightJson = {
  market_position: string;
  my_advantage: string;
  biggest_threat: string;
  quick_win: string;
  rating_gap: string;
};

function parseInsightJson(text: string): InsightJson | null {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed) as InsightJson;
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as InsightJson;
    } catch {
      return null;
    }
  }
}

function topTopics(
  rows: { complaint_topic: string | null; topic_type: string | null }[],
  type: "improvement" | "strength",
  n: number,
): string[] {
  const counts = new Map<string, number>();
  for (const r of rows) {
    if (r.topic_type !== type) continue;
    const t = r.complaint_topic?.trim();
    if (!t) continue;
    counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => k);
}

export async function POST(_request: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
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

    const { data: hotel, error: hErr } = await supabase
      .from("hotels")
      .select("id, name")
      .eq("user_id", user.id)
      .maybeSingle();

    if (hErr) {
      return NextResponse.json({ success: false, error: hErr.message }, { status: 500 });
    }
    if (!hotel?.id) {
      return NextResponse.json({ success: false, error: "No hotel found" }, { status: 400 });
    }

    const [{ data: reviewRows, error: rErr }, { data: competitors, error: cErr }] = await Promise.all([
      supabase
        .from("reviews")
        .select("rating, complaint_topic, topic_type")
        .eq("hotel_id", hotel.id),
      supabase.from("competitors").select("name, avg_rating, total_reviews, recent_snippets").eq("hotel_id", hotel.id),
    ]);

    if (rErr) {
      return NextResponse.json({ success: false, error: rErr.message }, { status: 500 });
    }
    if (cErr) {
      return NextResponse.json({ success: false, error: cErr.message }, { status: 500 });
    }

    const reviews = (reviewRows ?? []) as {
      rating: number | null;
      complaint_topic: string | null;
      topic_type: string | null;
    }[];

    const ratings = reviews.map((x) => x.rating).filter((x): x is number => typeof x === "number" && !Number.isNaN(x));
    const avgRating =
      ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;

    const my_hotel = {
      name: typeof hotel.name === "string" && hotel.name.trim() ? hotel.name.trim() : "Your hotel",
      avg_rating: avgRating,
      total_reviews: reviews.length,
      top_complaints: topTopics(reviews, "improvement", 5),
      top_strengths: topTopics(reviews, "strength", 5),
    };

    const compList = (competitors ?? []) as {
      name: string;
      avg_rating: number | null;
      total_reviews: number | null;
      recent_snippets: string | null;
    }[];

    const competitorsBlock = compList
      .map((c) => {
        let recent = "not available";
        if (c.recent_snippets) {
          try {
            const parsed = JSON.parse(c.recent_snippets) as unknown;
            if (Array.isArray(parsed) && parsed.length > 0) {
              recent = parsed.map((s) => String(s)).join(" | ");
            }
          } catch {
            recent = c.recent_snippets.slice(0, 500);
          }
        }
        const ar = c.avg_rating;
        const tr = c.total_reviews ?? 0;
        return `${c.name}: ${ar != null ? `${ar}★` : "—"} (${tr} reviews)\nRecent guest feedback: ${recent}`;
      })
      .join("\n\n");

    const prompt = `You are a hotel reputation analyst. Analyze this competitive landscape and provide actionable insights.

MY HOTEL:
Name: ${my_hotel.name}
Rating: ${my_hotel.avg_rating != null ? `${my_hotel.avg_rating.toFixed(2)}★` : "not available"}
Total reviews: ${my_hotel.total_reviews}
Top complaints: ${my_hotel.top_complaints.length ? my_hotel.top_complaints.join(", ") : "none identified"}
Top strengths: ${my_hotel.top_strengths.length ? my_hotel.top_strengths.join(", ") : "none identified"}

COMPETITORS:
${compList.length ? competitorsBlock : "(none tracked)"}

Provide a structured analysis with these sections:
1. MARKET POSITION (1 sentence): Where I stand vs competition
2. MY ADVANTAGE (1 sentence): What I do better than competitors
3. BIGGEST THREAT (1 sentence): Which competitor is my biggest risk and why
4. QUICK WIN (1 sentence): One specific action I can take this week
5. RATING GAP (1 sentence): How far I am from the market leader

Keep each section to exactly 1 sentence. Be specific with numbers.
Format as JSON only, no markdown:
{
  "market_position": "...",
  "my_advantage": "...",
  "biggest_threat": "...",
  "quick_win": "...",
  "rating_gap": "..."
}`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 600,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = (await res.json()) as {
      content?: Array<{ text?: string }>;
      error?: { message?: string };
    };

    if (!res.ok) {
      const msg = data.error?.message ?? `Anthropic error (${res.status})`;
      return NextResponse.json({ success: false, error: msg }, { status: 502 });
    }

    const text = data.content?.[0]?.text?.trim();
    if (!text) {
      return NextResponse.json({ success: false, error: "Empty model response" }, { status: 502 });
    }

    const parsed = parseInsightJson(text);
    if (!parsed) {
      return NextResponse.json(
        { success: false, error: "Could not parse insight JSON from model" },
        { status: 502 },
      );
    }

    const keys: (keyof InsightJson)[] = [
      "market_position",
      "my_advantage",
      "biggest_threat",
      "quick_win",
      "rating_gap",
    ];
    for (const k of keys) {
      if (typeof parsed[k] !== "string") {
        parsed[k] = "";
      }
    }

    return NextResponse.json({ success: true, insight: parsed });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

type InsightPayload = {
  total: number;
  avg: number;
  positivePct: number;
  negativePct: number;
  topComplaints: string;
  topStrengths: string;
  topPlatform: string;
  topLanguage: string;
  responseRate: number;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as InsightPayload;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
    }

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 800,
        messages: [
          {
            role: "user",
            content: `You are a hotel reputation analyst. Based on this review data, write 4 short insights (2 sentences each).

Data:
- Total reviews: ${body.total}
- Average rating: ${body.avg.toFixed(1)}/5
- Positive: ${body.positivePct}%
- Negative: ${body.negativePct}%
- Top complaints: ${body.topComplaints}
- Top strengths: ${body.topStrengths}
- Most reviews from: ${body.topPlatform}
- Most common language: ${body.topLanguage}
- Response rate: ${body.responseRate}%

Write insights on:
1. Overall reputation health (honest, direct assessment)
2. Biggest strength to leverage in marketing
3. Most urgent issue to fix this week
4. One specific recommendation for next month

Respond ONLY with this JSON, no other text:
{
  "health": "2 sentence insight here",
  "strength": "2 sentence insight here",
  "urgent": "2 sentence insight here",
  "recommendation": "2 sentence insight here"
}`,
          },
        ],
      }),
    });

    const data = (await res.json()) as { content?: Array<{ text?: string }>; error?: { message?: string } };

    if (!res.ok) {
      return NextResponse.json({ success: false, error: data.error?.message ?? "Claude error" }, { status: 500 });
    }

    const text = data.content?.[0]?.text?.trim();
    if (!text) {
      return NextResponse.json({ success: false, error: "Empty response from Claude" }, { status: 500 });
    }

    let insights: { health: string; strength: string; urgent: string; recommendation: string };
    try {
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("No JSON found");
      insights = JSON.parse(match[0]) as typeof insights;
    } catch {
      return NextResponse.json({ success: false, error: "Failed to parse insights" }, { status: 500 });
    }

    return NextResponse.json({ success: true, insights });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

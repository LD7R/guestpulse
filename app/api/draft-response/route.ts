import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type AnthropicMessageResponse = {
  content?: Array<{ type?: string; text?: string }>;
  error?: { type?: string; message?: string };
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      review_text?: string;
      rating?: number | string | null;
      reviewer_name?: string | null;
      platform?: string | null;
      signature?: string | null;
    };

    const { review_text, rating, reviewer_name, platform, signature } = body;
    const responseSignature = (signature && String(signature).trim() !== "")
      ? String(signature).trim()
      : "The Management Team";

    if (review_text === undefined || review_text === null || review_text === "") {
      return NextResponse.json(
        { success: false, error: "review_text is required" },
        { status: 400 },
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "ANTHROPIC_API_KEY is not configured" },
        { status: 500 },
      );
    }

    const reviewerName = reviewer_name ?? "Guest";
    const ratingLabel =
      rating !== null && rating !== undefined && rating !== ""
        ? String(rating)
        : "—";
    const platformLabel = platform ?? "unknown";

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        messages: [
          {
            role: "user",
            content: `You are a professional hotel manager writing a response to a guest review. Write a warm genuine response under 80 words. Reference specific details they mentioned. Do not start with "Dear valued guest". End with exactly this sign-off on a new line: "Kind regards, ${responseSignature}"

Reviewer: ${reviewerName}
Rating: ${ratingLabel}/5
Platform: ${platformLabel}
Review: ${review_text}`,
          },
        ],
      }),
    });

    const data = (await res.json()) as AnthropicMessageResponse;

    if (!res.ok) {
      const msg =
        data.error?.message ?? `Anthropic API error (${res.status})`;
      return NextResponse.json({ success: false, error: msg }, { status: 502 });
    }

    const text = data.content?.[0]?.text;
    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { success: false, error: "No response text from Anthropic" },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true, response: text });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

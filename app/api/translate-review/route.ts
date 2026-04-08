import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { review_text, original_language, target_language = "en" } = (await request.json()) as {
      review_text?: string;
      original_language?: string | null;
      target_language?: string;
    };

    if (!review_text?.trim()) {
      return NextResponse.json(
        { success: false, error: "review_text is required" },
        { status: 400 },
      );
    }

    // Skip translation if already in the target language
    if (original_language && original_language === target_language) {
      return NextResponse.json({ success: true, translated_text: review_text, skipped: true });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "ANTHROPIC_API_KEY is not configured" },
        { status: 500 },
      );
    }

    const languageNames: Record<string, string> = {
      en: "English", nl: "Dutch", id: "Indonesian", de: "German",
      fr: "French", es: "Spanish", it: "Italian", pt: "Portuguese",
      ja: "Japanese", zh: "Chinese", ar: "Arabic", ru: "Russian",
      ko: "Korean", tr: "Turkish", pl: "Polish",
    };

    const targetName = languageNames[target_language] ?? "English";
    const sourceName = original_language ? (languageNames[original_language] ?? "the detected language") : "the detected language";

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: `Translate this hotel review from ${sourceName} to ${targetName}. Preserve the tone, meaning, and any formatting. Return ONLY the translated text with no explanation or prefix.

Review: "${review_text}"`,
          },
        ],
      }),
    });

    const data = (await response.json()) as {
      content?: Array<{ text?: string }>;
      error?: { message?: string };
    };

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data.error?.message ?? "Translation failed" },
        { status: 500 },
      );
    }

    const translated_text = data.content?.[0]?.text?.trim();
    if (!translated_text) {
      return NextResponse.json({ success: false, error: "Empty translation result" }, { status: 500 });
    }

    return NextResponse.json({ success: true, translated_text, skipped: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

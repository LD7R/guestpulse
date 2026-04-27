import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English", nl: "Dutch", id: "Indonesian", de: "German",
  fr: "French", es: "Spanish", it: "Italian", pt: "Portuguese",
  ja: "Japanese", zh: "Chinese", ar: "Arabic", ru: "Russian",
  ko: "Korean", tr: "Turkish", pl: "Polish", th: "Thai", vi: "Vietnamese",
};

export async function POST(request: NextRequest) {
  try {
    const { review_id, target_language = "en" } = (await request.json()) as {
      review_id?: string;
      target_language?: string;
    };

    if (!review_id?.trim()) {
      return NextResponse.json({ success: false, error: "review_id is required" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ success: false, error: "Supabase not configured" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Fetch review
    const { data: review, error: reviewError } = await supabase
      .from("reviews")
      .select("review_text, body, text, original_language, translated_text, translated_to")
      .eq("id", review_id)
      .maybeSingle();

    if (reviewError || !review) {
      return NextResponse.json({ success: false, error: "Review not found" }, { status: 404 });
    }

    const reviewText = ((review as Record<string, unknown>).review_text ??
      (review as Record<string, unknown>).body ??
      (review as Record<string, unknown>).text ??
      "") as string;

    if (!reviewText.trim()) {
      return NextResponse.json({ success: false, error: "Review has no text" }, { status: 400 });
    }

    // Cache hit
    const cachedTo = (review as Record<string, unknown>).translated_to as string | null | undefined;
    const cachedText = (review as Record<string, unknown>).translated_text as string | null | undefined;
    if (cachedTo === target_language && cachedText) {
      return NextResponse.json({ success: true, translated: cachedText, cached: true });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
    }

    const originalLang = (review as Record<string, unknown>).original_language as string | null | undefined;
    const targetName = LANGUAGE_NAMES[target_language] ?? "English";
    const sourceName = originalLang
      ? (LANGUAGE_NAMES[originalLang] ?? "the detected language")
      : "the detected language";

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
            content: `Translate this hotel review from ${sourceName} to ${targetName}. Preserve the tone, meaning, and any formatting. Return ONLY the translated text with no explanation or prefix.\n\nReview: "${reviewText}"`,
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

    const translated = data.content?.[0]?.text?.trim();
    if (!translated) {
      return NextResponse.json({ success: false, error: "Empty translation result" }, { status: 500 });
    }

    // Cache to DB (best-effort — columns may not exist yet)
    void supabase
      .from("reviews")
      .update({ translated_text: translated, translated_to: target_language })
      .eq("id", review_id)
      .then(() => {});

    return NextResponse.json({ success: true, translated, cached: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

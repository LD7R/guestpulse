/**
 * POST /api/draft-response
 *
 * -- Run in Supabase:
 * -- alter table public.hotels
 * --   add column if not exists brand_voice_enabled boolean default false,
 * --   add column if not exists brand_voice_examples jsonb default '[]',
 * --   add column if not exists brand_voice_signature text default '',
 * --   add column if not exists brand_voice_locked_opening text default '',
 * --   add column if not exists brand_voice_locked_closing text default '',
 * --   add column if not exists brand_voice_tone text default 'warm-professional',
 * --   add column if not exists brand_voice_dos jsonb default '[]',
 * --   add column if not exists brand_voice_donts jsonb default '[]',
 * --   add column if not exists default_response_language text default 'match-guest',
 * --   add column if not exists supported_response_languages jsonb default '["en"]',
 * --   add column if not exists brand_voice_traits jsonb default '[]',
 * --   add column if not exists response_length text default 'medium',
 * --   add column if not exists brand_examples jsonb default '[]',
 * --   add column if not exists brand_guidelines text default '',
 * --   add column if not exists response_language_mode text default 'match-guest',
 * --   add column if not exists brand_voice_completed_at timestamptz;
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type AnthropicMessageResponse = {
  content?: Array<{ type?: string; text?: string }>;
  error?: { type?: string; message?: string };
};

type BrandVoiceExample = {
  review_text: string;
  response_text: string;
  rating: number;
};

type HotelBrandVoice = {
  name?: string | null;
  brand_voice_enabled?: boolean | null;
  brand_voice_examples?: unknown;
  brand_voice_locked_opening?: string | null;
  brand_voice_locked_closing?: string | null;
  brand_voice_tone?: string | null;
  brand_voice_dos?: unknown;
  brand_voice_donts?: unknown;
  default_response_language?: string | null;
  supported_response_languages?: unknown;
  // Wizard-trained fields
  brand_voice_traits?: unknown;
  response_length?: string | null;
  brand_examples?: unknown;
  brand_guidelines?: string | null;
  response_language_mode?: string | null;
};

type DraftMetadata = {
  language: string;
  tone: string;
  length: string;
  used_examples: number;
  used_traits: number;
  addressed_by_name: boolean;
};

const ESSENTIAL_DRAFT_LIMIT = 10;

const LENGTH_GUIDE: Record<string, string> = {
  brief: "Write a brief, focused response of 40–60 words.",
  medium: "Write a balanced response of 70–100 words.",
  detailed: "Write a thorough, personal response of 110–160 words.",
};

const TONE_DESC: Record<string, string> = {
  "warm-professional": "Warm and professional — friendly but polished.",
  "casual-friendly": "Casual and friendly — conversational, like talking to a friend.",
  "refined-elegant": "Refined and elegant — elevated language, formal luxury hospitality.",
  "formal": "Traditional formal — classic hotel formality with respectful distance.",
  "boutique-playful": "Boutique and playful — warm personality with character and charm.",
  "direct-minimal": "Direct and minimal — concise, no fluff, straight to the point.",
  "heartfelt-sincere": "Heartfelt and sincere — emotionally warm, grateful, genuine.",
};

const LANG_NAMES: Record<string, string> = {
  en: "English", nl: "Dutch", de: "German", fr: "French",
  es: "Spanish", it: "Italian", pt: "Portuguese", id: "Indonesian",
  zh: "Chinese", ja: "Japanese", ko: "Korean", ru: "Russian",
  th: "Thai", vi: "Vietnamese", ar: "Arabic",
};

function safeArray<T>(val: unknown): T[] {
  if (!Array.isArray(val)) return [];
  return val as T[];
}

function buildSystemPrompt(
  hotel: HotelBrandVoice,
  reviewerName: string,
  responseSignature: string,
  responseLanguage: string,
  brandVoiceUsed: boolean,
  ratingNum: number | null,
): string {
  const hotelName = hotel.name || "our hotel";
  const tone = (hotel.brand_voice_tone as string) || "warm-professional";
  const lengthKey = (hotel.response_length as string | null) ?? "medium";
  const lengthGuide = LENGTH_GUIDE[lengthKey] ?? LENGTH_GUIDE["medium"]!;

  // Address reviewer by name
  const isNamedGuest = reviewerName && reviewerName !== "Guest" && reviewerName !== "Anonymous";
  const firstName = isNamedGuest ? reviewerName.split(" ")[0] : null;
  const addressInstruction = firstName
    ? `Address the reviewer by their first name "${firstName}" naturally in the response — not necessarily as a salutation, but woven into the text where it feels natural.`
    : "Do not use generic phrases like 'Dear Valued Guest'. Address the reviewer in a natural, personal way.";

  // Rating-based instruction
  let ratingInstruction = "Reference specific details from the review.";
  if (ratingNum !== null) {
    if (ratingNum <= 2) {
      ratingInstruction = "This is a negative review. Acknowledge the guest's concerns sincerely, apologize where appropriate, and offer a path forward or invitation to return. Do not be defensive.";
    } else if (ratingNum === 3) {
      ratingInstruction = "This is a mixed review. Thank the guest, acknowledge both positives and any concerns, and show commitment to improvement.";
    } else {
      ratingInstruction = "This is a positive review. Express genuine, specific gratitude. Reference the details they mentioned. Invite them back warmly.";
    }
  }

  let sys = `You are writing a review response on behalf of "${hotelName}". ${lengthGuide}\n\n${addressInstruction}\n\n${ratingInstruction}`;

  sys += `\n\nTONE: ${TONE_DESC[tone] ?? TONE_DESC["warm-professional"]}`;

  // Personality traits from wizard
  const traits = safeArray<string>(hotel.brand_voice_traits);
  if (traits.length > 0) {
    sys += `\n\nPERSONALITY TRAITS TO EMBODY: ${traits.join(", ")}. Let these traits shape every word choice.`;
  }

  // Wizard-trained examples (simple strings)
  const brandExamples = safeArray<string>(hotel.brand_examples);
  if (brandExamples.length > 0) {
    sys += "\n\nEXAMPLES OF HOW THIS HOTEL ACTUALLY RESPONDS — match this voice exactly:\n";
    brandExamples.slice(0, 3).forEach((ex, i) => {
      sys += `\n--- Example ${i + 1} ---\n"${ex}"\n`;
    });
  } else if (brandVoiceUsed) {
    // Fall back to legacy examples format
    const examples = safeArray<BrandVoiceExample>(hotel.brand_voice_examples);
    if (examples.length > 0) {
      sys += "\n\nLEARN FROM THESE EXAMPLES OF HOW THE HOTEL MANAGER ACTUALLY RESPONDS:\n";
      examples.forEach((ex, i) => {
        sys += `\n--- Example ${i + 1} ---\nGUEST WROTE (${ex.rating}★): "${ex.review_text}"\nHOTEL RESPONDED: "${ex.response_text}"\n`;
      });
      sys += "\nMatch this voice, vocabulary, sentence structure, and personality EXACTLY.";
    }
  }

  // Free-form brand guidelines from wizard
  if (hotel.brand_guidelines?.trim()) {
    sys += `\n\nBRAND GUIDELINES:\n${hotel.brand_guidelines.trim()}`;
  }

  // Legacy dos / donts
  const dos = safeArray<string>(hotel.brand_voice_dos);
  if (dos.length > 0) {
    sys += "\n\nALWAYS DO:\n" + dos.map((d) => `- ${d}`).join("\n");
  }

  const donts = safeArray<string>(hotel.brand_voice_donts);
  if (donts.length > 0) {
    sys += "\n\nNEVER DO:\n" + donts.map((d) => `- ${d}`).join("\n");
  }

  if (hotel.brand_voice_locked_opening?.trim()) {
    sys += `\n\nMUST START WITH EXACTLY: "${hotel.brand_voice_locked_opening.trim()}"`;
  }

  if (hotel.brand_voice_locked_closing?.trim()) {
    sys += `\n\nMUST END WITH EXACTLY: "${hotel.brand_voice_locked_closing.trim()}"`;
  } else {
    sys += `\n\nEnd with this sign-off on a new line: "Kind regards, ${responseSignature}"`;
  }

  sys += `\n\nRESPOND IN: ${responseLanguage}`;
  if (responseLanguage !== "en") {
    const langName = LANG_NAMES[responseLanguage] ?? responseLanguage;
    sys += ` (${langName}). The entire response must be in this language, including the signature.`;
  }

  return sys;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      review_text?: string;
      rating?: number | string | null;
      reviewer_name?: string | null;
      platform?: string | null;
      signature?: string | null;
      user_id?: string | null;
      hotel_id?: string | null;
      response_language_override?: string | null;
      original_language?: string | null;
    };

    const {
      review_text,
      rating,
      reviewer_name,
      platform,
      signature,
      user_id,
      hotel_id,
      response_language_override,
      original_language,
    } = body;

    const responseSignature =
      signature && String(signature).trim() !== ""
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

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // ── Plan check ────────────────────────────────────────────────────────────
    let isEssential = false;
    let currentDraftsUsed = 0;

    if (user_id && supabaseUrl && serviceRoleKey) {
      const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false },
      });

      const { data: profile } = await supabase
        .from("profiles")
        .select("subscription_plan, subscription_status, ai_drafts_used, ai_drafts_reset_at")
        .eq("id", user_id)
        .single();

      const plan = (profile?.subscription_plan as string | null) ?? "free";
      const status = (profile?.subscription_status as string | null) ?? "free";
      const isActive = status === "active" || status === "trialing";

      if (!isActive) {
        return NextResponse.json(
          {
            success: false,
            error: "Start your free trial to use AI response drafting.",
            upgrade_required: true,
            plan: "free",
          },
          { status: 403 },
        );
      }

      if (plan === "essential") {
        isEssential = true;
        const draftsUsed = (profile?.ai_drafts_used as number | null) ?? 0;
        const resetAt = profile?.ai_drafts_reset_at as string | null;

        const daysSinceReset = resetAt
          ? Math.floor((Date.now() - new Date(resetAt).getTime()) / 86400000)
          : 999;

        if (daysSinceReset > 30) {
          await supabase
            .from("profiles")
            .update({ ai_drafts_used: 0, ai_drafts_reset_at: new Date().toISOString() })
            .eq("id", user_id);
          currentDraftsUsed = 0;
        } else {
          currentDraftsUsed = draftsUsed;
        }

        if (currentDraftsUsed >= ESSENTIAL_DRAFT_LIMIT) {
          return NextResponse.json(
            {
              success: false,
              error: `Monthly AI draft limit reached (${ESSENTIAL_DRAFT_LIMIT}/${ESSENTIAL_DRAFT_LIMIT}). Upgrade to Professional for unlimited drafts.`,
              upgrade_required: true,
              plan: "essential",
            },
            { status: 403 },
          );
        }
      }
    }

    // ── Fetch brand voice + language settings ─────────────────────────────────
    let hotelData: HotelBrandVoice | null = null;
    let brandVoiceUsed = false;
    let examplesCount = 0;
    let responseLanguage = "en";

    if (hotel_id && supabaseUrl && serviceRoleKey) {
      const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false },
      });
      const { data } = await supabase
        .from("hotels")
        .select(
          "name, brand_voice_enabled, brand_voice_examples, brand_voice_locked_opening, brand_voice_locked_closing, brand_voice_tone, brand_voice_dos, brand_voice_donts, default_response_language, supported_response_languages, brand_voice_traits, response_length, brand_examples, brand_guidelines, response_language_mode",
        )
        .eq("id", hotel_id)
        .maybeSingle();

      if (data) {
        hotelData = data as HotelBrandVoice;

        // Determine response language (wizard field takes priority over legacy)
        const guestLang = original_language || "en";
        const langMode = (hotelData.response_language_mode as string | null) ?? null;
        const defaultLang = hotelData.default_response_language || "match-guest";

        if (response_language_override) {
          responseLanguage = response_language_override;
        } else if (langMode === "always-english") {
          responseLanguage = "en";
        } else if (langMode === "match-guest") {
          responseLanguage = guestLang;
        } else if (langMode === "auto") {
          const supported = safeArray<string>(hotelData.supported_response_languages);
          responseLanguage = supported.includes(guestLang) ? guestLang : "en";
        } else if (defaultLang === "match-guest") {
          responseLanguage = guestLang;
        } else if (defaultLang === "auto") {
          const supported = safeArray<string>(hotelData.supported_response_languages);
          responseLanguage = supported.includes(guestLang) ? guestLang : "en";
        } else {
          responseLanguage = defaultLang;
        }

        // Brand voice: wizard examples + legacy examples
        const wizardExamples = safeArray<string>(hotelData.brand_examples);
        const legacyExamples = safeArray<BrandVoiceExample>(hotelData.brand_voice_examples);
        examplesCount = wizardExamples.length > 0 ? wizardExamples.length : legacyExamples.length;
        brandVoiceUsed = !!(
          hotelData.brand_voice_enabled &&
          (examplesCount >= 1 ||
            safeArray<string>(hotelData.brand_voice_traits).length >= 1)
        );
      }
    }

    // ── Generate draft ────────────────────────────────────────────────────────
    const reviewerName = reviewer_name?.trim() || "Guest";
    const ratingNum = rating !== null && rating !== undefined && rating !== ""
      ? Number(rating)
      : null;
    const ratingLabel = ratingNum !== null && !Number.isNaN(ratingNum) ? String(ratingNum) : "—";
    const platformLabel = platform ?? "unknown";

    let requestBody: Record<string, unknown>;

    if (hotelData) {
      const systemPrompt = buildSystemPrompt(
        hotelData,
        reviewerName,
        responseSignature,
        responseLanguage,
        brandVoiceUsed,
        !Number.isNaN(ratingNum) ? ratingNum : null,
      );
      requestBody = {
        model: "claude-haiku-4-5-20251001",
        max_tokens: 800,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: `REVIEWER: ${reviewerName}\nRATING: ${ratingLabel}/5\nPLATFORM: ${platformLabel}\nREVIEW TEXT:\n${review_text}`,
          },
        ],
      };
    } else {
      // Legacy prompt (no hotel_id)
      const isNamed = reviewerName !== "Guest" && reviewerName !== "Anonymous";
      const firstName = isNamed ? reviewerName.split(" ")[0] : null;
      const nameHint = firstName
        ? `Address the reviewer by their first name "${firstName}" naturally in the response.`
        : "Do not use 'Dear Valued Guest'.";
      requestBody = {
        model: "claude-haiku-4-5-20251001",
        max_tokens: 800,
        messages: [
          {
            role: "user",
            content: `You are a professional hotel manager writing a response to a guest review. Write a warm genuine response of 70-100 words. Reference specific details they mentioned. ${nameHint} End with exactly this sign-off on a new line: "Kind regards, ${responseSignature}"\n\nREVIEWER: ${reviewerName}\nRATING: ${ratingLabel}/5\nPLATFORM: ${platformLabel}\nREVIEW TEXT:\n${review_text}`,
          },
        ],
      };
    }

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const data = (await res.json()) as AnthropicMessageResponse;

    if (!res.ok) {
      const msg = data.error?.message ?? `Anthropic API error (${res.status})`;
      return NextResponse.json({ success: false, error: msg }, { status: 502 });
    }

    const text = data.content?.[0]?.text;
    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { success: false, error: "No response text from Anthropic" },
        { status: 502 },
      );
    }

    // ── Increment counter for Essential plan ──────────────────────────────────
    if (isEssential && user_id && supabaseUrl && serviceRoleKey) {
      const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false },
      });
      await supabase
        .from("profiles")
        .update({ ai_drafts_used: currentDraftsUsed + 1 })
        .eq("id", user_id);
    }

    const isNamed = reviewerName !== "Guest" && reviewerName !== "Anonymous";
    const metadata: DraftMetadata = {
      language: responseLanguage,
      tone: (hotelData?.brand_voice_tone as string | null) ?? "warm-professional",
      length: (hotelData?.response_length as string | null) ?? "medium",
      used_examples: examplesCount,
      used_traits: hotelData ? safeArray<string>(hotelData.brand_voice_traits).length : 0,
      addressed_by_name: isNamed,
    };

    return NextResponse.json({
      success: true,
      response: text,
      draft: text,
      brand_voice_used: brandVoiceUsed,
      examples_count: examplesCount,
      response_language: responseLanguage,
      metadata,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type AnthropicMessageResponse = {
  content?: Array<{ type?: string; text?: string }>;
  error?: { type?: string; message?: string };
};

const ESSENTIAL_DRAFT_LIMIT = 10;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      review_text?: string;
      rating?: number | string | null;
      reviewer_name?: string | null;
      platform?: string | null;
      signature?: string | null;
      user_id?: string | null;
    };

    const { review_text, rating, reviewer_name, platform, signature, user_id } = body;
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

    // ── Plan check ────────────────────────────────────────────────────────────
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

      // Free plan: no AI drafts
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

        // Reset counter if more than 30 days since last reset
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

    // ── Generate draft ────────────────────────────────────────────────────────
    const reviewerName = reviewer_name ?? "Guest";
    const ratingLabel =
      rating !== null && rating !== undefined && rating !== "" ? String(rating) : "—";
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

    return NextResponse.json({ success: true, response: text });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

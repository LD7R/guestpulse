"use client";

/**
 * DB columns needed (run in Supabase):
 *
 * alter table public.hotels
 *   add column if not exists brand_voice_traits jsonb default '[]',
 *   add column if not exists response_length text default 'medium',
 *   add column if not exists brand_examples jsonb default '[]',
 *   add column if not exists brand_guidelines text default '',
 *   add column if not exists response_language_mode text default 'match-guest',
 *   add column if not exists brand_voice_completed_at timestamptz,
 *   add column if not exists brand_voice_draft jsonb default null,
 *   add column if not exists brand_voice_draft_step integer default 1,
 *   add column if not exists brand_voice_draft_updated_at timestamptz;
 */

import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

// ─── Design constants ─────────────────────────────────────────────────────────

const C = {
  bg: "#0d0d0d",
  card: "#141414",
  border: "#1e1e1e",
  border2: "#2a2a2a",
  textPrimary: "#f0f0f0",
  textSecondary: "#888888",
  textMuted: "#555555",
  green: "#4ade80",
  amber: "#fbbf24",
  red: "#f87171",
} as const;

// ─── Wizard config ────────────────────────────────────────────────────────────

const STEPS = ["Tone", "Traits", "Style", "Examples", "Language", "Preview"] as const;

const TONES = [
  {
    id: "warm-professional",
    name: "Warm & Professional",
    desc: "Friendly but maintains professional distance",
    example: "Thank you so much for sharing your experience with us…",
  },
  {
    id: "casual-friendly",
    name: "Casual & Friendly",
    desc: "Conversational, like talking to a friend",
    example: "Hey Sarah! Thanks for the lovely review, means a lot!",
  },
  {
    id: "refined-elegant",
    name: "Refined & Elegant",
    desc: "Sophisticated luxury hotel formality",
    example: "Dear Mr. Smith, We are most grateful for your kind words…",
  },
] as const;

const TRAIT_PILLS = [
  "Warm", "Professional", "Personal", "Sincere", "Attentive", "Thoughtful",
  "Welcoming", "Genuine", "Caring", "Responsive", "Helpful", "Courteous",
  "Friendly", "Sophisticated", "Relaxed", "Energetic",
] as const;

const LENGTH_OPTIONS = [
  {
    id: "brief",
    name: "Brief",
    desc: "Short & punchy — gets to the point fast",
    detail: "under 60 words",
  },
  {
    id: "medium",
    name: "Medium",
    desc: "Balanced — warm without being verbose",
    detail: "60–100 words",
  },
  {
    id: "detailed",
    name: "Detailed",
    desc: "Thorough & personal — luxury standard",
    detail: "100+ words",
  },
] as const;

const LANGUAGE_OPTIONS = [
  {
    id: "always-english",
    name: "Always English",
    desc: "All responses in English regardless of review language",
    icon: "EN",
  },
  {
    id: "match-guest",
    name: "Match guest language",
    desc: "Respond in the same language the guest used",
    icon: "🌍",
  },
  {
    id: "auto",
    name: "Auto (smart detect)",
    desc: "English by default, native language if fully supported",
    icon: "◎",
  },
] as const;

const PREVIEW_SAMPLES = [
  {
    id: "5star",
    label: "5★ Glowing",
    text: "Beautiful hotel with great service! Staff at reception were exceptional and breakfast was delicious. Will definitely return!",
    rating: 5,
    reviewer: "Sarah M.",
  },
  {
    id: "4star",
    label: "4★ Good",
    text: "Really enjoyed our stay. Room was comfortable and clean, pool area is fantastic. Breakfast could have more variety but overall great.",
    rating: 4,
    reviewer: "James K.",
  },
  {
    id: "3star",
    label: "3★ Mixed",
    text: "Nice location and friendly staff but the room was small and AC was noisy. Breakfast was good. Overall decent.",
    rating: 3,
    reviewer: "Anna P.",
  },
  {
    id: "1star",
    label: "1★ Negative",
    text: "Terrible experience. Room wasn't ready on arrival, shower was broken and no one fixed it. Very disappointed.",
    rating: 1,
    reviewer: "Tom W.",
  },
] as const;

// ─── Types ────────────────────────────────────────────────────────────────────

type WizardAnswers = {
  tone: string;
  traits: string[];
  responseLength: string;
  examples: string;     // textarea: separate multiple with ---
  guidelines: string;
  languageMode: string;
};

const DEFAULT_ANSWERS: WizardAnswers = {
  tone: "",
  traits: [],
  responseLength: "medium",
  examples: "",
  guidelines: "",
  languageMode: "match-guest",
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function BrandVoicePage() {
  const router = useRouter();

  const [hotelId, setHotelId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<WizardAnswers>(DEFAULT_ANSWERS);
  const [isEditMode, setIsEditMode] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Autosave
  const [autosaveStatus, setAutosaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const autosaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasMountedRef = useRef(false);

  // Resume notice
  const [showResumeNotice, setShowResumeNotice] = useState(false);

  // Preview
  const [previewSample, setPreviewSample] = useState("5star");
  const [previewOutput, setPreviewOutput] = useState("");
  const [generatingPreview, setGeneratingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Toast (for preview errors only; save errors are inline)
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = useCallback((type: "success" | "error", message: string) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), type === "success" ? 3000 : 5000);
  }, []);

  // ── Load hotel ───────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        );
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: hotel } = await supabase
          .from("hotels")
          .select(
            "id, name, response_signature, brand_voice_tone, brand_voice_traits, response_length, brand_examples, brand_guidelines, response_language_mode, brand_voice_completed_at, brand_voice_draft, brand_voice_draft_step, brand_voice_draft_updated_at",
          )
          .eq("user_id", user.id)
          .maybeSingle();

        if (hotel) {
          const h = hotel as Record<string, unknown>;
          setHotelId(h.id as string);

          const completedAt = h.brand_voice_completed_at as string | null;
          setIsEditMode(!!completedAt);
          setLastUpdated(completedAt);

          if (completedAt) {
            // EDIT MODE — load saved final answers
            const traits = Array.isArray(h.brand_voice_traits) ? (h.brand_voice_traits as string[]) : [];
            const examplesArr = Array.isArray(h.brand_examples) ? (h.brand_examples as string[]) : [];
            const rawTone = (h.brand_voice_tone as string | null) ?? "";
            const wizardTone = TONES.some((t) => t.id === rawTone) ? rawTone : "";

            setAnswers({
              tone: wizardTone,
              traits,
              responseLength: (h.response_length as string | null) ?? "medium",
              examples: examplesArr.filter(Boolean).join("\n\n---\n\n"),
              guidelines: (h.brand_guidelines as string | null) ?? "",
              languageMode: (h.response_language_mode as string | null) ?? "match-guest",
            });
          } else if (h.brand_voice_draft) {
            // DRAFT MODE — resume from autosaved state
            const draft = h.brand_voice_draft as Record<string, unknown>;
            const draftTraits = Array.isArray(draft.traits) ? (draft.traits as string[]) : [];
            const rawTone = (draft.tone as string | null) ?? "";
            const wizardTone = TONES.some((t) => t.id === rawTone) ? rawTone : "";

            setAnswers({
              tone: wizardTone,
              traits: draftTraits,
              responseLength: (draft.responseLength as string | null) ?? "medium",
              examples: (draft.examples as string | null) ?? "",
              guidelines: (draft.guidelines as string | null) ?? "",
              languageMode: (draft.languageMode as string | null) ?? "match-guest",
            });

            const savedStep = (h.brand_voice_draft_step as number | null) ?? 1;
            setStep(Math.max(1, Math.min(6, savedStep)));

            if (h.brand_voice_draft_updated_at) {
              setShowResumeNotice(true);
              window.setTimeout(() => setShowResumeNotice(false), 4000);
            }
          } else {
            // No draft, no completed — keep defaults but load any partial DB values
            const traits = Array.isArray(h.brand_voice_traits) ? (h.brand_voice_traits as string[]) : [];
            const examplesArr = Array.isArray(h.brand_examples) ? (h.brand_examples as string[]) : [];
            const rawTone = (h.brand_voice_tone as string | null) ?? "";
            const wizardTone = TONES.some((t) => t.id === rawTone) ? rawTone : "";

            setAnswers({
              tone: wizardTone,
              traits,
              responseLength: (h.response_length as string | null) ?? "medium",
              examples: examplesArr.filter(Boolean).join("\n\n---\n\n"),
              guidelines: (h.brand_guidelines as string | null) ?? "",
              languageMode: (h.response_language_mode as string | null) ?? "match-guest",
            });
          }
        }
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  // ── Autosave (debounced, 1.5s) ────────────────────────────────────────────────
  const triggerAutosave = useCallback((currentStep: number) => {
    if (!hotelId) return;
    if (isEditMode) return; // Don't autosave if already completed; use normal save

    if (autosaveRef.current) clearTimeout(autosaveRef.current);

    setAutosaveStatus("saving");

    autosaveRef.current = setTimeout(async () => {
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        );
        const { error } = await supabase
          .from("hotels")
          .update({
            brand_voice_draft: {
              tone: answers.tone,
              traits: answers.traits,
              responseLength: answers.responseLength,
              examples: answers.examples,
              guidelines: answers.guidelines,
              languageMode: answers.languageMode,
            },
            brand_voice_draft_step: currentStep,
            brand_voice_draft_updated_at: new Date().toISOString(),
          })
          .eq("id", hotelId);

        if (error) throw error;

        setAutosaveStatus("saved");
        window.setTimeout(() => setAutosaveStatus("idle"), 2000);
      } catch (err) {
        setAutosaveStatus("error");
        console.error("Autosave failed:", err);
      }
    }, 1500);
  }, [hotelId, isEditMode, answers]);

  // Trigger autosave whenever answers or step change (skip first render)
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    triggerAutosave(step);
  }, [answers, step, triggerAutosave]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (autosaveRef.current) clearTimeout(autosaveRef.current);
    };
  }, []);

  // ── Step navigation (with immediate save on step change) ─────────────────────
  async function goToStep(newStep: number) {
    setStep(newStep);

    if (!hotelId || isEditMode) return;

    // Cancel pending debounced save
    if (autosaveRef.current) {
      clearTimeout(autosaveRef.current);
      autosaveRef.current = null;
    }

    // Immediate save on step change
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );
      await supabase
        .from("hotels")
        .update({
          brand_voice_draft: {
            tone: answers.tone,
            traits: answers.traits,
            responseLength: answers.responseLength,
            examples: answers.examples,
            guidelines: answers.guidelines,
            languageMode: answers.languageMode,
          },
          brand_voice_draft_step: newStep,
          brand_voice_draft_updated_at: new Date().toISOString(),
        })
        .eq("id", hotelId);

      setAutosaveStatus("saved");
      window.setTimeout(() => setAutosaveStatus("idle"), 2000);
    } catch {
      // Silent — don't block navigation on autosave failure
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function canAdvance(): boolean {
    if (step === 1) return answers.tone !== "";
    if (step === 2) return answers.traits.length >= 2;
    if (step === 5) return answers.languageMode !== "";
    return true;
  }

  function toggleTrait(trait: string) {
    setAnswers((prev) => {
      if (prev.traits.includes(trait)) {
        return { ...prev, traits: prev.traits.filter((t) => t !== trait) };
      }
      if (prev.traits.length >= 4) return prev;
      return { ...prev, traits: [...prev.traits, trait] };
    });
  }

  function examplesAsArray(): string[] {
    return answers.examples
      .split(/---+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  // ── Save ─────────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!hotelId) {
      setSaveError("No hotel found. Set up your hotel in Settings first.");
      return;
    }
    setSaving(true);
    setSaveError(null);

    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );

      // Re-verify auth
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Confirm hotel still belongs to user
      const { data: hotelCheck } = await supabase
        .from("hotels")
        .select("id")
        .eq("id", hotelId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!hotelCheck) throw new Error("Hotel not found or access denied");

      const { error } = await supabase
        .from("hotels")
        .update({
          brand_voice_tone: answers.tone,
          brand_voice_traits: answers.traits,
          response_length: answers.responseLength,
          brand_examples: examplesAsArray(),
          brand_guidelines: answers.guidelines.trim() || null,
          response_language_mode: answers.languageMode,
          brand_voice_enabled: true,
          brand_voice_completed_at: new Date().toISOString(),
          // Clear draft state
          brand_voice_draft: null,
          brand_voice_draft_step: null,
          brand_voice_draft_updated_at: null,
        })
        .eq("id", hotelId);

      if (error) throw error;

      // Redirect to dashboard with success param
      router.push("/dashboard?brand_voice=saved");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  // ── Generate preview ──────────────────────────────────────────────────────────
  async function handleGeneratePreview() {
    if (!hotelId) return;
    setGeneratingPreview(true);
    setPreviewOutput("");
    setPreviewError(null);

    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );
      const { data: { user } } = await supabase.auth.getUser();

      // Temporarily push current answers to DB so the API picks them up
      await supabase
        .from("hotels")
        .update({
          brand_voice_tone: answers.tone,
          brand_voice_traits: answers.traits,
          response_length: answers.responseLength,
          brand_examples: examplesAsArray(),
          brand_guidelines: answers.guidelines.trim() || null,
          response_language_mode: answers.languageMode,
          brand_voice_enabled: true,
        })
        .eq("id", hotelId);

      const sample = PREVIEW_SAMPLES.find((s) => s.id === previewSample) ?? PREVIEW_SAMPLES[0]!;
      const res = await fetch("/api/draft-response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          review_text: sample.text,
          rating: sample.rating,
          reviewer_name: sample.reviewer,
          platform: "preview",
          hotel_id: hotelId,
          user_id: user?.id ?? null,
        }),
      });

      const json = (await res.json()) as {
        success?: boolean;
        response?: string;
        draft?: string;
        error?: string;
        upgrade_required?: boolean;
      };

      if (json.upgrade_required) {
        setPreviewError("⚠ Upgrade required to use AI draft preview.");
        return;
      }
      const text = json.draft ?? json.response;
      if (!json.success || !text) throw new Error(json.error ?? "Failed to generate preview");
      setPreviewOutput(text);
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : "Failed to generate preview");
      showToast("error", err instanceof Error ? err.message : "Preview failed");
    } finally {
      setGeneratingPreview(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ background: C.bg, minHeight: "100vh", padding: "24px 28px", color: C.textMuted }}>
        Loading…
      </div>
    );
  }

  const progressPct = Math.round((step / STEPS.length) * 100);

  return (
    <div
      style={{
        background: C.bg,
        minHeight: "100vh",
        padding: "24px 28px 60px",
        boxSizing: "border-box",
        maxWidth: 680,
        margin: "0 auto",
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes bv-spin { to { transform: rotate(360deg); } }
        @keyframes bv-fade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes bv-pulse { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }
        .bv-step { animation: bv-fade 0.22s ease; }
      ` }} />

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 1000,
          background: toast.type === "success" ? "#052e16" : "#1a0505",
          border: `1px solid ${toast.type === "success" ? "#166534" : "#4a1010"}`,
          borderRadius: 8, padding: "12px 16px", fontSize: 13,
          color: toast.type === "success" ? C.green : C.red,
          display: "flex", gap: 8, alignItems: "center", maxWidth: 320,
          animation: "bv-fade 0.2s ease",
        }}>
          <span>{toast.type === "success" ? "✓" : "⚠"}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 20, fontWeight: 500, color: C.textPrimary, margin: "0 0 4px" }}>
          {isEditMode ? "Re-train brand voice" : "Brand voice trainer"}
        </h1>
        <p style={{ fontSize: 12, color: C.textMuted, margin: 0 }}>
          {isEditMode && lastUpdated
            ? `Last updated ${new Date(lastUpdated).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
            : "Answer a few questions so AI responses sound exactly like your hotel"}
        </p>
      </div>

      {/* Resume notice */}
      {showResumeNotice && (
        <div style={{
          background: "#0a1a0a",
          border: "1px solid #1a3a1a",
          borderRadius: 6,
          padding: "10px 14px",
          marginBottom: 16,
          fontSize: 12,
          color: C.green,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          animation: "bv-fade 0.2s ease",
        }}>
          <span>✓ Resumed from where you left off</span>
          <button
            type="button"
            onClick={() => {
              setAnswers(DEFAULT_ANSWERS);
              setStep(1);
              setShowResumeNotice(false);
            }}
            style={{
              background: "transparent",
              border: "none",
              color: C.green,
              fontSize: 11,
              cursor: "pointer",
              textDecoration: "underline",
              fontFamily: "inherit",
            }}
          >
            Start over
          </button>
        </div>
      )}

      {/* No hotel warning */}
      {!hotelId && (
        <div style={{ background: "#1a0505", border: "1px solid #3a1010", borderRadius: 8, padding: 16, marginBottom: 20, fontSize: 13, color: C.red }}>
          ⚠ No hotel found.{" "}
          <Link href="/dashboard/settings" style={{ color: C.red, textDecoration: "underline" }}>
            Set up your hotel in Settings
          </Link>{" "}
          first.
        </div>
      )}

      {/* Progress card */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "16px 20px", marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 12, color: C.textMuted, fontWeight: 500 }}>
            Step {step} of {STEPS.length}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Autosave status indicator */}
            {autosaveStatus === "saving" && (
              <span style={{ fontSize: 11, color: C.textMuted, display: "inline-flex", alignItems: "center", gap: 5 }}>
                <span style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: C.amber,
                  display: "inline-block",
                  animation: "bv-pulse 1s ease infinite",
                }} />
                Saving…
              </span>
            )}
            {autosaveStatus === "saved" && (
              <span style={{ fontSize: 11, color: C.green, display: "inline-flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.green, display: "inline-block" }} />
                Saved
              </span>
            )}
            {autosaveStatus === "error" && (
              <span style={{ fontSize: 11, color: C.red }}>Save failed</span>
            )}
            <span style={{ fontSize: 12, color: C.textSecondary }}>
              {STEPS[step - 1]}
            </span>
          </div>
        </div>
        <div style={{ height: 3, background: "#1e1e1e", borderRadius: 3, overflow: "hidden", marginBottom: 14 }}>
          <div style={{
            height: "100%", width: `${progressPct}%`,
            background: C.green, borderRadius: 3, transition: "width 0.35s ease",
          }} />
        </div>
        {/* Step dots */}
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          {STEPS.map((label, i) => {
            const n = i + 1;
            const done = n < step;
            const active = n === step;
            return (
              <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, flex: 1 }}>
                <div style={{
                  width: 20, height: 20, borderRadius: "50%", fontSize: 10, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: done ? C.green : active ? C.textPrimary : "#1e1e1e",
                  color: done || active ? "#0d0d0d" : C.textMuted,
                  transition: "background 0.2s",
                }}>
                  {done ? "✓" : String(n)}
                </div>
                <span style={{
                  fontSize: 9, letterSpacing: "0.06em", fontWeight: active ? 600 : 400,
                  color: active ? C.textSecondary : C.textMuted,
                }}>
                  {label.toUpperCase()}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step content */}
      <div className="bv-step" key={step}>

        {/* STEP 1 — Tone */}
        {step === 1 && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 500, color: C.textPrimary, margin: "0 0 6px" }}>
                What&apos;s your hotel&apos;s vibe?
              </h2>
              <p style={{ fontSize: 13, color: C.textMuted, margin: 0 }}>
                Choose the tone that best matches how you communicate with guests.
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {TONES.map((tone) => {
                const selected = answers.tone === tone.id;
                return (
                  <button
                    key={tone.id}
                    type="button"
                    onClick={() => setAnswers((prev) => ({ ...prev, tone: tone.id }))}
                    style={{
                      background: selected ? "#0a1a0a" : C.card,
                      border: `1px solid ${selected ? C.green : C.border}`,
                      borderRadius: 10, padding: "18px 20px",
                      cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                    }}
                    onMouseEnter={(e) => { if (!selected) e.currentTarget.style.borderColor = C.border2; }}
                    onMouseLeave={(e) => { if (!selected) e.currentTarget.style.borderColor = C.border; }}
                  >
                    <div style={{ fontSize: 15, fontWeight: 600, color: selected ? C.green : C.textPrimary, marginBottom: 4 }}>
                      {tone.name}
                    </div>
                    <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 10 }}>{tone.desc}</div>
                    <div style={{ fontSize: 12, color: "#666666", fontStyle: "italic", background: "#0d0d0d", padding: "8px 12px", borderRadius: 6 }}>
                      &ldquo;{tone.example}&rdquo;
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 2 — Traits */}
        {step === 2 && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 500, color: C.textPrimary, margin: "0 0 6px" }}>
                How would guests describe you?
              </h2>
              <p style={{ fontSize: 13, color: C.textMuted, margin: 0 }}>
                Pick 2–4 traits that define your hotel&apos;s personality. These guide the AI&apos;s word choice.
              </p>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
              {TRAIT_PILLS.map((trait) => {
                const selected = answers.traits.includes(trait);
                const atMax = answers.traits.length >= 4 && !selected;
                return (
                  <button
                    key={trait}
                    type="button"
                    onClick={() => !atMax && toggleTrait(trait)}
                    style={{
                      background: selected ? "#0a1a0a" : "#111111",
                      border: `1px solid ${selected ? C.green : C.border2}`,
                      borderRadius: 20, padding: "7px 14px",
                      fontSize: 13, fontWeight: selected ? 600 : 400,
                      color: selected ? C.green : atMax ? C.textMuted : C.textSecondary,
                      cursor: atMax ? "not-allowed" : "pointer",
                      fontFamily: "inherit", opacity: atMax ? 0.5 : 1,
                    }}
                  >
                    {selected && <span style={{ marginRight: 4 }}>✓</span>}
                    {trait}
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize: 12, color: answers.traits.length >= 2 ? C.green : C.textMuted }}>
              {answers.traits.length === 0
                ? "Select at least 2 traits"
                : answers.traits.length === 1
                  ? "Select 1 more trait"
                  : answers.traits.length >= 4
                    ? `✓ ${answers.traits.length} traits selected (maximum reached)`
                    : `✓ ${answers.traits.length} traits selected`}
            </div>
          </div>
        )}

        {/* STEP 3 — Response length */}
        {step === 3 && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 500, color: C.textPrimary, margin: "0 0 6px" }}>
                How long should responses be?
              </h2>
              <p style={{ fontSize: 13, color: C.textMuted, margin: 0 }}>
                This sets the default target length for every AI-drafted response.
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {LENGTH_OPTIONS.map((opt) => {
                const selected = answers.responseLength === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setAnswers((prev) => ({ ...prev, responseLength: opt.id }))}
                    style={{
                      background: selected ? "#0a1a0a" : C.card,
                      border: `1px solid ${selected ? C.green : C.border}`,
                      borderRadius: 10, padding: "16px 20px",
                      cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                      display: "flex", alignItems: "center", gap: 16,
                    }}
                    onMouseEnter={(e) => { if (!selected) e.currentTarget.style.borderColor = C.border2; }}
                    onMouseLeave={(e) => { if (!selected) e.currentTarget.style.borderColor = C.border; }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: selected ? C.green : C.textPrimary }}>
                          {opt.name}
                        </span>
                        <span style={{ fontSize: 11, color: C.textMuted, background: "#1e1e1e", padding: "2px 7px", borderRadius: 4 }}>
                          {opt.detail}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: C.textMuted }}>{opt.desc}</div>
                    </div>
                    {selected && <span style={{ color: C.green, fontSize: 16 }}>✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 4 — Examples (optional) */}
        {step === 4 && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 500, color: C.textPrimary, margin: "0 0 6px" }}>
                Share some of your best responses
              </h2>
              <p style={{ fontSize: 13, color: C.textMuted, margin: 0 }}>
                Optional but powerful — paste 1–3 responses you&apos;ve written. The AI will learn your exact style.
              </p>
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: C.textMuted, textTransform: "uppercase", marginBottom: 8 }}>
                Your past responses{" "}
                <span style={{ color: C.textMuted, fontWeight: 400, textTransform: "none" }}>
                  (separate multiple with ---)
                </span>
              </div>
              <textarea
                value={answers.examples}
                onChange={(e) => setAnswers((prev) => ({ ...prev, examples: e.target.value }))}
                placeholder={"Paste your best review response here...\n\n---\n\nPaste another response here (optional)..."}
                style={{
                  width: "100%", minHeight: 160, background: "#111111",
                  border: `1px solid ${C.border2}`, borderRadius: 8,
                  padding: "12px 14px", color: C.textPrimary, fontSize: 13,
                  fontFamily: "inherit", lineHeight: 1.6, resize: "vertical",
                  outline: "none", boxSizing: "border-box",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "#3a3a3a"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = C.border2; }}
              />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: C.textMuted, textTransform: "uppercase", marginBottom: 8 }}>
                Brand guidelines{" "}
                <span style={{ fontWeight: 400, textTransform: "none", color: C.textMuted }}>
                  (optional)
                </span>
              </div>
              <textarea
                value={answers.guidelines}
                onChange={(e) => setAnswers((prev) => ({ ...prev, guidelines: e.target.value }))}
                placeholder="Always mention our loyalty program. Never apologize for our prices. Always thank guests by name..."
                style={{
                  width: "100%", minHeight: 80, background: "#111111",
                  border: `1px solid ${C.border2}`, borderRadius: 8,
                  padding: "12px 14px", color: C.textPrimary, fontSize: 13,
                  fontFamily: "inherit", lineHeight: 1.6, resize: "vertical",
                  outline: "none", boxSizing: "border-box",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "#3a3a3a"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = C.border2; }}
              />
            </div>
            <p style={{ fontSize: 12, color: C.textMuted, marginTop: 10, marginBottom: 0 }}>
              You can skip this step — the AI will still use your tone and traits.
            </p>
          </div>
        )}

        {/* STEP 5 — Language */}
        {step === 5 && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 500, color: C.textPrimary, margin: "0 0 6px" }}>
                What language should responses be in?
              </h2>
              <p style={{ fontSize: 13, color: C.textMuted, margin: 0 }}>
                Choose how the AI handles reviews written in different languages.
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {LANGUAGE_OPTIONS.map((opt) => {
                const selected = answers.languageMode === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setAnswers((prev) => ({ ...prev, languageMode: opt.id }))}
                    style={{
                      background: selected ? "#0a1a0a" : C.card,
                      border: `1px solid ${selected ? C.green : C.border}`,
                      borderRadius: 10, padding: "16px 20px",
                      cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                      display: "flex", alignItems: "center", gap: 16,
                    }}
                    onMouseEnter={(e) => { if (!selected) e.currentTarget.style.borderColor = C.border2; }}
                    onMouseLeave={(e) => { if (!selected) e.currentTarget.style.borderColor = C.border; }}
                  >
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, background: "#1e1e1e",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 13, color: C.textSecondary, flexShrink: 0,
                    }}>
                      {opt.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: selected ? C.green : C.textPrimary, marginBottom: 3 }}>
                        {opt.name}
                      </div>
                      <div style={{ fontSize: 12, color: C.textMuted }}>{opt.desc}</div>
                    </div>
                    {selected && <span style={{ color: C.green, fontSize: 16 }}>✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 6 — Preview & save */}
        {step === 6 && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 500, color: C.textPrimary, margin: "0 0 6px" }}>
                Preview your brand voice
              </h2>
              <p style={{ fontSize: 13, color: C.textMuted, margin: 0 }}>
                Test how the AI will respond, then save to activate your brand voice.
              </p>
            </div>

            {/* Summary tags */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "14px 16px", marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", color: C.textMuted, marginBottom: 10 }}>
                YOUR BRAND VOICE SUMMARY
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {[
                  TONES.find((t) => t.id === answers.tone)?.name,
                  LENGTH_OPTIONS.find((l) => l.id === answers.responseLength)?.name + " responses",
                  LANGUAGE_OPTIONS.find((l) => l.id === answers.languageMode)?.name,
                  ...answers.traits,
                ]
                  .filter(Boolean)
                  .map((tag) => (
                    <span
                      key={tag}
                      style={{
                        background: "#0a1a0a", border: "1px solid #1a3a1a",
                        borderRadius: 20, padding: "4px 10px", fontSize: 12, color: C.green,
                      }}
                    >
                      {tag}
                    </span>
                  ))}
              </div>
            </div>

            {/* Sample selector */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: C.textMuted, textTransform: "uppercase", marginBottom: 8 }}>
                Test with a sample review
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {PREVIEW_SAMPLES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => { setPreviewSample(s.id); setPreviewOutput(""); setPreviewError(null); }}
                    style={{
                      background: previewSample === s.id ? "#0a1a0a" : "#111111",
                      border: `1px solid ${previewSample === s.id ? C.green : C.border2}`,
                      borderRadius: 20, padding: "5px 12px", fontSize: 12,
                      color: previewSample === s.id ? C.green : C.textMuted,
                      cursor: "pointer", fontFamily: "inherit",
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sample text */}
            <div style={{
              background: "#0a0a0a", border: `1px solid ${C.border}`,
              borderRadius: 6, padding: "12px 14px", marginBottom: 12,
              fontSize: 13, color: C.textSecondary, lineHeight: 1.6,
            }}>
              <span style={{ fontSize: 11, color: C.textMuted }}>
                {PREVIEW_SAMPLES.find((s) => s.id === previewSample)?.reviewer} · {" "}
              </span>
              {PREVIEW_SAMPLES.find((s) => s.id === previewSample)?.text}
            </div>

            <button
              type="button"
              onClick={() => void handleGeneratePreview()}
              disabled={generatingPreview || !hotelId}
              style={{
                background: C.card, border: `1px solid ${C.border2}`,
                borderRadius: 6, padding: "8px 16px", fontSize: 12, fontWeight: 500,
                color: C.textSecondary, cursor: generatingPreview || !hotelId ? "not-allowed" : "pointer",
                opacity: generatingPreview || !hotelId ? 0.6 : 1,
                fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 16,
              }}
            >
              {generatingPreview ? (
                <>
                  <span style={{
                    width: 10, height: 10, borderRadius: "50%",
                    border: "2px solid #555", borderTopColor: C.textPrimary,
                    animation: "bv-spin 0.6s linear infinite", display: "inline-block",
                  }} />
                  Generating…
                </>
              ) : "Generate preview →"}
            </button>

            {previewError && (
              <div style={{ fontSize: 12, color: C.amber, marginBottom: 12 }}>⚠ {previewError}</div>
            )}

            {previewOutput && (
              <div style={{
                background: "#0a0a0a", border: `1px solid ${C.border}`,
                borderRadius: 8, padding: "14px 16px", marginBottom: 16,
                fontSize: 13, color: "#cccccc", lineHeight: 1.7, whiteSpace: "pre-wrap",
                animation: "bv-fade 0.2s ease",
              }}>
                {previewOutput}
              </div>
            )}

            {/* Save error */}
            {saveError && (
              <div style={{
                background: "#1a0505", border: "1px solid #3a1010",
                borderRadius: 6, padding: "10px 14px", marginBottom: 12,
                fontSize: 13, color: C.red,
              }}>
                ⚠ {saveError}
              </div>
            )}

            {/* Save button */}
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving || !hotelId}
              style={{
                width: "100%", background: C.green, border: "none",
                borderRadius: 8, padding: "14px 20px",
                fontSize: 14, fontWeight: 700, color: "#0d0d0d",
                cursor: saving || !hotelId ? "not-allowed" : "pointer",
                opacity: saving || !hotelId ? 0.6 : 1,
                fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              {saving ? (
                <>
                  <span style={{
                    width: 14, height: 14, borderRadius: "50%",
                    border: "2px solid rgba(0,0,0,0.2)", borderTopColor: "#0d0d0d",
                    animation: "bv-spin 0.6s linear infinite", display: "inline-block",
                  }} />
                  Saving…
                </>
              ) : isEditMode ? "Update brand voice ✓" : "Save brand voice ✓"}
            </button>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginTop: 28, paddingTop: 20, borderTop: `1px solid ${C.border}`,
      }}>
        <button
          type="button"
          onClick={() => void goToStep(Math.max(1, step - 1))}
          disabled={step === 1}
          style={{
            background: "transparent", border: `1px solid ${C.border}`,
            borderRadius: 6, padding: "8px 16px", fontSize: 13, color: C.textMuted,
            cursor: step === 1 ? "not-allowed" : "pointer",
            fontFamily: "inherit", opacity: step === 1 ? 0.4 : 1,
          }}
        >
          ← Back
        </button>

        {step < 6 && (
          <button
            type="button"
            onClick={() => canAdvance() && void goToStep(Math.min(6, step + 1))}
            disabled={!canAdvance()}
            style={{
              background: canAdvance() ? C.textPrimary : "#1e1e1e",
              border: "none", borderRadius: 6, padding: "8px 20px",
              fontSize: 13, fontWeight: 600,
              color: canAdvance() ? "#0d0d0d" : C.textMuted,
              cursor: canAdvance() ? "pointer" : "not-allowed",
              fontFamily: "inherit",
            }}
          >
            Continue →
          </button>
        )}
      </div>
    </div>
  );
}

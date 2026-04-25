"use client";

import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type BrandVoiceExample = {
  review_text: string;
  response_text: string;
  rating: number;
};

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

const cardStyle: CSSProperties = {
  background: C.card,
  border: `1px solid ${C.border}`,
  borderRadius: 8,
};

const labelStyle: CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: C.textMuted,
  marginBottom: 8,
};

const inp: CSSProperties = {
  background: "#111111",
  border: `1px solid ${C.border2}`,
  borderRadius: 6,
  padding: "10px 12px",
  color: C.textPrimary,
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
  resize: "vertical" as const,
  width: "100%",
};

// ─── Tone options ─────────────────────────────────────────────────────────────

const TONES = [
  {
    id: "warm-professional",
    name: "Warm professional",
    desc: "Friendly but maintains professional distance",
    example: "Thank you so much for sharing your experience...",
  },
  {
    id: "casual-friendly",
    name: "Casual friendly",
    desc: "Conversational like talking to a friend",
    example: "Hey Sarah! Thanks for the lovely review...",
  },
  {
    id: "formal",
    name: "Formal",
    desc: "Traditional luxury hotel formality",
    example: "Dear Mr. Smith, We are most grateful...",
  },
  {
    id: "boutique-playful",
    name: "Boutique playful",
    desc: "Warm with personality and character",
    example: "What a treat to read your kind words...",
  },
  {
    id: "direct-minimal",
    name: "Direct minimal",
    desc: "Concise and to the point",
    example: "Thank you Sarah. We're glad you enjoyed...",
  },
  {
    id: "heartfelt-sincere",
    name: "Heartfelt sincere",
    desc: "Emotional and grateful tone",
    example: "Reading this truly made our day...",
  },
] as const;

// ─── Sample reviews for preview ───────────────────────────────────────────────

const SAMPLE_REVIEWS = {
  "5star": {
    label: "5-star positive",
    text: "Beautiful hotel with great service. The staff at reception were exceptional and the breakfast was delicious. Will definitely return!",
    rating: 5,
  },
  "3star": {
    label: "3-star mixed",
    text: "Nice location and friendly staff but the room was a bit small and the AC was noisy. Breakfast was good. Overall a decent stay.",
    rating: 3,
  },
  "1star": {
    label: "1-star negative",
    text: "Terrible experience. Room wasn't ready on arrival, the shower was broken and no one came to fix it. Very disappointed.",
    rating: 1,
  },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={labelStyle}>{children}</div>
      {sub && <div style={{ fontSize: 12, color: C.textMuted, marginTop: -4 }}>{sub}</div>}
    </div>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: 44,
        height: 24,
        borderRadius: 100,
        border: "none",
        padding: 0,
        cursor: "pointer",
        background: checked ? C.green : "#2a2a2a",
        transition: "background 0.2s",
        position: "relative",
        flexShrink: 0,
      }}
    >
      <span style={{
        position: "absolute",
        top: 2,
        left: checked ? 22 : 2,
        width: 20,
        height: 20,
        borderRadius: "50%",
        background: "#fff",
        transition: "left 0.2s",
        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
      }} />
    </button>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function BrandVoicePage() {
  const [hotelId, setHotelId] = useState<string | null>(null);
  const [hotelName, setHotelName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Brand voice state
  const [enabled, setEnabled] = useState(false);
  const [examples, setExamples] = useState<BrandVoiceExample[]>([
    { review_text: "", response_text: "", rating: 5 },
  ]);
  const [lockedOpening, setLockedOpening] = useState("");
  const [lockedClosing, setLockedClosing] = useState("");
  const [tone, setTone] = useState("warm-professional");
  const [dos, setDos] = useState<string[]>([""]);
  const [donts, setDonts] = useState<string[]>([""]);

  // Preview state
  const [previewSample, setPreviewSample] = useState<keyof typeof SAMPLE_REVIEWS>("5star");
  const [previewOutput, setPreviewOutput] = useState("");
  const [generatingPreview, setGeneratingPreview] = useState(false);
  const [previewBrandVoiceUsed, setPreviewBrandVoiceUsed] = useState(false);

  const showToast = useCallback((type: "success" | "error", message: string) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), type === "success" ? 3000 : 5000);
  }, []);

  // ── Load hotel brand voice settings ─────────────────────────────────────────
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

        const { data } = await supabase
          .from("hotels")
          .select(
            "id, name, brand_voice_enabled, brand_voice_examples, brand_voice_locked_opening, brand_voice_locked_closing, brand_voice_tone, brand_voice_dos, brand_voice_donts",
          )
          .eq("user_id", user.id)
          .maybeSingle();

        if (data) {
          const h = data as Record<string, unknown>;
          setHotelId(h.id as string);
          setHotelName((h.name as string | null) ?? "");
          setEnabled(!!(h.brand_voice_enabled));
          const exArr = Array.isArray(h.brand_voice_examples) ? h.brand_voice_examples as BrandVoiceExample[] : [];
          setExamples(exArr.length > 0 ? exArr : [{ review_text: "", response_text: "", rating: 5 }]);
          setLockedOpening((h.brand_voice_locked_opening as string | null) ?? "");
          setLockedClosing((h.brand_voice_locked_closing as string | null) ?? "");
          setTone((h.brand_voice_tone as string | null) ?? "warm-professional");
          const dosArr = Array.isArray(h.brand_voice_dos) ? h.brand_voice_dos as string[] : [];
          setDos(dosArr.length > 0 ? dosArr : [""]);
          const dontsArr = Array.isArray(h.brand_voice_donts) ? h.brand_voice_donts as string[] : [];
          setDonts(dontsArr.length > 0 ? dontsArr : [""]);
        }
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  // ── Save ─────────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!hotelId) {
      showToast("error", "No hotel found. Set up your hotel in Settings first.");
      return;
    }
    setSaving(true);
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );

      const cleanExamples = examples.filter(
        (e) => e.review_text.trim() || e.response_text.trim(),
      );
      const cleanDos = dos.filter((d) => d.trim());
      const cleanDonts = donts.filter((d) => d.trim());

      const { error } = await supabase
        .from("hotels")
        .update({
          brand_voice_enabled: enabled,
          brand_voice_examples: cleanExamples,
          brand_voice_locked_opening: lockedOpening.trim() || null,
          brand_voice_locked_closing: lockedClosing.trim() || null,
          brand_voice_tone: tone,
          brand_voice_dos: cleanDos,
          brand_voice_donts: cleanDonts,
        })
        .eq("id", hotelId);

      if (error) throw error;
      showToast("success", "Brand voice saved");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  // ── Generate preview ─────────────────────────────────────────────────────────
  async function handleGeneratePreview() {
    if (!hotelId) return;
    // Auto-save first so API picks up latest settings
    await handleSave();

    setGeneratingPreview(true);
    setPreviewOutput("");
    setPreviewBrandVoiceUsed(false);

    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );
      const { data: { user } } = await supabase.auth.getUser();

      const sample = SAMPLE_REVIEWS[previewSample];
      const res = await fetch("/api/draft-response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          review_text: sample.text,
          rating: sample.rating,
          reviewer_name: "Guest",
          platform: "preview",
          hotel_id: hotelId,
          user_id: user?.id ?? null,
        }),
      });

      const json = (await res.json()) as {
        success?: boolean;
        response?: string;
        brand_voice_used?: boolean;
        error?: string;
        upgrade_required?: boolean;
      };

      if (json.upgrade_required) {
        setPreviewOutput("⚠ Upgrade required to use AI draft preview.");
        return;
      }
      if (!json.success || !json.response) throw new Error(json.error ?? "Failed to generate preview");
      setPreviewOutput(json.response);
      setPreviewBrandVoiceUsed(json.brand_voice_used ?? false);
    } catch (err) {
      setPreviewOutput(`Error: ${err instanceof Error ? err.message : "Failed"}`);
    } finally {
      setGeneratingPreview(false);
    }
  }

  // ── Example helpers ───────────────────────────────────────────────────────────
  function updateExample(idx: number, field: keyof BrandVoiceExample, value: string | number) {
    setExamples((prev) =>
      prev.map((ex, i) => (i === idx ? { ...ex, [field]: value } : ex)),
    );
  }

  function removeExample(idx: number) {
    setExamples((prev) => prev.filter((_, i) => i !== idx));
  }

  function addExample() {
    setExamples((prev) => [...prev, { review_text: "", response_text: "", rating: 5 }]);
  }

  function updateDo(idx: number, val: string) {
    setDos((prev) => prev.map((d, i) => (i === idx ? val : d)));
  }

  function removeDo(idx: number) {
    setDos((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateDont(idx: number, val: string) {
    setDonts((prev) => prev.map((d, i) => (i === idx ? val : d)));
  }

  function removeDont(idx: number) {
    setDonts((prev) => prev.filter((_, i) => i !== idx));
  }

  // ── Computed ──────────────────────────────────────────────────────────────────
  const filledExamples = examples.filter(
    (e) => e.review_text.trim() && e.response_text.trim(),
  ).length;

  const exampleQuality =
    filledExamples >= 5
      ? { text: "✓ Excellent — your brand voice is well trained", color: C.green }
      : filledExamples >= 3
        ? { text: "✓ Good — AI has enough data to learn your voice", color: C.green }
        : filledExamples >= 1
          ? { text: "Add 2 more examples for better results", color: C.amber }
          : null;

  if (loading) {
    return (
      <div style={{ background: C.bg, minHeight: "100vh", padding: "24px 28px", color: C.textMuted }}>
        Loading…
      </div>
    );
  }

  return (
    <div style={{ background: C.bg, minHeight: "100vh", padding: "24px 28px", boxSizing: "border-box", maxWidth: 860, margin: "0 auto" }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes bv-spin { to { transform: rotate(360deg); } }
        @keyframes bv-fade { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
      ` }} />

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 1000,
          background: toast.type === "success" ? "#052e16" : "#1a0505",
          border: `1px solid ${toast.type === "success" ? "#166534" : "#4a1010"}`,
          borderRadius: 8,
          padding: "12px 16px",
          fontSize: 13,
          color: toast.type === "success" ? C.green : C.red,
          display: "flex",
          gap: 8,
          alignItems: "center",
          animation: "bv-fade 0.25s ease",
          maxWidth: 320,
        }}>
          <span>{toast.type === "success" ? "✓" : "⚠"}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 500, color: C.textPrimary, margin: "0 0 4px" }}>Brand voice</h1>
          <p style={{ fontSize: 12, color: C.textMuted, margin: 0 }}>
            Train AI to write responses that sound like you
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving || !hotelId}
          style={{
            background: "#f0f0f0",
            border: "none",
            borderRadius: 6,
            padding: "8px 18px",
            fontSize: 13,
            fontWeight: 600,
            color: "#0d0d0d",
            cursor: saving || !hotelId ? "not-allowed" : "pointer",
            opacity: saving || !hotelId ? 0.6 : 1,
            fontFamily: "inherit",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
          onMouseEnter={(e) => { if (!saving && hotelId) e.currentTarget.style.background = "#e0e0e0"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "#f0f0f0"; }}
        >
          {saving ? (
            <>
              <span style={{ width: 12, height: 12, borderRadius: "50%", border: "2px solid #333", borderTopColor: "#0d0d0d", animation: "bv-spin 0.6s linear infinite", display: "inline-block" }} />
              Saving…
            </>
          ) : "Save changes"}
        </button>
      </div>

      {/* No hotel warning */}
      {!hotelId && (
        <div style={{ background: "#1a0505", border: "1px solid #3a1010", borderRadius: 8, padding: 20, marginBottom: 20, fontSize: 13, color: C.red }}>
          ⚠ No hotel found. <Link href="/dashboard/settings" style={{ color: C.red, textDecoration: "underline" }}>Set up your hotel in Settings</Link> first.
        </div>
      )}

      {/* ── SECTION 1 — Status card ───────────────────────────────────────────── */}
      <div style={{
        background: enabled ? "#0a1a0a" : "#1a1200",
        border: `1px solid ${enabled ? "#1a3a1a" : "#2a2000"}`,
        borderRadius: 8,
        padding: 20,
        marginBottom: 20,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            {enabled ? (
              <>
                <div style={{ fontSize: 14, fontWeight: 500, color: C.green, marginBottom: 4 }}>
                  ✓ Brand voice is active
                </div>
                <div style={{ fontSize: 13, color: "#888888" }}>
                  AI will use your trained examples and tone preferences when drafting responses.
                  {hotelName && ` (${hotelName})`}
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 14, fontWeight: 500, color: C.amber, marginBottom: 4 }}>
                  ⚠ Brand voice not configured
                </div>
                <div style={{ fontSize: 13, color: "#888888" }}>
                  AI is using a generic template. Configure brand voice to make every response sound like your hotel.
                </div>
              </>
            )}
          </div>
          <div style={{ marginLeft: 16, flexShrink: 0 }}>
            <ToggleSwitch checked={enabled} onChange={setEnabled} />
          </div>
        </div>
        <div style={{ marginTop: 12, fontSize: 12, color: C.textMuted, display: "flex", alignItems: "center", gap: 8 }}>
          <span>Enable brand voice training</span>
        </div>
      </div>

      {/* ── SECTION 2 — Training examples ────────────────────────────────────── */}
      <div style={{ ...cardStyle, padding: 28, marginBottom: 16 }}>
        <SectionLabel sub="Paste 3–5 of your favorite past review responses. AI will learn your tone, vocabulary, and style.">
          Train with your best responses
        </SectionLabel>

        {examples.map((ex, idx) => (
          <div key={idx} style={{ ...cardStyle, padding: 16, marginBottom: 10, border: `1px solid ${C.border2}` }}>
            {/* Header row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <span style={{ ...labelStyle, marginBottom: 0, fontSize: 10 }}>EXAMPLE #{idx + 1}</span>
              {examples.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeExample(idx)}
                  style={{ border: "none", background: "transparent", color: C.textMuted, cursor: "pointer", fontSize: 16, lineHeight: 1, padding: 2 }}
                  title="Remove example"
                >
                  ×
                </button>
              )}
            </div>

            {/* Two-column layout */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <div style={{ ...labelStyle, marginBottom: 6 }}>Review the guest wrote</div>
                <textarea
                  value={ex.review_text}
                  onChange={(e) => updateExample(idx, "review_text", e.target.value)}
                  placeholder="Paste the original review text..."
                  style={{ ...inp, height: 100 }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "#3a3a3a"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = C.border2; }}
                />
              </div>
              <div>
                <div style={{ ...labelStyle, marginBottom: 6 }}>Your response</div>
                <textarea
                  value={ex.response_text}
                  onChange={(e) => updateExample(idx, "response_text", e.target.value)}
                  placeholder="Paste your actual response that you sent..."
                  style={{ ...inp, height: 100 }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "#3a3a3a"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = C.border2; }}
                />
              </div>
            </div>

            {/* Star rating */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, color: C.textMuted }}>What rating was this review?</span>
              <div style={{ display: "flex", gap: 4 }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => updateExample(idx, "rating", star)}
                    style={{
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      fontSize: 18,
                      padding: "0 1px",
                      color: star <= ex.rating ? "#fbbf24" : "#2a2a2a",
                      lineHeight: 1,
                    }}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}

        {/* Quality indicator */}
        {exampleQuality && (
          <div style={{ fontSize: 12, color: exampleQuality.color, marginBottom: 12, marginTop: 4 }}>
            {exampleQuality.text}
          </div>
        )}

        {/* Add example button */}
        <button
          type="button"
          onClick={addExample}
          style={{
            width: "100%",
            background: "transparent",
            border: `1px dashed ${C.border2}`,
            borderRadius: 8,
            padding: "10px 0",
            fontSize: 13,
            color: C.textSecondary,
            cursor: "pointer",
            fontFamily: "inherit",
            marginTop: 4,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#3a3a3a"; e.currentTarget.style.color = C.textPrimary; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border2; e.currentTarget.style.color = C.textSecondary; }}
        >
          + Add another example
        </button>
      </div>

      {/* ── SECTION 3 — Locked phrases ───────────────────────────────────────── */}
      <div style={{ ...cardStyle, padding: 28, marginBottom: 16 }}>
        <SectionLabel sub="Phrases that ALWAYS appear in every response">
          Locked phrases
        </SectionLabel>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <div style={{ ...labelStyle, marginBottom: 6 }}>Opening (always at start)</div>
            <textarea
              value={lockedOpening}
              onChange={(e) => setLockedOpening(e.target.value)}
              placeholder="Thank you so much for taking the time to share..."
              style={{ ...inp, height: 48, minHeight: 48, maxHeight: 48 }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "#3a3a3a"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = C.border2; }}
            />
            <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>Leave blank to let AI choose</div>
          </div>
          <div>
            <div style={{ ...labelStyle, marginBottom: 6 }}>Signature (always at end)</div>
            <textarea
              value={lockedClosing}
              onChange={(e) => setLockedClosing(e.target.value)}
              placeholder={`Warm regards,\nThe team at ${hotelName || "Hotel Name"}`}
              style={{ ...inp, height: 64, minHeight: 64, maxHeight: 80 }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "#3a3a3a"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = C.border2; }}
            />
          </div>
        </div>
      </div>

      {/* ── SECTION 4 — Tone selector ─────────────────────────────────────────── */}
      <div style={{ ...cardStyle, padding: 28, marginBottom: 16 }}>
        <SectionLabel>Response tone</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {TONES.map((t) => {
            const selected = tone === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTone(t.id)}
                style={{
                  background: selected ? "#0a1a0a" : C.card,
                  border: `1px solid ${selected ? C.green : C.border}`,
                  borderRadius: 8,
                  padding: "14px 16px",
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: "inherit",
                  transition: "border-color 0.15s",
                }}
                onMouseEnter={(e) => { if (!selected) e.currentTarget.style.borderColor = "#3a3a3a"; }}
                onMouseLeave={(e) => { if (!selected) e.currentTarget.style.borderColor = C.border; }}
              >
                <div style={{ fontSize: 13, fontWeight: 500, color: selected ? C.green : C.textPrimary, marginBottom: 4 }}>
                  {t.name}
                </div>
                <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 6 }}>{t.desc}</div>
                <div style={{ fontSize: 12, color: "#666666", fontStyle: "italic" }}>{t.example}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── SECTION 5 — Dos and Don'ts ───────────────────────────────────────── */}
      <div style={{ ...cardStyle, padding: 28, marginBottom: 16 }}>
        <SectionLabel>Do&apos;s and don&apos;ts</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>

          {/* Always do */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.green, marginBottom: 10 }}>ALWAYS DO</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {dos.map((d, idx) => (
                <div key={idx} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="text"
                    value={d}
                    onChange={(e) => updateDo(idx, e.target.value)}
                    placeholder={
                      idx === 0 ? "Reference specific details from the review"
                        : idx === 1 ? "Sign off with the hotel name"
                          : "Add a rule…"
                    }
                    style={{ ...inp, height: 34, padding: "0 10px", fontSize: 12, resize: "none" as const }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "#3a3a3a"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = C.border2; }}
                  />
                  {dos.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeDo(idx)}
                      style={{ border: "none", background: "transparent", color: C.textMuted, cursor: "pointer", fontSize: 14, lineHeight: 1, padding: 2, flexShrink: 0 }}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setDos((prev) => [...prev, ""])}
                style={{ border: "none", background: "transparent", color: C.green, fontSize: 12, cursor: "pointer", fontFamily: "inherit", textAlign: "left", padding: "4px 0" }}
              >
                + Add
              </button>
            </div>
          </div>

          {/* Never do */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.red, marginBottom: 10 }}>NEVER DO</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {donts.map((d, idx) => (
                <div key={idx} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="text"
                    value={d}
                    onChange={(e) => updateDont(idx, e.target.value)}
                    placeholder={
                      idx === 0 ? "Apologize excessively"
                        : idx === 1 ? "Use the word 'unfortunately'"
                          : "Add a rule…"
                    }
                    style={{ ...inp, height: 34, padding: "0 10px", fontSize: 12, resize: "none" as const }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "#3a3a3a"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = C.border2; }}
                  />
                  {donts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeDont(idx)}
                      style={{ border: "none", background: "transparent", color: C.textMuted, cursor: "pointer", fontSize: 14, lineHeight: 1, padding: 2, flexShrink: 0 }}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setDonts((prev) => [...prev, ""])}
                style={{ border: "none", background: "transparent", color: C.red, fontSize: 12, cursor: "pointer", fontFamily: "inherit", textAlign: "left", padding: "4px 0" }}
              >
                + Add
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION 6 — Live preview ─────────────────────────────────────────── */}
      <div style={{ ...cardStyle, padding: 28, marginBottom: 40 }}>
        <SectionLabel sub="Test your brand voice on a sample review">
          Preview
        </SectionLabel>

        {/* Sample selector */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <span style={{ fontSize: 12, color: C.textMuted, flexShrink: 0 }}>Sample review:</span>
          <select
            value={previewSample}
            onChange={(e) => setPreviewSample(e.target.value as keyof typeof SAMPLE_REVIEWS)}
            style={{
              background: "#111111",
              border: `1px solid ${C.border2}`,
              borderRadius: 6,
              padding: "6px 10px",
              color: C.textPrimary,
              fontSize: 13,
              outline: "none",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {Object.entries(SAMPLE_REVIEWS).map(([key, s]) => (
              <option key={key} value={key}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* Sample text */}
        <div style={{
          background: "#0a0a0a",
          border: `1px solid ${C.border}`,
          borderRadius: 6,
          padding: "12px 14px",
          fontSize: 13,
          color: C.textSecondary,
          marginBottom: 14,
          lineHeight: 1.6,
        }}>
          <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, display: "block", marginBottom: 4 }}>
            {[...Array<number>(SAMPLE_REVIEWS[previewSample].rating)].map((_, i) => (
              <span key={i} style={{ color: "#fbbf24" }}>★</span>
            ))}
          </span>
          {SAMPLE_REVIEWS[previewSample].text}
        </div>

        <button
          type="button"
          onClick={() => void handleGeneratePreview()}
          disabled={generatingPreview || !hotelId}
          style={{
            background: C.textPrimary,
            border: "none",
            borderRadius: 6,
            padding: "8px 18px",
            fontSize: 13,
            fontWeight: 600,
            color: "#0d0d0d",
            cursor: generatingPreview || !hotelId ? "not-allowed" : "pointer",
            opacity: generatingPreview || !hotelId ? 0.6 : 1,
            fontFamily: "inherit",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 16,
          }}
        >
          {generatingPreview ? (
            <>
              <span style={{ width: 12, height: 12, borderRadius: "50%", border: "2px solid #333", borderTopColor: "#0d0d0d", animation: "bv-spin 0.6s linear infinite", display: "inline-block" }} />
              Generating…
            </>
          ) : "Generate preview"}
        </button>

        {previewOutput && (
          <div>
            <div style={{
              background: "#0a0a0a",
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              padding: "14px 16px",
              fontSize: 13,
              color: "#cccccc",
              lineHeight: 1.7,
              whiteSpace: "pre-wrap",
            }}>
              {previewOutput}
            </div>
            <div style={{ marginTop: 8, fontSize: 11, color: previewBrandVoiceUsed ? C.green : C.textMuted }}>
              {previewBrandVoiceUsed
                ? `✓ Trained on your brand voice (${filledExamples} example${filledExamples !== 1 ? "s" : ""})`
                : "This is how AI will respond using your brand voice"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

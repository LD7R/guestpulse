"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useState, type CSSProperties } from "react";

const C = {
  pageBg: "#0d0d0d",
  card: "#141414",
  border: "#1e1e1e",
  borderSub: "#2a2a2a",
  textPrimary: "#f0f0f0",
  textSecondary: "#888888",
  textMuted: "#555555",
  green: "#4ade80",
  blue: "#60a5fa",
} as const;

const cardBase: CSSProperties = {
  background: C.card,
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  padding: 24,
  position: "relative",
};

const featureRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 8,
  fontSize: 13,
  color: C.textSecondary,
  lineHeight: 1.5,
};

function RoiBox({ text, green = false, blue = false }: { text: string; green?: boolean; blue?: boolean }) {
  return (
    <div
      style={{
        fontSize: 12,
        color: "#444444",
        marginTop: 4,
        marginBottom: 16,
        background: green ? "#0a1a0a" : blue ? "#0a0f1a" : "#1a1a0a",
        border: `1px solid ${green ? "#1a2a1a" : blue ? "#1a2030" : "#2a2a00"}`,
        borderRadius: 4,
        padding: "6px 10px",
        lineHeight: 1.5,
      }}
    >
      {text}
    </div>
  );
}

function FeatureList({ features, dotColor }: { features: string[]; dotColor: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
      {features.map((f) => (
        <div key={f} style={featureRowStyle}>
          <span style={{ color: dotColor, flexShrink: 0, marginTop: 1 }}>●</span>
          <span>{f}</span>
        </div>
      ))}
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "16px 20px" }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary, marginBottom: 6 }}>{q}</div>
      <div style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.6 }}>{a}</div>
    </div>
  );
}

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);

  async function startCheckout(plan: string) {
    setLoading(plan);
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );
      const { data: { user } } = await supabase.auth.getUser();
      const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user?.id, email: user?.email, plan }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (data.url) window.location.href = data.url;
    } finally {
      setLoading(null);
    }
  }

  return (
    <div style={{ background: C.pageBg, minHeight: "100vh", padding: "40px 28px", boxSizing: "border-box" }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: C.textPrimary, margin: 0 }}>
          Simple, transparent pricing
        </h1>
        <p style={{ fontSize: 13, color: C.textMuted, marginTop: 4, marginBottom: 0 }}>
          Start free for 7 days. Cancel anytime.
        </p>
      </div>

      {/* Plan cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 16,
          maxWidth: 960,
          margin: "0 auto",
        }}
      >
        {/* ── ESSENTIAL ── */}
        <div style={cardBase}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.textMuted, marginBottom: 8 }}>
            STARTER
          </div>
          <div style={{ fontSize: 20, fontWeight: 600, color: C.textPrimary, marginBottom: 4 }}>Essential</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
            <span style={{ fontSize: 36, fontWeight: 700, color: C.textPrimary }}>$99</span>
            <span style={{ fontSize: 16, color: C.textMuted }}>/mo</span>
          </div>
          <RoiBox text="pays for itself with 1 recovered booking" />
          <FeatureList
            dotColor={C.textSecondary}
            features={[
              "1 hotel, 3 platforms",
              "Unlimited review sync",
              "Sentiment scoring",
              "Email alerts — urgent reviews",
              "10 AI response drafts/mo",
            ]}
          />
          <div style={{ fontSize: 11, color: "#444444", marginTop: 16, fontStyle: "italic" }}>
            Target: solo B&amp;B owners, first-time buyers
          </div>
          <button
            type="button"
            disabled={loading === "essential"}
            onClick={() => void startCheckout("essential")}
            style={{
              background: "transparent",
              border: `1px solid ${C.borderSub}`,
              color: C.textSecondary,
              borderRadius: 6,
              padding: 10,
              width: "100%",
              marginTop: 16,
              fontSize: 13,
              cursor: loading === "essential" ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              opacity: loading === "essential" ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              if (loading !== "essential") {
                e.currentTarget.style.borderColor = "#3a3a3a";
                e.currentTarget.style.color = C.textPrimary;
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = C.borderSub;
              e.currentTarget.style.color = C.textSecondary;
            }}
          >
            {loading === "essential" ? "Starting trial…" : "Start free trial"}
          </button>
        </div>

        {/* ── PROFESSIONAL ── */}
        <div style={{ ...cardBase, border: `2px solid ${C.green}` }}>
          <div
            style={{
              position: "absolute",
              top: -10,
              left: "50%",
              transform: "translateX(-50%)",
              background: C.green,
              color: "#0d0d0d",
              borderRadius: 100,
              padding: "3px 12px",
              fontSize: 11,
              fontWeight: 700,
              whiteSpace: "nowrap",
            }}
          >
            most popular
          </div>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.green, marginBottom: 8 }}>
            GROWTH
          </div>
          <div style={{ fontSize: 20, fontWeight: 600, color: C.textPrimary, marginBottom: 4 }}>Professional</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
            <span style={{ fontSize: 36, fontWeight: 700, color: C.textPrimary }}>$199</span>
            <span style={{ fontSize: 16, color: C.textMuted }}>/mo</span>
          </div>
          <RoiBox green text="0.3 star rating improvement = 8–15% more bookings" />
          <FeatureList
            dotColor={C.green}
            features={[
              "1 hotel, all platforms",
              "Unlimited AI response drafts",
              "Full sentiment dashboard",
              "Complaint topic trends",
              "Weekly email digest",
              "Competitor benchmarking",
            ]}
          />
          <div style={{ fontSize: 11, color: "#444444", marginTop: 16, fontStyle: "italic" }}>
            Target: owner-operated boutique hotels 10–40 rooms
          </div>
          <button
            type="button"
            disabled={loading === "professional"}
            onClick={() => void startCheckout("professional")}
            style={{
              background: C.green,
              border: "none",
              color: "#0d0d0d",
              borderRadius: 6,
              padding: 10,
              width: "100%",
              marginTop: 16,
              fontSize: 13,
              fontWeight: 600,
              cursor: loading === "professional" ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              opacity: loading === "professional" ? 0.7 : 1,
            }}
            onMouseEnter={(e) => {
              if (loading !== "professional") e.currentTarget.style.background = "#22c55e";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = C.green;
            }}
          >
            {loading === "professional" ? "Starting trial…" : "Start free trial"}
          </button>
        </div>

        {/* ── BUSINESS / MULTI-PROPERTY ── */}
        <div style={cardBase}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.textMuted, marginBottom: 8 }}>
            BUSINESS
          </div>
          <div style={{ fontSize: 20, fontWeight: 600, color: C.textPrimary, marginBottom: 4 }}>Multi-property</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
            <span style={{ fontSize: 36, fontWeight: 700, color: C.textPrimary }}>$399</span>
            <span style={{ fontSize: 16, color: C.textMuted }}>/mo</span>
          </div>
          <RoiBox blue text="replaces 20hrs/mo of manual management across properties" />
          <FeatureList
            dotColor={C.blue}
            features={[
              "Up to 5 hotels",
              "Everything in Professional",
              "Portfolio overview dashboard",
              "Monthly PDF reputation report",
              "Response approval workflow",
              "Priority email support",
            ]}
          />
          <div style={{ fontSize: 11, color: "#444444", marginTop: 16, fontStyle: "italic" }}>
            Target: owners with 2–5 properties, small hotel groups
          </div>
          <button
            type="button"
            disabled={loading === "business"}
            onClick={() => void startCheckout("business")}
            style={{
              background: "transparent",
              border: `1px solid ${C.borderSub}`,
              color: C.textSecondary,
              borderRadius: 6,
              padding: 10,
              width: "100%",
              marginTop: 16,
              fontSize: 13,
              cursor: loading === "business" ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              opacity: loading === "business" ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              if (loading !== "business") {
                e.currentTarget.style.borderColor = "#3a3a3a";
                e.currentTarget.style.color = C.textPrimary;
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = C.borderSub;
              e.currentTarget.style.color = C.textSecondary;
            }}
          >
            {loading === "business" ? "Starting trial…" : "Start free trial"}
          </button>
        </div>
      </div>

      {/* Trial note */}
      <p style={{ fontSize: 12, color: "#444444", textAlign: "center", marginTop: 24, maxWidth: 960, marginLeft: "auto", marginRight: "auto" }}>
        All plans include a 7-day free trial · No credit card required · Cancel anytime
      </p>

      {/* FAQ */}
      <div style={{ maxWidth: 960, margin: "40px auto 0", display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.textMuted, marginBottom: 8 }}>
          FAQ
        </div>
        <FaqItem q="Can I switch plans?" a="Yes, upgrade or downgrade anytime from Settings." />
        <FaqItem
          q="What happens after the trial?"
          a="You'll be charged at your plan rate. Cancel before the trial ends to pay nothing."
        />
        <FaqItem
          q="Do you support multiple currencies?"
          a="We currently charge in USD. Your bank converts automatically."
        />
      </div>
    </div>
  );
}

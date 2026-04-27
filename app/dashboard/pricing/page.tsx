"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import type { CSSProperties } from "react";

const secondaryBtn: CSSProperties = {
  width: "100%",
  background: "transparent",
  border: "1px solid #2a2a2a",
  borderRadius: 6,
  padding: "11px 0",
  fontSize: 13,
  fontWeight: 500,
  color: "#888888",
  cursor: "pointer",
  fontFamily: "inherit",
};

const faqItems = [
  {
    q: "Can I switch between monthly and annual?",
    a: "Yes. You can upgrade from monthly to annual at any time from Settings → Billing. The remaining monthly balance is prorated automatically.",
  },
  {
    q: "What happens after the 7-day trial?",
    a: "You'll be charged at your selected plan rate. Cancel anytime before the trial ends and you won't be charged anything.",
  },
  {
    q: "Can I upgrade or downgrade my plan?",
    a: "Yes, upgrade or downgrade anytime from Settings → Billing. Changes take effect at the start of your next billing cycle.",
  },
  {
    q: "Is my data safe?",
    a: "Yes. All data is encrypted, never sold, and never used to train AI models. You can export or delete your data at any time.",
  },
];

export default function PricingPage() {
  const router = useRouter();
  const [billingInterval, setBillingInterval] = useState<"monthly" | "annual">("monthly");
  const [loading, setLoading] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const prices = {
    essential: { monthly: "$99", annual: "$83", annualTotal: "$990" },
    professional: { monthly: "$199", annual: "$166", annualTotal: "$1,990" },
    business: { monthly: "$399", annual: "$332", annualTotal: "$3,990" },
  };

  const handleCheckout = async (plan: string) => {
    setLoading(plan);
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/signup?plan=" + plan + "&interval=" + billingInterval);
        return;
      }

      const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          interval: billingInterval,
        }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (data.url) window.location.href = data.url;
    } finally {
      setLoading(null);
    }
  };

  const btnLabel = (plan: string) =>
    loading === plan ? "Starting trial…" : "Start 7-day free trial";

  return (
    <div
      style={{
        background: "#0d0d0d",
        minHeight: "100vh",
        padding: "32px 24px 80px",
        boxSizing: "border-box",
      }}
    >
      {/* Back button */}
      <button
        type="button"
        onClick={() => router.push("/dashboard")}
        style={{
          background: "none",
          border: "none",
          color: "#555555",
          fontSize: 13,
          cursor: "pointer",
          padding: 0,
          marginBottom: 32,
          fontFamily: "inherit",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = "#f0f0f0"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = "#555555"; }}
      >
        ← Back to dashboard
      </button>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "#f0f0f0",
            margin: 0,
            letterSpacing: "-0.5px",
          }}
        >
          Simple, transparent pricing
        </h1>
        <p style={{ fontSize: 13, color: "#555555", marginTop: 6, marginBottom: 0 }}>
          Start free for 7 days. No credit card required.
        </p>

        {/* Billing toggle */}
        <div
          style={{
            display: "inline-flex",
            gap: 4,
            marginTop: 24,
            background: "#141414",
            border: "1px solid #1e1e1e",
            borderRadius: 100,
            padding: 4,
          }}
        >
          <button
            type="button"
            onClick={() => setBillingInterval("monthly")}
            style={{
              background: billingInterval === "monthly" ? "#f0f0f0" : "transparent",
              border: "none",
              borderRadius: 100,
              padding: "8px 20px",
              fontSize: 13,
              fontWeight: 500,
              color: billingInterval === "monthly" ? "#0d0d0d" : "#555555",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBillingInterval("annual")}
            style={{
              background: billingInterval === "annual" ? "#f0f0f0" : "transparent",
              border: "none",
              borderRadius: 100,
              padding: "8px 20px",
              fontSize: 13,
              fontWeight: 500,
              color: billingInterval === "annual" ? "#0d0d0d" : "#555555",
              cursor: "pointer",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            Annual
            <span
              style={{
                background: billingInterval === "annual" ? "#052e16" : "#1a1a1a",
                color: "#4ade80",
                borderRadius: 100,
                padding: "2px 8px",
                fontSize: 10,
                fontWeight: 700,
              }}
            >
              Save 17%
            </span>
          </button>
        </div>
      </div>

      {/* Cards */}
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
        <div
          style={{
            background: "#141414",
            border: "1px solid #1e1e1e",
            borderRadius: 8,
            padding: "28px 24px",
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#555555",
            }}
          >
            STARTER
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#f0f0f0", marginTop: 8 }}>
            Essential
          </div>

          <div style={{ marginTop: 12 }}>
            <span style={{ fontSize: 36, fontWeight: 700, color: "#f0f0f0" }}>
              {prices.essential[billingInterval]}
            </span>
            <span style={{ fontSize: 14, color: "#555555" }}>/mo</span>
            {billingInterval === "annual" && (
              <div style={{ fontSize: 11, color: "#444444", marginTop: 2 }}>
                billed as {prices.essential.annualTotal}/yr
              </div>
            )}
          </div>

          <div
            style={{
              background: "#111111",
              border: "1px solid #1e1e1e",
              borderRadius: 6,
              padding: "8px 12px",
              marginTop: 12,
              fontSize: 12,
              color: "#555555",
              lineHeight: 1.5,
            }}
          >
            Pays for itself with 1 recovered booking per month
          </div>

          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              "1 hotel, 3 platforms",
              "Unlimited review sync",
              "Sentiment scoring",
              "Email alerts — urgent reviews",
              "10 AI response drafts/mo",
            ].map((f) => (
              <div key={f} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <span style={{ color: "#4ade80", fontSize: 13, flexShrink: 0 }}>●</span>
                <span style={{ fontSize: 13, color: "#888888" }}>{f}</span>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 11, color: "#444444", fontStyle: "italic", marginTop: 16 }}>
            For: solo B&amp;B owners, price-sensitive
          </div>

          <button
            type="button"
            disabled={loading === "essential"}
            onClick={() => void handleCheckout("essential")}
            style={{
              ...secondaryBtn,
              marginTop: 20,
              opacity: loading === "essential" ? 0.7 : 1,
              cursor: loading === "essential" ? "not-allowed" : "pointer",
            }}
            onMouseEnter={(e) => {
              if (loading !== "essential") {
                e.currentTarget.style.borderColor = "#3a3a3a";
                e.currentTarget.style.color = "#f0f0f0";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#2a2a2a";
              e.currentTarget.style.color = "#888888";
            }}
          >
            {btnLabel("essential")}
          </button>
        </div>

        {/* ── PROFESSIONAL (featured) ── */}
        <div
          style={{
            background: "#141414",
            border: "2px solid #4ade80",
            borderRadius: 8,
            padding: "28px 24px",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -14,
              left: "50%",
              transform: "translateX(-50%)",
              background: "#4ade80",
              color: "#0d0d0d",
              borderRadius: 100,
              padding: "4px 14px",
              fontSize: 11,
              fontWeight: 700,
              whiteSpace: "nowrap",
            }}
          >
            most popular
          </div>

          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#4ade80",
            }}
          >
            GROWTH
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#f0f0f0", marginTop: 8 }}>
            Professional
          </div>

          <div style={{ marginTop: 12 }}>
            <span style={{ fontSize: 36, fontWeight: 700, color: "#f0f0f0" }}>
              {prices.professional[billingInterval]}
            </span>
            <span style={{ fontSize: 14, color: "#555555" }}>/mo</span>
            {billingInterval === "annual" && (
              <div style={{ fontSize: 11, color: "#444444", marginTop: 2 }}>
                billed as {prices.professional.annualTotal}/yr
              </div>
            )}
          </div>

          <div
            style={{
              background: "#0a1a0a",
              border: "1px solid #1a3a1a",
              borderRadius: 6,
              padding: "8px 12px",
              marginTop: 12,
              fontSize: 12,
              color: "#4ade80",
              lineHeight: 1.5,
            }}
          >
            0.3 star rating improvement = 8–15% more bookings
          </div>

          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              "1 hotel, all 6 platforms",
              "Unlimited AI response drafts",
              "Full sentiment dashboard",
              "Complaint topic trends",
              "Competitor benchmarking (up to 5)",
              "Weekly email digest",
              "Auto daily sync",
            ].map((f) => (
              <div key={f} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <span style={{ color: "#4ade80", fontSize: 13, flexShrink: 0 }}>●</span>
                <span style={{ fontSize: 13, color: "#888888" }}>{f}</span>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 11, color: "#444444", fontStyle: "italic", marginTop: 16 }}>
            For: boutique hotels 10–40 rooms
          </div>

          <button
            type="button"
            disabled={loading === "professional"}
            onClick={() => void handleCheckout("professional")}
            style={{
              width: "100%",
              background: "#4ade80",
              border: "none",
              borderRadius: 6,
              padding: "11px 0",
              fontSize: 13,
              fontWeight: 700,
              color: "#0d0d0d",
              cursor: loading === "professional" ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              marginTop: 20,
              opacity: loading === "professional" ? 0.7 : 1,
            }}
            onMouseEnter={(e) => {
              if (loading !== "professional") e.currentTarget.style.background = "#22c55e";
            }}
            onMouseLeave={(e) => {
              if (loading !== "professional") e.currentTarget.style.background = "#4ade80";
            }}
          >
            {btnLabel("professional")}
          </button>
        </div>

        {/* ── BUSINESS ── */}
        <div
          style={{
            background: "#141414",
            border: "1px solid #1e1e1e",
            borderRadius: 8,
            padding: "28px 24px",
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#555555",
            }}
          >
            BUSINESS
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#f0f0f0", marginTop: 8 }}>
            Multi-property
          </div>

          <div style={{ marginTop: 12 }}>
            <span style={{ fontSize: 36, fontWeight: 700, color: "#f0f0f0" }}>
              {prices.business[billingInterval]}
            </span>
            <span style={{ fontSize: 14, color: "#555555" }}>/mo</span>
            {billingInterval === "annual" && (
              <div style={{ fontSize: 11, color: "#444444", marginTop: 2 }}>
                billed as {prices.business.annualTotal}/yr
              </div>
            )}
          </div>

          <div
            style={{
              background: "#111111",
              border: "1px solid #1e1e1e",
              borderRadius: 6,
              padding: "8px 12px",
              marginTop: 12,
              fontSize: 12,
              color: "#555555",
              lineHeight: 1.5,
            }}
          >
            Replaces 20hrs/mo of manual management
          </div>

          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              "Up to 5 hotels",
              "Everything in Professional",
              "Portfolio overview dashboard",
              "Monthly PDF reputation report",
              "Response approval workflow",
              "Priority email support",
            ].map((f) => (
              <div key={f} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <span style={{ color: "#60a5fa", fontSize: 13, flexShrink: 0 }}>●</span>
                <span style={{ fontSize: 13, color: "#888888" }}>{f}</span>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 11, color: "#444444", fontStyle: "italic", marginTop: 16 }}>
            For: multi-property operators
          </div>

          <button
            type="button"
            disabled={loading === "business"}
            onClick={() => void handleCheckout("business")}
            style={{
              ...secondaryBtn,
              marginTop: 20,
              opacity: loading === "business" ? 0.7 : 1,
              cursor: loading === "business" ? "not-allowed" : "pointer",
            }}
            onMouseEnter={(e) => {
              if (loading !== "business") {
                e.currentTarget.style.borderColor = "#3a3a3a";
                e.currentTarget.style.color = "#f0f0f0";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#2a2a2a";
              e.currentTarget.style.color = "#888888";
            }}
          >
            {btnLabel("business")}
          </button>
        </div>
      </div>

      {/* Footer note */}
      <p style={{ textAlign: "center", fontSize: 12, color: "#444444", marginTop: 20 }}>
        All plans include a 7-day free trial · Cancel anytime · No contracts
      </p>

      {/* FAQ */}
      <div style={{ maxWidth: 640, margin: "48px auto 0" }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "#555555",
            textAlign: "center",
            marginBottom: 24,
          }}
        >
          FAQ
        </div>
        {faqItems.map((item, i) => {
          const open = openFaq === i;
          return (
            <div key={item.q} style={{ borderBottom: "1px solid #1e1e1e" }}>
              <button
                type="button"
                onClick={() => setOpenFaq(open ? null : i)}
                style={{
                  width: "100%",
                  background: "none",
                  border: "none",
                  padding: "16px 0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  textAlign: "left",
                  gap: 12,
                }}
              >
                <span style={{ fontSize: 13, color: "#f0f0f0" }}>{item.q}</span>
                <span style={{ color: "#555555", fontSize: 14, flexShrink: 0 }}>
                  {open ? "−" : "+"}
                </span>
              </button>
              {open && (
                <p
                  style={{
                    fontSize: 13,
                    color: "#555555",
                    marginTop: 0,
                    marginBottom: 16,
                    lineHeight: 1.6,
                  }}
                >
                  {item.a}
                </p>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
}

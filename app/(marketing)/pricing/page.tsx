"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CSSProperties } from "react";

const C = {
  bg: "#0f1117", bgAlt: "#0a0c12", bgCard: "#1a1d28", bgDeep: "#161821",
  border: "#242836", borderMid: "#2a2f3e", text: "#ffffff", textSec: "#9ca3af",
  textMuted: "#6b7280", textFaint: "#4b5563", green: "#4ade80", blue: "#60a5fa",
  purple: "#a78bfa", red: "#f87171", amber: "#fbbf24",
};

const card: CSSProperties = { background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8 };

const primaryBtn: CSSProperties = {
  background: C.green, color: "#0d0d0d", border: "none", borderRadius: 6,
  fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
};

const secondaryBtn: CSSProperties = {
  background: "transparent", border: `1px solid ${C.borderMid}`, borderRadius: 6,
  color: C.textSec, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
};

const sectionLabel: CSSProperties = {
  fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase",
  color: C.textMuted, display: "block", marginBottom: 12, textAlign: "center",
};

const PLANS = [
  {
    badge: "STARTER",
    name: "Essential",
    monthly: 99,
    annual: 83,
    annualBilled: 990,
    desc: "For single-property owners getting started with review management.",
    color: C.textSec,
    features: [
      "1 hotel",
      "3 platforms (TripAdvisor, Google, Booking.com)",
      "Unlimited review sync",
      "Sentiment scoring",
      "10 AI response drafts/month",
      "Email alerts for new reviews",
      "Email support",
    ],
    featured: false,
  },
  {
    badge: "GROWTH",
    name: "Professional",
    monthly: 199,
    annual: 166,
    annualBilled: 1990,
    desc: "The complete solution for hotels serious about their online reputation.",
    color: C.green,
    features: [
      "1 hotel",
      "All 6 platforms",
      "Unlimited review sync",
      "Unlimited AI response drafts",
      "Full sentiment dashboard",
      "Complaint topic analysis",
      "Competitor benchmarking (AI-powered)",
      "Weekly Monday morning email digest",
      "Urgent review alerts (1 & 2 star)",
      "Auto daily sync",
      "Priority support",
    ],
    featured: true,
  },
  {
    badge: "BUSINESS",
    name: "Multi-property",
    monthly: 399,
    annual: 332,
    annualBilled: 3990,
    desc: "For hotel groups managing multiple properties under one account.",
    color: C.blue,
    features: [
      "Up to 5 hotels",
      "Everything in Professional",
      "Portfolio overview dashboard",
      "Cross-property analytics",
      "Monthly PDF reports",
      "Response approval workflow",
      "Dedicated account manager",
      "Phone support",
    ],
    featured: false,
  },
];

const COMPARISON = [
  {
    category: "Review monitoring",
    rows: [
      { feature: "TripAdvisor monitoring", essential: true, professional: true, business: true },
      { feature: "Google monitoring", essential: true, professional: true, business: true },
      { feature: "Booking.com monitoring", essential: true, professional: true, business: true },
      { feature: "Trip.com, Expedia, Yelp", essential: false, professional: true, business: true },
      { feature: "Automatic daily sync", essential: true, professional: true, business: true },
      { feature: "Real-time urgent alerts", essential: false, professional: true, business: true },
    ],
  },
  {
    category: "AI features",
    rows: [
      { feature: "AI response drafting", essential: "10/mo", professional: "Unlimited", business: "Unlimited" },
      { feature: "Sentiment analysis", essential: true, professional: true, business: true },
      { feature: "Review translation", essential: false, professional: true, business: true },
      { feature: "AI competitor discovery", essential: false, professional: true, business: true },
      { feature: "Complaint topic tagging", essential: false, professional: true, business: true },
    ],
  },
  {
    category: "Analytics",
    rows: [
      { feature: "Rating trend charts", essential: false, professional: true, business: true },
      { feature: "Sentiment dashboard", essential: false, professional: true, business: true },
      { feature: "Response rate tracking", essential: false, professional: true, business: true },
      { feature: "Competitor benchmarking", essential: false, professional: true, business: true },
      { feature: "Monthly PDF reports", essential: false, professional: false, business: true },
    ],
  },
  {
    category: "Productivity",
    rows: [
      { feature: "Weekly email digest", essential: false, professional: true, business: true },
      { feature: "Custom response signature", essential: true, professional: true, business: true },
      { feature: "Internal review notes", essential: false, professional: true, business: true },
      { feature: "Response approval workflow", essential: false, professional: false, business: true },
    ],
  },
];

const FAQ_PRICING = [
  {
    q: "What's included in the free trial?",
    a: "Full access to all features in your chosen plan for 7 days. You can sync reviews, draft AI responses, view your sentiment dashboard and competitor benchmarks — everything. No restrictions.",
  },
  {
    q: "Can I change plans after signing up?",
    a: "Yes, anytime. Upgrade or downgrade from your account settings with one click. Changes take effect immediately and billing is prorated.",
  },
  {
    q: "What counts as a 'hotel' for multi-property plans?",
    a: "Each property with its own review listings counts as one hotel. A group of 3 properties would use 3 of the 5 slots on the Multi-property plan.",
  },
  {
    q: "Do you offer annual billing discounts?",
    a: "Yes — annual plans save you 17%. You pay for 10 months and get 12. Billing happens annually as a single charge.",
  },
  {
    q: "What happens if I cancel?",
    a: "You keep access until the end of your current billing period. No cancellation fees, no contracts. Your data is available to export for 30 days after cancellation.",
  },
];

function CheckIcon({ val }: { val: boolean | string }) {
  if (val === true) return <span style={{ color: C.green, fontSize: 14 }}>✓</span>;
  if (val === false) return <span style={{ color: C.textFaint, fontSize: 14 }}>—</span>;
  return <span style={{ fontSize: 12, color: C.green }}>{val}</span>;
}

export default function PricingPage() {
  const router = useRouter();
  const [period, setPeriod] = useState<"monthly" | "annual">("monthly");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <main style={{ background: C.bg, fontFamily: "Inter, -apple-system, sans-serif" }}>
      <style dangerouslySetInnerHTML={{ __html: `
        * { box-sizing: border-box; }
        .prp { padding-left: 48px; padding-right: 48px; }
        .prp-pg3 { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; align-items: start; }
        .prp-trow { display: grid; grid-template-columns: 2.5fr 1fr 1fr 1fr; }
        @media (max-width: 900px) { .prp-pg3 { grid-template-columns: 1fr !important; } }
        @media (max-width: 768px) {
          .prp { padding-left: 24px !important; padding-right: 24px !important; }
          .prp-trow { grid-template-columns: 2fr 1fr 1fr 1fr; font-size: 11px !important; }
        }
      `}} />

      {/* Hero */}
      <section className="prp" style={{ padding: "96px 48px 56px", maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
        <span style={sectionLabel}>Pricing</span>
        <h1 style={{ fontSize: "clamp(30px,5vw,48px)", fontWeight: 700, color: C.text, letterSpacing: "-1.5px", lineHeight: 1.1, marginBottom: 16 }}>
          Simple, honest pricing
        </h1>
        <p style={{ fontSize: 17, color: C.textSec, lineHeight: 1.7, marginBottom: 36 }}>
          No contracts. No hidden fees. Cancel anytime. All plans include a 7-day free trial.
        </p>

        {/* Toggle */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <div style={{ background: C.bgDeep, border: `1px solid ${C.border}`, borderRadius: 100, padding: 4, display: "inline-flex", gap: 2 }}>
            {(["monthly", "annual"] as const).map((p) => (
              <button key={p} type="button" onClick={() => setPeriod(p)}
                style={{ borderRadius: 100, padding: "8px 20px", fontSize: 13, fontWeight: 500, border: "none", cursor: "pointer", fontFamily: "inherit", background: period === p ? C.text : "transparent", color: period === p ? "#0d0d0d" : C.textSec, transition: "all 0.15s" }}>
                {p === "monthly" ? "Monthly" : "Annual · save 17%"}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing cards */}
      <section className="prp" style={{ padding: "0 48px 80px", maxWidth: 1100, margin: "0 auto" }}>
        <div className="prp-pg3">
          {PLANS.map((plan) => (
            <div key={plan.name} style={{ ...card, border: plan.featured ? `2px solid ${C.green}` : `1px solid ${C.border}`, padding: "32px 24px", position: "relative" }}>
              {plan.featured && (
                <div style={{ position: "absolute", top: -13, left: "50%", transform: "translateX(-50%)", background: C.green, color: "#0d0d0d", padding: "3px 16px", borderRadius: 100, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
                  most popular
                </div>
              )}
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", color: C.textMuted, textTransform: "uppercase" }}>{plan.badge}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: C.text, marginTop: 8 }}>{plan.name}</div>
              <p style={{ fontSize: 13, color: C.textMuted, marginTop: 6, lineHeight: 1.6, marginBottom: 16 }}>{plan.desc}</p>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span style={{ fontSize: 44, fontWeight: 700, color: C.text }}>${period === "annual" ? plan.annual : plan.monthly}</span>
                <span style={{ fontSize: 14, color: C.textMuted }}>/mo</span>
              </div>
              {period === "annual" && <div style={{ fontSize: 11, color: C.textFaint, marginTop: 2 }}>billed as ${plan.annualBilled}/yr</div>}
              <ul style={{ listStyle: "none", marginTop: 24, display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
                {plan.features.map((f) => (
                  <li key={f} style={{ display: "flex", gap: 8, fontSize: 13, color: C.textSec, alignItems: "flex-start" }}>
                    <span style={{ color: plan.color, flexShrink: 0, marginTop: 1 }}>●</span>{f}
                  </li>
                ))}
              </ul>
              <button type="button" onClick={() => router.push(`/signup?plan=${plan.badge.toLowerCase()}&interval=${period}`)}
                style={plan.featured
                  ? { ...primaryBtn, width: "100%", padding: "12px", background: C.green, color: "#0d0d0d" }
                  : { ...secondaryBtn, width: "100%", padding: "12px" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = plan.featured ? "#22c55e" : C.bgDeep; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = plan.featured ? C.green : "transparent"; }}>
                Start free trial
              </button>
            </div>
          ))}
        </div>
        <p style={{ textAlign: "center", fontSize: 12, color: C.textMuted, marginTop: 20 }}>
          All plans include 7-day free trial · No credit card required · Cancel anytime
        </p>
      </section>

      {/* Full comparison table */}
      <section className="prp" style={{ padding: "72px 48px", maxWidth: 1000, margin: "0 auto" }}>
        <h2 style={{ fontSize: "clamp(24px,3vw,32px)", fontWeight: 700, color: C.text, textAlign: "center", marginBottom: 40, letterSpacing: "-0.8px" }}>
          Full feature comparison
        </h2>
        <div style={{ ...card, overflow: "hidden" }}>
          {/* Header */}
          <div className="prp-trow" style={{ background: C.bgAlt, borderBottom: `1px solid ${C.border}`, padding: "16px 20px" }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.textMuted }}>Feature</div>
            {["Essential", "Professional", "Multi-property"].map((h, i) => (
              <div key={h} style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: i === 1 ? C.green : C.textMuted, textAlign: "center" }}>{h}</div>
            ))}
          </div>

          {COMPARISON.map((cat, ci) => (
            <div key={cat.category}>
              {/* Category header */}
              <div className="prp-trow" style={{ background: C.bgDeep, padding: "10px 20px", borderBottom: `1px solid ${C.border}`, borderTop: ci > 0 ? `1px solid ${C.border}` : "none" }}>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: C.textMuted }}>{cat.category}</div>
                <div /><div /><div />
              </div>
              {cat.rows.map((row, ri) => (
                <div key={row.feature} className="prp-trow" style={{ padding: "13px 20px", borderBottom: ri < cat.rows.length - 1 ? `1px solid ${C.border}` : "none", alignItems: "center" }}>
                  <div style={{ fontSize: 13, color: C.text }}>{row.feature}</div>
                  <div style={{ textAlign: "center" }}><CheckIcon val={row.essential} /></div>
                  <div style={{ textAlign: "center" }}><CheckIcon val={row.professional} /></div>
                  <div style={{ textAlign: "center" }}><CheckIcon val={row.business} /></div>
                </div>
              ))}
            </div>
          ))}

          {/* Price row */}
          <div className="prp-trow" style={{ background: C.bgAlt, padding: "18px 20px", borderTop: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Price per month</div>
            {PLANS.map((p) => (
              <div key={p.name} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>${period === "annual" ? p.annual : p.monthly}</div>
                {period === "annual" && <div style={{ fontSize: 10, color: C.textMuted }}>billed annually</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="prp" style={{ padding: "72px 48px 96px", maxWidth: 720, margin: "0 auto" }}>
        <h2 style={{ fontSize: "clamp(24px,3vw,32px)", fontWeight: 700, color: C.text, textAlign: "center", marginBottom: 40, letterSpacing: "-0.8px" }}>
          Pricing questions
        </h2>
        {FAQ_PRICING.map((item, i) => {
          const open = openFaq === i;
          return (
            <div key={item.q} style={{ borderBottom: `1px solid ${C.border}`, padding: "20px 0", cursor: "pointer" }} onClick={() => setOpenFaq(open ? null : i)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{item.q}</span>
                <span style={{ fontSize: 18, color: C.textMuted, flexShrink: 0, userSelect: "none" }}>{open ? "−" : "+"}</span>
              </div>
              {open && <p style={{ fontSize: 14, color: C.textSec, lineHeight: 1.7, marginTop: 12 }}>{item.a}</p>}
            </div>
          );
        })}
      </section>

      {/* Final CTA */}
      <section className="prp" style={{ padding: "0 48px 96px", maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
        <div style={{ ...card, borderRadius: 12, padding: "56px 48px" }}>
          <h2 style={{ fontSize: "clamp(24px,3.5vw,36px)", fontWeight: 700, color: C.text, letterSpacing: "-1px", lineHeight: 1.15 }}>
            Start protecting your reputation today
          </h2>
          <p style={{ fontSize: 16, color: C.textSec, marginTop: 14, lineHeight: 1.7 }}>
            Join independent boutique hotels worldwide using GuestPulse.
            7-day free trial. No credit card. Set up in 5 minutes.
          </p>
          <button type="button" onClick={() => router.push("/signup")} style={{ ...primaryBtn, padding: "14px 28px", fontSize: 15, marginTop: 28 }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#22c55e"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = C.green; }}>
            Start 7-day free trial →
          </button>
        </div>
      </section>
    </main>
  );
}

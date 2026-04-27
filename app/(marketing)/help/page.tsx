"use client";

import Link from "next/link";
import { useState } from "react";
import type { CSSProperties } from "react";

const C = {
  bg: "#0f1117",
  bgCard: "#1a1d28",
  border: "#242836",
  text: "#ffffff",
  textSec: "#9ca3af",
  textMuted: "#6b7280",
  green: "#4ade80",
  blue: "#60a5fa",
  purple: "#a78bfa",
  amber: "#fbbf24",
};

const card: CSSProperties = {
  background: C.bgCard,
  border: `1px solid ${C.border}`,
  borderRadius: 8,
};

const CATEGORIES = [
  {
    icon: "✦",
    iconColor: C.green,
    iconBg: "rgba(74,222,128,0.08)",
    title: "Getting Started",
    desc: "Set up your hotel and start syncing reviews",
    count: 5,
  },
  {
    icon: "◈",
    iconColor: C.blue,
    iconBg: "rgba(96,165,250,0.08)",
    title: "Reviews & Responses",
    desc: "How to manage reviews and AI responses",
    count: 8,
  },
  {
    icon: "◎",
    iconColor: C.purple,
    iconBg: "rgba(167,139,250,0.08)",
    title: "Insights & Analytics",
    desc: "Sentiment, benchmarking, and reporting",
    count: 6,
  },
  {
    icon: "⚙",
    iconColor: C.amber,
    iconBg: "rgba(251,191,36,0.08)",
    title: "Account & Billing",
    desc: "Subscriptions, settings, and team access",
    count: 7,
  },
];

const FAQS = [
  {
    q: "How do I add my hotel to GuestPulse?",
    a: "Sign up for a free trial, then on the onboarding screen type your hotel name. Our AI will automatically find your profiles on TripAdvisor, Google, Booking.com, Trip.com, Expedia, and Yelp. Confirm the URLs and your reviews start syncing.",
  },
  {
    q: "How long does the AI take to draft a response?",
    a: "AI responses are generated in 2–4 seconds. The AI uses your brand voice settings, hotel signature, and references specific details from each review.",
  },
  {
    q: "Can I edit AI-generated responses before posting?",
    a: "Yes — every AI draft is fully editable. You can also regenerate the response, discard it, or copy it directly to paste on the platform.",
  },
  {
    q: "How often are reviews synced?",
    a: "Reviews sync automatically every day at 6am UTC. You can also trigger manual syncs anytime from the review inbox or dashboard.",
  },
  {
    q: "Does GuestPulse work for multiple properties?",
    a: "Yes — the Multi-property plan supports up to 5 hotels with a portfolio dashboard. For larger groups, contact us about a custom plan.",
  },
  {
    q: "What happens to my data if I cancel?",
    a: "You retain access until the end of your billing period. After cancellation, you can export all data within 30 days. After 30 days, data is permanently deleted from our systems.",
  },
];

export default function HelpPage() {
  const [openQ, setOpenQ] = useState<number | null>(null);

  return (
    <main
      style={{
        background: C.bg,
        fontFamily: "Inter, -apple-system, sans-serif",
        paddingBottom: 96,
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        * { box-sizing: border-box; }
        .hp { padding-left: 48px; padding-right: 48px; }
        .hp-grid2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
        @media (max-width: 768px) {
          .hp { padding-left: 24px !important; padding-right: 24px !important; }
          .hp-grid2 { grid-template-columns: 1fr !important; }
        }
      `}} />

      {/* Header */}
      <section className="hp" style={{ padding: "80px 48px 56px", maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
        <h1 style={{ fontSize: 36, fontWeight: 700, color: C.text, letterSpacing: "-0.8px", marginBottom: 12 }}>
          Help center
        </h1>
        <p style={{ fontSize: 16, color: C.textSec, lineHeight: 1.7, marginBottom: 32 }}>
          Find answers to common questions about GuestPulse
        </p>
        {/* Decorative search bar */}
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <input
            type="text"
            placeholder="Search help articles..."
            readOnly
            style={{
              width: "100%",
              background: C.bgCard,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: "14px 20px",
              fontSize: 15,
              color: C.textMuted,
              fontFamily: "inherit",
              outline: "none",
              cursor: "default",
            }}
          />
        </div>
      </section>

      {/* Category cards */}
      <section className="hp" style={{ padding: "0 48px 72px", maxWidth: 900, margin: "0 auto" }}>
        <div className="hp-grid2">
          {CATEGORIES.map((cat) => (
            <div
              key={cat.title}
              style={{ ...card, padding: 24, cursor: "pointer" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "#3a3f52"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = C.border; }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  background: cat.iconBg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  color: cat.iconColor,
                  marginBottom: 16,
                }}
              >
                {cat.icon}
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 600, color: C.text, marginBottom: 8 }}>{cat.title}</h3>
              <p style={{ fontSize: 13, color: C.textSec, lineHeight: 1.6, marginBottom: 12 }}>{cat.desc}</p>
              <span style={{ fontSize: 11, color: C.textMuted }}>{cat.count} articles</span>
            </div>
          ))}
        </div>
      </section>

      {/* Popular questions */}
      <section className="hp" style={{ padding: "0 48px 48px", maxWidth: 760, margin: "0 auto" }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: C.text, letterSpacing: "-0.5px", marginBottom: 24 }}>
          Popular questions
        </h2>
        <div>
          {FAQS.map((faq, i) => (
            <div
              key={i}
              style={{
                borderBottom: `1px solid ${C.border}`,
                padding: "16px 0",
              }}
            >
              <button
                type="button"
                onClick={() => setOpenQ(openQ === i ? null : i)}
                style={{
                  width: "100%",
                  background: "none",
                  border: "none",
                  padding: 0,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  gap: 16,
                }}
              >
                <span style={{ fontSize: 15, fontWeight: 500, color: C.text, textAlign: "left" }}>
                  {faq.q}
                </span>
                <span style={{ fontSize: 20, color: C.textMuted, flexShrink: 0, lineHeight: 1 }}>
                  {openQ === i ? "−" : "+"}
                </span>
              </button>
              {openQ === i && (
                <p style={{ fontSize: 14, color: C.textSec, lineHeight: 1.7, marginTop: 12, marginBottom: 0 }}>
                  {faq.a}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="hp" style={{ padding: "0 48px", maxWidth: 760, margin: "0 auto", textAlign: "center" }}>
        <p style={{ fontSize: 13, color: C.textMuted }}>
          Still need help?{" "}
          <Link href="/contact" style={{ color: C.green, textDecoration: "none" }}>
            Contact us →
          </Link>
        </p>
      </section>
    </main>
  );
}

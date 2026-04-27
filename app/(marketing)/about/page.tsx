"use client";

import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";

const C = {
  bg: "#0f1117", bgAlt: "#0a0c12", bgCard: "#1a1d28", bgDeep: "#161821",
  border: "#242836", text: "#ffffff", textSec: "#9ca3af", textMuted: "#6b7280",
  textFaint: "#4b5563", green: "#4ade80", blue: "#60a5fa", purple: "#a78bfa",
};

const card: CSSProperties = { background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8 };

const primaryBtn: CSSProperties = {
  background: C.green, color: "#0d0d0d", border: "none", borderRadius: 6,
  fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
};

const sectionLabel: CSSProperties = {
  fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase",
  color: C.textMuted, display: "block", marginBottom: 12,
};

export default function AboutPage() {
  const router = useRouter();

  return (
    <main style={{ background: C.bg, fontFamily: "Inter, -apple-system, sans-serif" }}>
      <style dangerouslySetInnerHTML={{ __html: `
        * { box-sizing: border-box; }
        .ap { padding-left: 48px; padding-right: 48px; }
        .ap-pg3 { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; }
        @media (max-width: 768px) {
          .ap { padding-left: 24px !important; padding-right: 24px !important; }
          .ap-pg3 { grid-template-columns: 1fr !important; }
        }
      `}} />

      {/* Hero */}
      <section className="ap" style={{ padding: "96px 48px 72px", maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
        <span style={sectionLabel}>About</span>
        <h1 style={{ fontSize: "clamp(30px,5vw,48px)", fontWeight: 700, color: C.text, letterSpacing: "-1.5px", lineHeight: 1.1, marginBottom: 20 }}>
          Built by hoteliers, for hoteliers
        </h1>
        <p style={{ fontSize: 17, color: C.textSec, lineHeight: 1.7, maxWidth: 540, margin: "0 auto" }}>
          GuestPulse was born from years of frustration managing hotel reviews manually
        </p>
      </section>

      {/* Story */}
      <section className="ap" style={{ padding: "0 48px 80px", maxWidth: 800, margin: "0 auto" }}>
        <div style={{ ...card, padding: "48px" }}>
          <span style={sectionLabel}>Our story</span>
          <div style={{ fontSize: 16, color: C.textSec, lineHeight: 1.8, display: "flex", flexDirection: "column", gap: 20 }}>
            <p>
              GuestPulse was built after years of managing hotel reviews manually — logging into 6 different platforms,
              copy-pasting responses, missing urgent reviews because nobody checked
              Booking.com for 3 days, watching competitors get better reviews while we did the work manually.
            </p>
            <p>
              We built the tool we wished we had: one dashboard, all your reviews, AI-powered responses, automatic
              monitoring, and competitive intelligence — all in under 5 minutes of setup.
            </p>
            <p style={{ color: C.text, fontWeight: 500 }}>
              Today, GuestPulse is helping independent boutique hotels worldwide turn review chaos into competitive advantage.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="ap" style={{ padding: "0 48px 80px", maxWidth: 1100, margin: "0 auto" }}>
        <span style={{ ...sectionLabel, textAlign: "center" }}>What we believe</span>
        <h2 style={{ fontSize: "clamp(24px,3vw,32px)", fontWeight: 700, color: C.text, textAlign: "center", letterSpacing: "-0.8px", marginBottom: 40 }}>
          Three principles behind everything we build
        </h2>
        <div className="ap-pg3">
          {[
            {
              icon: "✦",
              iconBg: "rgba(74,222,128,0.08)",
              iconColor: C.green,
              title: "Built by hoteliers",
              desc: "We've lived with the problem we're solving. Every feature was born from a real frustration, not a product roadmap exercise. If it doesn't save a hotelier time, it doesn't ship.",
            },
            {
              icon: "◈",
              iconBg: "rgba(96,165,250,0.08)",
              iconColor: C.blue,
              title: "Built with AI",
              desc: "We use AI where it genuinely helps — drafting responses, discovering competitors, analysing sentiment at scale — not as a buzzword but as a practical tool that earns its keep.",
            },
            {
              icon: "◎",
              iconBg: "rgba(167,139,250,0.08)",
              iconColor: C.purple,
              title: "Built for independents",
              desc: "We build for 10-50 room boutique hotels, not hotel chains. Simple pricing, simple setup, no enterprise contracts. The independent hotelier shouldn't be priced out of good tools.",
            },
          ].map((v) => (
            <div key={v.title} style={{ ...card, padding: "32px 28px" }}>
              <div style={{ width: 44, height: 44, borderRadius: 8, background: v.iconBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: v.iconColor, marginBottom: 18 }}>
                {v.icon}
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: C.text, marginBottom: 12 }}>{v.title}</h3>
              <p style={{ fontSize: 14, color: C.textSec, lineHeight: 1.7 }}>{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Team */}
      <section className="ap" style={{ padding: "0 48px 80px", maxWidth: 800, margin: "0 auto" }}>
        <span style={{ ...sectionLabel, textAlign: "center" }}>The team</span>
        <h2 style={{ fontSize: "clamp(24px,3vw,32px)", fontWeight: 700, color: C.text, textAlign: "center", letterSpacing: "-0.8px", marginBottom: 40 }}>
          Who&apos;s behind GuestPulse
        </h2>
        <div style={{ ...card, padding: "36px", display: "flex", gap: 28, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div style={{ width: 72, height: 72, borderRadius: 8, background: C.bgDeep, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, flexShrink: 0 }}>
            L
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 18, fontWeight: 600, color: C.text }}>Leonardo Baaijens</div>
            <div style={{ fontSize: 13, color: C.green, marginTop: 4, marginBottom: 12 }}>Founder, building from Amsterdam</div>
            <p style={{ fontSize: 14, color: C.textSec, lineHeight: 1.7 }}>
              Background in hospitality and tech. Built GuestPulse to solve a problem we kept hearing from hotel
              managers — the chaos of multi-platform review management.
            </p>
            <p style={{ fontSize: 13, color: C.textMuted, marginTop: 10 }}>
              Questions? <a href="mailto:hello@guestpulse.app" style={{ color: C.green, textDecoration: "none" }}>hello@guestpulse.app</a>
            </p>
          </div>
        </div>
      </section>

      {/* Numbers */}
      <section style={{ background: C.bgAlt, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
        <div className="ap" style={{ padding: "64px 48px", maxWidth: 900, margin: "0 auto" }}>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 0 }}>
            {[
              { value: "6", label: "platforms monitored" },
              { value: "19", label: "languages supported" },
              { value: "2 sec", label: "to draft a response" },
              { value: "5 min", label: "average setup time" },
            ].map((stat, i) => (
              <div key={stat.label} style={{
                flex: "1 1 160px",
                textAlign: "center",
                padding: "24px 20px",
                borderRight: i < 3 ? `1px solid ${C.border}` : "none",
              }}>
                <div style={{ fontSize: 36, fontWeight: 700, color: C.green, lineHeight: 1 }}>{stat.value}</div>
                <div style={{ fontSize: 13, color: C.textSec, marginTop: 8 }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="ap" style={{ padding: "96px 48px", maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
        <h2 style={{ fontSize: "clamp(24px,4vw,40px)", fontWeight: 700, color: C.text, letterSpacing: "-1px", lineHeight: 1.15 }}>
          Ready to transform your reviews?
        </h2>
        <p style={{ fontSize: 17, color: C.textSec, marginTop: 16, lineHeight: 1.7 }}>
          7-day free trial. No credit card. Set up in 5 minutes.
        </p>
        <button type="button" onClick={() => router.push("/signup")} style={{ ...primaryBtn, padding: "14px 28px", fontSize: 15, marginTop: 32 }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#22c55e"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = C.green; }}>
          Start 7-day free trial →
        </button>
      </section>
    </main>
  );
}

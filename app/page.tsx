"use client";

import MarketingFooter from "@/components/marketing/Footer";
import MarketingNav from "@/components/marketing/Nav";
import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";

// ── design tokens ──────────────────────────────────────────────────────────────
const C = {
  bg: "#0f1117",
  bgAlt: "#0a0c12",
  bgCard: "#1a1d28",
  bgDeep: "#161821",
  border: "#242836",
  borderMid: "#2a2f3e",
  text: "#ffffff",
  textSec: "#9ca3af",
  textMuted: "#6b7280",
  textFaint: "#4b5563",
  green: "#4ade80",
  blue: "#60a5fa",
  purple: "#a78bfa",
  red: "#f87171",
  amber: "#fbbf24",
} as const;

const card: CSSProperties = { background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8 };

const primaryBtn: CSSProperties = {
  background: C.green,
  color: "#0d0d0d",
  border: "none",
  borderRadius: 6,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
};

const secondaryBtn: CSSProperties = {
  background: "transparent",
  border: `1px solid ${C.borderMid}`,
  borderRadius: 6,
  color: C.textSec,
  fontWeight: 500,
  cursor: "pointer",
  fontFamily: "inherit",
};

const sectionLabel: CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: C.textMuted,
  textAlign: "center",
  marginBottom: 12,
  display: "block",
};

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

const FAQ_ITEMS = [
  {
    q: "How long does setup really take?",
    a: "Under 5 minutes. Type your hotel name and our AI finds your profiles on all 6 platforms automatically. Your reviews start syncing immediately. No technical knowledge needed.",
  },
  {
    q: "Do you need access to my review accounts?",
    a: "No. We never ask for your platform login details. GuestPulse reads reviews from public listing pages only. Your accounts stay completely private and secure.",
  },
  {
    q: "Will AI responses sound generic or robotic?",
    a: "No. Each response references specific details the guest mentioned — their room type, the dish they praised, the issue they had. You can also set a custom sign-off so every response ends with your hotel's signature line.",
  },
  {
    q: "What happens after the free trial?",
    a: "You'll be charged at your selected plan rate. Cancel anytime before the trial ends and you won't be charged. No credit card required to start the trial.",
  },
  {
    q: "Is my hotel data safe?",
    a: "Completely. Your data is encrypted, stored on enterprise-grade infrastructure, never sold to third parties, and never used to train AI models. GDPR compliant. Export or delete your data anytime.",
  },
];

export default function HomePage() {
  const router = useRouter();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    async function checkAuth() {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );
      const { data: { user } } = await supabase.auth.getUser();
      if (user) router.replace("/dashboard");
    }
    checkAuth();
  }, [router]);

  const goSignup = useCallback(() => router.push("/pricing"), [router]);

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif" }}>
      <style dangerouslySetInnerHTML={{ __html: `
        * { box-sizing: border-box; }
        .hp { padding-left: 48px; padding-right: 48px; }
        .hp-pg3 { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; }
        .hp-pg2 { display: grid; grid-template-columns: repeat(2,1fr); gap: 16px; }
        .hp-pg4 { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; }
        .hp-row { display: flex; gap: 16px; }
        .hp-trow { display: grid; grid-template-columns: 2fr 1.2fr 1.2fr 1.2fr; }
        @media (max-width: 768px) {
          .hp { padding-left: 24px !important; padding-right: 24px !important; }
          .hp-pg3 { grid-template-columns: 1fr !important; }
          .hp-pg2 { grid-template-columns: 1fr !important; }
          .hp-pg4 { grid-template-columns: repeat(2,1fr) !important; }
          .hp-row { flex-direction: column !important; }
          .hp-trow { grid-template-columns: 1.8fr 1fr 1fr 1fr; font-size: 11px !important; }
        }
      `}} />

      <MarketingNav />

      {/* Announcement bar */}
      <div style={{ background: "#0a1a0a", borderBottom: "1px solid #1a3a1a", padding: "9px 0", textAlign: "center", fontSize: 12, color: C.green }}>
        Founding member pricing — lock in $99/mo before April 30 →
      </div>

      {/* ── HERO ── */}
      <section className="hp" style={{ padding: "96px 48px 72px", maxWidth: 1100, margin: "0 auto", textAlign: "center" }}>
        <div style={{ display: "inline-block", background: C.bgDeep, border: `1px solid ${C.border}`, borderRadius: 100, padding: "6px 14px", fontSize: 12, color: C.textMuted, marginBottom: 24 }}>
          ✦ Built for independent boutique hotels worldwide
        </div>

        <h1 style={{ fontSize: "clamp(36px,5vw,56px)", fontWeight: 700, letterSpacing: "-2px", lineHeight: 1.08, maxWidth: 900, margin: "0 auto" }}>
          <span style={{ color: C.text, display: "block" }}>Never lose a booking to</span>
          <span style={{ color: C.green, display: "block" }}>an unanswered review</span>
        </h1>

        <p style={{ fontSize: 17, color: C.textSec, maxWidth: 640, lineHeight: 1.7, margin: "20px auto 0" }}>
          GuestPulse pulls reviews from all 6 major platforms, drafts AI responses in 2 seconds, and finds
          your competitors automatically — set up in under 5 minutes. Works for hotels worldwide.
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center", marginTop: 32 }}>
          <button type="button" onClick={goSignup} style={{ ...primaryBtn, padding: "13px 26px", fontSize: 14 }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#22c55e"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = C.green; }}>
            Start 7-day free trial →
          </button>
          <button type="button" onClick={() => scrollTo("how-it-works")} style={{ ...secondaryBtn, padding: "13px 26px", fontSize: 14 }}
            onMouseEnter={(e) => { e.currentTarget.style.background = C.bgCard; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
            See how it works
          </button>
        </div>
        <p style={{ fontSize: 12, color: C.textFaint, marginTop: 16 }}>No credit card required · Cancel anytime</p>
      </section>

      {/* ── PLATFORM LOGOS ── */}
      <div style={{ background: C.bgAlt, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, padding: "36px 48px" }}>
        <p style={{ fontSize: 11, letterSpacing: "0.15em", color: C.textFaint, textTransform: "uppercase", textAlign: "center", marginBottom: 18 }}>
          Monitor all 6 major review platforms
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 32, alignItems: "center" }}>
          {[
            { name: "Tripadvisor", c: C.green }, { name: "Google", c: C.blue },
            { name: "Booking.com", c: C.purple }, { name: "Trip.com", c: C.blue },
            { name: "Expedia", c: C.purple }, { name: "Yelp", c: C.red },
          ].map((p) => (
            <span key={p.name} style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.3px", color: p.c }}>{p.name}</span>
          ))}
        </div>
      </div>

      {/* ── THE PROBLEM ── */}
      <section className="hp" style={{ padding: "96px 48px", maxWidth: 1100, margin: "0 auto" }}>
        <span style={sectionLabel}>The Problem</span>
        <h2 style={{ fontSize: "clamp(26px,3.5vw,36px)", fontWeight: 700, color: C.text, letterSpacing: "-1px", textAlign: "center", marginBottom: 12 }}>
          The reviews problem no one talks about
        </h2>
        <p style={{ fontSize: 16, color: C.textSec, textAlign: "center", maxWidth: 600, margin: "0 auto 48px", lineHeight: 1.7 }}>
          Most hotel owners find out about bad reviews days after they&apos;re posted — when the damage is done
        </p>
        <div className="hp-pg3">
          {[
            { stat: "78%", c: C.red, label: "of travellers read reviews before booking", src: "— TripAdvisor Research" },
            { stat: "53%", c: C.amber, label: "of guests expect a response within 3 days", src: "— Booking.com Survey" },
            { stat: "9%", c: C.red, label: "fewer bookings for every 1 star rating drop", src: "— Harvard Business Review" },
          ].map((s) => (
            <div key={s.stat} style={{ ...card, padding: "28px 24px", textAlign: "center" }}>
              <div style={{ fontSize: 52, fontWeight: 700, color: s.c, lineHeight: 1 }}>{s.stat}</div>
              <p style={{ fontSize: 14, color: C.textSec, marginTop: 10, lineHeight: 1.5 }}>{s.label}</p>
              <p style={{ fontSize: 11, color: C.textFaint, marginTop: 4 }}>{s.src}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="hp" style={{ padding: "96px 48px", maxWidth: 1100, margin: "0 auto" }}>
        <span style={sectionLabel}>How It Works</span>
        <h2 style={{ fontSize: "clamp(26px,3.5vw,36px)", fontWeight: 700, color: C.text, letterSpacing: "-1px", textAlign: "center" }}>
          From setup to first response in 5 minutes
        </h2>
        <div className="hp-pg3" style={{ marginTop: 48 }}>
          {[
            { n: "01", title: "Find your hotel", desc: "Type your hotel name. Our AI finds your profiles on TripAdvisor, Google, Booking.com, Trip.com, Expedia and Yelp automatically." },
            { n: "02", title: "Sync your reviews", desc: "GuestPulse pulls every review from every platform automatically — daily, without you lifting a finger." },
            { n: "03", title: "Respond in seconds", desc: "Click Draft Response on any review. AI generates a personalised reply in 2 seconds. Copy, paste, done." },
          ].map((s) => (
            <div key={s.n} style={{ ...card, padding: "32px 28px" }}>
              <div style={{ fontSize: 52, fontWeight: 700, color: C.border, lineHeight: 1, marginBottom: 20, userSelect: "none" }}>{s.n}</div>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: C.text, marginBottom: 10 }}>{s.title}</h3>
              <p style={{ fontSize: 14, color: C.textSec, lineHeight: 1.7 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="hp" style={{ padding: "96px 48px", maxWidth: 1100, margin: "0 auto" }}>
        <span style={sectionLabel}>Features</span>
        <h2 style={{ fontSize: "clamp(26px,3.5vw,36px)", fontWeight: 700, color: C.text, textAlign: "center" }}>
          Everything you need to own your reputation
        </h2>
        <div className="hp-pg2" style={{ marginTop: 48 }}>
          {[
            { bg: "rgba(74,222,128,0.07)", icon: "✦", ic: C.green, title: "AI responses in 2 seconds", desc: "Our AI reads each review and generates a warm professional response referencing specific details the guest mentioned. Edit, copy, post." },
            { bg: "rgba(96,165,250,0.07)", icon: "◈", ic: C.blue, title: "All 6 platforms in one inbox", desc: "TripAdvisor, Google, Booking.com, Trip.com, Expedia and Yelp — all synced automatically. No more logging into 6 different dashboards." },
            { bg: "rgba(167,139,250,0.07)", icon: "◎", ic: C.purple, title: "AI sentiment analysis", desc: "Every review automatically classified: positive, neutral, negative. Spot complaint trends before they hurt your rating. 19 languages supported." },
            { bg: "rgba(251,191,36,0.07)", icon: "△", ic: C.amber, title: "Know your competition", desc: "AI finds similar hotels in your area. See exactly how you rank. Benchmark your rating, review volume, and complaint topics vs local rivals." },
            { bg: "rgba(248,113,113,0.07)", icon: "!", ic: C.red, title: "Urgent review alerts", desc: "Get instant notification when a 1 or 2 star review is posted. Respond within hours, not days — the difference between saved and lost bookings." },
            { bg: "rgba(74,222,128,0.07)", icon: "✉", ic: C.green, title: "Monday morning digest", desc: "Weekly email summary: new reviews, rating changes, top complaints, urgent items. Start every Monday knowing exactly where you stand." },
          ].map((f) => (
            <div key={f.title} style={{ ...card, padding: "28px" }}>
              <div style={{ width: 40, height: 40, borderRadius: 8, background: f.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: f.ic }}>
                {f.icon}
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 600, color: C.text, marginTop: 16 }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: C.textSec, lineHeight: 1.7, marginTop: 8 }}>{f.desc}</p>
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: 32 }}>
          <Link href="/features" style={{ fontSize: 14, color: C.green, textDecoration: "none" }}>
            See all features →
          </Link>
        </div>
      </section>

      {/* ── PRODUCT MOCKUP ── */}
      <section className="hp" style={{ padding: "72px 48px", maxWidth: 1100, margin: "0 auto", textAlign: "center" }}>
        <span style={sectionLabel}>The Product</span>
        <h2 style={{ fontSize: "clamp(26px,3.5vw,36px)", fontWeight: 700, color: C.text }}>Built to be used every day</h2>
        <p style={{ fontSize: 16, color: C.textSec, maxWidth: 560, margin: "12px auto 40px", lineHeight: 1.7 }}>
          A clean professional dashboard that surfaces what matters today. No bloat. No learning curve.
        </p>

        <div style={{ ...card, borderRadius: 12, padding: 0, overflow: "hidden", maxWidth: 900, margin: "0 auto", textAlign: "left" }}>
          {/* Browser bar */}
          <div style={{ background: C.bgAlt, padding: "10px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center" }}>
            <div style={{ display: "flex", gap: 6 }}>
              {[C.red, C.amber, C.green].map((c) => <span key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c, display: "block" }} />)}
            </div>
            <span style={{ fontSize: 11, color: C.textFaint, marginLeft: 14 }}>guestpulse.com/dashboard</span>
          </div>

          <div style={{ padding: 24 }}>
            <div className="hp-pg4">
              {[
                { label: "AVG RATING", value: "4.8", delta: "+0.3 vs last month", dc: C.green },
                { label: "REVIEWS THIS WEEK", value: "12", delta: "+4 vs last week", dc: C.green },
                { label: "RESPONSE RATE", value: "94%", delta: "+7% vs last month", dc: C.green },
                { label: "PENDING REPLIES", value: "3", delta: "2 urgent", dc: C.red },
              ].map((s) => (
                <div key={s.label} style={{ background: C.bgAlt, border: `1px solid ${C.border}`, borderRadius: 6, padding: 14 }}>
                  <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.textMuted, marginBottom: 6 }}>{s.label}</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: C.text, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: s.dc, marginTop: 4 }}>{s.delta}</div>
                </div>
              ))}
            </div>

            {/* Fake review */}
            <div style={{ background: C.bgAlt, border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.red}`, borderRadius: 6, padding: 14, marginTop: 12, display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 10, justifyContent: "space-between" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 100, background: "#0d1528", border: `1px solid #1a2d3a`, color: C.blue }}>GOOGLE</span>
                  <span style={{ color: C.amber, fontSize: 13 }}>★★</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>James K.</span>
                  <span style={{ fontSize: 11, color: C.textMuted }}>· 2 hours ago</span>
                  <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 100, background: "#1f0d0d", border: `1px solid #3a1a1a`, color: C.red }}>Negative</span>
                </div>
                <p style={{ fontSize: 13, color: C.textSec, lineHeight: 1.5 }}>
                  Very disappointed with our stay. The room was noisy all night due to construction next door...
                </p>
              </div>
              <button type="button" style={{ ...primaryBtn, padding: "6px 12px", fontSize: 11, flexShrink: 0 }}>
                Draft AI response
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── COMPARISON TABLE ── */}
      <section className="hp" style={{ padding: "96px 48px", maxWidth: 960, margin: "0 auto" }}>
        <span style={sectionLabel}>Why GuestPulse</span>
        <h2 style={{ fontSize: "clamp(26px,3.5vw,36px)", fontWeight: 700, color: C.text, textAlign: "center", marginBottom: 40 }}>
          Compare your options
        </h2>
        <div style={{ ...card, overflow: "hidden" }}>
          <div className="hp-trow" style={{ background: C.bgAlt, borderBottom: `1px solid ${C.border}`, padding: "16px 20px" }}>
            {(["Feature", "Manual", "Enterprise tool", "GuestPulse"] as const).map((h, i) => (
              <div key={h} style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: i === 3 ? C.green : C.textMuted }}>{h}</div>
            ))}
          </div>
          {[
            ["Monitor 6 review platforms", "~", "✓", "✓"],
            ["AI response drafting", "✗", "✓", "✓"],
            ["Setup in under 5 minutes", "✓", "✗", "✓"],
            ["Auto-find your hotel profiles", "✗", "✗", "✓"],
            ["AI competitor discovery", "✗", "✗", "✓"],
            ["Multilingual sentiment analysis", "✗", "~", "✓"],
            ["Weekly email digest", "✗", "✓", "✓"],
            ["Price per month", "Free but costs 10+ hrs", "$500–2000/mo", "$99–399/mo"],
          ].map((row, ri) => (
            <div key={row[0]} className="hp-trow" style={{ padding: "14px 20px", borderBottom: ri < 7 ? `1px solid ${C.border}` : "none", alignItems: "center" }}>
              {row.map((cell, ci) => {
                let color: string = C.textSec;
                if (ci === 0) color = C.text;
                else if (cell === "✓") color = C.green;
                else if (cell === "✗") color = C.red;
                else if (cell === "~") color = C.amber;
                return <div key={`${ri}-${ci}`} style={{ fontSize: 13, color }}>{cell}</div>;
              })}
            </div>
          ))}
        </div>
      </section>

      {/* ── PRICING TEASER ── */}
      <section id="pricing" className="hp" style={{ padding: "96px 48px", maxWidth: 1100, margin: "0 auto", textAlign: "center" }}>
        <span style={sectionLabel}>Pricing</span>
        <h2 style={{ fontSize: "clamp(26px,3.5vw,36px)", fontWeight: 700, color: C.text }}>Simple, transparent pricing</h2>
        <p style={{ fontSize: 16, color: C.textSec, marginTop: 8, marginBottom: 36 }}>
          Start free for 7 days. No credit card required.
        </p>
        <div className="hp-pg3">
          {[
            { badge: "STARTER", name: "Essential", price: "$99", sub: "per month", features: ["1 hotel, 3 platforms", "10 AI drafts/month", "Email alerts"], featured: false, featColor: C.textSec },
            { badge: "GROWTH", name: "Professional", price: "$199", sub: "per month", features: ["1 hotel, all 6 platforms", "Unlimited AI drafts", "Competitor benchmarking", "Weekly digest"], featured: true, featColor: C.green },
            { badge: "BUSINESS", name: "Multi-property", price: "$399", sub: "per month", features: ["Up to 5 hotels", "Portfolio dashboard", "Dedicated account manager"], featured: false, featColor: C.blue },
          ].map((p) => (
            <div key={p.name} style={{ ...card, border: p.featured ? `2px solid ${C.green}` : `1px solid ${C.border}`, borderRadius: 8, padding: "28px 24px", textAlign: "left", position: "relative" }}>
              {p.featured && (
                <div style={{ position: "absolute", top: -13, left: "50%", transform: "translateX(-50%)", background: C.green, color: "#0d0d0d", padding: "3px 14px", borderRadius: 100, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
                  most popular
                </div>
              )}
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", color: C.textMuted, textTransform: "uppercase" }}>{p.badge}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: C.text, marginTop: 8 }}>{p.name}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 12 }}>
                <span style={{ fontSize: 40, fontWeight: 700, color: C.text }}>{p.price}</span>
                <span style={{ fontSize: 14, color: C.textMuted }}>{p.sub}</span>
              </div>
              <ul style={{ listStyle: "none", marginTop: 20, display: "flex", flexDirection: "column", gap: 8 }}>
                {p.features.map((f) => (
                  <li key={f} style={{ display: "flex", gap: 8, fontSize: 13, color: C.textSec, alignItems: "flex-start" }}>
                    <span style={{ color: p.featColor, flexShrink: 0 }}>●</span>{f}
                  </li>
                ))}
              </ul>
              <button type="button" onClick={goSignup}
                style={p.featured
                  ? { ...primaryBtn, width: "100%", padding: "11px", marginTop: 20 }
                  : { ...secondaryBtn, width: "100%", padding: "11px", marginTop: 20 }
                }
                onMouseEnter={(e) => { e.currentTarget.style.background = p.featured ? "#22c55e" : C.bgCard; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = p.featured ? C.green : "transparent"; }}>
                Start free trial
              </button>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 13, color: C.textMuted, marginTop: 20 }}>
          All plans include 7-day free trial · <Link href="/pricing" style={{ color: C.green, textDecoration: "none" }}>See full pricing &amp; comparison →</Link>
        </p>
      </section>

      {/* ── ROI CALCULATOR ── */}
      <section className="hp" style={{ padding: "72px 48px", maxWidth: 800, margin: "0 auto" }}>
        <div style={{ ...card, borderRadius: 12, padding: "48px" }}>
          <span style={sectionLabel}>Return on Investment</span>
          <h2 style={{ fontSize: 28, fontWeight: 700, color: C.text, textAlign: "center", marginBottom: 8 }}>GuestPulse pays for itself</h2>
          <p style={{ fontSize: 15, color: C.textSec, textAlign: "center", marginBottom: 32, lineHeight: 1.7 }}>
            If you recover just 1 booking per month by responding faster to reviews, GuestPulse pays for itself 3x over.
          </p>
          <div className="hp-row">
            {[
              { value: "£240", label: "Average boutique hotel booking", sub: "TripAdvisor data", c: C.text },
              { value: "$99", label: "GuestPulse Professional cost", sub: "per month", c: C.text },
              { value: "£141", label: "Net profit per saved booking", sub: "after plan cost", c: C.green },
            ].map((s) => (
              <div key={s.label} style={{ flex: 1, background: C.bgAlt, border: `1px solid ${C.border}`, borderRadius: 6, padding: "20px", textAlign: "center" }}>
                <div style={{ fontSize: 32, fontWeight: 700, color: s.c, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 13, color: C.textSec, marginTop: 8, lineHeight: 1.4 }}>{s.label}</div>
                <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>{s.sub}</div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 13, color: C.textMuted, textAlign: "center", marginTop: 20 }}>
            Most hotels recover 3–5 bookings per month from faster response times
          </p>
        </div>
      </section>

      {/* ── BUILT BY HOTELIERS ── */}
      <section className="hp" style={{ padding: "72px 48px", maxWidth: 760, margin: "0 auto", textAlign: "center" }}>
        <div style={{ ...card, padding: "36px" }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: C.text, marginBottom: 14 }}>✦ Built by hoteliers, for hoteliers</div>
          <p style={{ fontSize: 15, color: C.textSec, lineHeight: 1.8 }}>
            GuestPulse was built after managing hotel reviews for years. We know the frustration of logging into 6
            platforms, writing the same responses, and watching competitors get better reviews while you do the work
            manually. We built the tool we wished we had.
          </p>
          <Link href="/about" style={{ display: "inline-block", marginTop: 20, fontSize: 13, color: C.green, textDecoration: "none" }}>
            Our story →
          </Link>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="hp" style={{ padding: "96px 48px", maxWidth: 720, margin: "0 auto" }}>
        <span style={sectionLabel}>FAQ</span>
        <h2 style={{ fontSize: "clamp(26px,3.5vw,36px)", fontWeight: 700, color: C.text, textAlign: "center", marginBottom: 40 }}>
          Questions hoteliers ask
        </h2>
        {FAQ_ITEMS.map((item, i) => {
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
        <div style={{ textAlign: "center", marginTop: 28 }}>
          <Link href="/contact" style={{ fontSize: 13, color: C.textMuted, textDecoration: "none" }}>
            Still have questions? Get in touch →
          </Link>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="hp" style={{ padding: "96px 48px", maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
        <h2 style={{ fontSize: "clamp(30px,4.5vw,44px)", fontWeight: 700, color: C.text, letterSpacing: "-1.5px", lineHeight: 1.15 }}>
          Start protecting your reputation today
        </h2>
        <p style={{ fontSize: 17, color: C.textSec, marginTop: 16, lineHeight: 1.7 }}>
          Join independent boutique hotels worldwide using GuestPulse to never miss another review.
        </p>
        <button type="button" onClick={goSignup} style={{ ...primaryBtn, padding: "14px 28px", fontSize: 15, fontWeight: 600, marginTop: 32 }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#22c55e"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = C.green; }}>
          Start 7-day free trial →
        </button>
        <p style={{ fontSize: 13, color: C.textMuted, marginTop: 16 }}>
          No credit card required · Set up in 5 minutes · Cancel anytime
        </p>
      </section>

      <MarketingFooter />
    </div>
  );
}

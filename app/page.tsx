"use client";

import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";

const primaryBtn: CSSProperties = {
  background: "#f0f0f0",
  border: "none",
  borderRadius: "6px",
  color: "#0d0d0d",
  fontWeight: 600,
  fontSize: "13px",
  cursor: "pointer",
};

const secondaryBtn: CSSProperties = {
  background: "transparent",
  border: "1px solid #2a2a2a",
  borderRadius: "6px",
  color: "#888888",
  fontWeight: 500,
  fontSize: "13px",
  cursor: "pointer",
};

const card: CSSProperties = {
  background: "#141414",
  border: "1px solid #1e1e1e",
  borderRadius: "8px",
};

const sectionLabel: CSSProperties = {
  fontSize: "10px",
  fontWeight: 600,
  letterSpacing: "0.1em",
  textTransform: "uppercase" as const,
  color: "#555555",
  textAlign: "center" as const,
  marginBottom: "12px",
};

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

const faqItems: { q: string; a: string }[] = [
  {
    q: "How long does setup really take?",
    a: "Under 5 minutes. Create an account, type your hotel name, and our AI finds your profiles on all 6 platforms automatically. Your reviews start syncing immediately. No technical knowledge needed.",
  },
  {
    q: "Do you need access to my review accounts?",
    a: "No. We never ask for your platform login details. GuestPulse reads reviews from public listing pages only. Your accounts stay completely private and secure.",
  },
  {
    q: "How does the AI response feature work?",
    a: "Click 'Draft Response' on any review. Our AI reads the review content, your hotel name, and your preferred tone, then generates a warm professional response in 2-3 seconds. You edit it, copy it, and paste it on the platform.",
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
    q: "Can I use GuestPulse for multiple properties?",
    a: "Yes. The Multi-property plan supports up to 5 hotels under one account with a portfolio overview dashboard. For hotel groups with more properties, contact us for a custom plan.",
  },
  {
    q: "What languages are supported?",
    a: "GuestPulse analyses reviews in 19 languages including English, Dutch, German, French, Spanish, Italian, Portuguese, Indonesian, Chinese, and Japanese. You can also translate any review to your preferred language with one click.",
  },
  {
    q: "Is my hotel data safe?",
    a: "Completely. Your data is encrypted, stored on enterprise-grade infrastructure, never sold to third parties, and never used to train AI models. GDPR compliant. Export or delete your data anytime.",
  },
];

export default function LandingPage() {
  const router = useRouter();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    async function checkAuth() {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) router.replace("/dashboard");
    }
    checkAuth();
  }, [router]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const goSignup = useCallback(() => router.push("/signup"), [router]);

  const toggleFaq = useCallback((i: number) => {
    setOpenFaq((prev) => (prev === i ? null : i));
  }, []);

  const showToast = useCallback((msg: string) => setToast(msg), []);

  const annualPrice = (monthly: number) => Math.round(monthly * 0.83);

  return (
    <div style={{ minHeight: "100vh", background: "#0d0d0d", color: "#f0f0f0", fontFamily: "inherit" }}>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { background: #0d0d0d; }
            .lp-nav-stack {
              position: fixed;
              top: 0; left: 0; right: 0;
              z-index: 100;
            }
            .lp-nav-links { display: flex; align-items: center; gap: 24px; }
            .lp-nav-signin { display: inline-block; }
            .lp-nav-mobile-cta { display: none !important; }
            .lp-section { padding-left: 48px; padding-right: 48px; }
            .lp-problem-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; }
            .lp-steps-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; }
            .lp-features-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 16px; }
            .lp-pricing-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; align-items: start; }
            .lp-roi-cards { display: flex; gap: 16px; }
            .lp-table-row { display: grid; grid-template-columns: 2fr 1.2fr 1.2fr 1.2fr; }
            .lp-mock-stats { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; }
            .lp-navbtn {
              background: none; border: none; font-size: 14px;
              color: #888888; cursor: pointer; padding: 0;
              font-family: inherit;
            }
            .lp-navbtn:hover { color: #f0f0f0; }
            @media (max-width: 900px) {
              .lp-pricing-grid { grid-template-columns: 1fr !important; }
              .lp-table-row { grid-template-columns: 2fr 1fr 1fr 1fr; }
            }
            @media (max-width: 768px) {
              .lp-section { padding-left: 24px !important; padding-right: 24px !important; }
              .lp-nav-links { display: none !important; }
              .lp-nav-signin { display: none !important; }
              .lp-nav-mobile-cta { display: inline-flex !important; align-items: center; justify-content: center; margin-left: auto; }
              .lp-problem-grid { grid-template-columns: 1fr !important; }
              .lp-steps-grid { grid-template-columns: 1fr !important; }
              .lp-features-grid { grid-template-columns: 1fr !important; }
              .lp-roi-cards { flex-direction: column !important; }
              .lp-mock-stats { grid-template-columns: repeat(2,1fr) !important; }
              .lp-table-row { grid-template-columns: 1.8fr 1fr 1fr 1fr; font-size: 11px !important; }
            }
          `,
        }}
      />

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: "32px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#1e1e1e",
            border: "1px solid #2a2a2a",
            borderRadius: "6px",
            padding: "10px 20px",
            fontSize: "13px",
            color: "#f0f0f0",
            zIndex: 9999,
            whiteSpace: "nowrap",
          }}
        >
          {toast}
        </div>
      )}

      {/* ── SECTION 1: ANNOUNCEMENT BAR ── */}
      <div className="lp-nav-stack">
        <div
          style={{
            background: "#0a1a0a",
            borderBottom: "1px solid #1a3a1a",
            padding: "8px 0",
            textAlign: "center",
            fontSize: "12px",
            color: "#4ade80",
          }}
        >
          Founding member pricing — lock in $99/mo before April 30 →
        </div>

        {/* ── SECTION 2: NAVIGATION ── */}
        <nav
          style={{
            background: "#0d0d0d",
            borderBottom: "1px solid #1a1a1a",
            height: "60px",
            padding: "0 48px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#4ade80", flexShrink: 0 }}
            />
            <span style={{ fontSize: "16px", fontWeight: 700, color: "#f0f0f0" }}>GuestPulse</span>
          </div>

          {/* Center links */}
          <div className="lp-nav-links">
            <button type="button" className="lp-navbtn" onClick={() => scrollToId("features")}>Features</button>
            <button type="button" className="lp-navbtn" onClick={() => scrollToId("pricing")}>Pricing</button>
            <button type="button" className="lp-navbtn" onClick={() => scrollToId("faq")}>FAQ</button>
          </div>

          {/* Right actions */}
          <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
            <Link
              href="/login"
              className="lp-nav-signin"
              style={{ fontSize: "14px", color: "#888888", textDecoration: "none" }}
            >
              Sign in
            </Link>
            <button
              type="button"
              onClick={goSignup}
              style={{ ...primaryBtn, padding: "8px 16px", fontSize: "13px" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#e0e0e0"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#f0f0f0"; }}
            >
              Start free trial
            </button>
            <button
              type="button"
              className="lp-nav-mobile-cta"
              onClick={goSignup}
              style={{ ...primaryBtn, padding: "8px 16px", fontSize: "13px" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#e0e0e0"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#f0f0f0"; }}
            >
              Start free trial
            </button>
          </div>
        </nav>
      </div>

      {/* Spacer for fixed nav */}
      <div style={{ height: "96px" }} />

      {/* ── SECTION 3: HERO ── */}
      <section
        className="lp-section"
        style={{ padding: "100px 48px 80px", maxWidth: "1100px", margin: "0 auto", textAlign: "center" }}
      >
        <div
          style={{
            display: "inline-block",
            background: "#111",
            border: "1px solid #1e1e1e",
            borderRadius: "100px",
            padding: "6px 14px",
            fontSize: "12px",
            color: "#888",
            marginBottom: "24px",
          }}
        >
          ✦ Built for UK &amp; Ireland boutique hotels
        </div>

        <h1
          style={{
            fontSize: "clamp(36px, 5vw, 52px)",
            fontWeight: 700,
            letterSpacing: "-1.5px",
            lineHeight: 1.1,
            maxWidth: "900px",
            margin: "0 auto",
          }}
        >
          <span style={{ color: "#f0f0f0", display: "block" }}>Never lose a booking to</span>
          <span style={{ color: "#4ade80", display: "block" }}>an unanswered review</span>
        </h1>

        <p
          style={{
            fontSize: "17px",
            color: "#888",
            maxWidth: "660px",
            lineHeight: 1.6,
            margin: "20px auto 0",
          }}
        >
          GuestPulse pulls reviews from all 6 major platforms, drafts AI responses in 2 seconds, and finds your
          competitors automatically — set up in under 5 minutes.
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", justifyContent: "center", marginTop: "32px" }}>
          <button
            type="button"
            onClick={goSignup}
            style={{ ...primaryBtn, padding: "12px 24px", fontSize: "14px" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#e0e0e0"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#f0f0f0"; }}
          >
            Start 7-day free trial →
          </button>
          <button
            type="button"
            onClick={() => scrollToId("how-it-works")}
            style={{ ...secondaryBtn, padding: "12px 24px", fontSize: "14px" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#1e1e1e"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            See how it works
          </button>
        </div>

        <p style={{ fontSize: "12px", color: "#555", marginTop: "20px" }}>
          No credit card required · Cancel anytime
        </p>
      </section>

      {/* ── SECTION 4: PLATFORM LOGOS STRIP ── */}
      <div
        style={{
          background: "#0a0a0a",
          borderTop: "1px solid #1a1a1a",
          borderBottom: "1px solid #1a1a1a",
          padding: "40px 48px",
        }}
      >
        <p
          style={{
            fontSize: "11px",
            letterSpacing: "0.15em",
            color: "#444",
            textTransform: "uppercase",
            textAlign: "center",
            marginBottom: "20px",
          }}
        >
          Monitor all 6 major review platforms
        </p>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "32px",
            alignItems: "center",
          }}
        >
          {[
            { name: "Tripadvisor", color: "#4ade80" },
            { name: "Google", color: "#60a5fa" },
            { name: "Booking.com", color: "#a78bfa" },
            { name: "Trip.com", color: "#60a5fa" },
            { name: "Expedia", color: "#a78bfa" },
            { name: "Yelp", color: "#f87171" },
          ].map((p) => (
            <span
              key={p.name}
              style={{ fontSize: "15px", fontWeight: 600, letterSpacing: "-0.3px", color: p.color }}
            >
              {p.name}
            </span>
          ))}
        </div>
      </div>

      {/* ── SECTION 5: THE PROBLEM ── */}
      <section
        className="lp-section"
        style={{ padding: "100px 48px", maxWidth: "1100px", margin: "0 auto" }}
      >
        <p style={sectionLabel}>The Problem</p>
        <h2
          style={{
            fontSize: "clamp(28px, 3.5vw, 36px)",
            fontWeight: 700,
            color: "#f0f0f0",
            letterSpacing: "-1px",
            textAlign: "center",
            marginBottom: "12px",
          }}
        >
          The reviews problem no one talks about
        </h2>
        <p
          style={{
            fontSize: "16px",
            color: "#888",
            textAlign: "center",
            maxWidth: "640px",
            margin: "0 auto",
            lineHeight: 1.6,
          }}
        >
          Most UK hotel owners find out about bad reviews days after they&apos;re posted — when the damage is done
        </p>

        <div className="lp-problem-grid" style={{ marginTop: "48px" }}>
          {[
            { stat: "78%", color: "#f87171", label: "of travellers read reviews before booking", source: "— TripAdvisor Research" },
            { stat: "53%", color: "#fbbf24", label: "of guests expect a response within 3 days", source: "— Booking.com Survey" },
            { stat: "9%", color: "#f87171", label: "fewer bookings for every 1 star rating drop", source: "— Harvard Business Review" },
          ].map((s) => (
            <div key={s.stat} style={{ ...card, padding: "28px 24px", textAlign: "center" }}>
              <div style={{ fontSize: "48px", fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.stat}</div>
              <p style={{ fontSize: "14px", color: "#888", marginTop: "8px", lineHeight: 1.5 }}>{s.label}</p>
              <p style={{ fontSize: "11px", color: "#444", marginTop: "4px" }}>{s.source}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── SECTION 6: HOW IT WORKS ── */}
      <section
        id="how-it-works"
        className="lp-section"
        style={{ padding: "100px 48px", maxWidth: "1100px", margin: "0 auto" }}
      >
        <p style={sectionLabel}>How It Works</p>
        <h2
          style={{
            fontSize: "clamp(28px, 3.5vw, 36px)",
            fontWeight: 700,
            color: "#f0f0f0",
            letterSpacing: "-1px",
            textAlign: "center",
          }}
        >
          From setup to first response in 5 minutes
        </h2>

        <div className="lp-steps-grid" style={{ marginTop: "56px" }}>
          {[
            {
              n: "01",
              title: "Find your hotel",
              desc: "Type your hotel name. Our AI finds your profiles on TripAdvisor, Google, Booking.com, Trip.com, Expedia and Yelp automatically.",
            },
            {
              n: "02",
              title: "Sync your reviews",
              desc: "GuestPulse pulls every review from every platform automatically — daily, without you lifting a finger.",
            },
            {
              n: "03",
              title: "Respond in seconds",
              desc: "Click Draft Response on any review. AI generates a personalised reply in 2 seconds. Copy, paste, done.",
            },
          ].map((step) => (
            <div key={step.n} style={{ ...card, padding: "32px 28px" }}>
              <div
                style={{
                  fontSize: "48px",
                  fontWeight: 700,
                  color: "#1e1e1e",
                  lineHeight: 1,
                  marginBottom: "20px",
                  userSelect: "none",
                }}
              >
                {step.n}
              </div>
              <h3 style={{ fontSize: "18px", fontWeight: 600, color: "#f0f0f0", marginBottom: "10px" }}>
                {step.title}
              </h3>
              <p style={{ fontSize: "14px", color: "#888", lineHeight: 1.6 }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── SECTION 7: FEATURES ── */}
      <section
        id="features"
        className="lp-section"
        style={{ padding: "100px 48px", maxWidth: "1100px", margin: "0 auto" }}
      >
        <p style={sectionLabel}>Features</p>
        <h2
          style={{
            fontSize: "clamp(28px, 3.5vw, 36px)",
            fontWeight: 700,
            color: "#f0f0f0",
            textAlign: "center",
          }}
        >
          Everything you need to own your reputation
        </h2>

        <div className="lp-features-grid" style={{ marginTop: "56px" }}>
          {[
            {
              iconBg: "rgba(74,222,128,0.08)",
              icon: "✦",
              iconColor: "#4ade80",
              title: "AI responses in 2 seconds",
              desc: "Our AI reads each review and generates a warm professional response referencing specific details the guest mentioned. Edit, copy, post.",
            },
            {
              iconBg: "rgba(96,165,250,0.08)",
              icon: "◈",
              iconColor: "#60a5fa",
              title: "All 6 platforms in one inbox",
              desc: "TripAdvisor, Google, Booking.com, Trip.com, Expedia and Yelp — all synced automatically. No more logging into 6 different dashboards.",
            },
            {
              iconBg: "rgba(167,139,250,0.08)",
              icon: "◎",
              iconColor: "#a78bfa",
              title: "AI sentiment analysis",
              desc: "Every review automatically classified: positive, neutral, negative. Spot complaint trends before they hurt your rating. 19 languages supported.",
            },
            {
              iconBg: "rgba(251,191,36,0.08)",
              icon: "△",
              iconColor: "#fbbf24",
              title: "Know your competition",
              desc: "AI finds similar hotels in your area. See exactly how you rank. Benchmark your rating, review volume, and complaint topics vs local rivals.",
            },
            {
              iconBg: "rgba(248,113,113,0.08)",
              icon: "!",
              iconColor: "#f87171",
              title: "Urgent review alerts",
              desc: "Get instant notification when a 1 or 2 star review is posted. Respond within hours, not days — the difference between saved and lost bookings.",
            },
            {
              iconBg: "rgba(74,222,128,0.08)",
              icon: "✉",
              iconColor: "#4ade80",
              title: "Monday morning digest",
              desc: "Weekly email summary: new reviews, rating changes, top complaints, urgent items. Start every Monday knowing exactly where you stand.",
            },
          ].map((f) => (
            <div key={f.title} style={{ ...card, padding: "28px" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "8px",
                  background: f.iconBg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "18px",
                  color: f.iconColor,
                }}
              >
                {f.icon}
              </div>
              <h3 style={{ fontSize: "17px", fontWeight: 600, color: "#f0f0f0", marginTop: "16px" }}>
                {f.title}
              </h3>
              <p style={{ fontSize: "14px", color: "#888", lineHeight: 1.6, marginTop: "8px" }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── SECTION 8: PRODUCT SHOWCASE ── */}
      <section
        className="lp-section"
        style={{ padding: "80px 48px", maxWidth: "1100px", margin: "0 auto", textAlign: "center" }}
      >
        <p style={sectionLabel}>The Product</p>
        <h2
          style={{
            fontSize: "clamp(28px, 3.5vw, 36px)",
            fontWeight: 700,
            color: "#f0f0f0",
          }}
        >
          Built to be used every day
        </h2>
        <p
          style={{
            fontSize: "16px",
            color: "#888",
            maxWidth: "600px",
            margin: "16px auto 48px",
            lineHeight: 1.6,
          }}
        >
          A clean professional dashboard that surfaces what matters today. No bloat. No learning curve.
        </p>

        {/* Mock dashboard */}
        <div
          style={{
            ...card,
            borderRadius: "12px",
            padding: 0,
            overflow: "hidden",
            maxWidth: "900px",
            margin: "0 auto",
            textAlign: "left",
          }}
        >
          {/* Fake browser bar */}
          <div
            style={{
              background: "#0a0a0a",
              padding: "10px 14px",
              borderBottom: "1px solid #1a1a1a",
              display: "flex",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", gap: "6px" }}>
              <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#f87171", display: "block" }} />
              <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#fbbf24", display: "block" }} />
              <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#4ade80", display: "block" }} />
            </div>
            <span style={{ fontSize: "11px", color: "#444", marginLeft: "14px" }}>guestpulse.com/dashboard</span>
          </div>

          {/* Dashboard content */}
          <div style={{ padding: "24px" }}>
            {/* Mini stat cards */}
            <div className="lp-mock-stats">
              {[
                { label: "AVG RATING", value: "4.8", delta: "+0.3 vs last month", deltaColor: "#4ade80" },
                { label: "REVIEWS THIS WEEK", value: "12", delta: "+4 vs last week", deltaColor: "#4ade80" },
                { label: "RESPONSE RATE", value: "94%", delta: "+7% vs last month", deltaColor: "#4ade80" },
                { label: "PENDING REPLIES", value: "3", delta: "2 urgent", deltaColor: "#f87171" },
              ].map((s) => (
                <div
                  key={s.label}
                  style={{
                    background: "#0a0a0a",
                    border: "1px solid #1e1e1e",
                    borderRadius: "6px",
                    padding: "14px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "9px",
                      fontWeight: 600,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "#555",
                      marginBottom: "6px",
                    }}
                  >
                    {s.label}
                  </div>
                  <div style={{ fontSize: "24px", fontWeight: 700, color: "#f0f0f0", lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: "11px", color: s.deltaColor, marginTop: "4px" }}>{s.delta}</div>
                </div>
              ))}
            </div>

            {/* Fake review card */}
            <div
              style={{
                background: "#0a0a0a",
                border: "1px solid #1e1e1e",
                borderLeft: "3px solid #f87171",
                borderRadius: "6px",
                padding: "14px",
                marginTop: "12px",
                display: "flex",
                flexWrap: "wrap",
                alignItems: "flex-start",
                gap: "10px",
                justifyContent: "space-between",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      letterSpacing: "0.04em",
                      padding: "2px 8px",
                      borderRadius: "100px",
                      background: "#1a2233",
                      border: "1px solid #1e2a3a",
                      color: "#60a5fa",
                    }}
                  >
                    GOOGLE
                  </span>
                  <span style={{ color: "#fbbf24", fontSize: "13px" }}>★★</span>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "#f0f0f0" }}>James K.</span>
                  <span style={{ fontSize: "11px", color: "#555" }}>· 2 hours ago</span>
                  <span
                    style={{
                      fontSize: "10px",
                      padding: "2px 8px",
                      borderRadius: "100px",
                      background: "#2a1e1e",
                      border: "1px solid #3a2a2a",
                      color: "#f87171",
                    }}
                  >
                    Negative
                  </span>
                  <span
                    style={{
                      fontSize: "10px",
                      padding: "2px 8px",
                      borderRadius: "100px",
                      background: "#1a2233",
                      border: "1px solid #1e2a3a",
                      color: "#60a5fa",
                    }}
                  >
                    noise
                  </span>
                </div>
                <p style={{ fontSize: "13px", color: "#888", lineHeight: 1.5, margin: 0 }}>
                  Very disappointed with our stay. The room was noisy all night due to construction next door. Not what we expected for the price...
                </p>
              </div>
              <button
                type="button"
                style={{ ...primaryBtn, padding: "6px 12px", fontSize: "11px", flexShrink: 0 }}
              >
                Draft AI response
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 9: COMPARISON TABLE ── */}
      <section
        className="lp-section"
        style={{ padding: "100px 48px", maxWidth: "960px", margin: "0 auto" }}
      >
        <p style={sectionLabel}>Why GuestPulse</p>
        <h2
          style={{
            fontSize: "clamp(28px, 3.5vw, 36px)",
            fontWeight: 700,
            color: "#f0f0f0",
            textAlign: "center",
            marginBottom: "48px",
          }}
        >
          Compare your options
        </h2>

        <div style={{ ...card, overflow: "hidden" }}>
          {/* Header row */}
          <div
            className="lp-table-row"
            style={{
              background: "#0a0a0a",
              borderBottom: "1px solid #1e1e1e",
              padding: "16px 20px",
            }}
          >
            {["Feature", "Manual", "Enterprise tool", "GuestPulse"].map((h, i) => (
              <div
                key={h}
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: i === 3 ? "#4ade80" : "#555",
                }}
              >
                {h}
              </div>
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
            <div
              key={row[0]}
              className="lp-table-row"
              style={{
                padding: "14px 20px",
                borderBottom: ri < 7 ? "1px solid #1e1e1e" : "none",
                alignItems: "center",
              }}
            >
              {row.map((cell, ci) => {
                let color = "#888";
                if (ci === 0) color = "#f0f0f0";
                else if (cell === "✓") color = "#4ade80";
                else if (cell === "✗") color = "#f87171";
                else if (cell === "~") color = "#fbbf24";
                return (
                  <div key={`${ri}-${ci}`} style={{ fontSize: "13px", color }}>
                    {cell}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </section>

      {/* ── SECTION 10: PRICING ── */}
      <section
        id="pricing"
        className="lp-section"
        style={{ padding: "100px 48px", maxWidth: "1100px", margin: "0 auto", textAlign: "center" }}
      >
        <p style={sectionLabel}>Pricing</p>
        <h2
          style={{
            fontSize: "clamp(28px, 3.5vw, 36px)",
            fontWeight: 700,
            color: "#f0f0f0",
          }}
        >
          Simple, transparent pricing
        </h2>
        <p style={{ fontSize: "16px", color: "#888", marginTop: "8px", marginBottom: "32px" }}>
          Start free for 7 days. No credit card required.
        </p>

        {/* Toggle */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "32px" }}>
          <div
            style={{
              background: "#111",
              border: "1px solid #1e1e1e",
              borderRadius: "100px",
              padding: "4px",
              display: "inline-flex",
              gap: "2px",
            }}
          >
            {(["monthly", "annual"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setBillingPeriod(p)}
                style={{
                  borderRadius: "100px",
                  padding: "8px 20px",
                  fontSize: "13px",
                  fontWeight: 500,
                  border: "none",
                  cursor: "pointer",
                  background: billingPeriod === p ? "#f0f0f0" : "transparent",
                  color: billingPeriod === p ? "#0d0d0d" : "#888",
                  fontFamily: "inherit",
                  transition: "background 0.15s, color 0.15s",
                }}
              >
                {p === "monthly" ? "Monthly" : "Annual · save 17%"}
              </button>
            ))}
          </div>
        </div>

        {/* Pricing cards */}
        <div className="lp-pricing-grid">
          {/* Starter */}
          <div style={{ ...card, padding: "32px 24px", textAlign: "left", position: "relative" }}>
            <div style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.1em", color: "#555", textTransform: "uppercase" }}>
              Starter
            </div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#f0f0f0", marginTop: "8px" }}>Essential</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginTop: "12px" }}>
              <span style={{ fontSize: "40px", fontWeight: 700, color: "#f0f0f0" }}>
                ${billingPeriod === "annual" ? annualPrice(99) : 99}
              </span>
              <span style={{ fontSize: "14px", color: "#555" }}>/mo</span>
            </div>
            {billingPeriod === "annual" && (
              <div style={{ fontSize: "11px", color: "#444", marginTop: "2px" }}>billed as $990/yr</div>
            )}
            <ul style={{ listStyle: "none", marginTop: "24px", display: "flex", flexDirection: "column", gap: "10px" }}>
              {["1 hotel, 3 platforms", "Unlimited review sync", "Sentiment scoring", "Email alerts", "10 AI drafts/month", "Email support"].map((f) => (
                <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "13px", color: "#888" }}>
                  <span style={{ color: "#4ade80", flexShrink: 0 }}>●</span>
                  {f}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={goSignup}
              style={{ ...secondaryBtn, width: "100%", padding: "12px", marginTop: "24px", textAlign: "center" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#1e1e1e"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              Start free trial
            </button>
          </div>

          {/* Professional (featured) */}
          <div
            style={{
              background: "#141414",
              border: "2px solid #4ade80",
              borderRadius: "8px",
              padding: "32px 24px",
              textAlign: "left",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "-14px",
                left: "50%",
                transform: "translateX(-50%)",
                background: "#4ade80",
                color: "#0d0d0d",
                padding: "4px 14px",
                borderRadius: "100px",
                fontSize: "11px",
                fontWeight: 700,
                whiteSpace: "nowrap",
              }}
            >
              most popular
            </div>
            <div style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.1em", color: "#555", textTransform: "uppercase" }}>
              Growth
            </div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#f0f0f0", marginTop: "8px" }}>Professional</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginTop: "12px" }}>
              <span style={{ fontSize: "40px", fontWeight: 700, color: "#f0f0f0" }}>
                ${billingPeriod === "annual" ? annualPrice(199) : 199}
              </span>
              <span style={{ fontSize: "14px", color: "#555" }}>/mo</span>
            </div>
            {billingPeriod === "annual" && (
              <div style={{ fontSize: "11px", color: "#444", marginTop: "2px" }}>billed as $1,990/yr</div>
            )}
            <ul style={{ listStyle: "none", marginTop: "24px", display: "flex", flexDirection: "column", gap: "10px" }}>
              {[
                "1 hotel, all 6 platforms",
                "Unlimited AI drafts",
                "Full sentiment dashboard",
                "Competitor benchmarking",
                "Weekly email digest",
                "Auto daily sync",
                "Priority support",
              ].map((f) => (
                <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "13px", color: "#4ade80" }}>
                  <span style={{ flexShrink: 0 }}>●</span>
                  {f}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={goSignup}
              style={{
                ...primaryBtn,
                width: "100%",
                padding: "12px",
                marginTop: "24px",
                textAlign: "center",
                background: "#4ade80",
                color: "#0d0d0d",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#22c55e"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#4ade80"; }}
            >
              Start free trial
            </button>
          </div>

          {/* Business */}
          <div style={{ ...card, padding: "32px 24px", textAlign: "left", position: "relative" }}>
            <div style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.1em", color: "#555", textTransform: "uppercase" }}>
              Business
            </div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#f0f0f0", marginTop: "8px" }}>Multi-property</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginTop: "12px" }}>
              <span style={{ fontSize: "40px", fontWeight: 700, color: "#f0f0f0" }}>
                ${billingPeriod === "annual" ? annualPrice(399) : 399}
              </span>
              <span style={{ fontSize: "14px", color: "#555" }}>/mo</span>
            </div>
            {billingPeriod === "annual" && (
              <div style={{ fontSize: "11px", color: "#444", marginTop: "2px" }}>billed as $3,990/yr</div>
            )}
            <ul style={{ listStyle: "none", marginTop: "24px", display: "flex", flexDirection: "column", gap: "10px" }}>
              {[
                "Up to 5 hotels",
                "Everything in Professional",
                "Portfolio dashboard",
                "Monthly PDF reports",
                "Response approval workflow",
                "Dedicated account manager",
                "Phone support",
              ].map((f) => (
                <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "13px", color: "#888" }}>
                  <span style={{ color: "#60a5fa", flexShrink: 0 }}>●</span>
                  {f}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={goSignup}
              style={{ ...secondaryBtn, width: "100%", padding: "12px", marginTop: "24px", textAlign: "center" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#1e1e1e"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              Start free trial
            </button>
          </div>
        </div>

        <p style={{ fontSize: "12px", color: "#555", marginTop: "24px" }}>
          All plans include 7-day free trial · Cancel anytime
        </p>
      </section>

      {/* ── SECTION 11: ROI CALCULATOR ── */}
      <section
        className="lp-section"
        style={{ padding: "80px 48px", maxWidth: "800px", margin: "0 auto" }}
      >
        <div
          style={{
            background: "#141414",
            border: "1px solid #1e1e1e",
            borderRadius: "12px",
            padding: "48px",
          }}
        >
          <p style={{ ...sectionLabel, textAlign: "center" }}>Return on Investment</p>
          <h2
            style={{
              fontSize: "28px",
              fontWeight: 700,
              color: "#f0f0f0",
              textAlign: "center",
              marginBottom: "8px",
            }}
          >
            GuestPulse pays for itself
          </h2>
          <p
            style={{
              fontSize: "15px",
              color: "#888",
              textAlign: "center",
              marginBottom: "32px",
              lineHeight: 1.6,
            }}
          >
            If you recover just 1 booking per month by responding faster to reviews, GuestPulse pays for itself 3x over.
          </p>

          <div className="lp-roi-cards">
            {[
              { value: "£240", label: "Average UK booking value", sub: "TripAdvisor data", color: "#f0f0f0" },
              { value: "$99", label: "GuestPulse Professional cost", sub: "per month", color: "#f0f0f0" },
              { value: "£141", label: "Net profit per saved booking", sub: "after plan cost", color: "#4ade80" },
            ].map((c) => (
              <div
                key={c.label}
                style={{
                  flex: 1,
                  background: "#0a0a0a",
                  border: "1px solid #1a1a1a",
                  borderRadius: "6px",
                  padding: "20px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "32px", fontWeight: 700, color: c.color, lineHeight: 1 }}>{c.value}</div>
                <div style={{ fontSize: "13px", color: "#888", marginTop: "8px", lineHeight: 1.4 }}>{c.label}</div>
                <div style={{ fontSize: "11px", color: "#444", marginTop: "4px" }}>{c.sub}</div>
              </div>
            ))}
          </div>

          <p style={{ fontSize: "13px", color: "#555", textAlign: "center", marginTop: "20px" }}>
            And most hotels recover 3–5 bookings per month from faster response times
          </p>
        </div>
      </section>

      {/* ── SECTION 12: BUILT BY HOTELIERS ── */}
      <section
        className="lp-section"
        style={{ padding: "100px 48px", maxWidth: "800px", margin: "0 auto", textAlign: "center" }}
      >
        <div style={{ ...card, padding: "32px" }}>
          <div style={{ fontSize: "18px", fontWeight: 600, color: "#f0f0f0", marginBottom: "12px" }}>
            ✦ Built by hoteliers, for hoteliers
          </div>
          <p style={{ fontSize: "15px", color: "#888", lineHeight: 1.7 }}>
            GuestPulse was built after managing hotel reviews for years. We know the frustration of logging into 6
            platforms, writing the same responses, and watching competitors get better reviews while you do the work
            manually. We built the tool we wished we had.
          </p>
        </div>
      </section>

      {/* ── SECTION 13: FAQ ── */}
      <section
        id="faq"
        className="lp-section"
        style={{ padding: "100px 48px", maxWidth: "760px", margin: "0 auto" }}
      >
        <p style={sectionLabel}>FAQ</p>
        <h2
          style={{
            fontSize: "clamp(28px, 3.5vw, 36px)",
            fontWeight: 700,
            color: "#f0f0f0",
            textAlign: "center",
            marginBottom: "40px",
          }}
        >
          Questions hoteliers ask
        </h2>

        {faqItems.map((item, i) => {
          const open = openFaq === i;
          return (
            <div
              key={item.q}
              style={{ borderBottom: "1px solid #1e1e1e", padding: "20px 0", cursor: "pointer" }}
              onClick={() => toggleFaq(i)}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "16px",
                }}
              >
                <span style={{ fontSize: "15px", fontWeight: 600, color: "#f0f0f0" }}>{item.q}</span>
                <span
                  style={{
                    fontSize: "18px",
                    color: "#555",
                    flexShrink: 0,
                    lineHeight: 1,
                    userSelect: "none",
                  }}
                >
                  {open ? "−" : "+"}
                </span>
              </div>
              {open && (
                <p style={{ fontSize: "14px", color: "#888", lineHeight: 1.7, marginTop: "12px" }}>
                  {item.a}
                </p>
              )}
            </div>
          );
        })}
      </section>

      {/* ── SECTION 14: FINAL CTA ── */}
      <section
        className="lp-section"
        style={{ padding: "100px 48px", maxWidth: "900px", margin: "0 auto", textAlign: "center" }}
      >
        <h2
          style={{
            fontSize: "clamp(32px, 4.5vw, 44px)",
            fontWeight: 700,
            color: "#f0f0f0",
            letterSpacing: "-1px",
            lineHeight: 1.15,
          }}
        >
          Start protecting your reputation today
        </h2>
        <p style={{ fontSize: "17px", color: "#888", marginTop: "16px", lineHeight: 1.6 }}>
          Join forward-thinking UK and Ireland boutique hotels using GuestPulse to never miss another review.
        </p>
        <button
          type="button"
          onClick={goSignup}
          style={{ ...primaryBtn, padding: "14px 28px", fontSize: "15px", fontWeight: 600, marginTop: "32px" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#e0e0e0"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "#f0f0f0"; }}
        >
          Start 7-day free trial →
        </button>
        <p style={{ fontSize: "13px", color: "#555", marginTop: "16px" }}>
          No credit card required · Set up in 5 minutes · Cancel anytime
        </p>
      </section>

      {/* ── SECTION 15: FOOTER ── */}
      <footer
        className="lp-section"
        style={{
          background: "#0a0a0a",
          borderTop: "1px solid #1a1a1a",
          padding: "48px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "14px", fontWeight: 700, color: "#888" }}>GuestPulse</div>
        <div style={{ fontSize: "12px", color: "#444", marginTop: "4px" }}>
          Built for independent boutique hotels in the UK and Ireland
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: "20px", marginTop: "24px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => showToast("Coming soon")}
            style={{
              background: "none",
              border: "none",
              fontSize: "12px",
              color: "#555",
              cursor: "pointer",
              fontFamily: "inherit",
              padding: 0,
            }}
          >
            Privacy
          </button>
          <button
            type="button"
            onClick={() => showToast("Coming soon")}
            style={{
              background: "none",
              border: "none",
              fontSize: "12px",
              color: "#555",
              cursor: "pointer",
              fontFamily: "inherit",
              padding: 0,
            }}
          >
            Terms
          </button>
          <a href="mailto:hello@guestpulse.com" style={{ fontSize: "12px", color: "#555", textDecoration: "none" }}>
            Contact
          </a>
          <a href="#" style={{ fontSize: "12px", color: "#555", textDecoration: "none" }}>
            Twitter
          </a>
        </div>
        <div style={{ fontSize: "11px", color: "#333", marginTop: "20px" }}>
          © 2026 GuestPulse. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

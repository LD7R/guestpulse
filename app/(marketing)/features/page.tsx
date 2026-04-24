"use client";

import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";

const C = {
  bg: "#0f1117", bgAlt: "#0a0c12", bgCard: "#1a1d28", bgDeep: "#161821",
  border: "#242836", text: "#ffffff", textSec: "#9ca3af", textMuted: "#6b7280",
  green: "#4ade80", blue: "#60a5fa", purple: "#a78bfa", red: "#f87171", amber: "#fbbf24",
};

const card: CSSProperties = { background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, padding: "24px" };

const primaryBtn: CSSProperties = {
  background: C.green, color: "#0d0d0d", border: "none", borderRadius: 6,
  fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
};

const sectionLabel: CSSProperties = {
  fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase",
  color: C.textMuted, display: "block", marginBottom: 12,
};

const CATEGORIES = [
  {
    label: "Review Monitoring",
    color: C.blue,
    features: [
      { icon: "◈", title: "Multi-platform sync", desc: "Pull reviews automatically from TripAdvisor, Google, Booking.com, Trip.com, Expedia and Yelp every day. All 6 major platforms in one place." },
      { icon: "◷", title: "Automatic daily sync", desc: "Reviews are fetched fresh every day without you lifting a finger. Never miss a new review because you forgot to check." },
      { icon: "↗", title: "Direct review links", desc: "Every review includes a direct link to the original listing page so you can respond on the platform in seconds." },
      { icon: "◉", title: "Platform health tracking", desc: "See the status of each connected platform at a glance. Know immediately if any source stops syncing." },
    ],
  },
  {
    label: "AI Capabilities",
    color: C.green,
    features: [
      { icon: "✦", title: "Response drafting", desc: "AI generates a personalised, warm response for any review in 2 seconds — referencing specific guest details for a human feel." },
      { icon: "◎", title: "Sentiment analysis", desc: "Every review is automatically classified as positive, neutral or negative. No manual tagging required. 19 languages supported." },
      { icon: "◈", title: "Review translation", desc: "Translate any review to your preferred language with one click. Understand what guests are saying even in languages you don't speak." },
      { icon: "△", title: "Competitor discovery", desc: "AI automatically finds similar hotels in your area and adds them to your benchmarking dashboard. No manual searching needed." },
    ],
  },
  {
    label: "Analytics & Insights",
    color: C.purple,
    features: [
      { icon: "◎", title: "Rating distribution", desc: "See exactly how your reviews are distributed across 1–5 stars. Spot patterns in when and why lower ratings appear." },
      { icon: "◈", title: "Sentiment dashboard", desc: "Full breakdown of positive, neutral and negative reviews over time. Track improvement month-over-month as you respond faster." },
      { icon: "◷", title: "Complaint topic tracking", desc: "AI tags complaint topics like 'wifi', 'noise', 'breakfast' so you can see which operational issues come up most often." },
      { icon: "✦", title: "Response rate tracking", desc: "See your response rate over time. The industry average is 41% — track your improvement as you build the habit." },
      { icon: "△", title: "Month-over-month trends", desc: "Track average rating, review volume and response rate month by month. See the impact of your reputation management efforts." },
      { icon: "◉", title: "Language breakdown", desc: "See which languages your reviews come in. Understand the geographic mix of your guests without digging through each review." },
    ],
  },
  {
    label: "Team Productivity",
    color: C.amber,
    features: [
      { icon: "✉", title: "Weekly email digest", desc: "Every Monday morning: a summary of new reviews, rating changes, top complaint topics and urgent items. Start the week informed." },
      { icon: "!", title: "Urgent review alerts", desc: "Get an email the moment a 1 or 2 star review is posted. Respond within hours, not days — before the damage compounds." },
      { icon: "◎", title: "Custom response signature", desc: "Set your hotel's standard sign-off line so every AI draft ends with your personalised closing — consistent brand voice every time." },
      { icon: "◈", title: "Internal review notes", desc: "Add private notes to any review for your team. Pass context without sending emails. Keeps the full picture in one place." },
      { icon: "△", title: "Flag urgent reviews", desc: "Manually flag any review as urgent to surface it at the top of your inbox. Never let an important response slip through." },
    ],
  },
];

export default function FeaturesPage() {
  const router = useRouter();

  return (
    <main style={{ background: C.bg, fontFamily: "Inter, -apple-system, sans-serif" }}>
      <style dangerouslySetInnerHTML={{ __html: `
        * { box-sizing: border-box; }
        .fp { padding-left: 48px; padding-right: 48px; }
        .fp-grid3 { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; }
        .fp-grid2 { display: grid; grid-template-columns: repeat(2,1fr); gap: 16px; }
        @media (max-width: 768px) {
          .fp { padding-left: 24px !important; padding-right: 24px !important; }
          .fp-grid3 { grid-template-columns: 1fr !important; }
          .fp-grid2 { grid-template-columns: 1fr !important; }
        }
      `}} />

      {/* Hero */}
      <section className="fp" style={{ padding: "96px 48px 72px", maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
        <span style={sectionLabel}>Features</span>
        <h1 style={{ fontSize: "clamp(30px,5vw,48px)", fontWeight: 700, color: C.text, letterSpacing: "-1.5px", lineHeight: 1.1, marginBottom: 20 }}>
          Every feature built to save hoteliers time
        </h1>
        <p style={{ fontSize: 17, color: C.textSec, lineHeight: 1.7 }}>
          From automated review monitoring to AI response drafting, every feature in GuestPulse was designed to
          replace manual, repetitive work with intelligent automation.
        </p>
      </section>

      {/* Feature categories */}
      {CATEGORIES.map((cat) => (
        <section key={cat.label} className="fp" style={{ padding: "72px 48px", maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 36 }}>
            <div style={{ width: 4, height: 32, borderRadius: 2, background: cat.color }} />
            <h2 style={{ fontSize: 26, fontWeight: 700, color: C.text, letterSpacing: "-0.5px" }}>{cat.label}</h2>
          </div>
          <div className={cat.features.length > 4 ? "fp-grid3" : "fp-grid2"} style={cat.features.length > 4 ? {} : {}}>
            {cat.features.map((f) => (
              <div key={f.title} style={{ ...card }}>
                <div style={{ width: 36, height: 36, borderRadius: 6, background: `${cat.color}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: cat.color, marginBottom: 14 }}>
                  {f.icon}
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 8 }}>{f.title}</h3>
                <p style={{ fontSize: 14, color: C.textSec, lineHeight: 1.7 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>
      ))}

      {/* Comparison with manual */}
      <section className="fp" style={{ padding: "72px 48px", maxWidth: 900, margin: "0 auto" }}>
        <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, padding: "48px" }}>
          <span style={sectionLabel}>Time savings</span>
          <h2 style={{ fontSize: "clamp(24px,3vw,32px)", fontWeight: 700, color: C.text, letterSpacing: "-1px", marginBottom: 8, textAlign: "center" }}>
            Hours saved every week
          </h2>
          <p style={{ fontSize: 15, color: C.textSec, textAlign: "center", marginBottom: 36, lineHeight: 1.7 }}>
            Based on a 50-room boutique hotel with 40 reviews per week across 6 platforms.
          </p>
          <div className="fp-grid2">
            {[
              { task: "Checking 6 review platforms", manual: "45 min/day", withGP: "0 min", saving: "~5 hrs/week" },
              { task: "Writing review responses", manual: "8 min/review", withGP: "90 sec/review", saving: "~4 hrs/week" },
              { task: "Competitor monitoring", manual: "30 min/week", withGP: "Automatic", saving: "30 min/week" },
              { task: "Weekly reporting", manual: "2 hrs/week", withGP: "Automated email", saving: "2 hrs/week" },
            ].map((row) => (
              <div key={row.task} style={{ background: C.bgAlt, border: `1px solid ${C.border}`, borderRadius: 8, padding: "20px 24px" }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 12 }}>{row.task}</div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: C.textMuted }}>Without GuestPulse</span>
                  <span style={{ fontSize: 12, color: C.red }}>{row.manual}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{ fontSize: 12, color: C.textMuted }}>With GuestPulse</span>
                  <span style={{ fontSize: 12, color: C.green }}>{row.withGP}</span>
                </div>
                <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 8, display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.textSec }}>Saved</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.green }}>{row.saving}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="fp" style={{ padding: "96px 48px", maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
        <h2 style={{ fontSize: "clamp(28px,4vw,40px)", fontWeight: 700, color: C.text, letterSpacing: "-1.5px", lineHeight: 1.15 }}>
          Try every feature free for 7 days
        </h2>
        <p style={{ fontSize: 17, color: C.textSec, marginTop: 16, lineHeight: 1.7 }}>No credit card required. No setup fees. Cancel anytime.</p>
        <button type="button" onClick={() => router.push("/pricing")} style={{ ...primaryBtn, padding: "14px 28px", fontSize: 15, marginTop: 32 }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#22c55e"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = C.green; }}>
          Start 7-day free trial →
        </button>
      </section>
    </main>
  );
}

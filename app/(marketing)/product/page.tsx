"use client";

import { useRouter } from "next/navigation";
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

const sectionLabel: CSSProperties = {
  fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase",
  color: C.textMuted, display: "block", marginBottom: 12,
};

export default function ProductPage() {
  const router = useRouter();

  return (
    <main style={{ background: C.bg, fontFamily: "Inter, -apple-system, sans-serif" }}>
      <style dangerouslySetInnerHTML={{ __html: `
        * { box-sizing: border-box; }
        .pp { padding-left: 48px; padding-right: 48px; }
        .pp-pg4 { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; }
        .pp-split { display: grid; grid-template-columns: 1fr 1fr; gap: 64px; align-items: center; }
        .pp-split-r { display: grid; grid-template-columns: 1fr 1fr; gap: 64px; align-items: center; direction: rtl; }
        .pp-split > *, .pp-split-r > * { direction: ltr; }
        @media (max-width: 768px) {
          .pp { padding-left: 24px !important; padding-right: 24px !important; }
          .pp-pg4 { grid-template-columns: repeat(2,1fr) !important; }
          .pp-split, .pp-split-r { grid-template-columns: 1fr !important; direction: ltr !important; }
        }
      `}} />

      {/* Hero */}
      <section className="pp" style={{ padding: "96px 48px 64px", maxWidth: 1100, margin: "0 auto", textAlign: "center" }}>
        <span style={sectionLabel}>Product Overview</span>
        <h1 style={{ fontSize: "clamp(32px,5vw,52px)", fontWeight: 700, color: C.text, letterSpacing: "-2px", lineHeight: 1.1, marginBottom: 20 }}>
          See GuestPulse in action
        </h1>
        <p style={{ fontSize: 17, color: C.textSec, maxWidth: 600, margin: "0 auto 32px", lineHeight: 1.7 }}>
          The complete review management platform built for modern boutique hotels. One dashboard, all your reviews, AI-powered responses.
        </p>
        <button type="button" onClick={() => router.push("/pricing")} style={{ ...primaryBtn, padding: "13px 26px", fontSize: 14 }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#22c55e"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = C.green; }}>
          Start 7-day free trial →
        </button>
      </section>

      {/* Large dashboard mockup */}
      <section className="pp" style={{ padding: "0 48px 96px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ ...card, borderRadius: 12, padding: 0, overflow: "hidden" }}>
          {/* Browser bar */}
          <div style={{ background: C.bgAlt, padding: "10px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", gap: 6 }}>
              {[C.red, C.amber, C.green].map((c) => <span key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c, display: "block" }} />)}
            </div>
            <span style={{ fontSize: 11, color: C.textFaint }}>guestpulse.com/dashboard/reviews</span>
          </div>

          <div style={{ padding: 28 }}>
            {/* Stat row */}
            <div className="pp-pg4" style={{ marginBottom: 24 }}>
              {[
                { label: "AVG RATING", val: "4.8", d: "+0.3 this month", dc: C.green },
                { label: "NEW REVIEWS", val: "24", d: "+8 this week", dc: C.green },
                { label: "RESPONSE RATE", val: "94%", d: "Industry avg 41%", dc: C.green },
                { label: "URGENT", val: "2", d: "Need reply today", dc: C.red },
              ].map((s) => (
                <div key={s.label} style={{ background: C.bgAlt, border: `1px solid ${C.border}`, borderRadius: 6, padding: 16 }}>
                  <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.textMuted, marginBottom: 8 }}>{s.label}</div>
                  <div style={{ fontSize: 26, fontWeight: 700, color: C.text, lineHeight: 1 }}>{s.val}</div>
                  <div style={{ fontSize: 11, color: s.dc, marginTop: 5 }}>{s.d}</div>
                </div>
              ))}
            </div>

            {/* Review cards */}
            {[
              { platform: "TRIPADVISOR", pc: C.green, pb: "#0d1f0d", pbr: "#1a3a1a", stars: "★★★★★", name: "Sarah M.", time: "3 hours ago", sentiment: "Positive", sc: C.green, sb: "#0d1f0d", sbr: "#1a3a1a", border: C.green, tag: null, text: "Absolutely stunning hotel. The staff were incredibly welcoming and the room was spotless. The breakfast was outstanding." },
              { platform: "GOOGLE", pc: C.blue, pb: "#0d1528", pbr: "#1a2d3a", stars: "★★", name: "James K.", time: "5 hours ago", sentiment: "Negative", sc: C.red, sb: "#1f0d0d", sbr: "#3a1a1a", border: C.red, tag: "noise", text: "Very disappointed with our stay. The room was noisy all night due to construction next door. Not what we expected." },
              { platform: "BOOKING.COM", pc: C.purple, pb: "#1a1228", pbr: "#2a1a3a", stars: "★★★★", name: "Maria L.", time: "1 day ago", sentiment: "Neutral", sc: C.textMuted, sb: C.bgCard, sbr: C.border, border: C.amber, tag: "wifi", text: "Great location and lovely decor. Only complaint is the WiFi kept dropping during our stay." },
            ].map((r) => (
              <div key={r.name} style={{ background: C.bgAlt, border: `1px solid ${C.border}`, borderLeft: `3px solid ${r.border}`, borderRadius: 6, padding: 16, marginBottom: 10, display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 100, background: r.pb, border: `1px solid ${r.pbr}`, color: r.pc }}>{r.platform}</span>
                    <span style={{ color: C.amber, fontSize: 13 }}>{r.stars}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{r.name}</span>
                    <span style={{ fontSize: 11, color: C.textMuted }}>· {r.time}</span>
                    <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 100, background: r.sb, border: `1px solid ${r.sbr}`, color: r.sc, fontWeight: 600 }}>{r.sentiment}</span>
                    {r.tag && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 100, background: C.bgCard, border: `1px solid ${C.border}`, color: C.textSec }}>{r.tag}</span>}
                  </div>
                  <p style={{ fontSize: 13, color: C.textSec, lineHeight: 1.5 }}>{r.text}</p>
                </div>
                <button type="button" style={{ ...primaryBtn, padding: "7px 14px", fontSize: 12, flexShrink: 0 }}>
                  ✦ Draft response
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature blocks — alternating */}
      {[
        {
          label: "Review Inbox",
          title: "All your reviews, one inbox",
          desc: "Stop logging into 6 different dashboards every morning. GuestPulse pulls every review from every major platform automatically — daily, without any manual work.",
          bullets: ["TripAdvisor", "Google", "Booking.com", "Trip.com", "Expedia", "Yelp"],
          bulletColor: C.green,
          reverse: false,
          mockup: (
            <div style={{ ...card, padding: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: C.textMuted, marginBottom: 14 }}>Review Inbox</div>
              {[
                { p: "TRIPADVISOR", pc: C.green, pb: "#0d1f0d", pbr: "#1a3a1a", s: "★★★★★", n: "Sarah M.", t: "Positive" },
                { p: "GOOGLE", pc: C.blue, pb: "#0d1528", pbr: "#1a2d3a", s: "★★", n: "James K.", t: "Negative" },
                { p: "BOOKING", pc: C.purple, pb: "#1a1228", pbr: "#2a1a3a", s: "★★★★", n: "Maria L.", t: "Neutral" },
                { p: "EXPEDIA", pc: C.amber, pb: "#1f150a", pbr: "#3a2014", s: "★★★★★", n: "Tom B.", t: "Positive" },
              ].map((r) => (
                <div key={r.n} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 100, background: r.pb, border: `1px solid ${r.pbr}`, color: r.pc, whiteSpace: "nowrap" }}>{r.p}</span>
                  <span style={{ fontSize: 12, color: C.amber }}>{r.s}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.text, flex: 1 }}>{r.n}</span>
                  <span style={{ fontSize: 11, color: r.t === "Negative" ? C.red : r.t === "Positive" ? C.green : C.textMuted }}>{r.t}</span>
                </div>
              ))}
            </div>
          ),
        },
        {
          label: "AI Responses",
          title: 'AI that writes like your best manager',
          desc: "Click Draft Response on any review. Our AI reads the full review, references the guest's specific experience, and writes a warm professional response in 2 seconds.",
          bullets: ["References specific guest details", "Matches your hotel's tone", "Custom signature line", "Edit before you copy"],
          bulletColor: C.green,
          reverse: true,
          mockup: (
            <div style={{ ...card, padding: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: C.textMuted, marginBottom: 14 }}>AI Generated Response</div>
              <div style={{ background: C.bgAlt, border: `1px solid ${C.border}`, borderRadius: 6, padding: 14, fontSize: 13, color: C.textSec, lineHeight: 1.7 }}>
                Dear James, thank you for taking the time to share your experience with us. We sincerely
                apologise for the noise disruption you experienced during your stay — this is absolutely
                not the standard we hold ourselves to. We have addressed this with our team immediately
                and are working to prevent any future disturbances. We truly hope to welcome you back
                and give you the stay you deserved.
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button type="button" style={{ ...primaryBtn, padding: "7px 14px", fontSize: 12 }}>Copy response</button>
                <button type="button" style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 6, color: C.textSec, padding: "7px 14px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Regenerate</button>
              </div>
            </div>
          ),
        },
        {
          label: "Sentiment Analysis",
          title: "Spot trends before they hurt your rating",
          desc: "Every review is automatically classified and tagged. See complaint patterns emerging weeks before they dent your average score.",
          bullets: ["Positive / Neutral / Negative classification", "19 languages supported", "Complaint topic tagging", "Month-over-month trend view"],
          bulletColor: C.purple,
          reverse: false,
          mockup: (
            <div style={{ ...card, padding: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: C.textMuted, marginBottom: 14 }}>Sentiment Overview</div>
              <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                {[{ label: "Positive", val: "68%", c: C.green }, { label: "Neutral", val: "21%", c: C.textMuted }, { label: "Negative", val: "11%", c: C.red }].map((s) => (
                  <div key={s.label} style={{ flex: 1, background: C.bgAlt, border: `1px solid ${C.border}`, borderRadius: 6, padding: "12px 10px", textAlign: "center" }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: s.c }}>{s.val}</div>
                    <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, marginBottom: 8 }}>TOP COMPLAINT TOPICS</div>
              {[{ t: "wifi", n: 8 }, { t: "noise", n: 6 }, { t: "breakfast", n: 4 }, { t: "parking", n: 3 }].map((tag) => (
                <div key={tag.t} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: C.textSec, width: 70 }}>{tag.t}</span>
                  <div style={{ flex: 1, height: 4, background: C.bgAlt, borderRadius: 2 }}>
                    <div style={{ width: `${tag.n * 10}%`, height: "100%", background: C.purple, borderRadius: 2 }} />
                  </div>
                  <span style={{ fontSize: 11, color: C.textMuted, width: 20, textAlign: "right" }}>{tag.n}</span>
                </div>
              ))}
            </div>
          ),
        },
        {
          label: "Competitor Benchmarking",
          title: "Know exactly where you stand",
          desc: "Our AI automatically finds similar hotels in your area and benchmarks your performance. See how your rating, review volume, and response rate compares to local competition.",
          bullets: ["AI-powered competitor discovery", "Side-by-side rating comparison", "Response rate benchmarking", "Complaint topic comparison"],
          bulletColor: C.amber,
          reverse: true,
          mockup: (
            <div style={{ ...card, padding: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: C.textMuted, marginBottom: 14 }}>Competitor Ranking</div>
              {[
                { name: "The Crown Hotel", rating: "4.8", reviews: 342, you: true },
                { name: "Harbour View Inn", rating: "4.6", reviews: 289, you: false },
                { name: "The Pemberton", rating: "4.5", reviews: 198, you: false },
                { name: "Cliffside Rooms", rating: "4.3", reviews: 156, you: false },
              ].map((h, i) => (
                <div key={h.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: i < 3 ? `1px solid ${C.border}` : "none" }}>
                  <span style={{ fontSize: 11, color: C.textMuted, width: 16, flexShrink: 0 }}>#{i + 1}</span>
                  <span style={{ flex: 1, fontSize: 13, color: h.you ? C.green : C.text, fontWeight: h.you ? 600 : 400 }}>{h.name}{h.you ? " (you)" : ""}</span>
                  <span style={{ fontSize: 13, color: C.amber, fontWeight: 600 }}>{h.rating}</span>
                  <span style={{ fontSize: 11, color: C.textMuted }}>{h.reviews} reviews</span>
                </div>
              ))}
            </div>
          ),
        },
      ].map((block) => (
        <section key={block.title} className="pp" style={{ padding: "80px 48px", maxWidth: 1100, margin: "0 auto" }}>
          <div className={block.reverse ? "pp-split-r" : "pp-split"}>
            <div>
              <span style={sectionLabel}>{block.label}</span>
              <h2 style={{ fontSize: "clamp(24px,3vw,32px)", fontWeight: 700, color: C.text, letterSpacing: "-0.8px", lineHeight: 1.2, marginBottom: 16 }}>{block.title}</h2>
              <p style={{ fontSize: 16, color: C.textSec, lineHeight: 1.7, marginBottom: 24 }}>{block.desc}</p>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
                {block.bullets.map((b) => (
                  <li key={b} style={{ display: "flex", gap: 10, fontSize: 14, color: C.textSec, alignItems: "flex-start" }}>
                    <span style={{ color: block.bulletColor, flexShrink: 0, marginTop: 2 }}>●</span>{b}
                  </li>
                ))}
              </ul>
            </div>
            <div>{block.mockup}</div>
          </div>
        </section>
      ))}

      {/* Integrations */}
      <section style={{ background: C.bgAlt, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, padding: "56px 48px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", textAlign: "center" }}>
          <p style={{ fontSize: 11, letterSpacing: "0.15em", color: C.textFaint, textTransform: "uppercase", marginBottom: 24 }}>Supported platforms</p>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 16 }}>
            {[
              { name: "Tripadvisor", c: C.green, status: "Supported" },
              { name: "Google", c: C.blue, status: "Supported" },
              { name: "Booking.com", c: C.purple, status: "Supported" },
              { name: "Trip.com", c: C.blue, status: "Supported" },
              { name: "Expedia", c: C.purple, status: "Supported" },
              { name: "Yelp", c: C.red, status: "Supported" },
            ].map((p) => (
              <div key={p.name} style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, padding: "16px 24px", minWidth: 140, textAlign: "center" }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: p.c }}>{p.name}</div>
                <div style={{ fontSize: 11, color: C.green, marginTop: 6 }}>✓ {p.status}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="pp" style={{ padding: "96px 48px", maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
        <h2 style={{ fontSize: "clamp(28px,4vw,40px)", fontWeight: 700, color: C.text, letterSpacing: "-1.5px", lineHeight: 1.15 }}>
          Ready to take control of your reputation?
        </h2>
        <p style={{ fontSize: 17, color: C.textSec, marginTop: 16, lineHeight: 1.7 }}>
          Start your free trial today. No credit card required. Set up in under 5 minutes.
        </p>
        <button type="button" onClick={() => router.push("/pricing")} style={{ ...primaryBtn, padding: "14px 28px", fontSize: 15, marginTop: 32 }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#22c55e"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = C.green; }}>
          Start 7-day free trial →
        </button>
      </section>
    </main>
  );
}

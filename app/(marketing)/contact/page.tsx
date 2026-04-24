"use client";

import { useState } from "react";
import type { CSSProperties } from "react";

const C = {
  bg: "#0f1117", bgAlt: "#0a0c12", bgCard: "#1a1d28", bgDeep: "#161821",
  border: "#242836", borderMid: "#2a2f3e", text: "#ffffff", textSec: "#9ca3af",
  textMuted: "#6b7280", green: "#4ade80", blue: "#60a5fa", amber: "#fbbf24",
};

const card: CSSProperties = { background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8 };

const primaryBtn: CSSProperties = {
  background: C.green, color: "#0d0d0d", border: "none", borderRadius: 6,
  fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
};

const inputStyle: CSSProperties = {
  width: "100%",
  background: C.bgDeep,
  border: `1px solid ${C.border}`,
  borderRadius: 6,
  padding: "10px 14px",
  fontSize: 14,
  color: C.text,
  outline: "none",
  fontFamily: "inherit",
};

const sectionLabel: CSSProperties = {
  fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase",
  color: C.textMuted, display: "block", marginBottom: 12,
};

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", hotel: "", message: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setStatus("sent");
        setForm({ name: "", email: "", hotel: "", message: "" });
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <main style={{ background: C.bg, fontFamily: "Inter, -apple-system, sans-serif" }}>
      <style dangerouslySetInnerHTML={{ __html: `
        * { box-sizing: border-box; }
        .cp { padding-left: 48px; padding-right: 48px; }
        .cp-pg3 { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; }
        .cp-split { display: grid; grid-template-columns: 1fr 1.4fr; gap: 48px; }
        @media (max-width: 768px) {
          .cp { padding-left: 24px !important; padding-right: 24px !important; }
          .cp-pg3 { grid-template-columns: 1fr !important; }
          .cp-split { grid-template-columns: 1fr !important; }
        }
      `}} />

      {/* Hero */}
      <section className="cp" style={{ padding: "96px 48px 56px", maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
        <span style={sectionLabel}>Contact</span>
        <h1 style={{ fontSize: "clamp(30px,5vw,48px)", fontWeight: 700, color: C.text, letterSpacing: "-1.5px", lineHeight: 1.1, marginBottom: 16 }}>
          Get in touch
        </h1>
        <p style={{ fontSize: 17, color: C.textSec, lineHeight: 1.7 }}>
          Questions? Want a demo? We&apos;re here to help.
        </p>
      </section>

      {/* Contact options */}
      <section className="cp" style={{ padding: "0 48px 72px", maxWidth: 1000, margin: "0 auto" }}>
        <div className="cp-pg3">
          {[
            {
              icon: "✉",
              ic: C.green,
              ib: "rgba(74,222,128,0.08)",
              title: "Email us",
              desc: "Send us a message and we'll reply within one business day.",
              action: "hello@guestpulse.com",
              href: "mailto:hello@guestpulse.com",
              linkLabel: "Send email →",
            },
            {
              icon: "◈",
              ic: C.blue,
              ib: "rgba(96,165,250,0.08)",
              title: "Book a demo",
              desc: "See GuestPulse in action. A 20-minute live walkthrough tailored to your hotel.",
              action: "Schedule a call",
              href: "#",
              linkLabel: "Book demo →",
            },
            {
              icon: "◎",
              ic: C.amber,
              ib: "rgba(251,191,36,0.08)",
              title: "Live chat",
              desc: "Chat with us in the app or on the website. Available Monday–Friday, 9–5 GMT.",
              action: "Mon–Fri, 9–5 GMT",
              href: "#",
              linkLabel: "Start chat →",
            },
          ].map((opt) => (
            <div key={opt.title} style={{ ...card, padding: "28px" }}>
              <div style={{ width: 40, height: 40, borderRadius: 8, background: opt.ib, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: opt.ic, marginBottom: 16 }}>
                {opt.icon}
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: C.text, marginBottom: 8 }}>{opt.title}</h3>
              <p style={{ fontSize: 14, color: C.textSec, lineHeight: 1.7, marginBottom: 16 }}>{opt.desc}</p>
              <a href={opt.href} style={{ fontSize: 13, color: opt.ic, textDecoration: "none", fontWeight: 500 }}>{opt.linkLabel}</a>
            </div>
          ))}
        </div>
      </section>

      {/* Form */}
      <section className="cp" style={{ padding: "0 48px 96px", maxWidth: 1000, margin: "0 auto" }}>
        <div className="cp-split">
          <div>
            <h2 style={{ fontSize: "clamp(22px,2.5vw,28px)", fontWeight: 700, color: C.text, letterSpacing: "-0.8px", marginBottom: 16 }}>
              Send us a message
            </h2>
            <p style={{ fontSize: 15, color: C.textSec, lineHeight: 1.7, marginBottom: 24 }}>
              Tell us about your hotel and what you need. We read every message and reply personally — usually within a few hours on weekdays.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                { label: "Location", text: "Amsterdam, Netherlands" },
                { label: "Email", text: "hello@guestpulse.com" },
                { label: "Response time", text: "Within 1 business day" },
              ].map((item) => (
                <div key={item.label} style={{ display: "flex", gap: 12 }}>
                  <span style={{ fontSize: 12, color: C.textMuted, width: 100, flexShrink: 0 }}>{item.label}</span>
                  <span style={{ fontSize: 13, color: C.textSec }}>{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ ...card, padding: "32px" }}>
            {status === "sent" ? (
              <div style={{ textAlign: "center", padding: "32px 0" }}>
                <div style={{ fontSize: 36, marginBottom: 16 }}>✓</div>
                <h3 style={{ fontSize: 18, fontWeight: 600, color: C.text, marginBottom: 8 }}>Message sent</h3>
                <p style={{ fontSize: 14, color: C.textSec }}>We&apos;ll get back to you within one business day.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: C.textMuted, marginBottom: 6 }}>Your name</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Jane Smith"
                    style={inputStyle}
                    onFocus={(e) => { e.currentTarget.style.borderColor = C.borderMid; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = C.border; }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: C.textMuted, marginBottom: 6 }}>Email address</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="jane@yourhotel.com"
                    style={inputStyle}
                    onFocus={(e) => { e.currentTarget.style.borderColor = C.borderMid; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = C.border; }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: C.textMuted, marginBottom: 6 }}>Hotel name <span style={{ color: C.textMuted }}>(optional)</span></label>
                  <input
                    type="text"
                    value={form.hotel}
                    onChange={(e) => setForm({ ...form, hotel: e.target.value })}
                    placeholder="The Crown Hotel"
                    style={inputStyle}
                    onFocus={(e) => { e.currentTarget.style.borderColor = C.borderMid; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = C.border; }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: C.textMuted, marginBottom: 6 }}>Message</label>
                  <textarea
                    required
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder="Tell us how we can help..."
                    rows={5}
                    style={{ ...inputStyle, resize: "vertical" as const }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = C.borderMid; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = C.border; }}
                  />
                </div>
                {status === "error" && (
                  <p style={{ fontSize: 13, color: "#f87171" }}>Something went wrong. Please try emailing us directly at hello@guestpulse.com</p>
                )}
                <button type="submit" disabled={status === "sending"} style={{ ...primaryBtn, padding: "12px", fontSize: 14, opacity: status === "sending" ? 0.7 : 1 }}
                  onMouseEnter={(e) => { if (status !== "sending") e.currentTarget.style.background = "#22c55e"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = C.green; }}>
                  {status === "sending" ? "Sending..." : "Send message →"}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

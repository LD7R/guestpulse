"use client";

import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";

const glassPrimary: CSSProperties = {
  background: "var(--text-primary)",
  border: "1px solid var(--border)",
  borderRadius: "6px",
  color: "var(--bg-primary)",
  fontWeight: 600,
  fontSize: "13px",
  cursor: "pointer",
  transition: "background 0.15s ease",
};

const glassSecondary: CSSProperties = {
  background: "transparent",
  border: "1px solid var(--border)",
  borderRadius: "6px",
  color: "var(--text-secondary)",
  fontWeight: 500,
  fontSize: "13px",
  cursor: "pointer",
  transition: "border-color 0.15s ease, color 0.15s ease",
};

const miniGlass: CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: "8px",
};

const faqItems: { q: string; a: string }[] = [
  {
    q: "How long does setup take?",
    a: "Under 5 minutes. Create an account, paste your hotel URLs from TripAdvisor, Google, and Booking.com, and your reviews start syncing immediately. No technical knowledge needed.",
  },
  {
    q: "Do I need to give you access to my review accounts?",
    a: "No. We never need your login credentials. We pull reviews directly from public listing pages — completely safe and secure.",
  },
  {
    q: "How does the AI response work?",
    a: "Click 'Draft Response' on any review. Our AI reads the review, your hotel name, and generates a warm professional response in 2-3 seconds. You edit it, copy it, and paste it directly on the platform.",
  },
  {
    q: "Will the AI responses sound robotic or generic?",
    a: "No. Each response references specific details the guest mentioned. You can also set your hotel's custom sign-off and response tone in Settings.",
  },
  {
    q: "What if I want to cancel?",
    a: "Cancel anytime with one click. No contracts, no cancellation fees. You keep access until the end of your billing period.",
  },
  {
    q: "Do you support languages other than English?",
    a: "Yes. Our AI can draft responses and translate reviews in 19 languages including Dutch, German, French, Spanish, Indonesian, and more.",
  },
  {
    q: "Is my hotel data private?",
    a: "Completely. Your data is encrypted, never shared with third parties, and never used to train AI models. We only store what's necessary to run the service.",
  },
  {
    q: "What platforms do you support?",
    a: "Currently TripAdvisor, Google Maps, and Booking.com. Expedia and Hotels.com are coming soon.",
  },
];

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

export default function LandingPage() {
  const router = useRouter();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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

  const goLogin = useCallback(() => {
    router.push("/login");
  }, [router]);

  const toggleFaq = useCallback((i: number) => {
    setOpenFaq((prev) => (prev === i ? null : i));
  }, []);

  const badgePill: CSSProperties = {
    display: "inline-block",
    background: "var(--accent-bg)",
    border: "1px solid var(--accent-border)",
    color: "var(--accent)",
    fontSize: "13px",
    padding: "6px 16px",
    borderRadius: "100px",
    fontWeight: 500,
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-primary)",
        color: "var(--text-primary)",
      }}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .landing-nav-stack {
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              z-index: 100;
            }
            .landing-announce {
              background: var(--bg-secondary);
              border-bottom: 1px solid var(--border);
              padding: 10px 48px;
              text-align: center;
              font-size: 13px;
              color: var(--text-secondary);
            }
            .landing-nav {
              position: relative;
              background: var(--bg-secondary);
              border-bottom: 1px solid var(--border);
              padding: 0 48px;
              height: 64px;
              display: flex;
              align-items: center;
              justify-content: space-between;
            }
            .landing-nav-right {
              display: flex;
              align-items: center;
              gap: 32px;
              margin-left: auto;
            }
            .landing-nav-scroll {
              display: flex;
              align-items: center;
              gap: 32px;
            }
            .landing-nav-actions {
              display: flex;
              align-items: center;
              gap: 12px;
            }
            .landing-nav-mobile-cta {
              display: none;
            }
            .landing-hero-h1 {
              font-size: clamp(44px, 6vw, 76px);
              letter-spacing: -2.5px;
              line-height: 1.05;
            }
            .landing-features-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 20px;
            }
            .landing-how-wrap {
              background: transparent;
              margin: 0;
              padding-left: 48px;
              padding-right: 48px;
            }
            .landing-problem-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 20px;
            }
            @media (max-width: 768px) {
              .landing-announce { padding: 10px 24px; font-size: 12px; }
              .landing-nav { padding: 0 24px; }
              .landing-nav-right { display: none !important; }
              .landing-nav-mobile-cta { display: inline-flex !important; align-items: center; justify-content: center; margin-left: auto; }
              .landing-hero-h1 { font-size: 36px !important; letter-spacing: -1px !important; }
              .landing-features-grid { grid-template-columns: 1fr !important; }
              .landing-section-pad { padding-left: 24px !important; padding-right: 24px !important; }
              .landing-how-wrap { margin: 0; padding-left: 24px; padding-right: 24px; }
              .landing-problem-grid { grid-template-columns: 1fr !important; }
            }
          `,
        }}
      />

      <div className="landing-nav-stack">
        <div className="landing-announce">
          ✦ Now available — AI-powered review responses for independent hotels ·{" "}
          <Link href="/login" style={{ color: "#a5b4fc", textDecoration: "none", fontWeight: 600 }}>
            Start free →
          </Link>
        </div>
        <nav className="landing-nav">
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "var(--accent)",
              boxShadow: "var(--accent-glow)",
            }}
          />
          <span style={{ fontSize: "18px", fontWeight: 700, color: "var(--logo-text)" }}>
            GuestPulse
          </span>
        </div>

        <div className="landing-nav-right">
          <div className="landing-nav-scroll">
            <button
              type="button"
              onClick={() => scrollToId("features")}
              style={{
                background: "none",
                border: "none",
                fontSize: "14px",
                color: "var(--text-secondary)",
                cursor: "pointer",
                padding: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--text-primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--text-secondary)";
              }}
            >
              Features
            </button>
            <button
              type="button"
              onClick={() => scrollToId("pricing")}
              style={{
                background: "none",
                border: "none",
                fontSize: "14px",
                color: "var(--text-secondary)",
                cursor: "pointer",
                padding: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--text-primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--text-secondary)";
              }}
            >
              Pricing
            </button>
            <button
              type="button"
              onClick={() => scrollToId("faq")}
              style={{
                background: "none",
                border: "none",
                fontSize: "14px",
                color: "var(--text-secondary)",
                cursor: "pointer",
                padding: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--text-primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--text-secondary)";
              }}
            >
              FAQ
            </button>
          </div>

          <div className="landing-nav-actions">
          <button
            type="button"
            onClick={goLogin}
            style={{
              ...glassSecondary,
              padding: "8px 20px",
              borderRadius: "12px",
              fontSize: "14px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--secondary-btn-hover)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--secondary-btn-bg)";
            }}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={goLogin}
            style={{
              ...glassPrimary,
              padding: "8px 20px",
              borderRadius: "12px",
              fontSize: "14px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--btn-primary-hover)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--btn-primary-bg)";
            }}
          >
            Start free trial
          </button>
          </div>
        </div>

        <button
          type="button"
          className="landing-nav-mobile-cta"
          onClick={goLogin}
          style={{
            ...glassPrimary,
            padding: "8px 18px",
            borderRadius: "12px",
            fontSize: "14px",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--btn-primary-hover)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--btn-primary-bg)";
          }}
        >
          Get started
        </button>
        </nav>
      </div>

      {/* HERO */}
      <section
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "160px 48px 100px",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
        className="landing-section-pad"
      >
        <div style={{ position: "relative", zIndex: 1, maxWidth: "900px" }}>
          <div style={{ ...badgePill, marginBottom: "24px" }}>✦ Trusted by independent hotels worldwide</div>

          <h1
            className="landing-hero-h1"
            style={{
              fontWeight: 800,
              color: "var(--text-primary)",
              marginBottom: "24px",
              maxWidth: "900px",
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            Every unanswered review
            <br />
            <span
              style={{
                background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              costs you a booking.
            </span>
          </h1>

          <p
            style={{
              fontSize: "18px",
              color: "var(--text-secondary)",
              maxWidth: "580px",
              lineHeight: 1.75,
              marginBottom: "40px",
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            Independent hotels lose bookings every day to negative reviews that go unanswered. GuestPulse monitors
            your reviews across TripAdvisor, Google, and Booking.com — and drafts professional AI responses in
            seconds.
          </p>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "16px",
              justifyContent: "center",
              marginBottom: "0",
            }}
          >
            <button
              type="button"
              onClick={goLogin}
              style={{
                ...glassPrimary,
                height: "52px",
                padding: "0 32px",
                fontSize: "16px",
                borderRadius: "14px",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--btn-primary-hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--btn-primary-bg)";
              }}
            >
              Start free trial — it&apos;s free
            </button>
            <button
              type="button"
              onClick={() => scrollToId("features")}
              style={{
                ...glassSecondary,
                height: "52px",
                padding: "0 32px",
                fontSize: "16px",
                borderRadius: "14px",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--secondary-btn-hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--secondary-btn-bg)";
              }}
            >
              See how it works
            </button>
          </div>

          <p
            style={{
              fontSize: "14px",
              color: "var(--text-muted)",
              textAlign: "center",
              marginTop: "24px",
              marginBottom: 0,
            }}
          >
            Built for independent boutique hotels
          </p>

          {/* Product mockup — review inbox */}
          <div
            style={{
              maxWidth: "960px",
              margin: "60px auto 0",
              width: "100%",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "24px",
              padding: 0,
              overflow: "hidden",
              boxShadow: "0 60px 120px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)",
              textAlign: "left",
            }}
          >
            <div
              style={{
                background: "rgba(255,255,255,0.03)",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                padding: "12px 20px",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#ff5f57", flexShrink: 0 }} />
              <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#ffbd2e", flexShrink: 0 }} />
              <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#28c840", flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginLeft: 16 }}>
                guestpulse.app/dashboard/reviews
              </span>
            </div>
            <div style={{ padding: "20px 20px 24px" }}>
              {/* Card 1 */}
              <div
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "14px",
                  padding: "14px 16px",
                  marginBottom: "10px",
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "flex-start",
                  gap: "10px",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        letterSpacing: "0.04em",
                        padding: "3px 8px",
                        borderRadius: "100px",
                        background: "rgba(52,211,153,0.15)",
                        border: "1px solid rgba(52,211,153,0.35)",
                        color: "#34d399",
                      }}
                    >
                      TRIPADVISOR
                    </span>
                    <span style={{ color: "#fbbf24", fontSize: "13px" }}>★★★★★</span>
                  </div>
                  <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "6px" }}>
                    <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>Sarah M.</span>
                    <span style={{ color: "var(--text-muted)" }}> · 2 days ago</span>
                    <span
                      style={{
                        marginLeft: 8,
                        fontSize: "11px",
                        fontWeight: 600,
                        padding: "2px 8px",
                        borderRadius: "100px",
                        background: "var(--success-bg)",
                        border: "1px solid var(--success-border)",
                        color: "var(--success)",
                      }}
                    >
                      Positive
                    </span>
                  </div>
                  <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.55, margin: 0 }}>
                    Absolutely stunning hotel. The staff were incredibly welcoming and the room was spotless...
                  </p>
                </div>
                <button
                  type="button"
                  style={{
                    ...glassPrimary,
                    padding: "6px 12px",
                    fontSize: "12px",
                    borderRadius: "10px",
                    flexShrink: 0,
                  }}
                >
                  ✦ Draft AI Response
                </button>
              </div>

              {/* Card 2 + AI panel */}
              <div
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "14px",
                  padding: "14px 16px",
                  marginBottom: 0,
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "flex-start",
                  gap: "10px",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        letterSpacing: "0.04em",
                        padding: "3px 8px",
                        borderRadius: "100px",
                        background: "rgba(96,165,250,0.15)",
                        border: "1px solid rgba(96,165,250,0.35)",
                        color: "#60a5fa",
                      }}
                    >
                      GOOGLE
                    </span>
                    <span style={{ color: "#fbbf24", fontSize: "13px" }}>★★</span>
                  </div>
                  <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "6px" }}>
                    <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>James K.</span>
                    <span style={{ color: "var(--text-muted)" }}> · 5 days ago</span>
                    <span
                      style={{
                        marginLeft: 8,
                        fontSize: "11px",
                        fontWeight: 600,
                        padding: "2px 8px",
                        borderRadius: "100px",
                        background: "var(--error-bg)",
                        border: "1px solid var(--error-border)",
                        color: "var(--error)",
                      }}
                    >
                      Negative
                    </span>
                    <span
                      style={{
                        marginLeft: 6,
                        fontSize: "11px",
                        padding: "2px 8px",
                        borderRadius: "100px",
                        background: "rgba(251,146,60,0.12)",
                        border: "1px solid rgba(251,146,60,0.35)",
                        color: "#fb923c",
                      }}
                    >
                      noise
                    </span>
                  </div>
                  <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.55, margin: 0 }}>
                    Very disappointed with our stay. The room was noisy all night due to construction...
                  </p>
                </div>
                <button
                  type="button"
                  style={{
                    ...glassPrimary,
                    padding: "6px 12px",
                    fontSize: "12px",
                    borderRadius: "10px",
                    flexShrink: 0,
                  }}
                >
                  ✦ Draft AI Response
                </button>
              </div>
              <div
                style={{
                  background: "rgba(99,102,241,0.06)",
                  border: "1px solid rgba(99,102,241,0.2)",
                  borderRadius: "12px",
                  padding: "16px",
                  marginTop: "-4px",
                  marginBottom: "10px",
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    color: "rgba(99,102,241,0.8)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginBottom: "8px",
                  }}
                >
                  AI Generated Response
                </div>
                <div
                  style={{
                    fontSize: "13px",
                    color: "var(--text-secondary)",
                    lineHeight: 1.6,
                    padding: "12px 14px",
                    borderRadius: "10px",
                    background: "rgba(0,0,0,0.15)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  Dear James, thank you for taking the time to share your experience. We sincerely apologize for the
                  noise disruption during your stay. This is not the standard we hold ourselves to, and we have
                  addressed this with our team immediately...
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "12px" }}>
                  <button
                    type="button"
                    style={{
                      ...glassSecondary,
                      padding: "6px 14px",
                      fontSize: "12px",
                      borderRadius: "10px",
                    }}
                  >
                    Copy
                  </button>
                  <button
                    type="button"
                    style={{
                      ...glassSecondary,
                      padding: "6px 14px",
                      fontSize: "12px",
                      borderRadius: "10px",
                    }}
                  >
                    Mark as responded
                  </button>
                </div>
              </div>

              {/* Card 3 */}
              <div
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "14px",
                  padding: "14px 16px",
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "flex-start",
                  gap: "10px",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        letterSpacing: "0.04em",
                        padding: "3px 8px",
                        borderRadius: "100px",
                        background: "rgba(167,139,250,0.15)",
                        border: "1px solid rgba(167,139,250,0.35)",
                        color: "#a78bfa",
                      }}
                    >
                      BOOKING
                    </span>
                    <span style={{ color: "#fbbf24", fontSize: "13px" }}>★★★★</span>
                  </div>
                  <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "6px" }}>
                    <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>Maria L.</span>
                    <span style={{ color: "var(--text-muted)" }}> · 1 week ago</span>
                    <span
                      style={{
                        marginLeft: 8,
                        fontSize: "11px",
                        fontWeight: 600,
                        padding: "2px 8px",
                        borderRadius: "100px",
                        background: "var(--neutral-sentiment-bg)",
                        border: "1px solid var(--neutral-sentiment-border)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      Neutral
                    </span>
                    <span
                      style={{
                        marginLeft: 6,
                        fontSize: "11px",
                        padding: "2px 8px",
                        borderRadius: "100px",
                        background: "rgba(96,165,250,0.12)",
                        border: "1px solid rgba(96,165,250,0.35)",
                        color: "#60a5fa",
                      }}
                    >
                      wifi
                    </span>
                  </div>
                  <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.55, margin: 0 }}>
                    Great location and lovely decor. Only complaint is the WiFi kept dropping...
                  </p>
                </div>
                <button
                  type="button"
                  style={{
                    ...glassPrimary,
                    padding: "6px 12px",
                    fontSize: "12px",
                    borderRadius: "10px",
                    flexShrink: 0,
                  }}
                >
                  ✦ Draft AI Response
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* THE PROBLEM */}
      <section
        id="problem"
        className="landing-section-pad"
        style={{
          padding: "140px 48px",
          maxWidth: "1100px",
          margin: "0 auto",
          textAlign: "center",
        }}
      >
        <h2
          style={{
            fontSize: "clamp(28px, 4vw, 40px)",
            fontWeight: 800,
            color: "var(--text-primary)",
            margin: "0 0 12px",
            lineHeight: 1.2,
            letterSpacing: "-0.5px",
          }}
        >
          The reviews problem no one talks about
        </h2>
        <p
          style={{
            fontSize: "16px",
            color: "var(--text-secondary)",
            maxWidth: "560px",
            margin: "0 auto 48px",
            lineHeight: 1.65,
          }}
        >
          Most hotel owners find out about bad reviews days after they&apos;re posted — when the damage is done.
        </p>
        <div
          className="landing-problem-grid"
          style={{
            maxWidth: "960px",
            margin: "0 auto",
          }}
        >
          {[
            {
              n: "78%",
              c: "#ef4444",
              l: "of travellers read reviews before booking",
              s: "— TripAdvisor Research",
            },
            {
              n: "53%",
              c: "#f59e0b",
              l: "of guests expect a response within 3 days",
              s: "— Booking.com Survey",
            },
            {
              n: "1 star",
              c: "#ef4444",
              l: "drop in rating = 9% fewer bookings",
              s: "— Harvard Business Review",
            },
          ].map((card) => (
            <div
              key={card.l}
              style={{
                ...miniGlass,
                padding: "28px 20px",
                borderRadius: "20px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "40px", fontWeight: 800, color: card.c, lineHeight: 1.1 }}>{card.n}</div>
              <p style={{ fontSize: "14px", color: "var(--text-secondary)", margin: "12px 0 8px", lineHeight: 1.5 }}>
                {card.l}
              </p>
              <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: 0 }}>{card.s}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section
        id="features"
        style={{
          width: "100%",
          background: "rgba(255,255,255,0.015)",
          borderTop: "1px solid rgba(255,255,255,0.05)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div
          className="landing-section-pad"
          style={{ padding: "140px 48px", maxWidth: "1200px", margin: "0 auto" }}
        >
        <div style={{ textAlign: "center" }}>
          <span style={{ ...badgePill }}>FEATURES</span>
          <h2
            style={{
              fontSize: "40px",
              fontWeight: 700,
              textAlign: "center",
              maxWidth: "600px",
              margin: "16px auto 64px",
              lineHeight: 1.2,
              color: "var(--text-primary)",
            }}
          >
            Everything you need to protect your reputation
          </h2>
        </div>

        <div className="landing-features-grid">
          {[
            {
              icon: "◈",
              iconBox: { bg: "var(--accent-bg)", bd: "var(--accent-border)", c: "var(--accent)" },
              title: "All reviews in one place",
              desc: "Pull reviews automatically from TripAdvisor, Google Maps, and Booking.com every day.",
            },
            {
              icon: "✦",
              iconBox: { bg: "var(--accent-bg)", bd: "var(--accent-border)", c: "var(--accent)" },
              title: "AI-powered responses",
              desc: "Generate professional, personalized responses in seconds. Edit and copy with one click.",
            },
            {
              icon: "◎",
              iconBox: { bg: "rgba(139,92,246,0.15)", bd: "rgba(139,92,246,0.25)", c: "#a78bfa" },
              title: "Smart sentiment analysis",
              desc: "Automatically classify reviews as positive, neutral, or negative. Spot trends before they hurt your ranking.",
            },
            {
              icon: "⟁",
              iconBox: { bg: "rgba(245,158,11,0.12)", bd: "rgba(245,158,11,0.25)", c: "var(--warning)" },
              title: "Competitor benchmarking",
              desc: "See how your rating compares to the top 5 hotels in your area. Know exactly where you're winning and losing.",
            },
            {
              icon: "◉",
              iconBox: { bg: "var(--error-bg)", bd: "var(--error-border)", c: "var(--error)" },
              title: "Urgent review alerts",
              desc: "Get instantly notified when a 1 or 2 star review comes in. Respond within hours, not days.",
            },
            {
              icon: "◷",
              iconBox: { bg: "var(--success-bg)", bd: "var(--success-border)", c: "var(--success)" },
              title: "Weekly email digest",
              desc: "Every Monday morning: new reviews, rating changes, and one actionable improvement tip.",
            },
          ].map((f) => (
            <div
              key={f.title}
              style={{
                ...miniGlass,
                padding: "28px",
                borderRadius: "20px",
                transition: "transform 0.3s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "14px",
                  background: f.iconBox.bg,
                  border: `1px solid ${f.iconBox.bd}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "22px",
                  color: f.iconBox.c,
                  marginBottom: "16px",
                }}
              >
                {f.icon}
              </div>
              <h3 style={{ fontSize: "17px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "8px" }}>
                {f.title}
              </h3>
              <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <div className="landing-how-wrap" style={{ padding: "140px 48px", maxWidth: "1100px", margin: "0 auto" }}>
        <h2
          style={{
            fontSize: "32px",
            fontWeight: 700,
            textAlign: "center",
            marginBottom: "48px",
            color: "var(--text-primary)",
          }}
        >
          Up and running in minutes
        </h2>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            maxWidth: "960px",
            margin: "0 auto",
            gap: "0",
          }}
        >
          {[
            {
              n: "1",
              t: "Connect your hotel",
              d: "Add your TripAdvisor, Google, and Booking.com URLs",
            },
            {
              n: "2",
              t: "Sync your reviews",
              d: "GuestPulse pulls all your reviews automatically",
            },
            {
              n: "3",
              t: "Respond with AI",
              d: "Draft perfect responses in seconds and protect your rating",
            },
          ].map((step, i) => (
            <Fragment key={step.n}>
              <div style={{ flex: "1 1 0", minWidth: "160px", textAlign: "center", padding: "0 8px" }}>
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    margin: "0 auto 16px",
                    background: "var(--accent-bg)",
                    border: "1px solid var(--accent-border)",
                    color: "var(--accent)",
                    fontWeight: 700,
                    fontSize: "18px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {step.n}
                </div>
                <h3 style={{ fontSize: "17px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "8px" }}>
                  {step.t}
                </h3>
                <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>{step.d}</p>
              </div>
              {i < 2 ? (
                <div
                  style={{
                    flex: "0 1 60px",
                    alignSelf: "center",
                    marginTop: "20px",
                    borderTop: "2px dashed var(--divider)",
                    minWidth: "24px",
                  }}
                  aria-hidden
                />
              ) : null}
            </Fragment>
          ))}
        </div>
      </div>

      {/* PRICING */}
      <section
        id="pricing"
        style={{
          width: "100%",
          background: "rgba(255,255,255,0.015)",
          borderTop: "1px solid rgba(255,255,255,0.05)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div
          className="landing-section-pad"
          style={{ padding: "140px 48px", maxWidth: "500px", margin: "0 auto", textAlign: "center" }}
        >
        <span style={{ ...badgePill }}>PRICING</span>
        <h2
          style={{
            fontSize: "36px",
            fontWeight: 700,
            color: "var(--text-primary)",
            margin: "16px 0 12px",
          }}
        >
          Simple pricing
        </h2>
        <p style={{ fontSize: "16px", color: "var(--text-secondary)", marginBottom: "32px" }}>
          One plan. Everything included. Cancel anytime.
        </p>

        <div
          style={{
            ...miniGlass,
            border: "1px solid var(--accent-border)",
            boxShadow: "0 0 60px rgba(99,102,241,0.1)",
            padding: "48px 40px",
            borderRadius: "24px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              display: "inline-block",
              marginBottom: "20px",
              padding: "6px 14px",
              borderRadius: "100px",
              fontSize: "13px",
              fontWeight: 600,
              background: "rgba(245,158,11,0.15)",
              color: "#f59e0b",
              border: "1px solid rgba(245,158,11,0.25)",
            }}
          >
            Founding Member Price
          </div>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: "6px" }}>
            <span style={{ fontSize: "64px", fontWeight: 800, color: "var(--text-primary)" }}>$99</span>
            <span style={{ fontSize: "18px", color: "var(--text-muted)" }}>/month</span>
          </div>
          <p style={{ fontSize: "12px", color: "rgba(245,158,11,0.7)", marginTop: "4px" }}>
            Lock in $99/mo before we raise prices
          </p>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "8px" }}>
            Billed monthly · Cancel anytime
          </p>
          <div
            style={{
              display: "inline-block",
              marginTop: "16px",
              padding: "6px 14px",
              borderRadius: "100px",
              background: "var(--message-success-bg)",
              border: "1px solid var(--message-success-border)",
              color: "var(--success)",
              fontSize: "13px",
              fontWeight: 600,
            }}
          >
            7-day free trial included
          </div>

          <ul
            style={{
              textAlign: "left",
              margin: "28px 0 0",
              padding: 0,
              listStyle: "none",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {[
              "Unlimited review syncing",
              "TripAdvisor, Google & Booking.com",
              "AI response drafting",
              "Sentiment dashboard & analytics",
              "Smart sentiment analysis & trends",
              "Urgent review alerts (1-2 star)",
              "Priority customer support",
            ].map((line) => (
              <li key={line} style={{ display: "flex", alignItems: "flex-start", gap: "12px", fontSize: "14px", color: "var(--text-secondary)" }}>
                <span
                  style={{
                    flexShrink: 0,
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    background: "var(--accent-bg)",
                    border: "1px solid var(--accent-border)",
                    color: "var(--accent)",
                    fontSize: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  ✓
                </span>
                {line}
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={goLogin}
            style={{
              ...glassPrimary,
              width: "100%",
              height: "56px",
              fontSize: "17px",
              borderRadius: "14px",
              marginTop: "32px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--btn-primary-hover)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--btn-primary-bg)";
            }}
          >
            Start your free trial
          </button>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "12px" }}>No credit card required</p>
        </div>
        </div>
      </section>

      {/* FAQ */}
      <section
        id="faq"
        className="landing-section-pad"
        style={{ padding: "140px 48px", maxWidth: "720px", margin: "0 auto" }}
      >
        <h2
          style={{
            fontSize: "36px",
            fontWeight: 700,
            textAlign: "center",
            marginBottom: "48px",
            color: "var(--text-primary)",
          }}
        >
          Frequently asked questions
        </h2>
        {faqItems.map((item, i) => {
          const open = openFaq === i;
          return (
            <button
              key={item.q}
              type="button"
              onClick={() => toggleFaq(i)}
              style={{
                ...miniGlass,
                width: "100%",
                padding: "20px 24px",
                borderRadius: "16px",
                marginBottom: "12px",
                cursor: "pointer",
                textAlign: "left",
                display: "block",
                background: "var(--glass-bg)",
              }}
            >
              <div style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", paddingRight: "24px" }}>
                {item.q}
              </div>
              <div
                style={{
                  maxHeight: open ? "480px" : "0",
                  opacity: open ? 1 : 0,
                  overflow: "hidden",
                  transition: "max-height 0.35s ease, opacity 0.25s ease",
                  marginTop: open ? "12px" : "0",
                }}
              >
                <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.65, margin: 0 }}>{item.a}</p>
              </div>
            </button>
          );
        })}
      </section>

      {/* FINAL CTA */}
      <section className="landing-section-pad" style={{ padding: "140px 48px", textAlign: "center" }}>
        <div
          style={{
            maxWidth: "800px",
            margin: "0 auto",
            background: "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))",
            border: "1px solid rgba(99,102,241,0.2)",
            borderRadius: "28px",
            padding: "80px 48px",
          }}
        >
          <h2
            style={{
              fontSize: "40px",
              fontWeight: 800,
              letterSpacing: "-1px",
              color: "var(--text-primary)",
              lineHeight: 1.15,
            }}
          >
            Ready to protect your hotel&apos;s reputation?
          </h2>
          <p style={{ fontSize: "18px", color: "var(--text-secondary)", margin: "16px 0 40px", lineHeight: 1.6 }}>
            Start responding faster with AI drafts tailored to each guest — across TripAdvisor, Google, and Booking.com.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", justifyContent: "center" }}>
            <button
              type="button"
              onClick={goLogin}
              style={{
                ...glassPrimary,
                height: "56px",
                padding: "0 40px",
                fontSize: "17px",
                borderRadius: "14px",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--btn-primary-hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--btn-primary-bg)";
              }}
            >
              Start free trial — no credit card needed
            </button>
            <button
              type="button"
              onClick={goLogin}
              style={{
                ...glassSecondary,
                height: "56px",
                padding: "0 40px",
                fontSize: "17px",
                borderRadius: "14px",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--secondary-btn-hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--secondary-btn-bg)";
              }}
            >
              Sign in to existing account
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer
        className="landing-section-pad"
        style={{
          padding: "40px 48px",
          borderTop: "1px solid var(--divider)",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: "var(--accent)",
            }}
          />
          <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--logo-text)" }}>GuestPulse</span>
          <span style={{ fontSize: "13px", color: "var(--text-muted)", marginLeft: "8px" }}>
            © 2026 GuestPulse. All rights reserved.
          </span>
        </div>
        <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
          {["Privacy", "Terms", "Contact"].map((label) => (
            <span key={label} style={{ fontSize: "13px", color: "var(--text-muted)", cursor: "pointer" }}>
              {label}
            </span>
          ))}
        </div>
      </footer>
    </div>
  );
}

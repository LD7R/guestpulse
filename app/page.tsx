"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { Fragment, useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";

const glassPrimary: CSSProperties = {
  background: "var(--btn-primary-bg)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid var(--btn-primary-border)",
  color: "var(--on-primary)",
  fontWeight: 600,
  cursor: "pointer",
  transition: "all 0.2s ease",
};

const glassSecondary: CSSProperties = {
  background: "var(--secondary-btn-bg)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid var(--secondary-btn-border)",
  color: "var(--text-primary)",
  fontWeight: 500,
  cursor: "pointer",
  transition: "all 0.2s ease",
};

const miniGlass: CSSProperties = {
  background: "var(--glass-bg)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid var(--glass-border)",
  borderRadius: "12px",
};

const faqItems: { q: string; a: string }[] = [
  {
    q: "How does GuestPulse get my reviews?",
    a: "We connect to TripAdvisor, Google Maps, and Booking.com using our scraping technology. Just paste your hotel URLs and we handle the rest — no API keys or integrations needed.",
  },
  {
    q: "Do I need technical knowledge to set it up?",
    a: "Not at all. Setup takes under 5 minutes — create an account, paste your hotel URLs, and your reviews start syncing immediately.",
  },
  {
    q: "How does the AI response work?",
    a: "When you click 'Draft response' on any review, our AI reads the review and generates a warm, professional response in seconds. You can edit it before copying and posting.",
  },
  {
    q: "Which review platforms do you support?",
    a: "Currently TripAdvisor, Google Maps, and Booking.com. We're adding Expedia and Hotels.com soon.",
  },
  {
    q: "Can I manage multiple hotels?",
    a: "Yes — the Pro plan supports up to 3 hotel properties. Enterprise plans for larger portfolios are available on request.",
  },
  {
    q: "Is there a free trial?",
    a: "Yes — 7 days completely free, no credit card required. You get full access to all Pro features during the trial.",
  },
  {
    q: "What happens if I cancel?",
    a: "You can cancel anytime from your billing settings. You'll keep access until the end of your billing period.",
  },
  {
    q: "Is my hotel data secure?",
    a: "Yes. All data is encrypted, stored securely, and never shared with third parties. We take privacy seriously.",
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
        background: "var(--bg-gradient)",
        backgroundAttachment: "fixed",
        color: "var(--text-primary)",
      }}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .landing-nav {
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              z-index: 100;
              background: rgba(10, 10, 26, 0.7);
              backdrop-filter: blur(20px);
              -webkit-backdrop-filter: blur(20px);
              border-bottom: 1px solid var(--divider);
              padding: 0 48px;
              height: 64px;
              display: flex;
              align-items: center;
              justify-content: space-between;
            }
            @media (prefers-color-scheme: light) {
              .landing-nav { background: rgba(240, 240, 255, 0.7); }
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
              font-size: clamp(40px, 6vw, 72px);
            }
            .landing-features-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 20px;
            }
            .landing-how-wrap {
              background: var(--glass-bg);
              margin: 0 -48px;
              padding-left: 48px;
              padding-right: 48px;
            }
            @media (max-width: 768px) {
              .landing-nav { padding: 0 24px; }
              .landing-nav-right { display: none !important; }
              .landing-nav-mobile-cta { display: inline-flex !important; align-items: center; justify-content: center; margin-left: auto; }
              .landing-hero-h1 { font-size: 36px !important; letter-spacing: -1px !important; }
              .landing-features-grid { grid-template-columns: 1fr !important; }
              .landing-section-pad { padding-left: 24px !important; padding-right: 24px !important; }
              .landing-how-wrap { margin: 0 -24px; padding-left: 24px; padding-right: 24px; }
            }
          `,
        }}
      />

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

      {/* HERO */}
      <section
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "120px 48px 80px",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
        className="landing-section-pad"
      >
        <div
          style={{
            position: "absolute",
            width: "600px",
            height: "600px",
            borderRadius: "50%",
            top: "-200px",
            left: "-200px",
            background: "radial-gradient(circle, rgba(99,102,241,0.15), transparent 70%)",
            filter: "blur(80px)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            bottom: "-150px",
            right: "-150px",
            background: "radial-gradient(circle, rgba(139,92,246,0.12), transparent 70%)",
            filter: "blur(80px)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: "300px",
            height: "300px",
            borderRadius: "50%",
            top: "40%",
            left: "50%",
            transform: "translateX(-50%)",
            background: "radial-gradient(circle, rgba(99,102,241,0.08), transparent 70%)",
            filter: "blur(60px)",
            pointerEvents: "none",
          }}
        />

        <div style={{ position: "relative", zIndex: 1, maxWidth: "900px" }}>
          <div style={{ ...badgePill, marginBottom: "24px" }}>✦ Trusted by independent hotels worldwide</div>

          <h1
            className="landing-hero-h1"
            style={{
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: "-2px",
              color: "var(--text-primary)",
              marginBottom: "24px",
              maxWidth: "800px",
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            Stop losing bookings to
            <br />
            <span
              style={{
                background: "linear-gradient(135deg, #6366f1, #8b5cf6, #a78bfa)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              unanswered reviews.
            </span>
          </h1>

          <p
            style={{
              fontSize: "18px",
              color: "var(--text-secondary)",
              maxWidth: "560px",
              lineHeight: 1.7,
              marginBottom: "40px",
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            GuestPulse automatically collects reviews from TripAdvisor, Google, and Booking.com — then drafts
            AI-powered responses so you never miss a reply again.
          </p>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "16px",
              justifyContent: "center",
              marginBottom: "8px",
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

          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "20px" }}>
            Join 500+ hotels already using GuestPulse
          </p>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "48px",
              justifyContent: "center",
              marginTop: "48px",
            }}
          >
            {[
              { n: "10x", l: "Faster review responses" },
              { n: "4.8★", l: "Average rating improvement" },
              { n: "2hrs", l: "Saved per week per hotel" },
            ].map((s) => (
              <div key={s.l} style={{ textAlign: "center" }}>
                <div style={{ fontSize: "32px", fontWeight: 700, color: "var(--accent)" }}>{s.n}</div>
                <div style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>{s.l}</div>
              </div>
            ))}
          </div>

          {/* Mock dashboard */}
          <div
            style={{
              ...miniGlass,
              padding: "20px",
              maxWidth: "900px",
              margin: "48px auto 0",
              boxShadow: "0 40px 80px rgba(0,0,0,0.4)",
              borderRadius: "20px",
              textAlign: "left",
            }}
          >
            <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "12px" }}>Live preview</div>
            {[
              {
                plat: "TripAdvisor",
                platStyle: { bg: "var(--platform-ta-bg)", c: "var(--platform-ta)", b: "var(--platform-ta-border)" },
                stars: 5,
                name: "Sarah M.",
                sent: "Positive",
                sentStyle: { bg: "var(--success-bg)", c: "var(--success)", bd: "var(--success-border)" },
                extra: null as string | null,
              },
              {
                plat: "Google",
                platStyle: { bg: "var(--platform-google-bg)", c: "var(--platform-google)", b: "var(--platform-google-border)" },
                stars: 2,
                name: "James K.",
                sent: "Negative",
                sentStyle: { bg: "var(--error-bg)", c: "var(--error)", bd: "var(--error-border)" },
                extra: "Noise",
              },
              {
                plat: "Booking",
                platStyle: { bg: "var(--platform-booking-bg)", c: "var(--platform-booking)", b: "var(--platform-booking-border)" },
                stars: 4,
                name: "Maria L.",
                sent: "Neutral",
                sentStyle: { bg: "var(--neutral-sentiment-bg)", c: "var(--text-secondary)", bd: "var(--neutral-sentiment-border)" },
                extra: "WiFi",
              },
            ].map((row) => (
              <div
                key={row.name}
                style={{
                  ...miniGlass,
                  padding: "12px 16px",
                  marginBottom: "10px",
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: "10px",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px", flex: 1, minWidth: 0 }}>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      padding: "2px 8px",
                      borderRadius: "100px",
                      border: `1px solid ${row.platStyle.b}`,
                      background: row.platStyle.bg,
                      color: row.platStyle.c,
                    }}
                  >
                    {row.plat}
                  </span>
                  <span style={{ color: "var(--star)", fontSize: "14px" }}>{"★".repeat(row.stars)}</span>
                  <span style={{ fontWeight: 600, fontSize: "14px", color: "var(--text-primary)" }}>{row.name}</span>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      padding: "2px 8px",
                      borderRadius: "100px",
                      border: `1px solid ${row.sentStyle.bd}`,
                      background: row.sentStyle.bg,
                      color: row.sentStyle.c,
                    }}
                  >
                    {row.sent}
                  </span>
                  {row.extra ? (
                    <span
                      style={{
                        fontSize: "11px",
                        padding: "2px 8px",
                        borderRadius: "100px",
                        background: "var(--complaint-pill-bg)",
                        border: "1px solid var(--complaint-pill-border)",
                        color: "var(--text-label)",
                      }}
                    >
                      {row.extra}
                    </span>
                  ) : null}
                </div>
                <button
                  type="button"
                  style={{
                    ...glassPrimary,
                    padding: "6px 12px",
                    fontSize: "12px",
                    borderRadius: "10px",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--btn-primary-hover)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "var(--btn-primary-bg)";
                  }}
                >
                  Draft AI Response
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section
        id="features"
        className="landing-section-pad"
        style={{ padding: "120px 48px", maxWidth: "1200px", margin: "0 auto" }}
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
      </section>

      {/* HOW IT WORKS */}
      <div className="landing-how-wrap" style={{ padding: "80px 48px" }}>
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
        className="landing-section-pad"
        style={{ padding: "120px 48px", maxWidth: "500px", margin: "0 auto", textAlign: "center" }}
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
              ...badgePill,
              marginBottom: "20px",
            }}
          >
            Most Popular
          </div>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: "6px" }}>
            <span style={{ fontSize: "64px", fontWeight: 800, color: "var(--text-primary)" }}>$99</span>
            <span style={{ fontSize: "18px", color: "var(--text-muted)" }}>/month</span>
          </div>
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
              "Competitor benchmarking (up to 5)",
              "Weekly email digest",
              "Urgent 1-2 star alerts",
              "Up to 3 hotel properties",
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
      </section>

      {/* FAQ */}
      <section id="faq" className="landing-section-pad" style={{ padding: "120px 48px", maxWidth: "720px", margin: "0 auto" }}>
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
                  maxHeight: open ? "200px" : "0",
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
      <section className="landing-section-pad" style={{ padding: "120px 48px", textAlign: "center" }}>
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
            Join hundreds of hotels using GuestPulse to respond faster, rank higher, and win more bookings.
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

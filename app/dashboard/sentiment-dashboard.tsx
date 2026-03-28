"use client";

import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ReviewRow = {
  rating?: number | string | null;
  sentiment?: string | null;
  responded?: boolean | null;
  complaint_topic?: string | null;
  platform?: string | null;
  review_date?: string | null;
  created_at?: string | null;
};

const glass: CSSProperties = {
  background: "var(--glass-bg)",
  backdropFilter: "blur(24px) saturate(180%)",
  WebkitBackdropFilter: "blur(24px) saturate(180%)",
  border: "1px solid var(--glass-border)",
  borderRadius: "20px",
  boxShadow: "var(--glass-shadow), var(--glass-inner)",
};

const statLabel: CSSProperties = {
  fontSize: "11px",
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--text-label)",
};

function normalizeRating(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(n)) return null;
  return n;
}

function normSentiment(
  s: string | null | undefined,
): "positive" | "neutral" | "negative" {
  const x = (s ?? "").toLowerCase().trim();
  if (x === "positive") return "positive";
  if (x === "negative") return "negative";
  return "neutral";
}

function StatIcon({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: "40px",
        height: "40px",
        borderRadius: "12px",
        background: "var(--glass-bg)",
        border: "1px solid var(--glass-border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "18px",
        flexShrink: 0,
      }}
    >
      {children}
    </div>
  );
}

export default function SentimentDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [hotelName, setHotelName] = useState<string | null>(null);
  const [hotelCount, setHotelCount] = useState(0);
  const [isDark, setIsDark] = useState(true);
  const [hoveredRatingIdx, setHoveredRatingIdx] = useState<number | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setIsDark(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        );

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;
        if (!user?.id) throw new Error("You must be signed in.");

        const { data: hotels, error: hotelsError } = await supabase
          .from("hotels")
          .select("id, name")
          .eq("user_id", user.id);

        if (hotelsError) throw hotelsError;

        const hotelRows = (hotels ?? []) as { id: string; name: string | null }[];
        if (!cancelled) {
          setHotelCount(hotelRows.length);
          setHotelName(hotelRows[0]?.name?.trim() || null);
        }

        const hotelIds = hotelRows.map((h) => h.id).filter(Boolean);
        if (hotelIds.length === 0) {
          if (!cancelled) {
            setReviews([]);
            setLoading(false);
          }
          return;
        }

        const { data: rows, error: revError } = await supabase
          .from("reviews")
          .select(
            "rating, sentiment, responded, complaint_topic, platform, review_date, created_at",
          )
          .in("hotel_id", hotelIds);

        if (revError) throw revError;
        if (!cancelled) setReviews((rows ?? []) as ReviewRow[]);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load data.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const chartColors = useMemo(
    () => ({
      axisMuted: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)",
      grid: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
      tooltipBg: isDark ? "rgba(15,15,30,0.95)" : "rgba(255,255,255,0.98)",
      tooltipBorder: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
      tooltipText: isDark ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.85)",
    }),
    [isDark],
  );

  const tooltipStyle: CSSProperties = useMemo(
    () => ({
      background: chartColors.tooltipBg,
      border: `1px solid ${chartColors.tooltipBorder}`,
      borderRadius: "12px",
      backdropFilter: "blur(20px)",
      color: chartColors.tooltipText,
    }),
    [chartColors],
  );

  const stats = useMemo(() => {
    const total = reviews.length;
    const ratings = reviews
      .map((r) => normalizeRating(r.rating))
      .filter((n): n is number => n !== null);
    const avg =
      ratings.length === 0
        ? null
        : ratings.reduce((a, b) => a + b, 0) / ratings.length;

    let positive = 0;
    for (const r of reviews) {
      if (normSentiment(r.sentiment) === "positive") positive += 1;
    }
    const positivePct =
      total === 0 ? 0 : Math.round((positive / total) * 100);

    const needing = reviews.filter((r) => !r.responded).length;

    return {
      total,
      avg,
      positivePct,
      needing,
    };
  }, [reviews]);

  const ratingDistribution = useMemo(() => {
    return [1, 2, 3, 4, 5].map((star) => ({
      name: String(star),
      star,
      count: reviews.filter((r) => {
        const n = normalizeRating(r.rating);
        if (n === null) return false;
        return Math.round(Math.max(1, Math.min(5, n))) === star;
      }).length,
    }));
  }, [reviews]);

  const sentimentPie = useMemo(() => {
    let pos = 0;
    let neu = 0;
    let neg = 0;
    for (const r of reviews) {
      const s = normSentiment(r.sentiment);
      if (s === "positive") pos += 1;
      else if (s === "negative") neg += 1;
      else neu += 1;
    }
    return {
      pos,
      neu,
      neg,
      data: [
        { name: "Positive", value: pos, fill: "#22c55e" },
        { name: "Neutral", value: neu, fill: "#6b7280" },
        { name: "Negative", value: neg, fill: "#ef4444" },
      ],
    };
  }, [reviews]);

  const dominantSentiment = useMemo(() => {
    const { pos, neu, neg } = sentimentPie;
    const max = Math.max(pos, neu, neg);
    if (max === 0) return "—";
    if (pos === max) return "Positive";
    if (neu === max) return "Neutral";
    return "Negative";
  }, [sentimentPie.pos, sentimentPie.neu, sentimentPie.neg]);

  const topComplaints = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of reviews) {
      const t = r.complaint_topic?.trim();
      if (!t) continue;
      map.set(t, (map.get(t) ?? 0) + 1);
    }
    const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, 5);
    const max = top.length ? Math.max(...top.map(([, c]) => c)) : 1;
    return top.map(([topic, count]) => ({ topic, count, max }));
  }, [reviews]);

  const urgentCount = useMemo(
    () => reviews.filter((r) => normSentiment(r.sentiment) === "negative").length,
    [reviews],
  );

  const sentimentTotal = sentimentPie.pos + sentimentPie.neu + sentimentPie.neg;

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          padding: "40px 48px",
          background: "var(--bg-gradient)",
          backgroundAttachment: "fixed",
        }}
      >
        <style
          dangerouslySetInnerHTML={{
            __html: `@keyframes dash-pulse { 0%,100%{opacity:0.45} 50%{opacity:0.9} }`,
          }}
        />
        <div
          style={{
            width: "200px",
            height: "28px",
            borderRadius: "8px",
            marginBottom: "8px",
            ...glass,
            animation: "dash-pulse 1.4s ease-in-out infinite",
          }}
        />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                height: "120px",
                ...glass,
                animation: "dash-pulse 1.4s ease-in-out infinite",
                animationDelay: `${0.05 * i}s`,
              }}
            />
          ))}
        </div>
        <div style={{ height: "300px", ...glass, animation: "dash-pulse 1.4s ease-in-out infinite" }} />
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          minHeight: "100vh",
          padding: "40px 48px",
          background: "var(--bg-gradient)",
          backgroundAttachment: "fixed",
        }}
      >
        <div style={{ ...glass, padding: "24px", color: "var(--text-primary)" }}>{error}</div>
      </div>
    );
  }

  const pageWrap: CSSProperties = {
    minHeight: "100vh",
    padding: "40px 48px",
    background: "var(--bg-gradient)",
    backgroundAttachment: "fixed",
  };

  const headerTitle = hotelName ?? "Your property";
  const monitorLine = `Monitoring ${hotelCount} ${hotelCount === 1 ? "hotel" : "hotels"} · ${stats.total} total reviews`;

  const statCards: {
    label: string;
    value: string;
    subtitle: string;
    icon: React.ReactNode;
  }[] = [
    {
      label: "Total reviews",
      value: stats.total.toString(),
      subtitle: "All time",
      icon: "📊",
    },
    {
      label: "Average rating",
      value: stats.avg === null ? "—" : stats.avg.toFixed(1),
      subtitle: "Across reviews",
      icon: "⭐",
    },
    {
      label: "Positive sentiment",
      value: `${stats.positivePct}%`,
      subtitle: "Of all reviews",
      icon: "💬",
    },
    {
      label: "Needing response",
      value: stats.needing.toString(),
      subtitle: "Awaiting reply",
      icon: "⚠️",
    },
  ];

  return (
    <div style={pageWrap}>
      <header style={{ marginBottom: "24px" }}>
        <h1
          style={{
            fontSize: "26px",
            fontWeight: 700,
            letterSpacing: "-0.5px",
            color: "var(--text-primary)",
            margin: "0 0 6px 0",
          }}
        >
          {headerTitle}
        </h1>
        <p style={{ fontSize: "14px", color: "var(--text-muted)", margin: 0 }}>{monitorLine}</p>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        {statCards.map((card) => (
          <div
            key={card.label}
            style={{
              ...glass,
              padding: "24px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: "12px",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={statLabel}>{card.label}</div>
              <div
                style={{
                  fontSize: "36px",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  lineHeight: 1.15,
                  marginTop: "4px",
                }}
              >
                {card.value}
              </div>
              <div
                style={{
                  fontSize: "13px",
                  color: "var(--text-muted)",
                  marginTop: "6px",
                }}
              >
                {card.subtitle}
              </div>
            </div>
            <StatIcon>{card.icon}</StatIcon>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 3fr) minmax(0, 2fr)",
          gap: "20px",
          marginBottom: "20px",
        }}
      >
        {/* Rating distribution */}
        <div style={{ ...glass, padding: "24px" }}>
          <h2
            style={{
              fontSize: "17px",
              fontWeight: 600,
              color: "var(--text-primary)",
              margin: "0 0 16px 0",
            }}
          >
            Rating distribution
          </h2>
          <div style={{ width: "100%", height: "300px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={ratingDistribution}
                margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
                onMouseLeave={() => setHoveredRatingIdx(null)}
              >
                <defs>
                  <linearGradient id="ratingBarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#818cf8" />
                    <stop offset="100%" stopColor="#6366f1" />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={chartColors.grid} vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: chartColors.axisMuted, fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide domain={[0, "auto"]} />
                <Tooltip
                  cursor={{ fill: "transparent" }}
                  contentStyle={tooltipStyle}
                  formatter={(value) => [String(value ?? 0), "Reviews"]}
                  labelFormatter={(label) => `${label} stars`}
                />
                <Bar
                  dataKey="count"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={48}
                  onMouseEnter={(_, i) => setHoveredRatingIdx(i)}
                >
                  {ratingDistribution.map((_, i) => (
                    <Cell
                      key={i}
                      fill={hoveredRatingIdx === i ? "#818cf8" : "url(#ratingBarGrad)"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sentiment donut */}
        <div style={{ ...glass, padding: "24px", minHeight: "300px", display: "flex", flexDirection: "column" }}>
          <h2
            style={{
              fontSize: "17px",
              fontWeight: 600,
              color: "var(--text-primary)",
              margin: "0 0 16px 0",
            }}
          >
            Sentiment breakdown
          </h2>
          <div style={{ display: "flex", flex: 1, alignItems: "center", gap: "20px", minHeight: 0 }}>
            <div style={{ position: "relative", flex: "0 0 52%", height: "260px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sentimentPie.data}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {sentimentPie.data.map((e, i) => (
                      <Cell key={i} fill={e.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  pointerEvents: "none",
                  flexDirection: "column",
                }}
              >
                <span
                  style={{
                    fontSize: "12px",
                    color: "var(--text-muted)",
                    fontWeight: 500,
                  }}
                >
                  Dominant
                </span>
                <span
                  style={{
                    fontSize: "16px",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                  }}
                >
                  {dominantSentiment}
                </span>
              </div>
            </div>
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                justifyContent: "center",
              }}
            >
              {sentimentPie.data.map((d) => {
                const pct =
                  sentimentTotal === 0
                    ? 0
                    : Math.round((d.value / sentimentTotal) * 100);
                return (
                  <div
                    key={d.name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      fontSize: "13px",
                    }}
                  >
                    <span
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: d.fill,
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ color: "var(--text-secondary)", flex: 1 }}>{d.name}</span>
                    <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{pct}%</span>
                    <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>({d.value})</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "20px",
        }}
      >
        <div style={{ ...glass, padding: "24px" }}>
          <h2
            style={{
              fontSize: "17px",
              fontWeight: 600,
              color: "var(--text-primary)",
              margin: "0 0 16px 0",
            }}
          >
            Top complaint topics
          </h2>
          {topComplaints.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: "14px", margin: 0 }}>
              No complaint topics recorded yet.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {topComplaints.map(({ topic, count, max }) => (
                <div
                  key={topic}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <div
                    style={{
                      flex: "0 0 28%",
                      minWidth: 0,
                      fontSize: "13px",
                      padding: "6px 10px",
                      borderRadius: "100px",
                      background: "var(--glass-bg)",
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-primary)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={topic}
                  >
                    {topic}
                  </div>
                  <div
                    style={{
                      flex: 1,
                      height: "6px",
                      borderRadius: "100px",
                      background: "var(--glass-bg)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${(count / max) * 100}%`,
                        borderRadius: "100px",
                        background: "linear-gradient(90deg, #6366f1, #8b5cf6)",
                        transition: "width 0.8s ease",
                      }}
                    />
                  </div>
                  <span
                    style={{
                      flex: "0 0 auto",
                      fontSize: "12px",
                      fontWeight: 600,
                      padding: "2px 10px",
                      borderRadius: "100px",
                      background: "var(--accent-bg)",
                      color: "var(--accent)",
                      border: "1px solid var(--accent-border)",
                    }}
                  >
                    {count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          style={{
            ...glass,
            padding: "24px",
            background:
              urgentCount > 0 ? "rgba(245,158,11,0.08)" : "rgba(34,197,94,0.06)",
            border:
              urgentCount > 0
                ? "1px solid rgba(245,158,11,0.2)"
                : "1px solid rgba(34,197,94,0.15)",
          }}
        >
          <h2
            style={{
              fontSize: "17px",
              fontWeight: 600,
              color: "var(--text-primary)",
              margin: "0 0 8px 0",
            }}
          >
            Urgent reviews
          </h2>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)", margin: "0 0 16px 0", lineHeight: 1.6 }}>
            {urgentCount > 0
              ? `${urgentCount} review${urgentCount === 1 ? "" : "s"} flagged as negative sentiment and may need attention.`
              : "No negative-sentiment reviews right now. Great job staying on top of feedback."}
          </p>
          <Link
            href="/dashboard/reviews"
            style={{
              fontSize: "13px",
              fontWeight: 500,
              color: "var(--accent)",
              textDecoration: "none",
            }}
          >
            View all →
          </Link>
        </div>
      </div>
    </div>
  );
}

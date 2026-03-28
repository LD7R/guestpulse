"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
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
  borderRadius: "var(--card-radius)",
  boxShadow: "var(--glass-shadow), var(--glass-inner)",
};

const labelStyle: CSSProperties = {
  fontSize: "11px",
  fontWeight: 500,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--text-label)",
};

const sectionTitle: CSSProperties = {
  fontSize: "15px",
  fontWeight: 500,
  color: "var(--text-primary)",
  marginBottom: "16px",
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

function dayKey(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

export default function SentimentDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [isDark, setIsDark] = useState(true);

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
          .select("id")
          .eq("user_id", user.id);

        if (hotelsError) throw hotelsError;

        const hotelIds = (hotels ?? [])
          .map((h: { id: string }) => h.id)
          .filter(Boolean);
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
      lineStroke: isDark ? "#6366f1" : "#4f46e5",
      grid: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
      axisTick: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.35)",
      labelMuted: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.55)",
      tooltipBg: isDark ? "rgba(20,20,30,0.95)" : "rgba(255,255,255,0.95)",
      tooltipBorder: isDark
        ? "rgba(255,255,255,0.1)"
        : "rgba(0,0,0,0.1)",
      tooltipText: isDark ? "white" : "black",
      barPos: isDark ? "#22c55e" : "#16a34a",
      barNeu: isDark ? "#888888" : "#9ca3af",
      barNeg: isDark ? "#ef4444" : "#dc2626",
      platTa: isDark ? "#34d399" : "#059669",
      platG: isDark ? "#60a5fa" : "#2563eb",
      platB: isDark ? "#a78bfa" : "#7c3aed",
      labelList: isDark ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.85)",
      labelListSoft: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)",
    }),
    [isDark],
  );

  const tooltipContentStyle: CSSProperties = useMemo(
    () => ({
      background: chartColors.tooltipBg,
      border: `1px solid ${chartColors.tooltipBorder}`,
      borderRadius: "12px",
      backdropFilter: "blur(20px)",
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

  const trendData = useMemo(() => {
    const byDay = new Map<string, number[]>();
    for (const r of reviews) {
      const key = dayKey(r.review_date) ?? dayKey(r.created_at);
      if (!key) continue;
      const rating = normalizeRating(r.rating);
      if (rating === null) continue;
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key)!.push(rating);
    }

    const out: { date: string; label: string; avg: number | null }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const arr = byDay.get(key) ?? [];
      const avg =
        arr.length === 0
          ? null
          : arr.reduce((a, b) => a + b, 0) / arr.length;
      out.push({
        date: key,
        label: d.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
        avg: avg !== null ? Number(avg.toFixed(2)) : null,
      });
    }
    return out;
  }, [reviews]);

  const sentimentCounts = useMemo(() => {
    let pos = 0;
    let neu = 0;
    let neg = 0;
    for (const r of reviews) {
      const s = normSentiment(r.sentiment);
      if (s === "positive") pos += 1;
      else if (s === "negative") neg += 1;
      else neu += 1;
    }
    return [
      { name: "Positive", count: pos, fill: chartColors.barPos },
      { name: "Neutral", count: neu, fill: chartColors.barNeu },
      { name: "Negative", count: neg, fill: chartColors.barNeg },
    ];
  }, [reviews, chartColors]);

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

  const platformData = useMemo(() => {
    const keys = [
      { key: "tripadvisor", label: "TripAdvisor", fill: chartColors.platTa },
      { key: "google", label: "Google", fill: chartColors.platG },
      { key: "booking", label: "Booking", fill: chartColors.platB },
    ] as const;

    return keys.map(({ key, label, fill }) => {
      const subset = reviews.filter(
        (r) => (r.platform ?? "").toLowerCase() === key,
      );
      const ratings = subset
        .map((r) => normalizeRating(r.rating))
        .filter((n): n is number => n !== null);
      const avg =
        ratings.length === 0
          ? 0
          : ratings.reduce((a, b) => a + b, 0) / ratings.length;
      const rounded = Number(avg.toFixed(2));
      return {
        platform: label,
        avg: rounded,
        avgLabel: rounded.toFixed(1),
        fill,
      };
    });
  }, [reviews, chartColors]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          padding: "40px 48px",
        }}
      >
        <style
          dangerouslySetInnerHTML={{
            __html: `@keyframes sentiment-glass-pulse { 0%,100%{opacity:0.45} 50%{opacity:0.9} }`,
          }}
        />
        <div
          style={{
            width: "200px",
            height: "28px",
            borderRadius: "8px",
            marginBottom: "8px",
            ...glass,
            animation: "sentiment-glass-pulse 1.4s ease-in-out infinite",
          }}
        />
        <div
          style={{
            width: "280px",
            height: "16px",
            borderRadius: "8px",
            marginBottom: "32px",
            ...glass,
            animation: "sentiment-glass-pulse 1.4s ease-in-out infinite",
            animationDelay: "0.1s",
          }}
        />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                height: "112px",
                ...glass,
                animation: "sentiment-glass-pulse 1.4s ease-in-out infinite",
                animationDelay: `${0.05 * i}s`,
              }}
            />
          ))}
        </div>
        <div
          style={{
            height: "280px",
            marginBottom: "20px",
            ...glass,
            animation: "sentiment-glass-pulse 1.4s ease-in-out infinite",
          }}
        />
        <div
          style={{
            height: "200px",
            ...glass,
            animation: "sentiment-glass-pulse 1.4s ease-in-out infinite",
            animationDelay: "0.15s",
          }}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          minHeight: "100vh",
          padding: "40px 48px",
        }}
      >
        <div
          style={{
            ...glass,
            padding: "24px",
            color: "var(--text-primary)",
          }}
        >
          {error}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "40px 48px",
      }}
    >
      <h1
        style={{
          fontSize: "26px",
          fontWeight: 700,
          letterSpacing: "-0.5px",
          color: "var(--text-primary)",
          margin: "0 0 8px 0",
        }}
      >
        Sentiment dashboard
      </h1>
      <p
        style={{
          fontSize: "14px",
          color: "var(--text-secondary)",
          margin: "0 0 32px 0",
        }}
      >
        Reputation health overview
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        {[
          { label: "Total reviews", value: stats.total.toString() },
          {
            label: "Average rating",
            value: stats.avg === null ? "—" : stats.avg.toFixed(1),
          },
          {
            label: "Positive %",
            value: `${stats.positivePct}%`,
          },
          {
            label: "Needing response",
            value: stats.needing.toString(),
          },
        ].map((card) => (
          <div
            key={card.label}
            style={{
              ...glass,
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                fontSize: "32px",
                fontWeight: 600,
                color: "var(--text-primary)",
                lineHeight: 1.1,
                marginBottom: "8px",
              }}
            >
              {card.value}
            </div>
            <div style={labelStyle}>{card.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div style={{ ...glass, padding: "20px" }}>
          <div style={sectionTitle}>Rating trend — last 30 days</div>
          <div style={{ width: "100%", height: "240px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={trendData}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  stroke={chartColors.grid}
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fill: chartColors.axisTick, fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={[0, 5]}
                  tick={{ fill: chartColors.axisTick, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <Tooltip
                  contentStyle={tooltipContentStyle}
                  labelStyle={{ color: chartColors.labelMuted }}
                  formatter={(v) => {
                    if (v == null || v === "") return ["—", "Avg rating"];
                    const n = Number(v);
                    return [Number.isNaN(n) ? "—" : n.toFixed(2), "Avg rating"];
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="avg"
                  stroke={chartColors.lineStroke}
                  strokeWidth={2.5}
                  dot={{ fill: chartColors.lineStroke, r: 3 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ ...glass, padding: "20px" }}>
          <div style={sectionTitle}>Sentiment breakdown</div>
          <div style={{ width: "100%", height: "160px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={sentimentCounts}
                margin={{ top: 4, right: 48, left: 4, bottom: 4 }}
              >
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={72}
                  tick={{ fill: chartColors.axisTick, fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={tooltipContentStyle}
                  formatter={(v) => [String(v ?? ""), "Count"]}
                />
                <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                  {sentimentCounts.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                  <LabelList
                    dataKey="count"
                    position="right"
                    fill={chartColors.labelList}
                    fontSize={12}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "20px",
          }}
        >
          <div
            style={{
              ...glass,
              padding: "20px",
              flex: "1 1 360px",
              minWidth: 0,
            }}
          >
            <div style={sectionTitle}>Top complaint topics</div>
            {topComplaints.length === 0 ? (
              <p
                style={{
                  color: "var(--text-muted)",
                  fontSize: "14px",
                  margin: 0,
                }}
              >
                No complaint topics recorded yet.
              </p>
            ) : (
              <div
                style={{ display: "flex", flexDirection: "column", gap: "12px" }}
              >
                {topComplaints.map(({ topic, count, max }) => (
                  <div
                    key={topic}
                    style={{
                      ...glass,
                      padding: "12px 14px",
                      borderRadius: "14px",
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    <div
                      style={{
                        flex: "0 0 30%",
                        minWidth: 0,
                        fontSize: "13px",
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
                        height: "8px",
                        borderRadius: "4px",
                        background: "var(--glass-input-bg)",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${(count / max) * 100}%`,
                          background: "var(--accent)",
                          borderRadius: "4px",
                          transition: "width 0.6s ease",
                        }}
                      />
                    </div>
                    <span
                      style={{
                        flex: "0 0 auto",
                        fontSize: "12px",
                        fontWeight: 500,
                        padding: "4px 10px",
                        borderRadius: "999px",
                        background: "var(--accent-soft)",
                        color: "var(--accent-text-soft)",
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
              padding: "20px",
              flex: "1 1 360px",
              minWidth: 0,
            }}
          >
            <div style={sectionTitle}>Platform ratings</div>
            <div style={{ width: "100%", height: "200px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={platformData}
                  margin={{ top: 24, right: 8, left: 0, bottom: 4 }}
                >
                  <CartesianGrid
                    stroke={chartColors.grid}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="platform"
                    tick={{ fill: chartColors.axisTick, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 5]}
                    tick={{ fill: chartColors.axisTick, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={28}
                  />
                  <Tooltip
                    contentStyle={tooltipContentStyle}
                    formatter={(v) => {
                      const n = typeof v === "number" ? v : Number(v);
                      return [
                        Number.isNaN(n) ? "—" : n.toFixed(2),
                        "Avg rating",
                      ];
                    }}
                  />
                  <Bar dataKey="avg" radius={[6, 6, 0, 0]}>
                    {platformData.map((entry, index) => (
                      <Cell key={`pf-${index}`} fill={entry.fill} />
                    ))}
                    <LabelList
                      dataKey="avgLabel"
                      position="top"
                      fill={chartColors.labelListSoft}
                      fontSize={12}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

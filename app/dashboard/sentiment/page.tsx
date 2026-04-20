"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/* ─── types ──────────────────────────────────────────────── */
type ReviewRow = {
  id?: string;
  platform?: string | null;
  rating?: number | string | null;
  sentiment?: string | null;
  complaint_topic?: string | null;
  topic_type?: string | null;
  review_date?: string | null;
  review_text?: string | null;
  responded?: boolean | null;
  reviewer_name?: string | null;
  original_language?: string | null;
  created_at?: string | null;
};

type Insights = {
  health: string;
  strength: string;
  urgent: string;
  recommendation: string;
};

/* ─── helpers ────────────────────────────────────────────── */
function num(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function sentOf(r: ReviewRow): "positive" | "neutral" | "negative" {
  const s = (r.sentiment ?? "").toLowerCase();
  if (s === "positive") return "positive";
  if (s === "negative") return "negative";
  return "neutral";
}

const topicLabel: Record<string, string> = {
  cleanliness: "Cleanliness", smell: "Smell", noise: "Noise",
  wifi: "WiFi", breakfast: "Breakfast", staff: "Staff",
  location: "Location", value: "Value for money", room: "Room quality",
  checkin: "Check-in", bathroom: "Bathroom", food: "Food & dining",
  parking: "Parking", pool: "Pool", amenities: "Amenities",
  service: "Service", mold: "Mold", temperature: "Temperature", view: "View",
};

const topicColor: Record<string, string> = {
  noise: "#f97316", wifi: "#60a5fa", cleanliness: "#fbbf24",
  staff: "#4ade80", location: "#a78bfa", breakfast: "#fb923c",
  value: "#34d399", room: "#818cf8", checkin: "#38bdf8",
  bathroom: "#f472b6", food: "#facc15", parking: "#94a3b8",
  pool: "#22d3ee", amenities: "#c084fc", service: "#4ade80",
  smell: "#fb923c", mold: "#f87171", temperature: "#60a5fa", view: "#34d399",
};

const langNames: Record<string, string> = {
  en: "🇬🇧 English", nl: "🇳🇱 Dutch", id: "🇮🇩 Indonesian",
  de: "🇩🇪 German", fr: "🇫🇷 French", es: "🇪🇸 Spanish",
  it: "🇮🇹 Italian", pt: "🇵🇹 Portuguese", ja: "🇯🇵 Japanese",
  zh: "🇨🇳 Chinese", ar: "🇸🇦 Arabic", ru: "🇷🇺 Russian",
  ko: "🇰🇷 Korean", tr: "🇹🇷 Turkish", pl: "🇵🇱 Polish",
  other: "🌐 Other",
};

const platformLabel: Record<string, string> = {
  tripadvisor: "TripAdvisor", google: "Google",
  booking: "Booking.com", trip: "Trip.com",
  expedia: "Expedia", yelp: "Yelp",
};

const platformColor: Record<string, string> = {
  tripadvisor: "#4ade80", google: "#60a5fa", booking: "#a78bfa",
  trip: "#60a5fa", expedia: "#a78bfa", yelp: "#f87171",
};
const platformBg: Record<string, string> = {
  tripadvisor: "#052e16", google: "#172554", booking: "#1e1b4b",
  trip: "#1e1b4b", expedia: "#1a0a2e", yelp: "#2d0a0a",
};

/* ─── sub-components ─────────────────────────────────────── */
const CARD: CSSProperties = {
  background: "#141414", border: "1px solid #1e1e1e",
  borderRadius: 8, padding: "20px 24px",
};

const SECTION_LABEL: CSSProperties = {
  fontSize: 10, fontWeight: 600, letterSpacing: "0.1em",
  textTransform: "uppercase", color: "#555555", marginBottom: 14,
};

function StatCard({
  label, value, color, trend,
}: {
  label: string; value: string | number; color: string;
  trend?: { text: string; color: string } | null;
}) {
  return (
    <div style={CARD}>
      <div style={SECTION_LABEL}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
      {trend && (
        <div style={{ fontSize: 11, color: trend.color, marginTop: 6 }}>{trend.text}</div>
      )}
    </div>
  );
}

type TTP = { active?: boolean; payload?: Array<{ color: string; name: string; value: number; dataKey: string }>; label?: string };
function TrendTooltip({ active, payload, label }: TTP) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + (p.value ?? 0), 0);
  return (
    <div style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 6, padding: "10px 14px", fontSize: 12 }}>
      <div style={{ color: "#888888", marginBottom: 6 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ color: p.color, display: "flex", gap: 8, marginBottom: 2 }}>
          <span style={{ minWidth: 60 }}>{p.name}:</span>
          <span>{p.value}</span>
        </div>
      ))}
      <div style={{ color: "#555555", borderTop: "1px solid #2a2a2a", marginTop: 6, paddingTop: 6 }}>
        Total: {total}
      </div>
    </div>
  );
}

/* ─── main page ──────────────────────────────────────────── */
export default function SentimentPage() {
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [generatingInsights, setGeneratingInsights] = useState(false);
  const [insightError, setInsightError] = useState<string | null>(null);
  const [autoGenDone, setAutoGenDone] = useState(false);

  /* ── load data ────────────────────────────────────────── */
  useEffect(() => {
    async function load() {
      setLoading(true);
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: hotel } = await supabase
        .from("hotels").select("id, name").eq("user_id", user.id).maybeSingle();
      if (!hotel?.id) { setLoading(false); return; }

      const { data: rows } = await supabase
        .from("reviews")
        .select("id, platform, rating, sentiment, complaint_topic, topic_type, review_date, review_text, responded, reviewer_name, original_language, created_at")
        .eq("hotel_id", hotel.id)
        .order("review_date", { ascending: true });

      setReviews((rows as ReviewRow[]) ?? []);
      setLoading(false);
    }
    void load();
  }, []);

  /* ── filtered by period ──────────────────────────────── */
  const filtered = useMemo(() => {
    if (period === 0) return reviews;
    const cutoff = new Date(Date.now() - period * 86400000);
    return reviews.filter((r) => {
      const d = new Date(r.review_date ?? r.created_at ?? 0);
      return d >= cutoff;
    });
  }, [reviews, period]);

  const prevFiltered = useMemo(() => {
    if (period === 0) return [];
    const start = new Date(Date.now() - 2 * period * 86400000);
    const end = new Date(Date.now() - period * 86400000);
    return reviews.filter((r) => {
      const d = new Date(r.review_date ?? r.created_at ?? 0);
      return d >= start && d < end;
    });
  }, [reviews, period]);

  /* ── stat helpers ────────────────────────────────────── */
  function calcStats(arr: ReviewRow[]) {
    const total = arr.length;
    if (total === 0) return { total: 0, positive: 0, neutral: 0, negative: 0, positivePct: 0, negativePct: 0, score: 0, avgRating: null as number | null };
    const positive = arr.filter((r) => sentOf(r) === "positive").length;
    const negative = arr.filter((r) => sentOf(r) === "negative").length;
    const neutral = total - positive - negative;
    const positivePct = Math.round((positive / total) * 100);
    const negativePct = Math.round((negative / total) * 100);
    const score = Math.round((positive * 100 + neutral * 50) / total);
    const ratingNums = arr.map((r) => num(r.rating)).filter((n): n is number => n !== null);
    const avgRating = ratingNums.length ? ratingNums.reduce((a, b) => a + b, 0) / ratingNums.length : null;
    return { total, positive, neutral, negative, positivePct, negativePct, score, avgRating };
  }

  const curr = useMemo(() => calcStats(filtered), [filtered]);
  const prev = useMemo(() => calcStats(prevFiltered), [prevFiltered]);

  function trend(current: number, previous: number, invertGood = false, decimals = 0): { text: string; color: string } | null {
    if (previous === 0) return null;
    const diff = current - previous;
    if (Math.abs(diff) < 0.05) return { text: "— same as prev period", color: "#555555" };
    const good = invertGood ? diff < 0 : diff > 0;
    const abs = decimals > 0 ? Math.abs(diff).toFixed(decimals) : String(Math.abs(Math.round(diff)));
    return { text: `${diff > 0 ? "↑" : "↓"} ${abs} vs prev period`, color: good ? "#4ade80" : "#f87171" };
  }

  /* ── sentiment trend chart data ──────────────────────── */
  const trendData = useMemo(() => {
    if (!filtered.length) return [];
    const granularity: "day" | "week" | "month" =
      period <= 7 ? "day" : period === 0 ? "month" : "week";

    const buckets: Record<string, { date: string; Positive: number; Neutral: number; Negative: number }> = {};

    for (const r of filtered) {
      const d = new Date(r.review_date ?? r.created_at ?? 0);
      let key: string;
      if (granularity === "day") {
        key = d.toISOString().slice(0, 10);
      } else if (granularity === "week") {
        const dow = d.getDay();
        const monday = new Date(d);
        monday.setDate(d.getDate() - ((dow + 6) % 7));
        key = monday.toISOString().slice(0, 10);
      } else {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      }
      if (!buckets[key]) buckets[key] = { date: key, Positive: 0, Neutral: 0, Negative: 0 };
      const s = sentOf(r);
      if (s === "positive") buckets[key]!.Positive++;
      else if (s === "negative") buckets[key]!.Negative++;
      else buckets[key]!.Neutral++;
    }

    return Object.values(buckets)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((b) => ({
        ...b,
        date: granularity === "month"
          ? new Date(b.date + "-01").toLocaleDateString("en-US", { month: "short", year: "2-digit" })
          : granularity === "week"
            ? new Date(b.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
            : new Date(b.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      }));
  }, [filtered, period]);

  /* ── rating distribution ─────────────────────────────── */
  const ratingDist = useMemo(() => {
    const counts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    for (const r of filtered) {
      const n = Math.round(num(r.rating) ?? 0);
      if (n >= 1 && n <= 5) counts[n]!++;
    }
    const max = Math.max(...Object.values(counts), 1);
    return [5, 4, 3, 2, 1].map((s) => ({
      stars: s,
      count: counts[s] ?? 0,
      pct: filtered.length ? Math.round(((counts[s] ?? 0) / filtered.length) * 100) : 0,
      max,
    }));
  }, [filtered]);

  const ratingBarColor: Record<number, string> = { 5: "#4ade80", 4: "#84cc16", 3: "#fbbf24", 2: "#f97316", 1: "#f87171" };

  /* ── platform sentiment ──────────────────────────────── */
  const platformData = useMemo(() => {
    const map: Record<string, { positive: number; neutral: number; negative: number; ratings: number[] }> = {};
    for (const r of filtered) {
      const p = (r.platform ?? "unknown").toLowerCase();
      if (!map[p]) map[p] = { positive: 0, neutral: 0, negative: 0, ratings: [] };
      const s = sentOf(r);
      map[p]![s]++;
      const n = num(r.rating);
      if (n !== null) map[p]!.ratings.push(n);
    }
    return Object.entries(map)
      .map(([plat, d]) => {
        const total = d.positive + d.neutral + d.negative;
        const avgR = d.ratings.length ? d.ratings.reduce((a, b) => a + b, 0) / d.ratings.length : null;
        return {
          platform: plat,
          total,
          positive: d.positive,
          neutral: d.neutral,
          negative: d.negative,
          posPct: total ? Math.round((d.positive / total) * 100) : 0,
          neuPct: total ? Math.round((d.neutral / total) * 100) : 0,
          negPct: total ? Math.round((d.negative / total) * 100) : 0,
          avgRating: avgR,
        };
      })
      .filter((p) => p.total >= 1)
      .sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0));
  }, [filtered]);

  /* ── language breakdown ──────────────────────────────── */
  const langData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of filtered) {
      const l = r.original_language ?? "unknown";
      map[l] = (map[l] ?? 0) + 1;
    }
    const sorted = Object.entries(map).sort(([, a], [, b]) => b - a);
    const top = sorted.slice(0, 6);
    const rest = sorted.slice(6).reduce((s, [, c]) => s + c, 0);
    return { top, rest, total: filtered.length };
  }, [filtered]);

  /* ── response impact ─────────────────────────────────── */
  const responseRatePct = useMemo(() => {
    if (!filtered.length) return 0;
    return Math.round((filtered.filter((r) => r.responded).length / filtered.length) * 100);
  }, [filtered]);

  const responseImpact = useMemo(() => {
    const responded = filtered.filter((r) => r.responded);
    const unresponded = filtered.filter((r) => !r.responded);
    function avgR(arr: ReviewRow[]) {
      const ns = arr.map((r) => num(r.rating)).filter((n): n is number => n !== null);
      return ns.length ? ns.reduce((a, b) => a + b, 0) / ns.length : null;
    }
    return {
      respondedAvg: avgR(responded),
      respondedCount: responded.length,
      unrespondedAvg: avgR(unresponded),
      unrespondedCount: unresponded.length,
    };
  }, [filtered]);

  /* ── topic analysis ──────────────────────────────────── */
  const topicData = useMemo(() => {
    const strengths: Record<string, number> = {};
    const improvements: Record<string, number> = {};
    for (const r of filtered) {
      if (!r.complaint_topic) continue;
      if (r.topic_type === "strength") strengths[r.complaint_topic] = (strengths[r.complaint_topic] ?? 0) + 1;
      else if (r.topic_type === "improvement") improvements[r.complaint_topic] = (improvements[r.complaint_topic] ?? 0) + 1;
    }
    const sortTop = (m: Record<string, number>, n: number) =>
      Object.entries(m).sort(([, a], [, b]) => b - a).slice(0, n);
    const classifiedCount = filtered.filter((r) => r.complaint_topic).length;
    return {
      strengths: sortTop(strengths, 8),
      improvements: sortTop(improvements, 8),
      classifiedCount,
    };
  }, [filtered]);

  /* ── monthly table ───────────────────────────────────── */
  const monthlyData = useMemo(() => {
    const months: Array<{
      label: string; key: string;
      total: number; avgRating: number | null;
      posPct: number; negPct: number; respondedPct: number;
    }> = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const monthReviews = reviews.filter((r) => {
        const rd = new Date(r.review_date ?? r.created_at ?? 0);
        return `${rd.getFullYear()}-${String(rd.getMonth() + 1).padStart(2, "0")}` === key;
      });
      const stats = calcStats(monthReviews);
      const respondedPct = monthReviews.length
        ? Math.round((monthReviews.filter((r) => r.responded).length / monthReviews.length) * 100)
        : 0;
      months.push({
        label: d.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
        key,
        total: stats.total,
        avgRating: stats.avgRating,
        posPct: stats.positivePct,
        negPct: stats.negativePct,
        respondedPct,
      });
    }
    return months;
  }, [reviews]);

  /* ── AI insights ─────────────────────────────────────── */
  const generateInsights = useCallback(async () => {
    if (filtered.length === 0) return;
    setGeneratingInsights(true);
    setInsightError(null);

    const topComplaints = topicData.improvements
      .slice(0, 3).map(([t]) => topicLabel[t] ?? t).join(", ") || "none";
    const topStrengths = topicData.strengths
      .slice(0, 3).map(([t]) => topicLabel[t] ?? t).join(", ") || "none";
    const topPlatform = platformData[0]?.platform
      ? (platformLabel[platformData[0].platform] ?? platformData[0].platform)
      : "unknown";
    const topLang = langData.top[0]
      ? (langNames[langData.top[0][0]] ?? langData.top[0][0])
      : "unknown";
    const responseRate = filtered.length
      ? Math.round((filtered.filter((r) => r.responded).length / filtered.length) * 100)
      : 0;

    try {
      const res = await fetch("/api/sentiment-insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          total: curr.total,
          avg: curr.avgRating ?? 0,
          positivePct: curr.positivePct,
          negativePct: curr.negativePct,
          topComplaints,
          topStrengths,
          topPlatform,
          topLanguage: topLang,
          responseRate,
        }),
      });
      const data = (await res.json()) as { success: boolean; insights?: Insights; error?: string };
      if (data.success && data.insights) {
        setInsights(data.insights);
      } else {
        setInsightError(data.error ?? "Failed to generate insights");
      }
    } catch {
      setInsightError("Failed to generate insights");
    } finally {
      setGeneratingInsights(false);
    }
  }, [filtered, curr, topicData, platformData, langData]);

  // Auto-generate once after load
  useEffect(() => {
    if (!loading && !autoGenDone && reviews.length > 0 && !insights) {
      setAutoGenDone(true);
      void generateInsights();
    }
  }, [loading, autoGenDone, reviews.length, insights, generateInsights]);

  /* ── period pills ────────────────────────────────────── */
  const periods = [
    { label: "7 days", value: 7 },
    { label: "30 days", value: 30 },
    { label: "90 days", value: 90 },
    { label: "All time", value: 0 },
  ];

  const scoreColor = curr.score >= 70 ? "#4ade80" : curr.score >= 50 ? "#fbbf24" : "#f87171";
  const avgRatingColor = (curr.avgRating ?? 0) >= 4 ? "#4ade80" : (curr.avgRating ?? 0) >= 3 ? "#fbbf24" : "#f87171";

  if (loading) {
    return (
      <div style={{ padding: "28px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 20 }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                background: "#161616",
                border: "1px solid #1e1e1e",
                borderRadius: 8,
                padding: "16px 20px",
                height: 90,
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            />
          ))}
        </div>
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
      </div>
    );
  }

  return (
    <div style={{ padding: "28px 28px 28px", maxWidth: 1200 }}>
      {/* ── header ─────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 500, color: "#f0f0f0", margin: 0 }}>Sentiment dashboard</h1>
          <p style={{ fontSize: 12, color: "#555555", margin: "4px 0 0" }}>Deep analysis of your guest feedback</p>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {periods.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPeriod(p.value)}
              style={{
                padding: "6px 14px",
                borderRadius: 6,
                border: `1px solid ${period === p.value ? "#4ade80" : "#1e1e1e"}`,
                background: period === p.value ? "rgba(74,222,128,0.08)" : "#141414",
                color: period === p.value ? "#4ade80" : "#555555",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {reviews.length === 0 && (
        <div style={{ ...CARD, color: "#555555", fontSize: 13, textAlign: "center", padding: "40px" }}>
          <p style={{ marginBottom: 16 }}>No reviews yet. Sync your platforms to start seeing sentiment data.</p>
          <a
            href="/dashboard/reviews"
            style={{
              display: "inline-block",
              background: "#f0f0f0",
              color: "#0d0d0d",
              fontSize: 13,
              fontWeight: 600,
              borderRadius: 6,
              padding: "8px 16px",
              textDecoration: "none",
            }}
          >
            Go to review inbox →
          </a>
        </div>
      )}

      {reviews.length > 0 && (
        <>
          {/* ── row 1: stat cards ──────────────────────── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 20 }}>
            <StatCard
              label="Sentiment score"
              value={curr.total > 0 ? curr.score : "—"}
              color={scoreColor}
              trend={trend(curr.score, prev.score)}
            />
            <StatCard
              label="Positive rate"
              value={curr.total > 0 ? `${curr.positivePct}%` : "—"}
              color="#4ade80"
              trend={trend(curr.positivePct, prev.positivePct)}
            />
            <StatCard
              label="Negative rate"
              value={curr.total > 0 ? `${curr.negativePct}%` : "—"}
              color="#f87171"
              trend={trend(curr.negativePct, prev.negativePct, true)}
            />
            <StatCard
              label="Avg rating"
              value={curr.avgRating !== null ? curr.avgRating.toFixed(1) : "—"}
              color={avgRatingColor}
              trend={trend(curr.avgRating ?? 0, prev.avgRating ?? 0, false, 1)}
            />
            <StatCard
              label={`Reviews${period > 0 ? ` (${period}d)` : ""}`}
              value={curr.total}
              color="#f0f0f0"
              trend={trend(curr.total, prev.total)}
            />
          </div>

          {/* ── row 2: trend + rating dist ─────────────── */}
          <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 12, marginBottom: 20 }}>
            {/* Trend chart */}
            <div style={CARD}>
              <div style={SECTION_LABEL}>Sentiment trend</div>
              {trendData.length < 2 ? (
                <div style={{ color: "#555555", fontSize: 12, padding: "40px 0", textAlign: "center" }}>
                  Not enough data to show a trend yet
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={trendData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke="#1e1e1e" />
                      <XAxis dataKey="date" tick={{ fill: "#444444", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#444444", fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip content={<TrendTooltip />} />
                      <Line type="monotone" dataKey="Positive" stroke="#4ade80" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="Neutral" stroke="#444444" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                      <Line type="monotone" dataKey="Negative" stroke="#f87171" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                  <div style={{ display: "flex", gap: 16, marginTop: 10, fontSize: 11, color: "#555555" }}>
                    {[["#4ade80", "Positive"], ["#444444", "Neutral"], ["#f87171", "Negative"]].map(([c, l]) => (
                      <span key={l} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: c, display: "inline-block" }} />
                        {l}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Rating distribution */}
            <div style={CARD}>
              <div style={SECTION_LABEL}>Rating breakdown</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
                {ratingDist.map(({ stars, count, pct, max }) => (
                  <div key={stars} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 20, fontSize: 12, color: "#888888", flexShrink: 0 }}>{stars}★</span>
                    <div style={{ flex: 1, background: "#1e1e1e", height: 8, borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ width: `${max > 0 ? (count / max) * 100 : 0}%`, height: "100%", background: ratingBarColor[stars] ?? "#555555", borderRadius: 4, transition: "width 0.4s" }} />
                    </div>
                    <span style={{ width: 28, fontSize: 12, color: "#f0f0f0", textAlign: "right", flexShrink: 0 }}>{count}</span>
                    <span style={{ width: 34, fontSize: 11, color: "#555555", textAlign: "right", flexShrink: 0 }}>{pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── row 3: platform / language / response ─── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
            {/* Platform sentiment */}
            <div style={CARD}>
              <div style={SECTION_LABEL}>Sentiment by platform</div>
              {platformData.length === 0 ? (
                <div style={{ color: "#555555", fontSize: 12 }}>No data for this period</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {platformData.map((p) => (
                    <div key={p.platform}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          padding: "2px 7px", borderRadius: 4, fontSize: 10, fontWeight: 700,
                          color: platformColor[p.platform] ?? "#f0f0f0", background: platformBg[p.platform] ?? "#1e1e1e",
                        }}>
                          {(platformLabel[p.platform] ?? p.platform).toUpperCase().slice(0, 3)}
                        </span>
                        <span style={{ fontSize: 11, color: "#555555" }}>
                          {p.total} reviews · {p.avgRating !== null ? `⭐ ${p.avgRating.toFixed(1)}` : ""}
                        </span>
                      </div>
                      {p.total < 3 ? (
                        <div style={{ fontSize: 11, color: "#444444" }}>Too few reviews</div>
                      ) : (
                        <div style={{ display: "flex", height: 6, borderRadius: 3, overflow: "hidden" }}>
                          <div title={`Positive ${p.posPct}%`} style={{ width: `${p.posPct}%`, background: "#4ade80" }} />
                          <div title={`Neutral ${p.neuPct}%`} style={{ width: `${p.neuPct}%`, background: "#2a2a2a" }} />
                          <div title={`Negative ${p.negPct}%`} style={{ width: `${p.negPct}%`, background: "#f87171" }} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Language breakdown */}
            <div style={CARD}>
              <div style={SECTION_LABEL}>Review languages</div>
              {langData.top.length === 0 ? (
                <div style={{ color: "#555555", fontSize: 12 }}>No language data yet</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {langData.top.map(([lang, count]) => {
                    const pct = langData.total > 0 ? Math.round((count / langData.total) * 100) : 0;
                    return (
                      <div key={lang}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontSize: 12, color: "#cccccc" }}>{langNames[lang] ?? lang}</span>
                          <span style={{ fontSize: 11, color: "#555555" }}>{count} · {pct}%</span>
                        </div>
                        <div style={{ background: "#1e1e1e", height: 4, borderRadius: 2, overflow: "hidden" }}>
                          <div style={{ width: `${pct}%`, height: "100%", background: "#4ade80", borderRadius: 2 }} />
                        </div>
                      </div>
                    );
                  })}
                  {langData.rest > 0 && (
                    <div style={{ fontSize: 11, color: "#444444" }}>{langData.rest} reviews in other languages</div>
                  )}
                </div>
              )}
            </div>

            {/* Response impact */}
            <div style={CARD}>
              <div style={SECTION_LABEL}>Response impact</div>
              {[
                { label: "Responded", avg: responseImpact.respondedAvg, count: responseImpact.respondedCount, color: "#4ade80" },
                { label: "Not responded", avg: responseImpact.unrespondedAvg, count: responseImpact.unrespondedCount, color: "#555555" },
              ].map(({ label, avg, count, color }) => (
                <div key={label} style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: "#888888" }}>{label}</span>
                    <span style={{ fontSize: 11, color: "#555555" }}>{count} reviews</span>
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 700, color }}>
                    {avg !== null ? `⭐ ${avg.toFixed(2)}` : "—"}
                  </div>
                </div>
              ))}
              {responseImpact.respondedAvg !== null && responseImpact.unrespondedAvg !== null && (
                <div style={{ marginTop: 8 }}>
                  {responseImpact.respondedAvg > responseImpact.unrespondedAvg ? (
                    <div style={{ fontSize: 12, color: "#4ade80", marginBottom: 8 }}>
                      Responding correlates with +{(responseImpact.respondedAvg - responseImpact.unrespondedAvg).toFixed(2)} higher ratings
                    </div>
                  ) : null}
                  <div style={{ fontSize: 12, color: "#444444", fontStyle: "italic", lineHeight: 1.5 }}>
                    Your response rate is {responseRatePct}% — responding to reviews builds guest trust
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── row 4: topic analysis ─────────────────── */}
          <div style={{ ...CARD, marginBottom: 20 }}>
            <div style={SECTION_LABEL}>Topic analysis</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
              {/* Strengths */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#4ade80", marginBottom: 12 }}>What guests love</div>
                {topicData.strengths.length === 0 ? (
                  <div style={{ color: "#444444", fontSize: 12 }}>No classified strengths yet</div>
                ) : (
                  <>
                    {topicData.strengths.map(([topic, count]) => {
                      const maxCount = topicData.strengths[0]?.[1] ?? 1;
                      const pct = Math.round((count / (filtered.filter((r) => r.topic_type === "strength").length || 1)) * 100);
                      return (
                        <div key={topic} style={{ marginBottom: 10 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                            <span style={{ fontSize: 12, color: "#cccccc" }}>{topicLabel[topic] ?? topic}</span>
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                              <span style={{ fontSize: 11, padding: "1px 7px", borderRadius: 10, background: "rgba(74,222,128,0.1)", color: "#4ade80" }}>{count}</span>
                              <span style={{ fontSize: 11, color: "#555555" }}>{pct}%</span>
                            </div>
                          </div>
                          <div style={{ background: "#1e1e1e", height: 5, borderRadius: 3, overflow: "hidden" }}>
                            <div style={{ width: `${maxCount > 0 ? (count / maxCount) * 100 : 0}%`, height: "100%", background: "#4ade80", borderRadius: 3 }} />
                          </div>
                        </div>
                      );
                    })}
                    <div style={{ fontSize: 11, color: "#444444", marginTop: 8 }}>
                      {topicData.strengths.length} topics from {topicData.classifiedCount} classified reviews
                    </div>
                  </>
                )}
              </div>

              {/* Improvements */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#f87171", marginBottom: 12 }}>What to improve</div>
                {topicData.improvements.length === 0 ? (
                  <div style={{ color: "#444444", fontSize: 12 }}>No classified complaints yet</div>
                ) : (
                  <>
                    {topicData.improvements.map(([topic, count]) => {
                      const maxCount = topicData.improvements[0]?.[1] ?? 1;
                      const pct = Math.round((count / (filtered.filter((r) => r.topic_type === "improvement").length || 1)) * 100);
                      const color = topicColor[topic] ?? "#f87171";
                      return (
                        <div key={topic} style={{ marginBottom: 10 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                            <span style={{ fontSize: 12, color: "#cccccc" }}>{topicLabel[topic] ?? topic}</span>
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                              <span style={{ fontSize: 11, padding: "1px 7px", borderRadius: 10, background: `${color}20`, color }}>{count}</span>
                              <span style={{ fontSize: 11, color: "#555555" }}>{pct}%</span>
                            </div>
                          </div>
                          <div style={{ background: "#1e1e1e", height: 5, borderRadius: 3, overflow: "hidden" }}>
                            <div style={{ width: `${maxCount > 0 ? (count / maxCount) * 100 : 0}%`, height: "100%", background: color, borderRadius: 3 }} />
                          </div>
                        </div>
                      );
                    })}
                    <div style={{ fontSize: 11, color: "#444444", marginTop: 8 }}>
                      {topicData.improvements.length} topics from {topicData.classifiedCount} classified reviews
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ── row 5: monthly table + AI insights ─────── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {/* Monthly table */}
            <div style={CARD}>
              <div style={SECTION_LABEL}>Month by month</div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr>
                    {["Month", "Reviews", "Avg ★", "Pos%", "Neg%", "Resp%"].map((h) => (
                      <th key={h} style={{ textAlign: h === "Month" ? "left" : "right", padding: "0 6px 10px", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#555555" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {monthlyData.map((m, i) => {
                    const isCurrentMonth = i === monthlyData.length - 1;
                    const prevMonth = monthlyData[i - 1];
                    const ratingDelta = prevMonth?.avgRating != null && m.avgRating != null
                      ? m.avgRating - prevMonth.avgRating : null;
                    const bestRating = Math.max(...monthlyData.map((x) => x.avgRating ?? 0));
                    const worstRating = Math.min(...monthlyData.filter((x) => x.total > 0).map((x) => x.avgRating ?? 99));
                    const isBest = m.avgRating === bestRating && m.total > 0;
                    const isWorst = m.avgRating === worstRating && m.total > 0 && bestRating !== worstRating;
                    const ratingColor = isBest ? "#4ade80" : isWorst ? "#f87171" : "#f0f0f0";
                    return (
                      <tr key={m.key} style={{ borderLeft: isCurrentMonth ? "2px solid #4ade80" : "2px solid transparent" }}>
                        <td style={{ padding: "8px 6px", color: isCurrentMonth ? "#f0f0f0" : "#888888", fontWeight: isCurrentMonth ? 600 : 400 }}>
                          {m.label}
                        </td>
                        <td style={{ padding: "8px 6px", textAlign: "right", color: "#888888" }}>{m.total || "—"}</td>
                        <td style={{ padding: "8px 6px", textAlign: "right", color: ratingColor }}>
                          {m.avgRating !== null ? (
                            <>
                              {m.avgRating.toFixed(1)}
                              {ratingDelta !== null && (
                                <span style={{ fontSize: 10, marginLeft: 3, color: ratingDelta > 0 ? "#4ade80" : "#f87171" }}>
                                  {ratingDelta > 0 ? "↑" : "↓"}
                                </span>
                              )}
                            </>
                          ) : "—"}
                        </td>
                        <td style={{ padding: "8px 6px", textAlign: "right", color: "#888888" }}>{m.total ? `${m.posPct}%` : "—"}</td>
                        <td style={{ padding: "8px 6px", textAlign: "right", color: "#888888" }}>{m.total ? `${m.negPct}%` : "—"}</td>
                        <td style={{ padding: "8px 6px", textAlign: "right", color: "#888888" }}>{m.total ? `${m.respondedPct}%` : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* AI insights */}
            <div style={CARD}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div>
                  <div style={SECTION_LABEL}>AI insights</div>
                  <div style={{ fontSize: 11, color: "#444444", marginTop: -8 }}>
                    Generated from your last {period > 0 ? `${period} days of` : ""} reviews
                  </div>
                </div>
                {insights && (
                  <button
                    type="button"
                    onClick={() => void generateInsights()}
                    disabled={generatingInsights}
                    style={{ background: "transparent", border: "1px solid #1e1e1e", borderRadius: 5, padding: "4px 10px", fontSize: 11, color: "#555555", cursor: "pointer", fontFamily: "inherit" }}
                  >
                    Regenerate
                  </button>
                )}
              </div>

              {generatingInsights && (
                <div style={{ color: "#555555", fontSize: 13, padding: "20px 0" }}>Analysing your reviews…</div>
              )}

              {insightError && !generatingInsights && (
                <div style={{ color: "#f87171", fontSize: 12, marginBottom: 12 }}>{insightError}</div>
              )}

              {!insights && !generatingInsights && !insightError && (
                <button
                  type="button"
                  onClick={() => void generateInsights()}
                  style={{ background: "#f0f0f0", border: "none", borderRadius: 6, padding: "10px 20px", fontSize: 13, fontWeight: 600, color: "#0d0d0d", cursor: "pointer", fontFamily: "inherit" }}
                >
                  Generate insights
                </button>
              )}

              {insights && !generatingInsights && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {([
                    { key: "health", icon: "◎", color: "#60a5fa", label: "Reputation health" },
                    { key: "strength", icon: "✓", color: "#4ade80", label: "Top strength" },
                    { key: "urgent", icon: "⚠", color: "#f87171", label: "Urgent issue" },
                    { key: "recommendation", icon: "→", color: "#a78bfa", label: "Recommendation" },
                  ] as const).map(({ key, icon, color, label }) => (
                    <div key={key} style={{ background: "#111111", border: "1px solid #1e1e1e", borderRadius: 6, padding: "12px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                        <span style={{ fontSize: 14, color }}>{icon}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
                      </div>
                      <p style={{ fontSize: 13, color: "#cccccc", margin: 0, lineHeight: 1.6 }}>{insights[key]}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 900px) {
          .sentiment-grid-5 { grid-template-columns: repeat(2, 1fr) !important; }
          .sentiment-grid-3 { grid-template-columns: 1fr !important; }
          .sentiment-grid-2 { grid-template-columns: 1fr !important; }
        }
      ` }} />
    </div>
  );
}

"use client";

import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
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

type Hotel = {
  id: string;
  name?: string | null;
  tripadvisor_url?: string | null;
  google_url?: string | null;
  booking_url?: string | null;
};

type ReviewRow = {
  id: string;
  platform?: string | null;
  rating?: number | string | null;
  reviewer_name?: string | null;
  created_at?: string | null;
  review_text?: string | null;
  sentiment?: string | null;
  responded?: boolean | null;
};

type AnalyticsRow = {
  rating: unknown;
  sentiment: string | null;
  complaint_topic: string | null;
  topic_type: string | null;
};

/** Progress / pill colors for "What guests love" (all green family) */
const STRENGTH_TOPIC_GREEN: Record<string, string> = {
  staff: "#22c55e",
  location: "#16a34a",
  breakfast: "#4ade80",
  room: "#86efac",
  service: "#bbf7d0",
  amenities: "#22c55e",
  cleanliness: "#15803d",
  wifi: "#4ade80",
  noise: "#16a34a",
  value: "#22c55e",
  checkin: "#4ade80",
  bathroom: "#86efac",
  food: "#4ade80",
  parking: "#15803d",
  pool: "#22c55e",
};

function strengthGreenForTopic(topic: string): string {
  return STRENGTH_TOPIC_GREEN[topic.toLowerCase()] ?? "#22c55e";
}

/** "What to improve" topic-specific colors */
const IMPROVEMENT_TOPIC_COLORS: Record<string, string> = {
  wifi: "#60a5fa",
  noise: "#fb923c",
  cleanliness: "#ef4444",
  breakfast: "#eab308",
  value: "#f59e0b",
  room: "#6366f1",
  checkin: "#14b8a6",
  bathroom: "#ef4444",
  parking: "#6b7280",
  staff: "#ef4444",
  location: "#f97316",
  service: "#ef4444",
  amenities: "#a855f7",
  food: "#eab308",
  pool: "#06b6d4",
};

function improvementColorForTopic(topic: string): string {
  return IMPROVEMENT_TOPIC_COLORS[topic.toLowerCase()] ?? "#ef4444";
}

function normTopicType(v: string | null | undefined): string {
  return (v ?? "").toLowerCase().trim();
}

const RATING_BAR_COLORS = ["#ef4444", "#f97316", "#eab308", "#84cc16", "#22c55e"];

function normalizeRating(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(n)) return null;
  return n;
}

function normSentiment(s: string | null | undefined): string {
  return (s ?? "").toLowerCase();
}

const glass: CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: "8px",
};

const glassPrimary: CSSProperties = {
  background: "var(--text-primary)",
  border: "1px solid var(--border)",
  borderRadius: "6px",
  padding: "8px 16px",
  color: "var(--bg-primary)",
  fontWeight: 600,
  fontSize: "13px",
  cursor: "pointer",
  transition: "background 0.15s ease",
};


function formatTrend(
  diff: number,
  invertGood: boolean,
  mode: "int" | "avg",
): { text: string; color: string } {
  if (diff === 0 || Number.isNaN(diff)) {
    return { text: "— same as last week", color: "var(--text-muted)" };
  }
  const good = invertGood ? diff < 0 : diff > 0;
  const arrow = diff > 0 ? "↑" : "↓";
  const color = good ? "var(--success)" : "var(--error)";
  const abs =
    mode === "avg"
      ? Math.abs(diff).toFixed(1)
      : String(Math.abs(Math.round(diff)));
  return { text: `${arrow} ${abs} vs last week`, color };
}

function arcPathD(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const rad = (d: number) => (d * Math.PI) / 180;
  const x1 = cx + r * Math.cos(rad(startDeg));
  const y1 = cy + r * Math.sin(rad(startDeg));
  const x2 = cx + r * Math.cos(rad(endDeg));
  const y2 = cy + r * Math.sin(rad(endDeg));
  let diff = endDeg - startDeg;
  while (diff < 0) diff += 360;
  while (diff > 360) diff -= 360;
  const largeArc = diff > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
}

function ResponseRateGauge({ pct, stroke }: { pct: number; stroke: string }) {
  const cx = 30;
  const cy = 30;
  const r = 24;
  const start = 210;
  const sweep = 240;
  const end = start + (sweep * Math.min(100, Math.max(0, pct))) / 100;
  return (
    <svg width="60" height="60" viewBox="0 0 60 60" aria-hidden>
      <path
        d={arcPathD(cx, cy, r, start, start + sweep)}
        fill="none"
        stroke="var(--glass-border)"
        strokeWidth={6}
        strokeLinecap="round"
      />
      {pct > 0 ? (
        <path
          d={arcPathD(cx, cy, r, start, end)}
          fill="none"
          stroke={stroke}
          strokeWidth={6}
          strokeLinecap="round"
        />
      ) : null}
    </svg>
  );
}

export default function CommandCenterPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [hasHotel, setHasHotel] = useState(false);
  const [primaryHotel, setPrimaryHotel] = useState<Hotel | null>(null);
  const [totalReviews, setTotalReviews] = useState(0);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [needingResponse, setNeedingResponse] = useState(0);
  const [weekNew, setWeekNew] = useState(0);

  const [trendTotal, setTrendTotal] = useState({ text: "", color: "var(--text-muted)" });
  const [trendAvg, setTrendAvg] = useState({ text: "", color: "var(--text-muted)" });
  const [trendNeeding, setTrendNeeding] = useState({ text: "", color: "var(--text-muted)" });
  const [trendWeek, setTrendWeek] = useState({ text: "", color: "var(--text-muted)" });

  const [ratingMonthTrend, setRatingMonthTrend] = useState({
    text: "",
    color: "var(--text-muted)",
  });
  const [responseRatePct, setResponseRatePct] = useState<number | null>(null);

  const [analyticsRows, setAnalyticsRows] = useState<AnalyticsRow[]>([]);
  const [urgentList, setUrgentList] = useState<ReviewRow[]>([]);
  const [urgentCount, setUrgentCount] = useState(0);

  const [platformHealth, setPlatformHealth] = useState<
    { key: string; label: string; avg: number; count: number; dot: string }[]
  >([]);

  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncBreakdown, setSyncBreakdown] = useState<{
    tripadvisor: number;
    google: number;
    booking: number;
  } | null>(null);

  const loadDashboard = useCallback(async () => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;
    if (!user) throw new Error("You must be signed in.");

    const { data: hotels, error: hotelsError } = await supabase
      .from("hotels")
      .select("id, name, tripadvisor_url, google_url, booking_url")
      .eq("user_id", user.id);

    if (hotelsError) throw hotelsError;

    const hotelIds = (hotels ?? []).map((h: Hotel) => h.id);
    if (hotelIds.length === 0) {
      setHasHotel(false);
      setPrimaryHotel(null);
      setTotalReviews(0);
      setAvgRating(null);
      setNeedingResponse(0);
      setWeekNew(0);
      setAnalyticsRows([]);
      setUrgentList([]);
      setUrgentCount(0);
      setPlatformHealth([]);
      const neutral = { text: "— same as last week", color: "var(--text-muted)" };
      setTrendTotal(neutral);
      setTrendAvg(neutral);
      setTrendNeeding(neutral);
      setTrendWeek(neutral);
      setRatingMonthTrend({ text: "—", color: "var(--text-muted)" });
      setResponseRatePct(null);
      return;
    }

    setHasHotel(true);
    setPrimaryHotel((hotels ?? [])[0] ?? null);

    const now = new Date();
    const cut7 = new Date(now);
    cut7.setDate(cut7.getDate() - 7);
    const cut14 = new Date(now);
    cut14.setDate(cut14.getDate() - 14);
    const iso7 = cut7.toISOString();
    const iso14 = cut14.toISOString();

    const { count: totalCount, error: totalError } = await supabase
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .in("hotel_id", hotelIds);

    if (totalError) throw totalError;

    const { data: ratingRows, error: ratingError } = await supabase
      .from("reviews")
      .select("rating, sentiment, complaint_topic, topic_type")
      .in("hotel_id", hotelIds);

    if (ratingError) throw ratingError;

    setAnalyticsRows((ratingRows ?? []) as AnalyticsRow[]);

    const numericRatings = (ratingRows ?? [])
      .map((r: { rating: unknown }) => {
        const n = typeof r.rating === "number" ? r.rating : Number(r.rating);
        return Number.isNaN(n) ? null : n;
      })
      .filter((n: number | null): n is number => n !== null);

    const avg =
      numericRatings.length === 0
        ? null
        : numericRatings.reduce((a, b) => a + b, 0) / numericRatings.length;

    const { count: needingCount, error: needingError } = await supabase
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("responded", false)
      .in("hotel_id", hotelIds);

    if (needingError) throw needingError;

    const { count: newLast7c, error: e1 } = await supabase
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .in("hotel_id", hotelIds)
      .gte("created_at", iso7);

    if (e1) throw e1;

    const { count: newPrev7c, error: e2 } = await supabase
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .in("hotel_id", hotelIds)
      .gte("created_at", iso14)
      .lt("created_at", iso7);

    if (e2) throw e2;

    const newLast7 = newLast7c ?? 0;
    const newPrev7 = newPrev7c ?? 0;

    const { data: ratingsLast7 } = await supabase
      .from("reviews")
      .select("rating")
      .in("hotel_id", hotelIds)
      .gte("created_at", iso7);

    const { data: ratingsPrev7 } = await supabase
      .from("reviews")
      .select("rating")
      .in("hotel_id", hotelIds)
      .gte("created_at", iso14)
      .lt("created_at", iso7);

    const avgLast7 = avgFromRows(ratingsLast7 ?? []);
    const avgPrev7 = avgFromRows(ratingsPrev7 ?? []);

    const { count: unrespLast7c } = await supabase
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .in("hotel_id", hotelIds)
      .eq("responded", false)
      .gte("created_at", iso7);

    const { count: unrespPrev7c } = await supabase
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .in("hotel_id", hotelIds)
      .eq("responded", false)
      .gte("created_at", iso14)
      .lt("created_at", iso7);

    const uL = unrespLast7c ?? 0;
    const uP = unrespPrev7c ?? 0;

    const { data: ratingsWithDates } = await supabase
      .from("reviews")
      .select("rating, created_at")
      .in("hotel_id", hotelIds);

    const tNow = new Date();
    const y = tNow.getFullYear();
    const mo = tNow.getMonth();
    const startThisMonth = new Date(y, mo, 1).getTime();
    const startPrevMonth = new Date(y, mo - 1, 1).getTime();

    let sumThis = 0;
    let nThis = 0;
    let sumPrev = 0;
    let nPrev = 0;
    for (const row of ratingsWithDates ?? []) {
      const raw = row as { rating: unknown; created_at: string | null };
      const t = raw.created_at ? new Date(raw.created_at).getTime() : NaN;
      if (Number.isNaN(t)) continue;
      const rv = normalizeRating(raw.rating);
      if (rv === null) continue;
      if (t >= startThisMonth) {
        sumThis += rv;
        nThis += 1;
      } else if (t >= startPrevMonth && t < startThisMonth) {
        sumPrev += rv;
        nPrev += 1;
      }
    }
    const avgThisM = nThis === 0 ? null : sumThis / nThis;
    const avgPrevM = nPrev === 0 ? null : sumPrev / nPrev;

    if (avgThisM != null && avgPrevM != null) {
      const dM = avgThisM - avgPrevM;
      if (Math.abs(dM) < 0.05) {
        setRatingMonthTrend({ text: "→ Same as last month", color: "var(--text-muted)" });
      } else if (dM > 0) {
        setRatingMonthTrend({
          text: `↑ +${dM.toFixed(1)} vs last month`,
          color: "#22c55e",
        });
      } else {
        setRatingMonthTrend({
          text: `↓ ${dM.toFixed(1)} vs last month`,
          color: "#ef4444",
        });
      }
    } else if (avgThisM != null && avgPrevM == null) {
      setRatingMonthTrend({ text: "— No prior month to compare", color: "var(--text-muted)" });
    } else {
      setRatingMonthTrend({ text: "→ Same as last month", color: "var(--text-muted)" });
    }

    const totalN = totalCount ?? 0;
    const needN = needingCount ?? 0;
    const respondedN = Math.max(0, totalN - needN);
    setResponseRatePct(totalN === 0 ? null : Math.round((respondedN / totalN) * 100));

    setTotalReviews(totalCount ?? 0);
    setAvgRating(avg);
    setNeedingResponse(needingCount ?? 0);
    setWeekNew(newLast7);

    const dNew = newLast7 - newPrev7;
    const dNeed = uL - uP;
    const dWeek = newLast7 - newPrev7;

    setTrendTotal(formatTrend(dNew, false, "int"));
    if (avgLast7 == null || avgPrev7 == null) {
      setTrendAvg({ text: "— same as last week", color: "var(--text-muted)" });
    } else {
      const dAvg = avgLast7 - avgPrev7;
      setTrendAvg(
        Math.abs(dAvg) < 0.01
          ? { text: "— same as last week", color: "var(--text-muted)" }
          : formatTrend(dAvg, false, "avg"),
      );
    }
    setTrendNeeding(formatTrend(dNeed, true, "int"));
    setTrendWeek(formatTrend(dWeek, false, "int"));

    const { data: urgentRows, error: ue } = await supabase
      .from("reviews")
      .select("id, platform, rating, reviewer_name, review_text, created_at, responded")
      .in("hotel_id", hotelIds)
      .eq("responded", false);

    if (ue) throw ue;

    const urgentFiltered = (urgentRows ?? []).filter((r: ReviewRow) => {
      const n = normalizeRating(r.rating);
      return n !== null && n <= 2;
    });
    setUrgentCount(urgentFiltered.length);
    setUrgentList(urgentFiltered.slice(0, 3) as ReviewRow[]);

    const { data: platRows } = await supabase
      .from("reviews")
      .select("platform, rating")
      .in("hotel_id", hotelIds);

    const keys = [
      { key: "tripadvisor", label: "TripAdvisor" },
      { key: "google", label: "Google" },
      { key: "booking", label: "Booking.com" },
    ] as const;

    const health = keys.map(({ key, label }) => {
      const subset = (platRows ?? []).filter(
        (r: { platform?: string | null }) =>
          (r.platform ?? "").toLowerCase() === key,
      );
      const ratings = subset
        .map((r: { rating: unknown }) => normalizeRating(r.rating))
        .filter((n): n is number => n !== null);
      const count = subset.length;
      const avgP =
        ratings.length === 0 ? 0 : ratings.reduce((a, b) => a + b, 0) / ratings.length;
      let dot = "var(--error)";
      if (avgP >= 4) dot = "var(--success)";
      else if (avgP >= 3) dot = "var(--warning)";
      return { key, label, avg: Number(avgP.toFixed(2)), count, dot };
    });
    setPlatformHealth(health);
  }, []);

  function avgFromRows(rows: { rating: unknown }[]): number | null {
    const nums = rows
      .map((r) => normalizeRating(r.rating))
      .filter((n): n is number => n !== null);
    if (nums.length === 0) return null;
    return nums.reduce((a, b) => a + b, 0) / nums.length;
  }

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        await loadDashboard();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load dashboard.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [loadDashboard]);

  async function syncPlatform(
    platform: "tripadvisor" | "google" | "booking",
    url: string,
    hotelId: string,
  ) {
    try {
      const res = await fetch("/api/scrape-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hotel_id: hotelId, url, platform }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        count?: number;
        error?: string;
      };

      if (!res.ok || json.success !== true) {
        throw new Error(json.error ?? `Failed syncing ${platform}`);
      }

      return { platform, count: json.count ?? 0, error: null as string | null };
    } catch (e) {
      return {
        platform,
        count: 0,
        error: e instanceof Error ? e.message : `Failed syncing ${platform}`,
      };
    }
  }

  async function handleSyncAllReviews() {
    setSyncError(null);
    setSyncMessage(null);
    setSyncBreakdown(null);

    if (!primaryHotel?.id) {
      setSyncError("No hotel found. Add one in Settings first.");
      return;
    }

    const tripadvisorUrl =
      typeof primaryHotel.tripadvisor_url === "string"
        ? primaryHotel.tripadvisor_url.trim()
        : "";
    const googleUrl =
      typeof primaryHotel.google_url === "string" ? primaryHotel.google_url.trim() : "";
    const bookingUrl =
      typeof primaryHotel.booking_url === "string" ? primaryHotel.booking_url.trim() : "";

    const tasks = [
      tripadvisorUrl
        ? syncPlatform("tripadvisor", tripadvisorUrl, primaryHotel.id)
        : null,
      googleUrl ? syncPlatform("google", googleUrl, primaryHotel.id) : null,
      bookingUrl ? syncPlatform("booking", bookingUrl, primaryHotel.id) : null,
    ].filter(Boolean) as Promise<{
      platform: "tripadvisor" | "google" | "booking";
      count: number;
      error: string | null;
    }>[];

    if (tasks.length === 0) {
      setSyncMessage("Synced 0 new reviews across 0 platforms");
      setSyncBreakdown({ tripadvisor: 0, google: 0, booking: 0 });
      return;
    }

    setSyncing(true);
    try {
      const results = await Promise.all(tasks);
      const totalSynced = results.reduce((sum, r) => sum + (r?.count || 0), 0);
      const platformCount = results.filter((r) => (r?.count ?? 0) > 0).length;
      const failed = results.filter((r) => r.error);

      setSyncBreakdown({
        tripadvisor: results.find((r) => r.platform === "tripadvisor")?.count ?? 0,
        google: results.find((r) => r.platform === "google")?.count ?? 0,
        booking: results.find((r) => r.platform === "booking")?.count ?? 0,
      });
      setSyncMessage(
        `Synced ${totalSynced} new reviews across ${platformCount} platforms`,
      );

      if (failed.length > 0) {
        setSyncError(
          `Some platforms failed: ${failed.map((f) => `${f.platform}: ${f.error}`).join(" | ")}`,
        );
      }

      await loadDashboard();
      router.refresh();
    } finally {
      setSyncing(false);
    }
  }

  const excerpt = (text: string | null | undefined, max: number) => {
    const t = (text ?? "").trim();
    if (t.length <= max) return t || "—";
    return `${t.slice(0, max)}...`;
  };

  const platformBadge = (p: string | null | undefined) => {
    const raw = (p ?? "").toLowerCase();
    const label =
      raw === "tripadvisor"
        ? "TripAdvisor"
        : raw === "google"
          ? "Google"
          : raw === "booking"
            ? "Booking"
            : p || "Platform";
    const styles: Record<string, CSSProperties> = {
      tripadvisor: {
        background: "var(--platform-ta-bg)",
        color: "var(--platform-ta)",
        border: "1px solid var(--platform-ta-border)",
      },
      google: {
        background: "var(--platform-google-bg)",
        color: "var(--platform-google)",
        border: "1px solid var(--platform-google-border)",
      },
      booking: {
        background: "var(--platform-booking-bg)",
        color: "var(--platform-booking)",
        border: "1px solid var(--platform-booking-border)",
      },
    };
    const st = styles[raw] ?? {
      background: "var(--glass-input-bg)",
      color: "var(--text-secondary)",
      border: "1px solid var(--glass-input-border)",
    };
    return (
      <span
        style={{
          fontSize: "11px",
          fontWeight: 600,
          padding: "2px 8px",
          borderRadius: "4px",
          ...st,
        }}
      >
        {label}
      </span>
    );
  };

  function sentimentBucket(s: string | null | undefined): "positive" | "neutral" | "negative" {
    const x = normSentiment(s);
    if (x === "positive") return "positive";
    if (x === "negative") return "negative";
    return "neutral";
  }

  const chartColors = useMemo(
    () => ({
      axisMuted: "var(--chart-axis)",
      grid: "var(--chart-grid)",
    }),
    [],
  );

  const tooltipContentStyle: CSSProperties = useMemo(
    () => ({
      background: "var(--chart-tooltip-bg)",
      border: "1px solid var(--chart-tooltip-border)",
      borderRadius: "8px",
      color: "var(--chart-tooltip-text)",
    }),
    [],
  );

  const ratingDistribution = useMemo(
    () =>
      [1, 2, 3, 4, 5].map((star) => ({
        name: `${star}★`,
        star,
        count: analyticsRows.filter((r) => {
          const n = normalizeRating(r.rating);
          if (n === null) return false;
          return Math.round(Math.max(1, Math.min(5, n))) === star;
        }).length,
      })),
    [analyticsRows],
  );

  const sentimentPie = useMemo(() => {
    let pos = 0;
    let neu = 0;
    let neg = 0;
    for (const r of analyticsRows) {
      const b = sentimentBucket(r.sentiment);
      if (b === "positive") pos += 1;
      else if (b === "negative") neg += 1;
      else neu += 1;
    }
    const total = pos + neu + neg;
    return {
      pos,
      neu,
      neg,
      total,
      data: [
        { name: "Positive", value: pos, fill: "var(--chart-donut-positive)" },
        { name: "Neutral", value: neu, fill: "var(--chart-donut-neutral)" },
        { name: "Negative", value: neg, fill: "var(--chart-donut-negative)" },
      ],
    };
  }, [analyticsRows]);

  const topStrengthTopics = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of analyticsRows) {
      if (normTopicType(r.topic_type) !== "strength") continue;
      const t = r.complaint_topic?.trim();
      if (!t) continue;
      const key = t.toLowerCase();
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, 5);
    const max = top.length ? Math.max(...top.map(([, c]) => c)) : 1;
    return top.map(([topic, count]) => ({ topic, count, max }));
  }, [analyticsRows]);

  const topImprovementTopics = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of analyticsRows) {
      if (normTopicType(r.topic_type) !== "improvement") continue;
      const t = r.complaint_topic?.trim();
      if (!t) continue;
      const key = t.toLowerCase();
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, 5);
    const max = top.length ? Math.max(...top.map(([, c]) => c)) : 1;
    return top.map(([topic, count]) => ({ topic, count, max }));
  }, [analyticsRows]);

  if (loading) {
    const Sk = ({
      w = "100%",
      h = "20px",
      rad = "8px",
    }: {
      w?: string;
      h?: string;
      rad?: string;
    }) => (
      <div
        style={{
          width: w,
          height: h,
          borderRadius: rad,
          background: "var(--glass-bg)",
          border: "1px solid var(--glass-border)",
          animation: "skeleton-pulse 1.5s ease-in-out infinite",
        }}
      />
    );
    return (
      <div className="dash-page cmd-loading">
        <div className="cc-header-row" style={{ marginBottom: "24px" }}>
          <div>
            <Sk w="240px" h="28px" />
            <div style={{ marginTop: "10px" }}>
              <Sk w="320px" h="14px" />
            </div>
          </div>
          <Sk w="160px" h="14px" />
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} style={{ ...glass, padding: "24px", minHeight: "120px" }}>
              <Sk w="60%" h="12px" />
              <div style={{ marginTop: "12px" }}>
                <Sk w="50%" h="32px" rad="10px" />
              </div>
              <div style={{ marginTop: "10px" }}>
                <Sk w="80%" h="10px" />
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: "16px", marginBottom: "16px" }}>
          <div style={{ ...glass, padding: "24px", height: "280px" }}>
            <Sk w="40%" h="16px" />
            <div style={{ marginTop: "20px", height: "200px" }}>
              <Sk w="100%" h="100%" rad="12px" />
            </div>
          </div>
          <div style={{ ...glass, padding: "24px", height: "280px" }}>
            <Sk w="50%" h="16px" />
            <div style={{ marginTop: "20px", height: "200px" }}>
              <Sk w="100%" h="100%" rad="12px" />
            </div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div style={{ ...glass, padding: "24px", minHeight: "200px" }}>
            <Sk w="45%" h="16px" />
            <div style={{ marginTop: "16px" }}>
              <Sk w="100%" h="12px" />
            </div>
            <div style={{ marginTop: "8px" }}>
              <Sk w="90%" h="12px" />
            </div>
          </div>
          <div style={{ ...glass, padding: "24px", minHeight: "200px" }}>
            <Sk w="40%" h="16px" />
            <div style={{ marginTop: "16px" }}>
              <Sk w="100%" h="12px" />
            </div>
          </div>
        </div>
        <style
          dangerouslySetInnerHTML={{
            __html: `@keyframes cc-spin { to { transform: rotate(360deg); } }`,
          }}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="dash-page">
        <div style={{ ...glass, padding: "24px", color: "var(--error)", fontSize: "14px" }}>{error}</div>
      </div>
    );
  }

  const statCardsConfig = [
    {
      label: "Total reviews",
      value: totalReviews.toString(),
      trend: trendTotal,
      icon: "📊",
    },
    {
      label: "Average rating",
      value: avgRating === null ? "—" : avgRating.toFixed(1),
      trend: trendAvg,
      monthLine: true as const,
      icon: "⭐",
    },
    {
      label: "Needing response",
      value: needingResponse.toString(),
      trend: trendNeeding,
      icon: "✉️",
    },
    {
      label: "This week's new reviews",
      value: weekNew.toString(),
      trend: trendWeek,
      icon: "📈",
    },
  ];

  const rrPct = responseRatePct ?? 0;
  const rrColor =
    rrPct >= 80 ? "#22c55e" : rrPct >= 50 ? "#f59e0b" : "#ef4444";
  const rrSubtitle =
    rrPct >= 80 ? "Excellent — keep it up" : rrPct >= 50 ? "Good — aim for 80%+" : "Needs attention";

  return (
    <div className="dash-page command-center">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .command-center .cc-header-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; margin-bottom: 24px; }
            .command-center .cc-stat-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 16px; margin-bottom: 24px; }
            .command-center .cc-stat-card { position: relative; padding: 24px; }
            .command-center .cc-stat-icon { position: absolute; top: 20px; right: 20px; width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 18px; background: var(--glass-bg); border: 1px solid var(--glass-border); }
            .command-center .cc-quick-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
            .command-center .cc-analytics-row1 { display: grid; grid-template-columns: 3fr 2fr; gap: 16px; margin-bottom: 16px; align-items: stretch; }
            .command-center .cc-analytics-row-topics { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 16px; align-items: stretch; }
            .command-center .cc-analytics-row2 { display: grid; grid-template-columns: 1fr; gap: 16px; margin-bottom: 24px; align-items: stretch; }
            .command-center .cc-pie-wrap { display: flex; flex: 1; align-items: center; gap: 20px; min-height: 0; min-width: 0; }
            @media (max-width: 1024px) {
              .command-center .cc-stat-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
              .command-center .cc-analytics-row1 { grid-template-columns: 1fr; }
            }
            @media (max-width: 768px) {
              .command-center .cc-stat-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
              .command-center .cc-analytics-row-topics { grid-template-columns: 1fr; }
              .command-center .cc-analytics-row2 { grid-template-columns: 1fr; }
              .command-center .cc-pie-wrap { flex-direction: column; }
            }
          `,
        }}
      />

      <div className="cc-header-row">
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1
            style={{
              fontSize: "20px",
              fontWeight: 700,
              color: "var(--text-primary)",
              margin: "0 0 4px 0",
            }}
          >
            Overview
          </h1>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: 0 }}>
            Last 30 days — {primaryHotel?.name?.trim() || "Your hotel"}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => window.print()}
            style={{ borderRadius: 6, padding: "8px 16px", fontSize: 13, fontWeight: 500 }}
          >
            Export PDF
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={syncing || !primaryHotel?.id}
            onClick={() => void handleSyncAllReviews()}
            style={{
              borderRadius: 6,
              padding: "8px 16px",
              fontSize: 13,
              opacity: syncing || !primaryHotel?.id ? 0.5 : 1,
              cursor: syncing || !primaryHotel?.id ? "not-allowed" : "pointer",
            }}
          >
            {syncing ? "Syncing…" : "Sync reviews"}
          </button>
        </div>
      </div>

      <nav
        style={{
          display: "flex",
          gap: 24,
          borderBottom: "1px solid var(--border)",
          marginBottom: 24,
          flexWrap: "wrap",
        }}
      >
        {[
          { href: "/dashboard", label: "Overview" },
          { href: "/dashboard/reviews", label: "Review inbox" },
          { href: "/dashboard/analytics", label: "Sentiment" },
          { href: "/dashboard/benchmarking", label: "Competitors" },
        ].map((t) => {
          const active = pathname === t.href || (t.href !== "/dashboard" && pathname?.startsWith(t.href));
          return (
            <Link
              key={t.href}
              href={t.href}
              style={{
                fontSize: 13,
                fontWeight: 500,
                padding: "8px 0",
                marginRight: 0,
                borderBottom: active ? "2px solid var(--text-primary)" : "2px solid transparent",
                color: active ? "var(--text-primary)" : "var(--text-secondary)",
                textDecoration: "none",
                marginBottom: -1,
              }}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>

      {!hasHotel ? (
        <div
          style={{
            ...glass,
            padding: "24px",
            background: "var(--warning-banner-bg)",
            border: "1px solid var(--warning-banner-border)",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "16px",
            justifyContent: "space-between",
          }}
        >
          <p style={{ fontSize: "14px", color: "var(--text-primary)" }}>
            Add your hotel to start tracking reviews
          </p>
          <button
            type="button"
            onClick={() => router.push("/dashboard/settings")}
            style={{ ...glassPrimary, padding: "12px 24px" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--btn-primary-hover)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--btn-primary-bg)";
            }}
          >
            Hotel settings
          </button>
        </div>
      ) : (
        <>
          <div className="cc-stat-grid">
            {statCardsConfig.map((card) => (
              <div key={card.label} className="cc-stat-card" style={{ ...glass }}>
                <div className="cc-stat-icon">{card.icon}</div>
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--text-label)",
                    paddingRight: "48px",
                  }}
                >
                  {card.label}
                </div>
                <div
                  style={{
                    fontSize: "32px",
                    fontWeight: 700,
                    letterSpacing: "-1px",
                    color: "var(--text-primary)",
                    marginTop: "8px",
                  }}
                >
                  {card.value}
                </div>
                {"monthLine" in card && card.monthLine ? (
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: 500,
                      color: ratingMonthTrend.color,
                      marginTop: "6px",
                    }}
                  >
                    {ratingMonthTrend.text}
                  </div>
                ) : (
                  <div style={{ fontSize: "12px", color: card.trend.color, marginTop: "6px" }}>
                    {card.trend.text}
                  </div>
                )}
              </div>
            ))}
            <div className="cc-stat-card" style={{ ...glass }}>
              <div className="cc-stat-icon">✅</div>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--text-label)",
                  paddingRight: "48px",
                }}
              >
                Response rate
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  marginTop: "8px",
                }}
              >
                <div
                  style={{
                    fontSize: "32px",
                    fontWeight: 700,
                    letterSpacing: "-1px",
                    color: totalReviews === 0 ? "var(--text-muted)" : rrColor,
                  }}
                >
                  {totalReviews === 0 ? "—" : `${rrPct}%`}
                </div>
                {totalReviews > 0 ? <ResponseRateGauge pct={rrPct} stroke={rrColor} /> : null}
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "6px" }}>
                {totalReviews === 0 ? "—" : rrSubtitle}
              </div>
            </div>
          </div>

          {urgentCount > 0 ? (
            <section
              style={{
                ...glass,
                padding: "20px 24px",
                marginBottom: "24px",
                background: "rgba(239,68,68,0.06)",
                border: "1px solid rgba(239,68,68,0.15)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                <span style={{ fontSize: "20px" }} aria-hidden>
                  ⚠
                </span>
                <strong style={{ fontSize: "16px", color: "var(--text-primary)" }}>
                  {urgentCount} urgent reviews need immediate attention
                </strong>
              </div>
              <ul style={{ margin: "0 0 16px", paddingLeft: "20px", color: "var(--text-secondary)", fontSize: "14px" }}>
                {urgentList.map((u) => (
                  <li key={u.id} style={{ marginBottom: "6px" }}>
                    <strong style={{ color: "var(--text-primary)" }}>{u.reviewer_name ?? "Guest"}</strong> —{" "}
                    {normalizeRating(u.rating)?.toFixed(1) ?? "?"}★ — {excerpt(u.review_text, 80)}
                  </li>
                ))}
              </ul>
              <Link
                href="/dashboard/reviews"
                style={{
                  display: "inline-block",
                  ...glassPrimary,
                  padding: "10px 20px",
                  textDecoration: "none",
                  borderRadius: "12px",
                }}
              >
                Respond now
              </Link>
            </section>
          ) : null}

          <section style={{ marginBottom: "24px" }}>
            <div className="cc-analytics-row1">
              <div style={{ ...glass, padding: "24px", minHeight: "280px", display: "flex", flexDirection: "column" }}>
                <h2 className="section-label" style={{ margin: "0 0 12px 0", letterSpacing: "0.08em" }}>
                  Rating distribution — last 30 days
                </h2>
                <div style={{ width: "100%", height: "200px", flex: 1 }}>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart
                      data={ratingDistribution}
                      margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
                    >
                      <CartesianGrid stroke={chartColors.grid} vertical={false} />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: chartColors.axisMuted, fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis hide domain={[0, "auto"]} />
                      <Tooltip
                        contentStyle={tooltipContentStyle}
                        formatter={(value) => [String(value ?? 0), "Count"]}
                      />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={48}>
                        {ratingDistribution.map((_, i) => (
                          <Cell key={i} fill={RATING_BAR_COLORS[i] ?? "#888"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div style={{ ...glass, padding: "24px", minHeight: "280px", display: "flex", flexDirection: "column" }}>
                <h2 className="section-label" style={{ margin: "0 0 12px 0", letterSpacing: "0.08em" }}>
                  Sentiment breakdown
                </h2>
                <div className="cc-pie-wrap" style={{ flex: 1, justifyContent: "center" }}>
                  <div style={{ position: "relative", flex: "0 0 52%", height: "200px", minWidth: 0 }}>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={sentimentPie.data}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={2}
                          stroke="none"
                        >
                          {sentimentPie.data.map((e, i) => (
                            <Cell key={i} fill={e.fill} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipContentStyle} />
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
                      <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500 }}>
                        Total reviews
                      </span>
                      <span style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-primary)" }}>
                        {sentimentPie.total}
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
                      minWidth: 0,
                    }}
                  >
                    {sentimentPie.data.map((d) => {
                      const pct =
                        sentimentPie.total === 0
                          ? 0
                          : Math.round((d.value / sentimentPie.total) * 100);
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
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="cc-analytics-row-topics">
              <div
                style={{
                  ...glass,
                  padding: "24px",
                  background: "rgba(34,197,94,0.04)",
                  border: "1px solid rgba(34,197,94,0.12)",
                }}
              >
                <h2
                  style={{
                    fontSize: "17px",
                    fontWeight: 600,
                    color: "#22c55e",
                    margin: "0 0 16px 0",
                  }}
                >
                  What guests love ✓
                </h2>
                {topStrengthTopics.length === 0 ? (
                  <p style={{ color: "var(--text-muted)", fontSize: "14px", margin: 0, lineHeight: 1.6 }}>
                    No strength data yet — classify your reviews to see what guests love most
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    {topStrengthTopics.map(({ topic, count, max }) => {
                      const g = strengthGreenForTopic(topic);
                      return (
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
                              background: "rgba(34,197,94,0.12)",
                              border: `1px solid ${g}33`,
                              color: g,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              fontWeight: 600,
                            }}
                            title={topic}
                          >
                            {topic.charAt(0).toUpperCase() + topic.slice(1)}
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
                                background: g,
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
                              background: "rgba(34,197,94,0.15)",
                              color: "#15803d",
                              border: "1px solid rgba(34,197,94,0.25)",
                            }}
                          >
                            {count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div
                style={{
                  ...glass,
                  padding: "24px",
                  background: "rgba(239,68,68,0.04)",
                  border: "1px solid rgba(239,68,68,0.12)",
                }}
              >
                <h2
                  style={{
                    fontSize: "17px",
                    fontWeight: 600,
                    color: "#ef4444",
                    margin: "0 0 16px 0",
                  }}
                >
                  What to improve ↑
                </h2>
                {topImprovementTopics.length === 0 ? (
                  <p style={{ color: "var(--text-muted)", fontSize: "14px", margin: 0, lineHeight: 1.6 }}>
                    No improvement data yet — classify your reviews first
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    {topImprovementTopics.map(({ topic, count, max }) => {
                      const c = improvementColorForTopic(topic);
                      return (
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
                              background: `${c}22`,
                              border: `1px solid ${c}44`,
                              color: c,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              fontWeight: 600,
                            }}
                            title={topic}
                          >
                            {topic.charAt(0).toUpperCase() + topic.slice(1)}
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
                                background: c,
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
                              background: "rgba(239,68,68,0.1)",
                              color: "#ef4444",
                              border: "1px solid rgba(239,68,68,0.2)",
                            }}
                          >
                            {count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="cc-analytics-row2">
              <div style={{ ...glass, padding: "24px" }}>
                <h2
                  style={{
                    fontSize: "17px",
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    margin: "0 0 16px 0",
                  }}
                >
                  Platform health
                </h2>
                <div>
                  {platformHealth.map((p, i) => (
                    <div
                      key={p.key}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "12px",
                        padding: "12px 0",
                        borderBottom:
                          i < platformHealth.length - 1 ? "1px solid var(--glass-border)" : "none",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          flexWrap: "wrap",
                          minWidth: 0,
                        }}
                      >
                        {platformBadge(p.key)}
                        <span style={{ fontWeight: 600, fontSize: "14px", color: "var(--text-primary)" }}>
                          {p.count === 0 ? "—" : p.avg.toFixed(1)}
                          <span style={{ fontWeight: 500, color: "var(--text-muted)", fontSize: "12px" }}>
                            {" "}
                            avg
                          </span>
                        </span>
                        <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                          {p.count} review{p.count === 1 ? "" : "s"}
                        </span>
                      </div>
                      <span
                        style={{
                          width: "10px",
                          height: "10px",
                          borderRadius: "50%",
                          background: p.dot,
                          flexShrink: 0,
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section style={{ marginBottom: "24px" }}>
            <h2
              style={{
                fontSize: "17px",
                fontWeight: 600,
                color: "var(--text-primary)",
                marginBottom: "12px",
              }}
            >
              Quick actions
            </h2>
            <div className="cc-quick-grid">
              {[
                {
                  title: "Sync all reviews",
                  desc: "Pull latest from all platforms",
                  icon: "↻",
                  onClick: () => {
                    void handleSyncAllReviews();
                  },
                  loading: syncing,
                },
                {
                  title: "Review inbox",
                  desc: `${needingResponse} reviews need your response`,
                  icon: "✉",
                  onClick: () => router.push("/dashboard/reviews"),
                  loading: false,
                },
                {
                  title: "Hotel settings",
                  desc: "Update your property URLs",
                  icon: "⚙",
                  onClick: () => router.push("/dashboard/settings"),
                  loading: false,
                },
                {
                  title: "View analytics",
                  desc: "Rating trends and complaint topics",
                  icon: "▤",
                  onClick: () => router.push("/dashboard/analytics"),
                  loading: false,
                },
              ].map((item) => (
                <button
                  key={item.title}
                  type="button"
                  onClick={item.onClick}
                  disabled={item.loading}
                  style={{
                    ...glass,
                    padding: "20px",
                    textAlign: "left",
                    cursor: item.loading ? "wait" : "pointer",
                    border: "1px solid var(--glass-border)",
                    transition: "transform 0.2s ease",
                    opacity: item.loading ? 0.85 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!item.loading) e.currentTarget.style.transform = "translateY(-4px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  <div
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "12px",
                      background: "var(--accent-bg)",
                      border: "1px solid var(--accent-border)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "22px",
                      marginBottom: "12px",
                      color: "var(--accent)",
                    }}
                  >
                    {item.loading ? (
                      <span
                        style={{
                          width: "20px",
                          height: "20px",
                          borderRadius: "50%",
                          border: "2px solid var(--spinner-track)",
                          borderTopColor: "var(--accent)",
                          animation: "cc-spin 0.8s linear infinite",
                          display: "inline-block",
                        }}
                      />
                    ) : (
                      item.icon
                    )}
                  </div>
                  <div style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.5 }}>{item.desc}</div>
                </button>
              ))}
            </div>
            {syncMessage ? (
              <div
                style={{
                  marginTop: "12px",
                  padding: "12px 16px",
                  borderRadius: "12px",
                  background: "var(--message-success-bg)",
                  border: "1px solid var(--message-success-border)",
                  fontSize: "14px",
                  color: "var(--text-primary)",
                }}
              >
                {syncMessage}
              </div>
            ) : null}
            {syncError ? (
              <div
                style={{
                  marginTop: "8px",
                  padding: "12px 16px",
                  borderRadius: "12px",
                  background: "var(--message-error-bg)",
                  border: "1px solid var(--message-error-border)",
                  fontSize: "14px",
                  color: "var(--text-error-soft)",
                }}
              >
                {syncError}
              </div>
            ) : null}
          </section>
        </>
      )}
    </div>
  );
}

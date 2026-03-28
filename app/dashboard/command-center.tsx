"use client";

import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
};

const RATING_BAR_COLORS = ["#ef4444", "#f97316", "#eab308", "#84cc16", "#22c55e"];

function displayNameFromEmail(email: string | null): string {
  if (!email) return "there";
  const local = email.split("@")[0] ?? "";
  const first = local.split(/[._-]/)[0] ?? local;
  if (!first) return "there";
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

function formatHeaderDate(d: Date): string {
  const weekday = d.toLocaleDateString("en-US", { weekday: "long" });
  const month = d.toLocaleDateString("en-US", { month: "long" });
  const day = d.getDate();
  const year = d.getFullYear();
  return `${weekday}, ${month} ${day} ${year}`;
}

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
  background: "var(--glass-bg)",
  backdropFilter: "blur(24px) saturate(180%)",
  WebkitBackdropFilter: "blur(24px) saturate(180%)",
  border: "1px solid var(--glass-border)",
  borderRadius: "20px",
  boxShadow: "var(--glass-shadow), var(--glass-inner)",
};

const glassPrimary: CSSProperties = {
  background: "var(--btn-primary-bg)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid var(--btn-primary-border)",
  borderRadius: "var(--btn-radius)",
  padding: "8px 14px",
  color: "var(--on-primary)",
  fontWeight: 500,
  fontSize: "13px",
  cursor: "pointer",
  transition: "all 0.2s ease",
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

export default function CommandCenterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [hasHotel, setHasHotel] = useState(false);
  const [primaryHotel, setPrimaryHotel] = useState<Hotel | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const [totalReviews, setTotalReviews] = useState(0);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [needingResponse, setNeedingResponse] = useState(0);
  const [weekNew, setWeekNew] = useState(0);

  const [trendTotal, setTrendTotal] = useState({ text: "", color: "var(--text-muted)" });
  const [trendAvg, setTrendAvg] = useState({ text: "", color: "var(--text-muted)" });
  const [trendNeeding, setTrendNeeding] = useState({ text: "", color: "var(--text-muted)" });
  const [trendWeek, setTrendWeek] = useState({ text: "", color: "var(--text-muted)" });

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

  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setIsDark(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

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

    setUserEmail(user.email ?? null);

    const { data: hotels, error: hotelsError } = await supabase
      .from("hotels")
      .select("id, tripadvisor_url, google_url, booking_url")
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
      .select("rating, sentiment, complaint_topic")
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

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    const g = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
    return `${g}, ${displayNameFromEmail(userEmail)}`;
  }, [userEmail]);

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
          borderRadius: "100px",
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
      axisMuted: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)",
      grid: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
    }),
    [isDark],
  );

  const tooltipContentStyle: CSSProperties = useMemo(
    () => ({
      background: isDark ? "rgba(15,15,30,0.95)" : "rgba(255,255,255,0.98)",
      border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.08)",
      borderRadius: "12px",
      color: isDark ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.85)",
    }),
    [isDark],
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
        { name: "Positive", value: pos, fill: "#22c55e" },
        { name: "Neutral", value: neu, fill: "#6b7280" },
        { name: "Negative", value: neg, fill: "#ef4444" },
      ],
    };
  }, [analyticsRows]);

  const topComplaints = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of analyticsRows) {
      const t = r.complaint_topic?.trim();
      if (!t) continue;
      map.set(t, (map.get(t) ?? 0) + 1);
    }
    const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, 6);
    const max = top.length ? Math.max(...top.map(([, c]) => c)) : 1;
    return top.map(([topic, count]) => ({ topic, count, max }));
  }, [analyticsRows]);

  if (loading) {
    return (
      <div className="dash-page cmd-loading">
        <div style={{ ...glass, padding: "24px", display: "flex", alignItems: "center", gap: "12px" }}>
          <span
            style={{
              width: "20px",
              height: "20px",
              borderRadius: "50%",
              border: "2px solid var(--spinner-track)",
              borderTopColor: "var(--accent)",
              animation: "cc-spin 0.8s linear infinite",
            }}
          />
          <span style={{ fontSize: "14px", color: "var(--text-secondary)" }}>Loading…</span>
        </div>
        <style dangerouslySetInnerHTML={{ __html: `@keyframes cc-spin { to { transform: rotate(360deg); } }` }} />
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

  return (
    <div className="dash-page command-center">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .command-center .cc-header-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; margin-bottom: 24px; }
            .command-center .cc-stat-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; margin-bottom: 24px; }
            .command-center .cc-stat-card { position: relative; padding: 24px; }
            .command-center .cc-stat-icon { position: absolute; top: 20px; right: 20px; width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 18px; background: var(--glass-bg); border: 1px solid var(--glass-border); }
            .command-center .cc-quick-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
            .command-center .cc-analytics-row1 { display: grid; grid-template-columns: 3fr 2fr; gap: 16px; margin-bottom: 16px; align-items: stretch; }
            .command-center .cc-analytics-row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; align-items: stretch; }
            .command-center .cc-pie-wrap { display: flex; flex: 1; align-items: center; gap: 20px; min-height: 0; min-width: 0; }
            @media (max-width: 1024px) {
              .command-center .cc-stat-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
              .command-center .cc-analytics-row1 { grid-template-columns: 1fr; }
            }
            @media (max-width: 768px) {
              .command-center .cc-stat-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
              .command-center .cc-analytics-row2 { grid-template-columns: 1fr; }
              .command-center .cc-pie-wrap { flex-direction: column; }
            }
          `,
        }}
      />

      <div className="cc-header-row">
        <div>
          <h1
            style={{
              fontSize: "26px",
              fontWeight: 700,
              letterSpacing: "-0.5px",
              color: "var(--text-primary)",
              margin: "0 0 6px 0",
            }}
          >
            {greeting}
          </h1>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)", margin: 0 }}>
            Here&apos;s your reputation summary for today
          </p>
        </div>
        <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>{formatHeaderDate(new Date())}</div>
      </div>

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
                    fontSize: "36px",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    marginTop: "8px",
                  }}
                >
                  {card.value}
                </div>
                <div style={{ fontSize: "12px", color: card.trend.color, marginTop: "6px" }}>
                  {card.trend.text}
                </div>
              </div>
            ))}
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
                  Top complaint topics
                </h2>
                {topComplaints.length === 0 ? (
                  <p style={{ color: "var(--text-muted)", fontSize: "14px", margin: 0, lineHeight: 1.6 }}>
                    No complaint data yet — sync and classify reviews to see topics
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

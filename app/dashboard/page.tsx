"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
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

type CompetitorSnapshotRow = {
  id: string;
  name: string;
  avg_rating: number | null;
  total_reviews: number | null;
};

type TimeSeriesReview = {
  rating: unknown;
  created_at: string | null;
  review_date: string | null;
};

function normalizeRating(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(n)) return null;
  return n;
}

function normSentiment(s: string | null | undefined): string {
  return (s ?? "").toLowerCase();
}

function normTopicType(v: string | null | undefined): string {
  return (v ?? "").toLowerCase().trim();
}

function formatTrendLine(
  diff: number,
  invertGood: boolean,
  mode: "int" | "avg",
): { text: string; color: string } {
  if (diff === 0 || Number.isNaN(diff)) {
    return { text: "— same as last week", color: "#555555" };
  }
  const good = invertGood ? diff < 0 : diff > 0;
  const arrow = diff > 0 ? "↑" : "↓";
  const color = good ? "#4ade80" : "#f87171";
  const abs =
    mode === "avg"
      ? Math.abs(diff).toFixed(1)
      : String(Math.abs(Math.round(diff)));
  return { text: `${arrow} ${abs} vs last week`, color };
}

function sentimentBucket(s: string | null | undefined): "positive" | "neutral" | "negative" {
  const x = normSentiment(s);
  if (x === "positive") return "positive";
  if (x === "negative") return "negative";
  return "neutral";
}

function truncName(s: string, max = 20): string {
  const t = (s ?? "").trim();
  if (t.length <= max) return t || "Hotel";
  return `${t.slice(0, max)}...`;
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value?: number }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "#1a1a1a",
        border: "1px solid #2a2a2a",
        borderRadius: 6,
        padding: "8px 12px",
        fontSize: 12,
        color: "#f0f0f0",
      }}
    >
      <div style={{ color: "#888888" }}>{label}</div>
      <div style={{ fontWeight: 600 }}>{payload[0].value} reviews</div>
    </div>
  );
};

export default function DashboardOverviewPage() {
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

  const [trendTotal, setTrendTotal] = useState({ text: "", color: "#555555" });
  const [trendAvg, setTrendAvg] = useState({ text: "", color: "#555555" });
  const [trendNeeding, setTrendNeeding] = useState({ text: "", color: "#555555" });
  const [trendWeek, setTrendWeek] = useState({ text: "", color: "#555555" });

  const [ratingMonthTrend, setRatingMonthTrend] = useState({
    text: "",
    color: "#555555",
  });
  const [responseRatePct, setResponseRatePct] = useState<number | null>(null);

  const [analyticsRows, setAnalyticsRows] = useState<AnalyticsRow[]>([]);
  const [urgentCount, setUrgentCount] = useState(0);

  const [platformHealth, setPlatformHealth] = useState<
    { key: string; label: string; avg: number; count: number; dot: string }[]
  >([]);

  const [competitors, setCompetitors] = useState<CompetitorSnapshotRow[]>([]);
  const [reviewsTimeSeries, setReviewsTimeSeries] = useState<TimeSeriesReview[]>([]);

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
      setUrgentCount(0);
      setPlatformHealth([]);
      setCompetitors([]);
      setReviewsTimeSeries([]);
      const neutral = { text: "— same as last week", color: "#555555" };
      setTrendTotal(neutral);
      setTrendAvg(neutral);
      setTrendNeeding(neutral);
      setTrendWeek(neutral);
      setRatingMonthTrend({ text: "—", color: "#555555" });
      setResponseRatePct(null);
      return;
    }

    setHasHotel(true);
    setPrimaryHotel((hotels ?? [])[0] ?? null);

    const { data: compRows, error: compErr } = await supabase
      .from("competitors")
      .select("id, name, avg_rating, total_reviews")
      .in("hotel_id", hotelIds);

    if (compErr) throw compErr;
    setCompetitors((compRows ?? []) as CompetitorSnapshotRow[]);

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

    function avgFromRows(rows: { rating: unknown }[]): number | null {
      const nums = rows
        .map((r) => normalizeRating(r.rating))
        .filter((n): n is number => n !== null);
      if (nums.length === 0) return null;
      return nums.reduce((a, b) => a + b, 0) / nums.length;
    }

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
      .select("rating, created_at, review_date")
      .in("hotel_id", hotelIds);

    setReviewsTimeSeries((ratingsWithDates ?? []) as TimeSeriesReview[]);

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
        setRatingMonthTrend({ text: "→ Same as last month", color: "#555555" });
      } else if (dM > 0) {
        setRatingMonthTrend({
          text: `+${dM.toFixed(1)} vs last month`,
          color: "#4ade80",
        });
      } else {
        setRatingMonthTrend({
          text: `${dM.toFixed(1)} vs last month`,
          color: "#f87171",
        });
      }
    } else if (avgThisM != null && avgPrevM == null) {
      setRatingMonthTrend({ text: "— No prior month to compare", color: "#555555" });
    } else {
      setRatingMonthTrend({ text: "→ Same as last month", color: "#555555" });
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

    setTrendTotal(formatTrendLine(dNew, false, "int"));
    if (avgLast7 == null || avgPrev7 == null) {
      setTrendAvg({ text: "— same as last week", color: "#555555" });
    } else {
      const dAvg = avgLast7 - avgPrev7;
      setTrendAvg(
        Math.abs(dAvg) < 0.01
          ? { text: "— same as last week", color: "#555555" }
          : formatTrendLine(dAvg, false, "avg"),
      );
    }
    setTrendNeeding(formatTrendLine(dNeed, true, "int"));
    setTrendWeek(formatTrendLine(dWeek, false, "int"));

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
      let dot = "#f87171";
      if (avgP >= 4) dot = "#4ade80";
      else if (avgP >= 3) dot = "#fbbf24";
      return { key, label, avg: Number(avgP.toFixed(2)), count, dot };
    });
    setPlatformHealth(health);
  }, []);

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
    const top = sorted.slice(0, 8);
    const max = top.length ? Math.max(...top.map(([, c]) => c)) : 1;
    return top.map(([topic, count]) => ({ topic, count, max }));
  }, [analyticsRows]);

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
        { name: "Positive", value: pos, fill: "#4ade80" },
        { name: "Neutral", value: neu, fill: "#333333" },
        { name: "Negative", value: neg, fill: "#f87171" },
      ],
    };
  }, [analyticsRows]);

  const largestSentimentPct = useMemo(() => {
    if (sentimentPie.total === 0) return { pctStr: "0", name: "" as string };
    const entries = sentimentPie.data.map((d) => ({
      name: d.name,
      pct: Math.round((d.value / sentimentPie.total) * 100),
    }));
    const best = entries.reduce((a, b) => (b.pct > a.pct ? b : a));
    return { pctStr: String(best.pct), name: best.name };
  }, [sentimentPie]);

  const chartData = useMemo(() => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const last30 = reviewsTimeSeries.filter((r) => {
      const d = new Date(r.review_date || r.created_at || 0).getTime();
      return !Number.isNaN(d) && d >= cutoff;
    });

    const byDate: Record<
      string,
      { dateKey: string; count: number; ratings: number[]; sortTime: number }
    > = {};

    for (const r of last30) {
      const dt = new Date(r.review_date || r.created_at || 0);
      if (Number.isNaN(dt.getTime())) continue;
      const dateKey = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
      if (!byDate[dateKey]) {
        byDate[dateKey] = {
          dateKey,
          count: 0,
          ratings: [],
          sortTime: dt.getTime(),
        };
      }
      byDate[dateKey].count += 1;
      const nr = normalizeRating(r.rating);
      if (nr !== null) byDate[dateKey].ratings.push(nr);
    }

    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    return Object.values(byDate)
      .sort((a, b) => a.sortTime - b.sortTime)
      .map((d) => {
        const isToday = d.dateKey === todayKey;
        const short = new Date(d.sortTime).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        const ratings = d.ratings;
        let color = "#333333";
        if (ratings.length === 0) {
          color = "#333333";
        } else if (ratings.every((x) => x >= 4)) {
          color = "#4ade80";
        } else if (ratings.every((x) => x <= 2)) {
          color = "#f87171";
        } else if (ratings.every((x) => x === 3)) {
          color = "#fbbf24";
        } else {
          const rounded = ratings.map((x) => Math.round(Math.max(1, Math.min(5, x))));
          const counts = new Map<number, number>();
          for (const rv of rounded) counts.set(rv, (counts.get(rv) ?? 0) + 1);
          let modeStar = rounded[0];
          let maxC = 0;
          for (const [k, v] of counts) {
            if (v > maxC) {
              maxC = v;
              modeStar = k;
            }
          }
          if (modeStar >= 4) color = "#4ade80";
          else if (modeStar <= 2) color = "#f87171";
          else color = "#fbbf24";
        }

        return {
          date: isToday ? "Today" : short,
          dateKey: d.dateKey,
          count: d.count,
          color,
          avgRating:
            ratings.length > 0
              ? ratings.reduce((a, b) => a + b, 0) / ratings.length
              : 0,
        };
      });
  }, [reviewsTimeSeries]);

  const marketAvg = useMemo(() => {
    const nums = competitors
      .map((c) => c.avg_rating)
      .filter((n): n is number => n != null && !Number.isNaN(n));
    if (nums.length === 0) return null;
    return nums.reduce((a, b) => a + b, 0) / nums.length;
  }, [competitors]);

  const competitorCards = useMemo(() => {
    const hotelName = primaryHotel?.name?.trim() || "Your hotel";
    const mine = {
      id: "you",
      name: hotelName,
      rating: avgRating,
      isYou: true,
    };
    const rest = [...competitors]
      .filter((c) => c.avg_rating != null && !Number.isNaN(c.avg_rating))
      .sort((a, b) => (b.avg_rating ?? 0) - (a.avg_rating ?? 0))
      .map((c) => ({
        id: c.id,
        name: c.name,
        rating: c.avg_rating as number,
        isYou: false,
      }));
    const unrated = [...competitors]
      .filter((c) => c.avg_rating == null || Number.isNaN(c.avg_rating as number))
      .map((c) => ({
        id: c.id,
        name: c.name,
        rating: null as number | null,
        isYou: false,
      }));
    return [mine, ...rest, ...unrated];
  }, [primaryHotel?.name, avgRating, competitors]);

  const tabActive = {
    overview: pathname === "/dashboard" || pathname === "/dashboard/",
    inbox: pathname?.startsWith("/dashboard/reviews"),
    sentiment: pathname?.startsWith("/dashboard/analytics"),
    competitors: pathname?.startsWith("/dashboard/benchmarking"),
  };

  if (loading) {
    return (
      <div
        style={{
          background: "#0d0d0d",
          minHeight: "100vh",
          padding: "24px 28px",
          color: "#888",
          fontSize: 13,
        }}
      >
        Loading…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ background: "#0d0d0d", minHeight: "100vh", padding: "24px 28px", color: "#f87171" }}>
        {error}
      </div>
    );
  }

  return (
    <div style={{ background: "#0d0d0d", minHeight: "100vh", padding: "24px 28px", boxSizing: "border-box" }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 20,
        }}
      >
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#f0f0f0", margin: 0 }}>Overview</h1>
          <p style={{ fontSize: 12, color: "#555555", marginTop: 2, marginBottom: 0 }}>
            Last 30 days — {primaryHotel?.name?.trim() || "Your hotel"}
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => window.print()}
              style={{
                background: "transparent",
                border: "1px solid #2a2a2a",
                borderRadius: 6,
                padding: "7px 14px",
                fontSize: 12,
                fontWeight: 500,
                color: "#888888",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#3a3a3a";
                e.currentTarget.style.color = "#aaaaaa";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#2a2a2a";
                e.currentTarget.style.color = "#888888";
              }}
            >
              Export PDF
            </button>
            <button
              type="button"
              disabled={syncing || !primaryHotel?.id}
              onClick={() => void handleSyncAllReviews()}
              style={{
                background: "#f0f0f0",
                border: "none",
                borderRadius: 6,
                padding: "7px 14px",
                fontSize: 12,
                fontWeight: 600,
                color: "#0d0d0d",
                cursor: syncing || !primaryHotel?.id ? "not-allowed" : "pointer",
                opacity: syncing || !primaryHotel?.id ? 0.5 : 1,
              }}
              onMouseEnter={(e) => {
                if (!syncing && primaryHotel?.id) e.currentTarget.style.background = "#ffffff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#f0f0f0";
              }}
            >
              {syncing ? "Syncing…" : "Sync reviews"}
            </button>
          </div>
          {syncMessage ? (
            <div style={{ fontSize: 11, color: "#4ade80", maxWidth: 280, textAlign: "right" }}>{syncMessage}</div>
          ) : null}
          {syncError ? (
            <div style={{ fontSize: 11, color: "#f87171", maxWidth: 280, textAlign: "right" }}>{syncError}</div>
          ) : null}
        </div>
      </header>

      <nav
        style={{
          marginBottom: 20,
          borderBottom: "1px solid #1e1e1e",
          display: "flex",
          gap: 0,
        }}
      >
        {(
          [
            { id: "overview", label: "Overview", onClick: () => router.push("/dashboard") },
            { id: "inbox", label: "Review inbox", onClick: () => router.push("/dashboard/reviews") },
            { id: "sentiment", label: "Sentiment", onClick: () => router.push("/dashboard") },
            {
              id: "competitors",
              label: "Competitors",
              onClick: () => router.push("/dashboard/benchmarking"),
            },
          ] as const
        ).map((t) => {
          const active =
            (t.id === "overview" && tabActive.overview) ||
            (t.id === "inbox" && tabActive.inbox) ||
            (t.id === "sentiment" && tabActive.sentiment) ||
            (t.id === "competitors" && tabActive.competitors);
          return (
            <button
              key={t.id}
              type="button"
              onClick={t.onClick}
              style={{
                padding: "8px 0",
                marginRight: 28,
                marginBottom: -1,
                fontSize: 13,
                fontWeight: 500,
                color: active ? "#f0f0f0" : "#555555",
                borderBottom: active ? "2px solid #f0f0f0" : "2px solid transparent",
                background: "none",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </nav>

      {!hasHotel ? (
        <div
          style={{
            background: "#141414",
            border: "1px solid #1e1e1e",
            borderRadius: 8,
            padding: 24,
            color: "#f0f0f0",
            fontSize: 14,
          }}
        >
          Add your hotel to start tracking reviews.{" "}
          <button
            type="button"
            onClick={() => router.push("/dashboard/settings")}
            style={{
              background: "#f0f0f0",
              color: "#0d0d0d",
              border: "none",
              borderRadius: 6,
              padding: "8px 14px",
              fontWeight: 600,
              cursor: "pointer",
              marginLeft: 8,
            }}
          >
            Hotel settings
          </button>
        </div>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 12,
              marginBottom: 16,
            }}
            className="dash-stat-grid"
          >
            <style
              dangerouslySetInnerHTML={{
                __html: `
              @media (max-width: 1100px) {
                .dash-stat-grid { grid-template-columns: repeat(2, 1fr) !important; }
              }
              @media (max-width: 520px) {
                .dash-stat-grid { grid-template-columns: 1fr !important; }
              }
            `,
              }}
            />
            {[
              {
                label: "Total reviews",
                value: String(totalReviews),
                trend: trendTotal,
                urgent: false,
              },
              {
                label: "Average rating",
                value: avgRating === null ? "—" : avgRating.toFixed(1),
                trend: { text: ratingMonthTrend.text, color: ratingMonthTrend.color },
                urgent: false,
              },
              {
                label: "Needing response",
                value: String(needingResponse),
                trend: trendNeeding,
                urgent: false,
              },
              {
                label: "Urgent",
                value: String(urgentCount),
                trend: { text: "needs response now", color: "rgba(239,68,68,0.7)" },
                urgent: true,
              },
            ].map((card) => (
              <div
                key={card.label}
                style={{
                  background: "#141414",
                  border: "1px solid #1e1e1e",
                  borderRadius: 8,
                  padding: "16px 18px",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "#555555",
                    marginBottom: 8,
                  }}
                >
                  {card.label}
                </div>
                <div
                  style={{
                    fontSize: 36,
                    fontWeight: 700,
                    letterSpacing: "-1.5px",
                    color: card.urgent ? "#ef4444" : "#f0f0f0",
                    lineHeight: 1,
                    marginBottom: 4,
                  }}
                >
                  {card.value}
                </div>
                <div style={{ fontSize: 11, fontWeight: 500, color: card.trend.color }}>{card.trend.text}</div>
              </div>
            ))}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 16,
            }}
            className="dash-charts-row"
          >
            <style
              dangerouslySetInnerHTML={{
                __html: `
              @media (max-width: 900px) {
                .dash-charts-row { grid-template-columns: 1fr !important; }
              }
            `,
              }}
            />
            <div
              style={{
                background: "#141414",
                border: "1px solid #1e1e1e",
                borderRadius: 8,
                padding: "16px 18px",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "#555555",
                  marginBottom: 16,
                }}
              >
                RATING DISTRIBUTION — LAST 30 DAYS
              </div>
              <div style={{ width: "100%", height: 160 }}>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#444444", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                    <Bar dataKey="count" radius={[2, 2, 0, 0]} maxBarSize={32}>
                      {chartData.map((entry, i) => (
                        <Cell key={`c-${entry.dateKey}-${i}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div
              style={{
                background: "#141414",
                border: "1px solid #1e1e1e",
                borderRadius: 8,
                padding: "16px 18px",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "#555555",
                  marginBottom: 16,
                }}
              >
                SENTIMENT BREAKDOWN
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
                <div style={{ position: "relative", width: "50%", minWidth: 140, height: 160 }}>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie
                        data={sentimentPie.data}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={52}
                        outerRadius={72}
                        paddingAngle={1}
                        stroke="none"
                      >
                        {sentimentPie.data.map((e, i) => (
                          <Cell key={i} fill={e.fill} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "#1a1a1a",
                          border: "1px solid #2a2a2a",
                          borderRadius: 6,
                          fontSize: 12,
                          color: "#f0f0f0",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div
                    style={{
                      position: "absolute",
                      left: "50%",
                      top: "50%",
                      transform: "translate(-50%, -50%)",
                      textAlign: "center",
                      pointerEvents: "none",
                    }}
                  >
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#f0f0f0", lineHeight: 1.1 }}>
                      {largestSentimentPct.pctStr}
                    </div>
                    <div style={{ fontSize: 12, color: "#555555", marginTop: 2 }}>%</div>
                    <div style={{ fontSize: 11, color: "#555555", marginTop: 4 }}>
                      {sentimentPie.total ? largestSentimentPct.name : "—"}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                  {sentimentPie.data.map((d) => {
                    const pct =
                      sentimentPie.total === 0
                        ? 0
                        : Math.round((d.value / sentimentPie.total) * 100);
                    return (
                      <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: d.fill,
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ fontSize: 13, color: "#888888", flex: 1 }}>{d.name}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#f0f0f0" }}>{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <section style={{ marginBottom: 16 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#555555",
                marginBottom: 10,
              }}
            >
              TOP COMPLAINT TOPICS
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {topImprovementTopics.length === 0 ? (
                <span style={{ fontSize: 13, color: "#555555" }}>No classified complaint topics yet.</span>
              ) : (
                topImprovementTopics.map(({ topic, count, max }) => {
                  const c =
                    count >= 8 ? "#f87171" : count >= 5 ? "#fbbf24" : "#4ade80";
                  const label = topic.charAt(0).toUpperCase() + topic.slice(1);
                  return (
                    <div
                      key={topic}
                      style={{
                        background: "#141414",
                        border: "1px solid #1e1e1e",
                        borderRadius: 6,
                        padding: "8px 14px 10px",
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      <span style={{ fontSize: 15, fontWeight: 700, color: c }}>{count}</span>
                      <span style={{ fontSize: 13, color: "#888888", marginLeft: 8 }}>{label}</span>
                      <div
                        style={{
                          position: "absolute",
                          bottom: 0,
                          left: 0,
                          height: 3,
                          width: `${(count / max) * 100}%`,
                          background: c,
                        }}
                      />
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <section style={{ marginBottom: 16 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#555555",
                marginBottom: 10,
              }}
            >
              COMPETITOR SNAPSHOT
            </div>
            {competitors.length === 0 ? (
              <p style={{ margin: 0, fontSize: 13, color: "#555555" }}>
                Add competitors in Benchmarking
              </p>
            ) : (
              <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
                {competitorCards.map((c) => {
                  const showArrow =
                    marketAvg != null &&
                    c.rating != null &&
                    !Number.isNaN(c.rating) &&
                    Math.abs(c.rating - marketAvg) >= 0.05;
                  const up = c.rating != null && marketAvg != null && c.rating >= marketAvg;
                  return (
                    <div
                      key={c.id}
                      style={{
                        background: "#141414",
                        border: "1px solid #1e1e1e",
                        borderLeft: c.isYou ? "3px solid #4ade80" : undefined,
                        borderRadius: 6,
                        padding: "12px 14px",
                        minWidth: 140,
                        flexShrink: 0,
                      }}
                    >
                      <div style={{ fontSize: 12, color: "#888888", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {truncName(c.name)}
                        {c.isYou ? (
                          <span style={{ color: "#4ade80", marginLeft: 4 }}>(you)</span>
                        ) : null}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          marginTop: 4,
                        }}
                      >
                        <span style={{ fontSize: 28, fontWeight: 700, color: "#f0f0f0" }}>
                          {c.rating == null ? "—" : c.rating.toFixed(1)}
                        </span>
                        {showArrow ? (
                          <span style={{ fontSize: 14, color: up ? "#4ade80" : "#f87171" }}>
                            {up ? "↑" : "↓"}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

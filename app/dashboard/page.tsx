"use client";

import { createBrowserClient } from "@supabase/ssr";
import { Suspense, useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
  trip_url?: string | null;
  expedia_url?: string | null;
  yelp_url?: string | null;
  response_signature?: string | null;
  first_sync_completed?: boolean | null;
  last_sync_at?: string | null;
  historical_avg_rating?: number | null;
  historical_review_count?: number | null;
  active_platforms?: unknown;
};

type ReviewRow = {
  id: string;
  platform?: string | null;
  rating?: number | string | null;
  reviewer_name?: string | null;
  created_at?: string | null;
  review_date?: string | null;
  review_text?: string | null;
  sentiment?: string | null;
  responded?: boolean | null;
  complaint_topic?: string | null;
  topic?: string | null;
};

type CompetitorReviewTrendRow = {
  competitor_id: string;
  rating: unknown;
  review_date: string | null;
  created_at: string | null;
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

type SyncResult = {
  timestamp: Date;
  platforms: { platform: string; count: number; error: string | null }[];
  totalNew: number;
  totalReviews: number;
};

type SyncProgress = Record<string, "idle" | "syncing" | "done" | "error">;

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

function hasReviewText(r: ReviewRow): boolean {
  const t = (r.review_text ?? "").trim();
  return t !== "" && t !== "—";
}

/** Client-side safety net: reject placeholder or too-short review bodies. */
function passesUrgentReviewTextFilter(review: ReviewRow): boolean {
  const text = review.review_text;
  if (!text) return false;
  const cleaned = text.trim();
  if (cleaned === "") return false;
  if (cleaned === "—") return false;
  if (cleaned === "-") return false;
  if (cleaned === "null") return false;
  if (cleaned.length < 10) return false;
  return true;
}

function isUrgentReview(r: ReviewRow): boolean {
  if (r.responded) return false;
  if (!hasReviewText(r)) return false;
  const n = normalizeRating(r.rating);
  const sent = normSentiment(r.sentiment);
  const ref = new Date(r.review_date || r.created_at || 0);
  const t = ref.getTime();
  const ageOk = !Number.isNaN(t);
  const olderThan3Days = ageOk && Date.now() - t > 3 * 24 * 60 * 60 * 1000;
  if (n !== null && n <= 2) return true;
  if (sent === "negative") return true;
  if (olderThan3Days) return true;
  return false;
}

function sortUrgentReviews(a: ReviewRow, b: ReviewRow): number {
  const ra = normalizeRating(a.rating) ?? 99;
  const rb = normalizeRating(b.rating) ?? 99;
  if (ra !== rb) return ra - rb;
  const ta = new Date(a.review_date || a.created_at || 0).getTime();
  const tb = new Date(b.review_date || b.created_at || 0).getTime();
  return ta - tb;
}

function formatTimeAgo(iso: string | null | undefined): string {
  const t = new Date(iso || 0).getTime();
  if (Number.isNaN(t)) return "—";
  const sec = Math.floor((Date.now() - t) / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.floor(h / 24);
  if (d < 14) return `${d} day${d === 1 ? "" : "s"} ago`;
  const w = Math.floor(d / 7);
  return `${w} week${w === 1 ? "" : "s"} ago`;
}

function compute30DayRatingTrend(
  rows: Array<{ rating: unknown; created_at?: string | null; review_date?: string | null }>,
): { text: string; color: string } | null {
  const now = Date.now();
  const d30 = 30 * 24 * 60 * 60 * 1000;
  const last30: number[] = [];
  const prev30: number[] = [];
  for (const r of rows) {
    const ts = new Date(r.review_date || r.created_at || 0).getTime();
    if (Number.isNaN(ts)) continue;
    const n = normalizeRating(r.rating);
    if (n === null) continue;
    if (ts >= now - d30 && ts <= now) last30.push(n);
    else if (ts >= now - 2 * d30 && ts < now - d30) prev30.push(n);
  }
  if (last30.length === 0 || prev30.length === 0) return null;
  const a = last30.reduce((x, y) => x + y, 0) / last30.length;
  const b = prev30.reduce((x, y) => x + y, 0) / prev30.length;
  const diff = a - b;
  if (Math.abs(diff) < 0.05) return { text: "no change", color: "#555555" };
  if (diff > 0) return { text: `+${diff.toFixed(1)} this month`, color: "#4ade80" };
  return { text: `${diff.toFixed(1)} this month`, color: "#f87171" };
}

function StarRow({ rating }: { rating: number | null }) {
  const n =
    rating == null ? 0 : Math.round(Math.max(1, Math.min(5, Number(rating))));
  return (
    <span style={{ fontSize: 13, letterSpacing: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} style={{ color: i <= n ? "#fbbf24" : "#2a2a2a" }}>★</span>
      ))}
    </span>
  );
}

function urgentPlatformBadge(p: string | null | undefined) {
  const raw = (p ?? "").toLowerCase();
  const base: CSSProperties = {
    borderRadius: 3,
    padding: "2px 7px",
    fontSize: 11,
    fontWeight: 600,
  };
  if (raw === "tripadvisor")
    return <span style={{ ...base, background: "#052e16", color: "#4ade80" }}>TripAdvisor</span>;
  if (raw === "google")
    return <span style={{ ...base, background: "#172554", color: "#60a5fa" }}>Google</span>;
  if (raw === "booking")
    return <span style={{ ...base, background: "#1e1b4b", color: "#a78bfa" }}>Booking</span>;
  if (raw === "trip")
    return <span style={{ ...base, background: "#1e1b4b", color: "#60a5fa" }}>Trip.com</span>;
  if (raw === "expedia")
    return <span style={{ ...base, background: "#1a0a2e", color: "#a78bfa" }}>Expedia</span>;
  if (raw === "yelp")
    return <span style={{ ...base, background: "#2d0a0a", color: "#f87171" }}>Yelp</span>;
  return (
    <span style={{ ...base, background: "#1e1e1e", color: "#888888" }}>{p || "Platform"}</span>
  );
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

function DashboardOverviewContent() {
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

  const [weightedTotalCount, setWeightedTotalCount] = useState<number | null>(null);
  const [weightedHistoricalCount, setWeightedHistoricalCount] = useState<number | null>(null);

  const searchParams = useSearchParams();
  const [upgradeToast, setUpgradeToast] = useState<string | null>(null);
  const [subscriptionPlan, setSubscriptionPlan] = useState<string | null>(null);
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const [aiDraftsUsed, setAiDraftsUsed] = useState<number>(0);
  const [pdfToast, setPdfToast] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [syncProgress, setSyncProgress] = useState<SyncProgress>({ tripadvisor: "idle", google: "idle", booking: "idle", trip: "idle", expedia: "idle", yelp: "idle" });
  const [activeSyncPlatforms, setActiveSyncPlatforms] = useState<string[]>([]);

  const [urgentReviewsList, setUrgentReviewsList] = useState<ReviewRow[]>([]);
  const [competitorReviewsForTrend, setCompetitorReviewsForTrend] = useState<
    CompetitorReviewTrendRow[]
  >([]);
  const [drafts, setDrafts] = useState<
    Record<string, { text: string; loading: boolean; error?: string }>
  >({});
  const [copiedReviewId, setCopiedReviewId] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);

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
      .select("id, name, tripadvisor_url, google_url, booking_url, trip_url, expedia_url, yelp_url, response_signature, first_sync_completed, last_sync_at, historical_avg_rating, historical_review_count")
      .eq("user_id", user.id);

    if (hotelsError) throw hotelsError;

    // Fetch subscription info for banners
    const { data: profileData } = await supabase
      .from("profiles")
      .select("subscription_status, subscription_plan, trial_ends_at, ai_drafts_used")
      .eq("id", user.id)
      .maybeSingle();
    const pd = profileData as { subscription_status?: string | null; subscription_plan?: string | null; trial_ends_at?: string | null; ai_drafts_used?: number | null } | null;
    const status = pd?.subscription_status ?? null;
    setSubscriptionStatus(status);
    setSubscriptionPlan(pd?.subscription_plan ?? null);
    setTrialEndsAt(pd?.trial_ends_at ?? null);
    setAiDraftsUsed(pd?.ai_drafts_used ?? 0);

    const hotelIds = (hotels ?? []).map((h: Hotel) => h.id);
    if (hotelIds.length === 0) {
      router.push("/dashboard/onboarding");
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

    const { data: crTrendData, error: crTrendErr } = await supabase
      .from("competitor_reviews")
      .select("competitor_id, rating, review_date, created_at");
    if (!crTrendErr && crTrendData) {
      setCompetitorReviewsForTrend(crTrendData as CompetitorReviewTrendRow[]);
    } else {
      setCompetitorReviewsForTrend([]);
    }

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

    const recentCount = numericRatings.length;
    const recentAvg = recentCount === 0 ? null : numericRatings.reduce((a, b) => a + b, 0) / recentCount;

    const firstHotel = (hotels ?? [])[0] as Hotel | undefined;
    const historicalAvg = firstHotel?.historical_avg_rating ?? null;
    const historicalCount = firstHotel?.historical_review_count ?? null;

    let avg: number | null = recentAvg;
    let weightedTotalForLabel = recentCount > 0 ? recentCount : null;
    let historicalForLabel: number | null = null;

    if (historicalAvg != null && historicalCount != null && historicalCount > 0 && recentAvg != null && recentCount > 0) {
      const totalCount = recentCount + historicalCount;
      avg = (recentAvg * recentCount + historicalAvg * historicalCount) / totalCount;
      weightedTotalForLabel = totalCount;
      historicalForLabel = historicalCount;
    }

    setWeightedTotalCount(weightedTotalForLabel);
    setWeightedHistoricalCount(historicalForLabel);

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

    const { data: unrespondedRows, error: unrespErr } = await supabase
      .from("reviews")
      .select("*")
      .in("hotel_id", hotelIds)
      .eq("responded", false)
      .or("rating.lte.2,sentiment.eq.negative")
      .not("review_text", "is", null)
      .neq("review_text", "")
      .neq("review_text", "—")
      .order("rating", { ascending: true })
      .limit(5);

    if (unrespErr) throw unrespErr;

    const filteredUrgent = (unrespondedRows ?? []).filter((r) => {
      const text = (r as ReviewRow).review_text?.trim();
      return text && text !== "—" && text !== "-" && text !== "null" && text.length >= 5;
    });
    setUrgentCount(filteredUrgent.length);
    setUrgentReviewsList(filteredUrgent as ReviewRow[]);

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

  useEffect(() => {
    const upgraded = searchParams.get("upgraded");
    const plan = searchParams.get("plan");
    const interval = searchParams.get("interval");
    if (upgraded === "true") {
      const planName =
        plan === "essential"
          ? "Essential"
          : plan === "professional"
            ? "Professional"
            : "Multi-property";
      const int = interval === "annual" ? "annual" : "monthly";
      setUpgradeToast(
        `Welcome to GuestPulse ${planName}! Your ${int} subscription is now active.`,
      );
      window.setTimeout(() => setUpgradeToast(null), 6000);
      router.replace("/dashboard");
    }
  }, [searchParams, router]);

  async function syncPlatform(
    platform: "tripadvisor" | "google" | "booking" | "trip" | "expedia" | "yelp",
    url: string,
    hotelId: string,
  ) {
    try {
      const res = await fetch("/api/scrape-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hotel_id: hotelId, url, platform }),
      });
      const json = (await res.json()) as { success?: boolean; count?: number; error?: string };
      if (!res.ok || json.success !== true) throw new Error(json.error ?? `Failed syncing ${platform}`);
      return { platform, count: json.count ?? 0, error: null as string | null };
    } catch (e) {
      return { platform, count: 0, error: e instanceof Error ? e.message : `Failed syncing ${platform}` };
    }
  }

  async function handleSyncAllReviews() {
    setSyncResult(null);
    if (!primaryHotel?.id) return;

    const activePlatforms = primaryHotel.active_platforms
      ? typeof primaryHotel.active_platforms === "string"
        ? (JSON.parse(primaryHotel.active_platforms) as Record<string, boolean>)
        : (primaryHotel.active_platforms as Record<string, boolean>)
      : { tripadvisor: true, google: true, booking: true, trip: false, expedia: false, yelp: false };

    const platformsToSync: Array<{ platform: "tripadvisor" | "google" | "booking" | "trip" | "expedia" | "yelp"; url: string }> = [];
    if (primaryHotel.tripadvisor_url?.trim() && activePlatforms.tripadvisor !== false) platformsToSync.push({ platform: "tripadvisor", url: primaryHotel.tripadvisor_url.trim() });
    if (primaryHotel.google_url?.trim() && activePlatforms.google !== false) platformsToSync.push({ platform: "google", url: primaryHotel.google_url.trim() });
    if (primaryHotel.booking_url?.trim() && activePlatforms.booking !== false) platformsToSync.push({ platform: "booking", url: primaryHotel.booking_url.trim() });
    if (primaryHotel.trip_url?.trim() && activePlatforms.trip !== false) platformsToSync.push({ platform: "trip", url: primaryHotel.trip_url.trim() });
    if (primaryHotel.expedia_url?.trim() && activePlatforms.expedia !== false) platformsToSync.push({ platform: "expedia", url: primaryHotel.expedia_url.trim() });
    if (primaryHotel.yelp_url?.trim() && activePlatforms.yelp !== false) platformsToSync.push({ platform: "yelp", url: primaryHotel.yelp_url.trim() });

    if (platformsToSync.length === 0) {
      setSyncResult({ timestamp: new Date(), platforms: [], totalNew: 0, totalReviews: totalReviews });
      return;
    }

    setActiveSyncPlatforms(platformsToSync.map((p) => p.platform));
    const progressInit: SyncProgress = { tripadvisor: "idle", google: "idle", booking: "idle", trip: "idle", expedia: "idle", yelp: "idle" };
    for (const { platform } of platformsToSync) progressInit[platform] = "syncing";
    setSyncProgress(progressInit);

    setSyncing(true);
    try {
      const tasks = platformsToSync.map(({ platform, url }) =>
        syncPlatform(platform, url, primaryHotel.id).then((result) => {
          setSyncProgress((prev) => ({ ...prev, [platform]: result.error ? "error" : "done" }));
          return result;
        }),
      );

      const settled = await Promise.allSettled(tasks);
      const results = settled.flatMap((s) => (s.status === "fulfilled" ? [s.value] : []));
      const totalNew = results.reduce((s, r) => s + r.count, 0);

      await loadDashboard();
      router.refresh();

      setSyncResult({
        timestamp: new Date(),
        platforms: results.map((r) => ({ platform: r.platform, count: r.count, error: r.error })),
        totalNew,
        totalReviews: totalReviews + totalNew,
      });
    } finally {
      setSyncing(false);
    }
  }

  // Auto-dismiss sync result panel if 0 new reviews after 5s
  useEffect(() => {
    if (!syncResult || syncResult.totalNew > 0) return;
    const hasFailed = syncResult.platforms.some((p) => p.error);
    if (hasFailed) return;
    const timer = setTimeout(() => setSyncResult(null), 5000);
    return () => clearTimeout(timer);
  }, [syncResult]);

  async function handleMarkResponded(reviewId: string) {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    const { error } = await supabase
      .from("reviews")
      .update({ responded: true })
      .eq("id", reviewId);
    if (error) {
      console.error(error);
      return;
    }
    setUrgentReviewsList((prev) => prev.filter((r) => r.id !== reviewId));
    setNeedingResponse((prev) => Math.max(0, prev - 1));
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[reviewId];
      return next;
    });
    await loadDashboard();
    router.refresh();
  }

  async function handleDraftAI(review: ReviewRow) {
    const id = review.id;
    const sig =
      (primaryHotel?.response_signature && String(primaryHotel.response_signature).trim()) ||
      "The Management Team";
    setDrafts((prev) => ({ ...prev, [id]: { text: "", loading: true } }));
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const res = await fetch("/api/draft-response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          review_text: review.review_text ?? "",
          rating: normalizeRating(review.rating),
          reviewer_name: review.reviewer_name,
          platform: review.platform,
          signature: sig,
          user_id: currentUser?.id ?? null,
        }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        response?: string;
        error?: string;
      };
      if (!res.ok || !json.success) {
        const err = json.error ?? "Failed to generate draft";
        setDrafts((prev) => ({
          ...prev,
          [id]: { text: "", loading: false, error: err },
        }));
        return;
      }
      setDrafts((prev) => ({
        ...prev,
        [id]: { text: json.response ?? "", loading: false },
      }));
    } catch (e) {
      setDrafts((prev) => ({
        ...prev,
        [id]: {
          text: "",
          loading: false,
          error: e instanceof Error ? e.message : "Request failed",
        },
      }));
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

  const myHotel30Trend = useMemo(
    () => compute30DayRatingTrend(reviewsTimeSeries),
    [reviewsTimeSeries],
  );

  const competitorTrendById = useMemo(() => {
    const map: Record<string, { text: string; color: string } | null> = {};
    for (const c of competitors) {
      const rows = competitorReviewsForTrend.filter((r) => r.competitor_id === c.id);
      map[c.id] = compute30DayRatingTrend(rows);
    }
    return map;
  }, [competitors, competitorReviewsForTrend]);

  const competitorCards = useMemo(() => {
    const hotelName = primaryHotel?.name?.trim() || "Your hotel";
    const mine = {
      id: "you",
      name: hotelName,
      rating: avgRating,
      isYou: true,
      trend: myHotel30Trend,
    };
    const rest = [...competitors]
      .filter((c) => c.avg_rating != null && !Number.isNaN(c.avg_rating))
      .sort((a, b) => (b.avg_rating ?? 0) - (a.avg_rating ?? 0))
      .map((c) => ({
        id: c.id,
        name: c.name,
        rating: c.avg_rating as number,
        isYou: false,
        trend: competitorTrendById[c.id] ?? null,
      }));
    const unrated = [...competitors]
      .filter((c) => c.avg_rating == null || Number.isNaN(c.avg_rating as number))
      .map((c) => ({
        id: c.id,
        name: c.name,
        rating: null as number | null,
        isYou: false,
        trend: competitorTrendById[c.id] ?? null,
      }));
    return [mine, ...rest, ...unrated];
  }, [primaryHotel?.name, avgRating, competitors, myHotel30Trend, competitorTrendById]);

  const tabActive = {
    overview: pathname === "/dashboard" || pathname === "/dashboard/",
    inbox: pathname?.startsWith("/dashboard/reviews"),
    sentiment: pathname?.startsWith("/dashboard/sentiment"),
    competitors: pathname?.startsWith("/dashboard/benchmarking"),
  };

  const urgentReviewsForDisplay = useMemo(
    () => (urgentReviewsList || []).filter((review) => passesUrgentReviewTextFilter(review)),
    [urgentReviewsList],
  );

  if (loading) {
    return (
      <div style={{ background: "#0d0d0d", minHeight: "100vh", padding: "24px 28px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                background: "#161616",
                border: "1px solid #1e1e1e",
                borderRadius: 10,
                padding: "20px 24px",
                height: 110,
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            />
          ))}
        </div>
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ background: "#0d0d0d", minHeight: "100vh", padding: "24px 28px", color: "#f87171" }}>
        <p style={{ marginBottom: 12 }}>{error}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            background: "#1e1e1e",
            border: "1px solid #2a2a2a",
            borderRadius: 6,
            padding: "7px 14px",
            fontSize: 12,
            color: "#f0f0f0",
            cursor: "pointer",
          }}
        >
          Retry
        </button>
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
            {pdfToast && (
              <div
                style={{
                  position: "fixed",
                  bottom: 24,
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "#1e1e1e",
                  border: "1px solid #2a2a2a",
                  borderRadius: 8,
                  padding: "10px 18px",
                  fontSize: 13,
                  color: "#f0f0f0",
                  zIndex: 9999,
                  whiteSpace: "nowrap",
                }}
              >
                PDF export coming soon — use Ctrl+P / Cmd+P to print for now
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                setPdfToast(true);
                setTimeout(() => setPdfToast(false), 3500);
              }}
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
        </div>
      </header>

      {/* ── Sync progress panel ─────────────────────────────────────────── */}
      {syncing && activeSyncPlatforms.length > 0 && (
        <div style={{ background: "#141414", border: "1px solid #1e1e1e", borderRadius: 8, padding: "14px 18px", marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: "#888888", marginBottom: 10 }}>Syncing reviews...</div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {activeSyncPlatforms.map((platform) => {
              const status = syncProgress[platform];
              if (status === "idle") return null;
              const platformLabel = platform === "tripadvisor" ? "TripAdvisor" : platform === "google" ? "Google" : platform === "booking" ? "Booking" : platform === "trip" ? "Trip.com" : platform === "expedia" ? "Expedia" : platform === "yelp" ? "Yelp" : platform;
              const platformColor = platform === "tripadvisor" ? "#4ade80" : platform === "google" ? "#60a5fa" : platform === "booking" ? "#a78bfa" : platform === "trip" ? "#60a5fa" : platform === "expedia" ? "#a78bfa" : "#f87171";
              return (
                <div key={platform} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {status === "syncing" ? (
                    <span style={{ display: "inline-block", width: 12, height: 12, border: "2px solid #333", borderTopColor: "#4ade80", borderRadius: "50%", animation: "dash-spin 0.8s linear infinite" }} />
                  ) : status === "done" ? (
                    <span style={{ color: "#4ade80", fontSize: 12, fontWeight: 600 }}>✓</span>
                  ) : (
                    <span style={{ color: "#f87171", fontSize: 12, fontWeight: 600 }}>✗</span>
                  )}
                  <span style={{ fontSize: 12, color: platformColor, fontWeight: 600 }}>{platformLabel}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Sync result panel ───────────────────────────────────────────── */}
      {syncResult && !syncing && (() => {
        const failedCount = syncResult.platforms.filter((p) => p.error).length;
        const succeededCount = syncResult.platforms.filter((p) => !p.error).length;
        const totalLine =
          failedCount > 0 && succeededCount === 0
            ? { text: "All platforms failed — check your URLs in Settings", color: "#f87171" }
            : failedCount > 0
              ? { text: `${succeededCount} platform${succeededCount !== 1 ? "s" : ""} synced · ${failedCount} failed — check your URLs in Settings`, color: "#fbbf24" }
              : syncResult.totalNew === 0
                ? { text: "No new reviews found · All platforms up to date", color: "#555555" }
                : { text: `${syncResult.totalNew} new review${syncResult.totalNew !== 1 ? "s" : ""} added · ${syncResult.totalReviews} total in inbox`, color: "#888888" };
        const secAgo = Math.floor((Date.now() - syncResult.timestamp.getTime()) / 1000);
        const tsLabel = secAgo < 60 ? "Just now" : secAgo < 3600 ? `${Math.floor(secAgo / 60)} min ago` : `${Math.floor(secAgo / 3600)}h ago`;
        return (
          <div style={{ background: "#0a1a0a", border: "1px solid #1a3a1a", borderRadius: 8, padding: "14px 18px", marginBottom: 16, position: "relative", overflow: "hidden", animation: "dash-sync-fadein 0.3s ease" }}>
            <style dangerouslySetInnerHTML={{ __html: "@keyframes dash-spin { to { transform: rotate(360deg); } } @keyframes dash-sync-fadein { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } } @keyframes dash-countdown { from { width:100%; } to { width:0%; } }" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#4ade80" }}>✓ Sync complete</span>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 11, color: "#444444" }}>{tsLabel}</span>
                <button
                  type="button"
                  onClick={() => setSyncResult(null)}
                  style={{ border: "none", background: "transparent", color: "#444444", fontSize: 16, cursor: "pointer", lineHeight: 1, fontFamily: "inherit" }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "#888888"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "#444444"; }}
                >×</button>
              </div>
            </div>
            {syncResult.platforms.length > 0 && (
              <div style={{ display: "flex", gap: 16, marginTop: 10, flexWrap: "wrap" }}>
                {syncResult.platforms.map((p) => {
                  const badgeStyle = p.platform === "tripadvisor"
                    ? { background: "#052e16", color: "#4ade80" }
                    : p.platform === "google"
                      ? { background: "#172554", color: "#60a5fa" }
                      : p.platform === "booking"
                        ? { background: "#1e1b4b", color: "#a78bfa" }
                        : p.platform === "trip"
                          ? { background: "#1e1b4b", color: "#60a5fa" }
                          : p.platform === "expedia"
                            ? { background: "#1a0a2e", color: "#a78bfa" }
                            : p.platform === "yelp"
                              ? { background: "#2d0a0a", color: "#f87171" }
                              : { background: "#1e1e1e", color: "#888888" };
                  const label = p.platform === "tripadvisor" ? "TripAdvisor" : p.platform === "google" ? "Google" : p.platform === "booking" ? "Booking" : p.platform === "trip" ? "Trip.com" : p.platform === "expedia" ? "Expedia" : p.platform === "yelp" ? "Yelp" : p.platform;
                  return (
                    <div key={p.platform} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ ...badgeStyle, borderRadius: 3, padding: "2px 7px", fontSize: 11, fontWeight: 600 }}>{label}</span>
                      {p.error ? (
                        <span style={{ fontSize: 12, color: "#f87171" }}>Failed</span>
                      ) : p.count > 0 ? (
                        <span style={{ fontSize: 12, color: "#4ade80", fontWeight: 600 }}>+{p.count} new</span>
                      ) : (
                        <span style={{ fontSize: 12, color: "#444444" }}>0 new</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <div style={{ fontSize: 12, color: totalLine.color, marginTop: 8 }}>{totalLine.text}</div>
            {syncResult.totalNew === 0 && failedCount === 0 && (
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: "#1a3a1a" }}>
                <div style={{ height: "100%", background: "#4ade80", animation: "dash-countdown 5s linear forwards" }} />
              </div>
            )}
          </div>
        );
      })()}

      {/* Upgrade toast after checkout */}
      {upgradeToast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#0a1a0a",
            border: "1px solid #1a3a1a",
            borderRadius: 8,
            padding: "12px 20px",
            fontSize: 13,
            color: "#4ade80",
            zIndex: 9999,
            whiteSpace: "nowrap",
            boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
          }}
        >
          {upgradeToast}
        </div>
      )}

      {/* FREE banner */}
      {(!subscriptionStatus || subscriptionStatus === "free") && (
        <div
          style={{
            background: "#111111",
            border: "1px solid #1e1e1e",
            borderRadius: 6,
            padding: "10px 16px",
            marginBottom: 16,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span style={{ fontSize: 13, color: "#888888" }}>
            Start your 7-day free trial — Professional from $199/mo
          </span>
          <button
            type="button"
            onClick={() => router.push("/dashboard/pricing")}
            style={{
              background: "transparent",
              border: "1px solid #2a2a2a",
              borderRadius: 4,
              padding: "5px 12px",
              fontSize: 11,
              color: "#888888",
              cursor: "pointer",
              whiteSpace: "nowrap",
              fontFamily: "inherit",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#f0f0f0"; e.currentTarget.style.borderColor = "#3a3a3a"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#888888"; e.currentTarget.style.borderColor = "#2a2a2a"; }}
          >
            View plans →
          </button>
        </div>
      )}

      {/* TRIAL banner */}
      {subscriptionStatus === "trialing" && (() => {
        const trialEnd = trialEndsAt ? new Date(trialEndsAt) : null;
        const daysLeft = trialEnd ? Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / 86400000)) : 0;
        return (
          <div
            style={{
              background: "#1a1200",
              border: "1px solid #2a2000",
              borderRadius: 6,
              padding: "10px 16px",
              marginBottom: 16,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
            }}
          >
            <span style={{ fontSize: 13, color: "#fbbf24" }}>
              Trial active — {daysLeft} day{daysLeft !== 1 ? "s" : ""} remaining
            </span>
            <button
              type="button"
              onClick={() => router.push("/dashboard/pricing")}
              style={{
                background: "transparent",
                border: "1px solid #3a2a00",
                borderRadius: 4,
                padding: "5px 12px",
                fontSize: 11,
                color: "#fbbf24",
                cursor: "pointer",
                whiteSpace: "nowrap",
                fontFamily: "inherit",
              }}
            >
              Add payment method →
            </button>
          </div>
        );
      })()}

      {/* ESSENTIAL AI limit warning */}
      {subscriptionStatus === "active" && subscriptionPlan === "essential" && aiDraftsUsed >= 8 && (
        <div
          style={{
            background: "#1a0a00",
            border: "1px solid #2a1a00",
            borderRadius: 6,
            padding: "10px 16px",
            marginBottom: 16,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span style={{ fontSize: 13, color: "#fbbf24" }}>
            You&apos;ve used {aiDraftsUsed}/10 AI drafts this month
          </span>
          <button
            type="button"
            onClick={() => router.push("/dashboard/pricing")}
            style={{
              background: "transparent",
              border: "1px solid #3a2a00",
              borderRadius: 4,
              padding: "5px 12px",
              fontSize: 11,
              color: "#fbbf24",
              cursor: "pointer",
              whiteSpace: "nowrap",
              fontFamily: "inherit",
            }}
          >
            Upgrade to Professional for unlimited →
          </button>
        </div>
      )}

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
            { id: "sentiment", label: "Sentiment", onClick: () => router.push("/dashboard/sentiment") },
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
          {!primaryHotel?.first_sync_completed &&
            (primaryHotel?.google_url || primaryHotel?.tripadvisor_url || primaryHotel?.booking_url || primaryHotel?.trip_url || primaryHotel?.expedia_url || primaryHotel?.yelp_url) && (
              <div
                style={{
                  background: "#0a1a0a",
                  border: "1px solid #1a3a1a",
                  borderRadius: 6,
                  padding: "12px 16px",
                  marginBottom: 16,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: "#4ade80", marginBottom: 4 }}>
                  Setting up your review history...
                </div>
                <div style={{ fontSize: 12, color: "#888888" }}>
                  Syncing your last 2 years of reviews. This may take a few minutes.
                </div>
              </div>
            )}

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
                subLabel: null as string | null,
                urgent: false,
              },
              {
                label: "Average rating",
                value: avgRating === null ? "—" : avgRating.toFixed(1),
                trend: { text: ratingMonthTrend.text, color: ratingMonthTrend.color },
                subLabel: weightedHistoricalCount != null && weightedTotalCount != null
                  ? `Based on ${weightedTotalCount} total (${weightedTotalCount - weightedHistoricalCount} recent + ${weightedHistoricalCount} historical)`
                  : weightedTotalCount != null
                    ? `Based on ${weightedTotalCount} reviews`
                    : null,
                urgent: false,
              },
              {
                label: "Needing response",
                value: String(needingResponse),
                trend: trendNeeding,
                subLabel: null as string | null,
                urgent: false,
              },
              {
                label: "Urgent",
                value: String(urgentCount),
                trend: { text: "needs response now", color: "rgba(239,68,68,0.7)" },
                subLabel: null as string | null,
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
                {card.subLabel ? (
                  <div style={{ fontSize: 11, color: "#444444", marginBottom: 4 }}>{card.subLabel}</div>
                ) : null}
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
                  const tr = c.trend;
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
                      {tr ? (
                        <div style={{ fontSize: 11, fontWeight: 500, color: tr.color, marginTop: 6 }}>
                          {tr.text}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section style={{ marginBottom: 16 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "#ef4444",
                }}
              >
                URGENT REVIEWS — NEEDS RESPONSE
              </div>
              <button
                type="button"
                onClick={() => router.push("/dashboard/reviews")}
                style={{
                  background: "#141414",
                  border: "1px solid #1e1e1e",
                  borderRadius: 4,
                  padding: "4px 10px",
                  fontSize: 11,
                  color: "#888888",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                View all {needingResponse}
              </button>
            </div>

            {urgentReviewsForDisplay.length === 0 ? (
              <div
                style={{
                  background: "#0a1a0a",
                  border: "1px solid #1a2e1a",
                  borderRadius: 8,
                  padding: "16px 18px",
                  fontSize: 13,
                  color: "#4ade80",
                }}
              >
                ✓ All caught up — no urgent reviews need response
              </div>
            ) : (
              <>
                <style
                  dangerouslySetInnerHTML={{
                    __html: `
                  @keyframes dash-draft-pulse {
                    0%, 100% { opacity: 0.45; }
                    50% { opacity: 1; }
                  }
                `,
                  }}
                />
                {urgentReviewsForDisplay.map((review) => {
                  const sb = sentimentBucket(review.sentiment);
                  const borderLeft =
                    sb === "negative" ? "#ef4444" : sb === "neutral" ? "#fbbf24" : "#4ade80";
                  const draft = drafts[review.id];
                  const topicRaw = (review.complaint_topic ?? review.topic ?? "").trim();
                  const topicParts = topicRaw
                    ? topicRaw.split(",").map((s) => s.trim()).filter(Boolean)
                    : [];
                  const nr = normalizeRating(review.rating);
                  return (
                    <div key={review.id}>
                      <div
                        style={{
                          background: "#141414",
                          border: "1px solid #1e1e1e",
                          borderRadius: 8,
                          padding: "16px 20px",
                          marginBottom: 8,
                          borderLeft: `3px solid ${borderLeft}`,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 12,
                            flexWrap: "wrap",
                          }}
                        >
                          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                            {urgentPlatformBadge(review.platform)}
                            <StarRow rating={nr} />
                          </div>
                          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                            <span style={{ fontSize: 13, color: "#888888", fontWeight: 500 }}>
                              {review.reviewer_name?.trim() || "Guest"}
                            </span>
                            <span style={{ fontSize: 11, color: "#444444" }}>
                              {formatTimeAgo(review.review_date || review.created_at)}
                            </span>
                          </div>
                        </div>
                        <p
                          style={{
                            marginTop: 10,
                            marginBottom: 0,
                            fontSize: 13,
                            color: "#cccccc",
                            lineHeight: 1.6,
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {(review.review_text ?? "").trim() || "—"}
                        </p>
                        <div
                          style={{
                            marginTop: 10,
                            display: "flex",
                            gap: 6,
                            alignItems: "center",
                            flexWrap: "wrap",
                          }}
                        >
                          <span
                            style={{
                              background:
                                sb === "negative"
                                  ? "#2d0a0a"
                                  : sb === "neutral"
                                    ? "#1a1a0a"
                                    : "#0a1a0a",
                              color:
                                sb === "negative"
                                  ? "#f87171"
                                  : sb === "neutral"
                                    ? "#fbbf24"
                                    : "#4ade80",
                              borderRadius: 3,
                              padding: "2px 8px",
                              fontSize: 11,
                              fontWeight: 500,
                            }}
                          >
                            {sb.charAt(0).toUpperCase() + sb.slice(1)}
                          </span>
                          {topicParts.map((tp) => (
                            <span
                              key={tp}
                              style={{
                                background: "#1e1e1e",
                                color: "#888888",
                                borderRadius: 3,
                                padding: "2px 8px",
                                fontSize: 11,
                              }}
                            >
                              {tp.charAt(0).toUpperCase() + tp.slice(1)}
                            </span>
                          ))}
                          <button
                            type="button"
                            onClick={() => void handleDraftAI(review)}
                            style={{
                              marginLeft: "auto",
                              background: "#f0f0f0",
                              color: "#0d0d0d",
                              border: "none",
                              borderRadius: 5,
                              padding: "6px 14px",
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: "pointer",
                              fontFamily: "inherit",
                            }}
                          >
                            Draft AI response
                          </button>
                        </div>
                      </div>

                      {draft?.loading ? (
                        <div
                          style={{
                            background: "#1a1a1a",
                            border: "1px solid #2a2a2a",
                            borderTop: "2px solid #4ade80",
                            borderRadius: "0 0 8px 8px",
                            padding: "14px 16px",
                            marginTop: -8,
                            marginBottom: 8,
                          }}
                        >
                          <div
                            style={{
                              color: "#555555",
                              fontSize: 13,
                              animation: "dash-draft-pulse 1.2s ease-in-out infinite",
                            }}
                          >
                            Generating response...
                          </div>
                        </div>
                      ) : null}

                      {draft && !draft.loading && draft.error ? (
                        <div
                          style={{
                            background: "#1a1a1a",
                            border: "1px solid #2a2a2a",
                            borderTop: "2px solid #4ade80",
                            borderRadius: "0 0 8px 8px",
                            padding: "14px 16px",
                            marginTop: -8,
                            marginBottom: 8,
                          }}
                        >
                          {draft.error.includes("ANTHROPIC") ? (
                            <p style={{ margin: 0, fontSize: 13, color: "#fbbf24" }}>
                              Add ANTHROPIC_API_KEY to enable AI responses
                            </p>
                          ) : (
                            <p style={{ margin: 0, fontSize: 13, color: "#f87171" }}>{draft.error}</p>
                          )}
                        </div>
                      ) : null}

                      {draft && !draft.loading && draft.text ? (
                        <div
                          style={{
                            background: "#1a1a1a",
                            border: "1px solid #2a2a2a",
                            borderTop: "2px solid #4ade80",
                            borderRadius: "0 0 8px 8px",
                            padding: "14px 16px",
                            marginTop: -8,
                            marginBottom: 8,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 10,
                              fontWeight: 600,
                              letterSpacing: "0.1em",
                              color: "#4ade80",
                              marginBottom: 8,
                            }}
                          >
                            AI DRAFT READY
                          </div>
                          <div style={{ fontSize: 13, color: "#cccccc", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                            {draft.text}
                          </div>
                          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(draft.text);
                                  setCopiedReviewId(review.id);
                                  window.setTimeout(() => setCopiedReviewId(null), 2000);
                                } catch {
                                  /* ignore */
                                }
                              }}
                              style={{
                                background: "#1e1e1e",
                                border: "1px solid #2a2a2a",
                                borderRadius: 5,
                                padding: "6px 14px",
                                fontSize: 12,
                                color: "#f0f0f0",
                                cursor: "pointer",
                                fontFamily: "inherit",
                              }}
                            >
                              {copiedReviewId === review.id ? "Copied!" : "Copy response"}
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleMarkResponded(review.id)}
                              style={{
                                background: "#f0f0f0",
                                color: "#0d0d0d",
                                border: "none",
                                borderRadius: 5,
                                padding: "6px 14px",
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: "pointer",
                                fontFamily: "inherit",
                              }}
                            >
                              Mark responded
                            </button>
                            <button
                              type="button"
                              onClick={() => router.push("/dashboard/reviews")}
                              style={{
                                background: "transparent",
                                border: "1px solid #2a2a2a",
                                borderRadius: 5,
                                padding: "6px 14px",
                                fontSize: 12,
                                color: "#888888",
                                cursor: "pointer",
                                fontFamily: "inherit",
                              }}
                            >
                              Edit
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default function DashboardOverviewPage() {
  return (
    <Suspense fallback={null}>
      <DashboardOverviewContent />
    </Suspense>
  );
}

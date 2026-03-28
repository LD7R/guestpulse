"use client";

import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";

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

  const [recentReviews, setRecentReviews] = useState<ReviewRow[]>([]);
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
      setRecentReviews([]);
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
      .select("rating")
      .in("hotel_id", hotelIds);

    if (ratingError) throw ratingError;

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

    const { data: recent, error: re } = await supabase
      .from("reviews")
      .select("id, platform, rating, reviewer_name, created_at, review_text, sentiment, responded")
      .in("hotel_id", hotelIds)
      .order("created_at", { ascending: false })
      .limit(5);

    if (re) throw re;
    setRecentReviews((recent ?? []) as ReviewRow[]);

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

  const sentimentBadge = (s: string | null | undefined) => {
    const x = normSentiment(s);
    if (x === "positive") {
      return (
        <span
          style={{
            fontSize: "11px",
            fontWeight: 600,
            padding: "2px 8px",
            borderRadius: "100px",
            background: "var(--success-bg)",
            color: "var(--success)",
            border: "1px solid var(--success-border)",
          }}
        >
          Positive
        </span>
      );
    }
    if (x === "negative") {
      return (
        <span
          style={{
            fontSize: "11px",
            fontWeight: 600,
            padding: "2px 8px",
            borderRadius: "100px",
            background: "var(--error-bg)",
            color: "var(--error)",
            border: "1px solid var(--error-border)",
          }}
        >
          Negative
        </span>
      );
    }
    return (
      <span
        style={{
          fontSize: "11px",
          fontWeight: 600,
          padding: "2px 8px",
          borderRadius: "100px",
          background: "var(--neutral-sentiment-bg)",
          color: "var(--text-secondary)",
          border: "1px solid var(--neutral-sentiment-border)",
        }}
      >
        Neutral
      </span>
    );
  };

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
            .command-center .cc-recent-row { display: grid; grid-template-columns: minmax(0,1fr) minmax(0,2fr) auto; gap: 12px; align-items: center; }
            .command-center .cc-platform-row { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 16px; }
            @media (max-width: 1024px) {
              .command-center .cc-stat-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            }
            @media (max-width: 768px) {
              .command-center .cc-stat-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
              .command-center .cc-recent-row { grid-template-columns: 1fr; }
              .command-center .cc-platform-row { grid-template-columns: 1fr; }
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

          <section style={{ marginBottom: "24px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "12px",
              }}
            >
              <h2 style={{ fontSize: "17px", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
                Recent reviews
              </h2>
              <Link
                href="/dashboard/reviews"
                style={{ fontSize: "14px", fontWeight: 500, color: "var(--accent)", textDecoration: "none" }}
              >
                View all →
              </Link>
            </div>
            {recentReviews.length === 0 ? (
              <div style={{ ...glass, padding: "20px", fontSize: "14px", color: "var(--text-secondary)" }}>
                No reviews yet. Click &apos;Sync reviews&apos; to get started.
              </div>
            ) : (
              recentReviews.map((r) => (
                <div
                  key={r.id}
                  className="cc-recent-row"
                  style={{
                    ...glass,
                    padding: "12px 16px",
                    borderRadius: "12px",
                    marginBottom: "10px",
                    transition: "transform 0.2s ease, border-color 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.borderColor = "var(--glass-hover-border)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.borderColor = "var(--glass-border)";
                  }}
                >
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px", minWidth: 0 }}>
                    {platformBadge(r.platform)}
                    <span style={{ fontWeight: 600, fontSize: "14px", color: "var(--text-primary)" }}>
                      {r.reviewer_name ?? "Guest"}
                    </span>
                    <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                      {r.created_at
                        ? new Date(r.created_at).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "—"}
                    </span>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: "var(--star)", fontSize: "14px", marginBottom: "4px" }}>
                      {"★".repeat(Math.min(5, Math.round(normalizeRating(r.rating) ?? 0)))}
                      <span style={{ color: "var(--text-muted)", marginLeft: "6px", fontSize: "12px" }}>
                        {normalizeRating(r.rating)?.toFixed(1) ?? "—"}
                      </span>
                    </div>
                    <p
                      style={{
                        fontSize: "13px",
                        color: "var(--text-secondary)",
                        margin: 0,
                        lineHeight: 1.5,
                      }}
                    >
                      {excerpt(r.review_text, 60)}
                    </p>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px", justifyContent: "flex-end" }}>
                    {sentimentBadge(r.sentiment)}
                    <button
                      type="button"
                      onClick={() => router.push("/dashboard/reviews")}
                      style={glassPrimary}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "var(--btn-primary-hover)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "var(--btn-primary-bg)";
                      }}
                    >
                      Draft response
                    </button>
                  </div>
                </div>
              ))
            )}
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

          {totalReviews > 0 ? (
            <section>
              <h2
                style={{
                  fontSize: "17px",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  marginBottom: "12px",
                }}
              >
                Platform health
              </h2>
              <div className="cc-platform-row">
                {platformHealth.map((p) => (
                  <div key={p.key} style={{ ...glass, padding: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                      <span
                        style={{
                          width: "10px",
                          height: "10px",
                          borderRadius: "50%",
                          background: p.dot,
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontWeight: 600, fontSize: "14px", color: "var(--text-primary)" }}>
                        {p.label}
                      </span>
                    </div>
                    <div style={{ fontSize: "24px", fontWeight: 700, color: "var(--text-primary)" }}>
                      {p.count === 0 ? "—" : p.avg.toFixed(1)}
                      <span style={{ fontSize: "13px", color: "var(--text-muted)", fontWeight: 500 }}> avg</span>
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
                      {p.count} review{p.count === 1 ? "" : "s"}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}

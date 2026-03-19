"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Hotel = {
  id: string;
  name?: string | null;
  tripadvisor_url?: string | null;
  google_url?: string | null;
  booking_url?: string | null;
};

type Review = {
  id?: string;
  hotel_id?: string;

  platform?: string | null;
  rating?: number | string | null;
  reviewer_name?: string | null;
  created_at?: string | null;
  review_text?: string | null;
  sentiment?: string | null;
  complaint_topic?: string | null;
  responded?: boolean | null;

  // Fallback field names (in case your schema uses different column names)
  source?: string | null;
  stars?: number | string | null;
  name?: string | null;
  date?: string | null;
  text?: string | null;
  body?: string | null;
  topic?: string | null;
  sentiment_label?: string | null;
  has_responded?: boolean | null;
  is_responded?: boolean | null;
};

function cn(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(" ");
}

function normalizeRating(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(n)) return null;
  return n;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

function renderStars(rating: number | null) {
  const safe = rating ?? 0;
  const filled = Math.max(0, Math.min(5, Math.round(safe)));
  if (filled <= 0) return <span className="text-xs text-zinc-500">No rating</span>;

  return (
    <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-300">
      {Array.from({ length: filled }).map((_, i) => (
        <span key={i} aria-hidden>
          ★
        </span>
      ))}
      <span className="ml-1 text-xs text-zinc-500 dark:text-zinc-400">{safe.toFixed(1)}</span>
    </span>
  );
}

function platformBadge(platform: string | null | undefined) {
  const p = (platform ?? "").toLowerCase();
  if (p === "tripadvisor") {
    return cn(
      "inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800",
      "dark:border-emerald-800/40 dark:bg-emerald-900/20 dark:text-emerald-200",
    );
  }
  if (p === "google") {
    return cn(
      "inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-800",
      "dark:border-blue-800/40 dark:bg-blue-900/20 dark:text-blue-200",
    );
  }
  if (p === "booking") {
    return cn(
      "inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800",
      "dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-200",
    );
  }
  return cn(
    "inline-flex items-center rounded-full border border-[#222222] bg-[#0f0f0f] px-2 py-0.5 text-xs font-medium text-[#888888]",
  );
}

function sentimentBadge(sentiment: string | null | undefined) {
  const s = (sentiment ?? "").toLowerCase();
  if (s === "positive") {
    return cn(
      "inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800",
      "dark:border-emerald-800/40 dark:bg-emerald-900/20 dark:text-emerald-200",
    );
  }
  if (s === "negative") {
    return cn(
      "inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700",
      "dark:border-red-800/40 dark:bg-red-900/20 dark:text-red-200",
    );
  }
  return cn(
    "inline-flex items-center rounded-full border border-[#222222] bg-[#0f0f0f] px-2 py-0.5 text-xs font-medium text-[#888888]",
  );
}

function SyncAllButton({
  syncing,
  onSync,
  label,
}: {
  syncing: boolean;
  onSync: () => Promise<void>;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onSync}
      disabled={syncing}
      className="inline-flex h-10 items-center justify-center rounded-[8px] bg-[#6366f1] px-[20px] text-sm font-medium text-white shadow-sm transition hover:bg-[#4f46e5] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {syncing ? (
        <span className="inline-flex items-center gap-2">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-50" />
          Syncing…
        </span>
      ) : (
        label
      )}
    </button>
  );
}

export default function ReviewsInboxPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncBreakdown, setSyncBreakdown] = useState<{
    tripadvisor: number;
    google: number;
    booking: number;
  } | null>(null);

  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [sentimentFilter, setSentimentFilter] = useState<string>("all");
  const [respondedFilter, setRespondedFilter] = useState<string>("all");

  const visibleReviews = useMemo(() => {
    return reviews.filter((r) => {
      const platform = (r.platform ?? r.source ?? "").toString().toLowerCase();
      const sentimentRaw = (r.sentiment ?? r.sentiment_label ?? "").toString().toLowerCase();
      const sentiment =
        sentimentRaw === "positive" ? "positive" : sentimentRaw === "negative" ? "negative" : "neutral";

      const responded =
        r.responded ?? r.has_responded ?? r.is_responded ?? false;

      const platformOk =
        platformFilter === "all" ? true : platform === platformFilter;

      const sentimentOk =
        sentimentFilter === "all" ? true : sentiment === sentimentFilter;

      const respondedOk =
        respondedFilter === "all"
          ? true
          : respondedFilter === "responded"
            ? Boolean(responded)
            : !Boolean(responded);

      return platformOk && sentimentOk && respondedOk;
    });
  }, [reviews, platformFilter, sentimentFilter, respondedFilter]);

  async function syncPlatform(
    platform: "tripadvisor" | "google" | "booking",
    url: string,
    hotelId: string,
  ) {
    try {
      const res = await fetch("/api/scrape-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotel_id: hotelId,
          url,
          platform,
        }),
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
    try {
      setSyncing(true);

      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw new Error(userError.message);
      }

      if (!user?.id) {
        throw new Error("You must be signed in to sync reviews.");
      }

      const { data: hotel, error: hotelError } = await supabase
        .from("hotels")
        .select("id, tripadvisor_url, google_url, booking_url")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (hotelError) {
        throw new Error(hotelError.message);
      }

      if (!hotel?.id) {
        throw new Error("No hotel found. Add one in Settings first.");
      }

      const tripadvisorUrl =
        typeof hotel.tripadvisor_url === "string" ? hotel.tripadvisor_url.trim() : "";
      const googleUrl =
        typeof hotel.google_url === "string" ? hotel.google_url.trim() : "";
      const bookingUrl =
        typeof hotel.booking_url === "string" ? hotel.booking_url.trim() : "";

      const platformTasks = [
        tripadvisorUrl
          ? syncPlatform("tripadvisor", tripadvisorUrl, hotel.id)
          : null,
        googleUrl ? syncPlatform("google", googleUrl, hotel.id) : null,
        bookingUrl ? syncPlatform("booking", bookingUrl, hotel.id) : null,
      ].filter(Boolean) as Promise<{
        platform: "tripadvisor" | "google" | "booking";
        count: number;
        error: string | null;
      }>[];

      if (platformTasks.length === 0) {
        setSyncMessage("Synced 0 new reviews across 0 platforms");
        setSyncBreakdown({ tripadvisor: 0, google: 0, booking: 0 });
        return;
      }

      const results = await Promise.all(platformTasks);

      const totalSynced = results.reduce((sum, r) => sum + (r?.count || 0), 0);
      const platformCount = results.filter((r) => (r?.count ?? 0) > 0).length;
      const breakdown = {
        tripadvisor: results.find((r) => r.platform === "tripadvisor")?.count ?? 0,
        google: results.find((r) => r.platform === "google")?.count ?? 0,
        booking: results.find((r) => r.platform === "booking")?.count ?? 0,
      };

      const failed = results.filter((r) => r.error);
      if (failed.length > 0) {
        setSyncError(
          `Some platforms failed: ${failed
            .map((f) => `${f.platform}: ${f.error}`)
            .join(" | ")}`,
        );
      }

      setSyncBreakdown(breakdown);
      setSyncMessage(
        `Synced ${totalSynced} new reviews across ${platformCount} platforms`,
      );
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setSyncError(
        err instanceof Error ? err.message : "Failed to sync reviews.",
      );
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    let isCancelled = false;

    async function fetchInbox() {
      setLoading(true);
      setError(null);

      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        if (!isCancelled) {
          setError(userError.message);
          setLoading(false);
        }
        return;
      }

      // Confirm the user object before any DB queries.
      if (!user || typeof user.id !== "string" || !user.id) {
        if (!isCancelled) {
          setError("You must be signed in to view reviews.");
          setLoading(false);
        }
        return;
      }

      const { data: hotels, error: hotelsError } = await supabase
        .from("hotels")
        .select("id")
        .eq("user_id", user.id);

      if (hotelsError) {
        if (!isCancelled) {
          setError(hotelsError.message);
          setLoading(false);
        }
        return;
      }

      const hotelIds = (hotels ?? []).map((h: Hotel) => h.id).filter(Boolean);

      if (hotelIds.length === 0) {
        if (!isCancelled) {
          setReviews([]);
          setLoading(false);
        }
        return;
      }

      const { data: reviewsData, error: reviewsError } = await supabase
        .from("reviews")
        .select("*")
        .in("hotel_id", hotelIds)
        .order("created_at", { ascending: false });

      if (reviewsError) {
        if (!isCancelled) {
          setError(reviewsError.message);
          setLoading(false);
        }
        return;
      }

      if (!isCancelled) {
        setReviews((reviewsData ?? []) as Review[]);
        setLoading(false);
      }
    }

    fetchInbox().catch((e) => {
      if (isCancelled) return;
      setError(e instanceof Error ? e.message : "Failed to load reviews.");
      setLoading(false);
    });

    return () => {
      isCancelled = true;
    };
  }, [refreshKey]);

  const summary = useMemo(() => {
    const total = reviews.length;

    const ratings = reviews
      .map((r) => normalizeRating(r.rating ?? r.stars))
      .filter((n): n is number => typeof n === "number" && !Number.isNaN(n));

    const avgRating =
      ratings.length === 0 ? null : ratings.reduce((a, b) => a + b, 0) / ratings.length;

    const needingResponse = reviews.filter((r) => {
      const responded =
        r.responded ?? r.has_responded ?? r.is_responded ?? false;
      return !responded;
    }).length;

    return { total, avgRating, needingResponse };
  }, [reviews]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-16 dark:bg-black">
        <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-5 py-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-50" />
          <span className="text-sm text-zinc-700 dark:text-zinc-200">Loading reviews…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-16 dark:bg-black">
        <div className="w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Error</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{error}</p>
        </div>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="space-y-5">
        <nav className="flex items-center gap-2 text-sm text-[#888888]">
          <Link href="/dashboard" className="hover:text-white">
            Overview
          </Link>
          <span className="text-[#444444]">/</span>
          <span className="text-[#888888]">Reviews inbox</span>
        </nav>

        <div className="rounded-2xl border border-[#222222] bg-[#111111] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-white">
              Reviews inbox
            </h1>
            <SyncAllButton
              syncing={syncing}
              onSync={handleSyncAllReviews}
              label="Sync all reviews"
            />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-[#222222] bg-[#111111] p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-[#888888]">
                Total reviews
              </div>
              <div className="mt-1 text-3xl font-semibold text-white">
                {summary.total}
              </div>
            </div>
            <div className="rounded-xl border border-[#222222] bg-[#111111] p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-[#888888]">
                Average rating
              </div>
              <div className="mt-1 text-3xl font-semibold text-white">
                {summary.avgRating === null ? "—" : summary.avgRating.toFixed(2)}
              </div>
            </div>
            <div className="rounded-xl border border-[#222222] bg-[#111111] p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-[#888888]">
                Needing response
              </div>
              <div className="mt-1 text-3xl font-semibold text-white">
                {summary.needingResponse}
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="space-y-2">
              <div className="text-sm font-medium text-[#888888]">Platform</div>
              <select
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value)}
                className="h-11 w-full rounded-[8px] border border-[#222222] bg-[#0f0f0f] px-3 text-sm text-white outline-none focus:border-[#6366f1]"
              >
                <option value="all">All</option>
                <option value="tripadvisor">TripAdvisor</option>
                <option value="google">Google</option>
                <option value="booking">Booking.com</option>
              </select>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-[#888888]">Sentiment</div>
              <select
                value={sentimentFilter}
                onChange={(e) => setSentimentFilter(e.target.value)}
                className="h-11 w-full rounded-[8px] border border-[#222222] bg-[#0f0f0f] px-3 text-sm text-white outline-none focus:border-[#6366f1]"
              >
                <option value="all">All</option>
                <option value="positive">Positive</option>
                <option value="neutral">Neutral</option>
                <option value="negative">Negative</option>
              </select>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-[#888888]">Status</div>
              <select
                value={respondedFilter}
                onChange={(e) => setRespondedFilter(e.target.value)}
                className="h-11 w-full rounded-[8px] border border-[#222222] bg-[#0f0f0f] px-3 text-sm text-white outline-none focus:border-[#6366f1]"
              >
                <option value="all">All</option>
                <option value="needsResponse">Needs response</option>
                <option value="responded">Responded</option>
              </select>
            </div>
          </div>

          {syncError ? (
            <p className="mt-3 text-sm text-red-400">{syncError}</p>
          ) : null}
          {syncMessage ? (
            <p className="mt-3 text-sm text-emerald-300">{syncMessage}</p>
          ) : null}
          {syncBreakdown ? (
            <p className="mt-2 text-sm">
              <span className="text-[#888888]">Synced breakdown — </span>
              <span
                className={
                  syncBreakdown.tripadvisor > 0 ? "text-emerald-300" : "text-[#888888]"
                }
              >
                TripAdvisor: {syncBreakdown.tripadvisor}
              </span>
              <span className="text-[#888888]"> · </span>
              <span
                className={
                  syncBreakdown.google > 0 ? "text-emerald-300" : "text-[#888888]"
                }
              >
                Google: {syncBreakdown.google}
              </span>
              <span className="text-[#888888]"> · </span>
              <span
                className={
                  syncBreakdown.booking > 0 ? "text-emerald-300" : "text-[#888888]"
                }
              >
                Booking: {syncBreakdown.booking}
              </span>
            </p>
          ) : null}
        </div>

        <div className="rounded-2xl border border-[#222222] bg-[#111111] p-8">
          <p className="text-sm text-[#888888]">
            No reviews yet. Once guests leave feedback, it will show up here for response.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <nav className="flex items-center gap-2 text-sm text-[#888888]">
        <Link href="/dashboard" className="hover:text-white">
          Overview
        </Link>
        <span className="text-[#444444]">/</span>
        <span className="text-[#888888]">Reviews inbox</span>
      </nav>

      <div className="rounded-2xl border border-[#222222] bg-[#111111] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Reviews inbox
          </h1>
          <SyncAllButton
            syncing={syncing}
            onSync={handleSyncAllReviews}
            label="Sync all reviews"
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-[#222222] bg-[#111111] p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-[#888888]">
              Total reviews
            </div>
            <div className="mt-1 text-3xl font-semibold text-white">
              {summary.total}
            </div>
          </div>
          <div className="rounded-xl border border-[#222222] bg-[#111111] p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-[#888888]">
              Average rating
            </div>
            <div className="mt-1 text-3xl font-semibold text-white">
              {summary.avgRating === null ? "—" : summary.avgRating.toFixed(2)}
            </div>
          </div>
          <div className="rounded-xl border border-[#222222] bg-[#111111] p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-[#888888]">
              Needing response
            </div>
            <div className="mt-1 text-3xl font-semibold text-white">
              {summary.needingResponse}
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="space-y-2">
            <div className="text-sm font-medium text-[#888888]">Platform</div>
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="h-11 w-full rounded-[8px] border border-[#222222] bg-[#0f0f0f] px-3 text-sm text-white outline-none focus:border-[#6366f1]"
            >
              <option value="all">All</option>
              <option value="tripadvisor">TripAdvisor</option>
              <option value="google">Google</option>
              <option value="booking">Booking.com</option>
            </select>
          </div>
          <div className="space-y-2">
            <div className="text-sm font-medium text-[#888888]">Sentiment</div>
            <select
              value={sentimentFilter}
              onChange={(e) => setSentimentFilter(e.target.value)}
              className="h-11 w-full rounded-[8px] border border-[#222222] bg-[#0f0f0f] px-3 text-sm text-white outline-none focus:border-[#6366f1]"
            >
              <option value="all">All</option>
              <option value="positive">Positive</option>
              <option value="neutral">Neutral</option>
              <option value="negative">Negative</option>
            </select>
          </div>
          <div className="space-y-2">
            <div className="text-sm font-medium text-[#888888]">Status</div>
            <select
              value={respondedFilter}
              onChange={(e) => setRespondedFilter(e.target.value)}
              className="h-11 w-full rounded-[8px] border border-[#222222] bg-[#0f0f0f] px-3 text-sm text-white outline-none focus:border-[#6366f1]"
            >
              <option value="all">All</option>
              <option value="needsResponse">Needs response</option>
              <option value="responded">Responded</option>
            </select>
          </div>
        </div>

        {syncError ? (
          <p className="mt-3 text-sm text-red-400">{syncError}</p>
        ) : null}
        {syncMessage ? (
          <p className="mt-3 text-sm text-emerald-300">{syncMessage}</p>
        ) : null}
        {syncBreakdown ? (
          <p className="mt-2 text-sm">
            <span className="text-[#888888]">Synced breakdown — </span>
            <span
              className={
                syncBreakdown.tripadvisor > 0 ? "text-emerald-300" : "text-[#888888]"
              }
            >
              TripAdvisor: {syncBreakdown.tripadvisor}
            </span>
            <span className="text-[#888888]"> · </span>
            <span
              className={
                syncBreakdown.google > 0 ? "text-emerald-300" : "text-[#888888]"
              }
            >
              Google: {syncBreakdown.google}
            </span>
            <span className="text-[#888888]"> · </span>
            <span
              className={
                syncBreakdown.booking > 0 ? "text-emerald-300" : "text-[#888888]"
              }
            >
              Booking: {syncBreakdown.booking}
            </span>
          </p>
        ) : null}
      </div>

      <div className="space-y-4">
        {visibleReviews.map((review, idx) => {
            const platform = review.platform ?? review.source ?? "";
            const rating = normalizeRating(review.rating ?? review.stars);
            const reviewerName = review.reviewer_name ?? review.name ?? "Anonymous";
            const createdAt = review.created_at ?? review.date ?? null;
            const reviewText = review.review_text ?? review.body ?? review.text ?? "";
            const sentiment =
              review.sentiment ?? review.sentiment_label ?? "neutral";
            const complaintTopic = review.complaint_topic ?? review.topic ?? null;
            const responded = review.responded ?? review.has_responded ?? review.is_responded ?? false;

            return (
              <div
                key={review.id ?? `${idx}-${platform}-${createdAt}`}
                className="rounded-2xl border border-[#222222] bg-[#111111] p-6"
              >
                <div className="flex flex-wrap items-center gap-2 justify-between">
                  <div className="flex items-center gap-3">
                    <span className={platformBadge(platform)}>
                      {(platform ?? "").charAt(0).toUpperCase() + (platform ?? "").slice(1) || "Platform"}
                    </span>
                    {renderStars(rating)}
                  </div>

                  {responded ? (
                    <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800 dark:border-emerald-800/40 dark:bg-emerald-900/20 dark:text-emerald-200">
                      <span aria-hidden>✓</span> Responded
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {}}
                      className="inline-flex h-10 items-center justify-center rounded-[8px] bg-[#6366f1] px-[20px] text-sm font-medium text-white shadow-sm transition hover:bg-[#4f46e5]"
                    >
                      Draft response
                    </button>
                  )}
                </div>

                <div className="mt-4 text-sm text-[#888888]">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-white">
                      {reviewerName}
                    </span>
                    <span className="text-[#444444]">• {formatDate(createdAt)}</span>
                    <span className={sentimentBadge(sentiment)}>
                      {sentiment.charAt(0).toUpperCase() + sentiment.slice(1)}
                    </span>
                    {complaintTopic ? (
                      <span className="inline-flex items-center rounded-full bg-[#0f0f0f] px-2 py-1 text-xs font-medium text-[#888888] border border-[#222222]">
                        {complaintTopic}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="mt-3 text-white whitespace-pre-wrap text-sm leading-6">
                  {reviewText || "—"}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}


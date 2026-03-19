"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useEffect, useMemo, useState } from "react";

type Hotel = {
  id: string;
  name?: string | null;
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
    "inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs font-medium text-zinc-700",
    "dark:border-zinc-800 dark:bg-zinc-900/20 dark:text-zinc-200",
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
    "inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs font-medium text-zinc-700",
    "dark:border-zinc-800 dark:bg-zinc-900/20 dark:text-zinc-200",
  );
}

function SyncButton({
  syncing,
  onSync,
}: {
  syncing: boolean;
  onSync: () => Promise<void>;
}) {
  return (
    <button
      type="button"
      onClick={onSync}
      disabled={syncing}
      className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
    >
      {syncing ? (
        <span className="inline-flex items-center gap-2">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-50" />
          Syncing reviews…
        </span>
      ) : (
        "Sync reviews"
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
      <div className="flex flex-1 flex-col bg-zinc-50 px-4 py-12 dark:bg-black">
        <div className="w-full max-w-4xl mx-auto space-y-5">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                Reviews inbox
              </h1>
              <SyncButton
                syncing={syncing}
                onSync={async () => {
                  setSyncError(null);
                  setSyncMessage(null);

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

                    if (!user || !user.id) {
                      throw new Error("You must be signed in to sync reviews.");
                    }

                    const { data: hotel, error: hotelError } = await supabase
                      .from("hotels")
                      .select("id, tripadvisor_url")
                      .eq("user_id", user.id)
                      .limit(1)
                      .maybeSingle();

                    if (hotelError) {
                      throw new Error(hotelError.message);
                    }

                    if (!hotel?.id || !hotel.tripadvisor_url) {
                      throw new Error(
                        "No hotel with a TripAdvisor URL found for this user.",
                      );
                    }

                    const res = await fetch("/api/scrape-reviews", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        hotel_id: hotel.id,
                        tripadvisor_url: hotel.tripadvisor_url,
                      }),
                    });

                    const json = (await res.json()) as {
                      success?: boolean;
                      count?: number;
                      error?: string;
                      details?: string;
                    };

                    if (!res.ok || json.success !== true) {
                      throw new Error(
                        json.error ||
                          json.details ||
                          "Failed to sync reviews from TripAdvisor.",
                      );
                    }

                    const inserted = json.count ?? 0;
                    setSyncMessage(`Synced ${inserted} new reviews.`);

                    // Trigger refresh of the inbox data
                    setRefreshKey((key) => key + 1);
                  } catch (err) {
                    const message =
                      err instanceof Error
                        ? err.message
                        : "Failed to sync reviews.";
                    setSyncError(message);
                  } finally {
                    setSyncing(false);
                  }
                }}
              />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/20">
                <div className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Total reviews
                </div>
                <div className="mt-1 text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
                  {summary.total}
                </div>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/20">
                <div className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Average rating
                </div>
                <div className="mt-1 text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
                  {summary.avgRating === null ? "—" : summary.avgRating.toFixed(2)}
                </div>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/20">
                <div className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Needing response
                </div>
                <div className="mt-1 text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
                  {summary.needingResponse}
                </div>
              </div>
            </div>
            {syncError ? (
              <p className="mt-3 text-sm text-red-600 dark:text-red-400">
                {syncError}
              </p>
            ) : null}
            {syncMessage ? (
              <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-300">
                {syncMessage}
              </p>
            ) : null}
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              No reviews yet. Once guests leave feedback, it will show up here for response.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 px-4 py-12 dark:bg-black">
      <div className="w-full max-w-4xl mx-auto space-y-5">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Reviews inbox
            </h1>
            <SyncButton
              syncing={syncing}
              onSync={async () => {
                setSyncError(null);
                setSyncMessage(null);

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

                  if (!user || !user.id) {
                    throw new Error("You must be signed in to sync reviews.");
                  }

                  const { data: hotel, error: hotelError } = await supabase
                    .from("hotels")
                    .select("id, tripadvisor_url")
                    .eq("user_id", user.id)
                    .limit(1)
                    .maybeSingle();

                  if (hotelError) {
                    throw new Error(hotelError.message);
                  }

                  if (!hotel?.id || !hotel.tripadvisor_url) {
                    throw new Error(
                      "No hotel with a TripAdvisor URL found for this user.",
                    );
                  }

                  const res = await fetch("/api/scrape-reviews", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      hotel_id: hotel.id,
                      tripadvisor_url: hotel.tripadvisor_url,
                    }),
                  });

                  const json = (await res.json()) as {
                    success?: boolean;
                    count?: number;
                    error?: string;
                    details?: string;
                  };

                  if (!res.ok || json.success !== true) {
                    throw new Error(
                      json.error ||
                        json.details ||
                        "Failed to sync reviews from TripAdvisor.",
                    );
                  }

                  const inserted = json.count ?? 0;
                  setSyncMessage(`Synced ${inserted} new reviews.`);

                  // Trigger refresh of the inbox data
                  setRefreshKey((key) => key + 1);
                } catch (err) {
                  const message =
                    err instanceof Error
                      ? err.message
                      : "Failed to sync reviews.";
                  setSyncError(message);
                } finally {
                  setSyncing(false);
                }
              }}
            />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/20">
              <div className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Total reviews
              </div>
              <div className="mt-1 text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
                {summary.total}
              </div>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/20">
              <div className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Average rating
              </div>
              <div className="mt-1 text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
                {summary.avgRating === null ? "—" : summary.avgRating.toFixed(2)}
              </div>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/20">
              <div className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Needing response
              </div>
              <div className="mt-1 text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
                {summary.needingResponse}
              </div>
            </div>
          </div>

          {syncError ? (
            <p className="mt-3 text-sm text-red-600 dark:text-red-400">
              {syncError}
            </p>
          ) : null}
          {syncMessage ? (
            <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-300">
              {syncMessage}
            </p>
          ) : null}
        </div>

        <div className="space-y-4">
          {reviews.map((review, idx) => {
            const platform = review.platform ?? review.source ?? "";
            const rating = normalizeRating(review.rating ?? review.stars);
            const reviewerName = review.reviewer_name ?? review.name ?? "Anonymous";
            const createdAt = review.created_at ?? review.date ?? null;
            const reviewText = review.review_text ?? review.body ?? review.text ?? "";
            const sentiment = review.sentiment ?? review.sentiment_label ?? "";
            const complaintTopic = review.complaint_topic ?? review.topic ?? null;
            const responded = review.responded ?? review.has_responded ?? review.is_responded ?? false;

            return (
              <div
                key={review.id ?? `${idx}-${platform}-${createdAt}`}
                className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
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
                      className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
                    >
                      Draft response
                    </button>
                  )}
                </div>

                <div className="mt-4 text-sm text-zinc-700 dark:text-zinc-200">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-zinc-900 dark:text-zinc-50">
                      {reviewerName}
                    </span>
                    <span className="text-zinc-500 dark:text-zinc-400">• {formatDate(createdAt)}</span>
                    {sentiment ? (
                      <span className={sentimentBadge(sentiment)}>
                        {sentiment.charAt(0).toUpperCase() + sentiment.slice(1)}
                      </span>
                    ) : null}
                    {complaintTopic ? (
                      <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
                        {complaintTopic}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="mt-3 text-zinc-900 dark:text-zinc-50 whitespace-pre-wrap text-sm leading-6">
                  {reviewText || "—"}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


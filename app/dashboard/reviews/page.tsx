"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
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

const pagePad: CSSProperties = { padding: "40px 48px" };

const glass: CSSProperties = {
  background: "rgba(255, 255, 255, 0.05)",
  backdropFilter: "blur(24px) saturate(180%)",
  WebkitBackdropFilter: "blur(24px) saturate(180%)",
  border: "1px solid rgba(255, 255, 255, 0.09)",
  borderRadius: "20px",
  boxShadow:
    "0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
};

const glassPrimary: CSSProperties = {
  background: "rgba(99, 102, 241, 0.8)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(99, 102, 241, 0.4)",
  borderRadius: "12px",
  color: "#ffffff",
  fontWeight: 500,
  transition: "all 0.2s ease",
};

const glassSecondary: CSSProperties = {
  background: "rgba(255, 255, 255, 0.07)",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  borderRadius: "12px",
  color: "rgba(255, 255, 255, 0.92)",
  fontWeight: 500,
  transition: "all 0.2s ease",
};

const selectStyle: CSSProperties = {
  width: "100%",
  height: "44px",
  padding: "0 14px",
  borderRadius: "12px",
  background: "rgba(255, 255, 255, 0.06)",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  color: "rgba(255, 255, 255, 0.92)",
  fontSize: "14px",
  outline: "none",
  cursor: "pointer",
};

const glassInput: CSSProperties = {
  background: "rgba(255, 255, 255, 0.06)",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  borderRadius: "12px",
  padding: "12px 16px",
  color: "#ffffff",
  outline: "none",
  boxSizing: "border-box",
};

const statLabel: CSSProperties = {
  fontSize: "11px",
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "rgba(255, 255, 255, 0.35)",
};

const statNum: CSSProperties = {
  fontSize: "36px",
  fontWeight: 700,
  color: "#ffffff",
  marginTop: "8px",
};

const navLink: CSSProperties = {
  fontSize: "14px",
  color: "rgba(255, 255, 255, 0.5)",
  textDecoration: "none",
};

function SyncMessages({
  syncError,
  syncMessage,
  syncBreakdown,
}: {
  syncError: string | null;
  syncMessage: string | null;
  syncBreakdown: { tripadvisor: number; google: number; booking: number } | null;
}) {
  return (
    <>
      {syncError ? (
        <div
          style={{
            marginTop: "16px",
            padding: "12px 16px",
            borderRadius: "12px",
            background: "rgba(239, 68, 68, 0.08)",
            border: "1px solid rgba(239, 68, 68, 0.2)",
            fontSize: "14px",
            color: "#fca5a5",
          }}
        >
          {syncError}
        </div>
      ) : null}
      {syncMessage ? (
        <div
          style={{
            marginTop: "12px",
            padding: "12px 16px",
            borderRadius: "12px",
            background: "rgba(34, 197, 94, 0.08)",
            border: "1px solid rgba(34, 197, 94, 0.2)",
            fontSize: "14px",
            color: "rgba(255,255,255,0.9)",
          }}
        >
          {syncMessage}
        </div>
      ) : null}
      {syncBreakdown ? (
        <p style={{ marginTop: "12px", fontSize: "13px" }}>
          <span style={{ color: "rgba(255,255,255,0.35)" }}>Synced breakdown — </span>
          <span style={{ color: syncBreakdown.tripadvisor > 0 ? "#86efac" : "rgba(255,255,255,0.35)" }}>
            TripAdvisor: {syncBreakdown.tripadvisor}
          </span>
          <span style={{ color: "rgba(255,255,255,0.35)" }}> · </span>
          <span style={{ color: syncBreakdown.google > 0 ? "#86efac" : "rgba(255,255,255,0.35)" }}>
            Google: {syncBreakdown.google}
          </span>
          <span style={{ color: "rgba(255,255,255,0.35)" }}> · </span>
          <span style={{ color: syncBreakdown.booking > 0 ? "#86efac" : "rgba(255,255,255,0.35)" }}>
            Booking: {syncBreakdown.booking}
          </span>
        </p>
      ) : null}
    </>
  );
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

function StarRow({ rating }: { rating: number | null }) {
  const safe = rating ?? 0;
  const filled = Math.max(0, Math.min(5, Math.round(safe)));
  if (filled <= 0) {
    return (
      <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)" }}>No rating</span>
    );
  }
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "2px",
        color: "#f59e0b",
        fontSize: "16px",
      }}
    >
      {Array.from({ length: filled }).map((_, i) => (
        <span key={i} aria-hidden>
          ★
        </span>
      ))}
      <span style={{ marginLeft: "6px", fontSize: "13px", color: "rgba(255,255,255,0.35)" }}>
        {safe.toFixed(1)}
      </span>
    </span>
  );
}

function PlatformBadge({ platform }: { platform: string | null | undefined }) {
  const p = (platform ?? "").toLowerCase();
  const label =
    (platform ?? "").charAt(0).toUpperCase() + (platform ?? "").slice(1) || "Platform";
  const base: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: "100px",
    padding: "4px 10px",
    fontSize: "12px",
    fontWeight: 600,
    border: "1px solid",
  };
  if (p === "tripadvisor") {
    return (
      <span style={{ ...base, background: "rgba(52, 211, 153, 0.15)", color: "#34d399", borderColor: "rgba(52, 211, 153, 0.25)" }}>
        {label}
      </span>
    );
  }
  if (p === "google") {
    return (
      <span style={{ ...base, background: "rgba(96, 165, 250, 0.15)", color: "#60a5fa", borderColor: "rgba(96, 165, 250, 0.25)" }}>
        {label}
      </span>
    );
  }
  if (p === "booking") {
    return (
      <span style={{ ...base, background: "rgba(167, 139, 250, 0.15)", color: "#a78bfa", borderColor: "rgba(167, 139, 250, 0.25)" }}>
        {label}
      </span>
    );
  }
  return (
    <span style={{ ...base, background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", borderColor: "rgba(255,255,255,0.1)" }}>
      {label}
    </span>
  );
}

function SentimentBadge({ sentiment }: { sentiment: string | null | undefined }) {
  const raw = (sentiment ?? "neutral").toString();
  const s = raw.toLowerCase();
  const base: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: "100px",
    padding: "4px 10px",
    fontSize: "12px",
    fontWeight: 600,
    border: "1px solid",
  };
  const text = raw.charAt(0).toUpperCase() + raw.slice(1);
  if (s === "positive") {
    return (
      <span style={{ ...base, background: "rgba(34, 197, 94, 0.15)", color: "#22c55e", borderColor: "rgba(34, 197, 94, 0.25)" }}>
        {text}
      </span>
    );
  }
  if (s === "negative") {
    return (
      <span style={{ ...base, background: "rgba(239, 68, 68, 0.15)", color: "#ef4444", borderColor: "rgba(239, 68, 68, 0.25)" }}>
        {text}
      </span>
    );
  }
  return (
    <span style={{ ...base, background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)", borderColor: "rgba(255,255,255,0.08)" }}>
      {text}
    </span>
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
      style={{
        ...glassPrimary,
        padding: "12px 24px",
        fontSize: "14px",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        opacity: syncing ? 0.65 : 1,
        cursor: syncing ? "not-allowed" : "pointer",
      }}
      onMouseEnter={(e) => {
        if (!syncing) e.currentTarget.style.background = "rgba(99, 102, 241, 1)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "rgba(99, 102, 241, 0.8)";
      }}
    >
      {syncing ? (
        <>
          <span
            style={{
              width: "16px",
              height: "16px",
              borderRadius: "50%",
              border: "2px solid rgba(255,255,255,0.3)",
              borderTopColor: "#fff",
              animation: "rvspin 0.8s linear infinite",
            }}
          />
          Syncing…
        </>
      ) : (
        label
      )}
    </button>
  );
}

type DraftState = {
  status: "idle" | "loading" | "done" | "error";
  text: string;
  copied: boolean;
  markingResponded: boolean;
  markError: string | null;
};

const defaultDraft = (): DraftState => ({
  status: "idle",
  text: "",
  copied: false,
  markingResponded: false,
  markError: null,
});

export default function ReviewsInboxPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // reviewId of the currently open draft panel (only one at a time)
  const [openDraftId, setOpenDraftId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, DraftState>>({});
  const draftAbortRef = useRef<AbortController | null>(null);

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

  function setDraft(reviewId: string, patch: Partial<DraftState>) {
    setDrafts((prev) => ({
      ...prev,
      [reviewId]: { ...defaultDraft(), ...prev[reviewId], ...patch },
    }));
  }

  async function handleDraftResponse(review: Review) {
    const id = review.id;
    if (!id) return;

    if (openDraftId === id) {
      draftAbortRef.current?.abort();
      draftAbortRef.current = null;
      setOpenDraftId(null);
      return;
    }

    draftAbortRef.current?.abort();
    const controller = new AbortController();
    draftAbortRef.current = controller;

    setOpenDraftId(id);

    if (drafts[id]?.status === "done") {
      draftAbortRef.current = null;
      return;
    }

    setDraft(id, {
      status: "loading",
      text: "",
      markError: null,
      copied: false,
    });

    try {
      const res = await fetch("/api/draft-response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          review_text: review.review_text ?? review.body ?? review.text ?? "",
          rating: review.rating ?? review.stars ?? null,
          reviewer_name: review.reviewer_name ?? review.name ?? null,
          platform: review.platform ?? review.source ?? null,
        }),
        signal: controller.signal,
      });

      const json = (await res.json()) as {
        success?: boolean;
        response?: string;
        error?: string;
      };

      if (controller.signal.aborted) return;

      if (!res.ok || json.success !== true || !json.response) {
        throw new Error(json.error ?? "Failed to generate draft");
      }

      setDraft(id, { status: "done", text: json.response });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setDraft(id, {
        status: "error",
        text: err instanceof Error ? err.message : "Failed to generate draft",
      });
    } finally {
      if (draftAbortRef.current === controller) {
        draftAbortRef.current = null;
      }
    }
  }

  async function handleMarkResponded(reviewId: string) {
    setDraft(reviewId, { markingResponded: true, markError: null });

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    const { error: updateError } = await supabase
      .from("reviews")
      .update({ responded: true })
      .eq("id", reviewId);

    if (updateError) {
      setDraft(reviewId, {
        markingResponded: false,
        markError: updateError.message,
      });
      return;
    }

    setReviews((prev) =>
      prev.map((r) => (r.id === reviewId ? { ...r, responded: true } : r)),
    );
    setOpenDraftId(null);
    setDraft(reviewId, {
      markingResponded: false,
      markError: null,
      status: "idle",
      text: "",
    });
  }

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
      <div style={{ ...pagePad, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <div style={{ ...glass, padding: "20px 28px", display: "flex", alignItems: "center", gap: "12px" }}>
          <span
            style={{
              width: "20px",
              height: "20px",
              borderRadius: "50%",
              border: "2px solid rgba(255,255,255,0.1)",
              borderTopColor: "#6366f1",
              animation: "rvspin 0.8s linear infinite",
            }}
          />
          <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.5)" }}>Loading reviews…</span>
        </div>
        <style dangerouslySetInnerHTML={{ __html: `@keyframes rvspin { to { transform: rotate(360deg); } }` }} />
      </div>
    );
  }

  if (error) {
    return (
      <div style={pagePad}>
        <div style={{ ...glass, padding: "24px", maxWidth: "560px" }}>
          <h1 style={{ fontSize: "17px", fontWeight: 600, color: "rgba(255,255,255,0.92)", marginBottom: "8px" }}>Error</h1>
          <p style={{ fontSize: "14px", color: "#fca5a5", lineHeight: 1.6 }}>{error}</p>
        </div>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div style={{ ...pagePad, display: "flex", flexDirection: "column", gap: "20px" }}>
        <nav style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px" }}>
          <Link href="/dashboard" style={navLink}>
            Overview
          </Link>
          <span style={{ color: "rgba(255,255,255,0.2)" }}>/</span>
          <span style={{ color: "rgba(255,255,255,0.35)" }}>Reviews inbox</span>
        </nav>

        <div style={{ ...glass, padding: "24px" }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
            <h1 style={{ fontSize: "26px", fontWeight: 700, letterSpacing: "-0.5px", color: "rgba(255,255,255,0.92)" }}>
              Reviews inbox
            </h1>
            <SyncAllButton syncing={syncing} onSync={handleSyncAllReviews} label="Sync all reviews" />
          </div>

          <div style={{ marginTop: "20px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px" }}>
            <div style={{ ...glass, padding: "16px", background: "rgba(255,255,255,0.04)" }}>
              <div style={statLabel}>Total reviews</div>
              <div style={statNum}>{summary.total}</div>
            </div>
            <div style={{ ...glass, padding: "16px", background: "rgba(255,255,255,0.04)" }}>
              <div style={statLabel}>Average rating</div>
              <div style={statNum}>{summary.avgRating === null ? "—" : summary.avgRating.toFixed(2)}</div>
            </div>
            <div style={{ ...glass, padding: "16px", background: "rgba(255,255,255,0.04)" }}>
              <div style={statLabel}>Needing response</div>
              <div style={statNum}>{summary.needingResponse}</div>
            </div>
          </div>

          <div style={{ ...glass, marginTop: "16px", padding: "16px 20px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px" }}>
            <div>
              <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", marginBottom: "8px" }}>Platform</div>
              <select
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value)}
                style={selectStyle}
              >
                <option value="all">All</option>
                <option value="tripadvisor">TripAdvisor</option>
                <option value="google">Google</option>
                <option value="booking">Booking.com</option>
              </select>
            </div>
            <div>
              <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", marginBottom: "8px" }}>Sentiment</div>
              <select
                value={sentimentFilter}
                onChange={(e) => setSentimentFilter(e.target.value)}
                style={selectStyle}
              >
                <option value="all">All</option>
                <option value="positive">Positive</option>
                <option value="neutral">Neutral</option>
                <option value="negative">Negative</option>
              </select>
            </div>
            <div>
              <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", marginBottom: "8px" }}>Status</div>
              <select
                value={respondedFilter}
                onChange={(e) => setRespondedFilter(e.target.value)}
                style={selectStyle}
              >
                <option value="all">All</option>
                <option value="needsResponse">Needs response</option>
                <option value="responded">Responded</option>
              </select>
            </div>
          </div>

          <SyncMessages syncError={syncError} syncMessage={syncMessage} syncBreakdown={syncBreakdown} />
        </div>

        <div style={{ ...glass, padding: "28px" }}>
          <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.5)", lineHeight: 1.7 }}>
            No reviews yet. Once guests leave feedback, it will show up here for response.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...pagePad, display: "flex", flexDirection: "column", gap: "20px" }}>
      <nav style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px" }}>
        <Link href="/dashboard" style={navLink}>
          Overview
        </Link>
        <span style={{ color: "rgba(255,255,255,0.2)" }}>/</span>
        <span style={{ color: "rgba(255,255,255,0.35)" }}>Reviews inbox</span>
      </nav>

      <div style={{ ...glass, padding: "24px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
          <h1 style={{ fontSize: "26px", fontWeight: 700, letterSpacing: "-0.5px", color: "rgba(255,255,255,0.92)" }}>
            Reviews inbox
          </h1>
          <SyncAllButton syncing={syncing} onSync={handleSyncAllReviews} label="Sync all reviews" />
        </div>

        <div style={{ marginTop: "20px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px" }}>
          <div style={{ ...glass, padding: "16px", background: "rgba(255,255,255,0.04)" }}>
            <div style={statLabel}>Total reviews</div>
            <div style={statNum}>{summary.total}</div>
          </div>
          <div style={{ ...glass, padding: "16px", background: "rgba(255,255,255,0.04)" }}>
            <div style={statLabel}>Average rating</div>
            <div style={statNum}>{summary.avgRating === null ? "—" : summary.avgRating.toFixed(2)}</div>
          </div>
          <div style={{ ...glass, padding: "16px", background: "rgba(255,255,255,0.04)" }}>
            <div style={statLabel}>Needing response</div>
            <div style={statNum}>{summary.needingResponse}</div>
          </div>
        </div>

        <div style={{ ...glass, marginTop: "16px", padding: "16px 20px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px" }}>
          <div>
            <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", marginBottom: "8px" }}>Platform</div>
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              style={selectStyle}
            >
              <option value="all">All</option>
              <option value="tripadvisor">TripAdvisor</option>
              <option value="google">Google</option>
              <option value="booking">Booking.com</option>
            </select>
          </div>
          <div>
            <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", marginBottom: "8px" }}>Sentiment</div>
            <select
              value={sentimentFilter}
              onChange={(e) => setSentimentFilter(e.target.value)}
              style={selectStyle}
            >
              <option value="all">All</option>
              <option value="positive">Positive</option>
              <option value="neutral">Neutral</option>
              <option value="negative">Negative</option>
            </select>
          </div>
          <div>
            <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", marginBottom: "8px" }}>Status</div>
            <select
              value={respondedFilter}
              onChange={(e) => setRespondedFilter(e.target.value)}
              style={selectStyle}
            >
              <option value="all">All</option>
              <option value="needsResponse">Needs response</option>
              <option value="responded">Responded</option>
            </select>
          </div>
        </div>

        <SyncMessages syncError={syncError} syncMessage={syncMessage} syncBreakdown={syncBreakdown} />
      </div>

      <style dangerouslySetInnerHTML={{ __html: `@keyframes rvspin { to { transform: rotate(360deg); } }` }} />
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
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

            const reviewId = review.id ?? `${idx}-${platform}-${createdAt}`;
            const draft = drafts[reviewId] ?? defaultDraft();
            const isPanelOpen = openDraftId === reviewId;
            const hasStableId = Boolean(review.id);

            return (
              <div
                key={reviewId}
                style={{
                  ...glass,
                  padding: "24px",
                  transition: "transform 0.2s ease, border-color 0.2s ease, background 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.14)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.09)";
                }}
              >
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                    <PlatformBadge platform={platform} />
                    <StarRow rating={rating} />
                  </div>

                  {responded ? (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        borderRadius: "100px",
                        padding: "6px 12px",
                        fontSize: "12px",
                        fontWeight: 600,
                        background: "rgba(34, 197, 94, 0.15)",
                        color: "#22c55e",
                        border: "1px solid rgba(34, 197, 94, 0.25)",
                      }}
                    >
                      <span aria-hidden>✓</span> Responded
                    </span>
                  ) : hasStableId ? (
                    <button
                      type="button"
                      onClick={() => handleDraftResponse(review)}
                      disabled={isPanelOpen && draft.status === "loading"}
                      style={{
                        ...glassPrimary,
                        padding: "8px 16px",
                        fontSize: "13px",
                        opacity: isPanelOpen && draft.status === "loading" ? 0.65 : 1,
                        cursor: isPanelOpen && draft.status === "loading" ? "not-allowed" : "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                      onMouseEnter={(e) => {
                        if (!(isPanelOpen && draft.status === "loading")) {
                          e.currentTarget.style.background = "rgba(99, 102, 241, 1)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "rgba(99, 102, 241, 0.8)";
                      }}
                    >
                      {isPanelOpen && draft.status === "loading" ? (
                        <>
                          <span
                            style={{
                              width: "14px",
                              height: "14px",
                              borderRadius: "50%",
                              border: "2px solid rgba(255,255,255,0.3)",
                              borderTopColor: "#fff",
                              animation: "rvspin 0.8s linear infinite",
                            }}
                          />
                          Generating...
                        </>
                      ) : isPanelOpen ? (
                        "Hide draft"
                      ) : (
                        "Draft response"
                      )}
                    </button>
                  ) : null}
                </div>

                <div style={{ marginTop: "16px" }}>
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "15px", fontWeight: 600, color: "#ffffff" }}>{reviewerName}</span>
                    <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.35)" }}>• {formatDate(createdAt)}</span>
                    <SentimentBadge sentiment={sentiment} />
                    {complaintTopic ? (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          borderRadius: "100px",
                          padding: "4px 10px",
                          fontSize: "13px",
                          background: "rgba(255,255,255,0.07)",
                          color: "rgba(255,255,255,0.35)",
                          border: "1px solid rgba(255,255,255,0.08)",
                        }}
                      >
                        {complaintTopic}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div
                  style={{
                    marginTop: "12px",
                    color: "rgba(255, 255, 255, 0.7)",
                    fontSize: "14px",
                    lineHeight: 1.7,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {reviewText || "—"}
                </div>

                {isPanelOpen && draft.status !== "idle" && hasStableId && (
                  <div
                    style={{
                      marginTop: "16px",
                      padding: "16px",
                      borderRadius: "16px",
                      background: "rgba(99, 102, 241, 0.05)",
                      border: "1px solid rgba(99, 102, 241, 0.15)",
                      backdropFilter: "blur(12px)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                    }}
                  >
                    {draft.status === "loading" ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", color: "rgba(255,255,255,0.45)" }}>
                        <span
                          style={{
                            width: "16px",
                            height: "16px",
                            borderRadius: "50%",
                            border: "2px solid rgba(255,255,255,0.1)",
                            borderTopColor: "#6366f1",
                            animation: "rvspin 0.8s linear infinite",
                          }}
                        />
                        Generating...
                      </div>
                    ) : draft.status === "error" ? (
                      <p style={{ fontSize: "14px", color: "#fca5a5" }}>{draft.text}</p>
                    ) : (
                      <>
                        <textarea
                          value={draft.text}
                          onChange={(e) => setDraft(reviewId, { text: e.target.value })}
                          rows={5}
                          style={{
                            ...glassInput,
                            width: "100%",
                            minHeight: "120px",
                            resize: "vertical",
                            fontSize: "14px",
                            lineHeight: 1.6,
                          }}
                          onFocus={(e) => {
                            e.target.style.borderColor = "rgba(99, 102, 241, 0.6)";
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = "rgba(255, 255, 255, 0.1)";
                          }}
                        />
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                          <button
                            type="button"
                            onClick={async () => {
                              await navigator.clipboard.writeText(draft.text);
                              setDraft(reviewId, { copied: true });
                              setTimeout(() => setDraft(reviewId, { copied: false }), 2000);
                            }}
                            style={{
                              ...glassSecondary,
                              padding: "10px 18px",
                              fontSize: "14px",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "rgba(255, 255, 255, 0.12)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "rgba(255, 255, 255, 0.07)";
                            }}
                          >
                            {draft.copied ? "Copied!" : "Copy"}
                          </button>
                          <button
                            type="button"
                            onClick={() => review.id && handleMarkResponded(review.id)}
                            disabled={draft.markingResponded}
                            style={{
                              ...glassPrimary,
                              padding: "10px 18px",
                              fontSize: "14px",
                              opacity: draft.markingResponded ? 0.6 : 1,
                              cursor: draft.markingResponded ? "not-allowed" : "pointer",
                            }}
                            onMouseEnter={(e) => {
                              if (!draft.markingResponded) {
                                e.currentTarget.style.background = "rgba(99, 102, 241, 1)";
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "rgba(99, 102, 241, 0.8)";
                            }}
                          >
                            {draft.markingResponded ? "Saving..." : "Mark as responded"}
                          </button>
                        </div>
                        {draft.markError ? (
                          <p style={{ fontSize: "14px", color: "#fca5a5" }}>{draft.markError}</p>
                        ) : null}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}


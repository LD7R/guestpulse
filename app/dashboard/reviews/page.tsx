"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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

  flagged?: boolean | null;
  internal_note?: string | null;
  flag_color?: string | null;
  review_date?: string | null;
  review_url?: string | null;
  topic_type?: string | null;
};


const glass: CSSProperties = {
  background: "var(--glass-bg)",
  backdropFilter: "blur(24px) saturate(180%)",
  WebkitBackdropFilter: "blur(24px) saturate(180%)",
  border: "1px solid var(--glass-border)",
  borderRadius: "var(--card-radius)",
  boxShadow: "var(--glass-shadow), var(--glass-inner)",
};

const glassPrimary: CSSProperties = {
  background: "var(--btn-primary-bg)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid var(--btn-primary-border)",
  borderRadius: "var(--btn-radius)",
  color: "var(--on-primary)",
  fontWeight: 500,
  transition: "all 0.2s ease",
};

const glassSecondary: CSSProperties = {
  background: "var(--secondary-btn-bg)",
  border: "1px solid var(--secondary-btn-border)",
  borderRadius: "var(--btn-radius)",
  color: "var(--text-primary)",
  fontWeight: 500,
  transition: "all 0.2s ease",
};

const selectStyle: CSSProperties = {
  width: "100%",
  height: "44px",
  padding: "0 14px",
  borderRadius: "var(--input-radius)",
  background: "var(--glass-input-bg)",
  border: "1px solid var(--glass-input-border)",
  color: "var(--text-primary)",
  fontSize: "14px",
  outline: "none",
  cursor: "pointer",
};

const glassInput: CSSProperties = {
  background: "var(--glass-input-bg)",
  border: "1px solid var(--glass-input-border)",
  borderRadius: "var(--input-radius)",
  padding: "12px 16px",
  color: "var(--input-text)",
  outline: "none",
  boxSizing: "border-box",
};

const statLabel: CSSProperties = {
  fontSize: "11px",
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--text-label)",
};

const statNum: CSSProperties = {
  fontSize: "36px",
  fontWeight: 700,
  color: "var(--text-primary)",
  marginTop: "8px",
};

const reviewsResponsiveCss = `
  @media (max-width: 768px) {
    .reviews-page .rv-filters {
      grid-template-columns: 1fr !important;
    }
    .reviews-page .rv-card-shell {
      padding: 16px !important;
    }
    .reviews-page .rv-star-row {
      font-size: 14px !important;
    }
    .reviews-page .rv-star-row span[aria-hidden] {
      font-size: 14px !important;
    }
    .reviews-page .rv-meta-row > div:first-child {
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
    }
    .reviews-page .rv-draft-wrap button {
      width: 100%;
      justify-content: center;
    }
  }
`;

const navLink: CSSProperties = {
  fontSize: "14px",
  color: "var(--text-secondary)",
  textDecoration: "none",
};

function Skeleton({
  width = "100%",
  height = "20px",
  radius = "8px",
}: {
  width?: string;
  height?: string;
  radius?: string;
}) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: radius,
        background: "var(--glass-bg)",
        border: "1px solid var(--glass-border)",
        animation: "skeleton-pulse 1.5s ease-in-out infinite",
      }}
    />
  );
}

function getReviewDate(r: Review): string | null {
  const v = r.review_date ?? r.created_at ?? r.date ?? null;
  return v || null;
}

function daysSinceReview(r: Review): number | null {
  const d = getReviewDate(r);
  if (!d) return null;
  const t = new Date(d).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / 86400000);
}

function agePillForReview(r: Review, responded: boolean): ReactNode {
  if (responded) return null;
  const days = daysSinceReview(r);
  if (days === null || days <= 2) return null;
  if (days >= 14) {
    return (
      <span
        style={{
          fontSize: "11px",
          fontWeight: 600,
          padding: "2px 8px",
          borderRadius: "100px",
          background: "rgba(239,68,68,0.15)",
          color: "#ef4444",
        }}
      >
        14d+ old
      </span>
    );
  }
  if (days >= 7) {
    return (
      <span
        style={{
          fontSize: "11px",
          fontWeight: 600,
          padding: "2px 8px",
          borderRadius: "100px",
          background: "rgba(249,115,22,0.15)",
          color: "#fb923c",
        }}
      >
        {days}d ago
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
        background: "rgba(245,158,11,0.15)",
        color: "#f59e0b",
      }}
    >
      {days}d ago
    </span>
  );
}

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
            borderRadius: "var(--btn-radius)",
            background: "var(--message-error-bg)",
            border: "1px solid var(--message-error-border)",
            fontSize: "14px",
            color: "var(--text-error-soft)",
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
            borderRadius: "var(--btn-radius)",
            background: "var(--message-success-bg)",
            border: "1px solid var(--message-success-border)",
            fontSize: "14px",
            color: "var(--text-primary)",
          }}
        >
          {syncMessage}
        </div>
      ) : null}
      {syncBreakdown ? (
        <p style={{ marginTop: "12px", fontSize: "13px" }}>
          <span style={{ color: "var(--text-label)" }}>Synced breakdown — </span>
          <span
            style={{
              color:
                syncBreakdown.tripadvisor > 0
                  ? "var(--breakdown-highlight)"
                  : "var(--text-label)",
            }}
          >
            TripAdvisor: {syncBreakdown.tripadvisor}
          </span>
          <span style={{ color: "var(--text-label)" }}> · </span>
          <span
            style={{
              color:
                syncBreakdown.google > 0
                  ? "var(--breakdown-highlight)"
                  : "var(--text-label)",
            }}
          >
            Google: {syncBreakdown.google}
          </span>
          <span style={{ color: "var(--text-label)" }}> · </span>
          <span
            style={{
              color:
                syncBreakdown.booking > 0
                  ? "var(--breakdown-highlight)"
                  : "var(--text-label)",
            }}
          >
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
      <span className="rv-star-row" style={{ fontSize: "12px", color: "var(--text-muted)" }}>
        No rating
      </span>
    );
  }
  return (
    <span
      className="rv-star-row"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "2px",
        color: "var(--star)",
        fontSize: "16px",
      }}
    >
      {Array.from({ length: filled }).map((_, i) => (
        <span key={i} aria-hidden>
          ★
        </span>
      ))}
      <span style={{ marginLeft: "6px", fontSize: "13px", color: "var(--text-label)" }}>
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
      <span
        style={{
          ...base,
          background: "var(--platform-ta-bg)",
          color: "var(--platform-ta)",
          borderColor: "var(--platform-ta-border)",
        }}
      >
        {label}
      </span>
    );
  }
  if (p === "google") {
    return (
      <span
        style={{
          ...base,
          background: "var(--platform-google-bg)",
          color: "var(--platform-google)",
          borderColor: "var(--platform-google-border)",
        }}
      >
        {label}
      </span>
    );
  }
  if (p === "booking") {
    return (
      <span
        style={{
          ...base,
          background: "var(--platform-booking-bg)",
          color: "var(--platform-booking)",
          borderColor: "var(--platform-booking-border)",
        }}
      >
        {label}
      </span>
    );
  }
  return (
    <span
      style={{
        ...base,
        background: "var(--glass-input-bg)",
        color: "var(--text-secondary)",
        borderColor: "var(--glass-input-border)",
      }}
    >
      {label}
    </span>
  );
}

function platformReviewLinkColor(platform: string | null | undefined): string {
  const p = (platform ?? "").toLowerCase();
  if (p === "tripadvisor") return "#34d399";
  if (p === "google") return "#60a5fa";
  if (p === "booking") return "#a78bfa";
  return "var(--accent)";
}

function platformViewOnLabel(platform: string | null | undefined): string {
  const p = (platform ?? "").toLowerCase();
  if (p === "tripadvisor") return "TripAdvisor";
  if (p === "google") return "Google";
  if (p === "booking") return "Booking.com";
  const raw = (platform ?? "Platform").trim();
  return raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : "Platform";
}

const IMPROVEMENT_TOPIC_PILL_COLORS: Record<string, string> = {
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

function improvementTopicColor(slug: string): string {
  return IMPROVEMENT_TOPIC_PILL_COLORS[slug.toLowerCase()] ?? "#ef4444";
}

function TopicPill({
  topicSlug,
  topicType,
}: {
  topicSlug: string;
  topicType: string | null | undefined;
}) {
  const tt = (topicType ?? "").toLowerCase().trim();
  const label = topicSlug.charAt(0).toUpperCase() + topicSlug.slice(1);
  if (tt === "strength") {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          borderRadius: "100px",
          padding: "4px 10px",
          fontSize: "13px",
          background: "rgba(34,197,94,0.12)",
          color: "#22c55e",
          border: "1px solid rgba(34,197,94,0.25)",
        }}
      >
        ✓ {label}
      </span>
    );
  }
  if (tt === "improvement") {
    const c = improvementTopicColor(topicSlug);
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          borderRadius: "100px",
          padding: "4px 10px",
          fontSize: "13px",
          background: `${c}22`,
          color: c,
          border: `1px solid ${c}55`,
        }}
      >
        ↑ {label}
      </span>
    );
  }
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: "100px",
        padding: "4px 10px",
        fontSize: "13px",
        background: "var(--complaint-pill-bg)",
        color: "var(--text-label)",
        border: "1px solid var(--complaint-pill-border)",
      }}
    >
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
      <span
        style={{
          ...base,
          background: "var(--success-bg)",
          color: "var(--success)",
          borderColor: "var(--success-border)",
        }}
      >
        {text}
      </span>
    );
  }
  if (s === "negative") {
    return (
      <span
        style={{
          ...base,
          background: "var(--error-bg)",
          color: "var(--error)",
          borderColor: "var(--error-border)",
        }}
      >
        {text}
      </span>
    );
  }
  return (
    <span
      style={{
        ...base,
        background: "var(--neutral-sentiment-bg)",
        color: "var(--text-secondary)",
        borderColor: "var(--neutral-sentiment-border)",
      }}
    >
      {text}
    </span>
  );
}

function SyncAllButton({
  syncing,
  onSync,
  label,
  disabledExternally,
}: {
  syncing: boolean;
  onSync: () => Promise<void>;
  label: string;
  disabledExternally?: boolean;
}) {
  const disabled = syncing || Boolean(disabledExternally);
  return (
    <button
      type="button"
      onClick={onSync}
      disabled={disabled}
      style={{
        ...glassPrimary,
        padding: "12px 24px",
        fontSize: "14px",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        opacity: disabled ? 0.65 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
      onMouseEnter={(e) => {
        if (!disabled)
          e.currentTarget.style.background = "var(--btn-primary-hover)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "var(--btn-primary-bg)";
      }}
    >
      {syncing ? (
        <>
          <span
            style={{
              width: "16px",
              height: "16px",
              borderRadius: "50%",
              border: "2px solid var(--spinner-track)",
              borderTopColor: "var(--on-primary)",
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

function AutoClassifyButton({
  classifying,
  onClassify,
  disabledExternally,
}: {
  classifying: boolean;
  onClassify: () => Promise<void>;
  disabledExternally?: boolean;
}) {
  const disabled = classifying || Boolean(disabledExternally);
  return (
    <button
      type="button"
      onClick={onClassify}
      disabled={disabled}
      style={{
        ...glassSecondary,
        padding: "12px 24px",
        fontSize: "14px",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        opacity: disabled ? 0.65 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.background = "var(--secondary-btn-hover)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "var(--secondary-btn-bg)";
      }}
    >
      {classifying ? (
        <>
          <span
            style={{
              width: "16px",
              height: "16px",
              borderRadius: "50%",
              border: "2px solid var(--spinner-track)",
              borderTopColor: "var(--text-primary)",
              animation: "rvspin 0.8s linear infinite",
            }}
          />
          Classifying…
        </>
      ) : (
        "Auto-classify"
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
  const [classifying, setClassifying] = useState(false);
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

  const [searchQuery, setSearchQuery] = useState("");
  const [periodDays, setPeriodDays] = useState<7 | 30 | 90 | "all">(30);
  const [sortBy, setSortBy] = useState<
    "newest" | "oldest" | "lowRating" | "highRating" | "needsFirst" | "flaggedFirst"
  >("newest");

  const [flagMenuOpenId, setFlagMenuOpenId] = useState<string | null>(null);

  const [noteEditorId, setNoteEditorId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

  useEffect(() => {
    function handle(e: MouseEvent) {
      const el = e.target as HTMLElement;
      if (el.closest("[data-flag-menu-root]")) return;
      setFlagMenuOpenId(null);
    }
    if (flagMenuOpenId) {
      document.addEventListener("mousedown", handle);
      return () => document.removeEventListener("mousedown", handle);
    }
  }, [flagMenuOpenId]);

  const visibleReviews = useMemo(() => {
    let list = reviews.filter((r) => {
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

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((r) => {
        const name = (r.reviewer_name ?? r.name ?? "").toLowerCase();
        const text = (r.review_text ?? r.body ?? r.text ?? "").toLowerCase();
        const topic = (r.complaint_topic ?? r.topic ?? "").toLowerCase();
        return name.includes(q) || text.includes(q) || topic.includes(q);
      });
    }

    if (periodDays !== "all") {
      const cut = Date.now() - periodDays * 86400000;
      list = list.filter((r) => {
        const d = getReviewDate(r);
        if (!d) return false;
        return new Date(d).getTime() >= cut;
      });
    }

    const ratingVal = (x: Review) => normalizeRating(x.rating ?? x.stars);
    const respondedVal = (x: Review) => x.responded ?? x.has_responded ?? x.is_responded ?? false;
    const flaggedVal = (x: Review) => Boolean(x.flagged);

    list = [...list].sort((a, b) => {
      const dateA = new Date(getReviewDate(a) || 0).getTime();
      const dateB = new Date(getReviewDate(b) || 0).getTime();
      const ra = ratingVal(a);
      const rb = ratingVal(b);
      const respA = respondedVal(a);
      const respB = respondedVal(b);
      const flA = flaggedVal(a);
      const flB = flaggedVal(b);

      switch (sortBy) {
        case "newest":
          return dateB - dateA;
        case "oldest":
          return dateA - dateB;
        case "lowRating": {
          const na = ra ?? 999;
          const nb = rb ?? 999;
          return na - nb;
        }
        case "highRating": {
          const na = ra ?? -1;
          const nb = rb ?? -1;
          return nb - na;
        }
        case "needsFirst": {
          if (respA === respB) return dateB - dateA;
          return respA ? 1 : -1;
        }
        case "flaggedFirst": {
          if (flA === flB) return dateB - dateA;
          return flA ? -1 : 1;
        }
        default:
          return dateB - dateA;
      }
    });

    return list;
  }, [
    reviews,
    platformFilter,
    sentimentFilter,
    respondedFilter,
    searchQuery,
    periodDays,
    sortBy,
  ]);

  const filteredCount = visibleReviews.length;
  const totalCount = reviews.length;

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

  async function updateReviewFlag(
    reviewId: string,
    patch: { flagged: boolean; flag_color?: "red" | "amber" | "green" },
  ) {
    setReviews((prev) =>
      prev.map((r) =>
        r.id === reviewId
          ? {
              ...r,
              flagged: patch.flagged,
              flag_color: patch.flagged ? patch.flag_color ?? r.flag_color ?? "red" : "red",
            }
          : r,
      ),
    );
    setFlagMenuOpenId(null);
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    const payload = patch.flagged
      ? { flagged: true as const, flag_color: patch.flag_color ?? "red" }
      : { flagged: false as const };
    const { error } = await supabase.from("reviews").update(payload).eq("id", reviewId);
    if (error) {
      console.error(error);
    }
  }

  async function saveInternalNote(reviewId: string, text: string) {
    const trimmed = text.trim();
    setReviews((prev) =>
      prev.map((r) => (r.id === reviewId ? { ...r, internal_note: trimmed || null } : r)),
    );
    setNoteEditorId(null);
    setNoteDraft("");
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    const { error } = await supabase
      .from("reviews")
      .update({ internal_note: trimmed || null })
      .eq("id", reviewId);
    if (error) {
      console.error(error);
    }
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

  async function handleAutoClassify() {
    setSyncError(null);
    setSyncMessage(null);
    setSyncBreakdown(null);
    try {
      setClassifying(true);

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
        throw new Error("You must be signed in to classify reviews.");
      }

      const { data: hotel, error: hotelError } = await supabase
        .from("hotels")
        .select("id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (hotelError) {
        throw new Error(hotelError.message);
      }

      if (!hotel?.id) {
        throw new Error("No hotel found. Add one in Settings first.");
      }

      const res = await fetch("/api/classify-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hotel_id: hotel.id }),
      });

      const json = (await res.json()) as {
        success?: boolean;
        classified?: number;
        total?: number;
        error?: string;
      };

      if (!res.ok || json.success !== true) {
        throw new Error(json.error ?? "Classification failed");
      }

      const total = json.total ?? 0;
      const n = json.classified ?? 0;
      setSyncMessage(
        total === 0
          ? "No reviews needed classification."
          : `Classified ${n} of ${total} review${total === 1 ? "" : "s"}.`,
      );
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setSyncError(
        err instanceof Error ? err.message : "Failed to classify reviews.",
      );
    } finally {
      setClassifying(false);
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

  const someReviewsMissingUrl = useMemo(
    () => reviews.length > 0 && reviews.some((r) => !r.review_url?.trim()),
    [reviews],
  );

  if (loading) {
    return (
      <div className="reviews-page" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <Skeleton width="200px" height="22px" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px" }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ ...glass, padding: "16px", minHeight: "88px" }}>
              <Skeleton width="50%" height="12px" />
              <div style={{ marginTop: "12px" }}>
                <Skeleton width="40%" height="28px" radius="10px" />
              </div>
            </div>
          ))}
        </div>
        <div style={{ ...glass, padding: "20px" }}>
          <Skeleton width="100%" height="44px" radius="12px" />
          <div style={{ marginTop: "16px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <Skeleton width="120px" height="32px" radius="100px" />
            <Skeleton width="200px" height="44px" radius="12px" />
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} style={{ ...glass, padding: "20px" }}>
              <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                <Skeleton width="56px" height="22px" radius="100px" />
                <Skeleton width="80px" height="16px" />
              </div>
              <Skeleton width="70%" height="14px" />
              <div style={{ marginTop: "8px" }}>
                <Skeleton width="50%" height="14px" />
              </div>
            </div>
          ))}
        </div>
        <style dangerouslySetInnerHTML={{ __html: `@keyframes rvspin { to { transform: rotate(360deg); } }` }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="reviews-page">
        <div style={{ ...glass, padding: "24px", maxWidth: "560px" }}>
          <h1
            style={{
              fontSize: "17px",
              fontWeight: 600,
              color: "var(--text-primary)",
              marginBottom: "8px",
            }}
          >
            Error
          </h1>
          <p style={{ fontSize: "14px", color: "var(--text-error-soft)", lineHeight: 1.6 }}>{error}</p>
        </div>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="reviews-page" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <nav style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px" }}>
          <Link href="/dashboard" style={navLink}>
            Dashboard
          </Link>
          <span style={{ color: "var(--text-subtle)" }}>/</span>
          <span style={{ color: "var(--text-label)" }}>Reviews inbox</span>
        </nav>

        <div style={{ ...glass, padding: "24px" }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
            <h1
              style={{
                fontSize: "26px",
                fontWeight: 700,
                letterSpacing: "-0.5px",
                color: "var(--text-primary)",
              }}
            >
              Reviews inbox
            </h1>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  gap: "10px",
                }}
              >
                <SyncAllButton
                  syncing={syncing}
                  disabledExternally={classifying}
                  onSync={handleSyncAllReviews}
                  label="Sync all reviews"
                />
                <AutoClassifyButton
                  classifying={classifying}
                  disabledExternally={syncing}
                  onClassify={handleAutoClassify}
                />
              </div>
              {someReviewsMissingUrl ? (
                <p
                  style={{
                    fontSize: "12px",
                    color: "var(--text-muted)",
                    fontStyle: "italic",
                    margin: 0,
                    textAlign: "right",
                    maxWidth: "320px",
                  }}
                >
                  Sync reviews to load direct links for older reviews
                </p>
              ) : null}
            </div>
          </div>

          <div style={{ marginTop: "20px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px" }}>
            <div style={{ ...glass, padding: "16px", background: "var(--glass-muted)" }}>
              <div style={statLabel}>Total reviews</div>
              <div style={statNum}>{summary.total}</div>
            </div>
            <div style={{ ...glass, padding: "16px", background: "var(--glass-muted)" }}>
              <div style={statLabel}>Average rating</div>
              <div style={statNum}>{summary.avgRating === null ? "—" : summary.avgRating.toFixed(2)}</div>
            </div>
            <div style={{ ...glass, padding: "16px", background: "var(--glass-muted)" }}>
              <div style={statLabel}>Needing response</div>
              <div style={statNum}>{summary.needingResponse}</div>
            </div>
          </div>

          <div
            className="rv-filters"
            style={{ ...glass, marginTop: "16px", padding: "16px 20px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px" }}
          >
            <div>
              <div
                style={{
                  fontSize: "13px",
                  color: "var(--text-secondary)",
                  marginBottom: "8px",
                }}
              >
                Platform
              </div>
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
              <div
                style={{
                  fontSize: "13px",
                  color: "var(--text-secondary)",
                  marginBottom: "8px",
                }}
              >
                Sentiment
              </div>
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
              <div
                style={{
                  fontSize: "13px",
                  color: "var(--text-secondary)",
                  marginBottom: "8px",
                }}
              >
                Status
              </div>
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
          <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.7 }}>
            No reviews yet. Once guests leave feedback, it will show up here for response.
          </p>
        </div>
        <style dangerouslySetInnerHTML={{ __html: reviewsResponsiveCss }} />
      </div>
    );
  }

  return (
    <div className="reviews-page" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <nav style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px" }}>
          <Link href="/dashboard" style={navLink}>
          Dashboard
        </Link>
        <span style={{ color: "var(--text-subtle)" }}>/</span>
        <span style={{ color: "var(--text-label)" }}>Reviews inbox</span>
      </nav>

      <div style={{ ...glass, padding: "24px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
          <h1
            style={{
              fontSize: "26px",
              fontWeight: 700,
              letterSpacing: "-0.5px",
              color: "var(--text-primary)",
            }}
          >
            Reviews inbox
          </h1>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: "10px",
              }}
            >
              <SyncAllButton
                syncing={syncing}
                disabledExternally={classifying}
                onSync={handleSyncAllReviews}
                label="Sync all reviews"
              />
              <AutoClassifyButton
                classifying={classifying}
                disabledExternally={syncing}
                onClassify={handleAutoClassify}
              />
            </div>
            {someReviewsMissingUrl ? (
              <p
                style={{
                  fontSize: "12px",
                  color: "var(--text-muted)",
                  fontStyle: "italic",
                  margin: 0,
                  textAlign: "right",
                  maxWidth: "320px",
                }}
              >
                Sync reviews to load direct links for older reviews
              </p>
            ) : null}
          </div>
        </div>

        <div style={{ marginTop: "20px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px" }}>
          <div style={{ ...glass, padding: "16px", background: "var(--glass-muted)" }}>
            <div style={statLabel}>Total reviews</div>
            <div style={statNum}>{summary.total}</div>
          </div>
          <div style={{ ...glass, padding: "16px", background: "var(--glass-muted)" }}>
            <div style={statLabel}>Average rating</div>
            <div style={statNum}>{summary.avgRating === null ? "—" : summary.avgRating.toFixed(2)}</div>
          </div>
          <div style={{ ...glass, padding: "16px", background: "var(--glass-muted)" }}>
            <div style={statLabel}>Needing response</div>
            <div style={statNum}>{summary.needingResponse}</div>
          </div>
        </div>

        <div style={{ ...glass, marginTop: "16px", padding: "16px 20px" }}>
          <div style={{ position: "relative", marginBottom: "16px" }}>
            <span
              style={{
                position: "absolute",
                left: "14px",
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: "16px",
                color: "var(--text-muted)",
                pointerEvents: "none",
              }}
              aria-hidden
            >
              ⌕
            </span>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reviews by guest name, content, or topic..."
              style={{
                ...glassInput,
                width: "100%",
                paddingLeft: "40px",
                paddingRight: searchQuery.trim() ? "40px" : "16px",
              }}
            />
            {searchQuery.trim() ? (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearchQuery("")}
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  border: "none",
                  background: "transparent",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  fontSize: "18px",
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            ) : null}
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "flex-end",
              justifyContent: "space-between",
              gap: "16px",
            }}
          >
            <div>
              <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "8px" }}>Period</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {(
                  [
                    { v: 7 as const, label: "7 days" },
                    { v: 30 as const, label: "30 days" },
                    { v: 90 as const, label: "90 days" },
                    { v: "all" as const, label: "All time" },
                  ] as const
                ).map((p) => {
                  const active = periodDays === p.v;
                  return (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setPeriodDays(p.v)}
                      style={{
                        padding: "6px 14px",
                        borderRadius: "100px",
                        fontSize: "13px",
                        fontWeight: 500,
                        border: active ? "1px solid var(--accent-border)" : "1px solid var(--glass-border)",
                        background: active ? "var(--accent-bg)" : "var(--glass-bg)",
                        color: active ? "var(--accent)" : "var(--text-secondary)",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ minWidth: "200px", flex: "1 1 200px" }}>
              <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "8px" }}>Sort</div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                style={selectStyle}
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="lowRating">Lowest rating first</option>
                <option value="highRating">Highest rating first</option>
                <option value="needsFirst">Needs response first</option>
                <option value="flaggedFirst">Flagged first</option>
              </select>
            </div>
          </div>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "12px 0 0 0" }}>
            Showing {filteredCount} of {totalCount} reviews
          </p>
        </div>

        <div
          className="rv-filters"
          style={{ ...glass, marginTop: "16px", padding: "16px 20px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px" }}
        >
          <div>
            <div
              style={{
                fontSize: "13px",
                color: "var(--text-secondary)",
                marginBottom: "8px",
              }}
            >
              Platform
            </div>
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
            <div
              style={{
                fontSize: "13px",
                color: "var(--text-secondary)",
                marginBottom: "8px",
              }}
            >
              Sentiment
            </div>
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
            <div
              style={{
                fontSize: "13px",
                color: "var(--text-secondary)",
                marginBottom: "8px",
              }}
            >
              Status
            </div>
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

      <style
        dangerouslySetInnerHTML={{
          __html: `@keyframes rvspin { to { transform: rotate(360deg); } } ${reviewsResponsiveCss}`,
        }}
      />
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
            const externalReviewUrl = review.review_url?.trim() || null;

            const reviewId = review.id ?? `${idx}-${platform}-${createdAt}`;
            const draft = drafts[reviewId] ?? defaultDraft();
            const isPanelOpen = openDraftId === reviewId;
            const hasStableId = Boolean(review.id);
            const dateLabel = formatDate(getReviewDate(review) ?? createdAt);
            const flagAccent = review.flagged
              ? review.flag_color === "amber"
                ? "#f59e0b"
                : review.flag_color === "green"
                  ? "#22c55e"
                  : "#ef4444"
              : undefined;
            const flagIconColor = review.flagged
              ? flagAccent
              : "var(--text-muted)";

            return (
              <div
                key={reviewId}
                className="rv-card-shell"
                style={{
                  ...glass,
                  padding: "24px",
                  position: "relative",
                  transition: "transform 0.2s ease, border-color 0.2s ease, background 0.2s ease",
                  ...(flagAccent ? { borderLeft: `3px solid ${flagAccent}` } : {}),
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.background = "var(--glass-hover-bg)";
                  e.currentTarget.style.borderColor = "var(--glass-hover-border)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.background = "var(--glass-bg)";
                  e.currentTarget.style.borderColor = "var(--glass-border)";
                }}
              >
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                    <PlatformBadge platform={platform} />
                    {externalReviewUrl ? (
                      <a
                        href={externalReviewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: "12px",
                          color: platformReviewLinkColor(platform),
                          textDecoration: "none",
                          background: "transparent",
                          lineHeight: 1.4,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.textDecoration = "underline";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.textDecoration = "none";
                        }}
                      >
                        View on {platformViewOnLabel(platform)} ↗
                      </a>
                    ) : null}
                    <StarRow rating={rating} />
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "auto" }}>
                    {hasStableId ? (
                      <div data-flag-menu-root style={{ position: "relative" }}>
                        <button
                          type="button"
                          aria-label={review.flagged ? "Remove flag" : "Flag review"}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!review.id) return;
                            if (review.flagged) {
                              void updateReviewFlag(review.id, { flagged: false });
                            } else {
                              setFlagMenuOpenId((cur) => (cur === review.id ? null : review.id!));
                            }
                          }}
                          style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "10px",
                            border: "1px solid var(--glass-border)",
                            background: "transparent",
                            color: flagIconColor,
                            cursor: "pointer",
                            fontSize: "18px",
                            lineHeight: 1,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          ⚑
                        </button>
                        {!review.flagged && flagMenuOpenId === review.id ? (
                          <div
                            style={{
                              position: "absolute",
                              top: "calc(100% + 6px)",
                              right: 0,
                              zIndex: 10,
                              minWidth: "200px",
                              ...glass,
                              padding: "8px",
                              borderRadius: "12px",
                              boxShadow: "var(--glass-shadow)",
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => review.id && updateReviewFlag(review.id, { flagged: true, flag_color: "red" })}
                              style={{
                                display: "block",
                                width: "100%",
                                textAlign: "left",
                                padding: "10px 12px",
                                border: "none",
                                borderRadius: "8px",
                                background: "transparent",
                                color: "var(--text-primary)",
                                cursor: "pointer",
                                fontSize: "13px",
                              }}
                            >
                              🔴 Flag as urgent
                            </button>
                            <button
                              type="button"
                              onClick={() => review.id && updateReviewFlag(review.id, { flagged: true, flag_color: "amber" })}
                              style={{
                                display: "block",
                                width: "100%",
                                textAlign: "left",
                                padding: "10px 12px",
                                border: "none",
                                borderRadius: "8px",
                                background: "transparent",
                                color: "var(--text-primary)",
                                cursor: "pointer",
                                fontSize: "13px",
                              }}
                            >
                              🟡 Flag for follow-up
                            </button>
                            <button
                              type="button"
                              onClick={() => review.id && updateReviewFlag(review.id, { flagged: true, flag_color: "green" })}
                              style={{
                                display: "block",
                                width: "100%",
                                textAlign: "left",
                                padding: "10px 12px",
                                border: "none",
                                borderRadius: "8px",
                                background: "transparent",
                                color: "var(--text-primary)",
                                cursor: "pointer",
                                fontSize: "13px",
                              }}
                            >
                              🟢 Flag as resolved
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
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
                          background: "var(--success-bg)",
                          color: "var(--success)",
                          border: "1px solid var(--success-border)",
                        }}
                      >
                        <span aria-hidden>✓</span> Responded
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="rv-meta-row" style={{ marginTop: "12px" }}>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <span style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)" }}>
                      {reviewerName}
                    </span>
                    <span style={{ fontSize: "13px", color: "var(--text-label)" }}>{dateLabel}</span>
                    {agePillForReview(review, responded)}
                  </div>
                  <div
                    style={{
                      marginTop: "8px",
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <SentimentBadge sentiment={sentiment} />
                    {complaintTopic ? (
                      <TopicPill topicSlug={complaintTopic} topicType={review.topic_type} />
                    ) : null}
                  </div>
                </div>

                <div
                  style={{
                    marginTop: "12px",
                    color: "var(--review-text)",
                    fontSize: "14px",
                    lineHeight: 1.7,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {reviewText || "—"}
                </div>

                {!responded && hasStableId ? (
                  <div className="rv-draft-wrap" style={{ marginTop: "16px" }}>
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
                          e.currentTarget.style.background = "var(--btn-primary-hover)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "var(--btn-primary-bg)";
                      }}
                    >
                      {isPanelOpen && draft.status === "loading" ? (
                        <>
                          <span
                            style={{
                              width: "14px",
                              height: "14px",
                              borderRadius: "50%",
                              border: "2px solid var(--spinner-track)",
                              borderTopColor: "var(--on-primary)",
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
                  </div>
                ) : null}

                {isPanelOpen && draft.status !== "idle" && hasStableId && (
                  <div
                    style={{
                      marginTop: "16px",
                      padding: "16px",
                      borderRadius: "16px",
                      background: "var(--accent-panel)",
                      border: "1px solid var(--accent-panel-border)",
                      backdropFilter: "blur(12px)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                    }}
                  >
                    {draft.status === "loading" ? (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          fontSize: "14px",
                          color: "var(--text-secondary)",
                        }}
                      >
                        <span
                          style={{
                            width: "16px",
                            height: "16px",
                            borderRadius: "50%",
                            border: "2px solid var(--spinner-track)",
                            borderTopColor: "var(--accent)",
                            animation: "rvspin 0.8s linear infinite",
                          }}
                        />
                        Generating...
                      </div>
                    ) : draft.status === "error" ? (
                      <p style={{ fontSize: "14px", color: "var(--text-error-soft)" }}>{draft.text}</p>
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
                            e.target.style.borderColor = "var(--focus-ring)";
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = "var(--glass-input-border)";
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
                              e.currentTarget.style.background = "var(--secondary-btn-hover)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "var(--secondary-btn-bg)";
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
                                e.currentTarget.style.background = "var(--btn-primary-hover)";
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "var(--btn-primary-bg)";
                            }}
                          >
                            {draft.markingResponded ? "Saving..." : "Mark as responded"}
                          </button>
                        </div>
                        {draft.markError ? (
                          <p style={{ fontSize: "14px", color: "var(--text-error-soft)" }}>{draft.markError}</p>
                        ) : null}
                      </>
                    )}
                  </div>
                )}

                {hasStableId ? (
                  <div
                    style={{ marginTop: "16px" }}
                    title="Private note — only visible to you"
                  >
                    {noteEditorId === review.id ? (
                      <>
                        <textarea
                          value={noteDraft}
                          onChange={(e) => setNoteDraft(e.target.value)}
                          rows={3}
                          placeholder="Add a private note... (only you can see this)"
                          style={{
                            ...glassInput,
                            width: "100%",
                            fontSize: "13px",
                            lineHeight: 1.5,
                            resize: "vertical",
                          }}
                          onFocus={(e) => {
                            e.target.style.borderColor = "var(--focus-ring)";
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = "var(--glass-input-border)";
                          }}
                        />
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "8px" }}>
                          <button
                            type="button"
                            onClick={() => review.id && void saveInternalNote(review.id, noteDraft)}
                            style={{
                              ...glassPrimary,
                              padding: "6px 14px",
                              fontSize: "13px",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "var(--btn-primary-hover)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "var(--btn-primary-bg)";
                            }}
                          >
                            Save note
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setNoteEditorId(null);
                              setNoteDraft("");
                            }}
                            style={{
                              ...glassSecondary,
                              padding: "6px 14px",
                              fontSize: "13px",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "var(--secondary-btn-hover)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "var(--secondary-btn-bg)";
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </>
                    ) : review.internal_note ? (
                      <div
                        style={{
                          padding: "12px 14px",
                          borderRadius: "12px",
                          background: "rgba(245,158,11,0.05)",
                          border: "1px solid rgba(245,158,11,0.1)",
                          fontSize: "13px",
                          color: "var(--text-secondary)",
                          fontStyle: "italic",
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          gap: "10px",
                        }}
                      >
                        <span style={{ flex: 1, minWidth: 0, wordBreak: "break-word" }}>
                          📝 {review.internal_note}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
                          <button
                            type="button"
                            aria-label="Edit note"
                            title="Edit note"
                            onClick={() => {
                              setNoteEditorId(review.id!);
                              setNoteDraft(review.internal_note ?? "");
                            }}
                            style={{
                              border: "none",
                              background: "transparent",
                              color: "var(--text-muted)",
                              cursor: "pointer",
                              fontSize: "16px",
                              lineHeight: 1,
                              padding: "4px",
                            }}
                          >
                            ✎
                          </button>
                          <button
                            type="button"
                            aria-label="Delete note"
                            title="Delete note"
                            onClick={() => {
                              if (typeof window !== "undefined" && window.confirm("Delete this private note?")) {
                                void saveInternalNote(review.id!, "");
                              }
                            }}
                            style={{
                              border: "none",
                              background: "transparent",
                              color: "var(--text-muted)",
                              cursor: "pointer",
                              fontSize: "18px",
                              lineHeight: 1,
                              padding: "4px",
                            }}
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setNoteEditorId(review.id!);
                          setNoteDraft("");
                        }}
                        style={{
                          marginTop: "8px",
                          border: "none",
                          background: "transparent",
                          color: "var(--text-muted)",
                          fontSize: "13px",
                          cursor: "pointer",
                          padding: 0,
                        }}
                      >
                        ＋ Add note
                      </button>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
      </div>
    </div>
  );
}


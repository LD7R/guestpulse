"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { defaultDraftResponse, useDraftResponses } from "@/lib/useDraftResponses";
import Spinner from "@/app/components/Spinner";
import ConfirmModal from "@/components/ConfirmModal";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";
import { useToast } from "@/components/Toast";

// ─── Types ────────────────────────────────────────────────────────────────────
type DraftMetadata = {
  language: string;
  tone: string;
  length: string;
  used_examples: number;
  used_traits: number;
  addressed_by_name: boolean;
};

type Hotel = {
  id: string;
  name?: string | null;
  tripadvisor_url?: string | null;
  google_url?: string | null;
  booking_url?: string | null;
  trip_url?: string | null;
  expedia_url?: string | null;
  yelp_url?: string | null;
  active_platforms?: unknown;
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
  original_language?: string | null;
  translated_text?: string | null;
  translated_to?: string | null;
};

const TONE_LABELS: Record<string, string> = {
  "warm-professional": "Warm & Professional",
  "casual-friendly": "Casual & Friendly",
  "refined-elegant": "Refined & Elegant",
  "formal": "Formal",
  "boutique-playful": "Boutique & Playful",
  "direct-minimal": "Direct & Minimal",
  "heartfelt-sincere": "Heartfelt & Sincere",
};

const LANG_LABELS: Record<string, string> = {
  en: "English", nl: "Dutch", de: "German", fr: "French",
  es: "Spanish", it: "Italian", pt: "Portuguese", id: "Indonesian",
  zh: "Chinese", ja: "Japanese", ko: "Korean", ru: "Russian",
  th: "Thai", vi: "Vietnamese", ar: "Arabic",
};

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  pageBg: "#0d0d0d",
  card: "#141414",
  border: "#1e1e1e",
  borderSub: "#2a2a2a",
  inputBg: "#111111",
  textPrimary: "#f0f0f0",
  textSecondary: "#888888",
  textMuted: "#555555",
  green: "#4ade80",
  red: "#f87171",
  amber: "#fbbf24",
} as const;

// ─── Shared style objects ──────────────────────────────────────────────────────
const cardStyle: CSSProperties = {
  background: C.card,
  border: `1px solid ${C.border}`,
  borderRadius: 8,
};

const labelStyle: CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: C.textMuted,
};

function hasText(text: string | null | undefined): boolean {
  if (!text) return false;
  const cleaned = text.trim();
  if (cleaned === "") return false;
  if (cleaned === "—") return false;
  if (cleaned === "-") return false;
  if (cleaned === "null") return false;
  if (cleaned.length < 5) return false;
  return true;
}

function primaryBtn(disabled = false): CSSProperties {
  return {
    background: C.textPrimary,
    border: "none",
    borderRadius: 6,
    padding: "7px 14px",
    fontSize: 12,
    fontWeight: 600,
    color: "#0d0d0d",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    fontFamily: "inherit",
    whiteSpace: "nowrap",
  };
}

function secondaryBtn(extra: CSSProperties = {}): CSSProperties {
  return {
    background: "transparent",
    border: `1px solid ${C.borderSub}`,
    borderRadius: 6,
    color: C.textSecondary,
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
    fontFamily: "inherit",
    padding: "6px 14px",
    ...extra,
  };
}

const inputStyle: CSSProperties = {
  background: C.inputBg,
  border: `1px solid ${C.borderSub}`,
  borderRadius: 5,
  color: C.textPrimary,
  fontSize: 13,
  outline: "none",
  fontFamily: "inherit",
  boxSizing: "border-box",
};

// ─── Utility functions ─────────────────────────────────────────────────────────
function normalizeRating(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isNaN(n) ? null : n;
}

function getReviewDate(r: Review): string | null {
  return r.review_date ?? r.created_at ?? r.date ?? null;
}

function daysSince(r: Review): number | null {
  const d = getReviewDate(r);
  if (!d) return null;
  const t = new Date(d).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / 86400000);
}

function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  const sec = Math.floor((Date.now() - t) / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}

function formatReviewDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "Unknown date";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
  }
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fullDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function dateColor(dateStr: string | null | undefined): string {
  if (!dateStr) return C.textMuted;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return C.textMuted;
  const days = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (days <= 3) return C.green;
  if (days <= 7) return C.amber;
  if (days <= 14) return C.textSecondary;
  return C.textMuted;
}

function platformLinkColor(platform: string | null | undefined): string {
  const p = (platform ?? "").toLowerCase();
  if (p === "tripadvisor") return C.green;
  if (p === "google") return "#60a5fa";
  if (p === "booking") return "#a78bfa";
  if (p === "trip") return "#60a5fa";
  if (p === "expedia") return "#a78bfa";
  if (p === "yelp") return "#f87171";
  return C.textSecondary;
}

function platformLabel(platform: string | null | undefined): string {
  const p = (platform ?? "").toLowerCase();
  if (p === "tripadvisor") return "TripAdvisor";
  if (p === "google") return "Google";
  if (p === "booking") return "Booking.com";
  if (p === "trip") return "Trip.com";
  if (p === "expedia") return "Expedia";
  if (p === "yelp") return "Yelp";
  const raw = (platform ?? "Platform").trim();
  return raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : "Platform";
}

type HotelUrls = {
  tripadvisor_url: string | null;
  google_url: string | null;
  booking_url: string | null;
  trip_url: string | null;
  expedia_url: string | null;
  yelp_url: string | null;
};

function getReviewUrl(review: Review, hotelUrls: HotelUrls | null): string {
  if (review.review_url?.trim()) return review.review_url.trim();
  if (!hotelUrls) return "";
  const p = (review.platform ?? review.source ?? "").toLowerCase();
  switch (p) {
    case "tripadvisor":
      return hotelUrls.tripadvisor_url ? hotelUrls.tripadvisor_url + "#REVIEWS" : "";
    case "google":
      return hotelUrls.google_url ? hotelUrls.google_url + "&hl=en" : "";
    case "booking":
      return hotelUrls.booking_url
        ? hotelUrls.booking_url.includes("#")
          ? hotelUrls.booking_url
          : hotelUrls.booking_url + "#blockdisplay4"
        : "";
    case "trip":
      return hotelUrls.trip_url || "";
    case "expedia":
      return hotelUrls.expedia_url || "";
    case "yelp":
      return hotelUrls.yelp_url || "";
    default:
      return "";
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function Skeleton({ width = "100%", height = "16px" }: { width?: string; height?: string }) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 3,
        background: "#1e1e1e",
        animation: "rv-pulse 1.5s ease-in-out infinite",
      }}
    />
  );
}

function StarRow({ rating }: { rating: number | null }) {
  const safe = rating ?? 0;
  const filled = Math.max(0, Math.min(5, Math.round(safe)));
  if (filled <= 0) {
    return <span style={{ fontSize: 12, color: C.textMuted }}>No rating</span>;
  }
  return (
    <span style={{ fontSize: 13, letterSpacing: 1 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} style={{ color: i <= filled ? "#fbbf24" : "#2a2a2a" }}>★</span>
      ))}
      <span style={{ marginLeft: 6, fontSize: 11, color: C.textMuted }}>{safe.toFixed(1)}</span>
    </span>
  );
}

function PlatformBadge({ platform }: { platform: string | null | undefined }) {
  const p = (platform ?? "").toLowerCase();
  const base: CSSProperties = {
    borderRadius: 3,
    padding: "2px 7px",
    fontSize: 11,
    fontWeight: 600,
  };
  if (p === "tripadvisor")
    return <span style={{ ...base, background: "#052e16", color: C.green }}>TripAdvisor</span>;
  if (p === "google")
    return <span style={{ ...base, background: "#172554", color: "#60a5fa" }}>Google</span>;
  if (p === "booking")
    return <span style={{ ...base, background: "#1e1b4b", color: "#a78bfa" }}>Booking</span>;
  if (p === "trip")
    return <span style={{ ...base, background: "#1e1b4b", color: "#60a5fa" }}>Trip.com</span>;
  if (p === "expedia")
    return <span style={{ ...base, background: "#1a0a2e", color: "#a78bfa" }}>Expedia</span>;
  if (p === "yelp")
    return <span style={{ ...base, background: "#2d0a0a", color: "#f87171" }}>Yelp</span>;
  return (
    <span style={{ ...base, background: "#1e1e1e", color: C.textSecondary }}>
      {platform || "Platform"}
    </span>
  );
}

function SentimentBadge({ sentiment }: { sentiment: string | null | undefined }) {
  const s = (sentiment ?? "").toLowerCase();
  const base: CSSProperties = { borderRadius: 3, padding: "2px 8px", fontSize: 11, fontWeight: 500 };
  if (s === "positive") return <span style={{ ...base, background: "#052e16", color: C.green }}>Positive</span>;
  if (s === "negative") return <span style={{ ...base, background: "#2d0a0a", color: C.red }}>Negative</span>;
  return <span style={{ ...base, background: "#1a1a1a", color: C.textMuted }}>Neutral</span>;
}

function TopicPill({ topicSlug, topicType }: { topicSlug: string; topicType: string | null | undefined }) {
  const tt = (topicType ?? "").toLowerCase().trim();
  const label = topicSlug.charAt(0).toUpperCase() + topicSlug.slice(1);
  const base: CSSProperties = { borderRadius: 3, padding: "2px 8px", fontSize: 11, background: "#1e1e1e" };
  if (tt === "strength") return <span style={{ ...base, color: C.green }}>✓ {label}</span>;
  if (tt === "improvement") return <span style={{ ...base, color: C.amber }}>↑ {label}</span>;
  return <span style={{ ...base, color: C.textSecondary }}>{label}</span>;
}

function AgePill({ review, responded }: { review: Review; responded: boolean }): ReactNode {
  if (responded) return null;
  const days = daysSince(review);
  if (days === null || days <= 2) return null;
  const pillBase: CSSProperties = { borderRadius: 3, padding: "1px 6px", fontSize: 10, fontWeight: 600 };
  if (days >= 14)
    return <span style={{ ...pillBase, background: "#1a0000", color: C.red }}>{days}d old</span>;
  if (days >= 7)
    return <span style={{ ...pillBase, background: "#1a1200", color: C.amber }}>{days}d old</span>;
  return <span style={{ ...pillBase, background: "#1a1200", color: C.amber }}>{days}d old</span>;
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: active ? "#1e1e1e" : C.inputBg,
        border: `1px solid ${active ? "#3a3a3a" : C.borderSub}`,
        borderRadius: 4,
        padding: "5px 10px",
        fontSize: 11,
        color: active ? C.textPrimary : C.textMuted,
        cursor: "pointer",
        fontFamily: "inherit",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ReviewsInboxPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const { draftResponses, patchDraftResponse, removeDraft } = useDraftResponses();
  const draftAbortRef = useRef<AbortController | null>(null);

  // Hotel context (cached so we don't re-fetch on every draft)
  const [cachedHotelId, setCachedHotelId] = useState<string | null>(null);
  const [cachedSignature, setCachedSignature] = useState<string>("The Management Team");
  const [defaultResponseLanguage, setDefaultResponseLanguage] = useState("match-guest");
  // Language override for drafts — null means use hotel default
  const [draftLanguageOverride, setDraftLanguageOverride] = useState<string | null>(null);
  // brand_voice_used per review id
  const [brandVoiceMap, setBrandVoiceMap] = useState<Record<string, { used: boolean; count: number }>>({});
  const [draftMetadata, setDraftMetadata] = useState<Record<string, DraftMetadata>>({});
  const [cachedBrandVoiceCompletedAt, setCachedBrandVoiceCompletedAt] = useState<string | null>(null);
  const [cachedHotelUrls, setCachedHotelUrls] = useState<HotelUrls | null>(null);

  const [syncing, setSyncing] = useState(false);
  const [classifying, setClassifying] = useState(false);
  const [classifyRemaining, setClassifyRemaining] = useState(0);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const [platformFilter, setPlatformFilter] = useState("all");
  const [sentimentFilter, setSentimentFilter] = useState("all");
  const [respondedFilter, setRespondedFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [periodDays, setPeriodDays] = useState<7 | 30 | 90 | "all">(30);
  const [reviewType, setReviewType] = useState<"all" | "with-text" | "star-only">("all");
  const [sortBy, setSortBy] = useState<
    "newest" | "oldest" | "lowRating" | "highRating" | "needsFirst" | "flaggedFirst"
  >("newest");

  const [ratingFilter, setRatingFilter] = useState<number | null>(null);

  const [flagMenuOpenId, setFlagMenuOpenId] = useState<string | null>(null);
  const [noteEditorId, setNoteEditorId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [undoConfirmId, setUndoConfirmId] = useState<string | null>(null);
  const [upgradeModal, setUpgradeModal] = useState<{ message: string } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ reviewId: string } | null>(null);

  // Close flag menu on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if ((e.target as HTMLElement).closest("[data-flag-menu-root]")) return;
      setFlagMenuOpenId(null);
    }
    if (flagMenuOpenId) {
      document.addEventListener("mousedown", handle);
      return () => document.removeEventListener("mousedown", handle);
    }
  }, [flagMenuOpenId]);

  // ── Filter logic ───────────────────────────────────────────────────────────
  const visibleReviews = useMemo(() => {
    let list = reviews.filter((r) => {
      const platform = (r.platform ?? r.source ?? "").toString().toLowerCase();
      const sentimentRaw = (r.sentiment ?? r.sentiment_label ?? "").toString().toLowerCase();
      const sentiment =
        sentimentRaw === "positive" ? "positive" : sentimentRaw === "negative" ? "negative" : "neutral";
      const responded = r.responded ?? r.has_responded ?? r.is_responded ?? false;

      const platformOk = platformFilter === "all" ? true : platform === platformFilter;
      const sentimentOk = sentimentFilter === "all" ? true : sentiment === sentimentFilter;
      const respondedOk =
        respondedFilter === "all"
          ? true
          : respondedFilter === "responded"
            ? Boolean(responded)
            : respondedFilter === "flagged"
              ? Boolean(r.flagged)
              : !Boolean(responded); // needsResponse

      const ratingOk = ratingFilter === null
        ? true
        : normalizeRating(r.rating ?? r.stars) === ratingFilter;

      return platformOk && sentimentOk && respondedOk && ratingOk;
    });

    if (reviewType !== "all") {
      list = list.filter((r) => {
        const raw = r.review_text ?? r.body ?? r.text ?? null;
        const textVal = raw == null ? null : String(raw);
        if (reviewType === "with-text") return hasText(textVal);
        if (reviewType === "star-only") return !hasText(textVal);
        return true;
      });
    }

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

    list = [...list].sort((a, b) => {
      const dateA = new Date(getReviewDate(a) || 0).getTime();
      const dateB = new Date(getReviewDate(b) || 0).getTime();
      const ra = ratingVal(a);
      const rb = ratingVal(b);
      const respA = respondedVal(a);
      const respB = respondedVal(b);
      switch (sortBy) {
        case "newest": return dateB - dateA;
        case "oldest": return dateA - dateB;
        case "lowRating": return (ra ?? 999) - (rb ?? 999);
        case "highRating": return (rb ?? -1) - (ra ?? -1);
        case "needsFirst":
          if (respA === respB) return dateB - dateA;
          return respA ? 1 : -1;
        case "flaggedFirst":
          if (Boolean(a.flagged) === Boolean(b.flagged)) return dateB - dateA;
          return a.flagged ? -1 : 1;
        default: return dateB - dateA;
      }
    });

    return list;
  }, [reviews, platformFilter, sentimentFilter, respondedFilter, reviewType, searchQuery, periodDays, sortBy, ratingFilter]);

  // ── Summary stats ─────────────────────────────────────────────────────────
  const summary = useMemo(() => {
    const total = reviews.length;
    const ratings = reviews
      .map((r) => normalizeRating(r.rating ?? r.stars))
      .filter((n): n is number => typeof n === "number" && !Number.isNaN(n));
    const avgRating = ratings.length === 0 ? null : ratings.reduce((a, b) => a + b, 0) / ratings.length;
    const needingResponse = reviews.filter((r) => !(r.responded ?? r.has_responded ?? r.is_responded ?? false)).length;
    return { total, avgRating, needingResponse };
  }, [reviews]);

  // ── Actions ───────────────────────────────────────────────────────────────
  function handleDiscardDraft(reviewId: string) {
    draftAbortRef.current?.abort();
    draftAbortRef.current = null;
    removeDraft(reviewId);
    setDraftMetadata((prev) => { const next = { ...prev }; delete next[reviewId]; return next; });
    setBrandVoiceMap((prev) => { const next = { ...prev }; delete next[reviewId]; return next; });
  }

  async function handleDraftResponse(review: Review, force = false) {
    const id = review.id;
    if (!id) return;
    const cur = draftResponses[id];

    if (!force) {
      if (cur?.isOpen) {
        draftAbortRef.current?.abort();
        draftAbortRef.current = null;
        patchDraftResponse(id, { isOpen: false });
        return;
      }
      if (cur?.status === "done" || cur?.status === "error") {
        patchDraftResponse(id, { isOpen: true });
        return;
      }
    }

    draftAbortRef.current?.abort();
    const controller = new AbortController();
    draftAbortRef.current = controller;

    if (force) {
      setDraftMetadata((prev) => { const next = { ...prev }; delete next[id]; return next; });
      setBrandVoiceMap((prev) => { const next = { ...prev }; delete next[id]; return next; });
    }

    patchDraftResponse(id, { isOpen: true, status: "loading", text: "", markError: null, copied: false });

    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) throw new Error("You must be signed in.");

      const res = await fetch("/api/draft-response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          review_text: review.review_text ?? review.body ?? review.text ?? "",
          rating: review.rating ?? review.stars ?? null,
          reviewer_name: review.reviewer_name ?? review.name ?? null,
          platform: review.platform ?? review.source ?? null,
          signature: cachedSignature,
          hotel_id: cachedHotelId,
          response_language_override: draftLanguageOverride,
        }),
        signal: controller.signal,
      });

      const json = (await res.json()) as {
        success?: boolean;
        response?: string;
        error?: string;
        upgrade_required?: boolean;
        brand_voice_used?: boolean;
        examples_count?: number;
        metadata?: DraftMetadata;
      };
      if (controller.signal.aborted) return;
      if (json.upgrade_required) {
        patchDraftResponse(id, { isOpen: false, status: "idle" });
        setUpgradeModal({ message: json.error ?? "Upgrade required to use AI drafts." });
        return;
      }
      if (!res.ok || json.success !== true || !json.response) throw new Error(json.error ?? "Failed to generate draft");
      patchDraftResponse(id, { status: "done", text: json.response });
      if (json.brand_voice_used !== undefined) {
        setBrandVoiceMap((prev) => ({
          ...prev,
          [id]: { used: json.brand_voice_used ?? false, count: json.examples_count ?? 0 },
        }));
      }
      if (json.metadata) {
        setDraftMetadata((prev) => ({ ...prev, [id]: json.metadata! }));
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      patchDraftResponse(id, { status: "error", text: err instanceof Error ? err.message : "Failed to generate draft" });
    } finally {
      if (draftAbortRef.current === controller) draftAbortRef.current = null;
    }
  }

  async function handleMarkResponded(reviewId: string) {
    patchDraftResponse(reviewId, { markingResponded: true, markError: null });
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    const { error: updateError } = await supabase.from("reviews").update({ responded: true }).eq("id", reviewId);
    if (updateError) {
      patchDraftResponse(reviewId, { markingResponded: false, markError: updateError.message });
      return;
    }
    setReviews((prev) => prev.map((r) => (r.id === reviewId ? { ...r, responded: true } : r)));
    removeDraft(reviewId);
  }

  async function handleUndoResponded(reviewId: string) {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    await supabase.from("reviews").update({ responded: false }).eq("id", reviewId);
    setReviews((prev) => prev.map((r) => (r.id === reviewId ? { ...r, responded: false } : r)));
    setUndoConfirmId(null);
  }

  async function updateReviewFlag(
    reviewId: string,
    patch: { flagged: boolean; flag_color?: "red" | "amber" | "green" },
  ) {
    setReviews((prev) =>
      prev.map((r) =>
        r.id === reviewId
          ? { ...r, flagged: patch.flagged, flag_color: patch.flagged ? patch.flag_color ?? r.flag_color ?? "red" : "red" }
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
    await supabase.from("reviews").update(payload).eq("id", reviewId);
  }

  async function saveInternalNote(reviewId: string, text: string) {
    const trimmed = text.trim();
    setReviews((prev) => prev.map((r) => (r.id === reviewId ? { ...r, internal_note: trimmed || null } : r)));
    setNoteEditorId(null);
    setNoteDraft("");
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    const { error } = await supabase.from("reviews").update({ internal_note: trimmed || null }).eq("id", reviewId);
    if (error) {
      showToast("error", "Failed to save note");
    } else if (trimmed) {
      showToast("success", "Note saved");
    } else {
      showToast("success", "Note deleted");
    }
  }

  async function syncPlatform(platform: "tripadvisor" | "google" | "booking" | "trip" | "expedia" | "yelp", url: string, hotelId: string) {
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
    setSyncMessage(null);
    setSyncError(null);
    try {
      setSyncing(true);
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw new Error(userError.message);
      if (!user?.id) throw new Error("You must be signed in to sync reviews.");

      const { data: hotel, error: hotelError } = await supabase
        .from("hotels")
        .select("id, tripadvisor_url, google_url, booking_url, trip_url, expedia_url, yelp_url, active_platforms")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (hotelError) throw new Error(hotelError.message);
      if (!hotel?.id) throw new Error("No hotel found. Add one in Settings first.");

      const activePlatforms = hotel.active_platforms
        ? typeof hotel.active_platforms === "string"
          ? (JSON.parse(hotel.active_platforms) as Record<string, boolean>)
          : (hotel.active_platforms as Record<string, boolean>)
        : { tripadvisor: true, google: true, booking: true, trip: false, expedia: false, yelp: false };

      const platformsToSync: Array<{ platform: "tripadvisor" | "google" | "booking" | "trip" | "expedia" | "yelp"; url: string }> = [];
      if (hotel.tripadvisor_url?.trim() && activePlatforms.tripadvisor !== false) platformsToSync.push({ platform: "tripadvisor", url: hotel.tripadvisor_url });
      if (hotel.google_url?.trim() && activePlatforms.google !== false) platformsToSync.push({ platform: "google", url: hotel.google_url });
      if (hotel.booking_url?.trim() && activePlatforms.booking !== false) platformsToSync.push({ platform: "booking", url: hotel.booking_url });
      if (hotel.trip_url?.trim() && activePlatforms.trip !== false) platformsToSync.push({ platform: "trip", url: hotel.trip_url });
      if (hotel.expedia_url?.trim() && activePlatforms.expedia !== false) platformsToSync.push({ platform: "expedia", url: hotel.expedia_url });
      if (hotel.yelp_url?.trim() && activePlatforms.yelp !== false) platformsToSync.push({ platform: "yelp", url: hotel.yelp_url });

      if (platformsToSync.length === 0) {
        return;
      }

      // Dispatch sync-start event for layout terminal card
      window.dispatchEvent(new CustomEvent("gp:sync-start", {
        detail: { platforms: platformsToSync.map((p) => p.platform) },
      }));

      const tasks = platformsToSync.map(({ platform, url }) =>
        syncPlatform(platform, url, hotel.id).then((result) => {
          // Dispatch per-platform progress event
          window.dispatchEvent(new CustomEvent("gp:sync-progress", {
            detail: { platform, status: result.error ? "error" : "done" },
          }));
          return result;
        }),
      );

      const settled = await Promise.allSettled(tasks);
      const results = settled.flatMap((s) => (s.status === "fulfilled" ? [s.value] : []));
      const totalNew = results.reduce((s, r) => s + r.count, 0);

      const { count: totalCount } = await supabase
        .from("reviews")
        .select("*", { count: "exact", head: true })
        .eq("hotel_id", hotel.id);

      const errorCount = results.filter((r) => r.error !== null).length;
      // Dispatch sync-end event for layout toast + terminal card
      window.dispatchEvent(new CustomEvent("gp:sync-end", {
        detail: { totalNew, errorCount },
      }));

      setRefreshKey((k) => k + 1);
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : "Failed to sync reviews.");
    } finally {
      setSyncing(false);
    }
  }

  async function handleAutoClassify() {
    setSyncError(null);
    setSyncMessage(null);
    setClassifyRemaining(0);
    try {
      setClassifying(true);
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw new Error(userError.message);
      if (!user?.id) throw new Error("You must be signed in.");

      const { data: hotel, error: hotelError } = await supabase
        .from("hotels")
        .select("id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (hotelError) throw new Error(hotelError.message);
      if (!hotel?.id) throw new Error("No hotel found.");

      const res = await fetch("/api/classify-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hotel_id: hotel.id }),
      });
      const json = (await res.json()) as { success?: boolean; classified?: number; total?: number; remaining?: number; error?: string };
      if (!res.ok || json.success !== true) throw new Error(json.error ?? "Classification failed");

      const total = json.total ?? 0;
      const remaining = json.remaining ?? 0;
      setClassifyRemaining(remaining);
      setSyncMessage(
        total === 0
          ? "No reviews needed classification."
          : `Classified ${json.classified ?? 0} of ${total} review${total === 1 ? "" : "s"}${remaining > 0 ? ` · ${remaining} remaining` : ""}.`,
      );
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : "Failed to classify reviews.");
    } finally {
      setClassifying(false);
    }
  }

  // ── Data fetching ─────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function fetchInbox() {
      setLoading(true);
      setError(null);
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) { if (!cancelled) { setError(userError.message); setLoading(false); } return; }
      if (!user?.id) { if (!cancelled) { setError("You must be signed in."); setLoading(false); } return; }

      const { data: hotels, error: hotelsError } = await supabase
        .from("hotels")
        .select("id, response_signature, brand_voice_completed_at, tripadvisor_url, google_url, booking_url, trip_url, expedia_url, yelp_url")
        .eq("user_id", user.id);
      if (hotelsError) { if (!cancelled) { setError(hotelsError.message); setLoading(false); } return; }

      // Cache hotel context for draft generation
      if (!cancelled && hotels && hotels.length > 0) {
        const h = hotels[0] as Record<string, unknown>;
        setCachedHotelId((h.id as string | null) ?? null);
        setCachedSignature((h.response_signature as string | null)?.trim() || "The Management Team");
        setCachedBrandVoiceCompletedAt((h.brand_voice_completed_at as string | null) ?? null);
        setCachedHotelUrls({
          tripadvisor_url: (h.tripadvisor_url as string | null) ?? null,
          google_url: (h.google_url as string | null) ?? null,
          booking_url: (h.booking_url as string | null) ?? null,
          trip_url: (h.trip_url as string | null) ?? null,
          expedia_url: (h.expedia_url as string | null) ?? null,
          yelp_url: (h.yelp_url as string | null) ?? null,
        });
      }

      const hotelIds = (hotels ?? []).map((h: Hotel) => h.id).filter(Boolean);
      if (hotelIds.length === 0) { if (!cancelled) { setReviews([]); setLoading(false); } return; }

      const { data: reviewsData, error: reviewsError } = await supabase
        .from("reviews")
        .select("*")
        .in("hotel_id", hotelIds)
        .order("review_date", { ascending: false, nullsFirst: false });

      if (reviewsError) { if (!cancelled) { setError(reviewsError.message); setLoading(false); } return; }
      if (!cancelled) { setReviews((reviewsData ?? []) as Review[]); setLoading(false); }
    }
    fetchInbox().catch((e) => {
      if (cancelled) return;
      setError(e instanceof Error ? e.message : "Failed to load reviews.");
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [refreshKey]);

  // Backfill review URLs for existing reviews that are missing them
  useEffect(() => {
    if (!cachedHotelId) return;
    const missing = reviews.filter((r) => !r.review_url).length;
    if (missing === 0) return;
    fetch("/api/backfill-review-urls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hotel_id: cachedHotelId }),
    }).catch(() => {});
  }, [cachedHotelId, reviews.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─────────────────────────────────────────────────────────────────────────
  // Loading state
  if (loading) {
    return (
      <div style={{ background: C.pageBg, minHeight: "100vh", padding: "24px 28px", boxSizing: "border-box" }}>
        <style dangerouslySetInnerHTML={{ __html: "@keyframes rv-pulse { 0%,100%{opacity:0.4} 50%{opacity:0.8} }" }} />
        {/* Header skeleton */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Skeleton width="180px" height="22px" />
            <Skeleton width="140px" height="12px" />
          </div>
        </div>
        {/* Stat cards skeleton */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ ...cardStyle, padding: "16px 18px" }}>
              <Skeleton width="60%" height="10px" />
              <div style={{ marginTop: 10 }}><Skeleton width="40%" height="28px" /></div>
            </div>
          ))}
        </div>
        {/* Filter bar skeleton */}
        <div style={{ ...cardStyle, padding: "12px 16px", marginBottom: 16 }}>
          <Skeleton width="100%" height="34px" />
        </div>
        {/* Review card skeletons */}
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ ...cardStyle, padding: "16px 20px", marginBottom: 8 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <Skeleton width="70px" height="20px" />
              <Skeleton width="80px" height="20px" />
            </div>
            <Skeleton width="100%" height="13px" />
            <div style={{ marginTop: 6 }}><Skeleton width="75%" height="13px" /></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ background: C.pageBg, minHeight: "100vh", padding: "60px 28px" }}>
        <ErrorState
          title="Couldn't load reviews"
          message={error}
          onRetry={() => {
            setError(null);
            setRefreshKey((k) => k + 1);
          }}
        />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="gp-fade-in" style={{ background: C.pageBg, minHeight: "100vh", padding: "24px 28px", boxSizing: "border-box" }}>
      <style dangerouslySetInnerHTML={{ __html: "@keyframes rv-pulse { 0%,100%{opacity:0.4} 50%{opacity:0.8} } @keyframes rvspin { to { transform: rotate(360deg); } } @keyframes sync-fadein { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } } @keyframes countdown-bar { from { width:100%; } to { width:0%; } }" }} />

      {/* Upgrade modal */}
      {upgradeModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
          onClick={() => setUpgradeModal(null)}
        >
          <div
            style={{
              background: "#141414",
              border: "1px solid #1e1e1e",
              borderRadius: 8,
              padding: 28,
              maxWidth: 400,
              width: "100%",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 17, fontWeight: 700, color: "#f0f0f0", marginBottom: 12 }}>
              Upgrade to continue
            </div>
            <p style={{ fontSize: 13, color: "#888888", marginBottom: 24, lineHeight: 1.6 }}>
              {upgradeModal.message}
            </p>
            <button
              type="button"
              onClick={() => { setUpgradeModal(null); router.push("/dashboard/pricing"); }}
              style={{
                width: "100%",
                background: "#f0f0f0",
                border: "none",
                borderRadius: 6,
                padding: "11px 0",
                fontSize: 13,
                fontWeight: 600,
                color: "#0d0d0d",
                cursor: "pointer",
                fontFamily: "inherit",
                marginBottom: 12,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#e0e0e0"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#f0f0f0"; }}
            >
              View pricing plans
            </button>
            <button
              type="button"
              onClick={() => setUpgradeModal(null)}
              style={{
                display: "block",
                width: "100%",
                background: "none",
                border: "none",
                color: "#555555",
                fontSize: 13,
                cursor: "pointer",
                fontFamily: "inherit",
                textAlign: "center",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Confirm delete note modal */}
      <ConfirmModal
        open={confirmModal !== null}
        title="Delete note"
        message="Are you sure you want to delete this internal note? This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        onConfirm={() => {
          if (confirmModal) {
            void saveInternalNote(confirmModal.reviewId, "");
            setConfirmModal(null);
          }
        }}
        onCancel={() => setConfirmModal(null)}
      />

      {/* ── 1. Page Header ─────────────────────────────────────────────── */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.textPrimary, margin: 0 }}>Review inbox</h1>
          <p style={{ fontSize: 12, color: C.textMuted, marginTop: 2, marginBottom: 0 }}>
            {summary.total} reviews · {summary.needingResponse} need response
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {/* Language dropdown for AI drafts */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.textMuted }}>
            <span style={{ flexShrink: 0 }}>Draft in:</span>
            <select
              value={draftLanguageOverride ?? defaultResponseLanguage}
              onChange={(e) => {
                const v = e.target.value;
                setDraftLanguageOverride(v === defaultResponseLanguage ? null : v);
              }}
              style={{
                background: "#111111",
                border: "1px solid #2a2a2a",
                borderRadius: 5,
                padding: "4px 8px",
                color: C.textSecondary,
                fontSize: 12,
                outline: "none",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <option value="match-guest">Guest&apos;s language</option>
              <option value="en">English</option>
              <option value="nl">Dutch</option>
              <option value="de">German</option>
              <option value="fr">French</option>
              <option value="es">Spanish</option>
              <option value="it">Italian</option>
              <option value="pt">Portuguese</option>
              <option value="id">Indonesian</option>
              <option value="zh">Chinese</option>
              <option value="ja">Japanese</option>
            </select>
          </div>
          <button
            type="button"
            disabled={classifying || syncing}
            onClick={() => void handleAutoClassify()}
            style={{ ...secondaryBtn({ opacity: classifying || syncing ? 0.5 : 1, cursor: classifying || syncing ? "not-allowed" : "pointer" }), display: "flex", alignItems: "center", gap: 6 }}
          >
            {classifying ? <><Spinner size={12} color="#f0f0f0" /> Classifying…</> : "✦ Auto-classify"}
          </button>
          {classifyRemaining > 0 && !classifying && (
            <button
              type="button"
              disabled={classifying || syncing}
              onClick={() => void handleAutoClassify()}
              style={secondaryBtn({ opacity: syncing ? 0.5 : 1, cursor: syncing ? "not-allowed" : "pointer" })}
            >
              {classifyRemaining} remaining →
            </button>
          )}
          <button
            type="button"
            disabled={syncing || classifying}
            onClick={() => void handleSyncAllReviews()}
            style={{ ...primaryBtn(syncing || classifying), display: "flex", alignItems: "center", gap: 6 }}
          >
            {syncing ? <><Spinner size={12} color="#0d0d0d" /> Syncing…</> : "Sync all reviews"}
          </button>
        </div>
      </header>

      {/* ── 2. Stat Cards ──────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
        {[
          { label: "Total reviews", value: String(summary.total), urgent: false },
          {
            label: "Average rating",
            value: summary.avgRating === null ? "—" : summary.avgRating.toFixed(1),
            urgent: false,
          },
          {
            label: "Needing response",
            value: String(summary.needingResponse),
            urgent: summary.needingResponse > 0,
          },
        ].map((s) => (
          <div key={s.label} style={{ ...cardStyle, padding: "16px 18px" }}>
            <div style={{ ...labelStyle, marginBottom: 8 }}>{s.label}</div>
            <div
              style={{
                fontSize: 36,
                fontWeight: 700,
                letterSpacing: "-1.5px",
                color: s.urgent ? "#ef4444" : C.textPrimary,
                lineHeight: 1,
              }}
            >
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* ── 3. Filter Bar ──────────────────────────────────────────────── */}
      <div style={{ ...cardStyle, padding: "12px 16px", marginBottom: 12 }}>
        {/* Search */}
        <div style={{ position: "relative" }}>
          <span
            style={{
              position: "absolute",
              left: 10,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: 16,
              color: "#444444",
              pointerEvents: "none",
            }}
          >
            ⌕
          </span>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reviews..."
            style={{
              ...inputStyle,
              width: "100%",
              padding: "8px 12px 8px 32px",
            }}
          />
        </div>

        {/* Star rating filter */}
        <div style={{ marginTop: 10, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.textMuted, marginRight: 2 }}>
            Rating:
          </span>
          <button
            type="button"
            onClick={() => setRatingFilter(null)}
            style={{
              background: ratingFilter === null ? "#1e1e1e" : C.inputBg,
              border: `1px solid ${ratingFilter === null ? "#3a3a3a" : C.border}`,
              color: ratingFilter === null ? C.textPrimary : C.textSecondary,
              borderRadius: 6, padding: "5px 12px", fontSize: 11,
              cursor: "pointer", fontFamily: "inherit", fontWeight: ratingFilter === null ? 500 : 400,
            }}
          >
            All ({reviews.length})
          </button>
          {([5, 4, 3, 2, 1] as const).map((star) => {
            const count = reviews.filter((r) => normalizeRating(r.rating ?? r.stars) === star).length;
            const isActive = ratingFilter === star;
            const STAR_COLOR: Record<number, string> = { 5: "#4ade80", 4: "#84cc16", 3: "#fbbf24", 2: "#f97316", 1: "#f87171" };
            const color = STAR_COLOR[star]!;
            return (
              <button
                key={star}
                type="button"
                onClick={() => setRatingFilter(isActive ? null : star)}
                disabled={count === 0}
                style={{
                  background: isActive ? `${color}18` : C.inputBg,
                  border: `1px solid ${isActive ? color : C.border}`,
                  color: count === 0 ? "#333" : isActive ? color : C.textSecondary,
                  borderRadius: 6, padding: "5px 12px", fontSize: 11,
                  cursor: count === 0 ? "not-allowed" : "pointer",
                  opacity: count === 0 ? 0.5 : 1,
                  fontFamily: "inherit", fontWeight: isActive ? 500 : 400,
                  display: "inline-flex", alignItems: "center", gap: 4,
                }}
              >
                <span style={{ color, letterSpacing: -1 }}>{"★".repeat(star)}</span>
                <span>({count})</span>
              </button>
            );
          })}
        </div>

        {/* Filter row */}
        <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          {/* Date range */}
          <div style={{ display: "flex", gap: 4 }}>
            {(
              [
                { v: 7 as const, label: "7d" },
                { v: 30 as const, label: "30d" },
                { v: 90 as const, label: "90d" },
                { v: "all" as const, label: "All" },
              ] as const
            ).map((p) => (
              <Pill key={String(p.v)} active={periodDays === p.v} onClick={() => setPeriodDays(p.v)}>
                {p.label}
              </Pill>
            ))}
          </div>

          {/* Review type */}
          <div style={{ display: "flex", gap: 4 }}>
            {(
              [
                { v: "all" as const, label: "All" },
                { v: "with-text" as const, label: "With text" },
                { v: "star-only" as const, label: "Star only" },
              ] as const
            ).map((opt) => (
              <Pill key={opt.v} active={reviewType === opt.v} onClick={() => setReviewType(opt.v)}>
                {opt.label}
              </Pill>
            ))}
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            style={{
              ...inputStyle,
              padding: "5px 10px",
              fontSize: 11,
              color: C.textSecondary,
              cursor: "pointer",
            }}
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="lowRating">Lowest rating</option>
            <option value="highRating">Highest rating</option>
            <option value="needsFirst">Needs response first</option>
            <option value="flaggedFirst">Flagged first</option>
          </select>

          {/* Platform */}
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            <Pill active={platformFilter === "all"} onClick={() => setPlatformFilter("all")}>All</Pill>
            <Pill active={platformFilter === "tripadvisor"} onClick={() => setPlatformFilter("tripadvisor")}>
              <span style={{ color: "#4ade80" }}>●</span> TripAdvisor
            </Pill>
            <Pill active={platformFilter === "google"} onClick={() => setPlatformFilter("google")}>
              <span style={{ color: "#60a5fa" }}>●</span> Google
            </Pill>
            <Pill active={platformFilter === "booking"} onClick={() => setPlatformFilter("booking")}>
              <span style={{ color: "#a78bfa" }}>●</span> Booking
            </Pill>
            <Pill active={platformFilter === "trip"} onClick={() => setPlatformFilter("trip")}>
              <span style={{ color: "#60a5fa" }}>●</span> Trip.com
            </Pill>
            <Pill active={platformFilter === "expedia"} onClick={() => setPlatformFilter("expedia")}>
              <span style={{ color: "#a78bfa" }}>●</span> Expedia
            </Pill>
            <Pill active={platformFilter === "yelp"} onClick={() => setPlatformFilter("yelp")}>
              <span style={{ color: "#f87171" }}>●</span> Yelp
            </Pill>
          </div>

          {/* Sentiment */}
          <div style={{ display: "flex", gap: 4 }}>
            <Pill active={sentimentFilter === "all"} onClick={() => setSentimentFilter("all")}>All</Pill>
            <Pill active={sentimentFilter === "positive"} onClick={() => setSentimentFilter("positive")}>
              <span style={{ color: C.green }}>●</span> Positive
            </Pill>
            <Pill active={sentimentFilter === "neutral"} onClick={() => setSentimentFilter("neutral")}>
              <span style={{ color: C.textMuted }}>●</span> Neutral
            </Pill>
            <Pill active={sentimentFilter === "negative"} onClick={() => setSentimentFilter("negative")}>
              <span style={{ color: C.red }}>●</span> Negative
            </Pill>
          </div>

          {/* Status */}
          <div style={{ display: "flex", gap: 4 }}>
            <Pill active={respondedFilter === "all"} onClick={() => setRespondedFilter("all")}>All</Pill>
            <Pill active={respondedFilter === "needsResponse"} onClick={() => setRespondedFilter("needsResponse")}>Needs response</Pill>
            <Pill active={respondedFilter === "responded"} onClick={() => setRespondedFilter("responded")}>Responded</Pill>
            <Pill active={respondedFilter === "flagged"} onClick={() => setRespondedFilter("flagged")}>Flagged</Pill>
          </div>

          {/* Count */}
          <span style={{ marginLeft: "auto", fontSize: 11, color: "#444444", whiteSpace: "nowrap" }}>
            Showing {visibleReviews.length} of {reviews.length}
          </span>
        </div>
      </div>

      {/* ── 4. Classify Result ─────────────────────────────────────────── */}
      {(syncMessage || syncError) && (
        <div style={{ marginBottom: 12, position: "relative" }}>
          {syncMessage && (
            <div style={{ background: "#0a1a0a", border: "1px solid #1a3a1a", borderRadius: 6, padding: "10px 36px 10px 14px", marginBottom: syncError ? 6 : 0 }}>
              <div style={{ fontSize: 13, color: C.green }}>✓ {syncMessage}</div>
            </div>
          )}
          {syncError && (
            <div style={{ background: "#1a0a0a", border: "1px solid #3a1a1a", borderRadius: 6, padding: "10px 36px 10px 14px" }}>
              <div style={{ fontSize: 13, color: C.red }}>⚠ {syncError}</div>
            </div>
          )}
          <button
            type="button"
            onClick={() => { setSyncMessage(null); setSyncError(null); }}
            style={{ position: "absolute", top: 8, right: 10, border: "none", background: "transparent", color: C.textMuted, cursor: "pointer", fontSize: 16, lineHeight: 1, fontFamily: "inherit" }}
          >
            ×
          </button>
        </div>
      )}

      {/* ── 4b. Active rating filter chip ──────────────────────────────── */}
      {ratingFilter !== null && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "#1a1a1a", border: `1px solid ${C.borderSub}`,
            borderRadius: 100, padding: "4px 10px", fontSize: 11, color: C.textSecondary,
          }}>
            Showing only {ratingFilter}-star reviews
            <button
              type="button"
              onClick={() => setRatingFilter(null)}
              style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", fontSize: 14, lineHeight: 1, padding: 0, fontFamily: "inherit" }}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* ── 5. Empty state ──────────────────────────────────────────────── */}
      {!loading && visibleReviews.length === 0 && (
        <div style={{ paddingTop: 20 }}>
          {reviews.length > 0 ? (
            <EmptyState
              title="No reviews match your filters"
              description="Try adjusting your search or clearing filters to see more reviews."
              primaryAction={{
                label: "Clear filters",
                onClick: () => {
                  setRatingFilter(null);
                  setSearchQuery("");
                  setPlatformFilter("all");
                  setSentimentFilter("all");
                  setRespondedFilter("all");
                  setReviewType("all");
                  setPeriodDays(30);
                },
              }}
            />
          ) : (
            <EmptyState
              icon={<span style={{ fontSize: 32 }}>☰</span>}
              title="No reviews yet"
              description="Once you sync your platforms, all reviews appear here. Click sync to get started."
              primaryAction={{
                label: syncing ? "Syncing…" : "Sync reviews",
                onClick: () => void handleSyncAllReviews(),
              }}
            />
          )}
        </div>
      )}

      {/* ── 6. All caught up banner ─────────────────────────────────────── */}
      {!loading && reviews.length > 0 && summary.needingResponse === 0 && (
        <div style={{ marginBottom: 12 }}>
          <EmptyState
            variant="success"
            icon={<span style={{ fontSize: 28 }}>✓</span>}
            title="All caught up"
            description="Every review has been responded to. Great work."
          />
        </div>
      )}

      {/* ── 7. Review Cards ─────────────────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {visibleReviews.map((review, idx) => {
          const platform = review.platform ?? review.source ?? "";
          const rating = normalizeRating(review.rating ?? review.stars);
          const reviewerName = review.reviewer_name ?? review.name ?? "Anonymous";
          const reviewText = review.review_text ?? review.body ?? review.text ?? "";
          const sentiment = review.sentiment ?? review.sentiment_label ?? "neutral";
          const complaintTopic = review.complaint_topic ?? review.topic ?? null;
          const responded = review.responded ?? review.has_responded ?? review.is_responded ?? false;
          const reviewId = review.id ?? `${idx}-${platform}`;
          const draft = draftResponses[reviewId] ?? defaultDraftResponse();
          const isPanelOpen = draft.isOpen;
          const hasSavedDraft = (draft.status === "done" || draft.status === "error") && Boolean(draft.text?.trim());
          const hasStableId = Boolean(review.id);
          const reviewDateIso = getReviewDate(review);

          // Left border color
          const flagAccent = review.flagged
            ? review.flag_color === "green" ? "#22c55e" : review.flag_color === "amber" ? C.amber : C.red
            : null;
          const borderLeft = flagAccent
            ? `3px solid ${flagAccent}`
            : sentiment.toLowerCase() === "negative"
              ? `3px solid ${C.red}`
              : sentiment.toLowerCase() === "positive"
                ? `3px solid ${C.green}`
                : "3px solid #333333";

          return (
            <div key={reviewId}>
              {/* Review card */}
              <div
                style={{
                  ...cardStyle,
                  padding: "16px 20px",
                  borderLeft,
                }}
              >
                {/* Top row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <PlatformBadge platform={platform} />
                    <StarRow rating={rating} />
                    <AgePill review={review} responded={Boolean(responded)} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 13, color: C.textSecondary }}>{reviewerName}</span>
                    <span style={{ fontSize: 11, color: C.textMuted }}>·</span>
                    <span
                      title={fullDate(reviewDateIso)}
                      style={{ fontSize: 11, color: dateColor(reviewDateIso), cursor: "help" }}
                    >
                      {formatReviewDate(reviewDateIso)}
                    </span>
                    {/* Flag button */}
                    {hasStableId && (
                      <div data-flag-menu-root style={{ position: "relative" }}>
                        <button
                          type="button"
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
                            border: "none",
                            background: "transparent",
                            color: flagAccent ?? "#333333",
                            cursor: "pointer",
                            fontSize: 14,
                            lineHeight: 1,
                            padding: "2px 4px",
                          }}
                          title={review.flagged ? "Remove flag" : "Flag review"}
                        >
                          ⚑
                        </button>
                        {!review.flagged && flagMenuOpenId === review.id && (
                          <div
                            style={{
                              position: "absolute",
                              top: "calc(100% + 4px)",
                              right: 0,
                              zIndex: 10,
                              minWidth: 180,
                              background: "#1a1a1a",
                              border: `1px solid ${C.borderSub}`,
                              borderRadius: 6,
                              padding: 4,
                            }}
                          >
                            {[
                              { color: "red" as const, label: "🔴 Flag urgent" },
                              { color: "amber" as const, label: "🟡 Flag follow-up" },
                              { color: "green" as const, label: "🟢 Flag resolved" },
                            ].map(({ color, label }) => (
                              <button
                                key={color}
                                type="button"
                                onClick={() => review.id && void updateReviewFlag(review.id, { flagged: true, flag_color: color })}
                                style={{
                                  display: "block",
                                  width: "100%",
                                  textAlign: "left",
                                  padding: "6px 12px",
                                  border: "none",
                                  borderRadius: 4,
                                  background: "transparent",
                                  color: C.textPrimary,
                                  cursor: "pointer",
                                  fontSize: 12,
                                  fontFamily: "inherit",
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = "#222222"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Review text */}
                <div style={{ marginTop: 10, fontSize: 13, color: "#cccccc", lineHeight: 1.6 }}>
                  {reviewText ? reviewText : <em style={{ color: "#444444" }}>No written review</em>}
                </div>

                {/* Tags row */}
                <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
                  <SentimentBadge sentiment={sentiment} />
                  {complaintTopic && <TopicPill topicSlug={complaintTopic} topicType={review.topic_type} />}
                  {(() => {
                    const viewUrl = getReviewUrl(review, cachedHotelUrls);
                    if (!viewUrl) return null;
                    const color = platformLinkColor(platform);
                    return (
                      <a
                        href={viewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          background: "transparent",
                          border: "1px solid #2a2a2a",
                          color: "#888",
                          borderRadius: 5,
                          padding: "3px 9px",
                          fontSize: 11,
                          textDecoration: "none",
                          cursor: "pointer",
                          transition: "all 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = color;
                          e.currentTarget.style.color = color;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = "#2a2a2a";
                          e.currentTarget.style.color = "#888";
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        View on {platformLabel(platform)} <span style={{ fontSize: 10 }}>↗</span>
                      </a>
                    );
                  })()}
                  {responded && (
                    <span style={{ borderRadius: 3, padding: "2px 8px", fontSize: 11, background: "#052e16", color: C.green }}>
                      ✓ Responded
                    </span>
                  )}
                </div>

                {/* Actions row */}
                <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                  {/* Draft button (only if not responded) */}
                  {!responded && hasStableId && (
                    <button
                      type="button"
                      onClick={() => void handleDraftResponse(review)}
                      disabled={isPanelOpen && draft.status === "loading"}
                      style={{
                        background: C.textPrimary,
                        color: "#0d0d0d",
                        border: "none",
                        borderRadius: 5,
                        padding: "6px 14px",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: isPanelOpen && draft.status === "loading" ? "not-allowed" : "pointer",
                        opacity: isPanelOpen && draft.status === "loading" ? 0.6 : 1,
                        fontFamily: "inherit",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      {isPanelOpen && draft.status === "loading" ? (
                        <>
                          <span style={{ width: 12, height: 12, borderRadius: "50%", border: "2px solid #ccc", borderTopColor: "#0d0d0d", animation: "rvspin 0.8s linear infinite", display: "inline-block" }} />
                          Generating…
                        </>
                      ) : isPanelOpen ? "Hide response" : hasSavedDraft ? (
                        <><span style={{ width: 6, height: 6, borderRadius: "50%", background: C.green, display: "inline-block" }} />Show draft</>
                      ) : "Draft AI response"}
                    </button>
                  )}

                  {/* Undo responded */}
                  {responded && hasStableId && (
                    undoConfirmId === review.id ? (
                      <span style={{ fontSize: 11, color: C.textMuted, display: "flex", alignItems: "center", gap: 6 }}>
                        Sure?
                        <button type="button" onClick={() => review.id && void handleUndoResponded(review.id)} style={{ border: "none", background: "transparent", color: C.red, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>Yes</button>
                        <button type="button" onClick={() => setUndoConfirmId(null)} style={{ border: "none", background: "transparent", color: C.textSecondary, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>No</button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setUndoConfirmId(review.id!)}
                        style={{ background: "transparent", border: `1px solid ${C.borderSub}`, color: C.textMuted, borderRadius: 4, padding: "4px 10px", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}
                      >
                        ↩ Undo
                      </button>
                    )
                  )}

                  {/* Note toggle */}
                  {hasStableId && !noteEditorId && !review.internal_note && (
                    <button
                      type="button"
                      onClick={() => { setNoteEditorId(review.id!); setNoteDraft(""); }}
                      style={{ border: "none", background: "transparent", color: C.textMuted, fontSize: 11, cursor: "pointer", fontFamily: "inherit", padding: 0 }}
                    >
                      ＋ Note
                    </button>
                  )}
                </div>

                {/* Draft panel */}
                {isPanelOpen && draft.status !== "idle" && hasStableId && (
                  <div
                    style={{
                      marginTop: 12,
                      background: "#1a1a1a",
                      border: `1px solid ${C.borderSub}`,
                      borderTop: `2px solid ${C.green}`,
                      borderRadius: "0 0 8px 8px",
                      padding: "14px 16px",
                      position: "relative",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", color: C.green, textTransform: "uppercase" }}>
                        AI DRAFT READY
                      </span>
                      <button
                        type="button"
                        onClick={() => patchDraftResponse(reviewId, { isOpen: false })}
                        style={{ border: "none", background: "transparent", color: "#444444", fontSize: 16, cursor: "pointer", lineHeight: 1, fontFamily: "inherit" }}
                      >
                        ×
                      </button>
                    </div>

                    {draft.status === "loading" ? (
                      <div style={{ fontSize: 13, color: C.textSecondary, display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid #333", borderTopColor: C.green, animation: "rvspin 0.8s linear infinite", display: "inline-block" }} />
                        Generating…
                      </div>
                    ) : draft.status === "error" ? (
                      <p style={{ fontSize: 13, color: C.red, margin: 0 }}>{draft.text}</p>
                    ) : (
                      <>
                        {/* Metadata row */}
                        {(() => {
                          const meta = draftMetadata[reviewId];
                          if (!meta) return null;
                          const tags: string[] = [];
                          tags.push(`✓ Voice: ${TONE_LABELS[meta.tone] ?? meta.tone}`);
                          tags.push(`✓ Length: ${meta.length}`);
                          tags.push(`✓ Language: ${LANG_LABELS[meta.language] ?? meta.language}`);
                          if (meta.used_examples > 0) tags.push(`✓ Trained on ${meta.used_examples} example${meta.used_examples !== 1 ? "s" : ""}`);
                          if (meta.addressed_by_name) {
                            const firstName = reviewerName !== "Anonymous" ? reviewerName.split(" ")[0] : null;
                            if (firstName) tags.push(`✓ Addressed ${firstName}`);
                          }
                          return (
                            <div style={{
                              background: "#0a1a0a",
                              border: "1px solid #1a3a1a",
                              borderRadius: 4,
                              padding: "6px 10px",
                              marginBottom: 8,
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 12,
                            }}>
                              {tags.map((t) => (
                                <span key={t} style={{ fontSize: 11, color: C.green }}>{t}</span>
                              ))}
                            </div>
                          );
                        })()}
                        <textarea
                          value={draft.text}
                          onChange={(e) => patchDraftResponse(reviewId, { text: e.target.value })}
                          style={{
                            ...inputStyle,
                            width: "100%",
                            minHeight: 100,
                            resize: "vertical",
                            padding: "10px 12px",
                            lineHeight: 1.7,
                            fontSize: 13,
                            color: "#cccccc",
                          }}
                        />
                        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                          <button
                            type="button"
                            onClick={async () => {
                              await navigator.clipboard.writeText(draft.text);
                              patchDraftResponse(reviewId, { copied: true });
                              setTimeout(() => patchDraftResponse(reviewId, { copied: false }), 2000);
                            }}
                            style={{
                              background: C.textPrimary,
                              border: "none",
                              color: "#0d0d0d",
                              borderRadius: 5,
                              padding: "6px 14px",
                              fontSize: 12,
                              fontWeight: 500,
                              cursor: "pointer",
                              fontFamily: "inherit",
                            }}
                          >
                            {draft.copied ? "✓ Copied" : "Copy"}
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDraftResponse(review, true)}
                            style={{
                              background: "transparent",
                              border: `1px solid ${C.borderSub}`,
                              color: C.textSecondary,
                              borderRadius: 5,
                              padding: "6px 14px",
                              fontSize: 12,
                              cursor: "pointer",
                              fontFamily: "inherit",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 5,
                            }}
                          >
                            ↻ Regenerate
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDiscardDraft(reviewId)}
                            style={{
                              background: "transparent",
                              border: "1px solid #2a1a1a",
                              color: C.red,
                              borderRadius: 5,
                              padding: "6px 14px",
                              fontSize: 12,
                              cursor: "pointer",
                              fontFamily: "inherit",
                            }}
                          >
                            Discard
                          </button>
                          <button
                            type="button"
                            disabled={draft.markingResponded}
                            onClick={() => review.id && void handleMarkResponded(review.id)}
                            style={{ ...primaryBtn(draft.markingResponded), marginLeft: "auto" }}
                          >
                            {draft.markingResponded ? "Saving…" : "Mark as responded"}
                          </button>
                        </div>
                        {draft.markError && (
                          <p style={{ fontSize: 12, color: C.red, marginTop: 6, marginBottom: 0 }}>{draft.markError}</p>
                        )}
                        {/* Open platform prompt */}
                        {(() => {
                          const platformUrl = getReviewUrl(review, cachedHotelUrls);
                          if (!platformUrl) return null;
                          const color = platformLinkColor(platform);
                          return (
                            <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                              <span style={{ fontSize: 12, color: C.textMuted }}>After copying, paste your response on the platform:</span>
                              <a
                                href={platformUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ fontSize: 12, color, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 3 }}
                                onMouseEnter={(e) => { e.currentTarget.style.textDecoration = "underline"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.textDecoration = "none"; }}
                              >
                                Open {platformLabel(platform)} ↗
                              </a>
                            </div>
                          );
                        })()}
                        {/* Brand voice indicator / default voice warning */}
                        {(() => {
                          const bv = brandVoiceMap[reviewId];
                          if (!cachedBrandVoiceCompletedAt) {
                            return (
                              <div style={{
                                background: "#1a1200",
                                border: "1px solid #2a2000",
                                borderRadius: 4,
                                padding: "8px 12px",
                                marginTop: 8,
                                fontSize: 12,
                                color: C.amber,
                              }}>
                                ⚡ Using default voice.{" "}
                                <a href="/dashboard/settings?tab=brand-voice" style={{ color: C.amber, textDecoration: "underline" }}>
                                  Train your brand voice for better responses →
                                </a>
                              </div>
                            );
                          }
                          if (bv?.used) {
                            return (
                              <p style={{ fontSize: 11, color: C.green, marginTop: 8, marginBottom: 0 }}>
                                ✓ Trained on your brand voice ({bv.count} example{bv.count !== 1 ? "s" : ""})
                              </p>
                            );
                          }
                          return null;
                        })()}
                      </>
                    )}
                  </div>
                )}

                {/* Internal note */}
                {hasStableId && (
                  <div style={{ marginTop: noteEditorId === review.id || review.internal_note ? 10 : 0 }}>
                    {noteEditorId === review.id ? (
                      <div>
                        <textarea
                          value={noteDraft}
                          onChange={(e) => setNoteDraft(e.target.value)}
                          rows={3}
                          placeholder="Add a private note… (only you can see this)"
                          style={{ ...inputStyle, width: "100%", padding: "8px", minHeight: 60, resize: "vertical", fontSize: 12, lineHeight: 1.5 }}
                        />
                        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                          <button
                            type="button"
                            onClick={() => review.id && void saveInternalNote(review.id, noteDraft)}
                            style={primaryBtn()}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => { setNoteEditorId(null); setNoteDraft(""); }}
                            style={secondaryBtn({ padding: "6px 12px", fontSize: 12 })}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : review.internal_note ? (
                      <div
                        style={{
                          background: C.inputBg,
                          borderLeft: `2px solid ${C.amber}`,
                          borderRadius: 5,
                          padding: "8px 12px",
                          fontSize: 12,
                          color: C.textSecondary,
                          fontStyle: "italic",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          gap: 8,
                        }}
                      >
                        <span style={{ flex: 1, wordBreak: "break-word" }}>Note: {review.internal_note}</span>
                        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                          <button
                            type="button"
                            onClick={() => { setNoteEditorId(review.id!); setNoteDraft(review.internal_note ?? ""); }}
                            style={{ border: "none", background: "transparent", color: C.textMuted, cursor: "pointer", fontSize: 14, lineHeight: 1, padding: 2 }}
                            title="Edit note"
                          >
                            ✎
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmModal({ reviewId: review.id! })}
                            style={{ border: "none", background: "transparent", color: C.textMuted, cursor: "pointer", fontSize: 16, lineHeight: 1, padding: 2 }}
                            title="Delete note"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

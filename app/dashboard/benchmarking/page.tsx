"use client";

import { createBrowserClient } from "@supabase/ssr";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";

import type { MapHotel, MapCompetitor } from "./MapComponent";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";
import ConfirmModal from "@/components/ConfirmModal";
import { useToast } from "@/components/Toast";

const MapComponent = dynamic(() => import("./MapComponent"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: 280,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#141414",
        color: "#555555",
        fontSize: 14,
      }}
    >
      Loading map…
    </div>
  ),
});

// ─── Color palette ────────────────────────────────────────────────────────────
const PAGE_BG = "#0d0d0d";
const CARD = "#141414";
const BORDER = "#1e1e1e";
const BORDER_SUB = "#2a2a2a";
const TEXT_PRIMARY = "#f0f0f0";
const TEXT_SECONDARY = "#888888";
const TEXT_MUTED = "#555555";

// ─── Types ────────────────────────────────────────────────────────────────────
type Hotel = {
  id: string;
  name?: string | null;
  google_url?: string | null;
  tripadvisor_url?: string | null;
  booking_url?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  // Analysis fields (loaded in background)
  description?: string | null;
  usps?: unknown;
  strengths?: unknown;
  weaknesses?: unknown;
  amenities?: unknown;
  price_tier?: string | null;
  target_guest?: string | null;
  last_analyzed_at?: string | null;
};

type Competitor = {
  id: string;
  hotel_id: string;
  name: string;
  google_url?: string | null;
  tripadvisor_url?: string | null;
  avg_rating?: number | null;
  total_reviews?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  last_synced_at?: string | null;
  recent_snippets?: string | null;
  // Analysis fields
  description?: string | null;
  usps?: unknown;
  strengths?: unknown;
  weaknesses?: unknown;
  amenities?: unknown;
  price_tier?: string | null;
  target_guest?: string | null;
  last_analyzed_at?: string | null;
};

type Suggestion = {
  name: string;
  google_url: string;
  avg_rating: number;
  total_reviews: number;
  address: string;
  latitude: number | null;
  longitude: number | null;
  reason: string;
};

type InsightJson = {
  market_position: string;
  my_advantage: string;
  biggest_threat: string;
  quick_win: string;
  rating_gap: string;
};

type ComparisonResult = {
  unique_advantages: Array<{
    advantage: string;
    vs_competitors: string;
    how_to_leverage: string;
  }>;
  competitive_gaps: Array<{
    gap: string;
    who_has_it: string;
    priority: string;
    action: string;
  }>;
  shared_strengths: string[];
  market_positioning: {
    your_position: string;
    recommended_position: string;
    differentiation_strategy: string;
  };
  quick_wins: Array<{
    win: string;
    impact: string;
    effort: string;
  }>;
  long_term_strategy: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────
const INSIGHT_CARDS: Array<{
  key: keyof InsightJson;
  icon: string;
  label: string;
  color: string;
}> = [
  { key: "market_position", icon: "◎", label: "MARKET POSITION", color: "#60a5fa" },
  { key: "my_advantage", icon: "✓", label: "YOUR ADVANTAGE", color: "#4ade80" },
  { key: "biggest_threat", icon: "⚠", label: "BIGGEST THREAT", color: "#f87171" },
  { key: "quick_win", icon: "→", label: "QUICK WIN", color: "#a78bfa" },
  { key: "rating_gap", icon: "△", label: "RATING GAP", color: "#fbbf24" },
];

// Essential fields — loaded first for fast initial render
const HOTEL_ESSENTIAL_SELECT = [
  "id",
  "name",
  "google_url",
  "tripadvisor_url",
  "booking_url",
  "address",
  "city",
  "country",
  "latitude",
  "longitude",
].join(", ");

// Analysis fields — loaded in background after essential render
const HOTEL_ANALYSIS_SELECT = [
  "description",
  "usps",
  "strengths",
  "weaknesses",
  "amenities",
  "price_tier",
  "target_guest",
  "last_analyzed_at",
].join(", ");

const COMP_ESSENTIAL_SELECT = [
  "id",
  "hotel_id",
  "name",
  "google_url",
  "tripadvisor_url",
  "avg_rating",
  "total_reviews",
  "latitude",
  "longitude",
  "address",
  "last_synced_at",
  "recent_snippets",
].join(", ");

const COMP_ANALYSIS_SELECT = [
  "id",
  "description",
  "usps",
  "strengths",
  "weaknesses",
  "amenities",
  "price_tier",
  "target_guest",
  "last_analyzed_at",
].join(", ");

// Full select — used for insert/update returns
const COMP_SELECT = [
  "id",
  "hotel_id",
  "name",
  "google_url",
  "tripadvisor_url",
  "avg_rating",
  "total_reviews",
  "latitude",
  "longitude",
  "address",
  "last_synced_at",
  "recent_snippets",
  "description",
  "usps",
  "strengths",
  "weaknesses",
  "amenities",
  "price_tier",
  "target_guest",
  "last_analyzed_at",
].join(", ");

// ─── Utilities ────────────────────────────────────────────────────────────────
function extractCoords(url: string | null | undefined): { lat: number; lng: number } | null {
  const match = url?.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  return match ? { lat: parseFloat(match[1]!), lng: parseFloat(match[2]!) } : null;
}

function ratingColor(r: number | null | undefined): string {
  if (r == null || Number.isNaN(Number(r))) return TEXT_MUTED;
  const v = Number(r);
  if (v >= 4.5) return "#4ade80";
  if (v >= 4.0) return "#84cc16";
  if (v >= 3.5) return "#fbbf24";
  return "#f87171";
}

function truncName(name: string, max = 18): string {
  const t = (name ?? "").trim();
  if (!t) return "Hotel";
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

function formatTimeAgo(iso: string | null | undefined): string {
  if (!iso) return "Never";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "Never";
  const sec = Math.floor((Date.now() - t) / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 14) return `${d}d ago`;
  return `${Math.floor(d / 7)}w ago`;
}

function getRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const diffMs = Date.now() - date.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (days === 0 && hours < 1) return "just now";
  if (days === 0) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  return `${Math.floor(days / 30)} month${Math.floor(days / 30) !== 1 ? "s" : ""} ago`;
}

function getExpiresIn(dateStr: string): { text: string; color: string } {
  const date = new Date(dateStr);
  const diffMs = date.getTime() - Date.now();
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (days <= 0) return { text: "expired", color: "#f87171" };
  if (days === 1) return { text: "1 day", color: "#f87171" };
  if (days <= 3) return { text: `${days} days`, color: "#f87171" };
  if (days < 7) return { text: `${days} days`, color: "#fbbf24" };
  if (days < 30) return { text: `${days} days`, color: TEXT_MUTED };
  return { text: `${Math.floor(days / 30)} month${Math.floor(days / 30) !== 1 ? "s" : ""}`, color: TEXT_MUTED };
}

function isAnalysisExpired(lastAnalyzedAt: string | null | undefined): boolean {
  if (!lastAnalyzedAt) return false;
  const daysSince = (Date.now() - new Date(lastAnalyzedAt).getTime()) / (1000 * 60 * 60 * 24);
  return daysSince > 30;
}

function toStringArray(val: unknown): string[] {
  if (!Array.isArray(val)) return [];
  return val.filter((x): x is string => typeof x === "string");
}

function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

// ─── Shared style builders ────────────────────────────────────────────────────
const cardStyle: CSSProperties = {
  background: CARD,
  border: `1px solid ${BORDER}`,
  borderRadius: 8,
};

const sectionLabelStyle: CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: TEXT_MUTED,
  marginBottom: 12,
};

function primaryBtnStyle(disabled = false): CSSProperties {
  return {
    background: "#f0f0f0",
    border: "none",
    borderRadius: 6,
    padding: "7px 14px",
    color: "#0d0d0d",
    fontWeight: 600,
    fontSize: 12,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    fontFamily: "inherit",
    whiteSpace: "nowrap",
  };
}

function secondaryBtnStyle(extra: CSSProperties = {}): CSSProperties {
  return {
    background: "transparent",
    border: `1px solid ${BORDER_SUB}`,
    borderRadius: 6,
    color: TEXT_SECONDARY,
    fontWeight: 500,
    fontSize: 12,
    cursor: "pointer",
    fontFamily: "inherit",
    padding: "6px 14px",
    ...extra,
  };
}

const inputStyle: CSSProperties = {
  background: "#111111",
  border: `1px solid ${BORDER_SUB}`,
  borderRadius: 5,
  padding: "8px 12px",
  color: TEXT_PRIMARY,
  fontSize: 13,
  outline: "none",
  fontFamily: "inherit",
  width: "100%",
  boxSizing: "border-box",
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function BenchmarkingPage() {
  const { showToast } = useToast();

  // Core data
  const [loading, setLoading] = useState(true);
  const [loadingAnalysis, setLoadingAnalysis] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [myAvgRating, setMyAvgRating] = useState<number | null>(null);
  const [myTotalReviews, setMyTotalReviews] = useState(0);

  // Find competitors
  const [finding, setFinding] = useState(false);
  const [findError, setFindError] = useState<string | null>(null);
  const [findSteps, setFindSteps] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selectedIdxs, setSelectedIdxs] = useState<Set<number>>(new Set());
  const [addingSelected, setAddingSelected] = useState(false);
  const [addProgress, setAddProgress] = useState<Map<number, string>>(new Map());

  // Sync
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Insights
  const [insights, setInsights] = useState<InsightJson | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);

  // Manual add
  const [showManual, setShowManual] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualGoogleUrl, setManualGoogleUrl] = useState("");
  const [manualTAUrl, setManualTAUrl] = useState("");
  const [addingManual, setAddingManual] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);

  // Remove
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removeConfirm, setRemoveConfirm] = useState<{ open: boolean; id: string; name: string }>({ open: false, id: "", name: "" });

  // Analysis
  const [analyzingHotel, setAnalyzingHotel] = useState(false);
  const [analyzingCompetitorIds, setAnalyzingCompetitorIds] = useState<Set<string>>(new Set());
  const [analysisToast, setAnalysisToast] = useState<string | null>(null);

  // Competitive comparison
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [comparisonError, setComparisonError] = useState<string | null>(null);
  const [comparisonMeta, setComparisonMeta] = useState<{
    generated_at?: string;
    expires_at?: string;
  }>({});

  // Feature comparison expanded rows
  const [expandedFeatureRows, setExpandedFeatureRows] = useState<Set<string>>(new Set());

  // ── Insights generation ────────────────────────────────────────────────────
  async function doGenerateInsights(
    hotelArg: Hotel,
    myAvg: number | null,
    myTotal: number,
    comps: Competitor[],
  ) {
    const syncedComps = comps.filter(
      (c) => c.avg_rating != null && !Number.isNaN(Number(c.avg_rating)),
    );
    if (!syncedComps.length) return;

    setInsightsLoading(true);
    setInsightsError(null);

    try {
      const res = await fetch("/api/competitor-insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          my_hotel: {
            name: hotelArg.name,
            avg_rating: myAvg,
            total_reviews: myTotal,
          },
          competitors: syncedComps.map((c) => ({
            name: c.name,
            avg_rating: Number(c.avg_rating),
            total_reviews: c.total_reviews ?? 0,
            recent_snippets: c.recent_snippets,
          })),
        }),
      });
      const data = (await res.json()) as {
        success?: boolean;
        insight?: InsightJson;
        error?: string;
      };
      if (data.success && data.insight) setInsights(data.insight);
      else setInsightsError(data.error ?? "Failed to generate insights");
    } catch (e) {
      setInsightsError(e instanceof Error ? e.message : "Failed");
    } finally {
      setInsightsLoading(false);
    }
  }

  // ── Analyze entity (hotel or competitor) ──────────────────────────────────
  async function analyzeEntityDirect(entityId: string, entityType: "hotel" | "competitor") {
    const res = await fetch("/api/analyze-competitor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity_type: entityType, entity_id: entityId }),
    });
    const data = (await res.json()) as {
      success?: boolean;
      analysis?: Record<string, unknown>;
      error?: string;
    };
    if (data.success && data.analysis) {
      if (entityType === "hotel") {
        setHotel((prev) => (prev ? { ...prev, ...(data.analysis as Partial<Hotel>) } : prev));
      } else {
        setCompetitors((prev) =>
          prev.map((c) =>
            c.id === entityId ? { ...c, ...(data.analysis as Partial<Competitor>) } : c,
          ),
        );
      }
    }
    return data;
  }

  async function handleAnalyzeCompetitor(id: string) {
    if (analyzingCompetitorIds.has(id)) return;
    setAnalyzingCompetitorIds((prev) => new Set([...prev, id]));
    try {
      await analyzeEntityDirect(id, "competitor");
    } finally {
      setAnalyzingCompetitorIds((prev) => {
        const s = new Set(prev);
        s.delete(id);
        return s;
      });
    }
  }

  // ── Competitive comparison pipeline ───────────────────────────────────────
  async function handleGenerateComparison() {
    if (!hotel || comparisonLoading) return;
    setComparisonLoading(true);
    setComparisonError(null);

    // Step 1: Analyze each unanalyzed competitor
    const unanalyzed = competitors.filter((c) => !c.description);
    if (unanalyzed.length > 0) {
      for (let i = 0; i < unanalyzed.length; i++) {
        const comp = unanalyzed[i]!;
        setAnalysisToast(`Analyzing ${comp.name}… (${i + 1} of ${unanalyzed.length})`);
        setAnalyzingCompetitorIds((prev) => new Set([...prev, comp.id]));
        try {
          await analyzeEntityDirect(comp.id, "competitor");
        } catch {
          // continue
        } finally {
          setAnalyzingCompetitorIds((prev) => {
            const s = new Set(prev);
            s.delete(comp.id);
            return s;
          });
        }
      }
    }

    // Step 2: Analyze hotel if not analyzed
    if (!hotel.description) {
      setAnalysisToast("Analyzing your hotel…");
      setAnalyzingHotel(true);
      try {
        await analyzeEntityDirect(hotel.id, "hotel");
      } catch {
        // continue
      } finally {
        setAnalyzingHotel(false);
      }
    }

    setAnalysisToast("Running competitive comparison…");

    // Step 3: Run comparison
    try {
      const res = await fetch("/api/competitive-comparison", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hotel_id: hotel.id }),
      });
      const data = (await res.json()) as {
        success?: boolean;
        comparison?: ComparisonResult;
        error?: string;
        needs_analysis?: boolean;
        generated_at?: string;
        expires_at?: string;
      };
      if (data.success && data.comparison) {
        setComparison(data.comparison);
        setComparisonMeta({
          generated_at: data.generated_at ?? new Date().toISOString(),
          expires_at: data.expires_at,
        });
      } else {
        setComparisonError(data.error ?? "Failed to generate comparison");
      }
    } catch (e) {
      setComparisonError(e instanceof Error ? e.message : "Failed");
    } finally {
      setComparisonLoading(false);
      setAnalysisToast(null);
    }
  }

  // ── Load saved comparison from DB ────────────────────────────────────────
  async function loadSavedComparison(hotelId: string) {
    try {
      const res = await fetch(`/api/competitive-comparison/get?hotel_id=${hotelId}`);
      const data = (await res.json()) as {
        exists?: boolean;
        comparison?: ComparisonResult;
        generated_at?: string;
        expires_at?: string;
        error?: string;
      };
      if (data.exists && data.comparison) {
        setComparison(data.comparison);
        setComparisonMeta({
          generated_at: data.generated_at,
          expires_at: data.expires_at,
        });
      }
    } catch (err) {
      console.error("Failed to load comparison:", err);
    }
  }

  // ── Load essential data (fast, unblocks render) ───────────────────────────
  const loadEssential = useCallback(async (): Promise<string | null> => {
    const sb = createSupabaseBrowserClient();

    const {
      data: { user },
      error: userError,
    } = await sb.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error("You must be signed in.");

    const { data: hotelData, error: hotelsError } = await sb
      .from("hotels")
      .select(HOTEL_ESSENTIAL_SELECT)
      .eq("user_id", user.id)
      .maybeSingle();

    if (hotelsError) throw hotelsError;

    if (!hotelData) {
      setHotel(null);
      setCompetitors([]);
      return null;
    }

    const typedHotel = hotelData as unknown as Hotel;
    setHotel(typedHotel);

    const { data: reviewsData } = await sb
      .from("reviews")
      .select("rating")
      .eq("hotel_id", typedHotel.id)
      .not("rating", "is", null);

    const myRatings = ((reviewsData ?? []) as { rating: unknown }[])
      .map((r) => Number(r.rating))
      .filter((n) => !Number.isNaN(n));

    const myAvg =
      myRatings.length > 0
        ? Math.round((myRatings.reduce((a, b) => a + b, 0) / myRatings.length) * 10) / 10
        : null;
    const myTotal = myRatings.length;

    setMyAvgRating(myAvg);
    setMyTotalReviews(myTotal);

    const { data: compsData, error: compsError } = await sb
      .from("competitors")
      .select(COMP_ESSENTIAL_SELECT)
      .eq("hotel_id", typedHotel.id)
      .order("avg_rating", { ascending: false });

    if (compsError) throw compsError;

    setCompetitors((compsData ?? []) as unknown as Competitor[]);

    return typedHotel.id;
  }, []);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError(null);
      let hotelId: string | null = null;
      try {
        hotelId = await loadEssential();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
        setLoading(false);
        setLoadingAnalysis(false);
        return;
      }
      setLoading(false);

      if (!hotelId) {
        setLoadingAnalysis(false);
        return;
      }

      // Load analysis fields in background — does not block render
      const sb = createSupabaseBrowserClient();
      try {
        const [{ data: hotelAnalysis }, { data: compsAnalysis }] = await Promise.all([
          sb.from("hotels").select(HOTEL_ANALYSIS_SELECT).eq("id", hotelId).maybeSingle(),
          sb.from("competitors").select(COMP_ANALYSIS_SELECT).eq("hotel_id", hotelId),
        ]);

        if (hotelAnalysis) {
          setHotel((prev) =>
            prev ? { ...prev, ...(hotelAnalysis as unknown as Partial<Hotel>) } : prev,
          );
        }

        if (compsAnalysis && compsAnalysis.length > 0) {
          const analysisMap = new Map(
            (compsAnalysis as unknown as Array<{ id: string } & Record<string, unknown>>).map(
              (c) => [c.id, c],
            ),
          );
          setCompetitors((prev) =>
            prev.map((c) => {
              const a = analysisMap.get(c.id);
              if (!a) return c;
              const merged = { ...c, ...(a as Partial<Competitor>) };
              // Treat competitor analyses older than 30 days as expired
              if (isAnalysisExpired(merged.last_analyzed_at)) {
                return {
                  ...merged,
                  description: null,
                  usps: null,
                  strengths: null,
                  weaknesses: null,
                  amenities: null,
                };
              }
              return merged;
            }),
          );
        }

        // Load saved competitive analysis from DB
        void loadSavedComparison(hotelId);
      } catch {
        // Analysis fields are non-critical — silently ignore
      } finally {
        setLoadingAnalysis(false);
      }
    })();
  }, [loadEssential]);

  // ── Sync all ──────────────────────────────────────────────────────────────
  async function handleSyncAll() {
    if (!hotel || syncingAll) return;
    setSyncingAll(true);
    setSyncMsg(null);
    setSyncError(null);

    const toSync = competitors.filter((c) => c.google_url);
    let synced = 0;
    let updatedComps = [...competitors];

    for (const comp of toSync) {
      setSyncingIds((prev) => new Set([...prev, comp.id]));
      try {
        const res = await fetch("/api/scrape-competitor-reviews", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ competitor_id: comp.id, hotel_id: hotel.id }),
        });
        const data = (await res.json()) as {
          success?: boolean;
          avg_rating?: number | null;
          total_reviews?: number;
        };
        if (data.success) {
          synced++;
          const now = new Date().toISOString();
          updatedComps = updatedComps.map((c) =>
            c.id === comp.id
              ? {
                  ...c,
                  avg_rating: data.avg_rating ?? c.avg_rating,
                  total_reviews: data.total_reviews ?? c.total_reviews,
                  last_synced_at: now,
                }
              : c,
          );
          setCompetitors([...updatedComps]);
        }
      } catch {
        // continue to next
      } finally {
        setSyncingIds((prev) => {
          const s = new Set(prev);
          s.delete(comp.id);
          return s;
        });
      }
    }

    setSyncMsg(`Synced ${synced} of ${toSync.length} competitors`);
    setSyncingAll(false);

    await doGenerateInsights(hotel, myAvgRating, myTotalReviews, updatedComps);
  }

  // ── Sync one ──────────────────────────────────────────────────────────────
  async function handleSyncOne(id: string) {
    if (!hotel || syncingIds.has(id)) return;
    setSyncingIds((prev) => new Set([...prev, id]));
    try {
      const res = await fetch("/api/scrape-competitor-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ competitor_id: id, hotel_id: hotel.id }),
      });
      const data = (await res.json()) as {
        success?: boolean;
        avg_rating?: number | null;
        total_reviews?: number;
      };
      if (data.success) {
        const now = new Date().toISOString();
        const updatedComps = competitors.map((c) =>
          c.id === id
            ? {
                ...c,
                avg_rating: data.avg_rating ?? c.avg_rating,
                total_reviews: data.total_reviews ?? c.total_reviews,
                last_synced_at: now,
              }
            : c,
        );
        setCompetitors(updatedComps);
        await doGenerateInsights(hotel, myAvgRating, myTotalReviews, updatedComps);
      }
    } finally {
      setSyncingIds((prev) => {
        const s = new Set(prev);
        s.delete(id);
        return s;
      });
    }
  }

  // ── Find competitors ──────────────────────────────────────────────────────
  async function handleFindCompetitors() {
    if (!hotel?.id || finding) return;
    setFinding(true);
    setFindError(null);
    setSuggestions([]);
    setSelectedIdxs(new Set());
    setAddProgress(new Map());
    setFindSteps(["Searching Google Maps for nearby hotels…"]);

    const laterSteps = [
      "Analyzing hotel categories and ratings…",
      "Asking AI to select the best matches…",
    ];
    let si = 0;
    const timer = setInterval(() => {
      if (si < laterSteps.length) {
        setFindSteps((prev) => [...prev, laterSteps[si++]!]);
      } else {
        clearInterval(timer);
      }
    }, 3500);

    try {
      const res = await fetch("/api/find-competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hotel_id: hotel.id }),
      });
      clearInterval(timer);
      const data = (await res.json()) as {
        success?: boolean;
        suggestions?: Suggestion[];
        error?: string;
      };

      if (!res.ok || !data.success) {
        setFindError(data.error ?? "Failed to find competitors");
        setFindSteps([]);
      } else {
        setSuggestions(data.suggestions ?? []);
        setFindSteps([]);
      }
    } catch (e) {
      clearInterval(timer);
      setFindError(e instanceof Error ? e.message : "Request failed");
      setFindSteps([]);
    } finally {
      setFinding(false);
    }
  }

  // ── Add selected suggestions ──────────────────────────────────────────────
  async function handleAddSelected() {
    if (!hotel || addingSelected || selectedIdxs.size === 0) return;
    setAddingSelected(true);

    const sb = createSupabaseBrowserClient();
    const selectedList = [...selectedIdxs].map((i) => ({ idx: i, s: suggestions[i]! }));
    let updatedComps = [...competitors];

    for (const { idx, s } of selectedList) {
      setAddProgress((prev) => new Map([...prev, [idx, "Adding…"]]));

      const { data: inserted, error: insertError } = await sb
        .from("competitors")
        .insert({
          hotel_id: hotel.id,
          name: s.name,
          google_url: s.google_url || null,
          avg_rating: s.avg_rating,
          total_reviews: s.total_reviews,
          address: s.address || null,
          latitude: s.latitude,
          longitude: s.longitude,
        })
        .select(COMP_SELECT)
        .single();

      if (insertError || !inserted) {
        setAddProgress((prev) => new Map([...prev, [idx, "Error"]]));
        continue;
      }

      const newComp = inserted as unknown as Competitor;
      updatedComps = [...updatedComps, newComp];
      setCompetitors([...updatedComps]);

      setAddProgress((prev) => new Map([...prev, [idx, "Syncing…"]]));

      try {
        const syncRes = await fetch("/api/scrape-competitor-reviews", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ competitor_id: newComp.id, hotel_id: hotel.id }),
        });
        const syncData = (await syncRes.json()) as {
          success?: boolean;
          avg_rating?: number | null;
          total_reviews?: number;
        };
        if (syncData.success) {
          const now = new Date().toISOString();
          updatedComps = updatedComps.map((c) =>
            c.id === newComp.id
              ? {
                  ...c,
                  avg_rating: syncData.avg_rating ?? c.avg_rating,
                  total_reviews: syncData.total_reviews ?? c.total_reviews,
                  last_synced_at: now,
                }
              : c,
          );
          setCompetitors([...updatedComps]);
        }
      } catch {
        // ignore sync error
      }

      setAddProgress((prev) => new Map([...prev, [idx, "Analyzing…"]]));
      try {
        await analyzeEntityDirect(newComp.id, "competitor");
      } catch {
        // ignore analysis error
      }

      setAddProgress((prev) => new Map([...prev, [idx, "Done"]]));
    }

    setAddingSelected(false);
    setSuggestions([]);
    setSelectedIdxs(new Set());
    setAddProgress(new Map());

    await doGenerateInsights(hotel, myAvgRating, myTotalReviews, updatedComps);
  }

  // ── Remove competitor ─────────────────────────────────────────────────────
  async function handleRemove(id: string) {
    if (removingId) return;
    setRemovingId(id);
    try {
      const sb = createSupabaseBrowserClient();
      const { error: delError } = await sb.from("competitors").delete().eq("id", id);
      if (!delError) {
        setCompetitors((prev) => prev.filter((c) => c.id !== id));
        showToast("success", "Competitor removed");
      } else {
        showToast("error", "Failed to remove competitor");
      }
    } finally {
      setRemovingId(null);
      setRemoveConfirm({ open: false, id: "", name: "" });
    }
  }

  // ── Manual add ────────────────────────────────────────────────────────────
  async function handleManualAdd() {
    if (!hotel || !manualName.trim() || addingManual) return;
    setAddingManual(true);
    setManualError(null);

    const sb = createSupabaseBrowserClient();
    const coords = extractCoords(manualGoogleUrl);

    const { data: inserted, error: insertError } = await sb
      .from("competitors")
      .insert({
        hotel_id: hotel.id,
        name: manualName.trim(),
        google_url: manualGoogleUrl.trim() || null,
        tripadvisor_url: manualTAUrl.trim() || null,
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
      })
      .select(COMP_SELECT)
      .single();

    if (insertError) {
      setManualError(insertError.message);
      setAddingManual(false);
      return;
    }

    if (inserted) {
      const newComp = inserted as unknown as Competitor;
      setCompetitors((prev) => [...prev, newComp]);
      // Trigger analysis in background (user-initiated)
      void analyzeEntityDirect(newComp.id, "competitor");
    }
    setManualName("");
    setManualGoogleUrl("");
    setManualTAUrl("");
    setShowManual(false);
    setAddingManual(false);
  }

  // ── Derived state ─────────────────────────────────────────────────────────
  const myHotelCoords = useMemo((): { lat: number; lng: number } | null => {
    if (
      hotel?.latitude != null &&
      hotel?.longitude != null &&
      !Number.isNaN(hotel.latitude) &&
      !Number.isNaN(hotel.longitude)
    ) {
      return { lat: hotel.latitude, lng: hotel.longitude };
    }
    return extractCoords(hotel?.google_url) ?? null;
  }, [hotel]);

  const mapCenter = useMemo((): [number, number] => {
    return myHotelCoords ? [myHotelCoords.lat, myHotelCoords.lng] : [-7.7900488, 110.3620332];
  }, [myHotelCoords]);

  const mapHotel = useMemo(
    (): MapHotel => ({
      name: hotel?.name ?? "Your hotel",
      avg_rating: myAvgRating,
      total_reviews: myTotalReviews,
      address: hotel?.address ?? null,
      latitude: myHotelCoords?.lat ?? null,
      longitude: myHotelCoords?.lng ?? null,
      google_url: hotel?.google_url,
    }),
    [hotel, myAvgRating, myTotalReviews, myHotelCoords],
  );

  const mapCompetitors = useMemo(
    (): MapCompetitor[] =>
      competitors.map((c) => ({
        id: c.id,
        name: c.name,
        avg_rating: c.avg_rating ?? null,
        total_reviews: c.total_reviews ?? 0,
        address: c.address ?? null,
        latitude: c.latitude ?? extractCoords(c.google_url)?.lat ?? null,
        longitude: c.longitude ?? extractCoords(c.google_url)?.lng ?? null,
        google_url: c.google_url,
      })),
    [competitors],
  );

  const rankingList = useMemo(() => {
    type RankEntry = {
      id: string;
      name: string;
      avg_rating: number | null;
      total_reviews: number;
      isMe: boolean;
    };
    const all: RankEntry[] = [
      {
        id: "me",
        name: hotel?.name ?? "Your hotel",
        avg_rating: myAvgRating,
        total_reviews: myTotalReviews,
        isMe: true,
      },
      ...competitors.map((c) => ({
        id: c.id,
        name: c.name,
        avg_rating: c.avg_rating ?? null,
        total_reviews: c.total_reviews ?? 0,
        isMe: false,
      })),
    ];
    return all.sort((a, b) => {
      const ra = a.avg_rating ?? -1;
      const rb = b.avg_rating ?? -1;
      if (rb !== ra) return rb - ra;
      if (a.isMe) return -1;
      if (b.isMe) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [hotel, myAvgRating, myTotalReviews, competitors]);

  const marketAvg = useMemo(() => {
    const nums = competitors
      .map((c) => c.avg_rating)
      .filter((n): n is number => n != null && !Number.isNaN(Number(n)));
    if (!nums.length) return null;
    return nums.reduce((a, b) => a + b, 0) / nums.length;
  }, [competitors]);

  const myRankInList = useMemo(() => {
    const idx = rankingList.findIndex((e) => e.isMe);
    return idx >= 0 ? idx + 1 : null;
  }, [rankingList]);

  const maxReviews = useMemo(() => {
    const all = [myTotalReviews, ...competitors.map((c) => c.total_reviews ?? 0)];
    return Math.max(...all, 1);
  }, [myTotalReviews, competitors]);

  const leader = rankingList[0] ?? null;
  const hasSyncedCompetitors = competitors.some((c) => c.avg_rating != null);
  const iLeadVolume = myTotalReviews > 0 && myTotalReviews >= maxReviews;

  const positionText = useMemo(() => {
    if (myRankInList === 1) return "You lead the market. Keep focus on review volume to stay ahead.";
    if (myRankInList !== null && myRankInList <= 3) {
      if (leader && !leader.isMe) {
        const behind = (leader.total_reviews ?? 0) - myTotalReviews;
        if (behind > 0)
          return `${behind.toLocaleString()} reviews behind the leader. Focus on review volume to overtake.`;
      }
      return "Focus on review volume to climb the rankings.";
    }
    if (myRankInList !== null) {
      return "Biggest opportunity: improve your average rating to climb the rankings.";
    }
    return null;
  }, [myRankInList, leader, myTotalReviews]);

  // Feature comparison rows (your hotel + competitors)
  const featureRows = useMemo(() => {
    const hotelRow = {
      id: "me",
      name: hotel?.name ?? "Your hotel",
      isMe: true,
      description: hotel?.description ?? null,
      usps: toStringArray(hotel?.usps),
      strengths: toStringArray(hotel?.strengths),
      weaknesses: toStringArray(hotel?.weaknesses),
      amenities: toStringArray(hotel?.amenities),
      price_tier: hotel?.price_tier ?? null,
      target_guest: hotel?.target_guest ?? null,
      last_analyzed_at: hotel?.last_analyzed_at ?? null,
    };
    const compRows = competitors.map((c) => ({
      id: c.id,
      name: c.name,
      isMe: false,
      description: c.description ?? null,
      usps: toStringArray(c.usps),
      strengths: toStringArray(c.strengths),
      weaknesses: toStringArray(c.weaknesses),
      amenities: toStringArray(c.amenities),
      price_tier: c.price_tier ?? null,
      target_guest: c.target_guest ?? null,
      last_analyzed_at: c.last_analyzed_at ?? null,
    }));
    return [hotelRow, ...compRows];
  }, [hotel, competitors]);

  const hasAnyAnalysis = featureRows.some((r) => r.description != null);

  // ─────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ background: PAGE_BG, minHeight: "100vh", padding: "24px 28px" }}>
        <style>{`@keyframes bench-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 20,
          }}
        >
          <div>
            <div
              style={{
                width: 200,
                height: 22,
                background: "#1a1a1a",
                borderRadius: 4,
                animation: "bench-pulse 1.5s ease-in-out infinite",
              }}
            />
            <div
              style={{
                width: 140,
                height: 14,
                background: "#1a1a1a",
                borderRadius: 4,
                marginTop: 6,
                animation: "bench-pulse 1.5s ease-in-out infinite",
              }}
            />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div
              style={{
                width: 120,
                height: 32,
                background: "#1a1a1a",
                borderRadius: 6,
                animation: "bench-pulse 1.5s ease-in-out infinite",
              }}
            />
            <div
              style={{
                width: 80,
                height: 32,
                background: "#1a1a1a",
                borderRadius: 6,
                animation: "bench-pulse 1.5s ease-in-out infinite",
              }}
            />
          </div>
        </div>
        <div
          style={{
            height: 280,
            background: "#141414",
            border: "1px solid #1e1e1e",
            borderRadius: 8,
            animation: "bench-pulse 1.5s ease-in-out infinite",
            marginBottom: 12,
          }}
        />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: 10,
            marginBottom: 12,
          }}
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                height: 100,
                background: "#141414",
                border: "1px solid #1e1e1e",
                borderRadius: 8,
                animation: "bench-pulse 1.5s ease-in-out infinite",
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ background: PAGE_BG, minHeight: "100vh", padding: "60px 28px" }}>
        <ErrorState
          title="Couldn't load competitors"
          message={error}
          onRetry={() => {
            setError(null);
            setLoading(true);
            window.location.reload();
          }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        background: PAGE_BG,
        minHeight: "100vh",
        padding: "24px 28px",
        boxSizing: "border-box",
      }}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes bench-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes bench-dot-pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes bench-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .bench-map-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .bench-analysis-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .bench-insights-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
        .bench-ci-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .bench-table-wrap { overflow-x: auto; }
        .bench-table-row { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 1fr 160px; gap: 12px; align-items: center; }
        @media (max-width: 1200px) {
          .bench-table-row { grid-template-columns: 2fr 1fr 1fr 1fr 160px !important; }
          .bench-table-analyze-col { display: none !important; }
        }
        @media (max-width: 1000px) {
          .bench-insights-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .bench-insights-grid > *:last-child { grid-column: 1 / -1; }
          .bench-ci-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 768px) {
          .bench-map-grid { grid-template-columns: 1fr !important; }
          .bench-analysis-grid { grid-template-columns: 1fr !important; }
          .bench-insights-grid { grid-template-columns: 1fr !important; }
          .bench-insights-grid > *:last-child { grid-column: auto; }
          .bench-ci-grid { grid-template-columns: 1fr !important; }
          .bench-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
        }
      `,
        }}
      />

      {/* ── Analysis toast ──────────────────────────────────────────────────── */}
      {analysisToast && (
        <div
          style={{
            background: "#0a1a0a",
            border: "1px solid #1a3a1a",
            borderRadius: 6,
            padding: "10px 16px",
            marginBottom: 12,
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 12,
            color: "#4ade80",
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: 12,
              height: 12,
              border: "2px solid #1a3a1a",
              borderTopColor: "#4ade80",
              borderRadius: "50%",
              animation: "bench-spin 0.8s linear infinite",
              flexShrink: 0,
            }}
          />
          {analysisToast}
        </div>
      )}

      {/* ── 1. Page Header ─────────────────────────────────────────────────── */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 20,
        }}
      >
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 500, color: TEXT_PRIMARY, margin: 0 }}>
            Competitor benchmarking
          </h1>
          <p style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 2, marginBottom: 0 }}>
            Your market position at a glance
          </p>
        </div>
        <div
          style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}
        >
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              type="button"
              onClick={() => setShowManual(!showManual)}
              style={secondaryBtnStyle()}
            >
              + Add competitor
            </button>
            <button
              type="button"
              disabled={syncingAll || !hotel?.id}
              onClick={() => void handleSyncAll()}
              style={primaryBtnStyle(syncingAll || !hotel?.id)}
            >
              {syncingAll ? "Syncing…" : "Sync all"}
            </button>
          </div>
          {syncMsg && (
            <div style={{ fontSize: 11, color: "#4ade80", textAlign: "right" }}>{syncMsg}</div>
          )}
          {syncError && (
            <div style={{ fontSize: 11, color: "#f87171", textAlign: "right" }}>{syncError}</div>
          )}
        </div>
      </header>

      {/* ── 2. Manual Add Form ──────────────────────────────────────────────── */}
      {showManual && (
        <div style={{ ...cardStyle, padding: "16px 20px", marginBottom: 12 }}>
          <div style={{ ...sectionLabelStyle, marginBottom: 12 }}>ADD COMPETITOR MANUALLY</div>
          <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
            <div style={{ flex: 1 }}>
              <input
                type="text"
                placeholder="Hotel name *"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div style={{ flex: 1.5 }}>
              <input
                type="text"
                placeholder="Google Maps URL"
                value={manualGoogleUrl}
                onChange={(e) => setManualGoogleUrl(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div style={{ flex: 1.5 }}>
              <input
                type="text"
                placeholder="TripAdvisor URL (optional)"
                value={manualTAUrl}
                onChange={(e) => setManualTAUrl(e.target.value)}
                style={inputStyle}
              />
            </div>
            <button
              type="button"
              disabled={addingManual || !manualName.trim()}
              onClick={() => void handleManualAdd()}
              style={primaryBtnStyle(addingManual || !manualName.trim())}
            >
              {addingManual ? "Adding…" : "Add"}
            </button>
          </div>
          {manualError && (
            <div style={{ fontSize: 12, color: "#f87171", marginTop: 6 }}>{manualError}</div>
          )}
        </div>
      )}

      {/* ── 3. Find Competitors Card (only if < 3 tracked) ─────────────────── */}
      {competitors.length < 3 && (
        <div
          style={{
            background: finding ? CARD : "#0a1a0a",
            border: `1px solid ${finding ? BORDER : "#1a3a1a"}`,
            borderRadius: 8,
            padding: "14px 18px",
            marginBottom: 12,
          }}
        >
          {finding ? (
            <div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: TEXT_PRIMARY,
                  marginBottom: 10,
                }}
              >
                Finding competitors…
              </div>
              {findSteps.map((step, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: 12,
                    color: TEXT_SECONDARY,
                    marginBottom: 4,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span style={{ color: "#4ade80" }}>✓</span>
                  {step}
                </div>
              ))}
              <div style={{ fontSize: 11, color: "#444444", marginTop: 6 }}>
                This may take 30–60 seconds…
              </div>
            </div>
          ) : suggestions.length > 0 ? (
            <div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: TEXT_PRIMARY }}>
                  AI found {suggestions.length} nearby competitor
                  {suggestions.length !== 1 ? "s" : ""}
                </div>
                <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 2 }}>
                  Click to select hotels to add
                </div>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 10,
                  marginBottom: 14,
                }}
              >
                {suggestions.map((s, i) => {
                  const isSelected = selectedIdxs.has(i);
                  const progress = addProgress.get(i);
                  return (
                    <div
                      key={i}
                      onClick={() => {
                        if (addingSelected || progress) return;
                        if (isSelected) {
                          setSelectedIdxs((prev) => {
                            const n = new Set(prev);
                            n.delete(i);
                            return n;
                          });
                        } else if (selectedIdxs.size < 5) {
                          setSelectedIdxs((prev) => new Set([...prev, i]));
                        }
                      }}
                      style={{
                        background: isSelected ? "#0a1a0a" : CARD,
                        border: `1px solid ${isSelected ? "#4ade80" : BORDER}`,
                        borderRadius: 6,
                        padding: "12px 14px",
                        cursor: addingSelected || progress ? "default" : "pointer",
                      }}
                    >
                      {progress && (
                        <div
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            color:
                              progress === "Done"
                                ? "#4ade80"
                                : progress === "Error"
                                  ? "#f87171"
                                  : TEXT_MUTED,
                            marginBottom: 4,
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                          }}
                        >
                          {progress}
                        </div>
                      )}
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: TEXT_PRIMARY,
                          marginBottom: 4,
                        }}
                      >
                        {s.name}
                      </div>
                      <div
                        style={{
                          fontSize: 20,
                          fontWeight: 700,
                          color: ratingColor(s.avg_rating),
                          marginBottom: 2,
                          lineHeight: 1,
                        }}
                      >
                        {s.avg_rating ? s.avg_rating.toFixed(1) : "—"}
                      </div>
                      <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 4 }}>
                        {s.total_reviews.toLocaleString()} reviews
                      </div>
                      {s.reason && (
                        <div style={{ fontSize: 11, color: TEXT_MUTED, fontStyle: "italic" }}>
                          {s.reason}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {selectedIdxs.size > 0 && (
                  <button
                    type="button"
                    disabled={addingSelected}
                    onClick={() => void handleAddSelected()}
                    style={primaryBtnStyle(addingSelected)}
                  >
                    {addingSelected ? "Adding…" : `Add selected (${selectedIdxs.size})`}
                  </button>
                )}
                <span style={{ fontSize: 12, color: TEXT_MUTED }}>
                  {selectedIdxs.size} / 5 selected
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSuggestions([]);
                    setSelectedIdxs(new Set());
                    setAddProgress(new Map());
                  }}
                  style={secondaryBtnStyle({ marginLeft: "auto" })}
                >
                  Clear
                </button>
              </div>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: TEXT_PRIMARY }}>
                  Find competitors automatically
                </div>
                <div style={{ fontSize: 11, color: "#4ade80", marginTop: 2 }}>
                  AI finds hotels in your area with similar rating and service class
                </div>
                {findError && (
                  <div style={{ fontSize: 12, color: "#f87171", marginTop: 6 }}>{findError}</div>
                )}
              </div>
              <button
                type="button"
                disabled={!hotel?.id}
                onClick={() => void handleFindCompetitors()}
                style={primaryBtnStyle(!hotel?.id)}
              >
                Find competitors
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── 4. Map + Ranking ────────────────────────────────────────────────── */}
      <div className="bench-map-grid" style={{ marginBottom: 12 }}>
        <div
          style={{ ...cardStyle, height: 280, overflow: "hidden", position: "relative" }}
        >
          <MapComponent
            center={mapCenter}
            zoom={14}
            myHotel={mapHotel}
            competitors={mapCompetitors}
            height={280}
          />
        </div>

        <div style={{ ...cardStyle, height: 280, padding: "20px", overflowY: "auto" }}>
          <div style={sectionLabelStyle}>
            YOUR RANKING · {rankingList.length} HOTEL{rankingList.length !== 1 ? "S" : ""} TRACKED
          </div>
          {rankingList.length === 0 ? (
            <div style={{ fontSize: 13, color: TEXT_MUTED }}>No hotels yet</div>
          ) : (
            rankingList.map((entry, idx) => {
              const rank = idx + 1;
              const delta =
                marketAvg != null && entry.avg_rating != null
                  ? entry.avg_rating - marketAvg
                  : null;
              const deltaText =
                delta == null
                  ? null
                  : Math.abs(delta) < 0.05
                    ? "no change"
                    : delta > 0
                      ? `+${delta.toFixed(1)}`
                      : delta.toFixed(1);
              const deltaColor =
                delta == null || Math.abs(delta) < 0.05
                  ? TEXT_MUTED
                  : delta > 0
                    ? "#4ade80"
                    : "#f87171";
              const rColor =
                entry.avg_rating == null
                  ? TEXT_MUTED
                  : entry.avg_rating >= 4.5
                    ? "#4ade80"
                    : entry.avg_rating >= 3.5
                      ? TEXT_PRIMARY
                      : "#fbbf24";
              return (
                <div
                  key={entry.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: entry.isMe ? "10px 12px" : "10px 0",
                    margin: entry.isMe ? "0 -12px" : 0,
                    background: entry.isMe ? "#0a1a0a" : "transparent",
                    borderRadius: entry.isMe ? 6 : 0,
                    borderBottom: entry.isMe
                      ? "1px solid #1a3a1a"
                      : `1px solid ${BORDER}`,
                  }}
                >
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 600,
                      width: 24,
                      flexShrink: 0,
                      color:
                        rank === 1 ? "#fbbf24" : entry.isMe ? "#4ade80" : TEXT_MUTED,
                    }}
                  >
                    #{rank}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: TEXT_PRIMARY,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {truncName(entry.name, 20)}
                      </span>
                      {entry.isMe && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            color: "#4ade80",
                            flexShrink: 0,
                          }}
                        >
                          YOU
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 2 }}>
                      {(entry.total_reviews ?? 0).toLocaleString()} reviews
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 600,
                        color: rColor,
                        lineHeight: 1,
                      }}
                    >
                      {entry.avg_rating != null ? entry.avg_rating.toFixed(1) : "—"}
                    </div>
                    {deltaText && (
                      <div style={{ fontSize: 11, color: deltaColor, marginTop: 2 }}>
                        {deltaText}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── 5. AI Insights Row ──────────────────────────────────────────────── */}
      <div style={{ marginBottom: 12 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <div style={{ ...sectionLabelStyle, marginBottom: 0 } as CSSProperties}>
            AI INSIGHTS
          </div>
          {insights && !insightsLoading && (
            <button
              type="button"
              onClick={() =>
                hotel && void doGenerateInsights(hotel, myAvgRating, myTotalReviews, competitors)
              }
              style={secondaryBtnStyle({ fontSize: 11, padding: "4px 10px" })}
            >
              Regenerate insights
            </button>
          )}
        </div>
        {!hasSyncedCompetitors ? (
          <div style={{ ...cardStyle, padding: "14px 18px" }}>
            <span style={{ fontSize: 13, color: "#fbbf24" }}>
              Sync competitors to generate AI insights
            </span>
          </div>
        ) : insightsLoading ? (
          <div className="bench-insights-grid">
            {INSIGHT_CARDS.map(({ key }) => (
              <div
                key={key}
                style={{
                  ...cardStyle,
                  padding: "16px 18px",
                  animation: "bench-pulse 1.5s ease-in-out infinite",
                }}
              >
                <div
                  style={{
                    width: "60%",
                    height: 10,
                    background: "#1e1e1e",
                    borderRadius: 3,
                    marginBottom: 8,
                  }}
                />
                <div
                  style={{
                    width: "100%",
                    height: 8,
                    background: "#1e1e1e",
                    borderRadius: 3,
                    marginBottom: 4,
                  }}
                />
                <div
                  style={{ width: "80%", height: 8, background: "#1e1e1e", borderRadius: 3 }}
                />
              </div>
            ))}
          </div>
        ) : insightsError ? (
          <div
            style={{
              ...cardStyle,
              padding: "14px 18px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 13, color: "#f87171" }}>{insightsError}</span>
            <button
              type="button"
              onClick={() =>
                hotel && void doGenerateInsights(hotel, myAvgRating, myTotalReviews, competitors)
              }
              style={secondaryBtnStyle()}
            >
              Retry
            </button>
          </div>
        ) : insights ? (
          <div className="bench-insights-grid">
            {INSIGHT_CARDS.map(({ key, icon, label, color }) => (
              <div key={key} style={{ ...cardStyle, padding: "16px 18px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <span style={{ color, fontSize: 14 }}>{icon}</span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      letterSpacing: "0.1em",
                      color: TEXT_MUTED,
                      textTransform: "uppercase",
                    }}
                  >
                    {label}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "#cccccc", lineHeight: 1.5 }}>
                  {insights[key] || "—"}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              ...cardStyle,
              padding: "14px 18px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 13, color: TEXT_MUTED }}>
              Ready to generate AI insights
            </span>
            <button
              type="button"
              onClick={() =>
                hotel && void doGenerateInsights(hotel, myAvgRating, myTotalReviews, competitors)
              }
              style={primaryBtnStyle()}
            >
              Generate insights
            </button>
          </div>
        )}
      </div>

      {/* ── 6. Competitive Intelligence ─────────────────────────────────────── */}
      <div style={{ ...cardStyle, padding: "20px 24px", marginBottom: 12 }}>

        {/* Results header — only shown when results exist */}
        {comparison && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 20,
            }}
          >
            <div>
              <div style={sectionLabelStyle}>COMPETITIVE INTELLIGENCE</div>
              <div style={{ display: "flex", gap: 16, marginTop: -8, flexWrap: "wrap" }}>
                {comparisonMeta.generated_at && (
                  <span style={{ fontSize: 11, color: TEXT_MUTED }}>
                    Last analyzed: {getRelativeTime(comparisonMeta.generated_at)}
                  </span>
                )}
                {comparisonMeta.expires_at && (() => {
                  const exp = getExpiresIn(comparisonMeta.expires_at);
                  return (
                    <span style={{ fontSize: 11, color: exp.color }}>
                      Expires in: {exp.text}
                    </span>
                  );
                })()}
              </div>
            </div>
            <button
              type="button"
              disabled={comparisonLoading}
              onClick={() => void handleGenerateComparison()}
              style={secondaryBtnStyle({ fontSize: 11, padding: "5px 12px" })}
            >
              Re-run analysis
            </button>
          </div>
        )}

        {/* Loading / progress state */}
        {comparisonLoading && (
          <div style={{ padding: "32px 0", textAlign: "center" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                fontSize: 13,
                color: TEXT_SECONDARY,
                marginBottom: 24,
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: 14,
                  height: 14,
                  border: "2px solid #2a2a2a",
                  borderTopColor: "#4ade80",
                  borderRadius: "50%",
                  animation: "bench-spin 0.8s linear infinite",
                  flexShrink: 0,
                }}
              />
              {analysisToast ?? "Running competitive comparison…"}
            </div>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  background: "#1a1a1a",
                  borderRadius: 6,
                  padding: "14px 16px",
                  marginBottom: 8,
                  animation: "bench-pulse 1.5s ease-in-out infinite",
                  textAlign: "left",
                }}
              >
                <div
                  style={{
                    width: "40%",
                    height: 10,
                    background: "#222",
                    borderRadius: 3,
                    marginBottom: 6,
                  }}
                />
                <div
                  style={{ width: "80%", height: 8, background: "#222", borderRadius: 3 }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {comparisonError && !comparisonLoading && (
          <div
            style={{
              fontSize: 12,
              color: "#f87171",
              marginBottom: comparison ? 16 : 0,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <span>{comparisonError}</span>
            <button
              type="button"
              onClick={() => void handleGenerateComparison()}
              style={secondaryBtnStyle({ fontSize: 11, padding: "3px 10px" })}
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty state — no results yet */}
        {!comparison && !comparisonLoading && (
          <div style={{ textAlign: "center", padding: "40px 32px" }}>
            {/* Sparkle icon */}
            <div
              style={{
                fontSize: 40,
                color: "#4ade80",
                lineHeight: 1,
                userSelect: "none",
              }}
            >
              ✦
            </div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 600,
                color: TEXT_PRIMARY,
                marginTop: 16,
              }}
            >
              Get AI-powered competitive analysis
            </div>
            <div
              style={{
                fontSize: 14,
                color: TEXT_SECONDARY,
                maxWidth: 480,
                margin: "8px auto 0",
                lineHeight: 1.6,
              }}
            >
              We&apos;ll analyze your competitors&apos; reviews to find your unique advantages,
              competitive gaps, and specific actions to take.
            </div>
            <div
              style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 12 }}
            >
              You have {competitors.length} competitor{competitors.length !== 1 ? "s" : ""} tracked
            </div>

            {competitors.length === 0 ? (
              <>
                <div style={{ fontSize: 11, color: "#fbbf24", marginTop: 8 }}>
                  Add at least 1 competitor to run analysis
                </div>
                <button
                  type="button"
                  disabled={!hotel?.id}
                  onClick={() => void handleFindCompetitors()}
                  style={{ ...primaryBtnStyle(!hotel?.id), marginTop: 20 }}
                >
                  Find competitors
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={comparisonLoading || !hotel?.id}
                onClick={() => void handleGenerateComparison()}
                style={{ ...primaryBtnStyle(comparisonLoading || !hotel?.id), marginTop: 20 }}
              >
                Start competitive analysis
              </button>
            )}

            {comparisonError && (
              <div style={{ fontSize: 12, color: "#f87171", marginTop: 12 }}>
                {comparisonError}
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {comparison && !comparisonLoading && (
          <div>
            <div className="bench-ci-grid">
              {/* Section A — Unique Advantages */}
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#4ade80",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    marginBottom: 10,
                  }}
                >
                  YOUR UNIQUE ADVANTAGES
                </div>
                <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 10 }}>
                  What only you offer
                </div>
                {(comparison.unique_advantages ?? []).map((adv, i) => (
                  <div
                    key={i}
                    style={{
                      background: "#0a1a0a",
                      border: "1px solid #1a3a1a",
                      borderRadius: 6,
                      padding: "14px 16px",
                      marginBottom: 8,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        marginBottom: 4,
                      }}
                    >
                      <span
                        style={{
                          color: "#4ade80",
                          fontSize: 13,
                          flexShrink: 0,
                          marginTop: 1,
                        }}
                      >
                        ✓
                      </span>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: TEXT_PRIMARY,
                        }}
                      >
                        {adv.advantage}
                      </span>
                    </div>
                    {adv.vs_competitors && (
                      <div
                        style={{
                          fontSize: 12,
                          color: TEXT_SECONDARY,
                          marginLeft: 21,
                          marginBottom: 4,
                        }}
                      >
                        vs competitors: {adv.vs_competitors}
                      </div>
                    )}
                    {adv.how_to_leverage && (
                      <div
                        style={{
                          fontSize: 12,
                          color: "#4ade80",
                          marginLeft: 21,
                        }}
                      >
                        → {adv.how_to_leverage}
                      </div>
                    )}
                  </div>
                ))}
                {(comparison.unique_advantages ?? []).length === 0 && (
                  <div style={{ fontSize: 12, color: TEXT_MUTED }}>
                    No unique advantages identified yet.
                  </div>
                )}
              </div>

              {/* Section B — Competitive Gaps */}
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#f87171",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    marginBottom: 10,
                  }}
                >
                  WHERE COMPETITORS LEAD
                </div>
                <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 10 }}>
                  What you&apos;re missing
                </div>
                {(comparison.competitive_gaps ?? []).map((gap, i) => {
                  const pColor =
                    gap.priority === "high"
                      ? "#f87171"
                      : gap.priority === "medium"
                        ? "#fbbf24"
                        : TEXT_SECONDARY;
                  const pBg =
                    gap.priority === "high"
                      ? "#2d0a0a"
                      : gap.priority === "medium"
                        ? "#1a1200"
                        : "#1a1a1a";
                  return (
                    <div
                      key={i}
                      style={{
                        background: "#1a0a0a",
                        border: "1px solid #2a1a1a",
                        borderRadius: 6,
                        padding: "14px 16px",
                        marginBottom: 8,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          alignItems: "flex-start",
                          marginBottom: 4,
                        }}
                      >
                        <span
                          style={{
                            color: "#f87171",
                            fontSize: 13,
                            flexShrink: 0,
                            marginTop: 1,
                          }}
                        >
                          ⚠
                        </span>
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 8,
                            }}
                          >
                            <span
                              style={{
                                fontSize: 13,
                                fontWeight: 600,
                                color: TEXT_PRIMARY,
                              }}
                            >
                              {gap.gap}
                            </span>
                            <span
                              style={{
                                background: pBg,
                                color: pColor,
                                borderRadius: 3,
                                padding: "2px 7px",
                                fontSize: 10,
                                fontWeight: 600,
                                flexShrink: 0,
                              }}
                            >
                              {gap.priority}
                            </span>
                          </div>
                        </div>
                      </div>
                      {gap.who_has_it && (
                        <div
                          style={{
                            fontSize: 12,
                            color: TEXT_SECONDARY,
                            marginLeft: 21,
                            marginBottom: 4,
                          }}
                        >
                          Who has it: {gap.who_has_it}
                        </div>
                      )}
                      {gap.action && (
                        <div
                          style={{
                            fontSize: 12,
                            color: "#a78bfa",
                            marginLeft: 21,
                          }}
                        >
                          → {gap.action}
                        </div>
                      )}
                    </div>
                  );
                })}
                {(comparison.competitive_gaps ?? []).length === 0 && (
                  <div style={{ fontSize: 12, color: TEXT_MUTED }}>No gaps identified.</div>
                )}
              </div>
            </div>

            {/* Section C — Market Positioning */}
            {comparison.market_positioning && (
              <div style={{ ...cardStyle, padding: "16px 18px", marginTop: 12 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: TEXT_MUTED,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    marginBottom: 12,
                  }}
                >
                  MARKET POSITIONING
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[
                    {
                      label: "Current position",
                      text: comparison.market_positioning.your_position,
                    },
                    {
                      label: "Recommended position",
                      text: comparison.market_positioning.recommended_position,
                    },
                    {
                      label: "Strategy",
                      text: comparison.market_positioning.differentiation_strategy,
                    },
                  ].map((row) => (
                    <div
                      key={row.label}
                      style={{ display: "flex", gap: 12, alignItems: "flex-start" }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          color: TEXT_MUTED,
                          width: 160,
                          flexShrink: 0,
                          paddingTop: 1,
                        }}
                      >
                        {row.label}:
                      </span>
                      <span style={{ fontSize: 12, color: "#cccccc", lineHeight: 1.5 }}>
                        {row.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Section D — Quick Wins */}
            {(comparison.quick_wins ?? []).length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: TEXT_MUTED,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    marginBottom: 10,
                  }}
                >
                  QUICK WINS
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {comparison.quick_wins.map((win, i) => {
                    const eColor =
                      win.effort === "low"
                        ? "#4ade80"
                        : win.effort === "medium"
                          ? "#fbbf24"
                          : "#f87171";
                    const eBg =
                      win.effort === "low"
                        ? "#052e16"
                        : win.effort === "medium"
                          ? "#1a1200"
                          : "#1a0a0a";
                    return (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          background: "#111111",
                          border: `1px solid ${BORDER}`,
                          borderRadius: 6,
                          padding: "12px 14px",
                        }}
                      >
                        <span
                          style={{
                            background: eBg,
                            color: eColor,
                            borderRadius: 3,
                            padding: "2px 8px",
                            fontSize: 10,
                            fontWeight: 600,
                            flexShrink: 0,
                          }}
                        >
                          {win.effort} effort
                        </span>
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              fontSize: 13,
                              color: TEXT_PRIMARY,
                              fontWeight: 500,
                            }}
                          >
                            {win.win}
                          </div>
                          {win.impact && (
                            <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 2 }}>
                              {win.impact}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Long-term strategy */}
            {comparison.long_term_strategy && (
              <div
                style={{
                  marginTop: 12,
                  background: "#111111",
                  border: `1px solid ${BORDER}`,
                  borderRadius: 6,
                  padding: "12px 14px",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: TEXT_MUTED,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    marginBottom: 6,
                  }}
                >
                  LONG-TERM STRATEGY
                </div>
                <div style={{ fontSize: 12, color: "#cccccc", lineHeight: 1.6 }}>
                  {comparison.long_term_strategy}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 7. Analysis Cards ───────────────────────────────────────────────── */}
      <div className="bench-analysis-grid" style={{ marginBottom: 12 }}>
        {/* Rating overview */}
        <div style={{ ...cardStyle, padding: "16px 18px" }}>
          <div style={sectionLabelStyle}>RATING OVERVIEW</div>
          {rankingList.length === 0 ? (
            <div style={{ fontSize: 12, color: TEXT_MUTED }}>No data yet</div>
          ) : (
            rankingList.map((entry) => (
              <div
                key={entry.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    width: 100,
                    fontSize: 12,
                    color: entry.isMe ? "#4ade80" : TEXT_SECONDARY,
                    fontWeight: entry.isMe ? 600 : 400,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  {entry.isMe ? "You" : truncName(entry.name, 13)}
                </div>
                <div
                  style={{
                    flex: 1,
                    height: 5,
                    background: "#1a1a1a",
                    borderRadius: 3,
                    overflow: "hidden",
                  }}
                >
                  {entry.avg_rating != null && (
                    <div
                      style={{
                        width: `${(entry.avg_rating / 5) * 100}%`,
                        height: "100%",
                        background: entry.isMe ? "#6366f1" : ratingColor(entry.avg_rating),
                        borderRadius: 3,
                      }}
                    />
                  )}
                </div>
                <div
                  style={{
                    width: 40,
                    fontSize: 12,
                    fontWeight: 500,
                    color: entry.isMe
                      ? "#6366f1"
                      : entry.avg_rating != null
                        ? TEXT_PRIMARY
                        : "#444444",
                    textAlign: "right",
                    flexShrink: 0,
                  }}
                >
                  {entry.avg_rating != null ? (
                    entry.avg_rating.toFixed(1)
                  ) : (
                    <span style={{ fontSize: 10, color: "#444444" }}>N/S</span>
                  )}
                </div>
              </div>
            ))
          )}
          {marketAvg != null && (
            <div style={{ fontSize: 10, color: "#444444", marginTop: 8 }}>
              Market avg: {marketAvg.toFixed(2)}★
            </div>
          )}
        </div>

        {/* Review volume */}
        <div style={{ ...cardStyle, padding: "16px 18px" }}>
          <div style={sectionLabelStyle}>REVIEW VOLUME</div>
          {rankingList.length === 0 ? (
            <div style={{ fontSize: 12, color: TEXT_MUTED }}>No data yet</div>
          ) : (
            rankingList.map((entry) => (
              <div
                key={entry.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    width: 100,
                    fontSize: 12,
                    color: entry.isMe ? "#4ade80" : TEXT_SECONDARY,
                    fontWeight: entry.isMe ? 600 : 400,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  {entry.isMe ? "You" : truncName(entry.name, 13)}
                </div>
                <div
                  style={{
                    flex: 1,
                    height: 5,
                    background: "#1a1a1a",
                    borderRadius: 3,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${((entry.total_reviews ?? 0) / maxReviews) * 100}%`,
                      height: "100%",
                      background: entry.isMe ? "#6366f1" : TEXT_SECONDARY,
                      borderRadius: 3,
                    }}
                  />
                </div>
                <div
                  style={{
                    width: 40,
                    fontSize: 12,
                    fontWeight: 500,
                    color: entry.isMe
                      ? "#6366f1"
                      : (entry.total_reviews ?? 0) > 0
                        ? TEXT_PRIMARY
                        : "#444444",
                    textAlign: "right",
                    flexShrink: 0,
                  }}
                >
                  {(entry.total_reviews ?? 0).toLocaleString()}
                </div>
              </div>
            ))
          )}
          <div style={{ fontSize: 10, color: "#444444", marginTop: 8 }}>
            {iLeadVolume ? "You lead in review volume" : "You need volume to compete"}
          </div>
        </div>

        {/* Market position */}
        <div style={{ ...cardStyle, padding: "16px 18px" }}>
          <div style={sectionLabelStyle}>MARKET POSITION</div>
          {myRankInList != null ? (
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 6,
                  margin: "8px 0",
                }}
              >
                <span
                  style={{
                    fontSize: 36,
                    fontWeight: 700,
                    color: TEXT_PRIMARY,
                    lineHeight: 1,
                  }}
                >
                  #{myRankInList}
                </span>
                <span style={{ fontSize: 16, fontWeight: 500, color: TEXT_MUTED }}>
                  of {rankingList.length}
                </span>
              </div>
              {marketAvg != null && myAvgRating != null && (
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: myAvgRating >= marketAvg ? "#4ade80" : "#f87171",
                    marginBottom: 8,
                  }}
                >
                  {myAvgRating >= marketAvg
                    ? `+${(myAvgRating - marketAvg).toFixed(2)} above market avg`
                    : `${(myAvgRating - marketAvg).toFixed(2)} below market avg`}
                </div>
              )}
              {positionText && (
                <div style={{ fontSize: 11, color: TEXT_SECONDARY, lineHeight: 1.6 }}>
                  {positionText}
                </div>
              )}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: TEXT_MUTED }}>No data yet</div>
          )}
        </div>
      </div>

      {/* ── 8. Feature Comparison Table ─────────────────────────────────────── */}
      {!loadingAnalysis && hasAnyAnalysis && (
        <div style={{ ...cardStyle, padding: "20px 24px", marginBottom: 12 }}>
          <div style={sectionLabelStyle}>FEATURE COMPARISON</div>
          {/* Header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 100px 160px 80px",
              gap: 12,
              padding: "8px 0",
              borderBottom: `1px solid ${BORDER}`,
              marginBottom: 4,
            }}
          >
            {["HOTEL", "PRICE TIER", "TARGET GUEST", "AMENITIES"].map((h) => (
              <div
                key={h}
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: TEXT_MUTED,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                {h}
              </div>
            ))}
          </div>
          {featureRows.map((row) => {
            const isExpanded = expandedFeatureRows.has(row.id);
            const hasData = row.description != null;
            return (
              <div key={row.id}>
                <div
                  onClick={() => {
                    if (!hasData) return;
                    setExpandedFeatureRows((prev) => {
                      const s = new Set(prev);
                      if (s.has(row.id)) s.delete(row.id);
                      else s.add(row.id);
                      return s;
                    });
                  }}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 100px 160px 80px",
                    gap: 12,
                    padding: "12px 0",
                    borderBottom: `1px solid #1a1a1a`,
                    alignItems: "center",
                    cursor: hasData ? "pointer" : "default",
                  }}
                  onMouseEnter={(e) => {
                    if (hasData) e.currentTarget.style.background = "#161616";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  {/* Name */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: row.isMe ? 600 : 400,
                        color: row.isMe ? "#4ade80" : TEXT_PRIMARY,
                      }}
                    >
                      {row.isMe ? (hotel?.name ?? "Your hotel") : truncName(row.name, 28)}
                    </span>
                    {row.isMe && (
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          color: "#4ade80",
                          background: "#0a1a0a",
                          border: "1px solid #1a3a1a",
                          borderRadius: 3,
                          padding: "1px 5px",
                        }}
                      >
                        YOU
                      </span>
                    )}
                    {hasData && row.last_analyzed_at && (
                      <span style={{ fontSize: 10, color: TEXT_MUTED }}>
                        analyzed {getRelativeTime(row.last_analyzed_at)}
                      </span>
                    )}
                    {hasData && (
                      <span style={{ fontSize: 11, color: TEXT_MUTED, marginLeft: "auto" }}>
                        {isExpanded ? "▲" : "▼"}
                      </span>
                    )}
                    {!hasData && (
                      <span style={{ fontSize: 10, color: TEXT_MUTED }}>not analyzed</span>
                    )}
                  </div>
                  {/* Price tier */}
                  <div>
                    {row.price_tier ? (
                      <span
                        style={{
                          background:
                            row.price_tier === "luxury"
                              ? "#1a1200"
                              : row.price_tier === "upscale"
                                ? "#1e1b4b"
                                : row.price_tier === "mid-range"
                                  ? "#052e16"
                                  : "#1a1a1a",
                          color:
                            row.price_tier === "luxury"
                              ? "#fbbf24"
                              : row.price_tier === "upscale"
                                ? "#a78bfa"
                                : row.price_tier === "mid-range"
                                  ? "#4ade80"
                                  : TEXT_SECONDARY,
                          borderRadius: 3,
                          padding: "2px 7px",
                          fontSize: 10,
                          fontWeight: 600,
                        }}
                      >
                        {row.price_tier}
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, color: "#444444" }}>—</span>
                    )}
                  </div>
                  {/* Target guest */}
                  <div
                    style={{
                      fontSize: 11,
                      color: TEXT_SECONDARY,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {row.target_guest ?? "—"}
                  </div>
                  {/* Amenity count */}
                  <div style={{ fontSize: 12, color: TEXT_SECONDARY }}>
                    {row.amenities.length > 0 ? `${row.amenities.length} amenities` : "—"}
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && hasData && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      gap: 12,
                      padding: "16px 0 8px",
                      borderBottom: `1px solid ${BORDER}`,
                    }}
                  >
                    {/* Amenities */}
                    <div>
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: TEXT_MUTED,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          marginBottom: 8,
                        }}
                      >
                        AMENITIES
                      </div>
                      {row.amenities.length > 0 ? (
                        row.amenities.map((a, i) => (
                          <div
                            key={i}
                            style={{
                              display: "flex",
                              gap: 6,
                              alignItems: "flex-start",
                              marginBottom: 4,
                            }}
                          >
                            <span
                              style={{
                                color: "#4ade80",
                                fontSize: 11,
                                flexShrink: 0,
                              }}
                            >
                              ✓
                            </span>
                            <span style={{ fontSize: 12, color: "#cccccc" }}>{a}</span>
                          </div>
                        ))
                      ) : (
                        <span style={{ fontSize: 12, color: TEXT_MUTED }}>None listed</span>
                      )}
                    </div>
                    {/* Strengths */}
                    <div>
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: TEXT_MUTED,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          marginBottom: 8,
                        }}
                      >
                        STRENGTHS
                      </div>
                      {row.strengths.length > 0 ? (
                        row.strengths.map((s, i) => (
                          <div
                            key={i}
                            style={{
                              display: "flex",
                              gap: 6,
                              alignItems: "flex-start",
                              marginBottom: 4,
                            }}
                          >
                            <span
                              style={{
                                color: "#4ade80",
                                fontSize: 11,
                                flexShrink: 0,
                              }}
                            >
                              ✓
                            </span>
                            <span style={{ fontSize: 12, color: "#cccccc" }}>{s}</span>
                          </div>
                        ))
                      ) : (
                        <span style={{ fontSize: 12, color: TEXT_MUTED }}>None identified</span>
                      )}
                    </div>
                    {/* Weaknesses */}
                    <div>
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: TEXT_MUTED,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          marginBottom: 8,
                        }}
                      >
                        WEAKNESSES
                      </div>
                      {row.weaknesses.length > 0 ? (
                        row.weaknesses.map((w, i) => (
                          <div
                            key={i}
                            style={{
                              display: "flex",
                              gap: 6,
                              alignItems: "flex-start",
                              marginBottom: 4,
                            }}
                          >
                            <span
                              style={{
                                color: "#fbbf24",
                                fontSize: 11,
                                flexShrink: 0,
                              }}
                            >
                              ⚠
                            </span>
                            <span style={{ fontSize: 12, color: "#cccccc" }}>{w}</span>
                          </div>
                        ))
                      ) : (
                        <span style={{ fontSize: 12, color: TEXT_MUTED }}>None identified</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── 9. Tracked Competitors Table ────────────────────────────────────── */}
      <div style={{ ...cardStyle, overflow: "hidden" }}>
        {/* Header */}
        <div
          className="bench-table-row"
          style={{
            background: "#111111",
            padding: "10px 16px",
            borderBottom: `1px solid ${BORDER}`,
          }}
        >
          {["COMPETITOR", "RATING", "REVIEWS", "LAST SYNCED", "ANALYZED", "ACTIONS"].map((h) => (
            <div
              key={h}
              className={h === "ANALYZED" ? "bench-table-analyze-col" : ""}
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.1em",
                color: TEXT_MUTED,
                textTransform: "uppercase",
              }}
            >
              {h}
            </div>
          ))}
        </div>

        {/* Rows */}
        <div className="bench-table-wrap">
          {competitors.length === 0 ? (
            <div style={{ padding: "32px 16px" }}>
              <EmptyState
                icon={<span style={{ fontSize: 32 }}>◎</span>}
                title="No competitors tracked yet"
                description="Track up to 5 competitors to see how your hotel compares on rating, review volume, and guest experience."
                primaryAction={{
                  label: finding ? "Finding…" : "Find competitors",
                  onClick: () => void handleFindCompetitors(),
                }}
              />
            </div>
          ) : (
            competitors.map((comp, i) => {
              const isSyncing = syncingIds.has(comp.id);
              const isRemoving = removingId === comp.id;
              const isAnalyzing = analyzingCompetitorIds.has(comp.id);
              const needsSync = comp.avg_rating == null;
              const analysisExpired = isAnalysisExpired(comp.last_analyzed_at);
              const dotColor = needsSync
                ? "#f87171"
                : comp.avg_rating != null && comp.avg_rating >= 4.5
                  ? "#4ade80"
                  : comp.avg_rating != null && comp.avg_rating >= 3.5
                    ? "#fbbf24"
                    : "#f87171";

              return (
                <div
                  key={comp.id}
                  className="bench-table-row"
                  style={{
                    padding: "12px 16px",
                    borderBottom: i < competitors.length - 1 ? "1px solid #1a1a1a" : "none",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#161616";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  {/* Name */}
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}
                  >
                    <span
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: "50%",
                        background: dotColor,
                        flexShrink: 0,
                        display: "inline-block",
                        animation: needsSync
                          ? "bench-dot-pulse 1.5s ease-in-out infinite"
                          : "none",
                      }}
                    />
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        color: TEXT_PRIMARY,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {comp.name}
                    </span>
                  </div>
                  {/* Rating */}
                  <div
                    style={{
                      fontSize: 12,
                      color:
                        comp.avg_rating != null ? ratingColor(comp.avg_rating) : TEXT_MUTED,
                    }}
                  >
                    {comp.avg_rating != null ? comp.avg_rating.toFixed(1) : "—"}
                  </div>
                  {/* Reviews */}
                  <div style={{ fontSize: 12, color: TEXT_SECONDARY }}>
                    {comp.total_reviews != null
                      ? comp.total_reviews.toLocaleString()
                      : "—"}
                  </div>
                  {/* Last synced */}
                  <div style={{ fontSize: 11, color: "#444444" }}>
                    {formatTimeAgo(comp.last_synced_at)}
                  </div>
                  {/* Analyzed */}
                  <div className="bench-table-analyze-col">
                    {comp.last_analyzed_at ? (
                      analysisExpired ? (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            color: "#fbbf24",
                            background: "#1a1200",
                            border: "1px solid #2a2000",
                            borderRadius: 3,
                            padding: "2px 6px",
                          }}
                        >
                          expired
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: "#4ade80" }}>
                          {formatTimeAgo(comp.last_analyzed_at)}
                        </span>
                      )
                    ) : (
                      <span style={{ fontSize: 11, color: TEXT_MUTED }}>—</span>
                    )}
                  </div>
                  {/* Actions */}
                  <div style={{ display: "flex", gap: 4, flexWrap: "nowrap" }}>
                    <button
                      type="button"
                      disabled={isSyncing}
                      onClick={() => void handleSyncOne(comp.id)}
                      style={{
                        background: "transparent",
                        border: `1px solid ${BORDER_SUB}`,
                        borderRadius: 4,
                        color: TEXT_SECONDARY,
                        fontSize: 10,
                        fontWeight: 500,
                        cursor: isSyncing ? "not-allowed" : "pointer",
                        opacity: isSyncing ? 0.5 : 1,
                        fontFamily: "inherit",
                        padding: "3px 8px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {isSyncing ? "Syncing…" : "Sync"}
                    </button>
                    <button
                      type="button"
                      disabled={isAnalyzing}
                      onClick={() => void handleAnalyzeCompetitor(comp.id)}
                      style={{
                        background: "transparent",
                        border: `1px solid ${BORDER_SUB}`,
                        borderRadius: 4,
                        color: isAnalyzing ? TEXT_MUTED : "#a78bfa",
                        fontSize: 10,
                        fontWeight: 500,
                        cursor: isAnalyzing ? "not-allowed" : "pointer",
                        opacity: isAnalyzing ? 0.5 : 1,
                        fontFamily: "inherit",
                        padding: "3px 8px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {isAnalyzing
                        ? "…"
                        : analysisExpired
                          ? "Regenerate"
                          : comp.last_analyzed_at
                            ? "Re-analyze"
                            : "Analyze"}
                    </button>
                    <button
                      type="button"
                      disabled={isRemoving}
                      onClick={() => {
                        setRemoveConfirm({ open: true, id: comp.id, name: comp.name });
                      }}
                      style={{
                        background: "transparent",
                        border: `1px solid ${BORDER_SUB}`,
                        borderRadius: 4,
                        color: TEXT_SECONDARY,
                        fontSize: 10,
                        fontWeight: 500,
                        cursor: isRemoving ? "not-allowed" : "pointer",
                        opacity: isRemoving ? 0.5 : 1,
                        fontFamily: "inherit",
                        padding: "3px 8px",
                        whiteSpace: "nowrap",
                      }}
                      onMouseEnter={(e) => {
                        if (!isRemoving) e.currentTarget.style.color = "#f87171";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = TEXT_SECONDARY;
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Remove competitor confirmation */}
      <ConfirmModal
        open={removeConfirm.open}
        title="Remove competitor?"
        message={`This will delete all data for "${removeConfirm.name}". This action cannot be undone.`}
        confirmLabel="Remove"
        cancelLabel="Cancel"
        destructive
        onConfirm={() => void handleRemove(removeConfirm.id)}
        onCancel={() => setRemoveConfirm({ open: false, id: "", name: "" })}
      />
    </div>
  );
}

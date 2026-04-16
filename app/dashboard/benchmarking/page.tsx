"use client";

import { createBrowserClient } from "@supabase/ssr";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";

import type { MapHotel, MapCompetitor } from "./MapComponent";

const MapComponent = dynamic(() => import("./MapComponent"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: 400,
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

// ─── Constants (defined outside component to avoid re-creation) ───────────────
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

function rankColor(rank: number): string {
  if (rank <= 2) return "#4ade80";
  if (rank <= 4) return "#fbbf24";
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
  marginBottom: 10,
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

const barContainerStyle: CSSProperties = {
  flex: 1,
  background: "#1a1a1a",
  height: 6,
  borderRadius: 3,
  overflow: "hidden",
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function BenchmarkingPage() {
  // Core data
  const [loading, setLoading] = useState(true);
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

  // ── Load ──────────────────────────────────────────────────────────────────
  const loadBenchmarking = useCallback(async () => {
    const sb = createSupabaseBrowserClient();

    const {
      data: { user },
      error: userError,
    } = await sb.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error("You must be signed in.");

    const { data: hotels, error: hotelsError } = await sb
      .from("hotels")
      .select("id, name, google_url, tripadvisor_url, booking_url, address, city, country, latitude, longitude")
      .eq("user_id", user.id)
      .limit(1);

    if (hotelsError) throw hotelsError;

    const hotelData = ((hotels ?? []) as Hotel[])[0] ?? null;
    if (!hotelData) {
      setHotel(null);
      setCompetitors([]);
      return { hotel: null, myAvg: null, myTotal: 0, comps: [] as Competitor[] };
    }

    setHotel(hotelData);

    // Fetch my reviews for avg rating calculation
    const { data: reviewsData } = await sb
      .from("reviews")
      .select("rating")
      .eq("hotel_id", hotelData.id)
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

    // Fetch competitors
    const { data: compsData, error: compsError } = await sb
      .from("competitors")
      .select(COMP_SELECT)
      .eq("hotel_id", hotelData.id)
      .order("avg_rating", { ascending: false });

    if (compsError) throw compsError;

    const comps = (compsData ?? []) as unknown as Competitor[];
    setCompetitors(comps);

    return { hotel: hotelData, myAvg, myTotal, comps };
  }, []);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const result = await loadBenchmarking();
        // Auto-generate insights if synced competitors exist
        if (result.hotel && result.comps.some((c) => c.avg_rating != null)) {
          await doGenerateInsights(result.hotel, result.myAvg, result.myTotal, result.comps);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadBenchmarking]);

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
        // ignore sync error, competitor was still added
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
      }
    } finally {
      setRemovingId(null);
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
      setCompetitors((prev) => [...prev, inserted as unknown as Competitor]);
    }
    setManualName("");
    setManualGoogleUrl("");
    setManualTAUrl("");
    setShowManual(false);
    setAddingManual(false);
  }

  // ── Derived state ─────────────────────────────────────────────────────────
  const myHotelCoords = useMemo((): { lat: number; lng: number } | null => {
    if (hotel?.latitude != null && hotel?.longitude != null && !Number.isNaN(hotel.latitude) && !Number.isNaN(hotel.longitude)) {
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

  // ─────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        style={{
          background: "#0d0d0d",
          minHeight: "100vh",
          padding: "24px 28px",
          color: TEXT_SECONDARY,
          fontSize: 13,
        }}
      >
        Loading…
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{ background: "#0d0d0d", minHeight: "100vh", padding: "24px 28px", color: "#f87171" }}
      >
        {error}
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
          <h1 style={{ fontSize: 22, fontWeight: 700, color: TEXT_PRIMARY, margin: 0 }}>
            Competitor benchmarking
          </h1>
          <p style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 2, marginBottom: 0 }}>
            Your market position at a glance
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: "#444444" }}>~$0.002 per sync</span>
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

      {/* ── 2. Find Competitors Card ────────────────────────────────────────── */}
      <div style={{ ...cardStyle, padding: "16px 20px", marginBottom: 16 }}>
        {finding ? (
          /* Loading steps */
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: TEXT_PRIMARY, marginBottom: 12 }}>
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
            <div style={{ fontSize: 12, color: "#444444", marginTop: 6 }}>
              This may take 30–60 seconds…
            </div>
          </div>
        ) : suggestions.length > 0 ? (
          /* Suggestions grid */
          <div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: TEXT_PRIMARY }}>
                AI found {suggestions.length} nearby competitor{suggestions.length !== 1 ? "s" : ""}
              </div>
              <div style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 2 }}>
                Click to select hotels to add to your benchmarking list
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
                      style={{ fontSize: 13, fontWeight: 600, color: TEXT_PRIMARY, marginBottom: 4 }}
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
          /* Default state */
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: TEXT_PRIMARY, marginBottom: 4 }}>
                Find competitors automatically
              </div>
              <div style={{ fontSize: 12, color: TEXT_MUTED }}>
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

      {/* ── 3. Ranking Strip ────────────────────────────────────────────────── */}
      <div
        style={{
          ...cardStyle,
          padding: "12px 16px",
          marginBottom: 16,
          overflowX: "auto",
          display: "flex",
          gap: 8,
          scrollbarWidth: "none",
        }}
      >
        {rankingList.length === 0 ? (
          <div style={{ fontSize: 13, color: TEXT_MUTED }}>No hotels yet</div>
        ) : (
          rankingList.map((entry, idx) => (
            <div
              key={entry.id}
              style={{
                background: entry.isMe ? "#0a1a0a" : CARD,
                border: `1px solid ${entry.isMe ? "#4ade80" : BORDER}`,
                borderLeft: entry.isMe
                  ? "3px solid #4ade80"
                  : `1px solid ${BORDER}`,
                borderRadius: 6,
                padding: "10px 14px",
                minWidth: 150,
                flexShrink: 0,
              }}
            >
              <div style={{ fontSize: 10, color: TEXT_MUTED, marginBottom: 2 }}>#{idx + 1}</div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: TEXT_PRIMARY,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                {truncName(entry.name, 18)}
                {entry.isMe && (
                  <span style={{ color: "#4ade80", fontSize: 9, fontWeight: 700 }}>YOU</span>
                )}
              </div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: TEXT_PRIMARY,
                  marginTop: 4,
                  lineHeight: 1,
                }}
              >
                {entry.avg_rating != null ? entry.avg_rating.toFixed(1) : "—"}
              </div>
              <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 4 }}>
                ({(entry.total_reviews ?? 0).toLocaleString()} reviews)
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── 4. Map ──────────────────────────────────────────────────────────── */}
      <div style={{ ...cardStyle, overflow: "hidden", marginBottom: 16, height: 400 }}>
        <MapComponent
          center={mapCenter}
          zoom={14}
          myHotel={mapHotel}
          competitors={mapCompetitors}
          height={400}
        />
      </div>

      {/* ── 5. AI Insights ──────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 16 }}>
        <div style={sectionLabelStyle}>AI INSIGHTS</div>

        {!hasSyncedCompetitors ? (
          <div
            style={{
              background: CARD,
              border: "1px solid #2a1a00",
              borderRadius: 8,
              padding: "14px 18px",
            }}
          >
            <span style={{ fontSize: 13, color: "#fbbf24" }}>
              Sync competitors to generate AI insights
            </span>
          </div>
        ) : insightsLoading ? (
          <div
            style={{
              background: CARD,
              border: `1px solid ${BORDER}`,
              borderRadius: 8,
              padding: "14px 18px",
            }}
          >
            <span style={{ fontSize: 13, color: TEXT_MUTED }}>Generating insights…</span>
          </div>
        ) : insightsError ? (
          <div
            style={{
              background: CARD,
              border: `1px solid ${BORDER}`,
              borderRadius: 8,
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
                hotel &&
                void doGenerateInsights(hotel, myAvgRating, myTotalReviews, competitors)
              }
              style={secondaryBtnStyle()}
            >
              Retry
            </button>
          </div>
        ) : insights ? (
          <div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 10,
                marginBottom: 8,
              }}
            >
              {INSIGHT_CARDS.map(({ key, icon, label, color }) => (
                <div
                  key={key}
                  style={{
                    background: CARD,
                    border: `1px solid ${BORDER}`,
                    borderRadius: 8,
                    padding: "14px 16px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
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
                  <div style={{ fontSize: 13, color: "#cccccc", lineHeight: 1.6 }}>
                    {insights[key] || "—"}
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() =>
                hotel &&
                void doGenerateInsights(hotel, myAvgRating, myTotalReviews, competitors)
              }
              style={secondaryBtnStyle({ fontSize: 11 })}
            >
              Regenerate insights
            </button>
          </div>
        ) : (
          <div
            style={{
              background: CARD,
              border: `1px solid ${BORDER}`,
              borderRadius: 8,
              padding: "14px 18px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 13, color: TEXT_MUTED }}>Ready to generate AI insights</span>
            <button
              type="button"
              onClick={() =>
                hotel &&
                void doGenerateInsights(hotel, myAvgRating, myTotalReviews, competitors)
              }
              style={primaryBtnStyle()}
            >
              Generate insights
            </button>
          </div>
        )}
      </div>

      {/* ── 6. Analysis Row ─────────────────────────────────────────────────── */}
      <div
        style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}
      >
        {/* Card A — Rating Overview */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "16px 18px" }}>
          <div style={sectionLabelStyle}>RATING OVERVIEW</div>
          {rankingList.map((entry) => (
            <div
              key={entry.id}
              style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}
            >
              <div
                style={{
                  width: 130,
                  fontSize: 12,
                  color: TEXT_SECONDARY,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                {truncName(entry.name, 16)}
              </div>
              <div style={barContainerStyle}>
                {entry.avg_rating != null ? (
                  <div
                    style={{
                      width: `${(entry.avg_rating / 5) * 100}%`,
                      height: "100%",
                      background: entry.isMe ? "#4ade80" : ratingColor(entry.avg_rating),
                      borderRadius: 3,
                    }}
                  />
                ) : (
                  <div style={{ width: 0 }} />
                )}
              </div>
              <div
                style={{
                  width: 36,
                  fontSize: 12,
                  color: entry.avg_rating != null ? TEXT_PRIMARY : "#444444",
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
          ))}
          {marketAvg != null && (
            <div style={{ marginTop: 8, fontSize: 11, color: "#444444" }}>
              Market avg: {marketAvg.toFixed(1)}★
            </div>
          )}
          {rankingList.length === 0 && (
            <div style={{ fontSize: 12, color: TEXT_MUTED }}>No data yet</div>
          )}
        </div>

        {/* Card B — Review Volume */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "16px 18px" }}>
          <div style={sectionLabelStyle}>REVIEW VOLUME</div>
          {rankingList.map((entry) => (
            <div
              key={entry.id}
              style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}
            >
              <div
                style={{
                  width: 130,
                  fontSize: 12,
                  color: TEXT_SECONDARY,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                {truncName(entry.name, 16)}
              </div>
              <div style={barContainerStyle}>
                <div
                  style={{
                    width: `${((entry.total_reviews ?? 0) / maxReviews) * 100}%`,
                    height: "100%",
                    background: entry.isMe ? "#4ade80" : "#2a2a2a",
                    borderRadius: 3,
                  }}
                />
              </div>
              <div
                style={{
                  width: 36,
                  fontSize: 12,
                  color: (entry.total_reviews ?? 0) > 0 ? TEXT_PRIMARY : "#444444",
                  textAlign: "right",
                  flexShrink: 0,
                }}
              >
                {(entry.total_reviews ?? 0).toLocaleString()}
              </div>
            </div>
          ))}
          {rankingList.length === 0 && (
            <div style={{ fontSize: 12, color: TEXT_MUTED }}>No data yet</div>
          )}
        </div>

        {/* Card C — Market Position */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "16px 18px" }}>
          <div style={sectionLabelStyle}>MARKET POSITION</div>
          {myRankInList != null ? (
            <div>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: rankColor(myRankInList),
                  lineHeight: 1,
                  marginBottom: 8,
                }}
              >
                #{myRankInList}{" "}
                <span style={{ fontSize: 16, fontWeight: 400, color: TEXT_MUTED }}>
                  of {rankingList.length}
                </span>
              </div>
              {marketAvg != null && myAvgRating != null && (
                <div
                  style={{
                    fontSize: 13,
                    color: myAvgRating >= marketAvg ? "#4ade80" : "#f87171",
                    marginBottom: 6,
                  }}
                >
                  {myAvgRating >= marketAvg
                    ? `+${(myAvgRating - marketAvg).toFixed(1)} above market average`
                    : `${(myAvgRating - marketAvg).toFixed(1)} below market average`}
                </div>
              )}
              {leader && !leader.isMe && (
                <div style={{ fontSize: 12, color: TEXT_SECONDARY }}>
                  {myTotalReviews < (leader.total_reviews ?? 0)
                    ? `${((leader.total_reviews ?? 0) - myTotalReviews).toLocaleString()} reviews behind leader`
                    : `${(myTotalReviews - (leader.total_reviews ?? 0)).toLocaleString()} reviews ahead of 2nd`}
                </div>
              )}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: TEXT_MUTED }}>No data yet</div>
          )}
        </div>
      </div>

      {/* ── 7. Tracked Competitors Table ────────────────────────────────────── */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, overflow: "hidden" }}>
        {/* Table header */}
        <div
          style={{
            background: CARD,
            padding: "10px 18px",
            borderBottom: `1px solid ${BORDER}`,
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr 1fr 130px",
            gap: 8,
          }}
        >
          {["NAME", "RATING", "REVIEWS", "LAST SYNCED", "ACTIONS"].map((h) => (
            <div
              key={h}
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
        {competitors.length === 0 ? (
          <div style={{ padding: "20px 18px" }}>
            <div style={{ fontSize: 13, color: TEXT_MUTED }}>
              No competitors yet. Use Find competitors above, or add manually below.
            </div>
          </div>
        ) : (
          competitors.map((comp, i) => {
            const isSyncing = syncingIds.has(comp.id);
            const isRemoving = removingId === comp.id;
            return (
              <div
                key={comp.id}
                style={{
                  padding: "12px 18px",
                  borderBottom: i < competitors.length - 1 ? `1px solid ${BORDER}` : "none",
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr 1fr 1fr 130px",
                  gap: 8,
                  alignItems: "center",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#1a1a1a";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: TEXT_PRIMARY,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {comp.name}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color:
                      comp.avg_rating != null ? ratingColor(comp.avg_rating) : "#fbbf24",
                  }}
                >
                  {comp.avg_rating != null ? comp.avg_rating.toFixed(1) : "—"}
                </div>
                <div style={{ fontSize: 13, color: TEXT_SECONDARY }}>
                  {comp.total_reviews != null
                    ? comp.total_reviews.toLocaleString()
                    : "—"}
                </div>
                <div style={{ fontSize: 11, color: "#444444" }}>
                  {formatTimeAgo(comp.last_synced_at)}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    type="button"
                    disabled={isSyncing}
                    onClick={() => void handleSyncOne(comp.id)}
                    style={secondaryBtnStyle({
                      opacity: isSyncing ? 0.5 : 1,
                      cursor: isSyncing ? "not-allowed" : "pointer",
                    })}
                  >
                    {isSyncing ? "Syncing…" : "Sync"}
                  </button>
                  <button
                    type="button"
                    disabled={isRemoving}
                    onClick={() => void handleRemove(comp.id)}
                    style={secondaryBtnStyle({
                      opacity: isRemoving ? 0.5 : 1,
                      cursor: isRemoving ? "not-allowed" : "pointer",
                    })}
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

        {/* Manual add */}
        <div style={{ padding: "12px 18px", borderTop: `1px solid ${BORDER}` }}>
          <button
            type="button"
            onClick={() => setShowManual(!showManual)}
            style={{
              background: "none",
              border: "none",
              fontSize: 12,
              color: TEXT_MUTED,
              cursor: "pointer",
              fontFamily: "inherit",
              padding: 0,
            }}
          >
            Add manually ↓
          </button>

          {showManual && (
            <div style={{ marginTop: 10 }}>
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
        </div>
      </div>
    </div>
  );
}

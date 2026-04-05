"use client";

import { createBrowserClient } from "@supabase/ssr";
import dynamic from "next/dynamic";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { extractCoordsFromGoogleMapsUrl } from "@/lib/extract-google-maps-coords";
import { getRatingColor } from "@/lib/rating-colors";

const MapComponent = dynamic(() => import("./MapComponent"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        minHeight: 320,
        height: 480,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(255,255,255,0.03)",
        borderRadius: 20,
        color: "rgba(255,255,255,0.4)",
        fontSize: 14,
      }}
      className="bm-map-loading"
    >
      Loading map…
    </div>
  ),
});

const glass: CSSProperties = {
  background: "var(--glass-bg)",
  backdropFilter: "blur(24px) saturate(180%)",
  WebkitBackdropFilter: "blur(24px) saturate(180%)",
  border: "1px solid var(--glass-border)",
  borderRadius: "var(--card-radius)",
  boxShadow: "var(--glass-shadow), var(--glass-inner)",
};

const glassInput: CSSProperties = {
  width: "100%",
  background: "var(--glass-input-bg)",
  border: "1px solid var(--glass-input-border)",
  borderRadius: "var(--input-radius)",
  padding: "12px 16px",
  color: "var(--input-text)",
  fontSize: "14px",
  outline: "none",
  boxSizing: "border-box",
};

const primaryBtn: CSSProperties = {
  background: "var(--btn-primary-bg)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid var(--btn-primary-border)",
  borderRadius: "var(--btn-radius)",
  padding: "12px 24px",
  color: "var(--on-primary)",
  fontWeight: 500,
  fontSize: "14px",
  cursor: "pointer",
  transition: "all 0.2s ease",
};

const secondaryBtn: CSSProperties = {
  background: "var(--secondary-btn-bg)",
  border: "1px solid var(--secondary-btn-border)",
  borderRadius: "var(--btn-radius)",
  color: "var(--text-primary)",
  fontWeight: 500,
  fontSize: "13px",
  cursor: "pointer",
  transition: "all 0.2s ease",
};

const labelStyle: CSSProperties = {
  display: "block",
  fontSize: "13px",
  color: "var(--text-secondary)",
  marginBottom: "6px",
};

const MAX_COMPETITORS = 5;

type HotelRow = {
  id: string;
  name: string | null;
  address: string | null;
  google_url: string | null;
  tripadvisor_url: string | null;
  booking_url: string | null;
  latitude: number | null;
  longitude: number | null;
};

type CompetitorRow = {
  id: string;
  hotel_id: string;
  name: string;
  google_url: string | null;
  tripadvisor_url: string | null;
  avg_rating: number | null;
  total_reviews: number;
  updated_at: string;
  last_synced_at: string | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
};

type ReviewLite = {
  rating: number | null;
  complaint_topic: string | null;
  topic_type: string | null;
};

function truncate(s: string, n: number) {
  const t = s.trim();
  if (t.length <= n) return t;
  return `${t.slice(0, n)}…`;
}

function formatRelative(iso: string | null): string {
  if (!iso) return "Never";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "Never";
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export default function BenchmarkingPage() {
  const [loading, setLoading] = useState(true);
  const [hotel, setHotel] = useState<HotelRow | null>(null);
  const [competitors, setCompetitors] = useState<CompetitorRow[]>([]);
  const [reviews, setReviews] = useState<ReviewLite[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [mapHeight, setMapHeight] = useState(480);

  const [addName, setAddName] = useState("");
  const [addGoogle, setAddGoogle] = useState("");
  const [addTa, setAddTa] = useState("");
  const [savingAdd, setSavingAdd] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const apply = () => setMapHeight(mq.matches ? 320 : 480);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) {
        setHotel(null);
        setCompetitors([]);
        setReviews([]);
        return;
      }

      const { data: h, error: hErr } = await supabase
        .from("hotels")
        .select(
          "id, name, address, google_url, tripadvisor_url, booking_url, latitude, longitude",
        )
        .eq("user_id", user.id)
        .maybeSingle();

      if (hErr) throw hErr;
      setHotel(h as HotelRow | null);

      if (h?.id) {
        const [{ data: rows, error: cErr }, { data: revs, error: rErr }] = await Promise.all([
          supabase.from("competitors").select("*").eq("hotel_id", h.id).order("created_at", { ascending: true }),
          supabase.from("reviews").select("rating, complaint_topic, topic_type").eq("hotel_id", h.id),
        ]);
        if (cErr) throw cErr;
        if (rErr) throw rErr;
        setCompetitors((rows ?? []) as CompetitorRow[]);
        setReviews((revs ?? []) as ReviewLite[]);
      } else {
        setCompetitors([]);
        setReviews([]);
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const myRating = useMemo(() => {
    const nums = reviews.map((r) => r.rating).filter((x): x is number => typeof x === "number" && !Number.isNaN(x));
    return avg(nums);
  }, [reviews]);

  const myTotalReviews = reviews.length;

  const marketStats = useMemo(() => {
    const comps = competitors.map((c) => ({
      id: c.id,
      name: c.name,
      rating: c.avg_rating,
      total: c.total_reviews ?? 0,
      kind: "competitor" as const,
    }));
    const mine = {
      id: "yours",
      name: hotel?.name ?? "Your hotel",
      rating: myRating,
      total: myTotalReviews,
      kind: "yours" as const,
    };
    const allRated = [mine, ...comps].filter((x) => x.rating != null && !Number.isNaN(x.rating as number));
    const marketAvg =
      allRated.length > 0
        ? allRated.reduce((s, x) => s + (x.rating as number), 0) / allRated.length
        : null;

    const sortedByRating = [...[mine, ...comps]].sort((a, b) => {
      const ar = a.rating ?? -1;
      const br = b.rating ?? -1;
      return br - ar;
    });
    const rank =
      sortedByRating.findIndex((x) => x.kind === "yours") >= 0
        ? sortedByRating.findIndex((x) => x.kind === "yours") + 1
        : null;

    const totals = [mine.total, ...comps.map((c) => c.total)];
    const maxRev = Math.max(0, ...totals);

    const pctVsMarket =
      marketAvg != null && myRating != null && marketAvg !== 0
        ? ((myRating - marketAvg) / marketAvg) * 100
        : null;

    return {
      marketAvg,
      rank,
      totalHotels: 1 + competitors.length,
      maxRev,
      pctVsMarket,
    };
  }, [competitors, hotel?.name, myRating, myTotalReviews]);

  const rankMap = useMemo(() => {
    const entries = [
      { key: "yours" as const, rating: myRating },
      ...competitors.map((c) => ({ key: c.id as string, rating: c.avg_rating })),
    ];
    const sorted = [...entries].sort((a, b) => {
      const ar = a.rating ?? -1;
      const br = b.rating ?? -1;
      return br - ar;
    });
    const m = new Map<string | "yours", number>();
    sorted.forEach((e, i) => m.set(e.key, i + 1));
    return m;
  }, [competitors, myRating]);

  const topicInsights = useMemo(() => {
    const improvements = new Map<string, number>();
    const strengths = new Map<string, number>();
    for (const r of reviews) {
      const t = r.complaint_topic?.trim();
      if (!t) continue;
      if (r.topic_type === "improvement") {
        improvements.set(t, (improvements.get(t) ?? 0) + 1);
      }
      if (r.topic_type === "strength") {
        strengths.set(t, (strengths.get(t) ?? 0) + 1);
      }
    }
    const sortMap = (mp: Map<string, number>) =>
      [...mp.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
    return {
      improvementTopics: sortMap(improvements),
      strengthTopics: sortMap(strengths),
      hasClassified: improvements.size > 0 || strengths.size > 0,
    };
  }, [reviews]);

  const anyCompetitorSynced = useMemo(
    () => competitors.some((c) => (c.total_reviews ?? 0) > 0),
    [competitors],
  );

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
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || json.success !== true) {
        throw new Error(json.error ?? `Failed syncing ${platform}`);
      }
      return { platform, ok: true as const, error: null as string | null };
    } catch (e) {
      return {
        platform,
        ok: false as const,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }

  async function handleSyncAll() {
    if (!hotel?.id) return;
    setSyncing(true);
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) {
        showToast("Sign in required");
        return;
      }

      const { data: h } = await supabase
        .from("hotels")
        .select("tripadvisor_url, google_url, booking_url")
        .eq("user_id", user.id)
        .maybeSingle();

      const ta = typeof h?.tripadvisor_url === "string" ? h.tripadvisor_url.trim() : "";
      const gu = typeof h?.google_url === "string" ? h.google_url.trim() : "";
      const bu = typeof h?.booking_url === "string" ? h.booking_url.trim() : "";

      const tasks = [
        ta ? syncPlatform("tripadvisor", ta, hotel.id) : null,
        gu ? syncPlatform("google", gu, hotel.id) : null,
        bu ? syncPlatform("booking", bu, hotel.id) : null,
      ].filter(Boolean) as ReturnType<typeof syncPlatform>[];

      await Promise.all(tasks);

      for (const c of competitors) {
        const res = await fetch("/api/refresh-competitor-stats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ competitor_id: c.id }),
        });
        const j = (await res.json()) as { success?: boolean; error?: string };
        if (!res.ok || !j.success) {
          console.warn("Competitor sync failed", c.id, j.error);
        }
      }

      await loadData();
      showToast("Sync finished");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  async function handleSyncOne(competitorId: string) {
    setSyncingId(competitorId);
    try {
      const res = await fetch("/api/refresh-competitor-stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ competitor_id: competitorId }),
      });
      const j = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !j.success) {
        throw new Error(j.error ?? "Sync failed");
      }
      await loadData();
      showToast("Competitor updated");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncingId(null);
    }
  }

  async function handleRemove(competitorId: string) {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    const { error } = await supabase.from("competitors").delete().eq("id", competitorId);
    if (error) {
      showToast(error.message);
      return;
    }
    setCompetitors((prev) => prev.filter((c) => c.id !== competitorId));
    showToast("Competitor removed");
  }

  async function onAddCompetitor(e: FormEvent) {
    e.preventDefault();
    if (!hotel?.id) return;
    if (competitors.length >= MAX_COMPETITORS) {
      showToast("Competitor limit reached (5)");
      return;
    }
    if (!addName.trim()) {
      showToast("Name is required");
      return;
    }
    setSavingAdd(true);
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );
      const coords = extractCoordsFromGoogleMapsUrl(addGoogle);
      const row: Record<string, unknown> = {
        hotel_id: hotel.id,
        name: addName.trim(),
        google_url: addGoogle.trim() || null,
        tripadvisor_url: addTa.trim() || null,
        avg_rating: null,
        total_reviews: 0,
      };
      if (coords) {
        row.latitude = coords.latitude;
        row.longitude = coords.longitude;
      }
      const { data, error } = await supabase.from("competitors").insert(row).select("*").single();
      if (error) throw error;
      setCompetitors((prev) => [...prev, data as CompetitorRow]);
      setAddName("");
      setAddGoogle("");
      setAddTa("");
      showToast("Competitor added");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSavingAdd(false);
    }
  }

  const competitorsSorted = useMemo(
    () =>
      [...competitors].sort((a, b) => {
        const ar = a.avg_rating ?? -1;
        const br = b.avg_rating ?? -1;
        return br - ar;
      }),
    [competitors],
  );

  const ratingBars = useMemo(() => {
    const rows: { label: string; rating: number | null; mine: boolean }[] = [
      { label: hotel?.name ? truncate(hotel.name, 24) : "Your hotel", rating: myRating, mine: true },
      ...competitorsSorted.map((c) => ({
        label: truncate(c.name, 24),
        rating: c.avg_rating,
        mine: false,
      })),
    ];
    return rows;
  }, [competitorsSorted, hotel?.name, myRating]);

  const volumeBars = useMemo(() => {
    const rows = [
      { label: hotel?.name ? truncate(hotel.name, 24) : "Your hotel", n: myTotalReviews, mine: true },
      ...competitorsSorted.map((c) => ({
        label: truncate(c.name, 24),
        n: c.total_reviews ?? 0,
        mine: false,
      })),
    ];
    const maxN = Math.max(1, ...rows.map((r) => r.n));
    return rows.map((r) => ({ ...r, pct: (r.n / maxN) * 100 }));
  }, [competitorsSorted, hotel?.name, myTotalReviews]);

  if (loading) {
    return (
      <div style={{ padding: "24px 0" }}>
        <p style={{ color: "var(--text-muted)" }}>Loading…</p>
      </div>
    );
  }

  if (!hotel) {
    return (
      <div style={{ ...glass, padding: "24px", maxWidth: "560px" }}>
        <h1 style={{ fontSize: "20px", marginBottom: "8px" }}>Competitor benchmarking</h1>
        <p style={{ color: "var(--text-secondary)", marginBottom: "16px" }}>
          Add a hotel in{" "}
          <Link href="/dashboard/settings" style={{ color: "var(--accent)" }}>
            Settings
          </Link>{" "}
          to use benchmarking.
        </p>
      </div>
    );
  }

  const diffLabel =
    marketStats.pctVsMarket != null ? (
      <span
        style={{
          color: marketStats.pctVsMarket >= 0 ? "var(--success)" : "#f87171",
          fontWeight: 600,
        }}
      >
        {marketStats.pctVsMarket >= 0 ? "+" : ""}
        {marketStats.pctVsMarket.toFixed(1)}% {marketStats.pctVsMarket >= 0 ? "above" : "below"}{" "}
        market average
      </span>
    ) : (
      <span style={{ color: "var(--text-muted)" }}>Add ratings to compare</span>
    );

  const behindLeader =
    marketStats.maxRev > 0 ? Math.max(0, marketStats.maxRev - myTotalReviews) : 0;
  const reviewsVsLeader =
    marketStats.maxRev === 0
      ? "Sync platforms to populate review counts"
      : behindLeader === 0
        ? "You match the highest review volume in this set"
        : `${behindLeader.toLocaleString()} reviews behind the leader`;

  return (
    <div style={{ maxWidth: 1100 }}>
      <header
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 28,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "26px",
              fontWeight: 700,
              color: "var(--text-primary)",
              margin: "0 0 6px 0",
            }}
          >
            Competitor benchmarking
          </h1>
          <p style={{ fontSize: "14px", color: "var(--text-muted)", margin: 0 }}>
            Your market position at a glance
          </p>
        </div>
        <button
          type="button"
          disabled={syncing}
          onClick={() => void handleSyncAll()}
          style={{
            ...primaryBtn,
            opacity: syncing ? 0.65 : 1,
            cursor: syncing ? "not-allowed" : "pointer",
          }}
        >
          {syncing ? "Syncing…" : "Sync all"}
        </button>
      </header>

      {/* Ranking strip */}
      <div
        style={{
          ...glass,
          padding: "16px",
          borderRadius: 16,
          marginBottom: 24,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 12,
            overflowX: "auto",
            paddingBottom: 4,
            WebkitOverflowScrolling: "touch",
          }}
        >
          {/* Your hotel first */}
          {(() => {
            const r = myRating;
            const dot = r != null && !Number.isNaN(r) ? getRatingColor(r) : "#64748b";
            const pos = rankMap.get("yours") ?? "—";
            return (
              <div
                key="yours"
                style={{
                  flex: "0 0 auto",
                  minWidth: 200,
                  background: "rgba(99,102,241,0.15)",
                  border: "1px solid rgba(99,102,241,0.3)",
                  borderRadius: 12,
                  padding: "12px 16px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: pos === 1 ? "#eab308" : "var(--text-secondary)",
                    }}
                  >
                    #{pos}
                  </span>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: dot,
                      flexShrink: 0,
                    }}
                  />
                </div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    marginBottom: 4,
                  }}
                >
                  {truncate(hotel.name ?? "Your hotel", 20)}
                </div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                  {r != null ? `${r.toFixed(1)} ★` : "— ★"}{" "}
                  <span style={{ color: "var(--text-muted)" }}>
                    ({myTotalReviews.toLocaleString()})
                  </span>
                </div>
              </div>
            );
          })()}
          {competitorsSorted.map((c) => {
            const r = c.avg_rating;
            const dot = r != null && !Number.isNaN(r) ? getRatingColor(r) : "#64748b";
            const pos = rankMap.get(c.id) ?? "—";
            return (
              <div
                key={c.id}
                style={{
                  ...glass,
                  flex: "0 0 auto",
                  minWidth: 200,
                  padding: "12px 16px",
                  borderRadius: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: pos === 1 ? "#eab308" : "var(--text-secondary)",
                    }}
                  >
                    #{pos}
                  </span>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: dot,
                      flexShrink: 0,
                    }}
                  />
                </div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    marginBottom: 4,
                  }}
                >
                  {truncate(c.name, 20)}
                </div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                  {r != null ? `${r.toFixed(1)} ★` : "— ★"}{" "}
                  <span style={{ color: "var(--text-muted)" }}>
                    ({(c.total_reviews ?? 0).toLocaleString()})
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Map */}
      <div
        style={{
          ...glass,
          borderRadius: 20,
          overflow: "hidden",
          marginBottom: 24,
          padding: 0,
        }}
      >
        <MapComponent
          hotel={{
            name: hotel.name ?? "Your hotel",
            avg_rating: myRating,
            total_reviews: myTotalReviews,
            address: hotel.address,
            latitude: hotel.latitude,
            longitude: hotel.longitude,
          }}
          competitors={competitors.map((c) => ({
            id: c.id,
            name: c.name,
            avg_rating: c.avg_rating,
            total_reviews: c.total_reviews ?? 0,
            address: c.address,
            latitude: c.latitude,
            longitude: c.longitude,
          }))}
          height={mapHeight}
        />
      </div>

      {/* Analysis grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div style={{ ...glass, padding: "20px", borderRadius: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: "var(--text-primary)" }}>
            Rating overview
          </div>
          <div style={{ fontSize: 36, fontWeight: 700, color: "#6366f1", lineHeight: 1.1 }}>
            {myRating != null ? myRating.toFixed(1) : "—"}
          </div>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "8px 0 16px" }}>Your hotel</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {ratingBars.map((row) => {
              const pct = row.rating != null ? (row.rating / 5) * 100 : 0;
              const bg = row.mine
                ? "#6366f1"
                : row.rating != null
                  ? getRatingColor(row.rating)
                  : "var(--glass-border)";
              return (
                <div key={row.label + (row.mine ? "-y" : "-c")}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 12,
                      color: "var(--text-secondary)",
                      marginBottom: 4,
                    }}
                  >
                    <span>{row.mine ? "You" : row.label}</span>
                    <span>{row.rating != null ? row.rating.toFixed(1) : "—"}</span>
                  </div>
                  <div
                    style={{
                      height: 8,
                      borderRadius: 100,
                      background: "var(--glass-muted)",
                      overflow: "hidden",
                    }}
                  >
                    <div style={{ width: `${pct}%`, height: "100%", background: bg, borderRadius: 100 }} />
                  </div>
                </div>
              );
            })}
          </div>
          <p style={{ fontSize: 13, marginTop: 16, marginBottom: 0 }}>
            {marketStats.marketAvg != null && myRating != null ? (
              <>
                {myRating >= marketStats.marketAvg ? (
                  <span style={{ color: "var(--success)", fontWeight: 600 }}>
                    +{(myRating - marketStats.marketAvg).toFixed(1)} above average
                  </span>
                ) : (
                  <span style={{ color: "#f87171", fontWeight: 600 }}>
                    {(myRating - marketStats.marketAvg).toFixed(1)} below average
                  </span>
                )}
              </>
            ) : (
              <span style={{ color: "var(--text-muted)" }}>Sync data to compare to the market average</span>
            )}
          </p>
        </div>

        <div style={{ ...glass, padding: "20px", borderRadius: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: "var(--text-primary)" }}>
            Review volume
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {volumeBars.map((row) => (
              <div key={row.label + (row.mine ? "-y" : "-c")}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 12,
                    color: "var(--text-secondary)",
                    marginBottom: 4,
                  }}
                >
                  <span>{row.mine ? "You" : row.label}</span>
                  <span>{row.n.toLocaleString()}</span>
                </div>
                <div
                  style={{
                    height: 10,
                    borderRadius: 100,
                    background: "var(--glass-muted)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${row.pct}%`,
                      height: "100%",
                      background: row.mine ? "#6366f1" : "rgba(148,163,184,0.6)",
                      borderRadius: 100,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...glass, padding: "20px", borderRadius: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: "var(--text-primary)" }}>
            Your advantages
          </div>
          {!anyCompetitorSynced ? (
            <p style={{ fontSize: 14, color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>
              Sync competitors to see analysis
            </p>
          ) : !topicInsights.hasClassified ? (
            <p style={{ fontSize: 14, color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>
              Run classification on your reviews to see themed strengths and focus areas.
            </p>
          ) : (
            <>
              <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 10px" }}>
                Based on your classified reviews (peer topic data coming soon).
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {topicInsights.strengthTopics.slice(0, 6).map((t) => (
                  <span
                    key={`s-${t}`}
                    style={{
                      fontSize: 12,
                      padding: "6px 10px",
                      borderRadius: 100,
                      background: "rgba(34,197,94,0.15)",
                      color: "var(--success)",
                      border: "1px solid rgba(34,197,94,0.35)",
                    }}
                  >
                    ✓ Better {t}
                  </span>
                ))}
                {topicInsights.improvementTopics.slice(0, 6).map((t) => (
                  <span
                    key={`i-${t}`}
                    style={{
                      fontSize: 12,
                      padding: "6px 10px",
                      borderRadius: 100,
                      background: "rgba(248,113,113,0.12)",
                      color: "#fca5a5",
                      border: "1px solid rgba(248,113,113,0.35)",
                    }}
                  >
                    ↑ More {t} mentions
                  </span>
                ))}
              </div>
            </>
          )}
        </div>

        <div style={{ ...glass, padding: "20px", borderRadius: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: "var(--text-primary)" }}>
            Market position
          </div>
          <ul
            style={{
              margin: 0,
              paddingLeft: 18,
              color: "var(--text-secondary)",
              fontSize: 14,
              lineHeight: 1.7,
            }}
          >
            <li>
              Ranked #
              {marketStats.rank != null && marketStats.totalHotels > 0
                ? `${marketStats.rank} of ${marketStats.totalHotels}`
                : "—"}{" "}
              hotels in your area
            </li>
            <li>{diffLabel}</li>
            <li style={{ color: "var(--text-primary)" }}>{reviewsVsLeader}</li>
          </ul>
        </div>
      </div>

      {/* Competitor table */}
      <div style={{ ...glass, padding: "24px", borderRadius: 16, marginBottom: 20 }}>
        <h2 style={{ fontSize: 17, fontWeight: 600, margin: "0 0 16px", color: "var(--text-primary)" }}>
          Tracked competitors
        </h2>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--text-muted)", fontSize: 12 }}>
                <th style={{ padding: "8px 12px 12px 0" }}>Name</th>
                <th style={{ padding: "8px 12px" }}>Rating</th>
                <th style={{ padding: "8px 12px" }}>Reviews</th>
                <th style={{ padding: "8px 12px" }}>Last synced</th>
                <th style={{ padding: "8px 0 12px 12px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {competitors.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: "16px 0", color: "var(--text-muted)" }}>
                    No competitors yet. Add one below.
                  </td>
                </tr>
              ) : (
                competitors.map((c) => (
                  <tr key={c.id} style={{ borderTop: "1px solid var(--glass-border)" }}>
                    <td style={{ padding: "12px 12px 12px 0", fontWeight: 500, color: "var(--text-primary)" }}>
                      {c.name}
                    </td>
                    <td style={{ padding: 12 }}>{c.avg_rating != null ? c.avg_rating.toFixed(1) : "—"}</td>
                    <td style={{ padding: 12 }}>{(c.total_reviews ?? 0).toLocaleString()}</td>
                    <td style={{ padding: 12, color: "var(--text-muted)", fontSize: 13 }}>
                      {formatRelative(c.last_synced_at ?? c.updated_at)}
                    </td>
                    <td style={{ padding: "12px 0 12px 12px" }}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          disabled={syncingId === c.id}
                          onClick={() => void handleSyncOne(c.id)}
                          style={{
                            ...secondaryBtn,
                            padding: "6px 12px",
                            fontSize: 12,
                            opacity: syncingId === c.id ? 0.6 : 1,
                          }}
                        >
                          {syncingId === c.id ? "…" : "Sync"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleRemove(c.id)}
                          style={{
                            ...secondaryBtn,
                            padding: "6px 12px",
                            fontSize: 12,
                            borderColor: "rgba(248,113,113,0.4)",
                            color: "#fca5a5",
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--glass-border)" }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: "var(--text-primary)" }}>
            Add competitor
          </div>
          <form onSubmit={onAddCompetitor}>
            <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
              <div>
                <label htmlFor="ac-name" style={labelStyle}>
                  Name
                </label>
                <input
                  id="ac-name"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  style={glassInput}
                  placeholder="Hotel name"
                />
              </div>
              <div>
                <label htmlFor="ac-g" style={labelStyle}>
                  Google Maps URL
                </label>
                <input
                  id="ac-g"
                  type="url"
                  value={addGoogle}
                  onChange={(e) => setAddGoogle(e.target.value)}
                  style={glassInput}
                  placeholder="https://maps.google.com/..."
                />
              </div>
              <div>
                <label htmlFor="ac-ta" style={labelStyle}>
                  TripAdvisor URL
                </label>
                <input
                  id="ac-ta"
                  type="url"
                  value={addTa}
                  onChange={(e) => setAddTa(e.target.value)}
                  style={glassInput}
                  placeholder="https://..."
                />
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <button
                type="submit"
                disabled={savingAdd || competitors.length >= MAX_COMPETITORS}
                style={{
                  ...primaryBtn,
                  opacity: savingAdd || competitors.length >= MAX_COMPETITORS ? 0.65 : 1,
                  cursor: savingAdd || competitors.length >= MAX_COMPETITORS ? "not-allowed" : "pointer",
                }}
              >
                {savingAdd ? "Adding…" : "Add"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {toast ? (
        <div
          role="status"
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            ...glass,
            padding: "12px 18px",
            zIndex: 50,
            fontSize: "14px",
          }}
        >
          {toast}
        </div>
      ) : null}

      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media (max-width: 768px) {
              .bm-map-loading { height: 320px !important; min-height: 320px !important; }
            }
          `,
        }}
      />
    </div>
  );
}

"use client";

import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";

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
  city: string | null;
  country: string | null;
  google_url: string | null;
};

type CompetitorRow = {
  id: string;
  hotel_id: string;
  name: string;
  google_url: string | null;
  tripadvisor_url: string | null;
  booking_url: string | null;
  avg_rating: number | null;
  total_reviews: number;
  updated_at: string;
};

type DiscoveryHit = {
  name: string;
  google_url: string;
  address: string;
  avg_rating: number | null;
  total_reviews: number;
  category: string;
  website: string;
  phone: string;
  tripadvisor_search: string;
};

function normalizeUrl(u: string | null | undefined): string {
  return (u ?? "").trim().toLowerCase();
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

function starRow(rating: number | null): string {
  if (rating == null || Number.isNaN(rating)) return "—";
  const full = Math.round(rating);
  const parts: string[] = [];
  for (let i = 1; i <= 5; i++) {
    parts.push(i <= full ? "★" : "☆");
  }
  return parts.join("");
}

export default function BenchmarkingPage() {
  const [loading, setLoading] = useState(true);
  const [hotel, setHotel] = useState<HotelRow | null>(null);
  const [competitors, setCompetitors] = useState<CompetitorRow[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const [isSearching, setIsSearching] = useState(false);
  const [discoveryResults, setDiscoveryResults] = useState<DiscoveryHit[] | null>(null);
  const [searchQueryLabel, setSearchQueryLabel] = useState<string | null>(null);
  const [addingKey, setAddingKey] = useState<string | null>(null);

  const [manualOpen, setManualOpen] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualTa, setManualTa] = useState("");
  const [manualGoogle, setManualGoogle] = useState("");
  const [manualBooking, setManualBooking] = useState("");
  const [savingManual, setSavingManual] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 4000);
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
        return;
      }

      const { data: h, error: hErr } = await supabase
        .from("hotels")
        .select("id, name, city, country, google_url")
        .eq("user_id", user.id)
        .maybeSingle();

      if (hErr) throw hErr;
      setHotel(h as HotelRow | null);

      if (h?.id) {
        const { data: rows, error: cErr } = await supabase
          .from("competitors")
          .select("*")
          .eq("hotel_id", h.id)
          .order("created_at", { ascending: true });
        if (cErr) throw cErr;
        setCompetitors((rows ?? []) as CompetitorRow[]);
      } else {
        setCompetitors([]);
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

  const trackedCount = competitors.length;
  const totalCompReviews = useMemo(
    () => competitors.reduce((sum, c) => sum + (c.total_reviews ?? 0), 0),
    [competitors],
  );
  const lastUpdated = useMemo(() => {
    if (competitors.length === 0) return null;
    let max = 0;
    for (const c of competitors) {
      const t = new Date(c.updated_at).getTime();
      if (!Number.isNaN(t) && t > max) max = t;
    }
    return max ? new Date(max).toISOString() : null;
  }, [competitors]);

  const googleUrlsAdded = useMemo(
    () => new Set(competitors.map((c) => normalizeUrl(c.google_url)).filter(Boolean)),
    [competitors],
  );

  async function handleFindCompetitors() {
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

    const { data: h, error } = await supabase
      .from("hotels")
      .select("name, city, country, google_url")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      showToast(error.message);
      return;
    }

    if (!h?.city?.trim()) {
      showToast("Add your hotel's city in Settings first");
      return;
    }

    setIsSearching(true);
    setDiscoveryResults(null);
    setSearchQueryLabel(null);

    try {
      const res = await fetch("/api/find-competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotel_name: h.name,
          city: h.city,
          country: h.country,
          google_url: h.google_url,
        }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        competitors?: DiscoveryHit[];
        search_query?: string;
        error?: string;
      };

      if (!res.ok || json.success !== true) {
        throw new Error(json.error ?? "Search failed");
      }

      setDiscoveryResults(json.competitors ?? []);
      setSearchQueryLabel(json.search_query ?? null);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Search failed");
    } finally {
      setIsSearching(false);
    }
  }

  async function handleAddDiscovery(hit: DiscoveryHit) {
    if (!hotel?.id) return;
    if (trackedCount >= MAX_COMPETITORS) {
      showToast("Competitor limit reached (5)");
      return;
    }
    const rowKey = normalizeUrl(hit.google_url) || hit.name;
    if (hit.google_url && googleUrlsAdded.has(normalizeUrl(hit.google_url))) {
      return;
    }

    setAddingKey(rowKey);
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );
      const { data, error } = await supabase
        .from("competitors")
        .insert({
          hotel_id: hotel.id,
          name: hit.name,
          google_url: hit.google_url || null,
          tripadvisor_url: null,
          booking_url: null,
          avg_rating: hit.avg_rating,
          total_reviews: hit.total_reviews,
        })
        .select("*")
        .single();

      if (error) throw error;
      setCompetitors((prev) => [...prev, data as CompetitorRow]);
      showToast(`Added ${hit.name}`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Could not add competitor");
    } finally {
      setAddingKey(null);
    }
  }

  async function onSaveManual(e: FormEvent) {
    e.preventDefault();
    if (!hotel?.id) return;
    if (trackedCount >= MAX_COMPETITORS) {
      showToast("Competitor limit reached (5)");
      return;
    }
    if (!manualName.trim()) {
      showToast("Name is required");
      return;
    }
    setSavingManual(true);
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );
      const { data, error } = await supabase
        .from("competitors")
        .insert({
          hotel_id: hotel.id,
          name: manualName.trim(),
          tripadvisor_url: manualTa.trim() || null,
          google_url: manualGoogle.trim() || null,
          booking_url: manualBooking.trim() || null,
          avg_rating: null,
          total_reviews: 0,
        })
        .select("*")
        .single();

      if (error) throw error;
      setCompetitors((prev) => [...prev, data as CompetitorRow]);
      setManualName("");
      setManualTa("");
      setManualGoogle("");
      setManualBooking("");
      showToast("Competitor saved");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSavingManual(false);
    }
  }

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
        <h1 style={{ fontSize: "20px", marginBottom: "8px" }}>Benchmarking</h1>
        <p style={{ color: "var(--text-secondary)", marginBottom: "16px" }}>
          Add a hotel in{" "}
          <Link href="/dashboard/settings" style={{ color: "var(--accent)" }}>
            Settings
          </Link>{" "}
          to track competitors.
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "900px" }}>
      <h1
        style={{
          fontSize: "26px",
          fontWeight: 700,
          color: "var(--text-primary)",
          marginBottom: "8px",
        }}
      >
        Competitor benchmarking
      </h1>
      <p style={{ fontSize: "14px", color: "var(--text-muted)", marginBottom: "24px" }}>
        Compare your reputation against other hotels in your market.
      </p>

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "12px",
          marginBottom: "28px",
        }}
      >
        {[
          { label: "Competitors tracked", value: `${trackedCount} / ${MAX_COMPETITORS}` },
          { label: "Total competitor reviews", value: totalCompReviews.toLocaleString() },
          {
            label: "Last synced",
            value: competitors.length === 0 ? "Never" : formatRelative(lastUpdated),
          },
        ].map((s) => (
          <div key={s.label} style={{ ...glass, padding: "18px 20px", borderRadius: "16px" }}>
            <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "6px" }}>{s.label}</div>
            <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-primary)" }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Discovery */}
      <div
        style={{
          background: "rgba(99,102,241,0.05)",
          border: "1px solid rgba(99,102,241,0.12)",
          borderRadius: "20px",
          padding: "28px",
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "16px",
            marginBottom: isSearching || discoveryResults !== null ? "20px" : 0,
          }}
        >
          <div>
            <div style={{ fontSize: "17px", fontWeight: 600, color: "var(--text-primary)" }}>
              Find competitors automatically
            </div>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "4px 0 0", maxWidth: "420px" }}>
              We&apos;ll search for hotels in your area and suggest the best competitors to track
            </p>
          </div>
          <button
            type="button"
            disabled={isSearching}
            style={{
              ...primaryBtn,
              opacity: isSearching ? 0.7 : 1,
              cursor: isSearching ? "not-allowed" : "pointer",
            }}
            onClick={() => void handleFindCompetitors()}
          >
            {isSearching ? "Searching…" : "Search nearby hotels"}
          </button>
        </div>

        {isSearching ? (
          <div>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", textAlign: "center", marginBottom: "16px" }}>
              Searching for hotels near {hotel.city}…
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    ...glass,
                    padding: "16px",
                    borderRadius: "14px",
                    animation: "bm-pulse 1.4s ease-in-out infinite",
                  }}
                >
                  <div
                    style={{
                      height: "14px",
                      width: "45%",
                      borderRadius: "6px",
                      background: "var(--glass-border)",
                      marginBottom: "10px",
                    }}
                  />
                  <div
                    style={{
                      height: "10px",
                      width: "80%",
                      borderRadius: "6px",
                      background: "var(--glass-border)",
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {!isSearching && discoveryResults !== null ? (
          discoveryResults.length === 0 ? (
            <div
              style={{
                background: "rgba(245,158,11,0.08)",
                border: "1px solid rgba(245,158,11,0.2)",
                borderRadius: "16px",
                padding: "20px",
                textAlign: "center",
              }}
            >
              <p style={{ fontWeight: 600, color: "var(--text-primary)", margin: "0 0 8px" }}>
                No hotels found in your area
              </p>
              <p style={{ fontSize: "14px", color: "var(--text-secondary)", margin: 0, lineHeight: 1.55 }}>
                Try adding your city in Settings, or add competitors manually using their URLs below
              </p>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: "12px" }}>
                <div style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)" }}>
                  Found {discoveryResults.length} hotels near you
                </div>
                <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "4px 0 0" }}>
                  Select which ones to track as competitors
                  {searchQueryLabel ? (
                    <span style={{ display: "block", marginTop: "4px", fontSize: "12px" }}>
                      Query: {searchQueryLabel}
                    </span>
                  ) : null}
                </p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {discoveryResults.map((hit) => {
                  const g = normalizeUrl(hit.google_url);
                  const rowKey = g || hit.name;
                  const already = g ? googleUrlsAdded.has(g) : false;
                  const atLimit = trackedCount >= MAX_COMPETITORS;
                  const rating = hit.avg_rating ?? null;
                  return (
                    <div
                      key={rowKey}
                      style={{
                        ...glass,
                        padding: "14px 16px",
                        borderRadius: "14px",
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "12px",
                      }}
                    >
                      <div style={{ flex: "1 1 220px", minWidth: 0 }}>
                        <div style={{ fontSize: "14px", fontWeight: 500, color: "var(--text-primary)" }}>
                          {hit.name}
                        </div>
                        {hit.address ? (
                          <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
                            {hit.address}
                          </div>
                        ) : null}
                        <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "6px" }}>
                          <span style={{ color: "#fbbf24" }}>{starRow(rating)}</span>{" "}
                          {rating != null ? rating.toFixed(1) : "—"} · {hit.total_reviews.toLocaleString()} reviews
                        </div>
                        <span
                          style={{
                            display: "inline-block",
                            marginTop: "6px",
                            fontSize: "11px",
                            padding: "2px 8px",
                            borderRadius: "100px",
                            background: "var(--glass-muted)",
                            color: "var(--text-muted)",
                            border: "1px solid var(--glass-border)",
                          }}
                        >
                          {hit.category}
                        </span>
                      </div>
                      <div>
                        {already ? (
                          <span
                            style={{
                              fontSize: "13px",
                              fontWeight: 600,
                              color: "var(--success)",
                            }}
                          >
                            Added ✓
                          </span>
                        ) : atLimit ? (
                          <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>Limit reached</span>
                        ) : (
                          <button
                            type="button"
                            disabled={addingKey !== null}
                            style={{
                              ...secondaryBtn,
                              padding: "8px 14px",
                              opacity: addingKey ? 0.6 : 1,
                            }}
                            onClick={() => void handleAddDiscovery(hit)}
                          >
                            {addingKey === rowKey ? "Adding…" : "Add"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )
        ) : null}
      </div>

      {/* Manual */}
      <div style={{ marginBottom: "24px" }}>
        <button
          type="button"
          onClick={() => setManualOpen((o) => !o)}
          style={{
            background: "none",
            border: "none",
            fontSize: "13px",
            color: "var(--text-muted)",
            cursor: "pointer",
            padding: 0,
          }}
        >
          Or add manually with URLs {manualOpen ? "↑" : "↓"}
        </button>

        {manualOpen ? (
          <form
            onSubmit={onSaveManual}
            style={{ ...glass, padding: "24px", marginTop: "16px", borderRadius: "16px" }}
          >
            <div style={{ marginBottom: "14px" }}>
              <label htmlFor="bm-name" style={labelStyle}>
                Name
              </label>
              <input
                id="bm-name"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                style={glassInput}
                placeholder="Competitor hotel name"
              />
            </div>
            <div style={{ marginBottom: "14px" }}>
              <label htmlFor="bm-ta" style={labelStyle}>
                TripAdvisor URL
              </label>
              <input
                id="bm-ta"
                type="url"
                value={manualTa}
                onChange={(e) => setManualTa(e.target.value)}
                style={glassInput}
                placeholder="https://..."
              />
            </div>
            <div style={{ marginBottom: "14px" }}>
              <label htmlFor="bm-g" style={labelStyle}>
                Google Maps URL
              </label>
              <input
                id="bm-g"
                type="url"
                value={manualGoogle}
                onChange={(e) => setManualGoogle(e.target.value)}
                style={glassInput}
                placeholder="https://maps.google.com/..."
              />
            </div>
            <div style={{ marginBottom: "18px" }}>
              <label htmlFor="bm-b" style={labelStyle}>
                Booking.com URL
              </label>
              <input
                id="bm-b"
                type="url"
                value={manualBooking}
                onChange={(e) => setManualBooking(e.target.value)}
                style={glassInput}
                placeholder="https://..."
              />
            </div>
            <button
              type="submit"
              disabled={savingManual || trackedCount >= MAX_COMPETITORS}
              style={{
                ...primaryBtn,
                opacity: savingManual || trackedCount >= MAX_COMPETITORS ? 0.65 : 1,
                cursor: savingManual || trackedCount >= MAX_COMPETITORS ? "not-allowed" : "pointer",
              }}
            >
              {savingManual ? "Saving…" : "Save competitor"}
            </button>
          </form>
        ) : null}
      </div>

      {/* Current list */}
      {competitors.length > 0 ? (
        <div>
          <h2 style={{ fontSize: "17px", fontWeight: 600, marginBottom: "12px", color: "var(--text-primary)" }}>
            Your competitors
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {competitors.map((c) => (
              <div key={c.id} style={{ ...glass, padding: "14px 16px", borderRadius: "14px" }}>
                <div style={{ fontWeight: 600, fontSize: "14px", color: "var(--text-primary)" }}>{c.name}</div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
                  {c.google_url ? `Google · ${c.google_url.slice(0, 48)}…` : "No Google URL"}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

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
            @keyframes bm-pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.55; }
            }
          `,
        }}
      />
    </div>
  );
}

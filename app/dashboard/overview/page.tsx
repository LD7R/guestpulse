"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";

type Hotel = {
  id: string;
  tripadvisor_url?: string | null;
  google_url?: string | null;
  booking_url?: string | null;
};

type Stats = {
  totalReviews: number;
  avgRating: number | null;
  needingResponse: number;
  positivePct: number;
};

const pagePad: CSSProperties = { padding: "40px 48px" };

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
  padding: "12px 24px",
  color: "var(--on-primary)",
  fontWeight: 500,
  fontSize: "14px",
  cursor: "pointer",
  transition: "all 0.2s ease",
};

function greetingLabel() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function OverviewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [hasHotel, setHasHotel] = useState(false);
  const [primaryHotel, setPrimaryHotel] = useState<Hotel | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>({
    totalReviews: 0,
    avgRating: null,
    needingResponse: 0,
    positivePct: 0,
  });
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncBreakdown, setSyncBreakdown] = useState<{
    tripadvisor: number;
    google: number;
    booking: number;
  } | null>(null);

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
      typeof primaryHotel.google_url === "string"
        ? primaryHotel.google_url.trim()
        : "";
    const bookingUrl =
      typeof primaryHotel.booking_url === "string"
        ? primaryHotel.booking_url.trim()
        : "";

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
        tripadvisor:
          results.find((r) => r.platform === "tripadvisor")?.count ?? 0,
        google: results.find((r) => r.platform === "google")?.count ?? 0,
        booking: results.find((r) => r.platform === "booking")?.count ?? 0,
      });
      setSyncMessage(
        `Synced ${totalSynced} new reviews across ${platformCount} platforms`,
      );

      if (failed.length > 0) {
        setSyncError(
          `Some platforms failed: ${failed
            .map((f) => `${f.platform}: ${f.error}`)
            .join(" | ")}`,
        );
      }
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    async function load() {
      try {
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
          setStats({
            totalReviews: 0,
            avgRating: null,
            needingResponse: 0,
            positivePct: 0,
          });
          return;
        }

        setHasHotel(true);
        setPrimaryHotel((hotels ?? [])[0] ?? null);

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

        const avgRating =
          numericRatings.length === 0
            ? null
            : numericRatings.reduce((a, b) => a + b, 0) /
              numericRatings.length;

        const { count: needingCount, error: needingError } = await supabase
          .from("reviews")
          .select("id", { count: "exact", head: true })
          .eq("responded", false)
          .in("hotel_id", hotelIds);

        if (needingError) throw needingError;

        const { data: sentimentRows } = await supabase
          .from("reviews")
          .select("sentiment")
          .in("hotel_id", hotelIds);

        let positive = 0;
        const total = totalCount ?? 0;
        for (const row of sentimentRows ?? []) {
          const s = (row.sentiment as string | null)?.toLowerCase() ?? "";
          if (s === "positive") positive += 1;
        }
        const positivePct =
          total === 0 ? 0 : Math.round((positive / total) * 100);

        setStats({
          totalReviews: total,
          avgRating,
          needingResponse: needingCount ?? 0,
          positivePct,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load dashboard.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const statCards = useMemo(() => {
    return [
      { label: "Total reviews", value: stats.totalReviews.toString() },
      {
        label: "Average rating",
        value: stats.avgRating === null ? "—" : stats.avgRating.toFixed(1),
      },
      {
        label: "Needing response",
        value: stats.needingResponse.toString(),
      },
      { label: "Positive %", value: `${stats.positivePct}%` },
    ];
  }, [stats]);

  if (loading) {
    return (
      <div style={pagePad}>
        <div
          style={{
            ...glass,
            padding: "24px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <span
            style={{
              width: "20px",
              height: "20px",
              borderRadius: "50%",
              border: "2px solid var(--spinner-track)",
              borderTopColor: "var(--accent)",
              animation: "ov-spin 0.8s linear infinite",
            }}
          />
          <span style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
            Loading…
          </span>
        </div>
        <style
          dangerouslySetInnerHTML={{
            __html: `@keyframes ov-spin { to { transform: rotate(360deg); } }`,
          }}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div style={pagePad}>
        <div
          style={{
            ...glass,
            padding: "24px",
            color: "var(--error)",
            fontSize: "14px",
          }}
        >
          {error}
        </div>
      </div>
    );
  }

  const labelStyle: CSSProperties = {
    fontSize: "11px",
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "var(--text-label)",
  };

  return (
    <div style={pagePad}>
      <div style={{ marginBottom: "32px" }}>
        <h1
          style={{
            fontSize: "26px",
            fontWeight: 700,
            letterSpacing: "-0.5px",
            color: "var(--text-primary)",
            marginBottom: "4px",
          }}
        >
          {greetingLabel()}
          {userEmail ? (
            <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
              , {userEmail}
            </span>
          ) : null}
        </h1>
        <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
          Here&apos;s your reputation overview
        </p>
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
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "22px" }} aria-hidden>
              ⚠
            </span>
            <p
              style={{
                fontSize: "14px",
                color: "var(--text-primary)",
                lineHeight: 1.6,
              }}
            >
              Add your hotel to start tracking reviews
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/dashboard/settings")}
            style={glassPrimary}
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
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "16px",
              marginBottom: "32px",
            }}
          >
            {statCards.map((card) => (
              <div key={card.label} style={{ ...glass, padding: "24px" }}>
                <div style={labelStyle}>{card.label}</div>
                <div
                  style={{
                    fontSize: "36px",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    margin: "8px 0 4px",
                  }}
                >
                  {card.value}
                </div>
                <div
                  style={{
                    width: "40px",
                    height: "2px",
                    borderRadius: "1px",
                    background: "var(--accent-line)",
                  }}
                />
              </div>
            ))}
          </div>

          <div style={{ marginBottom: "20px" }}>
            <h2
              style={{
                fontSize: "17px",
                fontWeight: 600,
                color: "var(--text-primary)",
                marginBottom: "16px",
              }}
            >
              Quick actions
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: "16px",
              }}
            >
              {[
                {
                  title: "Review inbox",
                  desc: "Read and respond to guest feedback",
                  onClick: () => router.push("/dashboard/reviews"),
                },
                {
                  title: "Hotel settings",
                  desc: "Update property and listing URLs",
                  onClick: () => router.push("/dashboard/settings"),
                },
              ].map((item) => (
                <button
                  key={item.title}
                  type="button"
                  onClick={item.onClick}
                  style={{
                    ...glass,
                    padding: "20px",
                    textAlign: "left",
                    cursor: "pointer",
                    border: "1px solid var(--glass-border)",
                    transition:
                      "transform 0.2s ease, border-color 0.2s ease, background 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.background = "var(--glass-hover-bg)";
                    e.currentTarget.style.borderColor =
                      "var(--glass-hover-border)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.background = "var(--glass-bg)";
                    e.currentTarget.style.borderColor = "var(--glass-border)";
                  }}
                >
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "50%",
                      background: "var(--secondary-btn-bg)",
                      border: "1px solid var(--secondary-btn-border)",
                      marginBottom: "12px",
                    }}
                  />
                  <div
                    style={{
                      fontSize: "15px",
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      marginBottom: "4px",
                    }}
                  >
                    {item.title}
                  </div>
                  <div
                    style={{
                      fontSize: "14px",
                      color: "var(--text-secondary)",
                      lineHeight: 1.6,
                    }}
                  >
                    {item.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div style={{ ...glass, padding: "24px" }}>
            <div
              style={{
                fontSize: "17px",
                fontWeight: 600,
                marginBottom: "12px",
                color: "var(--text-primary)",
              }}
            >
              Sync reviews
            </div>
            <button
              type="button"
              disabled={syncing}
              onClick={handleSyncAllReviews}
              style={{
                ...glassPrimary,
                opacity: syncing ? 0.6 : 1,
                cursor: syncing ? "not-allowed" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
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
                      animation: "ov-spin 0.8s linear infinite",
                    }}
                  />
                  Syncing...
                </>
              ) : (
                "Sync all reviews"
              )}
            </button>
            <style
              dangerouslySetInnerHTML={{
                __html: `@keyframes ov-spin { to { transform: rotate(360deg); } }`,
              }}
            />

            {syncMessage ? (
              <div
                style={{
                  marginTop: "16px",
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
            {syncError ? (
              <div
                style={{
                  marginTop: "12px",
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
            {syncBreakdown ? (
              <p
                style={{
                  marginTop: "12px",
                  fontSize: "13px",
                  color: "var(--text-secondary)",
                }}
              >
                <span style={{ color: "var(--text-label)" }}>
                  Breakdown —{" "}
                </span>
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
                {" · "}
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
                {" · "}
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
          </div>
        </>
      )}
    </div>
  );
}

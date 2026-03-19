"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Hotel = { id: string };

type Stats = {
  totalReviews: number;
  avgRating: number | null;
  needingResponse: number;
};

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [hasHotel, setHasHotel] = useState(false);
  const [stats, setStats] = useState<Stats>({
    totalReviews: 0,
    avgRating: null,
    needingResponse: 0,
  });

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

        const { data: hotels, error: hotelsError } = await supabase
          .from("hotels")
          .select("id")
          .eq("user_id", user.id);

        if (hotelsError) throw hotelsError;

        const hotelIds = (hotels ?? []).map((h: Hotel) => h.id);
        if (hotelIds.length === 0) {
          setHasHotel(false);
          setStats({ totalReviews: 0, avgRating: null, needingResponse: 0 });
          return;
        }

        setHasHotel(true);

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

        setStats({
          totalReviews: totalCount ?? 0,
          avgRating,
          needingResponse: needingCount ?? 0,
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
      { label: "Total Reviews", value: stats.totalReviews.toString() },
      {
        label: "Average Rating",
        value: stats.avgRating === null ? "—" : stats.avgRating.toFixed(1),
      },
      {
        label: "Needing Response",
        value: stats.needingResponse.toString(),
      },
    ];
  }, [stats]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-[#222222] bg-[#111111] p-6">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-[#222222] border-t-[#6366f1]" />
          <span className="text-sm text-[#888888]">Loading…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-[#222222] bg-[#111111] p-6">
        <div className="text-sm text-red-400">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#222222] bg-[#111111] p-6">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Welcome to GuestPulse
        </h1>
      </div>

      {!hasHotel ? (
        <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-6">
          <div className="text-sm font-medium text-yellow-900">
            No hotel added yet — go to Settings to add your hotel
          </div>
          <div className="mt-3">
            <button
              type="button"
              onClick={() => router.push("/dashboard/settings")}
              className="inline-flex items-center justify-center rounded-[8px] bg-[#6366f1] px-[20px] py-[10px] text-sm font-medium text-white shadow-sm transition hover:bg-[#4f46e5]"
            >
              Hotel settings
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {statCards.map((card) => (
              <div
                key={card.label}
                className="rounded-[12px] border border-[#222222] bg-[#111111] p-6"
              >
                <div className="text-xs font-medium uppercase tracking-wide text-[#888888]">
                  {card.label}
                </div>
                <div className="mt-2 text-3xl font-semibold text-white">
                  {card.value}
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-[#222222] bg-[#111111] p-6">
            <div className="text-sm font-semibold text-white">
              Quick actions
            </div>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => router.push("/dashboard/reviews")}
                className="inline-flex items-center justify-center rounded-[8px] bg-[#6366f1] px-[20px] py-[10px] text-sm font-medium text-white shadow-sm transition hover:bg-[#4f46e5]"
              >
                View review inbox
              </button>
              <button
                type="button"
                onClick={() => router.push("/dashboard/settings")}
                className="inline-flex items-center justify-center rounded-[8px] bg-[#6366f1] px-[20px] py-[10px] text-sm font-medium text-white shadow-sm transition hover:bg-[#4f46e5]"
              >
                Hotel settings
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}


"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

type Stats = {
  totalReviews: number;
  avgRating: number | null;
  needingResponse: number;
};

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [userEmail, setUserEmail] = useState<string>("");
  const [hasHotel, setHasHotel] = useState<boolean | null>(null);

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

        if (userError || !user) {
          router.replace("/login?redirectTo=/dashboard");
          return;
        }

        setUserEmail(user.email ?? "");

        const { data: hotels, error: hotelsError } = await supabase
          .from("hotels")
          .select("id")
          .eq("user_id", user.id);

        if (hotelsError) throw hotelsError;

        const hotelIds = (hotels ?? []).map((h: { id: string }) => h.id);

        if (hotelIds.length === 0) {
          setHasHotel(false);
          setStats({ totalReviews: 0, avgRating: null, needingResponse: 0 });
          setLoading(false);
          return;
        }

        setHasHotel(true);

        const { count: totalCount, error: totalError } = await supabase
          .from("reviews")
          .select("id", { count: "exact", head: true })
          .in("hotel_id", hotelIds);

        if (totalError) throw totalError;

        // Average rating (client-side calculation)
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
            : numericRatings.reduce((a, b) => a + b, 0) / numericRatings.length;

        const { count: needingCount, error: needingError } = await supabase
          .from("reviews")
          .select("id", { count: "exact", head: true })
          .eq("responded", false)
          .in("hotel_id", hotelIds);

        if (needingError) throw needingError;

        setStats({
          totalReviews: totalCount ?? 0,
          avgRating: avgRating ?? null,
          needingResponse: needingCount ?? 0,
        });
        setLoading(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load dashboard.");
        setLoading(false);
      }
    }

    load();
  }, [router]);

  const cards = useMemo(() => {
    return [
      {
        label: "Total reviews",
        value: stats.totalReviews,
      },
      {
        label: "Average rating",
        value: stats.avgRating === null ? "—" : stats.avgRating.toFixed(2),
      },
      {
        label: "Needing response",
        value: stats.needingResponse,
      },
    ];
  }, [stats]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-[#222222] bg-[#111111] p-6">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-[#222222] border-t-[#6366f1]" />
          <span className="text-sm text-[#888888]">Loading dashboard…</span>
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
          Good morning, {userEmail}
        </h1>
        <p className="mt-1 text-sm text-[#888888]">
          Track reviews, respond to feedback, and improve guest experience.
        </p>
      </div>

      {hasHotel === false ? (
        <div className="rounded-2xl border border-[#222222] bg-[#111111] p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-white">
                Get started — add your hotel details to start tracking reviews
              </div>
              <div className="mt-1 text-sm text-[#888888]">
                We’ll sync TripAdvisor reviews and route them to your inbox.
              </div>
            </div>
            <Link
              href="/dashboard/settings"
              className="inline-flex items-center justify-center rounded-[8px] bg-[#6366f1] px-[20px] py-[10px] text-sm font-medium text-white shadow-sm transition hover:bg-[#4f46e5]"
            >
              Add hotel details
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {cards.map((card) => (
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
      )}

      <div className="rounded-2xl border border-[#222222] bg-[#111111] p-6">
        <div className="text-sm font-semibold text-white">Quick actions</div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            href="/dashboard/reviews"
            className="inline-flex items-center justify-center rounded-[8px] bg-[#6366f1] px-[20px] py-[10px] text-sm font-medium text-white shadow-sm transition hover:bg-[#4f46e5]"
          >
            Go to review inbox
          </Link>
          <Link
            href="/dashboard/settings"
            className="inline-flex items-center justify-center rounded-[8px] border border-[#222222] bg-[#111111] px-[20px] py-[10px] text-sm font-medium text-white shadow-sm transition hover:bg-[#0f0f0f]"
          >
            Add/edit hotel
          </Link>
        </div>
      </div>
    </div>
  );
}



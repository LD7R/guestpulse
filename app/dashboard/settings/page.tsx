"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useEffect, useState, useTransition } from "react";

type HotelRow = {
  id: string;
  name?: string | null;
  tripadvisor_url?: string | null;
  google_url?: string | null;
  booking_url?: string | null;
};

export default function HotelSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [hotel, setHotel] = useState<HotelRow | null>(null);

  const [name, setName] = useState("");
  const [tripadvisorUrl, setTripadvisorUrl] = useState("");
  const [googleUrl, setGoogleUrl] = useState("");
  const [bookingUrl, setBookingUrl] = useState("");

  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [isSaving, startTransition] = useTransition();

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
          setError(userError?.message ?? "You must be signed in.");
          return;
        }

        const { data, error: hotelError } = await supabase
          .from("hotels")
          .select("id,name,tripadvisor_url,google_url,booking_url")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();

        if (hotelError) throw hotelError;

        const nextHotel = (data ?? null) as HotelRow | null;
        setHotel(nextHotel);

        if (nextHotel) {
          setName(nextHotel.name ?? "");
          setTripadvisorUrl(nextHotel.tripadvisor_url ?? "");
          setGoogleUrl(nextHotel.google_url ?? "");
          setBookingUrl(nextHotel.booking_url ?? "");
        } else {
          setName("");
          setTripadvisorUrl("");
          setGoogleUrl("");
          setBookingUrl("");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load hotel settings.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  async function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaveError(null);
    setSaveSuccess(null);

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) {
      setSaveError("Supabase is not configured in the environment.");
      return;
    }

    const supabase = createBrowserClient(url, anonKey);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setSaveError(userError?.message ?? "You must be signed in.");
      return;
    }

    const payload = {
      name: name.trim(),
      tripadvisor_url: tripadvisorUrl.trim() || null,
      google_url: googleUrl.trim() || null,
      booking_url: bookingUrl.trim() || null,
    };

    if (!payload.name) {
      setSaveError("Hotel name is required.");
      return;
    }

    startTransition(async () => {
      try {
        if (hotel) {
          const { error: updateError } = await supabase
            .from("hotels")
            .update(payload)
            .eq("id", hotel.id);
          if (updateError) throw updateError;
        } else {
          const { error: insertError } = await supabase.from("hotels").insert({
            ...payload,
            user_id: user.id,
          });
          if (insertError) throw insertError;
        }

        setSaveSuccess("Saved hotel settings successfully.");
        // Refresh the local hotel row after saving
        const { data: refreshed, error: refreshError } = await supabase
          .from("hotels")
          .select("id,name,tripadvisor_url,google_url,booking_url")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();

        if (refreshError) throw refreshError;

        setHotel((refreshed ?? null) as HotelRow | null);
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : "Failed to save hotel settings.");
      }
    });
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-[#222222] bg-[#111111] p-6">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-[#222222] border-t-[#6366f1]" />
          <span className="text-sm text-[#888888]">Loading settings…</span>
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
          Hotel settings
        </h1>
        <p className="mt-1 text-sm text-[#888888]">
          Update your hotel details to enable review scraping.
        </p>
      </div>

      <form onSubmit={onSave} className="rounded-2xl border border-[#222222] bg-[#111111] p-6">
        <div className="space-y-5">
          {!hotel ? (
            <div className="rounded-xl border border-[#222222] bg-[#0f0f0f] p-4">
              <div className="text-sm font-medium text-white">
                Get started
              </div>
              <div className="mt-1 text-sm text-[#888888]">
                Add your hotel details to start tracking reviews.
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#888888]">
                Hotel name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11 w-full rounded-[8px] border border-[#222222] bg-[#111111] px-3 text-sm text-white outline-none focus:border-[#6366f1]"
                placeholder="My Boutique Hotel"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#888888]">
                TripAdvisor URL
              </label>
              <input
                type="url"
                value={tripadvisorUrl}
                onChange={(e) => setTripadvisorUrl(e.target.value)}
                className="h-11 w-full rounded-[8px] border border-[#222222] bg-[#111111] px-3 text-sm text-white outline-none focus:border-[#6366f1]"
                placeholder="https://tripadvisor.com/hotel/..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#888888]">
                Google URL
              </label>
              <input
                type="url"
                value={googleUrl}
                onChange={(e) => setGoogleUrl(e.target.value)}
                className="h-11 w-full rounded-[8px] border border-[#222222] bg-[#111111] px-3 text-sm text-white outline-none focus:border-[#6366f1]"
                placeholder="https://maps.google.com/..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#888888]">
                Booking.com URL
              </label>
              <input
                type="url"
                value={bookingUrl}
                onChange={(e) => setBookingUrl(e.target.value)}
                className="h-11 w-full rounded-[8px] border border-[#222222] bg-[#111111] px-3 text-sm text-white outline-none focus:border-[#6366f1]"
                placeholder="https://booking.com/hotel/..."
              />
            </div>
          </div>

          {saveError ? (
            <div className="rounded-xl border border-red-900/50 bg-red-900/20 px-3 py-2 text-sm text-red-300">
              {saveError}
            </div>
          ) : null}

          {saveSuccess ? (
            <div className="rounded-xl border border-emerald-900/50 bg-emerald-900/20 px-3 py-2 text-sm text-emerald-200">
              {saveSuccess}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center justify-center rounded-[8px] bg-[#6366f1] px-[20px] py-[10px] text-sm font-medium text-white shadow-sm transition hover:bg-[#4f46e5] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Saving…" : hotel ? "Save changes" : "Create hotel"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}


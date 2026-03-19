"use client";

import { createBrowserClient } from "@supabase/ssr";
import { FormEvent, useEffect, useState } from "react";

type Hotel = {
  id: string;
  user_id: string;
  name: string | null;
  tripadvisor_url: string | null;
  google_url: string | null;
  booking_url: string | null;
};

export default function HotelSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [hotel, setHotel] = useState<Hotel | null>(null);

  const [name, setName] = useState("");
  const [tripadvisorUrl, setTripadvisorUrl] = useState("");
  const [googleUrl, setGoogleUrl] = useState("");
  const [bookingUrl, setBookingUrl] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);

      try {
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

        const { data, error: hotelError } = await supabase
          .from("hotels")
          .select(
            "id,user_id,name,tripadvisor_url,google_url,booking_url",
          )
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();

        if (hotelError) throw hotelError;

        setHotel((data as Hotel | null) ?? null);

        if (data) {
          setName(data.name ?? "");
          setTripadvisorUrl(data.tripadvisor_url ?? "");
          setGoogleUrl(data.google_url ?? "");
          setBookingUrl(data.booking_url ?? "");
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

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
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

      const payload = {
        user_id: user.id,
        name: name.trim(),
        tripadvisor_url: tripadvisorUrl.trim() || null,
        google_url: googleUrl.trim() || null,
        booking_url: bookingUrl.trim() || null,
      };

      if (!payload.name) {
        throw new Error("Hotel name is required.");
      }

      const fields = {
        name: payload.name,
        tripadvisor_url: payload.tripadvisor_url,
        google_url: payload.google_url,
        booking_url: payload.booking_url,
      };

      // Check if hotel already exists for this user (RLS-safe).
      const {
        data: existing,
        error: existingError,
      } = await supabase
        .from("hotels")
        .select("id,user_id,name,tripadvisor_url,google_url,booking_url")
        .eq("user_id", user.id)
        .single();

      if (existingError) {
        // PGRST116 = "JSON object requested, multiple (or no) rows returned"
        if (existingError.code !== "PGRST116") {
          console.error("Hotel existence check failed:", existingError);
          throw existingError;
        }
      }

      if (existing) {
        const { error: updateError } = await supabase
          .from("hotels")
          .update(fields)
          .eq("user_id", user.id);

        if (updateError) {
          console.error("Hotel update failed:", updateError);
          throw updateError;
        }
      } else {
        const { error: insertError } = await supabase
          .from("hotels")
          .insert({ ...fields, user_id: user.id });

        if (insertError) {
          console.error("Hotel insert failed:", insertError);
          throw insertError;
        }
      }

      setSaveSuccess("Hotel saved successfully.");

      // Refresh the hotel row so the button state is correct.
      const { data, error: refreshError } = await supabase
        .from("hotels")
        .select(
          "id,user_id,name,tripadvisor_url,google_url,booking_url",
        )
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (refreshError) throw refreshError;
      setHotel((data as Hotel | null) ?? null);

      if (data) {
        setName(data.name ?? "");
        setTripadvisorUrl(data.tripadvisor_url ?? "");
        setGoogleUrl(data.google_url ?? "");
        setBookingUrl(data.booking_url ?? "");
      }
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to save hotel.");
    } finally {
      setSaving(false);
    }
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
          Manage the hotel details used for review scraping.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="rounded-2xl border border-[#222222] bg-[#111111] p-6"
      >
        <div className="space-y-5">
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
                className="h-11 w-full rounded-[8px] border border-[#222222] bg-[#0f0f0f] px-3 text-sm text-white outline-none focus:border-[#6366f1]"
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
                className="h-11 w-full rounded-[8px] border border-[#222222] bg-[#0f0f0f] px-3 text-sm text-white outline-none focus:border-[#6366f1]"
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
                className="h-11 w-full rounded-[8px] border border-[#222222] bg-[#0f0f0f] px-3 text-sm text-white outline-none focus:border-[#6366f1]"
                placeholder="https://maps.google.com/?cid=... or Google Maps URL"
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
                className="h-11 w-full rounded-[8px] border border-[#222222] bg-[#0f0f0f] px-3 text-sm text-white outline-none focus:border-[#6366f1]"
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
              disabled={saving}
              className="inline-flex items-center justify-center rounded-[8px] bg-[#6366f1] px-[20px] py-[10px] text-sm font-medium text-white shadow-sm transition hover:bg-[#4f46e5] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (hotel ? "Updating…" : "Creating…") : hotel ? "Update" : "Create hotel"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}


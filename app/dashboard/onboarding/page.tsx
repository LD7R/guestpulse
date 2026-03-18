"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import { createBrowserClient } from "@supabase/ssr";

export default function HotelOnboardingPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [tripadvisorUrl, setTripadvisorUrl] = useState("");
  const [googleUrl, setGoogleUrl] = useState("");
  const [bookingUrl, setBookingUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      setError("Supabase is not configured in the environment.");
      return;
    }

    const supabase = createBrowserClient(url, anonKey);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError(userError?.message ?? "You must be signed in to continue.");
      return;
    }

    const { error: insertError } = await supabase.from("hotels").insert({
      name,
      tripadvisor_url: tripadvisorUrl || null,
      google_url: googleUrl || null,
      booking_url: bookingUrl || null,
      user_id: user.id,
    });

    if (insertError) {
      setError(insertError.message);
      return;
    }

    startTransition(() => {
      router.replace("/dashboard");
      router.refresh();
    });
  }

  const isSubmitting = isPending;

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-16 dark:bg-black">
      <div className="w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Hotel onboarding
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Add your hotel details to get started.
          </p>
        </div>

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <div className="space-y-2">
            <label
              htmlFor="name"
              className="text-sm font-medium text-zinc-900 dark:text-zinc-100"
            >
              Hotel name
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 shadow-sm outline-none ring-0 placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-zinc-200 dark:focus:ring-zinc-200/10"
              placeholder="My Boutique Hotel"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="tripadvisor"
              className="text-sm font-medium text-zinc-900 dark:text-zinc-100"
            >
              TripAdvisor URL
            </label>
            <input
              id="tripadvisor"
              type="url"
              value={tripadvisorUrl}
              onChange={(e) => setTripadvisorUrl(e.target.value)}
              className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 shadow-sm outline-none ring-0 placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-zinc-200 dark:focus:ring-zinc-200/10"
              placeholder="https://tripadvisor.com/hotel/..."
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="google"
              className="text-sm font-medium text-zinc-900 dark:text-zinc-100"
            >
              Google Maps URL
            </label>
            <input
              id="google"
              type="url"
              value={googleUrl}
              onChange={(e) => setGoogleUrl(e.target.value)}
              className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 shadow-sm outline-none ring-0 placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-zinc-200 dark:focus:ring-zinc-200/10"
              placeholder="https://maps.google.com/..."
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="booking"
              className="text-sm font-medium text-zinc-900 dark:text-zinc-100"
            >
              Booking.com URL
            </label>
            <input
              id="booking"
              type="url"
              value={bookingUrl}
              onChange={(e) => setBookingUrl(e.target.value)}
              className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 shadow-sm outline-none ring-0 placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-zinc-200 dark:focus:ring-zinc-200/10"
              placeholder="https://booking.com/hotel/..."
            />
          </div>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-zinc-900 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {isSubmitting ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-50" />
                Saving…
              </span>
            ) : (
              "Save hotel"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}


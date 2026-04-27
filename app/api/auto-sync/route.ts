import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const maxDuration = 300;

type HotelRow = {
  id: string;
  tripadvisor_url: string | null;
  google_url: string | null;
  booking_url: string | null;
  trip_url: string | null;
  expedia_url: string | null;
  yelp_url: string | null;
};

export async function GET(request: NextRequest) {
  // Always require cron secret — no fallback when env var is missing
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // Fetch all hotels that have at least one review URL
  const { data: hotels, error } = await supabase
    .from("hotels")
    .select("id, tripadvisor_url, google_url, booking_url, trip_url, expedia_url, yelp_url")
    .or("tripadvisor_url.not.is.null,google_url.not.is.null,booking_url.not.is.null,trip_url.not.is.null,expedia_url.not.is.null,yelp_url.not.is.null");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (hotels ?? []) as HotelRow[];
  let syncedHotels = 0;
  let totalReviews = 0;

  for (const hotel of rows) {
    const platforms: Array<{ platform: "tripadvisor" | "google" | "booking" | "trip" | "expedia" | "yelp"; url: string }> = [];

    if (hotel.tripadvisor_url) platforms.push({ platform: "tripadvisor", url: hotel.tripadvisor_url });
    if (hotel.google_url) platforms.push({ platform: "google", url: hotel.google_url });
    if (hotel.booking_url) platforms.push({ platform: "booking", url: hotel.booking_url });
    if (hotel.trip_url) platforms.push({ platform: "trip", url: hotel.trip_url });
    if (hotel.expedia_url) platforms.push({ platform: "expedia", url: hotel.expedia_url });
    if (hotel.yelp_url) platforms.push({ platform: "yelp", url: hotel.yelp_url });

    if (platforms.length === 0) continue;

    for (const { platform, url } of platforms) {
      try {
        const res = await fetch(`${appUrl}/api/scrape-reviews`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Internal-Token": cronSecret,
          },
          body: JSON.stringify({
            hotel_id: hotel.id,
            url,
            platform,
            sync_type: "incremental",
          }),
        });
        const json = (await res.json()) as { success?: boolean; count?: number };
        if (json.success) {
          totalReviews += json.count ?? 0;
        }
      } catch (err) {
        console.error(`[auto-sync] Failed syncing hotel ${hotel.id} platform ${platform}:`, err);
      }
    }

    syncedHotels += 1;
  }

  return NextResponse.json({
    success: true,
    syncedHotels,
    totalReviews,
  });
}

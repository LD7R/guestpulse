import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const { hotel_id } = (await request.json()) as { hotel_id?: string };

    if (!hotel_id) {
      return NextResponse.json({ error: "hotel_id is required" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );

    const { data: hotel } = await supabase
      .from("hotels")
      .select("id, tripadvisor_url, google_url, booking_url, trip_url, expedia_url, yelp_url")
      .eq("id", hotel_id)
      .single();

    if (!hotel) {
      return NextResponse.json({ error: "Hotel not found" }, { status: 404 });
    }

    const h = hotel as {
      id: string;
      tripadvisor_url?: string | null;
      google_url?: string | null;
      booking_url?: string | null;
      trip_url?: string | null;
      expedia_url?: string | null;
      yelp_url?: string | null;
    };

    const platformUrls: Record<string, string | null> = {
      tripadvisor: h.tripadvisor_url ? h.tripadvisor_url + "#REVIEWS" : null,
      google: h.google_url ? h.google_url + "&hl=en" : null,
      booking: h.booking_url
        ? h.booking_url.includes("#")
          ? h.booking_url
          : h.booking_url + "#blockdisplay4"
        : null,
      trip: h.trip_url ?? null,
      expedia: h.expedia_url ?? null,
      yelp: h.yelp_url ?? null,
    };

    const results: Record<string, number> = {};

    for (const [platform, fallbackUrl] of Object.entries(platformUrls)) {
      if (!fallbackUrl) continue;

      const { data, error } = await supabase
        .from("reviews")
        .update({ review_url: fallbackUrl })
        .eq("hotel_id", hotel_id)
        .eq("platform", platform)
        .is("review_url", null)
        .select("id");

      if (!error) {
        results[platform] = data?.length ?? 0;
      }
    }

    return NextResponse.json({ success: true, backfilled: results });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

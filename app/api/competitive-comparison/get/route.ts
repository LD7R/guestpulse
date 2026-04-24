/**
 * GET /api/competitive-comparison/get?hotel_id=<uuid>
 * Fetches the saved competitive analysis for a hotel.
 * Returns { exists: false } if none or all have expired.
 * Cleans up expired rows on each call.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hotelId = searchParams.get("hotel_id");

    if (!hotelId) {
      return NextResponse.json({ error: "hotel_id required" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );

    const now = new Date().toISOString();

    // Clean up expired analyses
    await supabase.from("competitive_analyses").delete().lt("expires_at", now);

    // Fetch current non-expired analysis
    const { data, error } = await supabase
      .from("competitive_analyses")
      .select("analysis, generated_at, expires_at")
      .eq("hotel_id", hotelId)
      .gt("expires_at", now)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ exists: false });
    }

    const row = data as { analysis: unknown; generated_at: string; expires_at: string };

    return NextResponse.json({
      exists: true,
      comparison: row.analysis,
      generated_at: row.generated_at,
      expires_at: row.expires_at,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

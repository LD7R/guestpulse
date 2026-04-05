import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase";
import { extractCoordsFromGoogleMapsUrl } from "@/lib/extract-google-maps-coords";

export const runtime = "nodejs";
export const maxDuration = 300;

const APIFY_BASE_URL = "https://api.apify.com/v2";
const GOOGLE_ACTOR = "Xb8osYTtOjlsgI6k9";
const TERMINAL = new Set(["SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT", "TIMED_OUT"]);

type ApifyRun = { id?: string; status?: string; defaultDatasetId?: string };

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parsePlaceFromItems(items: unknown[]): {
  avg_rating: number | null;
  total_reviews: number;
  address: string | null;
} | null {
  for (const raw of items) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    const score = item.totalScore;
    const count = item.reviewsCount;
    if (typeof score === "number" || typeof count === "number") {
      return {
        avg_rating: typeof score === "number" ? score : null,
        total_reviews: typeof count === "number" ? count : 0,
        address: typeof item.address === "string" ? item.address : null,
      };
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { competitor_id?: string };
    const competitorId = body.competitor_id?.trim();
    if (!competitorId) {
      return NextResponse.json({ success: false, error: "competitor_id is required" }, { status: 400 });
    }

    const apifyToken = process.env.APIFY_API_TOKEN;
    if (!apifyToken) {
      return NextResponse.json(
        { success: false, error: "APIFY_API_TOKEN is not configured" },
        { status: 500 },
      );
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { data: comp, error: fetchErr } = await supabase
      .from("competitors")
      .select("id, google_url, name")
      .eq("id", competitorId)
      .maybeSingle();

    if (fetchErr) {
      return NextResponse.json({ success: false, error: fetchErr.message }, { status: 500 });
    }
    if (!comp) {
      return NextResponse.json({ success: false, error: "Competitor not found" }, { status: 404 });
    }

    const googleUrl = typeof comp.google_url === "string" ? comp.google_url.trim() : "";
    if (!googleUrl) {
      return NextResponse.json(
        { success: false, error: "Add a Google Maps URL for this competitor to sync stats." },
        { status: 400 },
      );
    }

    const startRunRes = await fetch(
      `${APIFY_BASE_URL}/acts/${encodeURIComponent(GOOGLE_ACTOR)}/runs`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apifyToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startUrls: [{ url: googleUrl }],
          maxReviews: 0,
          language: "en",
          personalData: true,
        }),
      },
    );

    if (!startRunRes.ok) {
      const text = await startRunRes.text();
      return NextResponse.json(
        { success: false, error: "Failed to start Apify run", details: text },
        { status: 502 },
      );
    }

    const startJson = (await startRunRes.json()) as { data?: ApifyRun };
    const run = startJson.data;
    if (!run?.id) {
      return NextResponse.json({ success: false, error: "Apify did not return a run id" }, { status: 502 });
    }

    let status = run.status ?? "READY";
    let datasetId = run.defaultDatasetId;
    const pollStarted = Date.now();
    const maxPollMs = 4 * 60 * 1000;

    while (!TERMINAL.has(status)) {
      if (Date.now() - pollStarted > maxPollMs) {
        return NextResponse.json({ success: false, error: "Sync timed out" }, { status: 504 });
      }
      await sleep(3000);
      const pollRes = await fetch(`${APIFY_BASE_URL}/actor-runs/${encodeURIComponent(run.id)}`, {
        headers: { Authorization: `Bearer ${apifyToken}` },
      });
      const pollJson = (await pollRes.json()) as { data?: ApifyRun };
      status = pollJson.data?.status ?? status;
      datasetId = pollJson.data?.defaultDatasetId ?? datasetId;
    }

    if (status !== "SUCCEEDED") {
      return NextResponse.json(
        { success: false, error: `Apify run did not succeed (${status})` },
        { status: 502 },
      );
    }

    if (!datasetId) {
      return NextResponse.json({ success: false, error: "No dataset from Apify" }, { status: 502 });
    }

    const itemsRes = await fetch(
      `${APIFY_BASE_URL}/datasets/${encodeURIComponent(datasetId)}/items?clean=true`,
      { headers: { Authorization: `Bearer ${apifyToken}` } },
    );
    const items = (await itemsRes.json()) as unknown[];
    const list = Array.isArray(items) ? items : [];

    let place = parsePlaceFromItems(list);

    if (!place && list.length > 0) {
      const startRun2 = await fetch(`${APIFY_BASE_URL}/acts/${encodeURIComponent(GOOGLE_ACTOR)}/runs`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apifyToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startUrls: [{ url: googleUrl }],
          maxReviews: 15,
          language: "en",
          personalData: true,
        }),
      });
      const j2 = (await startRun2.json()) as { data?: ApifyRun };
      const run2 = j2.data;
      if (run2?.id) {
        let st2 = run2.status ?? "READY";
        let ds2 = run2.defaultDatasetId;
        const t0 = Date.now();
        while (!TERMINAL.has(st2)) {
          if (Date.now() - t0 > maxPollMs) break;
          await sleep(3000);
          const pr = await fetch(`${APIFY_BASE_URL}/actor-runs/${encodeURIComponent(run2.id)}`, {
            headers: { Authorization: `Bearer ${apifyToken}` },
          });
          const pj = (await pr.json()) as { data?: ApifyRun };
          st2 = pj.data?.status ?? st2;
          ds2 = pj.data?.defaultDatasetId ?? ds2;
        }
        if (st2 === "SUCCEEDED" && ds2) {
          const ir = await fetch(
            `${APIFY_BASE_URL}/datasets/${encodeURIComponent(ds2)}/items?clean=true`,
            { headers: { Authorization: `Bearer ${apifyToken}` } },
          );
          const items2 = (await ir.json()) as unknown[];
          const list2 = Array.isArray(items2) ? items2 : [];
          place = parsePlaceFromItems(list2);
        }
      }
    }

    if (!place) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Could not read rating or review count from Google Maps. Check the URL and try again.",
        },
        { status: 502 },
      );
    }

    const coords = extractCoordsFromGoogleMapsUrl(googleUrl);
    const nowIso = new Date().toISOString();

    const updatePayload: Record<string, unknown> = {
      avg_rating: place.avg_rating,
      total_reviews: place.total_reviews,
      updated_at: nowIso,
      last_synced_at: nowIso,
    };
    if (place.address) updatePayload.address = place.address;
    if (coords) {
      updatePayload.latitude = coords.latitude;
      updatePayload.longitude = coords.longitude;
    }

    const { error: upErr } = await supabase
      .from("competitors")
      .update(updatePayload)
      .eq("id", competitorId);

    if (upErr) {
      return NextResponse.json({ success: false, error: upErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      avg_rating: place.avg_rating,
      total_reviews: place.total_reviews,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

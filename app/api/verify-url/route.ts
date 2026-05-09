import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const URL_PATTERNS: Record<string, RegExp> = {
  tripadvisor: /tripadvisor\.com\/Hotel_Review/i,
  google: /google\.com\/maps/i,
  booking: /booking\.com\/hotel\//i,
  trip: /trip\.com\/hotels\//i,
  expedia: /expedia\.com\/.*Hotels/i,
  yelp: /yelp\.com\/biz\//i,
};

export async function POST(request: NextRequest) {
  const { url, platform } = (await request.json().catch(() => ({}))) as {
    url?: string;
    platform?: string;
  };

  if (!url || !platform) {
    return NextResponse.json(
      { verified: false, error: "url and platform required" },
      { status: 400 },
    );
  }

  const pattern = URL_PATTERNS[platform];
  if (pattern && !pattern.test(url)) {
    return NextResponse.json({
      verified: false,
      error: `Invalid ${platform} URL format`,
    });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; GuestPulse/1.0)" },
      redirect: "follow",
    });

    clearTimeout(timeout);

    return NextResponse.json({
      verified: res.ok || res.status === 405 || res.status === 403,
      status: res.status,
    });
  } catch {
    return NextResponse.json({
      verified: false,
      error: "URL did not respond",
    });
  }
}

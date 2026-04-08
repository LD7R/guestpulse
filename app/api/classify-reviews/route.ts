/**
 * Run in Supabase to reset classifications:
 * update public.reviews
 * set sentiment = null, complaint_topic = null,
 *    topic_type = null
 * where review_text is not null
 * and review_text != ''
 * and review_text != '—';
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const maxDuration = 60;

type ReviewRow = {
  id: string;
  review_text: string | null;
  rating: number | null;
  platform: string | null;
};

const VALID_SENTIMENTS = ["positive", "neutral", "negative"];
const VALID_TOPICS: (string | null)[] = [
  "cleanliness",
  "smell",
  "noise",
  "wifi",
  "breakfast",
  "staff",
  "location",
  "value",
  "room",
  "checkin",
  "bathroom",
  "food",
  "parking",
  "pool",
  "amenities",
  "service",
  "mold",
  "temperature",
  "view",
  null,
];
const VALID_LANGUAGES = [
  "en", "nl", "id", "de", "fr", "es", "it", "pt",
  "ja", "zh", "ar", "ru", "ko", "tr", "pl", "other",
];

export async function POST(request: NextRequest) {
  try {
    const { hotel_id } = (await request.json()) as { hotel_id?: string };

    if (!hotel_id) {
      return NextResponse.json(
        { success: false, error: "hotel_id is required" },
        { status: 400 },
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { success: false, error: "Supabase environment variables are not configured" },
        { status: 500 },
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "ANTHROPIC_API_KEY is not configured" },
        { status: 500 },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: reviews, error: fetchError } = await supabase
      .from("reviews")
      .select("id, review_text, rating, platform")
      .eq("hotel_id", hotel_id)
      .or("sentiment.is.null,complaint_topic.is.null,topic_type.is.null")
      .limit(50);

    if (fetchError) {
      return NextResponse.json(
        { success: false, error: fetchError.message },
        { status: 500 },
      );
    }

    if (!reviews || reviews.length === 0) {
      return NextResponse.json({ success: true, classified: 0, total: 0 });
    }

    const rows = reviews as ReviewRow[];

    let classified = 0;
    const batchSize = 10;

    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (review) => {
          try {
            const response = await fetch("https://api.anthropic.com/v1/messages", {
              method: "POST",
              headers: {
                "x-api-key": apiKey,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
              },
              body: JSON.stringify({
                model: "claude-haiku-4-5-20251001",
                max_tokens: 200,
                messages: [
                  {
                    role: "user",
                    content: `You are a hotel review analyst. Analyze this hotel review and classify it regardless of what language it is written in.

IMPORTANT: The review may be in any language including English, Dutch, Indonesian, German, French, Spanish, Italian, Portuguese, Japanese, Chinese, Arabic, etc. Understand the meaning regardless of language.

SENTIMENT RULES (based primarily on star rating):
- 1 star = negative ALWAYS
- 2 stars = negative ALWAYS
- 3 stars = neutral
- 4 stars = positive (unless text has serious complaints)
- 5 stars = positive ALWAYS

TOPIC - identify the most prominent issue or praise.
Pick ONE from this list:
cleanliness, smell, noise, wifi, breakfast, staff, location, value, room, checkin, bathroom, food, parking, pool, amenities, service, mold, temperature, view, null

MULTILINGUAL EXAMPLES:
Dutch: "De kamer rook naar sigaretten en was vies"
→ topic: "smell", sentiment: "negative"

Dutch: "Het personeel was onvriendelijk en de kamer stonk"
→ topic: "smell", sentiment: "negative"

Indonesian: "Kamar sangat kotor dan berbau tidak enak"
→ topic: "cleanliness", sentiment: "negative"

German: "Das Zimmer war laut und der WLAN funktionierte nicht"
→ topic: "noise", sentiment: "negative"

French: "Le petit déjeuner était excellent, personnel très sympa"
→ topic: "breakfast", sentiment: "positive"

Spanish: "Mucho ruido por la noche, no pudimos dormir"
→ topic: "noise", sentiment: "negative"

TOPIC TYPE:
- "improvement": guest is complaining about this aspect
- "strength": guest is praising this aspect
- null: if topic is null

LANGUAGE DETECTION:
Detect the language and return ISO 639-1 code:
en=English, nl=Dutch, id=Indonesian, de=German,
fr=French, es=Spanish, it=Italian, pt=Portuguese,
ja=Japanese, zh=Chinese, ar=Arabic, ru=Russian,
ko=Korean, tr=Turkish, pl=Polish, other=other

Rating: ${review.rating}/5
Review text: "${review.review_text || "No text provided"}"

Respond with ONLY this JSON, no other text:
{
  "sentiment": "positive" | "neutral" | "negative",
  "topic": "cleanliness" | "smell" | "noise" | "wifi" | "breakfast" | "staff" | "location" | "value" | "room" | "checkin" | "bathroom" | "food" | "parking" | "pool" | "amenities" | "service" | "mold" | "temperature" | "view" | null,
  "topic_type": "strength" | "improvement" | null,
  "original_language": "en" | "nl" | "id" | "de" | "fr" | "es" | "it" | "pt" | "ja" | "zh" | "ar" | "ru" | "ko" | "tr" | "pl" | "other"
}`,
                  },
                ],
              }),
            });

            const data = (await response.json()) as {
              content?: Array<{ text?: string }>;
              error?: { message?: string };
            };

            if (!response.ok) {
              console.error(
                "Anthropic error",
                review.id,
                data.error?.message ?? response.statusText,
              );
              return;
            }

            const text = data.content?.[0]?.text?.trim();
            if (!text) return;

            let parsed: {
              sentiment: string;
              topic: string | null;
              topic_type?: string | null;
              original_language?: string | null;
            };
            try {
              parsed = JSON.parse(text) as typeof parsed;
            } catch {
              const match = text.match(/\{[\s\S]*\}/);
              if (!match) return;
              parsed = JSON.parse(match[0]) as typeof parsed;
            }

            const sentiment = VALID_SENTIMENTS.includes(parsed.sentiment)
              ? parsed.sentiment
              : null;
            const topic = VALID_TOPICS.includes(parsed.topic) ? parsed.topic : null;
            const topicType = ["strength", "improvement"].includes(
              String(parsed.topic_type ?? ""),
            )
              ? (parsed.topic_type as "strength" | "improvement")
              : null;
            const originalLanguage = VALID_LANGUAGES.includes(
              String(parsed.original_language ?? ""),
            )
              ? (parsed.original_language as string)
              : null;

            const { error: updateError } = await supabase
              .from("reviews")
              .update({
                sentiment,
                complaint_topic: topic,
                topic_type: topicType,
                original_language: originalLanguage,
              })
              .eq("id", review.id);

            if (updateError) {
              console.error("Error updating review", review.id, updateError);
              return;
            }

            classified++;
          } catch (err) {
            console.error("Error classifying review", review.id, err);
          }
        }),
      );

      if (i + batchSize < rows.length) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    return NextResponse.json({
      success: true,
      classified,
      total: rows.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

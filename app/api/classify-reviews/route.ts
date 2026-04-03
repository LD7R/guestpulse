/**
 * Run in Supabase:
 * alter table public.reviews add column if not exists topic_type text;
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
    const batchSize = 5;

    const validSentiments = ["positive", "neutral", "negative"];
    const validTopics: (string | null)[] = [
      "wifi",
      "noise",
      "cleanliness",
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
      null,
    ];

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
                    content: `Analyze this hotel review. Respond with ONLY a JSON object, no markdown:
{
  "sentiment": "positive"|"neutral"|"negative",
  "topic": "wifi"|"noise"|"cleanliness"|"breakfast"|"staff"|"location"|"value"|"room"|"checkin"|"bathroom"|"food"|"parking"|"pool"|"amenities"|"service"|null,
  "topic_type": "strength"|"improvement"|null
}

Sentiment rules:
- positive: rating 4-5 AND happy tone
- negative: rating 1-2 OR strong complaints
- neutral: rating 3 OR mixed feelings

Topic rules:
- Pick the single most prominent topic mentioned
- null if no specific topic

Topic type rules:
- strength: guest is praising this aspect (e.g. "staff was amazing", "breakfast was excellent")
- improvement: guest is complaining about this aspect (e.g. "wifi was terrible", "room was noisy")
- null if no specific topic

Rating: ${review.rating}/5
Review: ${review.review_text || "No text provided"}`,
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
            };
            try {
              parsed = JSON.parse(text) as {
                sentiment: string;
                topic: string | null;
                topic_type?: string | null;
              };
            } catch {
              const match = text.match(/\{[\s\S]*\}/);
              if (!match) return;
              parsed = JSON.parse(match[0]) as {
                sentiment: string;
                topic: string | null;
                topic_type?: string | null;
              };
            }

            const sentiment = validSentiments.includes(parsed.sentiment)
              ? parsed.sentiment
              : null;
            const topic = validTopics.includes(parsed.topic) ? parsed.topic : null;
            const topicType = ["strength", "improvement"].includes(
              String(parsed.topic_type ?? ""),
            )
              ? (parsed.topic_type as "strength" | "improvement")
              : null;

            const { error: updateError } = await supabase
              .from("reviews")
              .update({
                sentiment,
                complaint_topic: topic,
                topic_type: topicType,
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

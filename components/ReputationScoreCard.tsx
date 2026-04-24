"use client";

import { useMemo, useState } from "react";

export type RepReview = {
  rating?: unknown;
  sentiment?: string | null;
  responded?: boolean | null;
  review_date?: string | null;
  created_at?: string | null;
};

type ScoreResult = {
  score: number;
  components: { rating: number; response: number; sentiment: number; velocity: number };
  avgRating: number;
  responseRate: number;
  sentimentRate: number;
  recent30Count: number;
};

function calcScore(reviews: RepReview[]): ScoreResult | null {
  if (!reviews || reviews.length === 0) return null;

  const ratings = reviews
    .map((r) => (typeof r.rating === "number" ? r.rating : Number(r.rating)))
    .filter((n) => !Number.isNaN(n) && n > 0);
  const avgRating = ratings.length
    ? ratings.reduce((a, b) => a + b, 0) / ratings.length
    : 0;
  const ratingScore = (avgRating / 5) * 40;

  const responded = reviews.filter((r) => r.responded).length;
  const responseRate = reviews.length ? responded / reviews.length : 0;
  const responseScore = responseRate * 25;

  const classified = reviews.filter((r) => r.sentiment);
  const positive = classified.filter(
    (r) => (r.sentiment ?? "").toLowerCase() === "positive",
  ).length;
  const sentimentRate = classified.length ? positive / classified.length : 0;
  const sentimentScore = sentimentRate * 20;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
  const recent = reviews.filter((r) => {
    const d = new Date(r.review_date ?? r.created_at ?? 0);
    return d >= thirtyDaysAgo;
  });
  const velocityScore = Math.min(15, recent.length);

  return {
    score: Math.round(ratingScore + responseScore + sentimentScore + velocityScore),
    components: {
      rating: Math.round(ratingScore),
      response: Math.round(responseScore),
      sentiment: Math.round(sentimentScore),
      velocity: Math.round(velocityScore),
    },
    avgRating,
    responseRate,
    sentimentRate,
    recent30Count: recent.length,
  };
}

function grade(score: number): { label: string; color: string } {
  if (score >= 90) return { label: "Excellent", color: "#4ade80" };
  if (score >= 75) return { label: "Strong", color: "#84cc16" };
  if (score >= 60) return { label: "Good", color: "#fbbf24" };
  if (score >= 40) return { label: "Needs work", color: "#f97316" };
  return { label: "Urgent attention", color: "#f87171" };
}

const COMPONENTS = [
  { key: "rating" as const, label: "Average rating", max: 40, color: "#4ade80" },
  { key: "response" as const, label: "Response rate", max: 25, color: "#60a5fa" },
  { key: "sentiment" as const, label: "Positive sentiment", max: 20, color: "#a78bfa" },
  { key: "velocity" as const, label: "Review velocity", max: 15, color: "#fbbf24" },
] as const;

const R = 70;
const CIRC = 2 * Math.PI * R;

export default function ReputationScoreCard({
  reviews,
  lastMonthReviews,
}: {
  reviews: RepReview[];
  lastMonthReviews: RepReview[];
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  const current = useMemo(() => calcScore(reviews), [reviews]);
  const previous = useMemo(() => calcScore(lastMonthReviews), [lastMonthReviews]);

  if (!current) return null;

  const { score, components } = current;
  const { label: gradeLabel, color: gradeColor } = grade(score);

  const scoreDiff = previous ? score - previous.score : 0;
  const hasPrevious = !!previous;
  const filled = (score / 100) * CIRC;

  // Weakest component by fill %
  const weakest = [...COMPONENTS].sort(
    (a, b) =>
      components[a.key] / a.max - components[b.key] / b.max,
  )[0]!;

  let insightText = "";
  if (score < 60) {
    const responseRatePct = Math.round(current.responseRate * 100);
    const sentimentPct = Math.round(current.sentimentRate * 100);
    if (weakest.key === "rating") {
      insightText = `Focus on service improvements — your average rating is ${current.avgRating.toFixed(1)} / 5.0`;
    } else if (weakest.key === "response") {
      const toRespond = reviews.length - reviews.filter((r) => r.responded).length;
      insightText = `Respond to ${toRespond} more reviews to boost your score — current response rate: ${responseRatePct}%`;
    } else if (weakest.key === "sentiment") {
      insightText = `${100 - sentimentPct}% of reviews are negative or neutral — addressing complaints will improve your score`;
    } else {
      insightText = `Ask guests for reviews at checkout to boost review volume — you've had ${current.recent30Count} reviews in the last 30 days`;
    }
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .rep-score-grid { display: grid; grid-template-columns: 3fr 2fr; gap: 32px; }
        @media (max-width: 768px) {
          .rep-score-grid { grid-template-columns: 1fr !important; gap: 24px !important; }
        }
      ` }} />

      <div style={{
        background: "#141414",
        border: "1px solid #1e1e1e",
        borderRadius: 8,
        padding: "28px 32px",
        marginBottom: 16,
      }}>
        <div className="rep-score-grid">

          {/* ── LEFT: circular score ── */}
          <div>
            {/* header row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#555555" }}>
                  REPUTATION SCORE
                </div>
                <div style={{ fontSize: 11, color: "#555555", marginTop: 2 }}>
                  Based on last 30 days of reviews
                </div>
              </div>
              {hasPrevious && (
                <div style={{
                  background: scoreDiff > 0 ? "#052e16" : scoreDiff < 0 ? "#2d0a0a" : "#1a1a1a",
                  color: scoreDiff > 0 ? "#4ade80" : scoreDiff < 0 ? "#f87171" : "#555555",
                  fontSize: 11,
                  fontWeight: 600,
                  borderRadius: 100,
                  padding: "3px 10px",
                  flexShrink: 0,
                  marginTop: 2,
                }}>
                  {scoreDiff > 0
                    ? `↑ +${scoreDiff} vs last month`
                    : scoreDiff < 0
                    ? `↓ ${scoreDiff} vs last month`
                    : "No change"}
                </div>
              )}
            </div>

            {/* circle */}
            <div style={{ marginTop: 20 }}>
              <div
                style={{ position: "relative", width: 180, height: 180 }}
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
              >
                <svg width="180" height="180" viewBox="0 0 180 180">
                  <circle cx="90" cy="90" r={R} fill="none" stroke="#1e1e1e" strokeWidth="8" />
                  <circle
                    cx="90" cy="90" r={R}
                    fill="none"
                    stroke={gradeColor}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${filled} ${CIRC}`}
                    transform="rotate(-90 90 90)"
                    style={{ transition: "stroke-dasharray 0.6s ease" }}
                  />
                </svg>

                {/* score overlay */}
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center",
                  cursor: "default",
                  userSelect: "none",
                }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
                    <span style={{ fontSize: 64, fontWeight: 700, color: gradeColor, lineHeight: 1 }}>
                      {score}
                    </span>
                    <span style={{ fontSize: 18, fontWeight: 500, color: "#555555" }}>/100</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: gradeColor, marginTop: 4 }}>
                    {gradeLabel}
                  </div>
                </div>

                {/* tooltip */}
                {showTooltip && (
                  <div style={{
                    position: "absolute",
                    bottom: "calc(100% + 8px)",
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: "#1a1a1a",
                    border: "1px solid #2a2a2a",
                    borderRadius: 6,
                    padding: "10px 14px",
                    fontSize: 11,
                    color: "#cccccc",
                    whiteSpace: "nowrap",
                    zIndex: 10,
                    lineHeight: 1.8,
                    pointerEvents: "none",
                  }}>
                    <div style={{ fontWeight: 600, color: "#f0f0f0", marginBottom: 4 }}>
                      How this is calculated:
                    </div>
                    <div>• Average rating (40%)</div>
                    <div>• Response rate (25%)</div>
                    <div>• Positive sentiment (20%)</div>
                    <div>• Review volume (15%)</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── RIGHT: breakdown ── */}
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#555555",
              marginBottom: 16,
            }}>
              SCORE BREAKDOWN
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {COMPONENTS.map((comp) => (
                <div key={comp.key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {/* dot + label */}
                  <div style={{ display: "flex", alignItems: "center", gap: 7, width: 134, flexShrink: 0 }}>
                    <span style={{
                      width: 7, height: 7, borderRadius: "50%",
                      background: comp.color,
                      display: "inline-block",
                      flexShrink: 0,
                    }} />
                    <span style={{ fontSize: 12, color: "#f0f0f0" }}>{comp.label}</span>
                  </div>
                  {/* bar */}
                  <div style={{ flex: 1, height: 4, background: "#1e1e1e", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{
                      width: `${(components[comp.key] / comp.max) * 100}%`,
                      height: "100%",
                      background: comp.color,
                      borderRadius: 2,
                      transition: "width 0.4s ease",
                    }} />
                  </div>
                  {/* points */}
                  <span style={{ fontSize: 12, color: "#888888", flexShrink: 0, width: 36, textAlign: "right" }}>
                    {components[comp.key]} / {comp.max}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* insight banner */}
      {score < 60 && insightText && (
        <div style={{
          background: "#1a1200",
          border: "1px solid #2a2000",
          borderRadius: 6,
          padding: "10px 14px",
          marginBottom: 16,
          fontSize: 12,
          color: "#fbbf24",
        }}>
          Biggest opportunity: {insightText}
        </div>
      )}
    </>
  );
}

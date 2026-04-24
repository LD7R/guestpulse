"use client";

const ENTRIES = [
  {
    date: "April 2026",
    version: "v0.9",
    items: [
      "Launched Competitor Benchmarking — AI finds your competitors automatically",
      "Added Trip.com, Expedia and Yelp review sync",
      "Weekly Monday email digest",
      "19-language sentiment analysis",
    ],
  },
  {
    date: "March 2026",
    version: "v0.8",
    items: [
      "AI response drafting with guest-specific personalisation",
      "Full sentiment dashboard with trend charts",
      "Urgent review alerts (1 & 2 star)",
      "Complaint topic auto-tagging",
    ],
  },
  {
    date: "February 2026",
    version: "v0.7",
    items: [
      "Multi-platform review sync: TripAdvisor, Google, Booking.com",
      "Automatic hotel profile discovery on setup",
      "Review inbox with platform filters",
      "Rating trend charts",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <main style={{ minHeight: "60vh", padding: "96px 48px", maxWidth: 760, margin: "0 auto", fontFamily: "Inter, -apple-system, sans-serif" }}>
      <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6b7280", marginBottom: 12, textAlign: "center" }}>Changelog</p>
      <h1 style={{ fontSize: 40, fontWeight: 700, color: "#ffffff", letterSpacing: "-1px", textAlign: "center", marginBottom: 56 }}>What&apos;s new</h1>
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {ENTRIES.map((entry, i) => (
          <div key={entry.version} style={{ display: "flex", gap: 32, paddingBottom: 48 }}>
            <div style={{ width: 100, flexShrink: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#4ade80" }}>{entry.version}</div>
              <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{entry.date}</div>
              {i < ENTRIES.length - 1 && (
                <div style={{ width: 1, height: "calc(100% - 40px)", background: "#242836", marginTop: 12, marginLeft: 4 }} />
              )}
            </div>
            <div style={{ flex: 1 }}>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
                {entry.items.map((item) => (
                  <li key={item} style={{ display: "flex", gap: 10, fontSize: 14, color: "#9ca3af", alignItems: "flex-start", lineHeight: 1.6 }}>
                    <span style={{ color: "#4ade80", flexShrink: 0, marginTop: 2 }}>●</span>{item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

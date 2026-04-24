"use client";

export default function BlogPage() {
  return (
    <main style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "96px 48px", textAlign: "center", fontFamily: "Inter, -apple-system, sans-serif" }}>
      <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6b7280", marginBottom: 16 }}>Coming soon</p>
      <h1 style={{ fontSize: 40, fontWeight: 700, color: "#ffffff", letterSpacing: "-1px", marginBottom: 16 }}>Blog</h1>
      <p style={{ fontSize: 16, color: "#9ca3af", maxWidth: 480, lineHeight: 1.7 }}>
        Guides, tips and industry insights for boutique hotel owners. Launching soon.
      </p>
    </main>
  );
}

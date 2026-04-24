"use client";

import Link from "next/link";

export default function HelpPage() {
  return (
    <main style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "96px 48px", textAlign: "center", fontFamily: "Inter, -apple-system, sans-serif" }}>
      <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6b7280", marginBottom: 16 }}>Help center</p>
      <h1 style={{ fontSize: 40, fontWeight: 700, color: "#ffffff", letterSpacing: "-1px", marginBottom: 16 }}>How can we help?</h1>
      <p style={{ fontSize: 16, color: "#9ca3af", maxWidth: 480, lineHeight: 1.7, marginBottom: 24 }}>
        Our help center is being built. In the meantime, send us a message and we&apos;ll help you directly.
      </p>
      <Link href="/contact" style={{ fontSize: 14, color: "#4ade80", textDecoration: "none" }}>
        Contact support →
      </Link>
    </main>
  );
}

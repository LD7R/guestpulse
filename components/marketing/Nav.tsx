"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { CSSProperties } from "react";

export default function MarketingNav() {
  const router = useRouter();
  const pathname = usePathname();

  const linkStyle = (href: string): CSSProperties => ({
    fontSize: 14,
    fontWeight: 500,
    color: pathname === href ? "#ffffff" : "#9ca3af",
    textDecoration: "none",
    cursor: "pointer",
  });

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .mnav-links { display: flex; gap: 28px; margin-left: 48px; flex: 1; }
        .mnav-signin { display: inline-block; }
        @media (max-width: 768px) {
          .mnav-links { display: none !important; }
          .mnav-signin { display: none !important; }
        }
      `}} />
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "rgba(15,17,23,0.92)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: "1px solid #242836",
          height: 64,
          display: "flex",
          alignItems: "center",
          padding: "0 48px",
        }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", flexShrink: 0 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ade80" }} />
          <span style={{ fontSize: 17, fontWeight: 700, color: "#ffffff" }}>GuestPulse</span>
        </Link>

        <div className="mnav-links">
          <Link href="/product" style={linkStyle("/product")}>Product</Link>
          <Link href="/features" style={linkStyle("/features")}>Features</Link>
          <Link href="/pricing" style={linkStyle("/pricing")}>Pricing</Link>
          <Link href="/about" style={linkStyle("/about")}>About</Link>
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center", marginLeft: "auto" }}>
          <Link href="/login" className="mnav-signin" style={{ fontSize: 14, fontWeight: 500, color: "#9ca3af", textDecoration: "none" }}>
            Sign in
          </Link>
          <button
            type="button"
            onClick={() => router.push("/pricing")}
            style={{
              background: "#4ade80",
              color: "#0d0d0d",
              border: "none",
              borderRadius: 6,
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#22c55e"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#4ade80"; }}
          >
            Start free trial
          </button>
        </div>
      </nav>
    </>
  );
}

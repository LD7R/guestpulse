"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import Logo from "@/components/Logo";

function FooterLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      style={{ display: "block", fontSize: 13, color: "#9ca3af", textDecoration: "none", marginBottom: 10 }}
    >
      {children}
    </Link>
  );
}

export default function MarketingFooter() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .mfooter-grid { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 48px; }
        @media (max-width: 768px) {
          .mfooter-grid { grid-template-columns: 1fr 1fr; gap: 32px; }
        }
        @media (max-width: 480px) {
          .mfooter-grid { grid-template-columns: 1fr; gap: 24px; }
        }
      `}} />
      <footer style={{ background: "#0a0c12", borderTop: "1px solid #242836", padding: "64px 48px 32px" }}>
        <div className="mfooter-grid" style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div>
            <div style={{ marginBottom: 12 }}>
              <Logo size="sm" />
            </div>
            <p style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.7, maxWidth: 280 }}>
              AI-powered review management built for independent boutique hotels worldwide.
            </p>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#6b7280", marginBottom: 16 }}>
              Product
            </div>
            <FooterLink href="/product">Overview</FooterLink>
            <FooterLink href="/features">Features</FooterLink>
            <FooterLink href="/pricing">Pricing</FooterLink>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#6b7280", marginBottom: 16 }}>
              Resources
            </div>
            <FooterLink href="/help">Help center</FooterLink>
            <FooterLink href="/contact">Contact</FooterLink>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#6b7280", marginBottom: 16 }}>
              Company
            </div>
            <FooterLink href="/about">About</FooterLink>
            <FooterLink href="/privacy">Privacy</FooterLink>
            <FooterLink href="/terms">Terms</FooterLink>
          </div>
        </div>

        <div
          style={{
            maxWidth: 1200,
            margin: "48px auto 0",
            paddingTop: 24,
            borderTop: "1px solid #242836",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 12,
            color: "#6b7280",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>© 2026 GuestPulse. All rights reserved.</div>
          <div>Built for independent hotels worldwide</div>
        </div>
      </footer>
    </>
  );
}

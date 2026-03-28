"use client";

import type { CSSProperties } from "react";

const glass: CSSProperties = {
  background: "var(--glass-bg)",
  backdropFilter: "blur(24px) saturate(180%)",
  WebkitBackdropFilter: "blur(24px) saturate(180%)",
  border: "1px solid var(--glass-border)",
  borderRadius: "var(--card-radius)",
  boxShadow: "var(--glass-shadow), var(--glass-inner)",
};

export default function PricingPage() {
  return (
    <div
      className="pricing-page"
      style={{
        minHeight: "100vh",
        background: "var(--bg-gradient)",
        backgroundAttachment: "fixed",
      }}
    >
      <h1
        style={{
          fontSize: "26px",
          fontWeight: 700,
          letterSpacing: "-0.5px",
          color: "var(--text-primary)",
          marginBottom: "8px",
        }}
      >
        Pricing
      </h1>
      <p style={{ fontSize: "14px", color: "var(--text-muted)", marginBottom: "24px" }}>
        Plans and billing will appear here.
      </p>
      <div style={{ ...glass, padding: "28px", maxWidth: "560px" }}>
        <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>
          GuestPulse pricing details are coming soon. Contact us if you need a custom plan for your
          property.
        </p>
      </div>
    </div>
  );
}

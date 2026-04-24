"use client";

import MarketingFooter from "@/components/marketing/Footer";
import MarketingNav from "@/components/marketing/Nav";
import type { ReactNode } from "react";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        background: "#0f1117",
        minHeight: "100vh",
        color: "#ffffff",
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <MarketingNav />
      {children}
      <MarketingFooter />
    </div>
  );
}

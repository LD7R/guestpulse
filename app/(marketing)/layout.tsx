"use client";

import MarketingFooter from "@/components/marketing/Footer";
import MarketingNav from "@/components/marketing/Nav";
import { useEffect, useState, type ReactNode } from "react";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  const [loaded, setLoaded] = useState(false);
  const [barWidth, setBarWidth] = useState(0);

  useEffect(() => {
    // Animate bar 0→85 quickly, then finish to 100 and fade
    setBarWidth(85);
    const t1 = setTimeout(() => setBarWidth(100), 400);
    const t2 = setTimeout(() => setLoaded(true), 650);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div
      style={{
        background: "#0f1117",
        minHeight: "100vh",
        color: "#ffffff",
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* Page-load progress bar */}
      {!loaded && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            height: 2,
            zIndex: 9999,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              height: "100%",
              background: "#4ade80",
              width: `${barWidth}%`,
              transition: "width 0.4s ease-out",
              opacity: barWidth >= 100 ? 0 : 1,
            }}
          />
        </div>
      )}
      <MarketingNav />
      {children}
      <MarketingFooter />
    </div>
  );
}

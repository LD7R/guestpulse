"use client";

import { useEffect, useRef, useState } from "react";

export default function PageLoadingBar({ loading }: { loading: boolean }) {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (loading) {
      setProgress(0);
      setVisible(true);

      // Ramp up: 0 → 30 → 60 → 80 → 90
      const steps = [
        { target: 30, delay: 80 },
        { target: 60, delay: 250 },
        { target: 80, delay: 500 },
        { target: 90, delay: 900 },
      ];

      let i = 0;
      function step() {
        if (i >= steps.length) return;
        const { target, delay } = steps[i]!;
        timerRef.current = setTimeout(() => {
          setProgress(target);
          i++;
          step();
        }, delay);
      }
      step();
    } else {
      // Complete → fade out
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
      setProgress(100);
      timerRef.current = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 400);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [loading]);

  if (!visible) return null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes gpBarShimmer {
          0% { opacity: 0.7; }
          50% { opacity: 1; }
          100% { opacity: 0.7; }
        }
      ` }} />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          zIndex: 50,
          background: "#1a1a1a",
          overflow: "hidden",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            height: "100%",
            background: "#4ade80",
            width: `${progress}%`,
            transition: progress === 100 ? "width 0.2s ease, opacity 0.3s ease" : "width 0.6s ease",
            opacity: progress === 100 ? 0 : 1,
            animation: progress < 100 ? "gpBarShimmer 1.4s ease-in-out infinite" : "none",
            borderRadius: "0 1px 1px 0",
          }}
        />
      </div>
    </>
  );
}

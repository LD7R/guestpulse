"use client";

import { useEffect, useState } from "react";

export type SyncPlatformStatus = {
  platform: string;
  status: "idle" | "syncing" | "done" | "error";
  count?: number;
};

type Props = {
  visible: boolean;
  platforms: SyncPlatformStatus[];
  startTime?: number;
};

const PLATFORM_ICONS: Record<string, string> = {
  tripadvisor: "TA",
  google: "G",
  booking: "B",
  trip: "TC",
  expedia: "EX",
  yelp: "YP",
};

const STATUS_COLOR: Record<string, string> = {
  idle: "#444444",
  syncing: "#fbbf24",
  done: "#4ade80",
  error: "#f87171",
};

const STATUS_CHAR: Record<string, string> = {
  idle: "·",
  syncing: "▸",
  done: "✓",
  error: "✗",
};

function useElapsed(startTime: number | undefined, running: boolean) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!running || !startTime) {
      setElapsed(0);
      return;
    }
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [running, startTime]);

  return elapsed;
}

export default function TerminalSyncCard({ visible, platforms, startTime }: Props) {
  const running = visible && platforms.some((p) => p.status === "syncing");
  const elapsed = useElapsed(startTime, running);

  if (!visible || platforms.length === 0) return null;

  const allDone = platforms.every((p) => p.status === "done" || p.status === "error");
  const errorCount = platforms.filter((p) => p.status === "error").length;
  const doneCount = platforms.filter((p) => p.status === "done").length;
  const total = platforms.length;
  const progressPct = total > 0 ? Math.round(((doneCount + errorCount) / total) * 100) : 0;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pulseGreen { 0%,100%{opacity:0.4} 50%{opacity:1} }
        @keyframes blinkArrow { 0%,100%{opacity:1} 49%{opacity:1} 50%{opacity:0} 99%{opacity:0} }
        @keyframes gpFlashGreen { 0%{background:#0a1a0a;border-color:#1a4a1a} 60%{background:#0a1a0a;border-color:#4ade80} 100%{background:#0d0d0d;border-color:#1e1e1e} }
      ` }} />
      <div
        style={{
          background: "#0d0d0d",
          border: "1px solid #1e1e1e",
          borderRadius: 6,
          padding: "10px 12px",
          marginBottom: 8,
          fontFamily: '"SF Mono","Cascadia Code",Consolas,monospace',
          fontSize: 11,
          animation: allDone && errorCount === 0 ? "gpFlashGreen 1.2s ease-out forwards" : "none",
        }}
      >
        {/* Header row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: allDone ? (errorCount > 0 ? "#f87171" : "#4ade80") : "#fbbf24",
                display: "inline-block",
                animation: !allDone ? "pulseGreen 1.2s ease-in-out infinite" : "none",
              }}
            />
            <span style={{ color: "#888888", fontSize: 10, letterSpacing: "0.05em" }}>
              {allDone ? (errorCount > 0 ? "SYNC DONE (errors)" : "SYNC DONE") : "SYNCING..."}
            </span>
          </div>
          {!allDone && (
            <span style={{ color: "#444444", fontSize: 10 }}>
              {elapsed}s
            </span>
          )}
        </div>

        {/* Platform rows */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {platforms.map((p) => (
            <div key={p.platform} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  color: STATUS_COLOR[p.status] ?? "#444444",
                  width: 10,
                  flexShrink: 0,
                  animation: p.status === "syncing" ? "blinkArrow 1s step-end infinite" : "none",
                  fontSize: 10,
                }}
              >
                {STATUS_CHAR[p.status] ?? "·"}
              </span>
              <span
                style={{
                  background: "#1a1a1a",
                  color: "#666666",
                  borderRadius: 2,
                  padding: "0 4px",
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.05em",
                  flexShrink: 0,
                  minWidth: 20,
                  textAlign: "center",
                }}
              >
                {PLATFORM_ICONS[p.platform] ?? p.platform.slice(0, 2).toUpperCase()}
              </span>
              <span style={{ color: STATUS_COLOR[p.status] ?? "#444444", fontSize: 10, flex: 1 }}>
                {p.platform}
              </span>
              <span style={{ color: p.status === "done" ? "#4ade80" : p.status === "error" ? "#f87171" : "#333333", fontSize: 10 }}>
                {p.status === "syncing" ? "…" : p.status === "done" ? (p.count != null ? `+${p.count}` : "ok") : p.status === "error" ? "err" : ""}
              </span>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div
          style={{
            marginTop: 8,
            height: 2,
            background: "#1a1a1a",
            borderRadius: 1,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progressPct}%`,
              background: errorCount > 0 ? "#f97316" : "#4ade80",
              borderRadius: 1,
              transition: "width 0.4s ease",
            }}
          />
        </div>
      </div>
    </>
  );
}

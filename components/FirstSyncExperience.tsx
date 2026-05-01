"use client";

import { useState, useEffect, useRef } from "react";
import AnimatedNumber from "./AnimatedNumber";

interface SyncPlatform {
  platform: string;
  url: string;
  label: string;
}

interface PlatformProgress {
  platform: string;
  label: string;
  status: "pending" | "running" | "success" | "error";
  count: number;
}

interface Props {
  hotelId: string;
  platforms: SyncPlatform[];
  onComplete: () => void;
}

export default function FirstSyncExperience({ hotelId, platforms, onComplete }: Props) {
  const [progress, setProgress] = useState<PlatformProgress[]>(
    platforms.map((p) => ({ platform: p.platform, label: p.label, status: "pending", count: 0 })),
  );
  const [totalReviews, setTotalReviews] = useState(0);
  const [phase, setPhase] = useState<"starting" | "syncing" | "complete">("starting");
  const hasSynced = useRef(false);

  useEffect(() => {
    if (hasSynced.current) return;
    hasSynced.current = true;
    void runSync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runSync() {
    setPhase("starting");
    await new Promise<void>((r) => setTimeout(r, 600));
    setPhase("syncing");

    // Kick off all platforms in parallel, but stagger the "running" state visually
    let idx = 0;
    await Promise.allSettled(
      platforms.map(async ({ platform, url }) => {
        const myIdx = idx++;
        // Stagger the start so each platform appears to kick off sequentially
        await new Promise<void>((r) => setTimeout(r, myIdx * 200));

        setProgress((prev) =>
          prev.map((p) => (p.platform === platform ? { ...p, status: "running" } : p)),
        );

        try {
          const res = await fetch("/api/scrape-reviews", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ hotel_id: hotelId, url, platform, sync_type: "initial" }),
          });
          const json = (await res.json()) as { count?: number; error?: string };
          const count = json.count ?? 0;
          setProgress((prev) =>
            prev.map((p) => (p.platform === platform ? { ...p, status: "success", count } : p)),
          );
          setTotalReviews((t) => t + count);
        } catch {
          setProgress((prev) =>
            prev.map((p) => (p.platform === platform ? { ...p, status: "error", count: 0 } : p)),
          );
        }
      }),
    );

    // Background classify
    void fetch("/api/classify-reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hotel_id: hotelId }),
    });

    await new Promise<void>((r) => setTimeout(r, 600));
    setPhase("complete");
    await new Promise<void>((r) => setTimeout(r, 2000));
    onComplete();
  }

  const statusColor = {
    pending: "#333333",
    running: "#fbbf24",
    success: "#4ade80",
    error: "#f87171",
  };

  const borderColor = {
    pending: "#2a2a2a",
    running: "#2a2000",
    success: "#1a3a1a",
    error: "#2a1a1a",
  };

  const bgColor = {
    pending: "#1a1a1a",
    running: "#1a1200",
    success: "#0a1a0a",
    error: "#1a0a0a",
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fse-spin { to { transform: rotate(360deg); } }
      ` }} />
      <div
        className="gp-fade-in"
        style={{ maxWidth: 520, margin: "0 auto", textAlign: "center" }}
      >
        {/* Phase label */}
        <div
          style={{
            fontSize: 11,
            color: "#555555",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            marginBottom: 16,
          }}
        >
          {phase === "starting" && "Starting sync..."}
          {phase === "syncing" && `Syncing reviews from ${platforms.length} platforms`}
          {phase === "complete" && "Sync complete"}
        </div>

        {/* Big animated total */}
        <div
          style={{
            fontSize: 64,
            fontWeight: 700,
            color: "#f0f0f0",
            letterSpacing: "-3px",
            lineHeight: 1,
            marginBottom: 8,
          }}
        >
          <AnimatedNumber value={totalReviews} duration={600} />
        </div>
        <div style={{ fontSize: 13, color: "#555555", marginBottom: 32 }}>
          reviews synced
        </div>

        {/* Per-platform progress */}
        <div
          style={{
            background: "#141414",
            border: "1px solid #1e1e1e",
            borderRadius: 8,
            padding: 16,
            textAlign: "left",
          }}
        >
          {progress.map((p, i) => (
            <div
              key={p.platform}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 4px",
                borderBottom: i < progress.length - 1 ? "1px solid #1a1a1a" : "none",
                opacity: p.status === "pending" ? 0.45 : 1,
                transition: "opacity 0.3s ease-out",
              }}
            >
              {/* Status icon */}
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: bgColor[p.status],
                  border: `1px solid ${borderColor[p.status]}`,
                  color: statusColor[p.status],
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  flexShrink: 0,
                }}
              >
                {p.status === "pending" && (
                  <span style={{ color: "#444444" }}>·</span>
                )}
                {p.status === "running" && (
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      border: "1.5px solid #fbbf24",
                      borderTopColor: "transparent",
                      borderRadius: "50%",
                      display: "inline-block",
                      animation: "fse-spin 0.8s linear infinite",
                    }}
                  />
                )}
                {p.status === "success" && <span className="gp-check-pop">✓</span>}
                {p.status === "error" && "×"}
              </span>

              {/* Platform name */}
              <span style={{ flex: 1, fontSize: 13, color: "#f0f0f0" }}>{p.label}</span>

              {/* Count */}
              <span
                style={{
                  fontSize: 12,
                  color: statusColor[p.status],
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {p.status === "success" && (
                  <span className="gp-number-count">{p.count} reviews</span>
                )}
                {p.status === "error" && "—"}
                {p.status === "pending" && (
                  <span style={{ color: "#333333" }}>Waiting</span>
                )}
                {p.status === "running" && (
                  <span style={{ color: "#fbbf24" }}>Syncing…</span>
                )}
              </span>
            </div>
          ))}
        </div>

        {/* Completion message */}
        {phase === "complete" && (
          <div
            className="gp-fade-in"
            style={{ marginTop: 24, color: "#4ade80", fontSize: 13 }}
          >
            ✦ All set — taking you to your dashboard
          </div>
        )}
      </div>
    </>
  );
}

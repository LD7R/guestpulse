"use client";

import { type CSSProperties } from "react";
import { type SaveState } from "./SaveButton";

interface AutosaveIndicatorProps {
  state: SaveState;
  style?: CSSProperties;
}

const CONFIG: Record<SaveState, { text: string; color: string; dot?: string }> = {
  idle: { text: "", color: "transparent" },
  saving: { text: "Saving…", color: "var(--text-muted)" },
  saved: { text: "All changes saved", color: "var(--accent-green)", dot: "#4ade80" },
  error: { text: "Failed to save", color: "var(--accent-red)", dot: "#f87171" },
};

export default function AutosaveIndicator({ state, style }: AutosaveIndicatorProps) {
  if (state === "idle") return null;

  const cfg = CONFIG[state];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        fontSize: 12,
        color: cfg.color,
        transition: "opacity 0.3s ease-out",
        animation: "gpFadeIn 0.25s ease-out forwards",
        ...style,
      }}
    >
      {cfg.dot ? (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: cfg.dot,
            display: "inline-block",
            flexShrink: 0,
          }}
        />
      ) : state === "saving" ? (
        <span
          style={{
            width: 10,
            height: 10,
            border: "1.5px solid var(--border)",
            borderTopColor: "var(--text-muted)",
            borderRadius: "50%",
            display: "inline-block",
            animation: "gpSpin 0.7s linear infinite",
            flexShrink: 0,
          }}
        />
      ) : null}
      {cfg.text}
    </div>
  );
}

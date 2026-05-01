"use client";

import { type CSSProperties } from "react";

export type SaveState = "idle" | "saving" | "saved" | "error";

interface SaveButtonProps {
  state: SaveState;
  onClick?: () => void;
  idleLabel?: string;
  savingLabel?: string;
  savedLabel?: string;
  errorLabel?: string;
  disabled?: boolean;
  style?: CSSProperties;
}

const LABELS: Record<SaveState, string> = {
  idle: "Save",
  saving: "Saving…",
  saved: "Saved",
  error: "Failed",
};

const COLORS: Record<SaveState, { bg: string; color: string; border?: string }> = {
  idle: { bg: "var(--text-primary)", color: "var(--bg-primary)" },
  saving: { bg: "var(--bg-hover)", color: "var(--text-secondary)", border: "var(--border)" },
  saved: { bg: "#052e16", color: "#4ade80", border: "#14532d" },
  error: { bg: "#2d0a0a", color: "#f87171", border: "#7f1d1d" },
};

export default function SaveButton({
  state,
  onClick,
  idleLabel,
  savingLabel,
  savedLabel,
  errorLabel,
  disabled,
  style,
}: SaveButtonProps) {
  const customLabels: Record<SaveState, string> = {
    idle: idleLabel ?? LABELS.idle,
    saving: savingLabel ?? LABELS.saving,
    saved: savedLabel ?? LABELS.saved,
    error: errorLabel ?? LABELS.error,
  };

  const colors = COLORS[state];
  const isDisabled = disabled || state === "saving";

  const btnStyle: CSSProperties = {
    background: colors.bg,
    color: colors.color,
    border: colors.border ? `1px solid ${colors.border}` : "none",
    borderRadius: 6,
    padding: "8px 18px",
    fontSize: 13,
    fontWeight: 600,
    cursor: isDisabled ? "not-allowed" : "pointer",
    fontFamily: "inherit",
    opacity: isDisabled && state !== "saving" ? 0.5 : 1,
    transition: "background 0.2s ease-out, color 0.2s ease-out, border-color 0.2s ease-out, opacity 0.15s ease-out",
    display: "flex",
    alignItems: "center",
    gap: 6,
    ...style,
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      style={btnStyle}
      onMouseEnter={(e) => {
        if (!isDisabled && state === "idle") {
          e.currentTarget.style.background = "#e0e0e0";
        }
      }}
      onMouseLeave={(e) => {
        if (!isDisabled && state === "idle") {
          e.currentTarget.style.background = "var(--text-primary)";
        }
      }}
    >
      {state === "saving" && (
        <span
          style={{
            width: 12,
            height: 12,
            border: "2px solid var(--border)",
            borderTopColor: "var(--text-secondary)",
            borderRadius: "50%",
            display: "inline-block",
            animation: "gpSpin 0.7s linear infinite",
          }}
        />
      )}
      {state === "saved" && <span style={{ fontSize: 14 }}>✓</span>}
      {state === "error" && <span style={{ fontSize: 14 }}>✕</span>}
      {customLabels[state]}
    </button>
  );
}

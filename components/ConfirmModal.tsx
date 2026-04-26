"use client";

import type { CSSProperties } from "react";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) return null;

  const confirmStyle: CSSProperties = {
    background: destructive ? "#f87171" : "#f0f0f0",
    border: "none",
    borderRadius: 6,
    padding: "8px 18px",
    fontSize: 13,
    fontWeight: 600,
    color: "#0d0d0d",
    cursor: "pointer",
    fontFamily: "inherit",
  };

  const cancelStyle: CSSProperties = {
    background: "transparent",
    border: "1px solid #2a2a2a",
    borderRadius: 6,
    padding: "8px 18px",
    fontSize: 13,
    color: "#888888",
    cursor: "pointer",
    fontFamily: "inherit",
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={onCancel}
    >
      <div
        style={{ background: "#141414", border: "1px solid #1e1e1e", borderRadius: 8, padding: 24, maxWidth: 400, width: "100%" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: 16, fontWeight: 600, color: "#f0f0f0", marginBottom: 8 }}>{title}</div>
        <p style={{ fontSize: 13, color: "#888888", marginBottom: 24, lineHeight: 1.6, margin: "0 0 24px 0" }}>{message}</p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button
            type="button"
            onClick={onCancel}
            style={cancelStyle}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#3a3a3a"; e.currentTarget.style.color = "#aaaaaa"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2a2a2a"; e.currentTarget.style.color = "#888888"; }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={confirmStyle}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.85"; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

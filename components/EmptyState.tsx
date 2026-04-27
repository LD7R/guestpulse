import type { ReactNode } from "react";

interface Props {
  icon?: ReactNode;
  title: string;
  description: string;
  primaryAction?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  variant?: "default" | "success" | "warning" | "error";
}

const colors = {
  default: { bg: "#141414", border: "#1e1e1e", icon: "#555555" },
  success: { bg: "#0a1a0a", border: "#1a3a1a", icon: "#4ade80" },
  warning: { bg: "#1a1200", border: "#2a2000", icon: "#fbbf24" },
  error: { bg: "#1a0a0a", border: "#2a1a1a", icon: "#f87171" },
};

export default function EmptyState({
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  variant = "default",
}: Props) {
  const c = colors[variant];

  return (
    <div
      style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: 8,
        padding: "48px 32px",
        textAlign: "center",
        maxWidth: 480,
        margin: "0 auto",
      }}
    >
      {icon && (
        <div
          style={{
            color: c.icon,
            fontSize: 32,
            marginBottom: 16,
            display: "flex",
            justifyContent: "center",
          }}
        >
          {icon}
        </div>
      )}
      <h3
        style={{
          fontSize: 16,
          fontWeight: 500,
          color: "#f0f0f0",
          margin: "0 0 8px",
          lineHeight: 1.4,
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontSize: 13,
          color: "#888888",
          margin: 0,
          lineHeight: 1.6,
        }}
      >
        {description}
      </p>
      {(primaryAction ?? secondaryAction) && (
        <div
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "center",
            marginTop: 20,
          }}
        >
          {secondaryAction && (
            <button
              type="button"
              onClick={secondaryAction.onClick}
              style={{
                background: "transparent",
                color: "#888",
                border: "1px solid #2a2a2a",
                borderRadius: 6,
                padding: "8px 16px",
                fontSize: 13,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {secondaryAction.label}
            </button>
          )}
          {primaryAction && (
            <button
              type="button"
              onClick={primaryAction.onClick}
              style={{
                background: "#f0f0f0",
                color: "#0d0d0d",
                border: "none",
                borderRadius: 6,
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {primaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

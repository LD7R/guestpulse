import type { ReactNode } from "react";

interface Props {
  icon?: ReactNode;
  title: string;
  description?: string;
  primaryAction?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  variant?: "default" | "success" | "warning" | "error";
  size?: "sm" | "md" | "lg";
}

const colors = {
  default: { bg: "#141414", border: "#1e1e1e", icon: "#555555", iconBg: "#1a1a1a" },
  success: { bg: "#0a1a0a", border: "#1a3a1a", icon: "#4ade80", iconBg: "#0d2010" },
  warning: { bg: "#1a1200", border: "#2a2000", icon: "#fbbf24", iconBg: "#251800" },
  error:   { bg: "#1a0a0a", border: "#2a1a1a", icon: "#f87171", iconBg: "#241010" },
};

const sizes = {
  sm: { padding: "32px 24px", iconSize: 36, iconFontSize: 18, titleSize: 14, descSize: 12 },
  md: { padding: "48px 32px", iconSize: 48, iconFontSize: 24, titleSize: 16, descSize: 13 },
  lg: { padding: "64px 40px", iconSize: 60, iconFontSize: 28, titleSize: 18, descSize: 14 },
};

export default function EmptyState({
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  variant = "default",
  size = "md",
}: Props) {
  const c = colors[variant];
  const s = sizes[size];

  return (
    <div
      className="gp-fade-in"
      style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: 8,
        padding: s.padding,
        textAlign: "center",
        maxWidth: 480,
        margin: "0 auto",
      }}
    >
      {icon && (
        <div
          style={{
            width: s.iconSize,
            height: s.iconSize,
            borderRadius: "50%",
            background: c.iconBg,
            border: `1px solid ${c.border}`,
            margin: "0 auto 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: c.icon,
            fontSize: s.iconFontSize,
          }}
        >
          {icon}
        </div>
      )}
      <h3
        style={{
          fontSize: s.titleSize,
          fontWeight: 500,
          color: "#f0f0f0",
          margin: "0 0 8px",
          lineHeight: 1.4,
          letterSpacing: "-0.2px",
        }}
      >
        {title}
      </h3>
      {description && (
        <p
          style={{
            fontSize: s.descSize,
            color: "#888888",
            margin: "0 auto",
            lineHeight: 1.6,
            maxWidth: 360,
          }}
        >
          {description}
        </p>
      )}
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
                color: "#888888",
                border: "1px solid #2a2a2a",
                borderRadius: 6,
                padding: "8px 16px",
                fontSize: 13,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "color 0.15s, border-color 0.15s, background 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#f0f0f0";
                e.currentTarget.style.borderColor = "#3a3a3a";
                e.currentTarget.style.background = "#1a1a1a";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#888888";
                e.currentTarget.style.borderColor = "#2a2a2a";
                e.currentTarget.style.background = "transparent";
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
                transition: "background 0.15s, transform 0.1s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#e8e8e8"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#f0f0f0"; }}
            >
              {primaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

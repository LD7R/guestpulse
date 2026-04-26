"use client";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

const SIZES = {
  sm: { dot: 6, text: 13, gap: 6 },
  md: { dot: 8, text: 15, gap: 8 },
  lg: { dot: 10, text: 18, gap: 10 },
} as const;

export default function Logo({ size = "md", showText = true }: LogoProps) {
  const s = SIZES[size];
  return (
    <>
      <style>{`
        @keyframes gpDotBlink {
          0%, 100% {
            opacity: 1;
            box-shadow: 0 0 8px rgba(74, 222, 128, 0.5);
          }
          50% {
            opacity: 0.55;
            box-shadow: 0 0 4px rgba(74, 222, 128, 0.3);
          }
        }
      `}</style>
      <div style={{ display: "inline-flex", alignItems: "center", gap: s.gap }}>
        <div
          style={{
            width: s.dot,
            height: s.dot,
            borderRadius: "50%",
            background: "#4ade80",
            boxShadow: "0 0 8px rgba(74, 222, 128, 0.5)",
            animation: "gpDotBlink 2s ease-in-out infinite",
            flexShrink: 0,
          }}
        />
        {showText && (
          <span
            style={{
              fontSize: s.text,
              fontWeight: 600,
              color: "#f0f0f0",
              letterSpacing: "-0.2px",
            }}
          >
            GuestPulse
          </span>
        )}
      </div>
    </>
  );
}

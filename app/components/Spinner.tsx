"use client";

export default function Spinner({
  size = 14,
  color = "#0d0d0d",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes gpSpin { to { transform: rotate(360deg); } }
      ` }} />
      <span
        style={{
          display: "inline-block",
          width: size,
          height: size,
          border: `2px solid transparent`,
          borderTopColor: color,
          borderRadius: "50%",
          animation: "gpSpin 0.6s linear infinite",
          flexShrink: 0,
          verticalAlign: "middle",
        }}
        aria-hidden="true"
      />
    </>
  );
}

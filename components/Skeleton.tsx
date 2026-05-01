import type { CSSProperties } from "react";

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: number;
  style?: CSSProperties;
}

export function Skeleton({
  width = "100%",
  height = 16,
  borderRadius = 4,
  style = {},
}: SkeletonProps) {
  return (
    <div
      className="gp-skeleton"
      style={{
        width,
        height,
        borderRadius,
        flexShrink: 0,
        ...style,
      }}
    />
  );
}

export function SkeletonStatCard() {
  return (
    <div
      style={{
        background: "#141414",
        border: "1px solid #1e1e1e",
        borderRadius: 8,
        padding: "16px 20px",
      }}
    >
      <Skeleton width={70} height={10} style={{ marginBottom: 12 }} />
      <Skeleton width="50%" height={28} style={{ marginBottom: 8 }} />
      <Skeleton width="70%" height={11} />
    </div>
  );
}

export function SkeletonReviewCard() {
  return (
    <div
      style={{
        background: "#141414",
        border: "1px solid #1e1e1e",
        borderRadius: 8,
        padding: "14px 18px",
        marginBottom: 8,
      }}
    >
      <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
        <Skeleton width={70} height={18} borderRadius={100} />
        <Skeleton width={80} height={14} />
        <Skeleton width={60} height={14} />
      </div>
      <Skeleton width="92%" height={13} style={{ marginBottom: 6 }} />
      <Skeleton width="78%" height={13} style={{ marginBottom: 6 }} />
      <Skeleton width="65%" height={13} style={{ marginBottom: 14 }} />
      <div style={{ display: "flex", gap: 8 }}>
        <Skeleton width={80} height={28} borderRadius={6} />
        <Skeleton width={100} height={28} borderRadius={6} />
      </div>
    </div>
  );
}

export function SkeletonCard({ height = 120 }: { height?: number }) {
  return (
    <div
      style={{
        background: "#141414",
        border: "1px solid #1e1e1e",
        borderRadius: 8,
        padding: 16,
      }}
    >
      <Skeleton width={80} height={11} style={{ marginBottom: 12 }} />
      <Skeleton width="60%" height={28} style={{ marginBottom: 8 }} />
      <Skeleton width="40%" height={11} style={{ marginBottom: height > 120 ? 16 : 0 }} />
    </div>
  );
}

export function SkeletonChart({ height = 240 }: { height?: number }) {
  return (
    <div
      style={{
        background: "#141414",
        border: "1px solid #1e1e1e",
        borderRadius: 8,
        padding: 16,
      }}
    >
      <Skeleton width={120} height={11} style={{ marginBottom: 16 }} />
      <Skeleton width="100%" height={height - 60} borderRadius={4} />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div
      style={{
        background: "#141414",
        border: "1px solid #1e1e1e",
        borderRadius: 8,
        padding: 12,
      }}
    >
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            gap: 12,
            padding: "8px 0",
            borderBottom: i < rows - 1 ? "1px solid #1e1e1e" : "none",
          }}
        >
          <Skeleton width={120} height={14} />
          <Skeleton width={80} height={14} />
          <Skeleton width={60} height={14} />
          <Skeleton width={100} height={14} />
        </div>
      ))}
    </div>
  );
}

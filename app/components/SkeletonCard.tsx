"use client";

export default function SkeletonCard({
  height = 80,
  className,
}: {
  height?: number;
  className?: string;
}) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes gpShimmer {
          0% { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
      ` }} />
      <div
        className={className}
        style={{
          height,
          borderRadius: 8,
          background: "linear-gradient(90deg, #141414 25%, #1e1e1e 50%, #141414 75%)",
          backgroundSize: "800px 100%",
          animation: "gpShimmer 1.6s ease-in-out infinite",
          border: "1px solid #1e1e1e",
        }}
      />
    </>
  );
}

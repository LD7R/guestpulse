export function getRatingColor(rating: number) {
  if (rating >= 4.5) return "#22c55e";
  if (rating >= 4.0) return "#84cc16";
  if (rating >= 3.5) return "#f59e0b";
  if (rating >= 3.0) return "#f97316";
  return "#ef4444";
}

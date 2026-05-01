export const formatNumber = (n: number | null | undefined): string => {
  if (n === null || n === undefined || isNaN(n as number)) return "—";
  return n.toLocaleString("en-US");
};

export const formatRating = (n: number | null | undefined): string => {
  if (n === null || n === undefined || isNaN(n as number)) return "—";
  return n.toFixed(1);
};

export const formatPercent = (n: number | null | undefined, decimals = 0): string => {
  if (n === null || n === undefined || isNaN(n as number)) return "—";
  return `${n.toFixed(decimals)}%`;
};

export const formatCurrency = (
  n: number | null | undefined,
  currency = "USD",
  locale = "en-US"
): string => {
  if (n === null || n === undefined || isNaN(n as number)) return "—";
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(n);
};

export const formatDate = (
  date: string | Date | null | undefined
): string => {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

export const formatFullDate = (
  date: string | Date | null | undefined
): string => {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

export const formatStars = (rating: number | null | undefined): string => {
  if (rating === null || rating === undefined || isNaN(rating as number)) return "—";
  const full = Math.floor(rating);
  const half = rating - full >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return "★".repeat(full) + (half ? "½" : "") + "☆".repeat(empty);
};

export const formatRelativeDate = (date: string | Date | null | undefined): string => {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
};

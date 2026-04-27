// In-memory rate limiter — works for single-region Vercel.
// Replace Map with Upstash Redis for multi-region deployments.

const requests = new Map<string, number[]>();

export function rateLimit(
  identifier: string,
  maxRequests = 10,
  windowMs = 60_000,
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const prev = requests.get(identifier) ?? [];
  const recent = prev.filter((t) => now - t < windowMs);

  if (recent.length >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  recent.push(now);
  requests.set(identifier, recent);
  return { allowed: true, remaining: maxRequests - recent.length };
}

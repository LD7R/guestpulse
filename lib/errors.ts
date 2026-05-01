const ERROR_MAP: Record<string, string> = {
  // Auth
  "Invalid login credentials": "Incorrect email or password.",
  "Email not confirmed": "Please verify your email before signing in.",
  "User already registered": "An account with this email already exists.",
  "Password should be at least 6 characters": "Password must be at least 6 characters.",
  "Token has expired or is invalid": "Your session has expired. Please sign in again.",
  // Network
  "Failed to fetch": "Network error — check your connection and try again.",
  NetworkError: "Network error — check your connection and try again.",
  // Supabase / Postgres
  "JWT expired": "Your session has expired. Please sign in again.",
  "new row violates row-level security": "You don't have permission to do that.",
  "duplicate key value violates unique constraint": "That value already exists.",
  "violates not-null constraint": "A required field is missing.",
  // Scraping
  "No URL configured": "No URL has been set for this platform.",
  "Actor run failed": "The scraper failed — the site may be blocking requests. Try again later.",
  "Apify API error": "Scraping service error — please try again.",
  // Rate limits
  "Too many requests": "Too many requests. Please wait a moment and try again.",
  "rate limit": "Rate limit exceeded. Please wait before retrying.",
};

export function friendlyError(err: unknown): string {
  if (!err) return "An unexpected error occurred.";

  const message =
    err instanceof Error
      ? err.message
      : typeof err === "string"
      ? err
      : typeof err === "object" && err !== null && "message" in err
      ? String((err as { message: unknown }).message)
      : String(err);

  // Check exact matches first
  if (ERROR_MAP[message]) return ERROR_MAP[message];

  // Check partial matches
  for (const [key, friendly] of Object.entries(ERROR_MAP)) {
    if (message.toLowerCase().includes(key.toLowerCase())) return friendly;
  }

  // Strip noisy prefixes
  const cleaned = message
    .replace(/^Error:\s*/i, "")
    .replace(/^Unhandled error:\s*/i, "")
    .trim();

  return cleaned || "An unexpected error occurred.";
}

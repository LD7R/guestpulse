/** Parse @lat,lng from a Google Maps URL (share / place links). */
export function extractCoordsFromGoogleMapsUrl(
  url: string | null | undefined,
): { latitude: number; longitude: number } | null {
  const u = url?.trim();
  if (!u) return null;
  const match = u.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (!match) return null;
  return { latitude: parseFloat(match[1]!), longitude: parseFloat(match[2]!) };
}

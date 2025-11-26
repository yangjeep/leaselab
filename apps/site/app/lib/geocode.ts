export type GeocodeResult = { lat: number; lng: number } | null;

// Simple in-memory cache to avoid duplicate requests
const cache = new Map<string, GeocodeResult>();

export async function geocodeAddress(address: string, apiKey?: string): Promise<GeocodeResult> {
  if (!address) return null;
  const key = address.toLowerCase().trim();
  if (cache.has(key)) return cache.get(key) as GeocodeResult;

  if (!apiKey) return null;

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const result = data?.results?.[0]?.geometry?.location;
    const value: GeocodeResult = result ? { lat: result.lat, lng: result.lng } : null;
    cache.set(key, value);
    return value;
  } catch (e) {
    return null;
  }
}

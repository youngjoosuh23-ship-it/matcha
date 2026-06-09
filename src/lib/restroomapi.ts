import { authFetch } from './authFetch';

const OVERPASS_FALLBACKS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

async function overpassQuery(query: string): Promise<any> {
  const body = `data=${encodeURIComponent(query)}`;
  const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };

  try {
    const res = await authFetch('/overpass', { method: 'POST', headers, body, signal: AbortSignal.timeout(20000) });
    if (res.ok) return await res.json();
  } catch { /* fallthrough */ }

  for (const url of OVERPASS_FALLBACKS) {
    try {
      const res = await fetch(url, { method: 'POST', headers, body, signal: AbortSignal.timeout(20000) });
      if (!res.ok) continue;
      return await res.json();
    } catch {
      // 다음 시도
    }
  }
  throw new Error('All Overpass endpoints failed');
}

export interface Restroom {
  id: number;
  location: { lat: number; lng: number };
  name?: string;
  openingHours?: string;
  access?: string;
  fee?: string;
}

function tagValue(tags: Record<string, string>, key: string): string | undefined {
  return tags[key] || undefined;
}

export async function fetchNearbyRestrooms(bounds: {
  swLat: number; swLng: number; neLat: number; neLng: number;
}): Promise<Restroom[]> {
  const bbox = `${bounds.swLat},${bounds.swLng},${bounds.neLat},${bounds.neLng}`;
  const query = `[out:json];node["amenity"="toilets"](${bbox});out body;`;
  const json = await overpassQuery(query);
  const elements: Array<{ type: string; id: number; lat: number; lon: number; tags?: Record<string, string> }> =
    json.elements ?? [];
  return elements
    .filter(e => e.type === 'node')
    .map(e => ({
      id: e.id,
      location: { lat: e.lat, lng: e.lon },
      name: tagValue(e.tags ?? {}, 'name'),
      openingHours: tagValue(e.tags ?? {}, 'opening_hours'),
      access: tagValue(e.tags ?? {}, 'access'),
      fee: tagValue(e.tags ?? {}, 'fee'),
    }));
}

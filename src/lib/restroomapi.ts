const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

export interface Restroom {
  id: number;
  location: { lat: number; lng: number };
  name?: string;
  openingHours?: string;
  access?: string; // 'yes' | 'customers' | 'private' | ...
  fee?: string;
}

function tagValue(tags: Record<string, string>, key: string): string | undefined {
  return tags[key] || undefined;
}

export async function fetchNearbyRestrooms(bounds: {
  swLat: number; swLng: number; neLat: number; neLng: number;
}): Promise<Restroom[]> {
  // Overpass bbox format: (south, west, north, east)
  const bbox = `${bounds.swLat},${bounds.swLng},${bounds.neLat},${bounds.neLng}`;
  const query = `[out:json];node["amenity"="toilets"](${bbox});out body;`;

  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  });

  const json = await res.json();
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

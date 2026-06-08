const OVERPASS_ENDPOINTS = [
  '/overpass',
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

async function overpassQuery(query: string): Promise<any> {
  for (const url of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(25000),
      });
      if (!res.ok) continue;
      return await res.json();
    } catch (e) {
      console.warn(`[overpass] ${url} failed:`, e);
    }
  }
  throw new Error('All Overpass endpoints failed');
}

export interface Attraction {
  id: string;
  location: { lat: number; lng: number };
  name?: string;
  tagType: string;   // tourism 또는 historic 값
  category: 'tourism' | 'historic';
  website?: string;
  wikipedia?: string;
  openingHours?: string;
}

const TOURISM_TYPES = 'museum|viewpoint|theme_park|attraction|gallery|zoo|aquarium';
const HISTORIC_TYPES = 'castle|fort|monument|palace|temple|shrine|ruins|archaeological_site|memorial';

export function attractionEmoji(tagType: string): string {
  switch (tagType) {
    case 'museum':               return '🏛️';
    case 'viewpoint':            return '🔭';
    case 'gallery':              return '🎨';
    case 'artwork':              return '🖼️';
    case 'theme_park':           return '🎡';
    case 'castle': case 'fort': case 'palace': return '🏯';
    case 'temple': case 'shrine': return '⛩️';
    case 'ruins': case 'archaeological_site': return '🏛️';
    case 'memorial':             return '🕊️';
    case 'monument':             return '🗿';
    case 'zoo':                  return '🦁';
    case 'aquarium':             return '🐟';
    case 'buddhism': case 'confucian': return '🛕';
    default:                     return '⭐';
  }
}

function parseElement(
  el: { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }
): Attraction | null {
  const tags = el.tags ?? {};
  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  if (!lat || !lon) return null;

  const tourismVal = tags.tourism ?? '';
  const historicVal = tags.historic ?? '';
  const amenityVal = tags.amenity === 'place_of_worship' ? (tags.religion ?? 'worship') : '';
  const tagType = tourismVal || historicVal || amenityVal;
  const category: 'tourism' | 'historic' = historicVal || amenityVal ? 'historic' : 'tourism';

  return {
    id: `${el.type}-${el.id}`,
    location: { lat, lng: lon },
    name: tags.name || tags['name:ko'] || tags['name:en'] || undefined,
    tagType,
    category,
    website: tags.website || tags.url || undefined,
    wikipedia: tags.wikipedia || tags['wikipedia:ko'] || undefined,
    openingHours: tags.opening_hours || undefined,
  };
}

export async function fetchNearbyAttractions(bounds: {
  swLat: number; swLng: number; neLat: number; neLng: number;
}): Promise<Attraction[]> {
  const bbox = `${bounds.swLat},${bounds.swLng},${bounds.neLat},${bounds.neLng}`;
  const query = `
[out:json][timeout:25];
(
  node["tourism"~"^(${TOURISM_TYPES})$"]["name"](${bbox});
  way["tourism"~"^(${TOURISM_TYPES})$"]["name"](${bbox});
  relation["tourism"~"^(${TOURISM_TYPES})$"]["name"](${bbox});
  node["historic"~"^(${HISTORIC_TYPES})$"]["name"](${bbox});
  way["historic"~"^(${HISTORIC_TYPES})$"]["name"](${bbox});
  relation["historic"~"^(${HISTORIC_TYPES})$"]["name"](${bbox});
  node["amenity"="place_of_worship"]["name"]["religion"~"^(buddhism|confucian|shinto)$"](${bbox});
  way["amenity"="place_of_worship"]["name"]["religion"~"^(buddhism|confucian|shinto)$"](${bbox});
  relation["amenity"="place_of_worship"]["name"]["religion"~"^(buddhism|confucian|shinto)$"](${bbox});
);
out center tags;`.trim();

  const json = await overpassQuery(query);
  const results = (json.elements ?? []).map(parseElement).filter(Boolean) as Attraction[];
  console.log(`[attractions] fetched ${results.length} from bbox ${bbox}`);
  return results;
}

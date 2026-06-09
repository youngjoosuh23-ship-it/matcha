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

// 항상 표시 (특정 시설)
const TOURISM_NOTABLE = 'museum|theme_park|gallery|zoo|aquarium';
const HISTORIC_NOTABLE = 'castle|fort|palace|temple|shrine|ruins|archaeological_site';
const MARKETPLACE = 'marketplace';
// wikipedia/wikidata 있을 때만 표시 (범용 태그)
const TOURISM_FILTERED = 'viewpoint|attraction';
const HISTORIC_FILTERED = 'monument|memorial';

export function attractionEmoji(tagType: string): string {
  switch (tagType) {
    case 'museum':               return '🏛️';
    case 'viewpoint':            return '🔭';
    case 'gallery':              return '🎨';
    case 'artwork':              return '🖼️';
    case 'theme_park':           return '🎡';
    case 'castle': case 'fort': case 'palace': return '🏰';
    case 'temple': case 'shrine': return '🪷';
    case 'ruins': case 'archaeological_site': return '🏛️';
    case 'memorial':             return '🕊️';
    case 'monument':             return '🗿';
    case 'zoo':                  return '🦁';
    case 'aquarium':             return '🐟';
    case 'buddhism': case 'confucian': return '🪷';
    case 'marketplace':            return '🏪';
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
  const amenityVal = tags.amenity === 'place_of_worship' ? (tags.religion ?? 'worship')
    : tags.amenity === 'marketplace' ? 'marketplace'
    : '';
  const tagType = tourismVal || historicVal || amenityVal;
  const category: 'tourism' | 'historic' = historicVal || amenityVal === 'marketplace' ? 'historic' : amenityVal ? 'historic' : 'tourism';

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
  node["tourism"~"^(${TOURISM_NOTABLE})$"]["name"][!"disused:tourism"][!"abandoned:tourism"]["disused"!="yes"](${bbox});
  way["tourism"~"^(${TOURISM_NOTABLE})$"]["name"][!"disused:tourism"][!"abandoned:tourism"]["disused"!="yes"](${bbox});
  relation["tourism"~"^(${TOURISM_NOTABLE})$"]["name"][!"disused:tourism"][!"abandoned:tourism"]["disused"!="yes"](${bbox});
  node["historic"~"^(${HISTORIC_NOTABLE})$"]["name"][!"disused:historic"]["disused"!="yes"](${bbox});
  way["historic"~"^(${HISTORIC_NOTABLE})$"]["name"][!"disused:historic"]["disused"!="yes"](${bbox});
  relation["historic"~"^(${HISTORIC_NOTABLE})$"]["name"][!"disused:historic"]["disused"!="yes"](${bbox});
  node["tourism"~"^(${TOURISM_FILTERED})$"]["name"]["wikidata"][!"disused:tourism"]["disused"!="yes"](${bbox});
  way["tourism"~"^(${TOURISM_FILTERED})$"]["name"]["wikidata"][!"disused:tourism"]["disused"!="yes"](${bbox});
  relation["tourism"~"^(${TOURISM_FILTERED})$"]["name"]["wikidata"][!"disused:tourism"]["disused"!="yes"](${bbox});
  node["historic"~"^(${HISTORIC_FILTERED})$"]["name"]["wikidata"][!"disused:historic"]["disused"!="yes"](${bbox});
  way["historic"~"^(${HISTORIC_FILTERED})$"]["name"]["wikidata"][!"disused:historic"]["disused"!="yes"](${bbox});
  relation["historic"~"^(${HISTORIC_FILTERED})$"]["name"]["wikidata"][!"disused:historic"]["disused"!="yes"](${bbox});
  node["amenity"="place_of_worship"]["name"]["religion"~"^(buddhism|confucian|shinto)$"]["disused"!="yes"](${bbox});
  way["amenity"="place_of_worship"]["name"]["religion"~"^(buddhism|confucian|shinto)$"]["disused"!="yes"](${bbox});
  relation["amenity"="place_of_worship"]["name"]["religion"~"^(buddhism|confucian|shinto)$"]["disused"!="yes"](${bbox});
  node["amenity"="${MARKETPLACE}"]["name"]["disused"!="yes"](${bbox});
  way["amenity"="${MARKETPLACE}"]["name"]["disused"!="yes"](${bbox});
  relation["amenity"="${MARKETPLACE}"]["name"]["disused"!="yes"](${bbox});
);
out center tags;`.trim();

  const json = await overpassQuery(query);
  const results = (json.elements ?? []).map(parseElement).filter(Boolean) as Attraction[];
  console.log(`[attractions] fetched ${results.length} from bbox ${bbox}`);
  return results;
}

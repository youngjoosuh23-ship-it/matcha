import { authFetch } from './authFetch';

const BASE = '/cultureapi/B553457/cultureinfo';

export interface CultureEvent {
  seq: string;
  title: string;
  startDate: string; // 'YYYYMMDD'
  endDate: string;
  place: string;
  area: string;
  sigungu?: string;
  realmName: string;
  thumbnail?: string;
  location: { lat: number; lng: number };
}

function extractItems(xml: string): Record<string, string>[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');
  const items = Array.from(doc.querySelectorAll('item'));
  return items.map(item => {
    const obj: Record<string, string> = {};
    item.childNodes.forEach(node => {
      if (node.nodeType === 1) obj[(node as Element).tagName] = node.textContent ?? '';
    });
    return obj;
  });
}

function toEvent(item: Record<string, string>): CultureEvent {
  return {
    seq: item.seq ?? '',
    title: item.title ?? '',
    startDate: item.startDate ?? '',
    endDate: item.endDate ?? '',
    place: item.place ?? '',
    area: item.area ?? '',
    sigungu: item.sigungu || undefined,
    realmName: item.realmName ?? '',
    thumbnail: item.thumbnail || undefined,
    location: {
      lat: parseFloat(item.gpsY ?? '0'),
      lng: parseFloat(item.gpsX ?? '0'),
    },
  };
}

// 지도 바운딩박스 + 날짜 기반 문화행사 조회
export async function fetchCultureEvents(
  bounds: { swLat: number; swLng: number; neLat: number; neLng: number }
): Promise<CultureEvent[]> {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const yearEnd = `${new Date().getFullYear()}1231`;

  const params = new URLSearchParams({
    numOfRows: '30',
    pageNo: '1',
    from: today,
    to: yearEnd,
    gpsxfrom: String(bounds.swLng),
    gpsyfrom: String(bounds.swLat),
    gpsxto: String(bounds.neLng),
    gpsyto: String(bounds.neLat),
    sortStdr: '1',
  });

  const res = await authFetch(`${BASE}/period2?${params.toString()}`);
  const xml = await res.text();
  return extractItems(xml)
    .filter(item => item.gpsX && item.gpsY && parseFloat(item.gpsX) !== 0)
    .map(toEvent);
}

const SERVICE_KEY = process.env.TOUR_API_KEY ?? '';
const BASE = '/tourapi/B551011/KorService2';

const COMMON_PARAMS = {
  MobileOS: 'ETC',
  MobileApp: 'Matcha',
  _type: 'json',
  serviceKey: SERVICE_KEY,
};

export interface TourPlace {
  contentId: string;
  contentTypeId: string; // '12'관광지 '14'문화시설 '39'음식점
  title: string;
  location: { lat: number; lng: number };
  addr1: string;
  tel?: string;
  firstimage?: string;
}

export interface TourFestival extends TourPlace {
  eventstartdate: string; // 'YYYYMMDD'
  eventenddate: string;
  eventplace?: string;
}

export interface TourDetail extends TourPlace {
  overview?: string;
  homepage?: string;
  booktour?: string;
}

function buildUrl(endpoint: string, extra: Record<string, string>): string {
  const params = new URLSearchParams({ ...COMMON_PARAMS, ...extra });
  return `${BASE}/${endpoint}?${params.toString()}`;
}

function toPlace(item: Record<string, string>): TourPlace {
  return {
    contentId: item.contentid,
    contentTypeId: item.contenttypeid,
    title: item.title,
    location: { lat: parseFloat(item.mapy), lng: parseFloat(item.mapx) },
    addr1: item.addr1 ?? '',
    tel: item.tel || undefined,
    firstimage: item.firstimage || undefined,
  };
}

function extractItems(json: unknown): Record<string, string>[] {
  const body = (json as any)?.response?.body;
  const items = body?.items?.item;
  if (!items) return [];
  return Array.isArray(items) ? items : [items];
}

// 위치 기반 주변 관광지/음식점 (contentTypeId 생략 시 관광지+음식점 병렬)
export async function fetchNearbyTourPlaces(
  lat: number,
  lng: number,
  radius = 1000,
  contentTypeId?: string
): Promise<TourPlace[]> {
  const baseExtra = {
    mapX: String(lng),
    mapY: String(lat),
    radius: String(radius),
    numOfRows: '30',
    pageNo: '1',
  };

  if (contentTypeId) {
    const res = await fetch(buildUrl('locationBasedList1', { ...baseExtra, contentTypeId }));
    const json = await res.json();
    return extractItems(json).map(toPlace);
  }

  const [res12, res39] = await Promise.all([
    fetch(buildUrl('locationBasedList1', { ...baseExtra, contentTypeId: '12' })),
    fetch(buildUrl('locationBasedList1', { ...baseExtra, contentTypeId: '39' })),
  ]);
  const [json12, json39] = await Promise.all([res12.json(), res39.json()]);
  return [...extractItems(json12), ...extractItems(json39)].map(toPlace);
}

// 위치 기반 주변 축제/행사
export async function fetchNearbyFestivals(
  lat: number,
  lng: number,
  radius = 5000
): Promise<TourFestival[]> {
  const today = new Date();
  const eventStartDate = today.toISOString().slice(0, 10).replace(/-/g, '');

  const url = buildUrl('searchFestival1', {
    mapX: String(lng),
    mapY: String(lat),
    radius: String(radius),
    eventStartDate,
    numOfRows: '20',
    pageNo: '1',
  });

  const res = await fetch(url);
  const json = await res.json();
  return extractItems(json).map((item) => ({
    ...toPlace(item),
    eventstartdate: item.eventstartdate ?? '',
    eventenddate: item.eventenddate ?? '',
    eventplace: item.eventplace || undefined,
  }));
}

// 관광지 상세정보
export async function fetchTourDetail(contentId: string): Promise<TourDetail> {
  const url = buildUrl('detailCommon1', {
    contentId,
    defaultYN: 'Y',
    firstImageYN: 'Y',
    addrinfoYN: 'Y',
    overviewYN: 'Y',
  });

  const res = await fetch(url);
  const json = await res.json();
  const items = extractItems(json);
  const item = items[0] ?? {};

  return {
    contentId: item.contentid ?? contentId,
    contentTypeId: item.contenttypeid ?? '',
    title: item.title ?? '',
    location: {
      lat: parseFloat(item.mapy ?? '0'),
      lng: parseFloat(item.mapx ?? '0'),
    },
    addr1: item.addr1 ?? '',
    tel: item.tel || undefined,
    firstimage: item.firstimage || undefined,
    overview: item.overview || undefined,
    homepage: item.homepage || undefined,
  };
}

// 날짜 포맷 헬퍼 (YYYYMMDD → YYYY.MM.DD)
export function formatTourDate(yyyymmdd: string): string {
  if (yyyymmdd.length !== 8) return yyyymmdd;
  return `${yyyymmdd.slice(0, 4)}.${yyyymmdd.slice(4, 6)}.${yyyymmdd.slice(6, 8)}`;
}

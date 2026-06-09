import { authFetch } from './authFetch';

const BASE = '/tourapi/B551011/KorService2';

const COMMON_PARAMS = {
  MobileOS: 'ETC',
  MobileApp: 'Matcha',
  _type: 'json',
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
    const res = await authFetch(buildUrl('locationBasedList2', { ...baseExtra, contentTypeId }));
    const json = await res.json();
    return extractItems(json).map(toPlace);
  }

  const res = await authFetch(buildUrl('locationBasedList2', { ...baseExtra, contentTypeId: '12' }));
  const json = await res.json();
  return extractItems(json).map(toPlace);
}

// contentId → { eventstartdate, eventenddate } 캐시
const festivalDateCache = new Map<string, { start: string; end: string }>();

async function fetchFestivalDates(contentId: string): Promise<{ start: string; end: string }> {
  if (festivalDateCache.has(contentId)) return festivalDateCache.get(contentId)!;
  try {
    const res = await authFetch(buildUrl('detailIntro2', { contentId, contentTypeId: '15' }));
    const json = await res.json();
    const item = extractItems(json)[0] ?? {};
    const dates = { start: item.eventstartdate ?? '', end: item.eventenddate ?? '' };
    festivalDateCache.set(contentId, dates);
    return dates;
  } catch {
    return { start: '', end: '' };
  }
}

// 위치 기반 주변 축제/행사
export async function fetchNearbyFestivals(
  lat: number,
  lng: number,
  radius = 5000
): Promise<TourFestival[]> {
  const url = buildUrl('locationBasedList2', {
    mapX: String(lng),
    mapY: String(lat),
    radius: String(radius),
    contentTypeId: '15',
    numOfRows: '20',
    pageNo: '1',
  });

  const res = await authFetch(url);
  const json = await res.json();
  const items = extractItems(json);

  // 날짜 정보 병렬 fetch (캐시 활용)
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const datesResults = await Promise.allSettled(items.map(item => fetchFestivalDates(item.contentid)));

  return items.reduce<TourFestival[]>((acc, item, i) => {
    const dates = datesResults[i].status === 'fulfilled' ? datesResults[i].value : { start: '', end: '' };
    if (dates.end && dates.end < today) return acc;
    acc.push({
      ...toPlace(item),
      eventstartdate: dates.start,
      eventenddate: dates.end,
      eventplace: item.eventplace || undefined,
    });
    return acc;
  }, []);
}

// 관광지 상세정보
export async function fetchTourDetail(contentId: string): Promise<TourDetail> {
  const url = buildUrl('detailCommon2', { contentId });

  const res = await authFetch(url);
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

export interface TourFestivalDetail {
  overview?: string;
  homepage?: string;
  sponsor1?: string;
  sponsor1tel?: string;
  playtime?: string;
  eventplace?: string;
  agelimit?: string;
  usetimefestival?: string;
  bookingplace?: string;
  program?: string;
  subevent?: string;
}

// 축제 상세 정보 (detailCommon2 + detailIntro2 병렬)
export async function fetchFestivalDetail(contentId: string): Promise<TourFestivalDetail> {
  const [commonRes, introRes] = await Promise.allSettled([
    authFetch(buildUrl('detailCommon2', { contentId })).then(r => r.json()),
    authFetch(buildUrl('detailIntro2', { contentId, contentTypeId: '15' })).then(r => r.json()),
  ]);

  const commonItem = commonRes.status === 'fulfilled' ? (extractItems(commonRes.value)[0] ?? {}) : {};
  const introItem = introRes.status === 'fulfilled' ? (extractItems(introRes.value)[0] ?? {}) : {};

  return {
    overview: commonItem.overview || undefined,
    homepage: commonItem.homepage || undefined,
    sponsor1: introItem.sponsor1 || undefined,
    sponsor1tel: introItem.sponsor1tel || undefined,
    playtime: introItem.playtime || undefined,
    eventplace: introItem.eventplace || undefined,
    agelimit: introItem.agelimit || undefined,
    usetimefestival: introItem.usetimefestival || undefined,
    bookingplace: introItem.bookingplace || undefined,
    program: introItem.program || undefined,
    subevent: introItem.subevent || undefined,
  };
}

// 날짜 포맷 헬퍼 (YYYYMMDD → YYYY.MM.DD)
export function formatTourDate(yyyymmdd: string): string {
  if (yyyymmdd.length !== 8) return yyyymmdd;
  return `${yyyymmdd.slice(0, 4)}.${yyyymmdd.slice(4, 6)}.${yyyymmdd.slice(6, 8)}`;
}

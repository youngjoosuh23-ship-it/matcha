import { authFetch } from './authFetch';

const BASE = '/fstvlapi/openapi/tn_pubr_public_cltur_fstvl_api';
const TTL = 60 * 60 * 1000; // 1시간
const cache = new Map<string, { data: PublicFestival[]; ts: number }>();

// 지역 축제(전국문화축제표준데이터) 일시 중지 (2026-11-17).
// api.data.go.kr가 서버 함수(Cloud Run)의 요청에 응답하지 않아 매번 50초 뒤 실패함.
// 다시 켜려면 true로 — 그 전에 목록을 파일로 받아 두는 방식 등으로 호출 경로를 바꿔야 함.
export const PUBLIC_FESTIVALS_ENABLED = false;

export interface PublicFestival {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  address: string;
  location: { lat: number; lng: number };
  organizer?: string;
  phone?: string;
  homepage?: string;
  description?: string;
}

async function fetchPage(pageNo: number): Promise<{ items: Record<string, string>[]; total: number }> {
  const params = new URLSearchParams({
    numOfRows: '500',
    pageNo: String(pageNo),
    type: 'json',
  });
  const res = await authFetch(`${BASE}?${params.toString()}`);
  if (!res.ok) return { items: [], total: 0 };
  const data = await res.json();
  const raw = data?.response?.body?.items ?? [];
  const total = parseInt(data?.response?.body?.totalCount ?? '0', 10);
  return { items: Array.isArray(raw) ? raw : [raw], total };
}

export async function fetchPublicFestivals(
  fromDate?: string,
  toDate?: string,
): Promise<PublicFestival[]> {
  if (!PUBLIC_FESTIVALS_ENABLED) return [];
  const key = `${fromDate ?? ''}|${toDate ?? ''}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < TTL) return hit.data;

  const { items: page1, total } = await fetchPage(1);
  let all = [...page1];

  if (total > 500) {
    const pages = Math.min(Math.ceil(total / 500), 4);
    const rest = await Promise.all(
      Array.from({ length: pages - 1 }, (_, i) => fetchPage(i + 2))
    );
    rest.forEach(p => all.push(...p.items));
  }

  const result = all
    .filter(item => item.latitude && item.longitude && parseFloat(item.latitude) !== 0)
    .map((item, i) => ({
      id: `${item.fstvlNm ?? ''}-${item.fstvlStartDate ?? ''}-${i}`,
      name: item.fstvlNm ?? '',
      startDate: item.fstvlStartDate ?? '',
      endDate: item.fstvlEndDate ?? '',
      address: item.rdnmadr ?? '',
      location: { lat: parseFloat(item.latitude), lng: parseFloat(item.longitude) },
      organizer: item.auspcInsttNm || undefined,
      phone: item.phoneNumber || undefined,
      homepage: item.homepageUrl || undefined,
      description: item.fstvlCo || undefined,
    }))
    .filter(f => {
      if (!fromDate && !toDate) return f.startDate >= new Date().toISOString().slice(0, 10);
      if (fromDate && f.endDate && f.endDate < fromDate) return false;
      if (toDate && f.startDate && f.startDate > toDate) return false;
      return true;
    });

  // 호출 실패(빈 응답)는 캐시하지 않음 — 다음 지도 이동 때 다시 시도
  if (all.length > 0) cache.set(key, { data: result, ts: Date.now() });
  return result;
}

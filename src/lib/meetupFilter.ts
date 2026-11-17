import type { Meetup, MeetupCategory } from '../types';

export type MeetupPeriod = 'today' | 'week' | 'weekend' | 'all';

export interface MeetupFilter {
  radiusKm: number | null;            // null = 전체
  period: MeetupPeriod;
  category: MeetupCategory | null;    // null = 전체
}

export const DEFAULT_MEETUP_FILTER: MeetupFilter = { radiusKm: null, period: 'week', category: null };

type LatLng = { lat: number; lng: number };

// ponytail: 평면 근사 (서울 위도 기준 경도 1도 ≈ 88km) — 반경 5km 필터에는 충분. HotplPanel과 같은 계산.
export function distKm(a: LatLng, b: LatLng) {
  const dlat = (a.lat - b.lat) * 111;
  const dlng = (a.lng - b.lng) * 88;
  return Math.sqrt(dlat * dlat + dlng * dlng);
}

const DAY_MS = 86400000;

// 오늘/이번 주/주말은 모두 "지금부터 7일" 안. 전체는 아직 안 끝난 모임 전부(최대 28일 뒤).
export function inPeriod(startMs: number, endMs: number, period: MeetupPeriod, now: Date) {
  const nowMs = now.getTime();
  if (endMs <= nowMs) return false;
  if (period === 'all') return true;
  if (startMs > nowMs + 7 * DAY_MS) return false;
  if (period === 'week') return true;
  if (period === 'today') {
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
    return startMs < endOfToday;   // 진행 중인 모임 포함
  }
  const day = new Date(startMs).getDay();
  return day === 0 || day === 6;
}

// center가 없으면(위치 권한 없음) 반경 필터는 적용하지 않음
export function filterMeetups(meetups: Meetup[], f: MeetupFilter, center: LatLng | null, now = new Date()) {
  return meetups.filter(m =>
    m.status === 'open'
    && inPeriod(m.startAt.toMillis(), m.endAt.toMillis(), f.period, now)
    && (!f.category || m.category === f.category)
    && (f.radiusKm === null || !center || distKm(m.location, center) <= f.radiusKm));
}

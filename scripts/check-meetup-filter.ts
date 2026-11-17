// 실행: npx tsx scripts/check-meetup-filter.ts
import assert from 'node:assert';
import { filterMeetups, inPeriod, distKm, DEFAULT_MEETUP_FILTER } from '../src/lib/meetupFilter';

const H = 3600e3, D = 24 * H;
const now = new Date(2026, 10, 17, 15, 0);            // 2026-11-17 (화) 15:00
const at = (y: number, mo: number, d: number, h: number) => new Date(y, mo, d, h).getTime();
const p = (start: number, period: 'today' | 'week' | 'weekend' | 'all', dur = 2 * H) => inPeriod(start, start + dur, period, now);

assert(p(at(2026, 10, 17, 19), 'today'), '오늘 저녁');
assert(p(at(2026, 10, 17, 14), 'today'), '진행 중(14~16시)');
assert(!p(at(2026, 10, 17, 10), 'today'), '이미 끝남');
assert(!p(at(2026, 10, 18, 0), 'today'), '내일 0시는 오늘 아님');
assert(p(at(2026, 10, 24, 14), 'week'), '7일 이내');
assert(!p(at(2026, 10, 24, 16), 'week'), '7일 초과');
assert(p(at(2026, 10, 21, 14), 'weekend'), '토요일');
assert(p(at(2026, 10, 22, 14), 'weekend'), '일요일');
assert(!p(at(2026, 10, 20, 19), 'weekend'), '금요일');
assert(!p(at(2026, 10, 28, 14), 'weekend'), '다음다음 주말(7일 초과)');
assert(p(at(2026, 11, 10, 14), 'all'), '전체: 3주 뒤');
assert(!p(at(2026, 10, 17, 10), 'all'), '전체: 이미 끝난 모임 제외');

const seoul = { lat: 37.5665, lng: 126.978 };
assert(Math.abs(distKm(seoul, { lat: 37.5755, lng: 126.978 }) - 1) < 0.01, '위도 0.009도 ≈ 1km');

const ts = (ms: number) => ({ toMillis: () => ms });
const m = (over: object) => ({
  status: 'open', category: 'reading', location: seoul,
  startAt: ts(now.getTime() + D), endAt: ts(now.getTime() + D + 2 * H), ...over,
}) as any;
const list = [
  m({ id: 'near' }),
  m({ id: 'far', location: { lat: 37.60, lng: 126.978 } }),          // 약 3.7km
  m({ id: 'study', category: 'study' }),
  m({ id: 'cancelled', status: 'cancelled' }),
];
const ids = (f: object, center: typeof seoul | null = seoul) =>
  filterMeetups(list, { ...DEFAULT_MEETUP_FILTER, ...f }, center, now).map(x => x.id).join(',');

assert.equal(ids({}), 'near,far,study', '기본: 취소된 모임만 제외');
assert.equal(ids({ radiusKm: 2 }), 'near,study', '반경 2km');
assert.equal(ids({ radiusKm: 5 }), 'near,far,study', '반경 5km');
assert.equal(ids({ category: 'study' }), 'study', '관심사');
assert.equal(ids({ radiusKm: 1 }, null), 'near,far,study', '위치 없으면 반경 무시');
console.log('meetup filter ok');

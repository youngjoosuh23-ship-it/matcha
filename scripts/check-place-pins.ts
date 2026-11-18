// 실행: npx tsx scripts/check-place-pins.ts
import assert from 'node:assert';
import { buildPlacePins, clusterPins } from '../src/lib/placePins';

const a = { lat: 37.5665, lng: 126.978 };          // 시청
const b = { lat: 37.5670, lng: 126.979 };          // 시청에서 약 100m
const c = { lat: 37.5563, lng: 126.9236 };         // 홍대, 약 5km

const pins = buildPlacePins(
  [
    { placeId: 'A', placeName: '카페A', location: a } as any,
    { placeId: 'A', placeName: '카페A', location: a } as any,
    { placeId: 'B', placeName: '카페B', location: b } as any,
  ],
  [{ placeId: 'A', placeName: '카페A', location: a } as any, { placeId: 'C', placeName: '카페C', location: c } as any],
  [{ placeId: 'B', locationName: '카페B', location: b } as any, { locationName: '장소 없음', location: c } as any],
);
const byId = Object.fromEntries(pins.map(p => [p.placeId, p]));
assert.equal(pins.length, 3, '장소 없는 번개는 핀이 되지 않음');
assert.deepEqual([byId.A.checkins, byId.A.meetups, byId.A.bolts], [2, 1, 0], '카페A: 체크인 2, 모임 1');
assert.deepEqual([byId.B.checkins, byId.B.meetups, byId.B.bolts], [1, 0, 1], '카페B: 체크인 1, 번개 1');
assert.deepEqual([byId.C.checkins, byId.C.meetups, byId.C.bolts], [0, 1, 0], '카페C: 모임 1');

const sizes = (zoom: number) => clusterPins(pins, zoom).map(c => c.pins.length).sort().join(',');
assert.equal(sizes(18), '1,1,1', '줌 18: 100m 떨어진 두 카페도 따로');
assert.equal(sizes(13), '1,2', '줌 13: 시청 두 곳은 묶이고 홍대는 따로');
assert.equal(sizes(9), '3', '줌 9: 전부 하나로');
const merged = clusterPins(pins, 13).find(c => c.pins.length === 2)!;
assert(Math.abs(merged.location.lat - (a.lat + b.lat) / 2) < 1e-9, '클러스터 위치는 평균');
console.log('place pins ok');

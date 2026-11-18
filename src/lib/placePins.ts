import type { CheckIn, Event, Meetup } from '../types';

// "이 지역 카페 보기"와 상단 검색에 쓰는 장소 종류 (Places API Table A).
// 메뉴 구분보다 "앉아서 모일 수 있는 곳"이 기준이라 넓게 잡음.
export const CAFE_TYPES = ['cafe', 'coffee_shop', 'tea_house', 'bakery', 'dessert_shop'];

type LatLng = { lat: number; lng: number };

// 지도 핀 하나 = 장소 하나. 체크인·모임·번개를 placeId로 묶은 상태 배지.
export interface PlacePin {
  placeId: string;
  name: string;
  location: LatLng;
  checkins: number;
  meetups: number;
  bolts: number;   // 진행 중인 번개 (events 컬렉션)
}

// 세 목록은 이미 "지금 유효한 것"만 거른 상태로 넘길 것
export function buildPlacePins(checkins: CheckIn[], meetups: Meetup[], bolts: Event[]): PlacePin[] {
  const pins = new Map<string, PlacePin>();
  const pin = (placeId: string, name: string, location: LatLng) => {
    let p = pins.get(placeId);
    if (!p) pins.set(placeId, p = { placeId, name, location, checkins: 0, meetups: 0, bolts: 0 });
    return p;
  };
  for (const c of checkins) if (c.location) pin(c.placeId, c.placeName, c.location).checkins++;
  for (const m of meetups) pin(m.placeId, m.placeName, m.location).meetups++;
  for (const e of bolts) if (e.placeId) pin(e.placeId, e.locationName, e.location).bolts++;
  return [...pins.values()];
}

export interface PinCluster {
  key: string;
  location: LatLng;
  pins: PlacePin[];
}

// ponytail: 화면 픽셀 격자로 묶는 단순 클러스터링 — 핀이 수천 개가 되면 supercluster 같은 전용 라이브러리로 교체
export function clusterPins(pins: PlacePin[], zoom: number, cellPx = 56): PinCluster[] {
  const world = 256 * 2 ** zoom;
  const cells = new Map<string, PlacePin[]>();
  for (const p of pins) {
    const x = ((p.location.lng + 180) / 360) * world;
    const s = Math.sin((p.location.lat * Math.PI) / 180);
    const y = (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * world;
    const key = `${Math.floor(x / cellPx)}:${Math.floor(y / cellPx)}`;
    (cells.get(key) ?? cells.set(key, []).get(key)!).push(p);
  }
  return [...cells].map(([key, list]) => ({
    key,
    pins: list,
    location: {
      lat: list.reduce((s, p) => s + p.location.lat, 0) / list.length,
      lng: list.reduce((s, p) => s + p.location.lng, 0) / list.length,
    },
  }));
}

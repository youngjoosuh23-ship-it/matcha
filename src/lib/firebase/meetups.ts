import {
  collection, doc, addDoc, deleteDoc, updateDoc, arrayUnion, arrayRemove, deleteField,
  onSnapshot, query, where, Timestamp, serverTimestamp,
} from 'firebase/firestore';
import { db } from './config';
import type { Meetup, MeetupCategory, UserProfile } from '../../types';

const DAY_MS = 86400 * 1000;
// Google 좌표 캐시 30일 제한: startAt ≤ 생성+28일, 진행 ≤ 12시간, TTL 삭제(purgeAt) ≤ 생성+29일
// (TTL 실제 삭제는 최대 24시간 지연 → 30일 안에 삭제됨). 규칙(firestore.rules)과 같은 값.
export const MEETUP_MAX_START_DAYS = 28;
export const MEETUP_MAX_DURATION_HOURS = 12;
const PURGE_AFTER_MS = 29 * DAY_MS - 60 * 1000; // 시계 오차 여유 1분

export interface NewMeetup {
  placeId: string;
  placeName: string;
  // TODO(3단계): 행정안전부 도로명주소 API 프록시로 주소→좌표 변환해서 저장하도록 전환 (Google 좌표 저장 제거)
  location: { lat: number; lng: number };
  category: MeetupCategory;
  title: string;
  description: string;
  startAt: Date;
  durationHours: number;
  capacity: number;
}

export const createMeetup = async (host: UserProfile, m: NewMeetup): Promise<string> => {
  const ref = await addDoc(collection(db, 'meetups'), {
    hostId: host.uid,
    hostName: host.displayName,
    hostPhoto: host.photoURL,
    placeId: m.placeId,
    placeName: m.placeName,
    location: m.location,
    category: m.category,
    title: m.title,
    description: m.description,
    startAt: Timestamp.fromDate(m.startAt),
    endAt: Timestamp.fromDate(new Date(m.startAt.getTime() + m.durationHours * 3600 * 1000)),
    capacity: m.capacity,
    participantIds: [host.uid],
    participants: { [host.uid]: { name: host.displayName, photo: host.photoURL } },
    status: 'open',
    createdAt: serverTimestamp(),
    purgeAt: Timestamp.fromDate(new Date(Date.now() + PURGE_AFTER_MS)),
  });
  return ref.id;
};

// arrayUnion은 배열 끝에 추가 → 신청 순서 유지
export const joinMeetup = (meetupId: string, me: UserProfile) =>
  updateDoc(doc(db, 'meetups', meetupId), {
    participantIds: arrayUnion(me.uid),
    [`participants.${me.uid}`]: { name: me.displayName, photo: me.photoURL },
  });

// 본인 취소와 호스트의 강제 제외 모두 이 함수 — 대기 1번은 자동으로 확정으로 올라감
export const leaveMeetup = (meetupId: string, uid: string) =>
  updateDoc(doc(db, 'meetups', meetupId), {
    participantIds: arrayRemove(uid),
    [`participants.${uid}`]: deleteField(),
  });

export const updateMeetup = (
  meetupId: string,
  fields: Partial<Pick<Meetup, 'title' | 'description' | 'capacity' | 'status'>>,
) => updateDoc(doc(db, 'meetups', meetupId), fields);

export const deleteMeetup = (meetupId: string) => deleteDoc(doc(db, 'meetups', meetupId));

export const confirmedIds = (m: Meetup) => m.participantIds.slice(0, m.capacity);
export const waitlistIds = (m: Meetup) => m.participantIds.slice(m.capacity);

// 지도용: 아직 안 끝난 모임 전부 (≤ 약 28일치). 반경/기간/카테고리 필터는 클라이언트에서.
// ponytail: 전체 구독 — 모임이 수천 개 넘으면 geohash 범위 쿼리로 전환
export const subscribeToUpcomingMeetups = (callback: (meetups: Meetup[]) => void) => {
  const q = query(collection(db, 'meetups'), where('endAt', '>', Timestamp.now()));
  return onSnapshot(
    q,
    (snap) => callback(snap.docs
      .map(d => ({ id: d.id, ...d.data() } as Meetup))
      .filter(m => m.status === 'open')),
    (err) => console.error('meetups subscription error:', err),
  );
};

export const subscribeToMeetupsByPlace = (placeId: string, callback: (meetups: Meetup[]) => void) => {
  const q = query(collection(db, 'meetups'), where('placeId', '==', placeId));
  return onSnapshot(
    q,
    (snap) => {
      const now = Date.now();
      callback(snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Meetup))
        .filter(m => m.status === 'open' && (m.endAt?.toDate?.()?.getTime() ?? 0) > now)
        .sort((a, b) => a.startAt.toMillis() - b.startAt.toMillis()));
    },
    (err) => console.error('meetups/place subscription error:', err),
  );
};

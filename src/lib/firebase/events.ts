import {
  collection, doc, deleteDoc, updateDoc, arrayUnion, arrayRemove, writeBatch,
  onSnapshot, query, where, Timestamp, orderBy, increment, serverTimestamp,
} from 'firebase/firestore';
import { db } from './config';
import type { Event, PlaceStat } from '../../types';

export const createEvent = async (
  creatorId: string,
  creatorName: string,
  creatorPhoto: string,
  title: string,
  description: string,
  location: { lat: number; lng: number },
  locationName: string,
  radiusKm: number,
  durationHours: number,
  placeId?: string,
): Promise<string> => {
  const now = Timestamp.now();
  const endAt = Timestamp.fromDate(new Date(Date.now() + durationHours * 3600 * 1000));
  const ref = doc(collection(db, 'events'));
  const batch = writeBatch(db);
  batch.set(ref, {
    creatorId,
    creatorName,
    creatorPhoto,
    title,
    description,
    location,
    locationName: locationName.slice(0, 100),
    ...(placeId ? { placeId } : {}),
    radiusKm,
    startAt: now,
    endAt,
    attendees: [creatorId],
    attendeeNames: { [creatorId]: creatorName },
    attendeePhotos: { [creatorId]: creatorPhoto },
    createdAt: now,
  });

  // placeStats에는 Google 장소 데이터(이름/좌표)를 저장하지 않음 — 표시할 때 placeId로 실시간 조회.
  // 규칙이 "같은 batch에서 새 이벤트를 만들 때만 +1"을 강제하므로 반드시 이벤트와 함께 커밋.
  if (placeId) {
    batch.set(doc(db, 'placeStats', placeId), {
      placeId,
      totalEvents: increment(1),
      lastEventAt: serverTimestamp(),
      lastEventId: ref.id,
    }, { merge: true });
  }

  await batch.commit();
  return ref.id;
};

export const joinEvent = async (
  eventId: string,
  userId: string,
  userName: string,
  userPhoto: string,
): Promise<void> => {
  await updateDoc(doc(db, 'events', eventId), {
    attendees: arrayUnion(userId),
    [`attendeeNames.${userId}`]: userName,
    [`attendeePhotos.${userId}`]: userPhoto,
  });
};

export const leaveEvent = async (eventId: string, userId: string): Promise<void> => {
  await updateDoc(doc(db, 'events', eventId), { attendees: arrayRemove(userId) });
};

export const deleteEvent = async (eventId: string): Promise<void> => {
  await deleteDoc(doc(db, 'events', eventId));
};

export const subscribeToActiveEvents = (callback: (events: Event[]) => void) => {
  const q = query(
    collection(db, 'events'),
    where('endAt', '>', Timestamp.now()),
    orderBy('endAt', 'asc'),
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as Event)));
  });
};

export const subscribeToEventsByPlace = (placeId: string, callback: (events: Event[]) => void) => {
  const q = query(collection(db, 'events'), where('placeId', '==', placeId));
  return onSnapshot(q, (snap) => {
    const now = Date.now();
    const active = snap.docs
      .map(d => ({ id: d.id, ...d.data() } as Event))
      .filter(e => (e.endAt?.toDate?.()?.getTime() ?? 0) > now);
    callback(active);
  });
};

export const subscribeToRecentPlaceStats = (days: number, callback: (stats: PlaceStat[]) => void) => {
  const since = Timestamp.fromDate(new Date(Date.now() - days * 86400 * 1000));
  const q = query(
    collection(db, 'placeStats'),
    where('lastEventAt', '>=', since),
    orderBy('lastEventAt', 'desc'),
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => d.data() as PlaceStat));
  });
};

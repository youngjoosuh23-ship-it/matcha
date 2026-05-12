import {
  collection, doc, addDoc, deleteDoc, updateDoc, arrayUnion, arrayRemove,
  onSnapshot, query, where, Timestamp, orderBy,
} from 'firebase/firestore';
import { db } from './config';
import type { Event } from '../../types';

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
  const ref = await addDoc(collection(db, 'events'), {
    creatorId,
    creatorName,
    creatorPhoto,
    title,
    description,
    location,
    locationName,
    ...(placeId ? { placeId } : {}),
    radiusKm,
    startAt: now,
    endAt,
    attendees: [creatorId],
    attendeeNames: { [creatorId]: creatorName },
    attendeePhotos: { [creatorId]: creatorPhoto },
    createdAt: now,
  });
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

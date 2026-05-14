import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, where, Timestamp,
} from 'firebase/firestore';
import { db } from './config';
import type { Mark } from '../../types';

export const createMark = async (
  creatorId: string,
  creatorName: string,
  creatorPhoto: string,
  placeName: string,
  location: { lat: number; lng: number },
  memo: string,
  scheduledAt: Date | null,
  sharedWith: string[],
): Promise<string> => {
  const ref = await addDoc(collection(db, 'marks'), {
    creatorId,
    creatorName,
    creatorPhoto,
    placeName,
    location,
    memo: memo || '',
    ...(scheduledAt ? { scheduledAt: Timestamp.fromDate(scheduledAt) } : {}),
    visibility: sharedWith.length > 0 ? 'shared' : 'private',
    sharedWith,
    createdAt: Timestamp.now(),
  });
  return ref.id;
};

export const updateMark = async (
  markId: string,
  updates: Partial<Pick<Mark, 'memo' | 'scheduledAt' | 'sharedWith' | 'visibility'>>,
): Promise<void> => {
  await updateDoc(doc(db, 'marks', markId), {
    ...updates,
    ...(updates.sharedWith !== undefined
      ? { visibility: updates.sharedWith.length > 0 ? 'shared' : 'private' }
      : {}),
  });
};

export const deleteMark = async (markId: string): Promise<void> => {
  await deleteDoc(doc(db, 'marks', markId));
};

// My own marks
export const subscribeToMyMarks = (userId: string, callback: (marks: Mark[]) => void) => {
  const q = query(
    collection(db, 'marks'),
    where('creatorId', '==', userId),
  );
  return onSnapshot(q, (snap) => {
    const marks = snap.docs
      .map(d => ({ id: d.id, ...d.data() } as Mark))
      .sort((a, b) => (b.createdAt?.toDate?.()?.getTime() ?? 0) - (a.createdAt?.toDate?.()?.getTime() ?? 0));
    callback(marks);
  });
};

// Marks shared with me by others
export const subscribeToSharedMarks = (userId: string, callback: (marks: Mark[]) => void) => {
  const q = query(
    collection(db, 'marks'),
    where('sharedWith', 'array-contains', userId),
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as Mark)));
  });
};

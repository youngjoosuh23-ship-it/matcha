import { collection, addDoc, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from './config';
import type { Review } from '../../types';

// Reviews are stored in the 'feedback' collection with isReview: true
// so they're covered by the same Firestore security rules as feedback.
export const submitReview = async (review: Review) => {
  await addDoc(collection(db, 'feedback'), {
    ...review,
    isReview: true,
    createdAt: Timestamp.now(),
  });
};

export const subscribeToReviewsByPlace = (
  placeId: string,
  callback: (reviews: Review[]) => void
) => {
  const q = query(
    collection(db, 'feedback'),
    where('placeId', '==', placeId),
    where('isReview', '==', true)
  );
  return onSnapshot(q, (snap) => {
    const sorted = snap.docs
      .map(d => ({ id: d.id, ...d.data() } as Review))
      .sort((a, b) => {
        const at = a.createdAt?.toDate?.()?.getTime() ?? 0;
        const bt = b.createdAt?.toDate?.()?.getTime() ?? 0;
        return bt - at;
      });
    callback(sorted);
  }, (err) => console.error('subscribeToReviewsByPlace:', err));
};

export const subscribeToAllReviews = (callback: (reviews: Review[]) => void) => {
  const q = query(collection(db, 'feedback'), where('isReview', '==', true));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as Review)));
  }, (err) => console.error('subscribeToAllReviews:', err));
};

export const subscribeToReviewsByUser = (
  userId: string,
  callback: (reviews: Review[]) => void
) => {
  const q = query(
    collection(db, 'feedback'),
    where('toUserId', '==', userId),
    where('isReview', '==', true)
  );
  return onSnapshot(q, (snap) => {
    const sorted = snap.docs
      .map(d => ({ id: d.id, ...d.data() } as Review))
      .sort((a, b) => {
        const at = a.createdAt?.toDate?.()?.getTime() ?? 0;
        const bt = b.createdAt?.toDate?.()?.getTime() ?? 0;
        return bt - at;
      });
    callback(sorted);
  }, (err) => console.error('subscribeToReviewsByUser:', err));
};

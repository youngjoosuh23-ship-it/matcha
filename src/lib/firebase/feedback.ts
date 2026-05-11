import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from './config';
import type { Feedback } from '../../types';

export const submitFeedback = async (feedback: Feedback) => {
  await addDoc(collection(db, 'feedback'), {
    ...feedback,
    createdAt: Timestamp.now(),
  });
};

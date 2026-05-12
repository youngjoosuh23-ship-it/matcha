import { collection, addDoc, doc, updateDoc, deleteDoc, onSnapshot, query, where, Timestamp, type QuerySnapshot, type DocumentData } from 'firebase/firestore';
import { db } from './config';
import type { UserProfile, ChatRequest } from '../../types';

export const sendChatRequest = async (
  from: UserProfile,
  toUserId: string,
  toUserName: string,
  toUserPhoto: string,
  placeId: string,
  placeName: string,
  message: string
): Promise<string> => {
  const ref = await addDoc(collection(db, 'chat_requests'), {
    fromUserId: from.uid,
    fromUserName: from.displayName,
    fromUserPhoto: from.photoURL,
    toUserId,
    toUserName,
    toUserPhoto,
    placeId,
    placeName,
    status: 'pending',
    message,
    createdAt: Timestamp.now(),
    expiresAt: Timestamp.fromDate(new Date(Date.now() + 30 * 60 * 1000)),
  });
  return ref.id;
};

export const respondToRequest = async (
  request: ChatRequest,
  status: 'accepted' | 'declined',
  myProfile: UserProfile
): Promise<string | null> => {
  await updateDoc(doc(db, 'chat_requests', request.id), { status });

  if (status === 'accepted') {
    const chatRef = await addDoc(collection(db, 'chats'), {
      participants: [request.fromUserId, request.toUserId],
      placeId: request.placeId,
      placeName: request.placeName,
      requestId: request.id,
      createdAt: Timestamp.now(),
      expiresAt: Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000)),
      participantNames: {
        [request.fromUserId]: request.fromUserName,
        [request.toUserId]: myProfile.displayName,
      },
      participantPhotos: {
        [request.fromUserId]: request.fromUserPhoto,
        [request.toUserId]: myProfile.photoURL,
      },
    });
    return chatRef.id;
  }
  return null;
};

export const subscribeToIncomingRequests = (
  userId: string,
  callback: (requests: ChatRequest[]) => void
) => {
  const q = query(collection(db, 'chat_requests'), where('toUserId', '==', userId));
  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const requests = snapshot.docs
      .map(d => ({ id: d.id, ...d.data() } as ChatRequest))
      .filter(r => r.status === 'pending');
    callback(requests);
  }, (err) => console.error('subscribeToIncomingRequests:', err));
};

export const subscribeToSentRequests = (
  userId: string,
  callback: (requests: ChatRequest[]) => void
) => {
  const q = query(collection(db, 'chat_requests'), where('fromUserId', '==', userId));
  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const requests = snapshot.docs
      .map(d => ({ id: d.id, ...d.data() } as ChatRequest))
      .sort((a, b) => {
        const aTime = a.createdAt?.toDate?.()?.getTime() ?? 0;
        const bTime = b.createdAt?.toDate?.()?.getTime() ?? 0;
        return bTime - aTime;
      });
    callback(requests);
  }, (err) => console.error('subscribeToSentRequests:', err));
};

export const deleteChatRequest = async (requestId: string): Promise<void> => {
  await deleteDoc(doc(db, 'chat_requests', requestId));
};

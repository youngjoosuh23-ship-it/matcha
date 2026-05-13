import {
  doc, setDoc, updateDoc, deleteDoc, arrayUnion, arrayRemove,
  collection, addDoc, onSnapshot, query, where, orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from './config';
import type { OpenRoom, OpenMessage } from '../../types';

export const makeRoomId = (placeId: string, userId: string) => `${placeId}_${userId}`;

export const createOpenRoom = async (
  placeId: string,
  placeName: string,
  userId: string,
  userName: string,
  userPhoto: string,
  description?: string,
): Promise<void> => {
  const id = makeRoomId(placeId, userId);
  await setDoc(doc(db, 'openRooms', id), {
    id,
    placeId,
    placeName,
    creatorId: userId,
    creatorName: userName,
    creatorPhoto: userPhoto,
    description: description ?? '',
    members: [userId],
    memberNames: { [userId]: userName },
    memberPhotos: { [userId]: userPhoto },
    createdAt: Timestamp.now(),
  });
};

export const joinOpenRoom = async (
  roomId: string,
  userId: string,
  userName: string,
  userPhoto: string,
): Promise<void> => {
  await updateDoc(doc(db, 'openRooms', roomId), {
    members: arrayUnion(userId),
    [`memberNames.${userId}`]: userName,
    [`memberPhotos.${userId}`]: userPhoto,
  });
};

export const leaveOpenRoom = async (roomId: string, userId: string, isLast: boolean): Promise<void> => {
  if (isLast) {
    try {
      await deleteDoc(doc(db, 'openRooms', roomId));
      return;
    } catch {
      // delete permission not yet granted — fall through to member removal
    }
  }
  await updateDoc(doc(db, 'openRooms', roomId), { members: arrayRemove(userId) });
};

export const subscribeToOpenRoomsForUser = (
  userId: string,
  callback: (rooms: OpenRoom[]) => void,
) => {
  const q = query(collection(db, 'openRooms'), where('members', 'array-contains', userId));
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map(d => d.data() as OpenRoom)),
    (err) => console.error('openRooms/user subscription error:', err),
  );
};

export const sendOpenMessage = async (
  roomId: string,
  senderId: string,
  senderName: string,
  senderPhoto: string,
  text: string,
  imageUrl?: string,
): Promise<void> => {
  await addDoc(collection(db, 'openRooms', roomId, 'messages'), {
    senderId,
    senderName,
    senderPhoto,
    text,
    ...(imageUrl ? { imageUrl } : {}),
    createdAt: Timestamp.now(),
  });
  await updateDoc(doc(db, 'openRooms', roomId), {
    lastMessage: imageUrl ? '📷 사진' : text,
    lastMessageAt: Timestamp.now(),
  });
};

export const subscribeToOpenRoomsByPlace = (
  placeId: string,
  callback: (rooms: OpenRoom[]) => void,
) => {
  const q = query(collection(db, 'openRooms'), where('placeId', '==', placeId));
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map(d => d.data() as OpenRoom)),
    (err) => console.error('openRooms/place subscription error:', err),
  );
};

export const subscribeToOpenMessages = (
  roomId: string,
  callback: (messages: OpenMessage[]) => void,
) => {
  const q = query(collection(db, 'openRooms', roomId, 'messages'), orderBy('createdAt', 'asc'));
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as OpenMessage))),
    (err) => console.error('openRooms/messages subscription error:', err),
  );
};

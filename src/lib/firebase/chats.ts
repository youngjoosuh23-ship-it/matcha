import { collection, addDoc, doc, updateDoc, getDoc, deleteDoc, onSnapshot, query, where, orderBy, Timestamp, type QuerySnapshot, type DocumentData } from 'firebase/firestore';
import { db } from './config';
import type { Chat, Message } from '../../types';

export const fetchChatById = async (chatId: string): Promise<Chat | null> => {
  const snap = await getDoc(doc(db, 'chats', chatId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Chat;
};

export const sendMessage = async (chatId: string, senderId: string, text: string, imageUrl?: string) => {
  await addDoc(collection(db, 'chats', chatId, 'messages'), {
    senderId,
    text,
    ...(imageUrl ? { imageUrl } : {}),
    createdAt: Timestamp.now(),
  });
  await updateDoc(doc(db, 'chats', chatId), {
    lastMessage: imageUrl ? '📷 사진' : text,
    lastMessageAt: Timestamp.now(),
  });
};

export const endChat = async (chatId: string) => {
  await updateDoc(doc(db, 'chats', chatId), { endedAt: Timestamp.now() });
};

export const subscribeToChats = (
  userId: string,
  callback: (chats: Chat[]) => void
) => {
  const q = query(collection(db, 'chats'), where('participants', 'array-contains', userId));
  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const chats = snapshot.docs
      .map(d => ({ id: d.id, ...d.data() } as Chat))
      .filter(c => !(c as any).endedAt);
    callback(chats);
  }, (err) => console.error('subscribeToChats:', err));
};

export const subscribeToMessages = (
  chatId: string,
  callback: (messages: Message[]) => void
) => {
  const q = query(
    collection(db, 'chats', chatId, 'messages'),
    orderBy('createdAt', 'asc')
  );
  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Message)));
  }, (err) => console.error('subscribeToMessages:', err));
};

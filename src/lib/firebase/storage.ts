import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './config';

export const uploadChatImage = async (chatId: string, file: File): Promise<string> => {
  const storageRef = ref(storage, `chats/${chatId}/${Date.now()}_${file.name}`);
  const snapshot = await uploadBytes(storageRef, file);
  return getDownloadURL(snapshot.ref);
};

export const uploadOpenRoomImage = async (placeId: string, file: File): Promise<string> => {
  const storageRef = ref(storage, `openRooms/${placeId}/${Date.now()}_${file.name}`);
  const snapshot = await uploadBytes(storageRef, file);
  return getDownloadURL(snapshot.ref);
};

export type ChatStyle = 'quiet' | 'light' | 'business' | 'language' | 'friendly';

export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string;
  bio: string;
  professionalTags: string[];
  languages: string[];
  chatStyle: ChatStyle;
  field?: string;
  activePlaceId?: string | null;
  lastCheckIn?: any;
  isPremium?: boolean;
}

export interface CheckIn {
  userId: string;
  placeId: string;
  placeName: string;
  location: { lat: number; lng: number };
  checkInAt: any;
  expiresAt: any;
  userName: string;
  userPhoto: string;
  userStyle: ChatStyle;
  userTags: string[];
  userField?: string;
}

export interface ChatRequest {
  id: string;
  fromUserId: string;
  fromUserName: string;
  fromUserPhoto: string;
  toUserId: string;
  placeId: string;
  placeName: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  message: string;
  createdAt: any;
  expiresAt: any;
}

export interface Chat {
  id: string;
  participants: string[];
  placeId: string;
  placeName: string;
  requestId: string;
  createdAt: any;
  expiresAt: any;
  lastMessage?: string;
  lastMessageAt?: any;
  participantNames: Record<string, string>;
  participantPhotos: Record<string, string>;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  createdAt: any;
}

export interface Feedback {
  id?: string;
  fromUserId: string;
  toUserId: string;
  chatId: string;
  placeId: string;
  cafeRating: 'bad' | 'ok' | 'great';
  partnerRating: 'awkward' | 'good' | 'want_again';
  createdAt?: any;
}

// placeId 형식:
//   Google Places: "ChIJ..."
//   커스텀 장소:   "custom_{userId}"
//   TourAPI 장소:  "tour_{contentId}"

export type { TourPlace, TourFestival, TourDetail } from './lib/tourapi';

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
  userBio?: string;
  isCustomLocation?: boolean;
}

export interface ChatRequest {
  id: string;
  fromUserId: string;
  fromUserName: string;
  fromUserPhoto: string;
  toUserId: string;
  toUserName?: string;
  toUserPhoto?: string;
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
  imageUrl?: string;
  createdAt: any;
}


export interface Event {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorPhoto: string;
  title: string;
  description?: string;
  location: { lat: number; lng: number };
  locationName: string;
  placeId?: string;
  radiusKm: number;
  startAt: any;
  endAt: any;
  attendees: string[];
  attendeeNames: Record<string, string>;
  attendeePhotos: Record<string, string>;
  createdAt: any;
}

export interface OpenRoom {
  id: string;
  placeId: string;
  placeName: string;
  creatorId: string;
  creatorName: string;
  creatorPhoto: string;
  description?: string;
  members: string[];
  memberNames: Record<string, string>;
  memberPhotos: Record<string, string>;
  lastMessage?: string;
  lastMessageAt?: any;
  createdAt: any;
}

export interface OpenMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderPhoto: string;
  text: string;
  imageUrl?: string;
  createdAt: any;
}

export interface PlaceStat {
  placeId: string;
  placeName: string;
  location: { lat: number; lng: number };
  totalEvents: number;
  lastEventAt: any;
}

export interface Mark {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorPhoto: string;
  placeName: string;
  location: { lat: number; lng: number };
  memo?: string;
  scheduledAt?: any;
  visibility: 'private' | 'shared';
  sharedWith: string[];
  createdAt: any;
}


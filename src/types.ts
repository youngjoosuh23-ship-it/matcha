// placeId 형식:
//   Google Places: "ChIJ..."
//   커스텀 장소:   "custom_{userId}"
//   TourAPI 장소:  "tour_{contentId}"

export type { TourPlace, TourFestival, TourDetail } from './lib/tourapi';
export type { CultureEvent } from './lib/cultureapi';

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

// 장소명/좌표는 저장하지 않음 (Google Places 약관) — placeId로 실시간 조회
export interface PlaceStat {
  placeId: string;
  totalEvents: number;
  lastEventAt: any;
  lastEventId?: string;
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


export const MEETUP_CATEGORIES = [
  { id: 'reading', emoji: '📚', ko: '독서', en: 'Reading' },
  { id: 'study', emoji: '✏️', ko: '스터디', en: 'Study' },
  { id: 'sports', emoji: '🏃', ko: '운동', en: 'Sports' },
  { id: 'boardgame', emoji: '🎲', ko: '보드게임', en: 'Board games' },
  { id: 'language', emoji: '🌍', ko: '언어교환', en: 'Language exchange' },
  { id: 'etc', emoji: '☕', ko: '기타', en: 'Other' },
] as const;
export type MeetupCategory = typeof MEETUP_CATEGORIES[number]['id'];

export interface Meetup {
  id: string;
  hostId: string;
  hostName: string;
  hostPhoto: string;
  placeId: string;                          // Google Place ID (무기한 저장 허용)
  placeName: string;                        // 사용자가 확인·수정한 이름
  location: { lat: number; lng: number };   // Google 좌표 임시 저장 — purgeAt에 문서째 TTL 삭제
  category: MeetupCategory;
  title: string;
  description: string;
  startAt: any;
  endAt: any;
  capacity: number;
  // 신청 순서대로. 앞 capacity명 = 확정, 나머지 = 대기열
  participantIds: string[];
  participants: Record<string, { name: string; photo: string }>;
  status: 'open' | 'cancelled';
  createdAt: any;
  purgeAt: any;                             // Firestore TTL 필드 (생성 후 ≤29일)
}

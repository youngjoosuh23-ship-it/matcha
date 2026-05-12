import { useEffect, useState, useMemo } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { collection, onSnapshot, query, where, setDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { subscribeToOpenRoomsByPlace, createOpenRoom, joinOpenRoom, makeRoomId, subscribeToEventsByPlace } from '../lib/firebase';
import { CheckIn, UserProfile, ChatRequest, Chat, OpenRoom, Event } from '../types';
import { Leaf, X, MapPin, Star, Check, Send, ChevronUp, Phone, Users, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import RequestModal from './RequestModal';
import OpenChatModal from './OpenChatModal';
import CreateEventModal from './CreateEventModal';
import EventPanel from './EventPanel';

interface CafeDetailsProps {
  placeId: string;
  profile: UserProfile | null;
  sentRequests: ChatRequest[];
  activeChats: Chat[];
  onClose: () => void;
}

function timeAgo(ts: any): string {
  if (!ts) return '';
  const ms = Date.now() - (ts.toDate?.()?.getTime() ?? new Date(ts).getTime());
  const min = Math.floor(ms / 60000);
  if (min < 1) return '방금 전';
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  return `${Math.floor(hr / 24)}일 전`;
}

export default function CafeDetails({ placeId, profile, sentRequests, activeChats, onClose }: CafeDetailsProps) {
  const isCustomLocation = placeId.startsWith('custom_');
  const placesLib = useMapsLibrary('places');
  const [place, setPlace] = useState<google.maps.places.Place | null>(null);
  const [localCheckins, setLocalCheckins] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(!isCustomLocation);
  const [checkingIn, setCheckingIn] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [requestTarget, setRequestTarget] = useState<CheckIn | null>(null);
  const [viewingProfile, setViewingProfile] = useState<CheckIn | null>(null);
  const [openRooms, setOpenRooms] = useState<OpenRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<OpenRoom | null>(null);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [joiningRoomId, setJoiningRoomId] = useState<string | null>(null);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [placeEvents, setPlaceEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  // Fetch place details (skip for custom locations)
  useEffect(() => {
    if (isCustomLocation || !placesLib || !placeId) return;
    setLoading(true);
    const p = new placesLib.Place({ id: placeId });
    p.fetchFields({
      fields: ['displayName', 'formattedAddress', 'location', 'rating', 'userRatingCount', 'photos', 'regularOpeningHours', 'nationalPhoneNumber']
    }).then(() => {
      setPlace(p);
      setLoading(false);
    });
  }, [placesLib, placeId, isCustomLocation]);

  // Sync check-ins for this place
  useEffect(() => {
    const q = query(collection(db, 'checkins'), where('placeId', '==', placeId));
    const unsub = onSnapshot(q, (snap) => {
      setLocalCheckins(snap.docs.map(d => d.data() as CheckIn));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'checkins'));
    return () => unsub();
  }, [placeId]);

  // Subscribe to all open rooms for this place
  useEffect(() => {
    return subscribeToOpenRoomsByPlace(placeId, setOpenRooms);
  }, [placeId]);

  // Subscribe to active events for this place
  useEffect(() => {
    return subscribeToEventsByPlace(placeId, setPlaceEvents);
  }, [placeId]);

  const isCheckedIn = useMemo(() => localCheckins.some(c => c.userId === profile?.uid), [localCheckins, profile]);

  const getConnectionState = (targetUserId: string): { blocked: boolean; label: string } => {
    if (activeChats.some(c => c.participants.includes(targetUserId)))
      return { blocked: true, label: '이미 채팅 중이에요' };

    // Most recent request to this person
    const req = [...sentRequests]
      .sort((a, b) => (b.createdAt?.toDate?.()?.getTime() ?? 0) - (a.createdAt?.toDate?.()?.getTime() ?? 0))
      .find(r => r.toUserId === targetUserId);

    if (!req) return { blocked: false, label: '' };
    if (req.status === 'pending') return { blocked: true, label: '이미 요청을 보냈어요' };
    if (req.status === 'declined' || req.status === 'expired' || req.status === 'accepted') {
      const expiresMs = req.expiresAt?.toDate?.()?.getTime() ?? new Date(req.expiresAt).getTime();
      if (expiresMs > Date.now()) {
        const minLeft = Math.ceil((expiresMs - Date.now()) / 60000);
        return { blocked: true, label: `거절됨 · ${minLeft}분 후 재요청 가능` };
      }
    }
    return { blocked: false, label: '' };
  };

  const handleCheckIn = async () => {
    if (!profile || checkingIn) return;
    if (!isCustomLocation && !place) return;

    setCheckingIn(true);
    const checkinRef = doc(db, 'checkins', profile.uid);
    try {
      if (isCheckedIn) {
        await deleteDoc(checkinRef);
      } else {
        const customCheckin = localCheckins.find(c => c.placeId === placeId);
        const placeName = isCustomLocation
          ? (customCheckin?.placeName ?? '커스텀 위치')
          : (place?.displayName ?? '알 수 없음');
        const location = isCustomLocation
          ? (customCheckin?.location ?? { lat: 0, lng: 0 })
          : (place?.location?.toJSON() ?? { lat: 0, lng: 0 });

        const checkin: CheckIn = {
          userId: profile.uid,
          placeId,
          placeName,
          location,
          checkInAt: Timestamp.now(),
          expiresAt: Timestamp.fromDate(new Date(Date.now() + 60 * 60 * 1000)),
          userName: profile.displayName,
          userPhoto: profile.photoURL,
          userStyle: profile.chatStyle,
          userTags: profile.professionalTags,
          userField: profile.field ?? '',
          isCustomLocation,
        };
        await setDoc(checkinRef, checkin);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'checkins');
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCreateRoom = async () => {
    if (!profile || creatingRoom) return;
    setCreatingRoom(true);
    try {
      const pName = displayName || '이 장소';
      await createOpenRoom(placeId, pName, profile.uid, profile.displayName, profile.photoURL);
      setActiveRoom({
        id: makeRoomId(placeId, profile.uid),
        placeId,
        placeName: pName,
        creatorId: profile.uid,
        creatorName: profile.displayName,
        creatorPhoto: profile.photoURL,
        members: [profile.uid],
        memberNames: { [profile.uid]: profile.displayName },
        memberPhotos: { [profile.uid]: profile.photoURL },
        createdAt: null,
      });
    } catch (e) {
      console.error('create open room error:', e);
    } finally {
      setCreatingRoom(false);
    }
  };

  const handleEnterRoom = async (room: OpenRoom) => {
    if (!profile) return;
    if (!room.members.includes(profile.uid)) {
      setJoiningRoomId(room.id);
      try {
        await joinOpenRoom(room.id, profile.uid, profile.displayName, profile.photoURL);
      } catch (e) {
        console.error('join open room error:', e);
        setJoiningRoomId(null);
        return;
      }
      setJoiningRoomId(null);
    }
    setActiveRoom(room);
  };

  const getStyleColor = (style: string) => {
    switch (style) {
      case 'quiet': return 'bg-blue-100 text-blue-700';
      case 'light':
      case 'friendly': return 'bg-emerald-100 text-emerald-700';
      case 'business': return 'bg-amber-100 text-amber-700';
      case 'language': return 'bg-purple-100 text-purple-700';
      default: return 'bg-zinc-100 text-zinc-700';
    }
  };

  const getStyleLabel = (style: string) => {
    switch (style) {
      case 'quiet': return '조용히 작업중';
      case 'light':
      case 'friendly': return '대화 환영';
      case 'business': return '비즈니스';
      case 'language': return '언어 교환';
      default: return style;
    }
  };

  const displayName = isCustomLocation
    ? (localCheckins[0]?.placeName ?? '커스텀 위치')
    : place?.displayName ?? '';

  const placeLocation: { lat: number; lng: number } | null = isCustomLocation
    ? (localCheckins[0]?.location ?? null)
    : (place?.location?.toJSON() ?? null);

  return (
    <>
      <motion.div
        layout
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="absolute inset-x-0 bottom-0 z-40 bg-white rounded-t-[40px] shadow-[0_-20px_50px_rgba(0,0,0,0.1)] border-t border-zinc-100 flex flex-col font-sans overflow-hidden"
        style={{ maxHeight: expanded ? '85vh' : undefined }}
      >
        <div className="w-12 h-1.5 bg-zinc-200 rounded-full mx-auto my-4 shrink-0" />

        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-500 hover:bg-zinc-200 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* ── Compact summary (default) ── */}
        {!expanded && (
          <div className="px-6 pb-8 space-y-5">
            {loading ? (
              <div className="h-8 w-40 bg-zinc-100 rounded-xl animate-pulse" />
            ) : (
              <div>
                <h2 className="text-2xl font-bold text-zinc-900 pr-12">{displayName}</h2>
                {!isCustomLocation && (
                  <div className="flex items-center gap-2 mt-1">
                    {place?.formattedAddress && (
                      <p className="text-xs text-zinc-400 truncate flex-1">{place.formattedAddress}</p>
                    )}
                    <a
                      href={(place as any)?.nationalPhoneNumber
                        ? `tel:${((place as any).nationalPhoneNumber as string).replace(/\s/g, '')}`
                        : undefined}
                      onClick={e => !(place as any)?.nationalPhoneNumber && e.preventDefault()}
                      className={cn(
                        'flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all shrink-0',
                        (place as any)?.nationalPhoneNumber
                          ? 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                          : 'bg-zinc-50 text-zinc-300 cursor-not-allowed'
                      )}
                    >
                      <Phone className="w-3 h-3" />
                      문의하기
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* User count summary */}
            <div
              className="flex items-center gap-3 p-4 bg-zinc-50 rounded-2xl border border-zinc-100 cursor-pointer hover:border-zinc-200 transition-colors"
              onClick={() => setExpanded(true)}
            >
              <div className="flex -space-x-2">
                {localCheckins.slice(0, 3).map((c, i) => (
                  <img key={i} src={c.userPhoto} className="w-8 h-8 rounded-full border-2 border-white object-cover" referrerPolicy="no-referrer" />
                ))}
                {localCheckins.length === 0 && (
                  <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center">
                    <Leaf className="w-4 h-4 text-zinc-400" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                {localCheckins.length > 0 ? (
                  <p className="text-sm font-bold text-zinc-900">
                    현재 {localCheckins.length}명이 대화 가능해요
                  </p>
                ) : (
                  <p className="text-sm font-medium text-zinc-400">아직 아무도 없어요</p>
                )}
              </div>
              <ChevronUp className="w-4 h-4 text-zinc-400 rotate-180" />
            </div>

            {/* Open chat rooms */}
            {profile && (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold text-zinc-400 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    오픈 채팅방
                    {openRooms.length > 0 && (
                      <span className="bg-zinc-200 text-zinc-600 px-1.5 py-0.5 rounded-full text-[10px]">{openRooms.length}</span>
                    )}
                  </span>
                  {!openRooms.some(r => r.creatorId === profile.uid) && (
                    <button
                      onClick={handleCreateRoom}
                      disabled={creatingRoom}
                      className="flex items-center gap-1 text-xs font-bold text-zinc-900 hover:text-zinc-600 transition-colors disabled:opacity-50"
                    >
                      {creatingRoom
                        ? <div className="w-3 h-3 border-2 border-zinc-300 border-t-zinc-800 rounded-full animate-spin" />
                        : '+ 내 방 만들기'}
                    </button>
                  )}
                </div>

                {openRooms.length === 0 ? (
                  <p className="text-xs text-zinc-300 text-center py-3">아직 오픈 채팅방이 없어요</p>
                ) : (
                  openRooms.map((room) => {
                    const isOwn = room.creatorId === profile.uid;
                    const isMember = room.members.includes(profile.uid);
                    const isJoining = joiningRoomId === room.id;
                    return (
                      <button
                        key={room.id}
                        onClick={() => handleEnterRoom(room)}
                        disabled={isJoining}
                        className="w-full flex items-center gap-3 p-3.5 bg-zinc-50 rounded-2xl border border-zinc-100 hover:border-zinc-200 transition-colors disabled:opacity-50 text-left"
                      >
                        {room.creatorPhoto ? (
                          <img
                            src={room.creatorPhoto}
                            className="w-8 h-8 rounded-full border-2 border-white object-cover shrink-0"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-zinc-200 shrink-0 flex items-center justify-center">
                            <Users className="w-4 h-4 text-zinc-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-bold text-zinc-900 truncate">
                              {isOwn ? '내 방' : `${room.creatorName || '익명'}의 방`}
                            </p>
                            {isOwn && (
                              <span className="text-[10px] font-bold bg-zinc-900 text-white px-1.5 py-0.5 rounded-full shrink-0">나</span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-400">{room.members.length}명 참여 중</p>
                        </div>
                        {isJoining ? (
                          <div className="w-4 h-4 border-2 border-zinc-300 border-t-zinc-800 rounded-full animate-spin shrink-0" />
                        ) : (
                          <span className={cn(
                            'text-xs font-bold px-3 py-1.5 rounded-xl shrink-0',
                            isMember ? 'bg-emerald-500 text-white' : 'bg-zinc-900 text-white'
                          )}>
                            {isMember ? '열기' : '참여하기'}
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            )}

            {/* Place events */}
            {placeEvents.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center px-1">
                  <span className="text-xs font-bold text-zinc-400 flex items-center gap-1.5">
                    🍁 진행 중인 이벤트
                    <span className="bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full text-[10px] font-bold">{placeEvents.length}</span>
                  </span>
                </div>
                <div className="overflow-y-auto overscroll-contain snap-y snap-mandatory" style={{ maxHeight: '72px' }}>
                  {placeEvents.map((ev) => (
                    <button
                      key={ev.id}
                      onClick={() => setSelectedEvent(ev)}
                      className="w-full flex items-center gap-3 p-3.5 bg-amber-50 rounded-2xl border border-amber-100 hover:border-amber-200 transition-colors text-left snap-start shrink-0"
                    >
                      <span className="text-xl shrink-0">🍁</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-zinc-900 truncate">{ev.title}</p>
                        <p className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          {(() => {
                            const ms = (ev.endAt?.toDate?.()?.getTime() ?? 0) - Date.now();
                            if (ms <= 0) return '종료됨';
                            const hr = Math.floor(ms / 3600000);
                            const min = Math.floor((ms % 3600000) / 60000);
                            return hr > 0 ? `${hr}시간 ${min}분 남음` : `${min}분 남음`;
                          })()}
                          · {ev.attendees.length}명 참여
                        </p>
                      </div>
                      <span className="text-xs font-bold text-amber-600 shrink-0">보기</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Actions: Check-in & Event */}
            <div className="grid grid-cols-2 gap-3">
              {/* Check-in card */}
              <div className="flex flex-col gap-2.5 p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                <div>
                  <p className="text-sm font-bold text-zinc-900">📍 체크인</p>
                  <p className="text-[11px] text-zinc-400 mt-0.5 leading-tight">이 장소에 있다고 알려요</p>
                </div>
                <button
                  onClick={handleCheckIn}
                  disabled={checkingIn}
                  className={cn(
                    'flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-50',
                    isCheckedIn
                      ? 'bg-white text-red-500 border border-red-100 hover:bg-red-50'
                      : 'bg-zinc-900 text-white hover:bg-zinc-950'
                  )}
                >
                  {checkingIn
                    ? <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                    : isCheckedIn
                      ? <><Check className="w-3.5 h-3.5" />체크아웃</>
                      : <><MapPin className="w-3.5 h-3.5" />체크인</>}
                </button>
              </div>

              {/* Event card */}
              <div className="flex flex-col gap-2.5 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                <div>
                  <p className="text-sm font-bold text-zinc-900">🍁 이벤트</p>
                  <p className="text-[11px] text-zinc-400 mt-0.5 leading-tight">반경 내 사람들 초대해요</p>
                </div>
                <button
                  onClick={() => setShowCreateEvent(true)}
                  disabled={!profile}
                  className="flex items-center justify-center py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-40 bg-amber-400 text-white hover:bg-amber-500"
                >
                  개설하기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Expanded full view ── */}
        {expanded && (
          <div className="flex-1 overflow-y-auto">
            {/* Back to compact */}
            <button
              onClick={() => setExpanded(false)}
              className="flex items-center gap-1 text-xs font-bold text-zinc-400 hover:text-zinc-600 transition-colors mx-6 mb-2"
            >
              <ChevronUp className="w-3.5 h-3.5 rotate-180" />
              요약으로 돌아가기
            </button>

        {loading ? (
          <div className="p-10 flex flex-col items-center justify-center gap-4">
            <Leaf className="w-10 h-10 text-zinc-200 animate-pulse" />
            <p className="text-zinc-400 font-medium">카페 정보를 불러오는 중...</p>
          </div>
        ) : (
          <div className="px-6 pb-12 space-y-8">
            {/* Place Info */}
            <div className="space-y-4">
              <div className="space-y-1">
                <h2 className="text-3xl font-bold tracking-tight text-zinc-900">{displayName}</h2>
                <div className="flex items-center gap-4 text-sm text-zinc-500">
                  {!isCustomLocation && place?.rating && (
                    <div className="flex items-center gap-1 font-bold text-amber-500">
                      <Star className="w-4 h-4 fill-current" />
                      <span>{place.rating} ({place.userRatingCount})</span>
                    </div>
                  )}
                  {!isCustomLocation && (
                    <div className="flex items-center gap-1 font-medium">
                      <MapPin className="w-4 h-4" />
                      <span className="line-clamp-1">{place?.formattedAddress}</span>
                    </div>
                  )}
                  {isCustomLocation && (
                    <div className="flex items-center gap-1 font-medium text-zinc-400">
                      <MapPin className="w-4 h-4" />
                      <span>커스텀 체크인 위치</span>
                    </div>
                  )}
                </div>
              </div>

              {!isCustomLocation && (
                <div className="w-full h-48 bg-zinc-100 rounded-3xl overflow-hidden">
                  {place?.photos && place.photos.length > 0 ? (
                    <img src={place.photos[0].getURI({ maxWidth: 1000 })} alt={displayName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-300">
                      <Leaf className="w-12 h-12" />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Check-in / Check-out button */}
            <button
              onClick={handleCheckIn}
              disabled={checkingIn}
              className={cn(
                'w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold transition-all active:scale-95 disabled:opacity-50',
                isCheckedIn
                  ? 'bg-zinc-100 text-zinc-700 hover:bg-red-50 hover:text-red-500'
                  : 'bg-zinc-900 text-white shadow-xl shadow-zinc-900/20 hover:bg-zinc-950'
              )}
            >
              {checkingIn ? (
                <div className="w-5 h-5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
              ) : isCheckedIn ? (
                <><Check className="w-5 h-5" />체크아웃하기</>
              ) : (
                <><MapPin className="w-5 h-5" />체크인하기</>
              )}
            </button>

            {/* People here */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-xl flex items-center gap-2">
                  지금 있는 사람들
                  {localCheckins.length > 0 && (
                    <span className="bg-zinc-900 text-white text-xs px-2 py-0.5 rounded-full">{localCheckins.length}</span>
                  )}
                </h3>
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-500 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100 animate-pulse">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  LIVE
                </div>
              </div>

              {localCheckins.length > 0 ? (
                <div className="space-y-4">
                  {localCheckins.map((checkin) => (
                    <div key={checkin.userId} className="flex items-center justify-between p-5 bg-zinc-50 rounded-3xl border border-zinc-100 group hover:border-zinc-200 transition-colors">
                      <div className="flex items-center gap-4 flex-1 cursor-pointer" onClick={() => setViewingProfile(checkin)}>
                        <div className="relative">
                          <img src={checkin.userPhoto} alt={checkin.userName} className="w-14 h-14 rounded-2xl object-cover border-2 border-white shadow-sm" referrerPolicy="no-referrer" />
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-sm border border-zinc-50">
                            {checkin.userStyle === 'quiet' ? '🤫' : checkin.userStyle === 'language' ? '🌍' : checkin.userStyle === 'business' ? '💼' : '💬'}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-zinc-900">{checkin.userName}</span>
                            {checkin.userField && (
                              <span className="text-[10px] font-bold bg-zinc-900 text-white px-2 py-0.5 rounded-full">{checkin.userField}</span>
                            )}
                            <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', getStyleColor(checkin.userStyle))}>
                              {getStyleLabel(checkin.userStyle)}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {checkin.userTags.slice(0, 3).map(tag => (
                              <span key={tag} className="text-[10px] font-medium text-zinc-400">#{tag}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                      {checkin.userId !== profile?.uid && (() => {
                        if (!isCheckedIn) return (
                          <span className="text-[10px] font-bold text-zinc-400 bg-zinc-100 px-2.5 py-1.5 rounded-2xl shrink-0 text-center leading-tight max-w-[72px]">
                            체크인 후{'\n'}대화 가능
                          </span>
                        );
                        const { blocked, label } = getConnectionState(checkin.userId);
                        return blocked ? (
                          <span className="text-[10px] font-bold text-zinc-400 bg-zinc-100 px-2.5 py-1.5 rounded-2xl shrink-0 text-center leading-tight max-w-[72px]">
                            {label}
                          </span>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); setRequestTarget(checkin); }}
                            className="w-12 h-12 bg-white rounded-2xl border border-zinc-200 flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:border-zinc-900 transition-all active:scale-90 shrink-0"
                          >
                            <Send className="w-5 h-5" />
                          </button>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-zinc-50 rounded-3xl py-12 flex flex-col items-center justify-center gap-3 border-2 border-dashed border-zinc-200">
                  <Leaf className="w-12 h-12 text-zinc-200" />
                  <p className="text-zinc-400 font-medium text-sm">현재 체크인한 사람이 없습니다.</p>
                  <p className="text-zinc-400 text-xs text-center px-6">첫 번째로 체크인해서 다른 사람들을 초대해보세요!</p>
                </div>
              )}
            </div>

          </div>
        )}
          </div>
        )}
      </motion.div>

      {activeRoom && profile && (
        <OpenChatModal
          room={activeRoom}
          myProfile={profile}
          onClose={() => setActiveRoom(null)}
          onLeave={() => setActiveRoom(null)}
        />
      )}

      <AnimatePresence>
        {selectedEvent && (
          <>
            <div className="fixed inset-0 z-[55]" onClick={() => setSelectedEvent(null)} />
            <EventPanel
              event={selectedEvent}
              myProfile={profile}
              userLocation={null}
              fixed
              onClose={() => setSelectedEvent(null)}
            />
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCreateEvent && profile && (
          <CreateEventModal
            myProfile={profile}
            userLocation={null}
            fixedLocation={placeLocation}
            fixedLocationName={displayName || '이 장소'}
            placeId={placeId}
            onClose={() => setShowCreateEvent(false)}
            onCreated={() => setShowCreateEvent(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {requestTarget && profile && (
          <RequestModal
            target={requestTarget}
            myProfile={profile}
            placeName={isCustomLocation ? (localCheckins[0]?.placeName ?? '') : (place?.displayName ?? '')}
            onClose={() => setRequestTarget(null)}
            onSent={() => setRequestTarget(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingProfile && (
          <div
            className="fixed inset-0 z-[70] flex items-end justify-center bg-zinc-950/40 backdrop-blur-sm"
            onClick={() => setViewingProfile(null)}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="w-full sm:max-w-sm bg-white rounded-t-[40px] p-6 space-y-5 font-sans"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1 bg-zinc-200 rounded-full mx-auto" />
              <div className="flex items-center gap-4">
                <img src={viewingProfile.userPhoto} alt={viewingProfile.userName} className="w-20 h-20 rounded-3xl object-cover border-2 border-white shadow-md" referrerPolicy="no-referrer" />
                <div className="space-y-1.5">
                  <p className="text-xl font-bold text-zinc-900">{viewingProfile.userName}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {viewingProfile.userField && (
                      <span className="text-xs font-bold bg-zinc-900 text-white px-2.5 py-1 rounded-full">{viewingProfile.userField}</span>
                    )}
                    <span className={cn('text-xs font-bold px-2.5 py-1 rounded-full', getStyleColor(viewingProfile.userStyle))}>
                      {getStyleLabel(viewingProfile.userStyle)}
                    </span>
                  </div>
                </div>
              </div>
              {viewingProfile.userTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {viewingProfile.userTags.map(tag => (
                    <span key={tag} className="text-xs font-medium text-zinc-500 bg-zinc-50 px-3 py-1.5 rounded-xl border border-zinc-100">#{tag}</span>
                  ))}
                </div>
              )}
              {profile && viewingProfile.userId !== profile.uid && (() => {
                if (!isCheckedIn) return (
                  <div className="w-full flex items-center justify-center py-4 rounded-2xl bg-zinc-100 text-zinc-400 font-bold text-sm">
                    체크인 후 대화 가능해요
                  </div>
                );
                const { blocked, label } = getConnectionState(viewingProfile.userId);
                return blocked ? (
                  <div className="w-full flex items-center justify-center py-4 rounded-2xl bg-zinc-100 text-zinc-400 font-bold text-sm">
                    {label}
                  </div>
                ) : (
                  <button
                    onClick={() => { setRequestTarget(viewingProfile); setViewingProfile(null); }}
                    className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-zinc-900 text-white font-bold shadow-xl hover:bg-zinc-950 active:scale-95 transition-all"
                  >
                    <Send className="w-4 h-4" />
                    말차 요청보내기
                  </button>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

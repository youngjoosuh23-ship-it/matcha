import { useEffect, useState, useMemo } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { collection, onSnapshot, query, where, setDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { subscribeToOpenRoomsByPlace, createOpenRoom, joinOpenRoom, makeRoomId, subscribeToEventsByPlace, subscribeToMeetupsByPlace } from '../lib/firebase';
import { CheckIn, UserProfile, ChatRequest, Chat, OpenRoom, Event, TourDetail, Meetup, MEETUP_CATEGORIES, CHAT_STYLE_ICON } from '../types';
import { fetchTourDetail } from '../lib/tourapi';
import { Leaf, X, MapPin, Check, Send, ChevronUp, Phone, Users, Clock, Zap, CalendarDays } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatMeetupTime } from '../lib/utils';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { panelBg, cardBg } from '../design/tokens';
import { useLanguage } from '../lib/i18n';
import RequestModal from './RequestModal';
import OpenChatModal from './OpenChatModal';
import { ErrorBoundary } from './ErrorBoundary';
import CreateEventModal from './CreateEventModal';
import CreateMeetupModal from './CreateMeetupModal';
import MeetupPanel from './MeetupPanel';
import EventPanel from './EventPanel';

interface CafeDetailsProps {
  placeId: string;
  profile: UserProfile | null;
  sentRequests: ChatRequest[];
  activeChats: Chat[];
  initialMeetup?: { id: string } | null;   // 지도의 "내 모임"에서 열 때 바로 띄울 모임 (누를 때마다 새 객체)
  onClose: () => void;
}

export default function CafeDetails({ placeId, profile, sentRequests, activeChats, initialMeetup, onClose }: CafeDetailsProps) {
  const { lang, t } = useLanguage();
  const isCustomLocation = placeId.startsWith('custom_');
  const isTourPlace = placeId.startsWith('tour_');
  const placesLib = useMapsLibrary('places');
  const [place, setPlace] = useState<google.maps.places.Place | null>(null);
  const [tourDetail, setTourDetail] = useState<TourDetail | null>(null);
  const [localCheckins, setLocalCheckins] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(!isCustomLocation);
  const [checkingIn, setCheckingIn] = useState(false);
  const [requestTarget, setRequestTarget] = useState<CheckIn | null>(null);
  const [viewingProfile, setViewingProfile] = useState<CheckIn | null>(null);
  const [openRooms, setOpenRooms] = useState<OpenRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<OpenRoom | null>(null);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [joiningRoomId, setJoiningRoomId] = useState<string | null>(null);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [roomDesc, setRoomDesc] = useState('');
  const [placeEvents, setPlaceEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [placeMeetups, setPlaceMeetups] = useState<Meetup[]>([]);
  const [showCreateMeetup, setShowCreateMeetup] = useState(false);
  const [selectedMeetupId, setSelectedMeetupId] = useState<string | null>(null);
  // 모임은 Google 장소(카페)에서만 — 커스텀 위치(개인 현재 위치)/관광공사 장소 제외
  const canHostMeetup = !isCustomLocation && !isTourPlace;
  // 번개는 여러 사람이 같은 장소에 체크인해야 의미가 있음 — 개인 현재 위치(custom_)에서는 열지 않음
  const canOpenBolt = !isCustomLocation;
  const [showRooms, setShowRooms] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    if (isCustomLocation) return;

    if (isTourPlace) {
      setLoading(true);
      const contentId = placeId.replace('tour_', '');
      fetchTourDetail(contentId).then((detail) => {
        setTourDetail(detail);
        setLoading(false);
      }).catch(() => setLoading(false));
      return;
    }

    if (!placesLib || !placeId) return;
    setLoading(true);
    const p = new placesLib.Place({ id: placeId });
    p.fetchFields({
      fields: ['displayName', 'formattedAddress', 'location', 'rating', 'userRatingCount', 'photos', 'regularOpeningHours', 'nationalPhoneNumber']
    }).then(() => {
      setPlace(p);
      setLoading(false);
    });
  }, [placesLib, placeId, isCustomLocation, isTourPlace]);

  useEffect(() => {
    const q = query(collection(db, 'checkins'), where('placeId', '==', placeId));
    const unsub = onSnapshot(q, (snap) => {
      const now = Date.now();
      setLocalCheckins(snap.docs
        .map(d => d.data() as CheckIn)
        .filter(c => {
          const ms = c.expiresAt?.toDate?.()?.getTime() ?? new Date(c.expiresAt).getTime();
          return ms > now;
        })
      );
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'checkins'));
    return () => unsub();
  }, [placeId]);

  useEffect(() => {
    return subscribeToOpenRoomsByPlace(placeId, setOpenRooms);
  }, [placeId]);

  useEffect(() => {
    return subscribeToEventsByPlace(placeId, setPlaceEvents);
  }, [placeId]);

  useEffect(() => {
    if (!canHostMeetup) return;
    return subscribeToMeetupsByPlace(placeId, setPlaceMeetups);
  }, [placeId, canHostMeetup]);

  useEffect(() => {
    if (initialMeetup) setSelectedMeetupId(initialMeetup.id);
  }, [initialMeetup]);

  // 구독 중인 최신 문서로 상세 표시 — 취소/종료되면 목록에서 빠지며 자동으로 닫힘
  const selectedMeetup = placeMeetups.find(m => m.id === selectedMeetupId) ?? null;

  const isCheckedIn = useMemo(() => localCheckins.some(c => c.userId === profile?.uid), [localCheckins, profile]);

  const getConnectionState = (targetUserId: string): { blocked: boolean; label: string } => {
    if (activeChats.some(c => c.participants.includes(targetUserId)))
      return { blocked: true, label: t('이미 채팅 중이에요', 'Already chatting') };

    const req = [...sentRequests]
      .sort((a, b) => (b.createdAt?.toDate?.()?.getTime() ?? 0) - (a.createdAt?.toDate?.()?.getTime() ?? 0))
      .find(r => r.toUserId === targetUserId);

    if (!req) return { blocked: false, label: '' };
    if (req.status === 'pending') return { blocked: true, label: t('이미 요청을 보냈어요', 'Request already sent') };
    if (req.status === 'declined' || req.status === 'expired' || req.status === 'accepted') {
      const expiresMs = req.expiresAt?.toDate?.()?.getTime() ?? new Date(req.expiresAt).getTime();
      if (expiresMs > Date.now()) {
        const minLeft = Math.ceil((expiresMs - Date.now()) / 60000);
        return { blocked: true, label: t(`거절됨 · ${minLeft}분 후 재요청 가능`, `Declined · retry in ${minLeft}m`) };
      }
    }
    return { blocked: false, label: '' };
  };

  const handleCheckIn = async () => {
    if (!profile || checkingIn) return;
    if (!isCustomLocation && !isTourPlace && !place) return;
    if (isTourPlace && !tourDetail) return;

    setCheckingIn(true);
    const checkinRef = doc(db, 'checkins', profile.uid);
    try {
      if (isCheckedIn) {
        await deleteDoc(checkinRef);
      } else {
        const customCheckin = localCheckins.find(c => c.placeId === placeId);
        const placeName = isCustomLocation
          ? (customCheckin?.placeName ?? t('커스텀 위치', 'Custom location'))
          : isTourPlace
            ? (tourDetail!.title)
            : (place?.displayName ?? t('알 수 없음', 'Unknown'));
        const location = isCustomLocation
          ? (customCheckin?.location ?? { lat: 0, lng: 0 })
          : isTourPlace
            ? tourDetail!.location
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
          userBio: profile.bio ?? '',
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
      const pName = displayName || place?.formattedAddress?.split(',')[0] || t('이름 없는 장소', 'Unnamed place');
      await createOpenRoom(placeId, pName, profile.uid, profile.displayName, profile.photoURL, roomDesc.trim() || undefined);
      setShowRoomForm(false);
      setRoomDesc('');
      setActiveRoom({
        id: makeRoomId(placeId, profile.uid),
        placeId,
        placeName: pName,
        description: roomDesc.trim() || undefined,
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
    if (!(room.members ?? []).includes(profile.uid)) {
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

  const getStyleLabel = (style: string) => {
    switch (style) {
      case 'quiet': return t('조용히 작업중', 'Working quietly');
      case 'light':
      case 'friendly': return t('대화 환영', 'Open to chat');
      case 'business': return t('비즈니스', 'Business');
      case 'language': return t('언어 교환', 'Language exchange');
      default: return style;
    }
  };

  const displayName = isCustomLocation
    ? (localCheckins[0]?.placeName ?? t('커스텀 위치', 'Custom location'))
    : isTourPlace
      ? (tourDetail?.title ?? '')
      : (place?.displayName ?? '');

  const placeLocation: { lat: number; lng: number } | null = isCustomLocation
    ? (localCheckins[0]?.location ?? null)
    : isTourPlace
      ? (tourDetail?.location ?? null)
      : (place?.location?.toJSON() ?? null);

  const flashHint = (msg: string) => {
    setHint(msg);
    setTimeout(() => setHint(h => (h === msg ? null : h)), 3000);
  };

  // 번개 열기·참가는 이 장소에 체크인한 사람만 (firestore.rules에서도 강제)
  const openBolt = () => {
    if (!isCheckedIn) { flashHint(t('이 장소에 체크인해야 번개를 열 수 있어요', 'Check in here to open a bolt')); return; }
    setShowCreateEvent(true);
  };

  return (
    <>
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="absolute inset-x-0 bottom-0 z-40 rounded-t-[40px] shadow-2xl border border-white/60 flex flex-col font-sans overflow-hidden"
        style={{ ...panelBg, maxHeight: '88vh' }}
      >
        {/* ── Fixed top: 장소 정보 ── */}
        <div className="shrink-0 px-6 pt-5 pb-4 space-y-4" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <div className="w-10 h-1 rounded-full mx-auto" style={{ background: 'rgba(0,0,0,0.12)' }} />

          <button
            onClick={onClose}
            className="absolute top-6 right-6 w-10 h-10 rounded-full flex items-center justify-center text-zinc-600 hover:text-zinc-900 transition-colors"
            style={{ background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(0,0,0,0.08)' }}
          >
            <X className="w-5 h-5" />
          </button>

          {loading ? (
            <div className="h-7 w-40 rounded-xl animate-pulse" style={{ background: 'rgba(0,0,0,0.06)' }} />
          ) : (
            <div className="pr-12">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-2xl font-bold text-zinc-800 leading-tight">{displayName}</h2>
                {isTourPlace && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white shrink-0" style={{ background: '#e57c23' }}>
                    {t('관광공사', 'Tourism Org')}
                  </span>
                )}
                {!isCustomLocation && !isTourPlace && place?.nationalPhoneNumber && (
                  <a
                    href={`tel:${place.nationalPhoneNumber}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold shrink-0 transition-opacity active:opacity-70"
                    style={{ background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(0,0,0,0.08)', color: '#1a2418' }}
                  >
                    <Phone className="w-3 h-3" />
                    {t('문의하기', 'Call')}
                  </a>
                )}
                {isTourPlace && tourDetail?.tel && (
                  <a
                    href={`tel:${tourDetail.tel}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold shrink-0 transition-opacity active:opacity-70"
                    style={{ background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(0,0,0,0.08)', color: '#1a2418' }}
                  >
                    <Phone className="w-3 h-3" />
                    {t('문의하기', 'Call')}
                  </a>
                )}
              </div>
              {!isCustomLocation && !isTourPlace && place?.formattedAddress && (
                <p className="text-xs text-zinc-400 mt-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span className="truncate">{place.formattedAddress}</span>
                </p>
              )}
              {isTourPlace && tourDetail?.addr1 && (
                <p className="text-xs text-zinc-400 mt-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span className="truncate">{tourDetail.addr1}</span>
                </p>
              )}
            </div>
          )}

          {!isCustomLocation && (
            <div className="w-full h-32 rounded-2xl overflow-hidden bg-zinc-100">
              {isTourPlace ? (
                tourDetail?.firstimage ? (
                  <img src={tourDetail.firstimage} alt={displayName} className="w-full h-full object-cover" />
                ) : loading ? (
                  <div className="w-full h-full animate-pulse" style={{ background: 'rgba(0,0,0,0.06)' }} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Leaf className="w-10 h-10 text-zinc-200" />
                  </div>
                )
              ) : place?.photos && place.photos.length > 0 ? (
                <img src={place.photos[0].getURI({ maxWidth: 1000 })} alt={displayName} className="w-full h-full object-cover" />
              ) : loading ? (
                <div className="w-full h-full animate-pulse" style={{ background: 'rgba(0,0,0,0.06)' }} />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Leaf className="w-10 h-10 text-zinc-200" />
                </div>
              )}
            </div>
          )}

        </div>

        {/* ── Scrollable ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* People */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="font-bold text-base text-zinc-800 flex items-center gap-2">
                {t('지금 여기 있는 사람', 'People here now')}
                {localCheckins.length > 0 && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full text-white font-bold" style={{ background: '#1a2418' }}>{localCheckins.length}</span>
                )}
              </h3>
              {profile && canOpenBolt && localCheckins.length > 0 ? (
                <button
                  onClick={openBolt}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 active:scale-95 transition-all"
                  style={{ background: 'rgba(244,211,94,0.25)', border: '1px solid rgba(202,160,30,0.35)', color: '#7a5a00' }}
                >
                  <Zap className="w-3.5 h-3.5" />{t('이 사람들과 번개', 'Bolt with them')}
                </button>
              ) : (
                <div className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full text-[#2d5a1b]" style={{ background: 'rgba(143,181,112,0.2)', border: '1px solid rgba(143,181,112,0.3)' }}>
                  <div className="w-1.5 h-1.5 rounded-full bg-[#8fb570] animate-pulse" />
                  LIVE
                </div>
              )}
            </div>

            {localCheckins.length > 0 ? (
              <div className="space-y-2">
                {localCheckins.map((checkin) => {
                  const isMe = checkin.userId === profile?.uid;
                  const connState = !isMe && isCheckedIn ? getConnectionState(checkin.userId) : null;
                  return (
                    <div
                      key={checkin.userId}
                      className="flex items-center gap-3 p-3 rounded-2xl border border-white/60 cursor-pointer transition-colors"
                      style={cardBg}
                      onClick={() => setViewingProfile(checkin)}
                    >
                      <img
                        src={checkin.userPhoto}
                        alt={checkin.userName}
                        className="w-12 h-12 rounded-2xl object-cover shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-zinc-800 text-sm truncate">{checkin.userName}</p>
                          {(() => { const I = CHAT_STYLE_ICON[checkin.userStyle] ?? CHAT_STYLE_ICON.light; return <I className="w-3.5 h-3.5 text-zinc-400 shrink-0" />; })()}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {checkin.userField && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-zinc-600" style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(0,0,0,0.06)' }}>{checkin.userField}</span>
                          )}
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-zinc-500" style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(0,0,0,0.06)' }}>{getStyleLabel(checkin.userStyle)}</span>
                        </div>
                        {checkin.userBio && (
                          <p className="text-[11px] text-zinc-400 mt-0.5 truncate">{checkin.userBio}</p>
                        )}
                      </div>
                      {!isMe && (
                        !isCheckedIn ? (
                          <span className="text-[10px] font-bold text-zinc-400 shrink-0">{t('체크인 후', 'Check in first')}</span>
                        ) : connState?.blocked ? (
                          <span className="text-[10px] font-bold text-zinc-400 shrink-0 text-right max-w-[60px] leading-tight">{connState.label}</span>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); setRequestTarget(checkin); }}
                            className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-white shrink-0 active:scale-95 transition-all"
                            style={{ background: '#1a2418' }}
                          >
                            <Send className="w-3 h-3" />
                            {t('신청', 'Request')}
                          </button>
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl py-10 flex flex-col items-center justify-center gap-3 border border-white/60 border-dashed" style={{ background: 'rgba(255,255,255,0.30)' }}>
                <Leaf className="w-10 h-10 text-zinc-200" />
                <p className="text-zinc-400 font-medium text-sm">{t('아직 아무도 없어요', 'No one here yet')}</p>
                <p className="text-zinc-400 text-xs text-center px-6">{t('첫 번째로 체크인해서 사람들을 초대해보세요!', 'Be the first to check in and invite others!')}</p>
              </div>
            )}
          </div>

          {/* 진행 중인 번개 */}
          {profile && canOpenBolt && (
            <div className="rounded-3xl p-4 space-y-3" style={{ background: 'rgba(244,211,94,0.16)', border: '1px solid rgba(202,160,30,0.35)' }}>
              <div>
                <h3 className="font-bold text-base text-zinc-800 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#b8860b]" />
                  {t('번개', 'Bolts')}
                  <span className="text-[11px] font-bold text-[#7a5a00]">{t('지금 바로', 'Right now')}</span>
                  {placeEvents.length > 0 && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full text-white font-bold" style={{ background: '#b8860b' }}>{placeEvents.length}</span>
                  )}
                </h3>
              </div>
              {placeEvents.length === 0 ? (
                <p className="text-sm text-zinc-500">{t('지금 열린 번개가 없어요. 체크인하고 번개를 열어보세요.', 'No bolts right now. Check in and open one.')}</p>
              ) : placeEvents.map((ev) => (
                <button key={ev.id} onClick={() => setSelectedEvent(ev)}
                  className="w-full flex items-center gap-3 p-3.5 rounded-2xl border border-white/60 transition-colors text-left"
                  style={cardBg}
                >
                  <Zap className="w-5 h-5 shrink-0 text-[#b8860b]" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-bold text-zinc-800 truncate">{ev.title}</p>
                      {profile && ev.attendees.includes(profile.uid) && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 text-white" style={{ background: '#4f7a34' }}>{t('참가 중', 'Joined')}</span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" />
                      {(() => {
                        const ms = (ev.endAt?.toDate?.()?.getTime() ?? 0) - Date.now();
                        if (ms <= 0) return t('종료됨', 'Ended');
                        const hr = Math.floor(ms / 3600000);
                        const min = Math.floor((ms % 3600000) / 60000);
                        return hr > 0 ? t(`${hr}시간 ${min}분 남음`, `${hr}h ${min}m left`) : t(`${min}분 남음`, `${min}m left`);
                      })()}
                      · {t(`${ev.attendees.length}명 참가`, `${ev.attendees.length} joined`)}
                    </p>
                  </div>
                  <span className="text-xs font-bold shrink-0 text-[#7a5a00]">{t('보기', 'View')}</span>
                </button>
              ))}
            </div>
          )}

          {/* 다가오는 모임 */}
          {profile && canHostMeetup && (
            <div className="rounded-3xl p-4 space-y-3" style={{ background: 'rgba(143,181,112,0.14)', border: '1px solid rgba(143,181,112,0.35)' }}>
              <div>
                <h3 className="font-bold text-base text-zinc-800 flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-[#4f7a34]" />
                  {t('모임', 'Meetups')}
                  <span className="text-[11px] font-bold text-[#2d5a1b]">{t('날짜 지정', 'Scheduled')}</span>
                  {placeMeetups.length > 0 && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full text-white font-bold" style={{ background: '#1a2418' }}>{placeMeetups.length}</span>
                  )}
                </h3>
              </div>
              {placeMeetups.length === 0 ? (
                <p className="text-sm text-zinc-500">{t('아직 다가오는 모임이 없어요. 아래 \'모임 만들기\'로 첫 모임을 열어보세요.', 'No meetups yet. Use \'Create meetup\' below to host the first one.')}</p>
              ) : placeMeetups.map((m) => {
                const cat = MEETUP_CATEGORIES.find(c => c.id === m.category);
                const confirmed = Math.min(m.participantIds.length, m.capacity);
                const waiting = m.participantIds.length - confirmed;
                const myIndex = m.participantIds.indexOf(profile.uid);
                return (
                  <button key={m.id} onClick={() => setSelectedMeetupId(m.id)} className="w-full flex items-center gap-3 p-3.5 rounded-2xl border border-white/60 text-left active:scale-[0.98] transition-transform" style={cardBg}>
                    {cat && <cat.icon className="w-5 h-5 shrink-0 text-[#4f7a34]" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-bold text-zinc-800 truncate">{m.title}</p>
                        {myIndex >= 0 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 text-white" style={{ background: myIndex < m.capacity ? '#4f7a34' : '#a16207' }}>
                            {myIndex < m.capacity ? t('참가 중', 'Joined') : t('대기 중', 'Waiting')}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 shrink-0" />
                        <span className="truncate">{formatMeetupTime(m.startAt, lang)}</span>
                      </p>
                    </div>
                    <span className="text-xs font-bold shrink-0 text-[#2d5a1b]">
                      {confirmed}/{m.capacity}
                      {waiting > 0 && <span className="text-zinc-400 font-medium"> · {t(`대기 ${waiting}`, `+${waiting} waiting`)}</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* 오픈채팅방 — 보조 메뉴 (접힘) */}
          {profile && (
            <div className="space-y-2">
              <button
                onClick={() => setShowRooms(v => !v)}
                aria-expanded={showRooms}
                className="w-full flex items-center justify-between px-1 py-1 text-xs font-bold text-zinc-400"
              >
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  {t(`오픈채팅방 ${openRooms.length}`, `Open chat rooms (${openRooms.length})`)}
                </span>
                <ChevronUp className={cn('w-4 h-4 transition-transform', !showRooms && 'rotate-180')} />
              </button>
              {showRooms && (<>
              <div className="flex items-center justify-end px-1">
                {!openRooms.some(r => r.creatorId === profile.uid) && !showRoomForm && (
                  <button onClick={() => setShowRoomForm(true)} className="text-xs font-bold text-zinc-600 hover:text-zinc-800 transition-colors">
                    + {t('내 방 만들기', 'Create my room')}
                  </button>
                )}
              </div>

              {showRoomForm && (
                <div className="rounded-2xl border border-white/60 p-3.5 space-y-2.5" style={cardBg}>
                  <input
                    type="text"
                    placeholder={t('이 방에서 뭘 하나요? (예: 영어 회화 연습, 같이 작업해요)', "What's this room for? (e.g. English practice, co-working)")}
                    value={roomDesc}
                    onChange={(e) => setRoomDesc(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateRoom()}
                    autoFocus
                    className="w-full text-sm outline-none bg-transparent placeholder:text-zinc-300 text-zinc-800"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setShowRoomForm(false); setRoomDesc(''); }}
                      className="flex-1 py-2 text-xs font-bold text-zinc-500 rounded-xl"
                      style={{ background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(0,0,0,0.08)' }}
                    >
                      {t('취소', 'Cancel')}
                    </button>
                    <button
                      onClick={handleCreateRoom}
                      disabled={creatingRoom}
                      className="flex-[2] py-2 text-xs font-bold text-white rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-50"
                      style={{ background: '#1a2418' }}
                    >
                      {creatingRoom
                        ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        : t('방 만들기', 'Create room')}
                    </button>
                  </div>
                </div>
              )}

              {openRooms.length === 0 && !showRoomForm ? (
                <p className="text-xs text-zinc-300 text-center py-2">{t('아직 오픈 채팅방이 없어요', 'No open chat rooms yet')}</p>
              ) : openRooms.map((room) => {
                const isOwn = room.creatorId === profile.uid;
                const members = room.members ?? [];
                const isMember = members.includes(profile.uid);
                const isJoining = joiningRoomId === room.id;
                return (
                  <button key={room.id} onClick={() => handleEnterRoom(room)} disabled={isJoining}
                    className="w-full flex items-center gap-3 p-3.5 rounded-2xl border border-white/60 transition-colors disabled:opacity-50 text-left"
                    style={cardBg}
                  >
                    {room.creatorPhoto
                      ? <img src={room.creatorPhoto} className="w-8 h-8 rounded-full object-cover shrink-0 border-2 border-white" referrerPolicy="no-referrer" />
                      : <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.65)' }}><Users className="w-4 h-4 text-zinc-400" /></div>
                    }
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-bold text-zinc-800 truncate">{isOwn ? t('내 방', 'My room') : t(`${room.creatorName || '익명'}의 방`, `${room.creatorName || 'Anonymous'}'s room`)}</p>
                        {isOwn && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 text-white" style={{ background: '#1a2418' }}>{t('나', 'Me')}</span>}
                      </div>
                      {room.description
                        ? <p className="text-xs text-zinc-500 truncate mt-0.5">{room.description}</p>
                        : <p className="text-xs text-zinc-400">{t(`${members.length}명 참여 중`, `${members.length} joined`)}</p>
                      }
                      {room.description && <p className="text-[11px] text-zinc-300 mt-0.5">{t(`${members.length}명 참여 중`, `${members.length} joined`)}</p>}
                    </div>
                    {isJoining
                      ? <div className="w-4 h-4 border-2 border-zinc-200 border-t-zinc-500 rounded-full animate-spin shrink-0" />
                      : <span className="text-xs font-bold px-3 py-1.5 rounded-xl shrink-0 text-white" style={{ background: isMember ? 'rgba(143,181,112,0.85)' : '#1a2418' }}>{isMember ? t('열기', 'Open') : t('참여하기', 'Join')}</span>
                    }
                  </button>
                );
              })}
              </>)}
            </div>
          )}

          <div className="h-4" />
        </div>

        {/* ── 하단 고정: 체크인 / 번개 열기 / 모임 만들기 ── */}
        {profile && (
          <div className="shrink-0 px-4 pt-3 space-y-2" style={{ borderTop: '1px solid rgba(0,0,0,0.06)', background: 'rgba(255,255,255,0.6)', paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
            {hint && <p role="status" className="text-xs font-bold text-center text-[#7a5a00]">{hint}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleCheckIn}
                disabled={checkingIn}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl font-bold transition-all active:scale-95 disabled:opacity-50 text-sm"
                style={isCheckedIn
                  ? { background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)', color: '#dc2626' }
                  : { background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(0,0,0,0.1)', color: '#1a2418' }
                }
              >
                {checkingIn
                  ? <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                  : isCheckedIn
                    ? <><Check className="w-4 h-4" />{t('체크아웃', 'Check out')}</>
                    : <><MapPin className="w-4 h-4" />{t('체크인', 'Check in')}</>}
              </button>
              {canOpenBolt && (
                <button
                  onClick={openBolt}
                  className="flex-1 py-2 rounded-2xl font-bold text-sm transition-all active:scale-95"
                  style={isCheckedIn
                    ? { background: '#f4d35e', color: '#1a2418' }
                    : { background: 'rgba(244,211,94,0.25)', color: '#7a5a00', border: '1px solid rgba(202,160,30,0.3)' }}
                >
                  <span className="flex items-center justify-center gap-1"><Zap className="w-4 h-4" />{t('번개 열기', 'Open bolt')}</span>
                  <span className="block text-[10px] font-medium opacity-70">{t('지금 바로', 'Right now')}</span>
                </button>
              )}
              {canHostMeetup && (
                <button
                  onClick={() => setShowCreateMeetup(true)}
                  disabled={!placeLocation}
                  className="flex-1 py-2 rounded-2xl font-bold text-sm text-white transition-all active:scale-95 disabled:opacity-40"
                  style={{ background: '#1a2418', boxShadow: '0 8px 24px -8px rgba(0,0,0,0.3)' }}
                >
                  <span className="flex items-center justify-center gap-1"><CalendarDays className="w-4 h-4" />{t('모임 만들기', 'Create meetup')}</span>
                  <span className="block text-[10px] font-medium opacity-70">{t('날짜 지정', 'Scheduled')}</span>
                </button>
              )}
            </div>
          </div>
        )}
      </motion.div>

      {activeRoom && profile && (
        <ErrorBoundary key={activeRoom.id}>
          <OpenChatModal
            room={activeRoom}
            myProfile={profile}
            onClose={() => setActiveRoom(null)}
            onLeave={() => setActiveRoom(null)}
          />
        </ErrorBoundary>
      )}

      <AnimatePresence>
        {selectedEvent && (
          <>
            <div className="fixed inset-0 z-[55]" onClick={() => setSelectedEvent(null)} />
            <EventPanel
              event={placeEvents.find(e => e.id === selectedEvent.id) ?? selectedEvent}
              myProfile={profile}
              canJoin={isCheckedIn}
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
            fixedLocationName={displayName || place?.formattedAddress?.split(',')[0] || t('이름 없는 장소', 'Unnamed place')}
            placeId={placeId}
            onClose={() => setShowCreateEvent(false)}
            onCreated={() => setShowCreateEvent(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCreateMeetup && profile && placeLocation && (
          <CreateMeetupModal
            myProfile={profile}
            placeId={placeId}
            placeName={displayName}
            location={placeLocation}
            onClose={() => setShowCreateMeetup(false)}
            onCreated={(id) => { setShowCreateMeetup(false); setSelectedMeetupId(id); }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedMeetup && profile && (
          <MeetupPanel meetup={selectedMeetup} myProfile={profile} onClose={() => setSelectedMeetupId(null)} />
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
            className="fixed inset-0 z-[70] flex items-end justify-center bg-black/15 backdrop-blur-[2px]"
            onClick={() => setViewingProfile(null)}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="w-full sm:max-w-sm rounded-t-[40px] p-6 space-y-5 font-sans border border-white/60 shadow-2xl"
              style={panelBg}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1 rounded-full mx-auto" style={{ background: 'rgba(0,0,0,0.12)' }} />
              <div className="flex items-center gap-4">
                <img src={viewingProfile.userPhoto} alt={viewingProfile.userName} className="w-20 h-20 rounded-3xl object-cover border-2 border-white shadow-md" referrerPolicy="no-referrer" />
                <div className="space-y-1.5">
                  <p className="text-xl font-bold text-zinc-800">{viewingProfile.userName}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {viewingProfile.userField && (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full text-white" style={{ background: '#1a2418' }}>{viewingProfile.userField}</span>
                    )}
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full text-zinc-600" style={{ background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(0,0,0,0.08)' }}>
                      {getStyleLabel(viewingProfile.userStyle)}
                    </span>
                  </div>
                </div>
              </div>
              {viewingProfile.userTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {viewingProfile.userTags.map(tag => (
                    <span key={tag} className="text-xs font-medium text-zinc-500 px-3 py-1.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(0,0,0,0.06)' }}>#{tag}</span>
                  ))}
                </div>
              )}
              {profile && viewingProfile.userId !== profile.uid && (() => {
                if (!isCheckedIn) return (
                  <div className="w-full flex items-center justify-center py-4 rounded-2xl font-bold text-sm text-zinc-400" style={{ background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(0,0,0,0.06)' }}>
                    {t('체크인 후 대화 가능해요', 'Check in to start a chat')}
                  </div>
                );
                const { blocked, label } = getConnectionState(viewingProfile.userId);
                return blocked ? (
                  <div className="w-full flex items-center justify-center py-4 rounded-2xl font-bold text-sm text-zinc-400" style={{ background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(0,0,0,0.06)' }}>
                    {label}
                  </div>
                ) : (
                  <button
                    onClick={() => { setRequestTarget(viewingProfile); setViewingProfile(null); }}
                    className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold transition-all active:scale-95 text-white"
                    style={{ background: '#1a2418', boxShadow: '0 8px 24px -8px rgba(0,0,0,0.3)' }}
                  >
                    <Send className="w-4 h-4" />
                    {t('말차 요청보내기', 'Send a Matcha request')}
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

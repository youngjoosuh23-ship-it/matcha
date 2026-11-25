import { useEffect, useState, useRef, useMemo } from 'react';
import { Map, useMap, useMapsLibrary, AdvancedMarker } from '@vis.gl/react-google-maps';
import { collection, onSnapshot, query, setDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db, subscribeToActiveEvents, subscribeToRecentPlaceStats, subscribeToMyMarks, subscribeToSharedMarks, deleteMark, createMark, subscribeToUpcomingMeetups } from '../lib/firebase';
import { CheckIn, UserProfile, ChatRequest, Chat, Event, PlaceStat, Mark, TourPlace, TourFestival, Meetup, MEETUP_CATEGORIES } from '../types';
import { filterMeetups, distKm, DEFAULT_MEETUP_FILTER, type MeetupFilter, type MeetupPeriod } from '../lib/meetupFilter';
import { buildPlacePins, clusterPins, CAFE_TYPES, type PlacePin } from '../lib/placePins';

// 손그림 마커 (public/markers, scripts/make-map-markers.mjs로 생성). 바늘·깃대 끝이 이미지 아래 가운데.
const MARKER = {
  bolt: '/markers/star.png',          // 번개 진행 중
  meetup: '/markers/heart.png',       // 다가오는 모임
  checkin: '/markers/leaf.png',       // 체크인만
  myLocation: '/markers/house.png',   // 현재 위치 체크인(custom_)
  cafe: '/markers/pin-hole.png',      // 이 지역 카페 (활동 없음)
  cafeSelected: '/markers/pin-star.png',
  cluster: '/markers/pin-dots.png',   // 묶인 장소 — 구멍에 개수
};
const PIN_H = 32, PIN_H_SELECTED = 38;  // 지도 위 아이콘 크기는 모두 이 값으로 통일
const placeIcon = (p: PlacePin) =>
  p.bolts > 0 ? MARKER.bolt : p.meetups > 0 ? MARKER.meetup : p.placeId.startsWith('custom_') ? MARKER.myLocation : MARKER.checkin;
import MarksPanel from './MarksPanel';
import CafeSearchBar from './CafeSearchBar';
import ActivePlacesSheet, { type PickPlace } from './ActivePlacesSheet';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { MapPin, X, Check, LocateFixed, CalendarDays, Ellipsis, Coffee, Landmark, PartyPopper, Drama, Toilet, Clock, Lock, Users, Info, Wallet, Link, BookOpen, Flame, MapPinned } from 'lucide-react';
import CafeDetails from './CafeDetails';
import HotplPanel from './HotplPanel';
import TourFestivalPanel from './TourFestivalPanel';
import CultureEventPanel from './CultureEventPanel';
import { fetchNearbyTourPlaces, fetchNearbyFestivals } from '../lib/tourapi';
import { fetchCultureEvents } from '../lib/cultureapi';
import { fetchNearbyRestrooms } from '../lib/restroomapi';
import { fetchNearbyAttractions, attractionIcon } from '../lib/attractionsapi';
import { CultureEvent } from '../types';
import type { Restroom } from '../lib/restroomapi';
import type { Attraction } from '../lib/attractionsapi';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../lib/i18n';
import { formatMeetupTime } from '../lib/utils';

// 내 마킹을 만든 순서대로 점선으로 잇는다 (2개 이상일 때)
function MarkRoute({ path }: { path: { lat: number; lng: number }[] }) {
  const map = useMap();
  const key = JSON.stringify(path);
  useEffect(() => {
    if (!map || path.length < 2) return;
    const line = new google.maps.Polyline({
      map, path, strokeOpacity: 0, clickable: false,
      icons: [{ icon: { path: 'M 0,-1 0,1', strokeColor: '#4f7a34', strokeOpacity: 0.9, strokeWeight: 3, scale: 3 }, offset: '0', repeat: '14px' }],
    });
    return () => line.setMap(null);
  }, [map, key]);
  return null;
}
// 주변 정보 레이어의 원형 아이콘 마커 (이름표는 확대하거나 마우스를 올리면 보임)
function InfoMarker({ position, ring, icon, label, onClick }: {
  position: google.maps.LatLngLiteral; ring: string; icon: React.ReactNode; label?: string | null; onClick: () => void;
}) {
  return (
    <AdvancedMarker position={position} onClick={onClick}>
      <div className="relative group cursor-pointer">
        <div className="w-8 h-8 rounded-full shadow-md flex items-center justify-center transform group-hover:scale-110 transition-transform"
          style={{ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: `2px solid ${ring}` }}>
          {icon}
        </div>
        {label && (
          <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 marker-label opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            <div className="px-2 py-1 rounded-lg shadow-md text-[10px] font-bold text-zinc-700" style={{ background: 'rgba(255,255,255,0.90)', border: '1px solid rgba(0,0,0,0.06)' }}>{label}</div>
          </div>
        )}
      </div>
    </AdvancedMarker>
  );
}
const markTime = (m: Mark) => m.createdAt?.toMillis?.() ?? Infinity;  // 저장 직후(서버 시각 전)는 맨 뒤

interface MainMapProps {
  profile: UserProfile | null;
  sentRequests: ChatRequest[];
  activeChats: Chat[];
}

export default function MainMap({ profile, sentRequests, activeChats }: MainMapProps) {
  const { lang, t } = useLanguage();
  const map = useMap();
  const placesLib = useMapsLibrary('places');
  const [activeCheckins, setActiveCheckins] = useState<CheckIn[]>([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [mapBounds, setMapBounds] = useState<google.maps.LatLngBoundsLiteral | null>(null);
  const [customCheckinModal, setCustomCheckinModal] = useState(false);
  const [customPlaceName, setCustomPlaceName] = useState('');
  const [checkingIn, setCheckingIn] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showHotpl, setShowHotpl] = useState(false);
  const [activeEvents, setActiveEvents] = useState<Event[]>([]);
  const [recentPlaceStats, setRecentPlaceStats] = useState<PlaceStat[]>([]);
  const [myMarks, setMyMarks] = useState<Mark[]>([]);
  const [sharedMarks, setSharedMarks] = useState<Mark[]>([]);
  const [selectedMark, setSelectedMark] = useState<Mark | null>(null);
  const [showMarksPanel, setShowMarksPanel] = useState(false);
  const [tourPlaces, setTourPlaces] = useState<TourPlace[]>([]);
  const [tourFestivals, setTourFestivals] = useState<TourFestival[]>([]);
  const [selectedFestival, setSelectedFestival] = useState<TourFestival | null>(null);
  const [cultureEvents, setCultureEvents] = useState<CultureEvent[]>([]);
  const [selectedCultureEvent, setSelectedCultureEvent] = useState<CultureEvent | null>(null);
  const [restrooms, setRestrooms] = useState<Restroom[]>([]);
  const [selectedRestroom, setSelectedRestroom] = useState<Restroom | null>(null);
  const [attractions, setAttractions] = useState<Attraction[]>([]);
  const [selectedAttraction, setSelectedAttraction] = useState<Attraction | null>(null);
  const [markDrop, setMarkDrop] = useState<{
    location: { lat: number; lng: number };
    name: string; memo: string; sharedWith: string[];
  } | null>(null);
  const [savingMark, setSavingMark] = useState(false);
  const [pickingMark, setPickingMark] = useState(false);  // 켜져 있으면 목록에서 고르거나 지도를 누른 곳에 마킹
  const [pickPlaces, setPickPlaces] = useState<{ places: PickPlace[]; loading: boolean; error: string | null }>({ places: [], loading: false, error: null });
  const [meetups, setMeetups] = useState<Meetup[]>([]);
  const [meetupFilter, setMeetupFilter] = useState<MeetupFilter>(DEFAULT_MEETUP_FILTER);
  const [showMeetupFilter, setShowMeetupFilter] = useState(false);
  const [openMeetup, setOpenMeetup] = useState<{ id: string } | null>(null);
  const [labelsOn, setLabelsOn] = useState(false);
  // 레이어: 마킹, 주변 정보(관광지·문화행사·화장실). 기본 꺼짐, 기기별 설정이라 localStorage.
  const [layers, setLayers] = useState<{ marks: boolean; info: boolean }>(() => {
    try { return { marks: false, info: false, ...JSON.parse(localStorage.getItem('matcha_layers') ?? '{}') }; }
    catch { return { marks: false, info: false }; }
  });
  const infoLayerRef = useRef(layers.info);
  const showInfo = layers.info;
  const [zoom, setZoom] = useState(13);
  // "이 지역 카페 보기" 결과 — 화면 표시용 상태에만 두고 저장하지 않음 (Google Places 약관)
  const [nearbyCafes, setNearbyCafes] = useState<{ id: string; location: { lat: number; lng: number } }[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyNote, setNearbyNote] = useState<string | null>(null);
  const lastTourFetchRef = useRef<{ lat: number; lng: number; zoom: number } | null>(null);


  // Pan to user's GPS location once on initial load
  useEffect(() => {
    if (!map) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setUserLocation(loc);
      map.panTo(loc);
      map.setZoom(15);
    }, () => {});
  }, [map]);

  // Track position for the blue dot only — no pan
  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Fetch TourAPI places whenever map becomes idle (pan/zoom ends)
  useEffect(() => {
    if (!map) return;
    const listener = map.addListener('idle', () => {
      const center = map.getCenter();
      if (!center) return;
      const lat = center.lat();
      const lng = center.lng();
      const zoom = map.getZoom() ?? 0;
      setLabelsOn(zoom >= 16);
      setZoom(zoom);
      const bounds = map.getBounds();
      if (!bounds) return;
      setMapBounds(bounds.toJSON());
      const last = lastTourFetchRef.current;
      if (last && Math.abs(lat - last.lat) < 0.005 && Math.abs(lng - last.lng) < 0.007 && zoom === last.zoom) return;
      lastTourFetchRef.current = { lat, lng, zoom };
      if (!infoLayerRef.current) return;
      const boundsParam = {
        swLat: bounds.getSouthWest().lat(),
        swLng: bounds.getSouthWest().lng(),
        neLat: bounds.getNorthEast().lat(),
        neLng: bounds.getNorthEast().lng(),
      };

      const culturePromise = fetchCultureEvents(boundsParam);

      const restroomPromise = zoom >= 15
        ? fetchNearbyRestrooms(boundsParam)
        : Promise.resolve([] as Restroom[]);

      const attractionPromise = zoom >= 12
        ? fetchNearbyAttractions(boundsParam)
        : Promise.resolve([] as Attraction[]);

      Promise.allSettled([
        fetchNearbyTourPlaces(lat, lng, 3000),
        fetchNearbyFestivals(lat, lng, 5000),
        culturePromise,
        restroomPromise,
        attractionPromise,
      ]).then(([placesResult, festivalsResult, cultureResult, restroomsResult, attractionsResult]) => {
        if (placesResult.status === 'fulfilled') setTourPlaces(placesResult.value);
        if (festivalsResult.status === 'fulfilled') setTourFestivals(festivalsResult.value);
        if (cultureResult.status === 'fulfilled') setCultureEvents(cultureResult.value);
        if (restroomsResult.status === 'fulfilled') setRestrooms(restroomsResult.value);
        if (attractionsResult.status === 'fulfilled') setAttractions(attractionsResult.value);
      });
    });
    return () => listener.remove();
  }, [map]);

  // Sync active check-ins from Firebase
  useEffect(() => {
    const checkinsPath = 'checkins';
    const q = query(collection(db, checkinsPath));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const now = Date.now();
      const checkins = snapshot.docs
        .map(doc => doc.data() as CheckIn)
        .filter(c => {
          const ms = c.expiresAt?.toDate?.()?.getTime() ?? new Date(c.expiresAt).getTime();
          return ms > now;
        });
      setActiveCheckins(checkins);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, checkinsPath);
    });
    return () => unsubscribe();
  }, []);

  // Auto-checkout when check-in expires (1 hour TTL)
  useEffect(() => {
    if (!profile) return;
    const checkExpiry = () => {
      const mine = activeCheckins.find(c => c.userId === profile.uid);
      if (!mine) return;
      const expiresMs = mine.expiresAt?.toDate?.()?.getTime() ?? new Date(mine.expiresAt).getTime();
      if (expiresMs <= Date.now()) {
        deleteDoc(doc(db, 'checkins', profile.uid)).catch(() => {});
      }
    };
    checkExpiry();
    const id = setInterval(checkExpiry, 60_000);
    return () => clearInterval(id);
  }, [activeCheckins, profile]);

  const chatContacts = useMemo(() => {
    if (!profile) return [];
    const seen = new Set<string>();
    const result: { uid: string; name: string; photo: string }[] = [];
    for (const chat of activeChats) {
      for (const uid of chat.participants) {
        if (uid === profile.uid || seen.has(uid)) continue;
        seen.add(uid);
        result.push({ uid, name: chat.participantNames[uid] ?? '', photo: chat.participantPhotos[uid] ?? '' });
      }
    }
    return result;
  }, [activeChats, profile]);

  const handleSaveMark = async () => {
    if (!profile || !markDrop || savingMark) return;
    setSavingMark(true);
    try {
      await createMark(
        profile.uid, profile.displayName, profile.photoURL,
        markDrop.name.trim() || t('마킹', 'Mark'), markDrop.location,
        markDrop.memo, null, markDrop.sharedWith,
      );
      setMarkDrop(null);
      setLayers(v => ({ ...v, marks: true }));
    } finally {
      setSavingMark(false);
    }
  };

  const handleCustomCheckin = async () => {
    if (!profile || checkingIn) return;
    setCheckingIn(true);
    try {
      await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej)
      ).then(async (pos) => {
        const location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const placeId = `custom_${profile.uid}`;
        const placeName = customPlaceName.trim() || t('내 현재 위치', 'My current location');
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
          isCustomLocation: true,
        };
        await setDoc(doc(db, 'checkins', profile.uid), checkin);
        if (map) { map.panTo(location); map.setZoom(16); }
        setCustomCheckinModal(false);
        setCustomPlaceName('');
        setSelectedPlaceId(placeId);
      });
    } catch (err) {
      console.error('Custom checkin failed', err);
    } finally {
      setCheckingIn(false);
    }
  };

  const handlePlaceSelect = (placeId: string, location?: google.maps.LatLngLiteral) => {
    setSelectedPlaceId(placeId);
    setOpenMeetup(null);
    if (location && map) {
      map.panTo(location);
      map.setZoom(17);
    }
  };

  // Subscribe to active events
  useEffect(() => {
    return subscribeToActiveEvents(setActiveEvents);
  }, []);

  useEffect(() => {
    infoLayerRef.current = layers.info;
    try { localStorage.setItem('matcha_layers', JSON.stringify(layers)); } catch {}
    // 주변 정보를 켜면 지도를 움직이지 않아도 바로 불러오도록
    if (layers.info && map) { lastTourFetchRef.current = null; google.maps.event.trigger(map, 'idle'); }
  }, [layers, map]);

  // Subscribe to upcoming meetups
  useEffect(() => {
    return subscribeToUpcomingMeetups(setMeetups);
  }, []);

  // 지도 핀 = 장소 핀. 체크인·모임(필터 통과분)·진행 중 번개를 placeId로 묶고, 줌에 따라 클러스터링
  const placePins = useMemo(
    () => buildPlacePins(activeCheckins, filterMeetups(meetups, meetupFilter, userLocation), activeEvents),
    [activeCheckins, meetups, meetupFilter, userLocation, activeEvents],
  );
  const pinClusters = useMemo(() => clusterPins(placePins, zoom), [placePins, zoom]);
  const activePlaceIds = useMemo(() => new Set(placePins.map(p => p.placeId)), [placePins]);
  const meetupCount = placePins.reduce((n, p) => n + p.meetups, 0);
  // 지도 아래 목록: 지금 보이는 범위 안의 활동 있는 장소, 번개 > 모임 > 체크인 순
  const activePinsInView = useMemo(() => {
    const b = mapBounds;
    const inView = b
      ? placePins.filter(p => p.location.lat <= b.north && p.location.lat >= b.south && p.location.lng <= b.east && p.location.lng >= b.west)
      : placePins;
    const score = (p: PlacePin) => p.bolts * 100 + p.meetups * 10 + p.checkins;
    return [...inView].sort((x, y) => score(y) - score(x)).slice(0, 50);
  }, [placePins, mapBounds]);

  useEffect(() => {
    // 지도 가운데 기준 — 지도를 옮기면(idle → mapBounds) 다시 불러옴
    if (!pickingMark || !placesLib || !mapBounds) return;
    const center = { lat: (mapBounds.north + mapBounds.south) / 2, lng: (mapBounds.east + mapBounds.west) / 2 };
    let cancelled = false;
    setPickPlaces(p => ({ ...p, loading: true, error: null }));
    placesLib.Place.searchNearby({
      fields: ['id', 'displayName', 'location'],
      locationRestriction: { center, radius: 2000 },
      rankPreference: placesLib.SearchNearbyRankPreference.DISTANCE,
      maxResultCount: 20,
    }).then(({ places }) => {
      if (cancelled) return;
      setPickPlaces({
        loading: false, error: null,
        places: places.flatMap(p => p.location ? [{ id: p.id, name: p.displayName ?? '', location: p.location.toJSON(), distKm: distKm(center, p.location.toJSON()) }] : []),
      });
    }).catch((e) => {
      console.error('mark nearby places error:', e);
      if (!cancelled) setPickPlaces({ places: [], loading: false, error: t('장소를 불러오지 못했어요. 지도를 눌러 마킹하세요.', 'Could not load places. Tap the map to mark.') });
    });
    return () => { cancelled = true; };
  }, [pickingMark, placesLib, mapBounds]);

  const handleNearbyCafes = async () => {
    if (!placesLib || !map || nearbyLoading) return;
    const center = map.getCenter();
    const ne = map.getBounds()?.getNorthEast();
    if (!center || !ne) return;
    setNearbyLoading(true);
    setNearbyNote(null);
    try {
      const { places } = await placesLib.Place.searchNearby({
        fields: ['id', 'location'],   // 이름은 받지 않음 — 탭하면 카페 시트가 불러옴
        locationRestriction: {
          center,
          radius: Math.min(50000, distKm(center.toJSON(), ne.toJSON()) * 1000),
        },
        includedTypes: CAFE_TYPES,
        maxResultCount: 20,
      });
      const found = places.flatMap(p => p.location ? [{ id: p.id, location: p.location.toJSON() }] : []);
      setNearbyCafes(found);
      if (found.length === 0) setNearbyNote(t('이 지역에서 카페를 찾지 못했어요.', 'No cafes found in this area.'));
    } catch (e) {
      console.error('nearby cafes error:', e);
      setNearbyNote(t('카페를 불러오지 못했어요. 다시 시도해주세요.', 'Could not load cafes. Please try again.'));
    } finally {
      setNearbyLoading(false);
    }
  };
  const myMeetups = useMemo(() => {
    const now = Date.now();
    return meetups
      .filter(m => profile && m.participantIds.includes(profile.uid) && m.endAt.toMillis() > now)
      .sort((a, b) => a.startAt.toMillis() - b.startAt.toMillis());
  }, [meetups, profile]);
  const meetupFilterActive = meetupFilter.radiusKm !== null || meetupFilter.category !== null || meetupFilter.period !== DEFAULT_MEETUP_FILTER.period;

  // Subscribe to place event history (last 7 days)
  useEffect(() => {
    return subscribeToRecentPlaceStats(7, setRecentPlaceStats);
  }, []);

  // Subscribe to marks (mine + shared with me)
  useEffect(() => {
    if (!profile) return;
    const unsubMy = subscribeToMyMarks(profile.uid, setMyMarks);
    const unsubShared = subscribeToSharedMarks(profile.uid, setSharedMarks);
    return () => { unsubMy(); unsubShared(); };
  }, [profile?.uid]);

  const myMarksOrdered = useMemo(() => [...myMarks].sort((a, b) => markTime(a) - markTime(b)), [myMarks]);

  // Group check-ins by placeId for markers
  const checkinsByPlace = useMemo(() => activeCheckins.reduce((acc, checkin) => {
    if (!acc[checkin.placeId]) acc[checkin.placeId] = [];
    acc[checkin.placeId].push(checkin);
    return acc;
  }, {} as Record<string, CheckIn[]>), [activeCheckins]);

  return (
    <div className={`relative h-full w-full${labelsOn ? ' map-labels-on' : ''}`}>
      <div className="w-full" style={{ height: selectedPlaceId ? '100%' : 'calc(100% - 34vh)' }}>
      <Map
        defaultCenter={{ lat: 37.5665, lng: 126.9780 }} // Seoul
        defaultZoom={13}
        mapId={process.env.GOOGLE_MAP_ID || 'COFFEE_CHAT_MAP'}
        disableDefaultUI={true}
        internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
        className="w-full h-full"
        onClick={(e) => {
          const latLng = (e as any).detail?.latLng;
          if (pickingMark && latLng) {
            setMarkDrop({ location: latLng, name: '', memo: '', sharedWith: [] });
            setPickingMark(false);
            (e as any).stop?.();
            return;
          }
          const placeId = (e as any).detail?.placeId;
          if (placeId) {
            handlePlaceSelect(placeId);
            (e as any).stop?.();
          } else {
            setSelectedPlaceId(null);
          }
        }}
      >
        {/* "이 지역 카페 보기" 결과 — 활동 없는 카페는 흐린 점 (이름 없음, 탭하면 카페 시트) */}
        {nearbyCafes.filter(c => !activePlaceIds.has(c.id)).map((c) => (
          <AdvancedMarker key={`nearby-${c.id}`} position={c.location} onClick={() => handlePlaceSelect(c.id, c.location)}>
            <img
              src={c.id === selectedPlaceId ? MARKER.cafeSelected : MARKER.cafe}
              alt={t('카페', 'Cafe')}
              draggable={false}
              className="block cursor-pointer transition-transform origin-bottom hover:scale-125"
              style={{ height: c.id === selectedPlaceId ? PIN_H_SELECTED : PIN_H }}
            />
          </AdvancedMarker>
        ))}

        {/* 장소 핀 — 활동 있는 장소(체크인·모임·번개)마다 하나, 가까우면 클러스터 */}
        {pinClusters.map((cluster) => {
          if (cluster.pins.length > 1) {
            return (
              <AdvancedMarker
                key={`cluster-${cluster.key}`}
                position={cluster.location}
                onClick={() => { map?.panTo(cluster.location); map?.setZoom(Math.min(zoom + 2, 18)); }}
              >
                <div className="relative cursor-pointer transition-transform origin-bottom hover:scale-110" aria-label={t(`장소 ${cluster.pins.length}곳`, `${cluster.pins.length} places`)}>
                  <img src={MARKER.cluster} alt="" draggable={false} className="block" style={{ height: PIN_H }} />
                  {/* 핀 머리의 흰 구멍(높이의 약 39%) 위치에 개수 */}
                  <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 text-[9px] font-black text-[#5a1c16]" style={{ top: '39%' }}>
                    {cluster.pins.length}
                  </span>
                </div>
              </AdvancedMarker>
            );
          }
          const p = cluster.pins[0];
          const selected = p.placeId === selectedPlaceId;
          return (
            <AdvancedMarker
              key={`place-${p.placeId}`}
              position={p.location}
              zIndex={selected ? 1000 : undefined}
              onClick={() => { handlePlaceSelect(p.placeId, p.location); }}
            >
              {/* 손그림 아이콘(아래 가운데 = 장소 위치) + 오른쪽에 상태 쪽지 */}
              <div className="relative group cursor-pointer">
                <img
                  src={placeIcon(p)}
                  alt=""
                  draggable={false}
                  className="block transition-transform origin-bottom group-hover:scale-110"
                  style={{ height: selected ? PIN_H_SELECTED : PIN_H }}
                />
                <div
                  className="absolute left-[calc(50%+14px)] flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[10px] font-bold"
                  style={{ top: 4, background: 'rgba(255,253,246,0.95)', color: '#5a1c16', border: '1px solid rgba(90,28,22,0.25)', boxShadow: '1px 1px 0 rgba(90,28,22,0.12)', transform: 'rotate(-2deg)' }}
                >
                  {p.bolts > 0 && <span>{t('번개', 'Bolt')}</span>}
                  {p.meetups > 0 && <span>{t(`모임 ${p.meetups}`, `${p.meetups} meetups`)}</span>}
                  {p.checkins > 0 && <span>{t(`${p.checkins}명`, `${p.checkins} here`)}</span>}
                </div>
                <div className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 marker-label opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  <div className="px-2 py-1 rounded-lg shadow-md text-[10px] font-bold text-zinc-700" style={{ background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(0,0,0,0.06)' }}>
                    {p.name}
                  </div>
                </div>
              </div>
            </AdvancedMarker>
          );
        })}

        {/* My mark markers */}
        {layers.marks && <MarkRoute path={myMarksOrdered.map(m => m.location)} />}
        {layers.marks && myMarksOrdered.map((mark, i) => (
          <AdvancedMarker
            key={`mark-my-${mark.id}`}
            position={mark.location}
            onClick={() => setSelectedMark(mark)}
          >
            <div className="relative group cursor-pointer">
              <div className="relative">
                <img
                  src={mark.creatorPhoto}
                  className="w-8 h-8 rounded-full object-cover shadow-lg border-2 transition-transform group-hover:scale-110"
                  style={{ borderColor: '#8fb570' }}
                  referrerPolicy="no-referrer"
                />
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-white" style={{ background: '#4f7a34', border: '1.5px solid #fff' }}>
                  {i + 1}
                </div>
              </div>
              <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none">
                <div className="px-2 py-0.5 rounded-md shadow text-[10px] font-bold text-[#2d5a1b]" style={{ background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(79,122,52,0.35)' }}>
                  {(mark.memo || mark.placeName).slice(0, 14)}
                </div>
              </div>
            </div>
          </AdvancedMarker>
        ))}

        {/* Shared-with-me mark markers */}
        {layers.marks && sharedMarks.map(mark => (
          <AdvancedMarker
            key={`mark-shared-${mark.id}`}
            position={mark.location}
            onClick={() => setSelectedMark(mark)}
          >
            <div className="relative group cursor-pointer">
              <div className="relative">
                <img
                  src={mark.creatorPhoto}
                  className="w-8 h-8 rounded-full object-cover shadow-lg border-2 transition-transform group-hover:scale-110"
                  style={{ borderColor: '#c9b8e8' }}
                  referrerPolicy="no-referrer"
                />
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: '#c9b8e8', border: '1.5px solid #fff' }}>
                  <MapPin className="w-2.5 h-2.5 text-white" />
                </div>
              </div>
              <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none">
                <div className="px-2 py-0.5 rounded-md shadow text-[10px] font-bold text-zinc-700" style={{ background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(0,0,0,0.08)' }}>
                  {mark.creatorName} · {(mark.memo || mark.placeName).slice(0, 12)}
                </div>
              </div>
            </div>
          </AdvancedMarker>
        ))}


        {/* User location marker */}
        {userLocation && (
          <AdvancedMarker position={userLocation}>
            <div className="relative flex items-center justify-center">
              <div className="absolute w-10 h-10 bg-blue-400/30 rounded-full animate-ping" />
              <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg" />
            </div>
          </AdvancedMarker>
        )}

        {/* 주변 정보 레이어 — 관광지, 축제, 명소(줌 12+), 화장실(줌 15+), 문화행사 */}
        {showInfo && tourPlaces.filter(p => !checkinsByPlace[`tour_${p.contentId}`]).map(place => (
          <InfoMarker key={`tour-place-${place.contentId}`} position={place.location} ring="rgba(249,115,22,0.6)" label={place.title}
            icon={<Landmark className="w-4 h-4 text-orange-600" />}
            onClick={() => { setSelectedPlaceId(`tour_${place.contentId}`); setSelectedFestival(null); map?.panTo(place.location); map?.setZoom(17); }} />
        ))}
        {showInfo && tourFestivals.map(festival => (
          <InfoMarker key={`tour-festival-${festival.contentId}`} position={festival.location} ring="rgba(234,179,8,0.7)" label={festival.title}
            icon={<PartyPopper className="w-4 h-4 text-yellow-600" />}
            onClick={() => { setSelectedFestival(festival); setSelectedPlaceId(null); map?.panTo(festival.location); map?.setZoom(15); }} />
        ))}
        {showInfo && attractions.map(att => {
          const Icon = attractionIcon(att.tagType), historic = att.category === 'historic';
          return (
            <InfoMarker key={`attraction-${att.id}`} position={att.location} ring={historic ? 'rgba(180,120,60,0.6)' : 'rgba(99,102,241,0.55)'} label={att.name}
              icon={<Icon className={`w-4 h-4 ${historic ? 'text-amber-700' : 'text-indigo-500'}`} />}
              onClick={() => { setSelectedAttraction(att); setSelectedFestival(null); setSelectedCultureEvent(null); setSelectedPlaceId(null); map?.panTo(att.location); }} />
          );
        })}
        {showInfo && restrooms.map(room => (
          <InfoMarker key={`restroom-${room.id}`} position={room.location} ring="rgba(59,130,246,0.55)" label={room.name}
            icon={<Toilet className="w-4 h-4 text-blue-500" />}
            onClick={() => setSelectedRestroom(room)} />
        ))}
        {showInfo && cultureEvents.map(evt => (
          <InfoMarker key={`culture-${evt.seq}`} position={evt.location} ring="rgba(124,58,237,0.65)" label={evt.title}
            icon={<Drama className="w-4 h-4 text-violet-600" />}
            onClick={() => { setSelectedCultureEvent(evt); setSelectedFestival(null); setSelectedPlaceId(null); map?.panTo(evt.location); map?.setZoom(15); }} />
        ))}

        {/* 드롭된 마킹 위치 프리뷰 핀 */}
        {markDrop && (
          <AdvancedMarker position={markDrop.location}>
            <motion.div
              initial={{ scale: 0, y: -10 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', damping: 12, stiffness: 400 }}
              style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.35))', transformOrigin: 'bottom center' }}
            >
              <MapPin className="w-8 h-8 text-[#4f7a34]" fill="#fff" strokeWidth={2.25} />
            </motion.div>
          </AdvancedMarker>
        )}

      </Map>
      </div>

      {/* 마킹 위치 고르는 중 안내 */}
      {pickingMark && (
        <div className="absolute top-36 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 pl-4 pr-1.5 h-10 rounded-full shadow-lg whitespace-nowrap" style={{ background: '#1a2418', color: '#fff' }}>
          <MapPin className="w-4 h-4" />
          <span className="text-xs font-bold">{t('아래 목록에서 고르거나 지도를 눌러주세요', 'Pick from the list or tap the map')}</span>
          <button onClick={() => setPickingMark(false)} className="h-7 px-3 rounded-full text-xs font-bold" style={{ background: 'rgba(255,255,255,0.15)' }}>{t('취소', 'Cancel')}</button>
        </div>
      )}

      {/* 이 지역 카페 보기 — 누를 때만 조회 (지도 이동마다 자동 조회하지 않음) */}
      <div className={`absolute top-36 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 pointer-events-none${pickingMark ? ' hidden' : ''}`}>
        <button
          onClick={handleNearbyCafes}
          disabled={nearbyLoading}
          className="pointer-events-auto px-4 h-9 rounded-full text-xs font-bold text-zinc-700 shadow-lg flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-60 whitespace-nowrap"
          style={{ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.9)' }}
        >
          {nearbyLoading
            ? <div className="w-3.5 h-3.5 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin" />
            : <Coffee className="w-3.5 h-3.5" />} {t('이 지역 카페 보기', 'Show cafes in this area')}
        </button>
        {nearbyNote && (
          <p className="pointer-events-auto text-[11px] font-medium text-zinc-600 px-3 py-1 rounded-full shadow" style={{ background: 'rgba(255,255,255,0.92)' }}>{nearbyNote}</p>
        )}
      </div>

      {/* 검색 + 모임 필터 */}
      <div className="absolute top-20 left-4 right-4 z-40 flex flex-col items-end gap-2 pointer-events-none">
        {/* 카페 검색 + 오른쪽에 모임 필터·레이어 버튼 */}
        <CafeSearchBar
          onSelect={(placeId, location) => { handlePlaceSelect(placeId, location); setShowMeetupFilter(false); }}
          rightSlot={<>
          {/* Meetup filter button */}
          <button
            onClick={() => setShowMeetupFilter(o => !o)}
            className="h-11 px-3 rounded-full flex items-center gap-1 text-sm font-bold shadow-lg transition-all active:scale-95"
            style={{
              background: meetupFilterActive ? '#1a2418' : 'rgba(255,255,255,0.72)',
              color: meetupFilterActive ? '#fff' : '#3f3f46',
              backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.8)',
            }}
            title={t('모임 필터·레이어', 'Meetup filter and layers')}
            aria-label={t('모임 필터·레이어', 'Meetup filter and layers')}
          >
            <CalendarDays className="w-4 h-4" />{meetupCount}
          </button>
          </>}
        />

        {/* Meetup filter panel */}
        <AnimatePresence>
          {showMeetupFilter && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -8 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="pointer-events-auto w-64 rounded-3xl shadow-2xl border border-white/60 p-3.5 space-y-2.5 max-h-[calc(66vh-8.5rem)] overflow-y-auto"
              style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-zinc-800 flex items-center gap-1.5"><CalendarDays className="w-4 h-4 text-[#4f7a34]" />{t(`모임 ${meetupCount}개`, `${meetupCount} meetups`)}</span>
                <button onClick={() => setShowMeetupFilter(false)} className="text-zinc-400 hover:text-zinc-700 text-lg leading-none">×</button>
              </div>
              {([
                {
                  label: t('반경 (내 위치 기준)', 'Radius (from me)'),
                  options: [null, 1, 2, 5].map(km => ({ key: String(km), text: km === null ? t('전체', 'All') : `${km}km`, on: meetupFilter.radiusKm === km, set: () => setMeetupFilter(f => ({ ...f, radiusKm: km })) })),
                },
                {
                  label: t('기간', 'When'),
                  options: ([['today', t('오늘', 'Today')], ['week', t('이번 주', 'This week')], ['weekend', t('주말', 'Weekend')], ['all', t('전체', 'All')]] as [MeetupPeriod, string][])
                    .map(([period, text]) => ({ key: period, text, on: meetupFilter.period === period, set: () => setMeetupFilter(f => ({ ...f, period })) })),
                },
                {
                  label: t('관심사', 'Category'),
                  options: [
                    { key: 'all', text: t('전체', 'All'), on: meetupFilter.category === null, set: () => setMeetupFilter(f => ({ ...f, category: null })) },
                    ...MEETUP_CATEGORIES.map(c => ({ key: c.id, text: lang === 'ko' ? c.ko : c.en, on: meetupFilter.category === c.id, set: () => setMeetupFilter(f => ({ ...f, category: c.id })) })),
                  ],
                },
              ]).map(group => (
                <div key={group.label}>
                  <p className="text-[11px] font-bold text-zinc-400 mb-1.5">{group.label}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {group.options.map(o => (
                      <button
                        key={o.key}
                        onClick={o.set}
                        className="px-3 py-1.5 rounded-full text-xs font-bold border transition-all"
                        style={o.on
                          ? { background: '#1a2418', borderColor: 'transparent', color: 'white' }
                          : { background: 'rgba(255,255,255,0.7)', borderColor: 'rgba(0,0,0,0.08)', color: 'rgba(0,0,0,0.55)' }}
                      >
                        {o.text}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <div className="pt-2 space-y-2" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                <p className="text-[11px] font-bold text-zinc-400">{t('레이어', 'Layers')}</p>
                {([
                  { key: 'marks', label: t('마킹', 'Marks'), sub: t('내 마킹과 공유받은 마킹', 'Your marks and shared marks') },
                  { key: 'info', label: t('주변 정보', 'Nearby info'), sub: t('관광지·문화행사·화장실', 'Sights, cultural events, restrooms') },
                ] as const).map(l => (
                  <label key={l.key} className="flex items-center justify-between gap-3 cursor-pointer">
                    <span className="text-xs font-bold text-zinc-600">
                      {l.label}
                      <span className="block text-[11px] font-normal text-zinc-400">{l.sub}</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={layers[l.key]}
                      onChange={e => setLayers(v => ({ ...v, [l.key]: e.target.checked }))}
                      className="w-5 h-5 rounded accent-[#1a2418] cursor-pointer shrink-0"
                    />
                  </label>
                ))}
              </div>
              {myMeetups.length > 0 && (
                <div className="pt-2" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                  <p className="text-[11px] font-bold text-zinc-400 mb-1.5">{t(`내 모임 ${myMeetups.length}개`, `My meetups (${myMeetups.length})`)}</p>
                  <div className="space-y-1.5">
                    {myMeetups.map(m => (
                      <button
                        key={m.id}
                        onClick={() => { handlePlaceSelect(m.placeId, m.location); setOpenMeetup({ id: m.id }); setShowMeetupFilter(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-2xl text-left border border-white/60 active:scale-[0.98] transition-transform"
                        style={{ background: 'rgba(255,255,255,0.8)' }}
                      >
                        {(() => { const I = MEETUP_CATEGORIES.find(c => c.id === m.category)?.icon; return I ? <I className="w-4 h-4 shrink-0 text-[#4f7a34]" /> : null; })()}
                        <span className="flex-1 min-w-0">
                          <span className="block text-xs font-bold text-zinc-800 truncate">{m.title}</span>
                          <span className="block text-[11px] text-zinc-400 truncate">{formatMeetupTime(m.startAt, lang)} · {m.placeName}</span>
                        </span>
                        <span className="text-[10px] font-bold shrink-0" style={{ color: m.participantIds.indexOf(profile!.uid) < m.capacity ? '#2d5a1b' : '#a16207' }}>
                          {m.hostId === profile!.uid ? t('호스트', 'Host') : m.participantIds.indexOf(profile!.uid) < m.capacity ? t('확정', 'Confirmed') : t('대기', 'Waiting')}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {meetupFilter.radiusKm !== null && !userLocation && (
                <p className="text-[11px] text-amber-600">{t('위치 권한이 없어 반경 필터를 적용하지 못했어요.', 'Location is unavailable, so the radius filter is not applied.')}</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* 지도 아래 "지금 활발한 장소" 목록 — 카페 시트가 열리면 숨김 */}
      <AnimatePresence>
        {!selectedPlaceId && (
          <ActivePlacesSheet
            pins={activePinsInView}
            iconOf={placeIcon}
            onSelect={(p) => handlePlaceSelect(p.placeId, p.location)}
            pick={pickingMark ? { ...pickPlaces, onPick: (pl) => {
              setPickingMark(false);
              map?.panTo(pl.location);
              setMarkDrop({ location: pl.location, name: pl.name, memo: '', sharedWith: [] });
            } } : null}
            floating={<>
              {showMore && (
                <div role="menu" className="w-56 rounded-2xl shadow-2xl p-1.5" style={{ background: 'rgba(255,255,255,0.97)', border: '1px solid rgba(0,0,0,0.05)' }}>
                  {[
                    { icon: MapPin, label: t('현재 위치에 체크인', 'Check in where I am'), act: () => setCustomCheckinModal(true) },
                    { icon: Flame, label: t('주변 핫플', 'Nearby hotspots'), act: () => setShowHotpl(true) },
                    { icon: MapPinned, label: t('내 마킹 보기', 'My marks'), act: () => setShowMarksPanel(true) },
                    { icon: MapPin, label: t('지도에 마킹하기', 'Mark on the map'), act: () => setPickingMark(true) },
                  ].map(item => (
                    <button
                      key={item.label}
                      role="menuitem"
                      onClick={() => { setShowMore(false); item.act(); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold text-zinc-700 hover:bg-zinc-50 text-left"
                    >
                      <item.icon className="w-4 h-4 shrink-0 text-zinc-500" />{item.label}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (navigator.geolocation && map) {
                      navigator.geolocation.getCurrentPosition((pos) => {
                        map.panTo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                        map.setZoom(16);
                      });
                    }
                  }}
                  aria-label={t('내 위치로', 'Go to my location')}
                  className="w-11 h-11 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95"
                  style={{ background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(255,255,255,0.9)' }}
                >
                  <LocateFixed className="w-5 h-5 text-zinc-700" />
                </button>
                <button
                  onClick={() => setShowMore(v => !v)}
                  aria-expanded={showMore}
                  aria-label={t('더보기', 'More')}
                  className="w-11 h-11 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95"
                  style={showMore
                    ? { background: '#1a2418', color: '#fff' }
                    : { background: 'rgba(255,255,255,0.92)', color: '#3f3f46', border: '1px solid rgba(255,255,255,0.9)' }}
                >
                  <Ellipsis className="w-5 h-5" />
                </button>
              </div>
            </>}
          />
        )}
      </AnimatePresence>

      {/* Custom check-in modal */}
      <AnimatePresence>
        {customCheckinModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-end justify-center bg-black/15 backdrop-blur-[2px]"
            onClick={() => setCustomCheckinModal(false)}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="w-full sm:max-w-sm bg-white/60 backdrop-blur-2xl border border-white/50 rounded-t-[40px] p-6 space-y-5 font-sans"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1 bg-white/60 rounded-full mx-auto" />
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-zinc-900">{t('현재 위치에 체크인', 'Check in at current location')}</h3>
                <p className="text-sm text-zinc-500">{t('카페가 아닌 곳에서도 체크인할 수 있어요.', 'You can check in anywhere, not just cafes.')}</p>
              </div>
              <input
                type="text"
                value={customPlaceName}
                onChange={(e) => setCustomPlaceName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCustomCheckin()}
                placeholder={t('장소 이름 (예: 연남동 공유오피스)', 'Place name (e.g. a coworking space)')}
                className="w-full bg-white/50 backdrop-blur-sm border border-white/60 rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 ring-zinc-900/10 transition-all"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setCustomCheckinModal(false)}
                  className="flex-1 py-3.5 rounded-2xl bg-white/50 backdrop-blur-sm border border-white/60 text-zinc-600 font-bold hover:bg-white/70 transition-colors"
                >
                  {t('취소', 'Cancel')}
                </button>
                <button
                  onClick={handleCustomCheckin}
                  disabled={checkingIn}
                  className="flex-1 py-3.5 rounded-2xl bg-zinc-900 text-white font-bold hover:bg-zinc-950 transition-colors disabled:opacity-50 active:scale-95"
                >
                  {checkingIn
                    ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                    : t('체크인하기', 'Check in')
                  }
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Marks Panel */}
      <AnimatePresence>
        {showMarksPanel && profile && (
          <MarksPanel
            myMarks={myMarks}
            sharedMarks={sharedMarks}
            profile={profile}
            chatContacts={chatContacts}
            userLocation={userLocation}
            onSelectMark={(mark) => {
              setSelectedMark(mark);
              setLayers(v => ({ ...v, marks: true }));
              if (map) { map.panTo(mark.location); map.setZoom(16); }
            }}
            onCreated={() => setLayers(v => ({ ...v, marks: true }))}
            onClose={() => setShowMarksPanel(false)}
          />
        )}
      </AnimatePresence>

      {/* Mark detail bottom sheet */}
      <AnimatePresence>
        {selectedMark && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-end justify-center bg-black/15 backdrop-blur-[2px]"
            onClick={() => setSelectedMark(null)}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="w-full sm:max-w-sm rounded-t-[40px] border border-white/60 shadow-2xl p-6 space-y-4"
              style={{ background: 'rgba(255,255,255,0.62)', backdropFilter: 'blur(40px) saturate(1.6)', WebkitBackdropFilter: 'blur(40px) saturate(1.6)' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="w-10 h-1 rounded-full mx-auto -mt-2" style={{ background: 'rgba(0,0,0,0.12)' }} />
              <div className="flex items-center gap-3">
                <img
                  src={selectedMark.creatorPhoto}
                  className="w-12 h-12 rounded-full object-cover border-2 shadow"
                  style={{ borderColor: selectedMark.creatorId === profile?.uid ? '#8fb570' : '#c9b8e8' }}
                  referrerPolicy="no-referrer"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-zinc-900 text-sm">
                    {selectedMark.creatorId === profile?.uid ? t('내 마킹', 'My mark') : selectedMark.creatorName}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-zinc-400" />
                    <p className="text-xs text-zinc-500 truncate">{selectedMark.placeName}</p>
                  </div>
                </div>
                {selectedMark.creatorId === profile?.uid && (
                  <button
                    onClick={() => { deleteMark(selectedMark.id); setSelectedMark(null); }}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-red-400 transition-colors"
                    style={{ background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(0,0,0,0.08)' }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {selectedMark.memo && (
                <p className="text-sm text-zinc-700 bg-white/50 rounded-2xl px-4 py-3">{selectedMark.memo}</p>
              )}
              {selectedMark.scheduledAt && (
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{new Date(selectedMark.scheduledAt.toDate?.() ?? selectedMark.scheduledAt).toLocaleString(lang === 'ko' ? 'ko-KR' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                {selectedMark.visibility === 'private'
                  ? <><Lock className="w-3.5 h-3.5" /><span>{t('나만 보기', 'Only me')}</span></>
                  : <><Users className="w-3.5 h-3.5" /><span>{t(`${selectedMark.sharedWith.length}명과 공유 중`, `Shared with ${selectedMark.sharedWith.length} people`)}</span></>
                }
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      <AnimatePresence>
        {selectedPlaceId && (
          <CafeDetails
            placeId={selectedPlaceId}
            profile={profile}
            sentRequests={sentRequests}
            activeChats={activeChats}
            initialMeetup={openMeetup}
            onClose={() => setSelectedPlaceId(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedFestival && (
          <TourFestivalPanel
            festival={selectedFestival}
            onClose={() => setSelectedFestival(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedAttraction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-end justify-center bg-black/10 backdrop-blur-[1px]"
            onClick={() => setSelectedAttraction(null)}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="w-full sm:max-w-sm rounded-t-[40px] border border-white/60 shadow-2xl p-6 space-y-3"
              style={{ background: 'rgba(255,255,255,0.62)', backdropFilter: 'blur(40px) saturate(1.6)', WebkitBackdropFilter: 'blur(40px) saturate(1.6)' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="w-10 h-1 rounded-full mx-auto -mt-2" style={{ background: 'rgba(0,0,0,0.12)' }} />
              <div className="flex items-center gap-3">
                {(() => { const I = attractionIcon(selectedAttraction.tagType); return <I className="w-8 h-8 shrink-0 text-zinc-600" />; })()}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-zinc-900 text-lg leading-tight truncate">
                    {selectedAttraction.name ?? selectedAttraction.tagType}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                      style={{ background: selectedAttraction.category === 'historic' ? '#b47c3c' : '#6366f1' }}
                    >
                      {selectedAttraction.category === 'historic' ? t('역사', 'Historic') : t('관광', 'Sightseeing')}
                    </span>
                    <span className="text-[10px] text-zinc-400">{selectedAttraction.tagType}</span>
                  </div>
                </div>
              </div>
              {selectedAttraction.openingHours && (
                <div className="flex items-center gap-2 text-sm text-zinc-700 bg-white/50 rounded-2xl px-4 py-3">
                  <Clock className="w-4 h-4 shrink-0 text-zinc-400" /><span>{selectedAttraction.openingHours}</span>
                </div>
              )}
              {selectedAttraction.website && (
                <a
                  href={selectedAttraction.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm font-bold text-indigo-600 bg-white/50 rounded-2xl px-4 py-3"
                >
                  <Link className="w-4 h-4 shrink-0" /><span className="truncate">{selectedAttraction.website}</span>
                </a>
              )}
              {selectedAttraction.wikipedia && (
                <a
                  href={`https://ko.wikipedia.org/wiki/${encodeURIComponent(selectedAttraction.wikipedia.replace(/^ko:/, ''))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm font-bold text-zinc-600 bg-white/50 rounded-2xl px-4 py-3"
                >
                  <BookOpen className="w-4 h-4 shrink-0" /><span>{t('위키피디아', 'Wikipedia')}</span>
                </a>
              )}
              <p className="text-[11px] text-zinc-300 text-center pt-1">{t('OpenStreetMap 데이터', 'OpenStreetMap data')}</p>
              <div className="h-2" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedCultureEvent && (
          <CultureEventPanel
            event={selectedCultureEvent}
            onClose={() => setSelectedCultureEvent(null)}
          />
        )}
      </AnimatePresence>


      <AnimatePresence>
        {selectedRestroom && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-end justify-center bg-black/10 backdrop-blur-[1px]"
            onClick={() => setSelectedRestroom(null)}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="w-full sm:max-w-sm rounded-t-[40px] border border-white/60 shadow-2xl p-6 space-y-3"
              style={{ background: 'rgba(255,255,255,0.62)', backdropFilter: 'blur(40px) saturate(1.6)', WebkitBackdropFilter: 'blur(40px) saturate(1.6)' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="w-10 h-1 rounded-full mx-auto -mt-2" style={{ background: 'rgba(0,0,0,0.12)' }} />
              <div className="flex items-center gap-3">
                <Toilet className="w-8 h-8 shrink-0 text-blue-500" />
                <div>
                  <h3 className="font-bold text-zinc-900 text-lg leading-tight">
                    {selectedRestroom.name ?? t('공중화장실', 'Public restroom')}
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: '#3b82f6' }}>
                    OpenStreetMap
                  </span>
                </div>
              </div>
              {selectedRestroom.openingHours && (
                <div className="flex items-center gap-2 text-sm text-zinc-700 bg-white/50 rounded-2xl px-4 py-3">
                  <Clock className="w-4 h-4 shrink-0 text-zinc-400" />
                  <span>{selectedRestroom.openingHours}</span>
                </div>
              )}
              {selectedRestroom.fee && selectedRestroom.fee !== 'no' && (
                <div className="flex items-center gap-2 text-sm text-zinc-700 bg-white/50 rounded-2xl px-4 py-3">
                  <Wallet className="w-4 h-4 shrink-0 text-zinc-400" />
                  <span>{t(`유료 (${selectedRestroom.fee})`, `Paid (${selectedRestroom.fee})`)}</span>
                </div>
              )}
              {selectedRestroom.access && selectedRestroom.access !== 'yes' && (
                <div className="flex items-center gap-2 text-sm text-zinc-500 bg-white/50 rounded-2xl px-4 py-3">
                  <Info className="w-4 h-4 shrink-0 text-zinc-400" />
                  <span>{selectedRestroom.access === 'customers' ? t('이용객 전용', 'Customers only') : selectedRestroom.access}</span>
                </div>
              )}
              <div className="h-2" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 마킹 꽂기 폼 */}
      <AnimatePresence>
        {markDrop && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-end justify-center bg-black/15 backdrop-blur-[2px]"
            onClick={() => !savingMark && setMarkDrop(null)}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="w-full sm:max-w-sm rounded-t-[40px] border border-white/60 shadow-2xl p-6 space-y-4 font-sans"
              style={{ background: 'rgba(255,255,255,0.62)', backdropFilter: 'blur(40px) saturate(1.6)', WebkitBackdropFilter: 'blur(40px) saturate(1.6)' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="w-10 h-1 rounded-full mx-auto" style={{ background: 'rgba(0,0,0,0.12)' }} />
              <div className="flex items-center gap-3">
                <MapPin className="w-6 h-6 shrink-0 text-[#4f7a34]" />
                <input
                  value={markDrop.name}
                  onChange={e => setMarkDrop(d => d ? { ...d, name: e.target.value } : null)}
                  placeholder={t('장소 이름', 'Place name')}
                  className="flex-1 rounded-2xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 ring-zinc-900/10"
                  style={{ background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(0,0,0,0.08)' }}
                />
              </div>
              <textarea
                value={markDrop.memo}
                onChange={e => setMarkDrop(d => d ? { ...d, memo: e.target.value } : null)}
                placeholder={t('메모 (선택사항)', 'Memo (optional)')}
                rows={2}
                className="w-full rounded-2xl px-4 py-3 text-sm outline-none resize-none focus:ring-2 ring-zinc-900/10"
                style={{ background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(0,0,0,0.08)' }}
              />
              <div className="space-y-2">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wide">{t('공유', 'Share')}</p>
                <div className="flex flex-wrap gap-2">
                  {/* 나만 보기 버튼 */}
                  <button
                    onClick={() => setMarkDrop(d => d ? { ...d, sharedWith: [] } : null)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                    style={markDrop.sharedWith.length === 0
                      ? { background: '#1a2418', color: '#fff' }
                      : { background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(0,0,0,0.08)', color: '#71717a' }
                    }
                  >
                    <Lock className="w-3 h-3" />{t('나만', 'Only me')}
                  </button>
                  {chatContacts.map(c => {
                    const selected = markDrop.sharedWith.includes(c.uid);
                    return (
                      <button
                        key={c.uid}
                        onClick={() => setMarkDrop(d => d ? {
                          ...d,
                          sharedWith: selected
                            ? d.sharedWith.filter(id => id !== c.uid)
                            : [...d.sharedWith, c.uid],
                        } : null)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                        style={selected
                          ? { background: 'rgba(143,181,112,0.2)', border: '1.5px solid rgba(143,181,112,0.5)', color: '#2d5a1b' }
                          : { background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(0,0,0,0.08)', color: '#71717a' }
                        }
                      >
                        <img src={c.photo} className="w-4 h-4 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />
                        {c.name}
                        {selected && <Check className="w-3 h-3" />}
                      </button>
                    );
                  })}
                  {chatContacts.length === 0 && (
                    <p className="text-xs text-zinc-300 self-center">{t('채팅 상대가 생기면 공유할 수 있어요', "You'll be able to share once you have a chat contact")}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => !savingMark && setMarkDrop(null)}
                  className="flex-1 py-3.5 rounded-2xl text-sm font-bold text-zinc-600"
                  style={{ background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(0,0,0,0.08)' }}
                >
                  {t('취소', 'Cancel')}
                </button>
                <button
                  onClick={handleSaveMark}
                  disabled={savingMark}
                  className="flex-[2] py-3.5 rounded-2xl text-sm font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: '#1a2418', boxShadow: '0 8px 24px -8px rgba(0,0,0,0.3)' }}
                >
                  {savingMark
                    ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : t('꽂기', 'Drop pin')
                  }
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showHotpl && (
          <HotplPanel
            checkinsByPlace={checkinsByPlace}
            recentPlaceStats={recentPlaceStats}
            marks={[...myMarks, ...sharedMarks]}
            mapCenter={map ? (() => { const c = map.getCenter(); return c ? { lat: c.lat(), lng: c.lng() } : null; })() : null}
            onSelectPlace={(placeId, location) => {
              handlePlaceSelect(placeId, location);
              setShowHotpl(false);
            }}
            onSelectMark={(mark) => {
              map?.panTo(mark.location);
              setSelectedMark(mark);
              setShowHotpl(false);
            }}
            onClose={() => setShowHotpl(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

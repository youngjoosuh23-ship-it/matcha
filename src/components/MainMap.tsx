import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Map, useMap, useMapsLibrary, AdvancedMarker } from '@vis.gl/react-google-maps';
import { collection, onSnapshot, query, setDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db, subscribeToActiveEvents, subscribeToRecentPlaceStats, subscribeToMyMarks, subscribeToSharedMarks, deleteMark, createMark } from '../lib/firebase';
import { CheckIn, UserProfile, ChatRequest, Chat, Event, PlaceStat, Mark, TourPlace, TourFestival } from '../types';
import MarksPanel from './MarksPanel';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { Leaf, Search, Navigation, MapPin, X, Check } from 'lucide-react';
import CafeDetails from './CafeDetails';
import HotplPanel from './HotplPanel';
import EventPanel from './EventPanel';
import TourFestivalPanel from './TourFestivalPanel';
import CultureEventPanel from './CultureEventPanel';
import PublicFestivalPanel from './PublicFestivalPanel';
import { fetchNearbyTourPlaces, fetchNearbyFestivals } from '../lib/tourapi';
import { fetchCultureEvents } from '../lib/cultureapi';
import { fetchPublicFestivals, PublicFestival } from '../lib/festivalapi';
import { fetchNearbyRestrooms } from '../lib/restroomapi';
import { fetchNearbyAttractions, attractionEmoji } from '../lib/attractionsapi';
import { AttractionMarker, detectRegion } from '../lib/attractionMarker';
import { CultureEvent } from '../types';
import type { Restroom } from '../lib/restroomapi';
import type { Attraction } from '../lib/attractionsapi';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../lib/i18n';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<google.maps.places.Place[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [customCheckinModal, setCustomCheckinModal] = useState(false);
  const [customPlaceName, setCustomPlaceName] = useState('');
  const [checkingIn, setCheckingIn] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showHotpl, setShowHotpl] = useState(false);
  const [activeEvents, setActiveEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [pendingPlace, setPendingPlace] = useState<{ id: string; name: string; location: google.maps.LatLngLiteral } | null>(null);
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
  const [publicFestivals, setPublicFestivals] = useState<PublicFestival[]>([]);
  const [selectedPublicFestival, setSelectedPublicFestival] = useState<PublicFestival | null>(null);
  const [showFestivalPicker, setShowFestivalPicker] = useState(false);
  const [festivalFrom, setFestivalFrom] = useState('');
  const [festivalTo, setFestivalTo] = useState('');
  const [festivalDateActive, setFestivalDateActive] = useState(false);
  const [restrooms, setRestrooms] = useState<Restroom[]>([]);
  const [selectedRestroom, setSelectedRestroom] = useState<Restroom | null>(null);
  const [attractions, setAttractions] = useState<Attraction[]>([]);
  const [selectedAttraction, setSelectedAttraction] = useState<Attraction | null>(null);
  const [mapRegion, setMapRegion] = useState<import('../lib/attractionMarker').CountryRegion>('KR');
  const [pinDragging, setPinDragging] = useState(false);
  const [pinDragPos, setPinDragPos] = useState<{ x: number; y: number } | null>(null);
  const [markDrop, setMarkDrop] = useState<{
    location: { lat: number; lng: number };
    name: string; memo: string; sharedWith: string[];
  } | null>(null);
  const [savingMark, setSavingMark] = useState(false);
  const pinStartRef = useRef<{ x: number; y: number; id: number } | null>(null);
  const lastTourFetchRef = useRef<{ lat: number; lng: number; zoom: number } | null>(null);
  const festivalDateRef = useRef<{ active: boolean; from: string; to: string }>({ active: false, from: '', to: '' });

  const searchInputRef = useRef<HTMLInputElement>(null);

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
      const bounds = map.getBounds();
      if (!bounds) return;
      const last = lastTourFetchRef.current;
      if (last && Math.abs(lat - last.lat) < 0.005 && Math.abs(lng - last.lng) < 0.007 && zoom === last.zoom) return;
      lastTourFetchRef.current = { lat, lng, zoom };
      setMapRegion(detectRegion(lat, lng));
      const boundsParam = {
        swLat: bounds.getSouthWest().lat(),
        swLng: bounds.getSouthWest().lng(),
        neLat: bounds.getNorthEast().lat(),
        neLng: bounds.getNorthEast().lng(),
      };

      const culturePromise = fetchCultureEvents(boundsParam);
      const { active, from, to } = festivalDateRef.current;
      const publicFestivalPromise = fetchPublicFestivals(active ? from : undefined, active ? to : undefined);

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
        publicFestivalPromise,
      ]).then(([placesResult, festivalsResult, cultureResult, restroomsResult, attractionsResult, publicFestivalsResult]) => {
        if (placesResult.status === 'fulfilled') setTourPlaces(placesResult.value);
        if (festivalsResult.status === 'fulfilled') setTourFestivals(festivalsResult.value);
        if (cultureResult.status === 'fulfilled') setCultureEvents(cultureResult.value);
        if (restroomsResult.status === 'fulfilled') setRestrooms(restroomsResult.value);
        if (attractionsResult.status === 'fulfilled') setAttractions(attractionsResult.value);
        if (publicFestivalsResult.status === 'fulfilled') setPublicFestivals(publicFestivalsResult.value);
      });
    });
    return () => listener.remove();
  }, [map]);

  // Re-fetch festivals when date filter changes
  useEffect(() => {
    festivalDateRef.current = { active: festivalDateActive, from: festivalFrom, to: festivalTo };
    if (!map) return;
    fetchPublicFestivals(
      festivalDateActive ? festivalFrom : undefined,
      festivalDateActive ? festivalTo : undefined,
    ).then(setPublicFestivals).catch(() => {});
  }, [map, festivalDateActive, festivalFrom, festivalTo]);

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

  // 화면 좌표 → 지도 위경도 변환 (Mercator 근사)
  const getLatLngFromClient = useCallback((clientX: number, clientY: number) => {
    if (!map) return null;
    const bounds = map.getBounds();
    const div = map.getDiv();
    if (!bounds || !div) return null;
    const rect = div.getBoundingClientRect();
    const relX = clientX - rect.left;
    const relY = clientY - rect.top;
    if (relX < 0 || relY < 0 || relX > rect.width || relY > rect.height) return null;
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    return {
      lat: ne.lat() - (ne.lat() - sw.lat()) * (relY / rect.height),
      lng: sw.lng() + (ne.lng() - sw.lng()) * (relX / rect.width),
    };
  }, [map]);

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
        markDrop.name.trim() || t('📌 마킹', '📌 Mark'), markDrop.location,
        markDrop.memo, null, markDrop.sharedWith,
      );
      setMarkDrop(null);
    } finally {
      setSavingMark(false);
    }
  };

  const onPinPointerDown = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    pinStartRef.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
    setPinDragPos({ x: e.clientX, y: e.clientY });
  }, []);

  const onPinPointerMove = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (!pinStartRef.current) return;
    const dx = e.clientX - pinStartRef.current.x;
    const dy = e.clientY - pinStartRef.current.y;
    if (!pinDragging && Math.hypot(dx, dy) > 8) {
      e.currentTarget.setPointerCapture(pinStartRef.current.id);
      setPinDragging(true);
    }
    setPinDragPos({ x: e.clientX, y: e.clientY });
  }, [pinDragging]);

  const onPinPointerUp = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    const wasDragging = pinDragging;
    setPinDragging(false);
    setPinDragPos(null);
    pinStartRef.current = null;
    if (wasDragging) {
      const loc = getLatLngFromClient(e.clientX, e.clientY);
      if (loc) setMarkDrop({ location: loc, name: '', memo: '', sharedWith: [] });
    } else {
      setShowMarksPanel(true);
    }
  }, [pinDragging, getLatLngFromClient]);

  const handleSearch = useCallback(async () => {
    if (!placesLib || !searchQuery || !map) return;
    try {
      const { places } = await placesLib.Place.searchByText({
        textQuery: searchQuery,
        fields: ['id', 'displayName', 'location', 'formattedAddress', 'types'],
        locationBias: map.getCenter(),
      });
      setSearchResults(places || []);
    } catch (error) {
      console.error('Search failed', error);
    }
  }, [placesLib, searchQuery, map]);

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
    setPendingPlace(null);
    setSearchResults([]);
    setSearchQuery('');
    if (location && map) {
      map.panTo(location);
      map.setZoom(17);
    }
  };

  // Search result click: pan to location and show pending marker — do NOT open CafeDetails yet
  const handleSearchResultSelect = (place: google.maps.places.Place) => {
    const location = place.location?.toJSON();
    if (!location || !map) return;
    setPendingPlace({ id: place.id, name: place.displayName ?? '', location });
    setSearchResults([]);
    setSearchQuery('');
    setSearchOpen(false);
    map.panTo(location);
    map.setZoom(17);
  };

  // Subscribe to active events
  useEffect(() => {
    return subscribeToActiveEvents(setActiveEvents);
  }, []);

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

  // Group check-ins by placeId for markers
  const checkinsByPlace = useMemo(() => activeCheckins.reduce((acc, checkin) => {
    if (!acc[checkin.placeId]) acc[checkin.placeId] = [];
    acc[checkin.placeId].push(checkin);
    return acc;
  }, {} as Record<string, CheckIn[]>), [activeCheckins]);

  return (
    <div className="relative h-full w-full">
      <Map
        defaultCenter={{ lat: 37.5665, lng: 126.9780 }} // Seoul
        defaultZoom={13}
        mapId="COFFEE_CHAT_MAP"
        disableDefaultUI={true}
        internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
        className="w-full h-full"
        onClick={(e) => {
          const placeId = (e as any).detail?.placeId;
          if (placeId) {
            handlePlaceSelect(placeId);
            setSelectedEventId(null);
            (e as any).stop?.();
          } else {
            setSelectedPlaceId(null);
            setSelectedEventId(null);
            setPendingPlace(null);
            setSearchResults([]);
          }
        }}
      >
        {/* Active checkins markers */}
        {Object.entries(checkinsByPlace).map(([placeId, placeCheckins]) => {
          const first = placeCheckins[0];
          if (!first.location) return null;
          
          return (
            <AdvancedMarker
              key={placeId}
              position={first.location}
              onClick={() => handlePlaceSelect(placeId, first.location)}
            >
              <div className="relative group cursor-pointer">
                <div className="p-2 rounded-full shadow-xl transform group-hover:scale-110 transition-transform" style={{ background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '2px solid rgba(143,181,112,0.7)' }}>
                  <Leaf className="w-5 h-5" style={{ color: '#1a2418' }} />
                </div>
                {placeCheckins.length > 0 && (
                  <div className="absolute -top-2 -right-2 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center" style={{ background: '#8fb570', border: '2px solid rgba(255,255,255,0.8)' }}>
                    {placeCheckins.length}
                  </div>
                )}
                <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  <div className="px-2 py-1 rounded-lg shadow-md text-[10px] font-bold text-zinc-700" style={{ background: 'rgba(255,255,255,0.90)', backdropFilter: 'blur(8px)', border: '1px solid rgba(0,0,0,0.06)' }}>
                    {first.placeName}
                  </div>
                </div>
              </div>
            </AdvancedMarker>
          );
        })}

        {/* Event markers — yellow maple leaf */}
        {activeEvents.map((event) => (
          <AdvancedMarker
            key={event.id}
            position={event.location}
            onClick={() => {
              if (event.placeId) {
                setSelectedPlaceId(event.placeId);
                setSelectedEventId(null);
              } else {
                setSelectedEventId(event.id);
                setSelectedPlaceId(null);
              }
            }}
          >
            <div className="relative group cursor-pointer">
              <div className="w-10 h-10 rounded-full shadow-xl flex items-center justify-center transform group-hover:scale-110 transition-transform text-lg" style={{ background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '2px solid rgba(244,196,176,0.7)' }}>
                🍁
              </div>
              {event.attendees.length > 0 && (
                <div className="absolute -top-1.5 -right-1.5 text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center" style={{ background: '#f4c4b0', color: '#1a2418', border: '1.5px solid rgba(255,255,255,0.8)' }}>
                  {event.attendees.length}
                </div>
              )}
              <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                <div className="px-2 py-1 rounded-lg shadow-md text-[10px] font-bold text-zinc-700" style={{ background: 'rgba(255,255,255,0.90)', backdropFilter: 'blur(8px)', border: '1px solid rgba(0,0,0,0.06)' }}>
                  {event.title}
                </div>
              </div>
            </div>
          </AdvancedMarker>
        ))}

        {/* My mark markers */}
        {myMarks.map(mark => (
          <AdvancedMarker
            key={`mark-my-${mark.id}`}
            position={mark.location}
            onClick={() => setSelectedMark(mark)}
          >
            <div className="relative group cursor-pointer">
              <div className="relative">
                <img
                  src={mark.creatorPhoto}
                  className="w-10 h-10 rounded-full object-cover shadow-lg border-2 transition-transform group-hover:scale-110"
                  style={{ borderColor: '#8fb570' }}
                  referrerPolicy="no-referrer"
                />
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[8px]" style={{ background: '#8fb570', border: '1.5px solid #fff' }}>
                  📌
                </div>
              </div>
              <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                <div className="px-2 py-1 rounded-lg shadow-md text-[10px] font-bold text-zinc-700" style={{ background: 'rgba(255,255,255,0.90)', backdropFilter: 'blur(8px)', border: '1px solid rgba(0,0,0,0.06)' }}>
                  {mark.placeName}{mark.memo ? ` · ${mark.memo.slice(0, 12)}` : ''}
                </div>
              </div>
            </div>
          </AdvancedMarker>
        ))}

        {/* Shared-with-me mark markers */}
        {sharedMarks.map(mark => (
          <AdvancedMarker
            key={`mark-shared-${mark.id}`}
            position={mark.location}
            onClick={() => setSelectedMark(mark)}
          >
            <div className="relative group cursor-pointer">
              <div className="relative">
                <img
                  src={mark.creatorPhoto}
                  className="w-10 h-10 rounded-full object-cover shadow-lg border-2 transition-transform group-hover:scale-110"
                  style={{ borderColor: '#c9b8e8' }}
                  referrerPolicy="no-referrer"
                />
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[8px]" style={{ background: '#c9b8e8', border: '1.5px solid #fff' }}>
                  📌
                </div>
              </div>
              <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                <div className="px-2 py-1 rounded-lg shadow-md text-[10px] font-bold text-zinc-700" style={{ background: 'rgba(255,255,255,0.90)', backdropFilter: 'blur(8px)', border: '1px solid rgba(0,0,0,0.06)' }}>
                  {mark.creatorName} · {mark.placeName}
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

        {/* Search Results Markers (Only if no checkins at that place yet to avoid overlapping) */}
        {searchResults.filter(p => !checkinsByPlace[p.id]).map((place) => (
          <AdvancedMarker
            key={place.id}
            position={place.location}
            onClick={() => handleSearchResultSelect(place)}
          >
            <div className="p-1.5 rounded-full shadow-lg transform hover:scale-110 transition-transform cursor-pointer" style={{ background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: '1.5px solid rgba(0,0,0,0.08)' }}>
              <Leaf className="w-4 h-4 text-zinc-500" />
            </div>
          </AdvancedMarker>
        ))}

        {/* TourAPI 관광지/음식점 마커 — 주황 핀 */}
        {!festivalDateActive && tourPlaces
          .filter(p => !checkinsByPlace[`tour_${p.contentId}`])
          .map((place) => (
            <AdvancedMarker
              key={`tour-place-${place.contentId}`}
              position={place.location}
              onClick={() => {
                setSelectedPlaceId(`tour_${place.contentId}`);
                setSelectedEventId(null);
                setSelectedFestival(null);
                if (map) { map.panTo(place.location); map.setZoom(17); }
              }}
            >
              <div className="relative group cursor-pointer">
                <div
                  className="w-9 h-9 rounded-full shadow-lg flex items-center justify-center text-base transform group-hover:scale-110 transition-transform"
                  style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '2px solid rgba(249,115,22,0.6)' }}
                >
                  🏛️
                </div>
                <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  <div className="px-2 py-1 rounded-lg shadow-md text-[10px] font-bold text-zinc-700" style={{ background: 'rgba(255,255,255,0.90)', backdropFilter: 'blur(8px)', border: '1px solid rgba(0,0,0,0.06)' }}>
                    {place.title}
                  </div>
                </div>
              </div>
            </AdvancedMarker>
          ))}

        {/* TourAPI 축제/행사 마커 — 별 아이콘 */}
        {!festivalDateActive && tourFestivals.map((festival) => (
          <AdvancedMarker
            key={`tour-festival-${festival.contentId}`}
            position={festival.location}
            onClick={() => {
              setSelectedFestival(festival);
              setSelectedPlaceId(null);
              setSelectedEventId(null);
              if (map) { map.panTo(festival.location); map.setZoom(15); }
            }}
          >
            <div className="relative group cursor-pointer">
              <div
                className="w-10 h-10 rounded-full shadow-xl flex items-center justify-center text-lg transform group-hover:scale-110 transition-transform"
                style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '2px solid rgba(234,179,8,0.7)' }}
              >
                🎪
              </div>
              <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                <div className="px-2 py-1 rounded-lg shadow-md text-[10px] font-bold text-zinc-700" style={{ background: 'rgba(255,255,255,0.90)', backdropFilter: 'blur(8px)', border: '1px solid rgba(0,0,0,0.06)' }}>
                  {festival.title}
                </div>
              </div>
            </div>
          </AdvancedMarker>
        ))}

        {/* OSM 관광지/역사 마커 — 줌 12+ */}
        {!festivalDateActive && attractions.map((att) => (
          <AdvancedMarker
            key={`attraction-${att.id}`}
            position={att.location}
            onClick={() => {
              setSelectedAttraction(att);
              setSelectedFestival(null);
              setSelectedCultureEvent(null);
              setSelectedPlaceId(null);
              setSelectedEventId(null);
              if (map) map.panTo(att.location);
            }}
          >
            <div className="relative group cursor-pointer">
              <div
                className="w-9 h-9 rounded-full shadow-md flex items-center justify-center text-base transform group-hover:scale-110 transition-transform"
                style={{
                  background: 'rgba(255,255,255,0.88)',
                  backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                  border: `1.5px solid ${att.category === 'historic' ? 'rgba(180,120,60,0.6)' : 'rgba(99,102,241,0.55)'}`,
                }}
              >
                {attractionEmoji(att.tagType)}
              </div>
              {att.name && (
                <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  <div className="px-2 py-1 rounded-lg shadow-md text-[10px] font-bold text-zinc-700" style={{ background: 'rgba(255,255,255,0.90)', backdropFilter: 'blur(8px)', border: '1px solid rgba(0,0,0,0.06)' }}>
                    {att.name}
                  </div>
                </div>
              )}
            </div>
          </AdvancedMarker>
        ))}

        {/* 공중화장실 마커 — 줌 15+ 에서만 표시 */}
        {!festivalDateActive && restrooms.map((room) => (
          <AdvancedMarker
            key={`restroom-${room.id}`}
            position={room.location}
            onClick={() => setSelectedRestroom(room)}
          >
            <div className="relative group cursor-pointer">
              <div
                className="w-8 h-8 rounded-full shadow-md flex items-center justify-center text-sm transform group-hover:scale-110 transition-transform"
                style={{ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: '1.5px solid rgba(59,130,246,0.55)' }}
              >
                🚻
              </div>
              {room.name && (
                <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  <div className="px-2 py-1 rounded-lg shadow-md text-[10px] font-bold text-zinc-700" style={{ background: 'rgba(255,255,255,0.90)', backdropFilter: 'blur(8px)', border: '1px solid rgba(0,0,0,0.06)' }}>
                    {room.name}
                  </div>
                </div>
              )}
            </div>
          </AdvancedMarker>
        ))}

        {/* 한국문화정보원 문화행사 마커 — 보라 테두리 */}
        {!festivalDateActive && cultureEvents.map((evt) => (
          <AdvancedMarker
            key={`culture-${evt.seq}`}
            position={evt.location}
            onClick={() => {
              setSelectedCultureEvent(evt);
              setSelectedFestival(null);
              setSelectedPlaceId(null);
              setSelectedEventId(null);
              if (map) { map.panTo(evt.location); map.setZoom(15); }
            }}
          >
            <div className="relative group cursor-pointer">
              <div
                className="w-10 h-10 rounded-full shadow-xl flex items-center justify-center text-lg transform group-hover:scale-110 transition-transform"
                style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '2px solid rgba(124,58,237,0.65)' }}
              >
                🎭
              </div>
              <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                <div className="px-2 py-1 rounded-lg shadow-md text-[10px] font-bold text-zinc-700" style={{ background: 'rgba(255,255,255,0.90)', backdropFilter: 'blur(8px)', border: '1px solid rgba(0,0,0,0.06)' }}>
                  {evt.title}
                </div>
              </div>
            </div>
          </AdvancedMarker>
        ))}

        {/* 공공데이터 문화축제 마커 — 로즈 테두리 */}
        {publicFestivals.map((f) => (
          <AdvancedMarker
            key={`public-festival-${f.id}`}
            position={f.location}
            onClick={() => {
              setSelectedPublicFestival(f);
              setSelectedFestival(null);
              setSelectedCultureEvent(null);
              setSelectedPlaceId(null);
              setSelectedEventId(null);
              if (map) { map.panTo(f.location); map.setZoom(15); }
            }}
          >
            <div className="relative group cursor-pointer">
              <div
                className="w-10 h-10 rounded-full shadow-xl flex items-center justify-center text-lg transform group-hover:scale-110 transition-transform"
                style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '2px solid rgba(225,29,72,0.65)' }}
              >
                🎊
              </div>
              <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                <div className="px-2 py-1 rounded-lg shadow-md text-[10px] font-bold text-zinc-700" style={{ background: 'rgba(255,255,255,0.90)', backdropFilter: 'blur(8px)', border: '1px solid rgba(0,0,0,0.06)' }}>
                  {f.name}
                </div>
              </div>
            </div>
          </AdvancedMarker>
        ))}

        {/* 드롭된 마킹 위치 프리뷰 핀 */}
        {markDrop && (
          <AdvancedMarker position={markDrop.location}>
            <motion.div
              initial={{ scale: 0, y: -10 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', damping: 12, stiffness: 400 }}
              className="text-4xl"
              style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.35))', transformOrigin: 'bottom center' }}
            >
              📌
            </motion.div>
          </AdvancedMarker>
        )}

        {/* Pending place marker — pulsing pin, click to open CafeDetails */}
        {pendingPlace && (
          <AdvancedMarker
            key={`pending-${pendingPlace.id}`}
            position={pendingPlace.location}
            onClick={() => handlePlaceSelect(pendingPlace.id, pendingPlace.location)}
          >
            <div className="flex flex-col items-center cursor-pointer group">
              <div className="relative">
                <div className="absolute inset-0 rounded-full animate-ping opacity-40" style={{ background: '#8fb570' }} />
                <div className="relative px-3 py-2 rounded-2xl shadow-xl flex items-center gap-1.5 transition-transform group-hover:scale-105" style={{ background: '#1a2418', border: '2px solid rgba(143,181,112,0.6)' }}>
                  <MapPin className="w-3.5 h-3.5 text-white shrink-0" />
                  <span className="text-xs font-bold text-white whitespace-nowrap max-w-[120px] truncate">{pendingPlace.name}</span>
                </div>
              </div>
              <div className="w-0.5 h-2 bg-zinc-700" />
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
            </div>
          </AdvancedMarker>
        )}
      </Map>

      {/* Search + Festival UI */}
      <div className="absolute top-20 right-4 flex flex-col items-end gap-2 pointer-events-none">
        {/* Button row */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Festival date filter button */}
          <button
            onClick={() => { setShowFestivalPicker(o => !o); setSearchOpen(false); }}
            className="w-11 h-11 rounded-full flex items-center justify-center text-xl shadow-lg transition-all active:scale-95"
            style={{
              background: festivalDateActive ? 'rgba(225,29,72,0.88)' : 'rgba(255,255,255,0.72)',
              backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
              border: festivalDateActive ? '1px solid rgba(225,29,72,0.5)' : '1px solid rgba(255,255,255,0.8)',
            }}
            title={t('축제 날짜 검색', 'Search festivals by date')}
          >
            🎊
          </button>
          {/* Search toggle button */}
          <button
            onClick={() => {
              setSearchOpen(o => !o);
              setShowFestivalPicker(false);
              setSearchResults([]);
              setSearchQuery('');
              if (!searchOpen) setTimeout(() => searchInputRef.current?.focus(), 100);
            }}
            className="w-11 h-11 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95"
            style={{ background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.8)' }}
          >
            <Search className="w-5 h-5 text-zinc-700" />
          </button>
        </div>

        {/* Festival date picker panel */}
        <AnimatePresence>
          {showFestivalPicker && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -8 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="pointer-events-auto w-64 rounded-3xl shadow-2xl border border-white/60 p-4 space-y-3"
              style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-zinc-800">🎊 {t('축제 날짜 검색', 'Search festivals by date')}</span>
                <button onClick={() => setShowFestivalPicker(false)} className="text-zinc-400 hover:text-zinc-700 text-lg leading-none">×</button>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-[11px] font-bold text-zinc-400 mb-1">{t('시작일', 'Start date')}</p>
                  <input
                    type="date"
                    value={festivalFrom}
                    onChange={e => setFestivalFrom(e.target.value)}
                    className="w-full text-sm font-medium text-zinc-800 rounded-xl border border-zinc-200 px-3 py-2 outline-none focus:border-rose-400 bg-white"
                  />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-zinc-400 mb-1">{t('종료일', 'End date')}</p>
                  <input
                    type="date"
                    value={festivalTo}
                    onChange={e => setFestivalTo(e.target.value)}
                    className="w-full text-sm font-medium text-zinc-800 rounded-xl border border-zinc-200 px-3 py-2 outline-none focus:border-rose-400 bg-white"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (!festivalFrom) return;
                    setFestivalDateActive(true);
                    festivalDateRef.current = { active: true, from: festivalFrom, to: festivalTo };
                    fetchPublicFestivals(festivalFrom, festivalTo || undefined).then(setPublicFestivals).catch(() => {});
                    setShowFestivalPicker(false);
                  }}
                  className="flex-1 py-2 rounded-xl text-sm font-bold text-white transition-opacity active:opacity-70"
                  style={{ background: '#e11d48' }}
                >
                  {t('검색', 'Search')}
                </button>
                {festivalDateActive && (
                  <button
                    onClick={() => {
                      setFestivalFrom('');
                      setFestivalTo('');
                      setFestivalDateActive(false);
                    }}
                    className="px-3 py-2 rounded-xl text-sm font-bold text-zinc-500 border border-zinc-200 transition-colors hover:bg-zinc-50"
                  >
                    {t('초기화', 'Reset')}
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Expandable search panel */}
        <AnimatePresence>
          {searchOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -8 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="pointer-events-auto w-72 sm:w-80 bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-zinc-100 overflow-hidden"
            >
              <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-50">
                <Search className="w-4 h-4 text-zinc-400 shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder={t('장소 검색...', 'Search places...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="flex-1 bg-transparent text-sm outline-none font-medium placeholder:text-zinc-300"
                />
                {searchQuery && (
                  <button onClick={() => { setSearchQuery(''); setSearchResults([]); }} className="text-zinc-300 hover:text-zinc-500">
                    ×
                  </button>
                )}
              </div>

              {searchResults.length > 0 && (
                <div className="max-h-[50vh] overflow-y-auto">
                  {searchResults.map((place) => {
                    const placeCheckins = checkinsByPlace[place.id] || [];
                    return (
                      <button
                        key={place.id}
                        onClick={() => handleSearchResultSelect(place)}
                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-50 transition-colors text-left border-b border-zinc-50 last:border-0"
                      >
                        <div className="flex flex-col gap-0.5 min-w-0 flex-1 mr-2">
                          <span className="font-bold text-zinc-900 text-sm truncate">{place.displayName}</span>
                          <span className="text-xs text-zinc-400 truncate">{place.formattedAddress}</span>
                        </div>
                        {placeCheckins.length > 0 && (
                          <div className="flex -space-x-1.5 shrink-0">
                            {placeCheckins.slice(0, 3).map((c, i) => (
                              <img key={i} src={c.userPhoto} className="w-7 h-7 rounded-full border-2 border-white object-cover" referrerPolicy="no-referrer" />
                            ))}
                            {placeCheckins.length > 3 && (
                              <div className="w-7 h-7 rounded-full bg-zinc-100 border-2 border-white flex items-center justify-center text-[9px] font-bold text-zinc-500">
                                +{placeCheckins.length - 3}
                              </div>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {searchQuery && searchResults.length === 0 && (
                <div className="px-4 py-6 text-center">
                  <button
                    onClick={handleSearch}
                    className="text-sm font-bold text-zinc-900 bg-zinc-100 px-4 py-2 rounded-2xl hover:bg-zinc-200 transition-colors"
                  >
                    {t(`"${searchQuery}" 검색하기`, `Search "${searchQuery}"`)}
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="absolute bottom-24 right-4 flex flex-col gap-2 z-10">
        {/* Hotspot button */}
        <button
          onClick={() => setShowHotpl(true)}
          className="w-12 h-12 rounded-full flex items-center justify-center text-xl shadow-lg transition-all active:scale-95"
          style={{ background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.8)' }}
          title={t('주변 핫플', 'Nearby hotspots')}
        >
          🔥
        </button>
        {/* Marks panel button — 탭: 목록, 드래그: 핀 꽂기 */}
        <button
          onPointerDown={onPinPointerDown}
          onPointerMove={onPinPointerMove}
          onPointerUp={onPinPointerUp}
          className="w-12 h-12 rounded-full flex items-center justify-center text-xl shadow-lg select-none"
          style={{
            background: pinDragging ? 'rgba(143,181,112,0.90)' : 'rgba(255,255,255,0.72)',
            backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.8)',
            touchAction: 'none',
            transition: 'background 0.15s',
          }}
          title={t('마킹 (드래그해서 꽂기)', 'Marks (drag to drop a pin)')}
        >
          📌
        </button>
        {/* Custom check-in button */}
        <button
          onClick={() => setCustomCheckinModal(true)}
          className="w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg transition-all active:scale-95"
          style={{ background: 'rgba(143,181,112,0.90)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.5)' }}
          title={t('현재 위치에 체크인', 'Check in at current location')}
        >
          <MapPin className="w-5 h-5 text-white" />
        </button>
        {/* GPS pan button */}
        <button
          onClick={() => {
            if (navigator.geolocation && map) {
              navigator.geolocation.getCurrentPosition((pos) => {
                map.panTo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                map.setZoom(16);
              });
            }
          }}
          className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95"
          style={{ background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.8)' }}
        >
          <Navigation className="w-5 h-5 text-zinc-700" />
        </button>

        {/* 줌 버튼 */}
        <div className="flex flex-col rounded-2xl overflow-hidden shadow-lg" style={{ border: '1px solid rgba(255,255,255,0.8)' }}>
          <button
            onClick={() => map && map.setZoom((map.getZoom() ?? 13) + 1)}
            className="w-12 h-11 flex items-center justify-center text-xl font-light text-zinc-700 transition-all active:scale-95"
            style={{ background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}
          >
            +
          </button>
          <button
            onClick={() => map && map.setZoom((map.getZoom() ?? 13) - 1)}
            className="w-12 h-11 flex items-center justify-center text-xl font-light text-zinc-700 transition-all active:scale-95"
            style={{ background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
          >
            −
          </button>
        </div>
      </div>

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
                autoFocus
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
            activeChats={activeChats}
            userLocation={userLocation}
            onSelectMark={(mark) => {
              setSelectedMark(mark);
              if (map) { map.panTo(mark.location); map.setZoom(16); }
            }}
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
                  <span>🕐</span>
                  <span>{new Date(selectedMark.scheduledAt.toDate?.() ?? selectedMark.scheduledAt).toLocaleString(lang === 'ko' ? 'ko-KR' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                {selectedMark.visibility === 'private'
                  ? <><span>🔒</span><span>{t('나만 보기', 'Only me')}</span></>
                  : <><span>👥</span><span>{t(`${selectedMark.sharedWith.length}명과 공유 중`, `Shared with ${selectedMark.sharedWith.length} people`)}</span></>
                }
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedEventId && (() => {
          const event = activeEvents.find(e => e.id === selectedEventId);
          return event ? (
            <EventPanel
              event={event}
              myProfile={profile}
              userLocation={userLocation}
              onClose={() => setSelectedEventId(null)}
            />
          ) : null;
        })()}
      </AnimatePresence>

      <AnimatePresence>
        {selectedPlaceId && (
          <CafeDetails
            placeId={selectedPlaceId}
            profile={profile}
            sentRequests={sentRequests}
            activeChats={activeChats}
            activeEvents={activeEvents}
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
                <span className="text-3xl">{attractionEmoji(selectedAttraction.tagType)}</span>
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
                  <span>🕐</span><span>{selectedAttraction.openingHours}</span>
                </div>
              )}
              {selectedAttraction.website && (
                <a
                  href={selectedAttraction.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm font-bold text-indigo-600 bg-white/50 rounded-2xl px-4 py-3"
                >
                  <span>🔗</span><span className="truncate">{selectedAttraction.website}</span>
                </a>
              )}
              {selectedAttraction.wikipedia && (
                <a
                  href={`https://ko.wikipedia.org/wiki/${encodeURIComponent(selectedAttraction.wikipedia.replace(/^ko:/, ''))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm font-bold text-zinc-600 bg-white/50 rounded-2xl px-4 py-3"
                >
                  <span>📖</span><span>{t('위키피디아', 'Wikipedia')}</span>
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
        {selectedPublicFestival && (
          <PublicFestivalPanel
            festival={selectedPublicFestival}
            onClose={() => setSelectedPublicFestival(null)}
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
                <span className="text-3xl">🚻</span>
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
                  <span className="text-base">🕐</span>
                  <span>{selectedRestroom.openingHours}</span>
                </div>
              )}
              {selectedRestroom.fee && selectedRestroom.fee !== 'no' && (
                <div className="flex items-center gap-2 text-sm text-zinc-700 bg-white/50 rounded-2xl px-4 py-3">
                  <span className="text-base">💰</span>
                  <span>{t(`유료 (${selectedRestroom.fee})`, `Paid (${selectedRestroom.fee})`)}</span>
                </div>
              )}
              {selectedRestroom.access && selectedRestroom.access !== 'yes' && (
                <div className="flex items-center gap-2 text-sm text-zinc-500 bg-white/50 rounded-2xl px-4 py-3">
                  <span className="text-base">ℹ️</span>
                  <span>{selectedRestroom.access === 'customers' ? t('이용객 전용', 'Customers only') : selectedRestroom.access}</span>
                </div>
              )}
              <div className="h-2" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 드래그 중 손가락 따라다니는 플로팅 핀 */}
      {pinDragging && pinDragPos && (
        <div
          className="fixed pointer-events-none select-none"
          style={{
            left: pinDragPos.x - 18,
            top: pinDragPos.y - 46,
            zIndex: 9999,
            fontSize: '2.4rem',
            filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.4))',
            transform: 'scale(1.25)',
          }}
        >
          📌
        </div>
      )}

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
                <span className="text-2xl shrink-0">📌</span>
                <input
                  autoFocus
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
                    🔒 {t('나만', 'Only me')}
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
                    : `📌 ${t('꽂기', 'Drop pin')}`
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

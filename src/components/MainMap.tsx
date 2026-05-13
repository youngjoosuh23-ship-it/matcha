import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Map, useMap, useMapsLibrary, AdvancedMarker } from '@vis.gl/react-google-maps';
import { collection, onSnapshot, query, setDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db, subscribeToActiveEvents } from '../lib/firebase';
import { CheckIn, UserProfile, ChatRequest, Chat, Event } from '../types';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { Leaf, Search, Navigation, MapPin, X } from 'lucide-react';
import CafeDetails from './CafeDetails';
import HotplPanel from './HotplPanel';
import EventPanel from './EventPanel';
import { motion, AnimatePresence } from 'motion/react';

interface MainMapProps {
  profile: UserProfile | null;
  sentRequests: ChatRequest[];
  activeChats: Chat[];
}

export default function MainMap({ profile, sentRequests, activeChats }: MainMapProps) {
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
        const placeName = customPlaceName.trim() || '내 현재 위치';
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

      {/* Search UI */}
      <div className="absolute top-20 right-4 flex flex-col items-end gap-2 pointer-events-none">
        {/* Search toggle button */}
        <button
          onClick={() => {
            setSearchOpen(o => !o);
            setSearchResults([]);
            setSearchQuery('');
            if (!searchOpen) setTimeout(() => searchInputRef.current?.focus(), 100);
          }}
          className="pointer-events-auto w-11 h-11 rounded-full flex items-center justify-center text-white shadow-lg transition-all active:scale-95"
          style={{ background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.8)' }}
        >
          <Search className="w-5 h-5 text-zinc-700" />
        </button>

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
                  placeholder="장소 검색..."
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
                    "{searchQuery}" 검색하기
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
          title="주변 핫플"
        >
          🔥
        </button>
        {/* Custom check-in button */}
        <button
          onClick={() => setCustomCheckinModal(true)}
          className="w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg transition-all active:scale-95"
          style={{ background: 'rgba(143,181,112,0.90)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.5)' }}
          title="현재 위치에 체크인"
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
                <h3 className="text-xl font-bold text-zinc-900">현재 위치에 체크인</h3>
                <p className="text-sm text-zinc-500">카페가 아닌 곳에서도 체크인할 수 있어요.</p>
              </div>
              <input
                type="text"
                value={customPlaceName}
                onChange={(e) => setCustomPlaceName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCustomCheckin()}
                placeholder="장소 이름 (예: 연남동 공유오피스)"
                className="w-full bg-white/50 backdrop-blur-sm border border-white/60 rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 ring-zinc-900/10 transition-all"
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setCustomCheckinModal(false)}
                  className="flex-1 py-3.5 rounded-2xl bg-white/50 backdrop-blur-sm border border-white/60 text-zinc-600 font-bold hover:bg-white/70 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleCustomCheckin}
                  disabled={checkingIn}
                  className="flex-1 py-3.5 rounded-2xl bg-zinc-900 text-white font-bold hover:bg-zinc-950 transition-colors disabled:opacity-50 active:scale-95"
                >
                  {checkingIn
                    ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                    : '체크인하기'
                  }
                </button>
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
            onClose={() => setSelectedPlaceId(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showHotpl && (
          <HotplPanel
            checkinsByPlace={checkinsByPlace}
            onSelectPlace={(placeId, location) => {
              handlePlaceSelect(placeId, location);
              setShowHotpl(false);
            }}
            onClose={() => setShowHotpl(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

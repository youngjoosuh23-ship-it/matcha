import { useEffect, useState, useCallback, useRef } from 'react';
import { Map, useMap, useMapsLibrary, AdvancedMarker } from '@vis.gl/react-google-maps';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CheckIn, UserProfile } from '../types';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { Leaf, Search, Navigation } from 'lucide-react';
import CafeDetails from './CafeDetails';
import { motion, AnimatePresence } from 'motion/react';

interface MainMapProps {
  profile: UserProfile | null;
}

export default function MainMap({ profile }: MainMapProps) {
  const map = useMap();
  const placesLib = useMapsLibrary('places');
  const [activeCheckins, setActiveCheckins] = useState<CheckIn[]>([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<google.maps.places.Place[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sync active check-ins from Firebase
  useEffect(() => {
    const checkinsPath = 'checkins';
    const q = query(collection(db, checkinsPath));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const checkins = snapshot.docs.map(doc => doc.data() as CheckIn);
      setActiveCheckins(checkins);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, checkinsPath);
    });
    return () => unsubscribe();
  }, []);

  const handleSearch = useCallback(async () => {
    if (!placesLib || !searchQuery || !map) return;
    try {
      const { places } = await placesLib.Place.searchByText({
        textQuery: `${searchQuery} cafe`,
        fields: ['id', 'displayName', 'location', 'formattedAddress', 'types'],
        locationBias: map.getCenter(),
      });
      setSearchResults(places || []);
    } catch (error) {
      console.error('Search failed', error);
    }
  }, [placesLib, searchQuery, map]);

  const handlePlaceSelect = (placeId: string, location?: google.maps.LatLngLiteral) => {
    setSelectedPlaceId(placeId);
    setSearchResults([]);
    setSearchQuery('');
    if (location && map) {
      map.panTo(location);
      map.setZoom(17);
    }
  };

  // Group check-ins by placeId for markers
  const checkinsByPlace = activeCheckins.reduce((acc, checkin) => {
    if (!acc[checkin.placeId]) acc[checkin.placeId] = [];
    acc[checkin.placeId].push(checkin);
    return acc;
  }, {} as Record<string, CheckIn[]>);

  return (
    <div className="relative h-full w-full">
      <Map
        defaultCenter={{ lat: 37.5665, lng: 126.9780 }} // Seoul
        defaultZoom={13}
        mapId="COFFEE_CHAT_MAP"
        disableDefaultUI={true}
        internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
        className="w-full h-full"
        onClick={() => {
          setSelectedPlaceId(null);
          setSearchResults([]);
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
                <div className="p-2 bg-zinc-900 rounded-full shadow-xl border-2 border-emerald-400 transform group-hover:scale-110 transition-transform">
                  <Leaf className="w-5 h-5 text-white" />
                </div>
                {placeCheckins.length > 0 && (
                  <div className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                    {placeCheckins.length}
                  </div>
                )}
                <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  <div className="bg-white px-2 py-1 rounded-lg shadow-md border border-zinc-100 text-[10px] font-bold">
                    {first.placeName}
                  </div>
                </div>
              </div>
            </AdvancedMarker>
          );
        })}

        {/* Search Results Markers (Only if no checkins at that place yet to avoid overlapping) */}
        {searchResults.filter(p => !checkinsByPlace[p.id]).map((place) => (
          <AdvancedMarker
            key={place.id}
            position={place.location}
            onClick={() => handlePlaceSelect(place.id, place.location?.toJSON())}
          >
            <div className="p-1 bg-white rounded-full shadow-lg border-2 border-zinc-200 transform hover:scale-110 transition-transform cursor-pointer">
              <Leaf className="w-4 h-4 text-zinc-400" />
            </div>
          </AdvancedMarker>
        ))}
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
          className="pointer-events-auto w-11 h-11 bg-white rounded-2xl shadow-lg border border-zinc-100 flex items-center justify-center text-zinc-500 hover:text-zinc-900 transition-colors"
        >
          <Search className="w-5 h-5" />
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
                  placeholder="동네 카페 검색..."
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
                        onClick={() => { handlePlaceSelect(place.id, place.location?.toJSON()); setSearchOpen(false); }}
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

      <button
        onClick={() => {
          if (navigator.geolocation && map) {
            navigator.geolocation.getCurrentPosition((pos) => {
              map.panTo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
              map.setZoom(16);
            });
          }
        }}
        className="absolute bottom-24 right-4 w-12 h-12 bg-white rounded-2xl shadow-lg border border-zinc-100 flex items-center justify-center text-zinc-900 hover:bg-zinc-50 transition-colors z-10"
      >
        <Navigation className="w-5 h-5" />
      </button>

      <AnimatePresence>
        {selectedPlaceId && (
          <CafeDetails 
            placeId={selectedPlaceId} 
            profile={profile} 
            onClose={() => setSelectedPlaceId(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

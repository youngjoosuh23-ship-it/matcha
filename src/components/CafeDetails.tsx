import { useEffect, useState, useMemo, useRef } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { collection, onSnapshot, query, where, setDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CheckIn, UserProfile } from '../types';
import { Leaf, X, MapPin, Star, Check, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import RequestModal from './RequestModal';

interface CafeDetailsProps {
  placeId: string;
  profile: UserProfile | null;
  onClose: () => void;
}

export default function CafeDetails({ placeId, profile, onClose }: CafeDetailsProps) {
  const placesLib = useMapsLibrary('places');
  const [place, setPlace] = useState<google.maps.places.Place | null>(null);
  const [localCheckins, setLocalCheckins] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestTarget, setRequestTarget] = useState<CheckIn | null>(null);
  const autoCheckedIn = useRef(false);
  const [viewingProfile, setViewingProfile] = useState<CheckIn | null>(null);

  // Fetch place details
  useEffect(() => {
    if (!placesLib || !placeId) return;
    
    setLoading(true);
    const p = new placesLib.Place({ id: placeId });
    p.fetchFields({
      fields: ['displayName', 'formattedAddress', 'location', 'rating', 'userRatingCount', 'photos', 'regularOpeningHours']
    }).then(() => {
      setPlace(p);
      setLoading(false);
    });
  }, [placesLib, placeId]);

  // Sync check-ins for THIS place
  useEffect(() => {
    const checkinsPath = 'checkins';
    const q = query(collection(db, checkinsPath), where('placeId', '==', placeId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const checkins = snapshot.docs.map(doc => doc.data() as CheckIn);
      setLocalCheckins(checkins);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, checkinsPath);
    });
    return () => unsubscribe();
  }, [placeId]);

  const isCheckedIn = useMemo(() => {
    return localCheckins.some(c => c.userId === profile?.uid);
  }, [localCheckins, profile]);

  // Auto check-in when place loads (only once per session)
  useEffect(() => {
    if (place && profile && !autoCheckedIn.current) {
      autoCheckedIn.current = true;
      if (!isCheckedIn) handleCheckIn();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [place, isCheckedIn]);

  const handleCheckIn = async () => {
    if (!profile || !place) return;

    const checkinPath = `checkins/${profile.uid}`;
    const checkinRef = doc(db, 'checkins', profile.uid);
    try {
      if (isCheckedIn) {
        await deleteDoc(checkinRef);
      } else {
        const checkin: CheckIn = {
          userId: profile.uid,
          placeId: placeId,
          placeName: place.displayName || 'Unknown Cafe',
          location: place.location?.toJSON() || { lat: 0, lng: 0 },
          checkInAt: Timestamp.now(),
          expiresAt: Timestamp.fromDate(new Date(Date.now() + 3 * 60 * 60 * 1000)), // 3 hours
          userName: profile.displayName,
          userPhoto: profile.photoURL,
          userStyle: profile.chatStyle,
          userTags: profile.professionalTags,
          userField: profile.field ?? ''
        };
        await setDoc(checkinRef, checkin);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, checkinPath);
    }
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

  return (
    <>
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="absolute inset-x-0 bottom-0 z-40 bg-white rounded-t-[40px] shadow-[0_-20px_50px_rgba(0,0,0,0.1)] border-t border-zinc-100 max-h-[85vh] overflow-y-auto flex flex-col font-sans"
    >
      {/* Header Handle */}
      <div className="w-12 h-1.5 bg-zinc-200 rounded-full mx-auto my-4 shrink-0" />

      {/* Close Button */}
      <button 
        onClick={onClose}
        className="absolute top-6 right-6 w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-500 hover:bg-zinc-200 transition-colors"
      >
        <X className="w-5 h-5" />
      </button>

      {loading ? (
        <div className="p-10 flex flex-col items-center justify-center gap-4">
          <Leaf className="w-10 h-10 text-zinc-200 animate-pulse" />
          <p className="text-zinc-400 font-medium">카페 정보를 불러오는 중...</p>
        </div>
      ) : (
        <div className="px-6 pb-12 space-y-8">
          {/* Cafe Info */}
          <div className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-3xl font-bold tracking-tight text-zinc-900">{place?.displayName}</h2>
              <div className="flex items-center gap-4 text-sm text-zinc-500">
                {place?.rating && (
                  <div className="flex items-center gap-1 font-bold text-amber-500">
                    <Star className="w-4 h-4 fill-current" />
                    <span>{place.rating} ({place.userRatingCount})</span>
                  </div>
                )}
                <div className="flex items-center gap-1 font-medium">
                  <MapPin className="w-4 h-4" />
                  <span className="line-clamp-1">{place?.formattedAddress}</span>
                </div>
              </div>
            </div>

            {/* Photo placeholder/preview */}
            <div className="w-full h-48 bg-zinc-100 rounded-3xl overflow-hidden">
              {place?.photos && place.photos.length > 0 ? (
                <img 
                  src={place.photos[0].getURI({ maxWidth: 1000 })} 
                  alt={place.displayName || 'Cafe'} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-300">
                  <Leaf className="w-12 h-12" />
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleCheckIn}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-bold transition-all active:scale-95",
                isCheckedIn 
                  ? "bg-zinc-100 text-zinc-600" 
                  : "bg-zinc-900 text-white shadow-xl shadow-zinc-900/20"
              )}
            >
              {isCheckedIn ? (
                <>
                  <Check className="w-5 h-5" />
                  체크인 되어있음
                </>
              ) : (
                <>
                  <MapPin className="w-5 h-5" />
                  여기서 체크인하기
                </>
              )}
            </button>
          </div>

          {/* Live Status Section */}
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
                  <div 
                    key={checkin.userId}
                    className="flex items-center justify-between p-5 bg-zinc-50 rounded-3xl border border-zinc-100 group hover:border-zinc-200 transition-colors"
                  >
                    <div
                      className="flex items-center gap-4 flex-1 cursor-pointer"
                      onClick={() => setViewingProfile(checkin)}
                    >
                      <div className="relative">
                        <img
                          src={checkin.userPhoto}
                          alt={checkin.userName}
                          className="w-14 h-14 rounded-2xl object-cover border-2 border-white shadow-sm"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-sm border border-zinc-50">
                          {checkin.userStyle === 'quiet' ? '🤫' : checkin.userStyle === 'language' ? '🌍' : checkin.userStyle === 'business' ? '💼' : '💬'}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-zinc-900">{checkin.userName}</span>
                          {checkin.userField && (
                            <span className="text-[10px] font-bold bg-zinc-900 text-white px-2 py-0.5 rounded-full">
                              {checkin.userField}
                            </span>
                          )}
                          <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", getStyleColor(checkin.userStyle))}>
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
                    {checkin.userId !== profile?.uid && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setRequestTarget(checkin); }}
                        className="w-12 h-12 bg-white rounded-2xl border border-zinc-200 flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:border-zinc-900 transition-all active:scale-90 shrink-0"
                      >
                        <Send className="w-5 h-5" />
                      </button>
                    )}
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
    </motion.div>

    <AnimatePresence>
      {requestTarget && profile && (
        <RequestModal
          target={requestTarget}
          myProfile={profile}
          placeName={place?.displayName ?? ''}
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
              <img
                src={viewingProfile.userPhoto}
                alt={viewingProfile.userName}
                className="w-20 h-20 rounded-3xl object-cover border-2 border-white shadow-md"
                referrerPolicy="no-referrer"
              />
              <div className="space-y-1.5">
                <p className="text-xl font-bold text-zinc-900">{viewingProfile.userName}</p>
                <div className="flex flex-wrap gap-1.5">
                  {viewingProfile.userField && (
                    <span className="text-xs font-bold bg-zinc-900 text-white px-2.5 py-1 rounded-full">
                      {viewingProfile.userField}
                    </span>
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
                  <span key={tag} className="text-xs font-medium text-zinc-500 bg-zinc-50 px-3 py-1.5 rounded-xl border border-zinc-100">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
            {profile && viewingProfile.userId !== profile.uid && (
              <button
                onClick={() => { setRequestTarget(viewingProfile); setViewingProfile(null); }}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-zinc-900 text-white font-bold shadow-xl hover:bg-zinc-950 active:scale-95 transition-all"
              >
                <Send className="w-4 h-4" />
                말차 요청보내기
              </button>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
    </>
  );
}

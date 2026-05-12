import { useState } from 'react';
import { X, MapPin, Clock, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { joinEvent, leaveEvent, deleteEvent } from '../lib/firebase';
import type { Event, UserProfile } from '../types';
import { cn } from '../lib/utils';

interface EventPanelProps {
  event: Event;
  myProfile: UserProfile | null;
  userLocation: { lat: number; lng: number } | null;
  fixed?: boolean;
  onClose: () => void;
}

function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function timeLeft(endAt: any): string {
  const ms = (endAt?.toDate?.()?.getTime() ?? new Date(endAt).getTime()) - Date.now();
  if (ms <= 0) return '종료됨';
  const hr = Math.floor(ms / 3600000);
  const min = Math.floor((ms % 3600000) / 60000);
  if (hr > 0) return `${hr}시간 ${min}분 남음`;
  return `${min}분 남음`;
}

export default function EventPanel({ event, myProfile, userLocation, fixed = false, onClose }: EventPanelProps) {
  const [acting, setActing] = useState(false);
  const [ending, setEnding] = useState(false);

  const isAttending = myProfile ? event.attendees.includes(myProfile.uid) : false;
  const isCreator = myProfile?.uid === event.creatorId;

  const distance = userLocation ? distanceKm(userLocation, event.location) : null;
  const withinRadius = distance !== null ? distance <= event.radiusKm : false;

  const handleJoin = async () => {
    if (!myProfile || acting) return;
    setActing(true);
    try {
      if (isAttending) {
        await leaveEvent(event.id, myProfile.uid);
      } else {
        await joinEvent(event.id, myProfile.uid, myProfile.displayName, myProfile.photoURL);
      }
    } catch (e) {
      console.error('event join/leave error:', e);
    } finally {
      setActing(false);
    }
  };

  const handleEnd = async () => {
    if (!myProfile || ending) return;
    setEnding(true);
    try {
      await deleteEvent(event.id);
      onClose();
    } catch (e) {
      console.error('event delete error:', e);
      setEnding(false);
    }
  };

  const distanceLabel = distance !== null
    ? distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`
    : null;

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className={cn(
        'inset-x-0 bottom-0 bg-white rounded-t-[40px] shadow-[0_-20px_50px_rgba(0,0,0,0.1)] border-t border-zinc-100 font-sans',
        fixed ? 'fixed z-[60]' : 'absolute z-50'
      )}
    >
      <div className="w-12 h-1.5 bg-zinc-200 rounded-full mx-auto my-4" />

      <button
        onClick={onClose}
        className="absolute top-6 right-6 w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-500 hover:bg-zinc-200 transition-colors"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="px-6 pb-8 space-y-5">
        {/* Header */}
        <div className="space-y-2 pr-12">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🍁</span>
            <h2 className="text-2xl font-bold text-zinc-900 leading-tight">{event.title}</h2>
          </div>

          <div className="flex flex-wrap gap-3 text-xs text-zinc-400 font-medium">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {event.locationName}
              {distanceLabel && (
                <span className={cn(
                  'ml-1 px-1.5 py-0.5 rounded-full font-bold text-[10px]',
                  withinRadius ? 'bg-emerald-100 text-emerald-600' : 'bg-red-50 text-red-400'
                )}>
                  {distanceLabel}
                </span>
              )}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {timeLeft(event.endAt)}
            </span>
            <span className="flex items-center gap-1 text-amber-500 font-bold">
              반경 {event.radiusKm}km 이내
            </span>
          </div>
        </div>

        {/* Description */}
        {event.description && (
          <p className="text-sm text-zinc-600 leading-relaxed bg-zinc-50 rounded-2xl px-4 py-3">
            {event.description}
          </p>
        )}

        {/* Host + Attendees */}
        <div className="flex items-center gap-3 p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
          <div className="flex -space-x-2">
            {event.attendees.slice(0, 5).map((uid) =>
              event.attendeePhotos[uid] ? (
                <img
                  key={uid}
                  src={event.attendeePhotos[uid]}
                  className={cn(
                    'w-8 h-8 rounded-full border-2 object-cover',
                    uid === event.creatorId ? 'border-amber-400' : 'border-white'
                  )}
                  referrerPolicy="no-referrer"
                />
              ) : null
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-zinc-900">
              {event.attendeeNames[event.creatorId] || '익명'} 외 {Math.max(0, event.attendees.length - 1)}명
            </p>
            <p className="text-xs text-zinc-400 flex items-center gap-1">
              <Users className="w-3 h-3" />
              {event.attendees.length}명 참여 중 · 반경 {event.radiusKm}km
            </p>
          </div>
        </div>

        {/* Join / Leave button */}
        {myProfile && !isCreator && (
          <>
            {!withinRadius && !isAttending && distance !== null ? (
              <div className="w-full py-3.5 rounded-2xl bg-zinc-100 text-zinc-400 font-bold text-sm text-center">
                반경 {event.radiusKm}km 밖이에요 ({distanceLabel} 거리)
              </div>
            ) : (
              <button
                onClick={handleJoin}
                disabled={acting}
                className={cn(
                  'w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold transition-all active:scale-95 disabled:opacity-50',
                  isAttending
                    ? 'bg-zinc-100 text-zinc-700 hover:bg-red-50 hover:text-red-500'
                    : 'bg-amber-400 text-white shadow-xl shadow-amber-200 hover:bg-amber-500'
                )}
              >
                {acting
                  ? <div className="w-5 h-5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                  : isAttending ? '참여 취소하기' : '🍁 참여하기'}
              </button>
            )}
          </>
        )}

        {isCreator && (
          <div className="flex gap-3">
            <div className="flex-1 py-3.5 rounded-2xl bg-amber-50 text-amber-600 font-bold text-sm text-center border border-amber-100">
              내가 만든 이벤트예요
            </div>
            <button
              onClick={handleEnd}
              disabled={ending}
              className="px-5 py-3.5 rounded-2xl bg-red-50 text-red-500 font-bold text-sm hover:bg-red-100 transition-colors disabled:opacity-50 active:scale-95"
            >
              {ending
                ? <div className="w-4 h-4 border-2 border-red-300 border-t-red-500 rounded-full animate-spin" />
                : '종료'}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

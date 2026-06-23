import { useState } from 'react';
import { X, MapPin, Clock, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { joinEvent, leaveEvent, deleteEvent } from '../lib/firebase';
import type { Event, UserProfile } from '../types';
import { cn } from '../lib/utils';
import { panelBg, cardBg } from '../design/tokens';
import { useLanguage, type Lang } from '../lib/i18n';

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

function timeLeft(endAt: any, lang: Lang): string {
  const ms = (endAt?.toDate?.()?.getTime() ?? new Date(endAt).getTime()) - Date.now();
  if (ms <= 0) return lang === 'ko' ? '종료됨' : 'Ended';
  const hr = Math.floor(ms / 3600000);
  const min = Math.floor((ms % 3600000) / 60000);
  if (lang === 'ko') return hr > 0 ? `${hr}시간 ${min}분 남음` : `${min}분 남음`;
  return hr > 0 ? `${hr}h ${min}m left` : `${min}m left`;
}

export default function EventPanel({ event, myProfile, userLocation, fixed = false, onClose }: EventPanelProps) {
  const { lang, t } = useLanguage();
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
        'inset-x-0 bottom-0 rounded-t-[40px] shadow-2xl border border-white/60 font-sans',
        fixed ? 'fixed z-[60]' : 'absolute z-50'
      )}
      style={panelBg}
    >
      <div className="w-10 h-1 rounded-full mx-auto my-4" style={{ background: 'rgba(0,0,0,0.12)' }} />

      <button
        onClick={onClose}
        className="absolute top-6 right-6 w-10 h-10 rounded-full flex items-center justify-center text-zinc-600 hover:text-zinc-900 transition-colors"
        style={{ background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(0,0,0,0.08)' }}
      >
        <X className="w-5 h-5" />
      </button>

      <div className="px-6 pb-8 space-y-5">
        {/* Header */}
        <div className="space-y-2 pr-12">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🍁</span>
            <h2 className="text-2xl font-bold text-zinc-800 leading-tight">{event.title}</h2>
          </div>

          <div className="flex flex-wrap gap-3 text-xs text-zinc-500 font-medium">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {event.locationName}
              {distanceLabel && (
                <span className={cn(
                  'ml-1 px-1.5 py-0.5 rounded-full font-bold text-[10px]',
                  withinRadius ? 'text-[#2d5a1b]' : 'text-red-500'
                )} style={withinRadius
                  ? { background: 'rgba(143,181,112,0.2)', border: '1px solid rgba(143,181,112,0.4)' }
                  : { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }
                }>
                  {distanceLabel}
                </span>
              )}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {timeLeft(event.endAt, lang)}
            </span>
            <span className="flex items-center gap-1 font-bold text-[#8b4a2e]">
              {t(`반경 ${event.radiusKm}km 이내`, `Within ${event.radiusKm}km`)}
            </span>
          </div>
        </div>

        {/* Description */}
        {event.description && (
          <p className="text-sm text-zinc-600 leading-relaxed rounded-2xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(0,0,0,0.06)' }}>
            {event.description}
          </p>
        )}

        {/* Host + Attendees */}
        <div className="flex items-center gap-3 p-4 rounded-2xl border border-white/60" style={cardBg}>
          <div className="flex -space-x-2">
            {event.attendees.slice(0, 5).map((uid) =>
              event.attendeePhotos[uid] ? (
                <img
                  key={uid}
                  src={event.attendeePhotos[uid]}
                  className="w-8 h-8 rounded-full object-cover border-2 border-white"
                  style={uid === event.creatorId ? { borderColor: '#f4c4b0' } : undefined}
                  referrerPolicy="no-referrer"
                />
              ) : null
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-zinc-800">
              {t(
                `${event.attendeeNames[event.creatorId] || '익명'} 외 ${Math.max(0, event.attendees.length - 1)}명`,
                `${event.attendeeNames[event.creatorId] || 'Anonymous'} +${Math.max(0, event.attendees.length - 1)} others`
              )}
            </p>
            <p className="text-xs text-zinc-400 flex items-center gap-1">
              <Users className="w-3 h-3" />
              {t(`${event.attendees.length}명 참여 중 · 반경 ${event.radiusKm}km`, `${event.attendees.length} joined · within ${event.radiusKm}km`)}
            </p>
          </div>
        </div>

        {/* Join / Leave button */}
        {myProfile && !isCreator && (
          <>
            {!withinRadius && !isAttending && distance !== null ? (
              <div className="w-full py-3.5 rounded-2xl font-bold text-sm text-center text-zinc-400" style={{ background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(0,0,0,0.06)' }}>
                {t(`반경 ${event.radiusKm}km 밖이에요 (${distanceLabel} 거리)`, `Outside the ${event.radiusKm}km radius (${distanceLabel} away)`)}
              </div>
            ) : (
              <button
                onClick={handleJoin}
                disabled={acting}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold transition-all active:scale-95 disabled:opacity-50 text-white"
                style={isAttending
                  ? { background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.2)', color: '#dc2626' }
                  : { background: '#1a2418', boxShadow: '0 8px 24px -8px rgba(0,0,0,0.3)' }
                }
              >
                {acting
                  ? <div className="w-5 h-5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                  : isAttending ? t('참여 취소하기', 'Cancel attendance') : `🍁 ${t('참여하기', 'Join')}`}
              </button>
            )}
          </>
        )}

        {isCreator && (
          <div className="flex gap-3">
            <div className="flex-1 py-3.5 rounded-2xl font-bold text-sm text-center border" style={{ background: 'rgba(143,181,112,0.15)', borderColor: 'rgba(143,181,112,0.3)', color: '#2d5a1b' }}>
              {t('내가 만든 이벤트예요', 'You created this event')}
            </div>
            <button
              onClick={handleEnd}
              disabled={ending}
              className="px-5 py-3.5 rounded-2xl font-bold text-sm transition-colors disabled:opacity-50 active:scale-95 text-red-500 hover:text-red-700"
              style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              {ending
                ? <div className="w-4 h-4 border-2 border-red-300 border-t-red-500 rounded-full animate-spin" />
                : t('종료', 'End')}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

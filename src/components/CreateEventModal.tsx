import { useState } from 'react';
import { X, MapPin } from 'lucide-react';
import { motion } from 'motion/react';
import { createEvent } from '../lib/firebase';
import type { UserProfile } from '../types';
import { cn } from '../lib/utils';

interface CreateEventModalProps {
  myProfile: UserProfile;
  userLocation: { lat: number; lng: number } | null;
  fixedLocation?: { lat: number; lng: number };
  fixedLocationName?: string;
  placeId?: string;
  onClose: () => void;
  onCreated: (eventId: string) => void;
}

const RADIUS_OPTIONS = [
  { km: 1, label: '1km' },
  { km: 3, label: '3km' },
  { km: 5, label: '5km' },
  { km: 10, label: '10km' },
];

const DURATION_OPTIONS = [
  { hours: 1, label: '1시간' },
  { hours: 2, label: '2시간' },
  { hours: 3, label: '3시간' },
  { hours: 6, label: '6시간' },
  { hours: 24, label: '종일' },
];

export default function CreateEventModal({ myProfile, userLocation, fixedLocation, fixedLocationName, placeId, onClose, onCreated }: CreateEventModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [locationName, setLocationName] = useState(fixedLocationName ?? '');
  const [radiusKm, setRadiusKm] = useState(3);
  const [durationHours, setDurationHours] = useState(2);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    const loc = fixedLocation ?? userLocation;
    if (!title.trim()) { setError('이벤트 제목을 입력해주세요.'); return; }
    if (!loc) { setError('위치 정보가 필요해요. 잠시 후 다시 시도해주세요.'); return; }
    setCreating(true);
    setError(null);
    try {
      const id = await createEvent(
        myProfile.uid,
        myProfile.displayName,
        myProfile.photoURL,
        title.trim(),
        description.trim(),
        loc,
        locationName.trim() || '내 현재 위치',
        radiusKm,
        durationHours,
        placeId,
      );
      onCreated(id);
    } catch (e) {
      console.error('create event error:', e);
      setError('이벤트 생성에 실패했어요. 다시 시도해주세요.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-zinc-950/40 backdrop-blur-sm font-sans"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="w-full sm:max-w-sm bg-white rounded-t-[40px] p-6 space-y-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-zinc-200 rounded-full mx-auto" />

        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-zinc-900">🍁 이벤트 만들기</h3>
            <p className="text-xs text-zinc-400 mt-0.5">반경 내 사람들을 초대해보세요</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        {/* Title */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-zinc-400">이벤트 제목 *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 같이 공부해요, 네트워킹 모임"
            className="w-full bg-zinc-50 rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 ring-zinc-900/5 transition-all"
            autoFocus
          />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-zinc-400">설명 <span className="font-normal">(선택)</span></label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="어떤 이벤트인지 간단히 알려주세요."
            rows={2}
            className="w-full bg-zinc-50 rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 ring-zinc-900/5 transition-all resize-none"
          />
        </div>

        {/* Location name */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-zinc-400 flex items-center gap-1">
            <MapPin className="w-3 h-3" /> 장소
          </label>
          {fixedLocationName ? (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3">
              <span className="text-sm font-bold text-amber-700 truncate">{fixedLocationName}</span>
            </div>
          ) : (
            <>
              <input
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="예: 홍대입구역 근처"
                className="w-full bg-zinc-50 rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 ring-zinc-900/5 transition-all"
              />
              {!userLocation && (
                <p className="text-xs text-amber-500">위치 권한이 필요해요</p>
              )}
            </>
          )}
        </div>

        {/* Radius */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-zinc-400">참여 가능 반경</label>
          <div className="grid grid-cols-4 gap-2">
            {RADIUS_OPTIONS.map((opt) => (
              <button
                key={opt.km}
                onClick={() => setRadiusKm(opt.km)}
                className={cn(
                  'py-2.5 rounded-2xl text-sm font-bold transition-all border',
                  radiusKm === opt.km
                    ? 'bg-amber-400 border-amber-400 text-white shadow-lg shadow-amber-200'
                    : 'bg-zinc-50 border-transparent text-zinc-500 hover:bg-zinc-100'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Duration */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-zinc-400">이벤트 기간</label>
          <div className="grid grid-cols-5 gap-1.5">
            {DURATION_OPTIONS.map((opt) => (
              <button
                key={opt.hours}
                onClick={() => setDurationHours(opt.hours)}
                className={cn(
                  'py-2.5 rounded-2xl text-xs font-bold transition-all border',
                  durationHours === opt.hours
                    ? 'bg-zinc-900 border-zinc-900 text-white shadow-lg'
                    : 'bg-zinc-50 border-transparent text-zinc-500 hover:bg-zinc-100'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-3.5 rounded-2xl bg-zinc-100 text-zinc-600 font-bold hover:bg-zinc-200 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleCreate}
            disabled={creating || !title.trim()}
            className="flex-1 py-3.5 rounded-2xl bg-amber-400 text-white font-bold hover:bg-amber-500 transition-colors disabled:opacity-50 active:scale-95 shadow-lg shadow-amber-200"
          >
            {creating
              ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
              : '이벤트 열기 🍁'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

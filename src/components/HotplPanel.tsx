import { useMemo } from 'react';
import { X } from 'lucide-react';
import { motion } from 'motion/react';
import type { CheckIn } from '../types';

interface HotplPanelProps {
  checkinsByPlace: Record<string, CheckIn[]>;
  onSelectPlace: (placeId: string, location: { lat: number; lng: number }) => void;
  onClose: () => void;
}

const RANK_BADGE = ['🥇', '🥈', '🥉'];

export default function HotplPanel({ checkinsByPlace, onSelectPlace, onClose }: HotplPanelProps) {
  const ranked = useMemo(() => {
    return Object.entries(checkinsByPlace)
      .map(([placeId, checkins]) => ({
        placeId,
        placeName: checkins[0].placeName,
        location: checkins[0].location,
        checkins,
      }))
      .sort((a, b) => b.checkins.length - a.checkins.length)
      .slice(0, 10);
  }, [checkinsByPlace]);

  return (
    <div
      className="fixed inset-0 z-[60] bg-zinc-950/30 backdrop-blur-sm flex items-end justify-center font-sans"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="w-full sm:max-w-sm bg-white rounded-t-[40px] shadow-2xl flex flex-col max-h-[70vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-zinc-200 rounded-full mx-auto my-4 shrink-0" />

        <div className="flex items-center justify-between px-6 pb-4 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-zinc-900">🔥 주변 핫플</h2>
            <p className="text-xs text-zinc-400 mt-0.5">지금 가장 활발한 장소예요</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-zinc-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-2">
          {ranked.length === 0 ? (
            <div className="py-16 flex flex-col items-center gap-3 text-center">
              <span className="text-4xl">🍵</span>
              <p className="font-bold text-zinc-400">아직 활발한 장소가 없어요</p>
              <p className="text-sm text-zinc-300">첫 번째로 체크인해보세요!</p>
            </div>
          ) : (
            ranked.map((place, i) => (
              <button
                key={place.placeId}
                onClick={() => { onSelectPlace(place.placeId, place.location); onClose(); }}
                className="w-full flex items-center gap-4 p-4 bg-zinc-50 rounded-2xl hover:bg-zinc-100 transition-colors text-left active:scale-95"
              >
                <div className="text-xl font-black text-zinc-300 w-7 text-center shrink-0">
                  {RANK_BADGE[i] ?? <span className="text-sm text-zinc-400">{i + 1}</span>}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="font-bold text-zinc-900 text-sm truncate">{place.placeName}</p>
                    {place.checkins.length >= 3 && <span className="text-xs">🔥</span>}
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">{place.checkins.length}명 활동 중</p>
                </div>

                <div className="flex -space-x-2 shrink-0">
                  {place.checkins.slice(0, 3).map((c, j) => (
                    <img
                      key={j}
                      src={c.userPhoto}
                      className="w-8 h-8 rounded-full border-2 border-white object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ))}
                  {place.checkins.length > 3 && (
                    <div className="w-8 h-8 rounded-full bg-zinc-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-zinc-500">
                      +{place.checkins.length - 3}
                    </div>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { motion } from 'motion/react';
import type { CheckIn, PlaceStat, Mark } from '../types';
import { cn } from '../lib/utils';
import { panelBg, cardBg } from '../design/tokens';

interface HotplPanelProps {
  checkinsByPlace: Record<string, CheckIn[]>;
  recentPlaceStats: PlaceStat[];
  marks: Mark[];
  mapCenter: { lat: number; lng: number } | null;
  onSelectPlace: (placeId: string, location: { lat: number; lng: number }) => void;
  onSelectMark: (mark: Mark) => void;
  onClose: () => void;
}

function distKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const dlat = (a.lat - b.lat) * 111;
  const dlng = (a.lng - b.lng) * 88;
  return Math.sqrt(dlat * dlat + dlng * dlng);
}

const RANK_BADGE = ['🥇', '🥈', '🥉'];

export default function HotplPanel({ checkinsByPlace, recentPlaceStats, marks, mapCenter, onSelectPlace, onSelectMark, onClose }: HotplPanelProps) {
  const [tab, setTab] = useState<'now' | 'history' | 'nearby'>('now');

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

  const rankedHistory = useMemo(() => {
    return [...recentPlaceStats]
      .sort((a, b) => b.totalEvents - a.totalEvents)
      .slice(0, 10);
  }, [recentPlaceStats]);

  const nearbyMarks = useMemo(() => {
    if (!mapCenter) return marks.slice(0, 20);
    return [...marks]
      .map(m => ({ mark: m, dist: distKm(m.location, mapCenter) }))
      .filter(({ dist }) => dist <= 3)
      .sort((a, b) => a.dist - b.dist)
      .map(({ mark }) => mark);
  }, [marks, mapCenter]);

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/15 backdrop-blur-[2px] flex items-end justify-center font-sans"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="w-full sm:max-w-sm rounded-t-[36px] border border-white/60 shadow-2xl flex flex-col max-h-[70vh]"
        style={panelBg}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full mx-auto my-4 shrink-0" style={{ background: 'rgba(0,0,0,0.12)' }} />

        <div className="flex items-center justify-between px-6 pb-3 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-zinc-800">🔥 주변 핫플</h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-zinc-600 hover:text-zinc-900 transition-colors"
            style={{ background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(0,0,0,0.08)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-4 pb-3 gap-2 shrink-0">
          {(['now', 'nearby', 'history'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'flex-1 py-2 rounded-2xl text-sm font-bold transition-all',
                tab === t ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700',
              )}
              style={tab !== t ? { background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(0,0,0,0.06)' } : {}}
            >
              {t === 'now' ? '지금 현황' : t === 'nearby' ? '📌 근처 추천' : '🕰️ 히스토리'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-2">
          {tab === 'nearby' ? (
            nearbyMarks.length === 0 ? (
              <div className="py-16 flex flex-col items-center gap-3 text-center">
                <span className="text-4xl">📌</span>
                <p className="font-bold text-zinc-500">근처 3km 내 등록된 가게가 없어요</p>
              </div>
            ) : (
              nearbyMarks.map((mark) => (
                <button
                  key={mark.id}
                  onClick={() => { onSelectMark(mark); onClose(); }}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl text-left active:scale-95 transition-all border border-white/60 hover:border-white/80"
                  style={cardBg}
                >
                  <div className="text-xl shrink-0">📌</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-zinc-800 text-sm truncate">{mark.placeName || '이름 없음'}</p>
                    {mark.memo && <p className="text-[11px] text-zinc-500 truncate mt-0.5">{mark.memo}</p>}
                  </div>
                  <div className="text-[10px] text-zinc-400 shrink-0">{mark.creatorName}</div>
                </button>
              ))
            )
          ) : tab === 'now' ? (
            ranked.length === 0 ? (
              <div className="py-16 flex flex-col items-center gap-3 text-center">
                <span className="text-4xl">🍵</span>
                <p className="font-bold text-zinc-500">아직 활발한 장소가 없어요</p>
                <p className="text-sm text-zinc-400">첫 번째로 체크인해보세요!</p>
              </div>
            ) : (
              ranked.map((place, i) => (
                <button
                  key={place.placeId}
                  onClick={() => { onSelectPlace(place.placeId, place.location); onClose(); }}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl text-left active:scale-95 transition-all border border-white/60 hover:border-white/80"
                  style={cardBg}
                >
                  {i < 3 && (
                    <div className={cn(
                      'absolute left-0 top-3 bottom-3 w-1 rounded-full',
                      i === 0 ? 'bg-[#f4c4b0]' : i === 1 ? 'bg-white/40' : 'bg-[#c9b8e8]'
                    )} />
                  )}
                  <div className="text-xl w-7 text-center shrink-0">
                    {RANK_BADGE[i] ?? <span className="text-sm font-black text-white/30">{i + 1}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-zinc-800 text-sm truncate">{place.placeName}</p>
                      {place.checkins.length >= 3 && <span className="text-xs">🔥</span>}
                    </div>
                    <span className="text-[10px] font-bold text-zinc-500 mt-1 inline-block">
                      {place.checkins.length}명 활동 중
                    </span>
                  </div>
                  <div className="flex -space-x-2 shrink-0">
                    {place.checkins.slice(0, 3).map((c, j) => (
                      <img
                        key={j}
                        src={c.userPhoto}
                        className="w-9 h-9 rounded-full border-2 object-cover shadow-sm"
                        style={{ borderColor: 'rgba(255,255,255,0.7)' }}
                        referrerPolicy="no-referrer"
                      />
                    ))}
                    {place.checkins.length > 3 && (
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-bold text-zinc-500 shadow-sm border-2"
                        style={{ background: 'rgba(255,255,255,0.65)', borderColor: 'rgba(255,255,255,0.8)' }}
                      >
                        +{place.checkins.length - 3}
                      </div>
                    )}
                  </div>
                </button>
              ))
            )
          ) : (
            rankedHistory.length === 0 ? (
              <div className="py-16 flex flex-col items-center gap-3 text-center">
                <span className="text-4xl">🕰️</span>
                <p className="font-bold text-zinc-500">최근 7일간 이벤트 기록이 없어요</p>
                <p className="text-sm text-zinc-400">이벤트를 만들어보세요!</p>
              </div>
            ) : (
              rankedHistory.map((stat, i) => (
                <button
                  key={stat.placeId}
                  onClick={() => { onSelectPlace(stat.placeId, stat.location); onClose(); }}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl text-left active:scale-95 transition-all border border-white/60 hover:border-white/80"
                  style={cardBg}
                >
                  <div className="text-xl w-7 text-center shrink-0">
                    {RANK_BADGE[i] ?? <span className="text-sm font-black text-white/30">{i + 1}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-zinc-800 text-sm truncate">{stat.placeName}</p>
                    <span className="text-[10px] font-bold text-zinc-500 mt-1 inline-block">
                      총 이벤트 {stat.totalEvents}회
                    </span>
                  </div>
                  <div className="text-2xl shrink-0">🍁</div>
                </button>
              ))
            )
          )}
        </div>
      </motion.div>
    </div>
  );
}

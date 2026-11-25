import { useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { Zap, CalendarDays, MapPin } from 'lucide-react';
import type { PlacePin } from '../lib/placePins';
import { panelBg, cardBg } from '../design/tokens';
import { useLanguage } from '../lib/i18n';

interface ActivePlacesSheetProps {
  pins: PlacePin[];                          // 지도에 보이는 범위 안의 활동 있는 장소 (정렬된 상태)
  iconOf: (p: PlacePin) => string;
  onSelect: (p: PlacePin) => void;
  floating?: ReactNode;                      // 시트 바로 위에 뜨는 버튼들 (접혀 있을 때만)
  // 마킹 모드: 근처 장소를 가까운 순으로 보여주고 고르게 함 (null이면 평소 목록)
  pick?: { places: PickPlace[]; loading: boolean; error: string | null; onPick: (p: PickPlace) => void } | null;
}

export interface PickPlace { id: string; name: string; location: { lat: number; lng: number }; distKm: number }
const fmtDist = (km: number) => km < 1 ? `${Math.round(km * 100) * 10}m` : `${km.toFixed(1)}km`;

// 지도 아래 "지금 활발한 장소" 목록. 손잡이를 누르거나 위로 끌면 전체 화면, 아래로 끌면 접힘.
export default function ActivePlacesSheet({ pins, iconOf, onSelect, floating, pick }: ActivePlacesSheetProps) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0, height: expanded ? '85vh' : '34vh' }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 260 }}
      className="absolute inset-x-0 bottom-0 z-30 flex flex-col rounded-t-[28px] border border-white/60 shadow-2xl font-sans"
      style={panelBg}
    >
      {!expanded && floating && !pick && (
        <div className="absolute right-4 -top-3 -translate-y-full flex flex-col items-end gap-2">{floating}</div>
      )}

      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.15}
        onDragEnd={(_, info) => {
          if (info.offset.y < -30) setExpanded(true);
          else if (info.offset.y > 30) setExpanded(false);
        }}
        onTap={() => setExpanded(v => !v)}
        role="button"
        aria-expanded={expanded}
        aria-label={expanded ? t('목록 접기', 'Collapse list') : t('목록 펼치기', 'Expand list')}
        className="shrink-0 px-5 pt-2.5 pb-3 cursor-grab touch-none select-none"
      >
        <div className="w-10 h-1 rounded-full mx-auto mb-2.5" style={{ background: 'rgba(0,0,0,0.15)' }} />
        <div className="flex items-baseline justify-between gap-2">
          {pick ? (<>
            <h2 className="text-base font-bold text-zinc-800">{t('마킹할 장소', 'Place to mark')}</h2>
            <span className="text-[11px] text-zinc-400">{t('가까운 순 · 2km 이내', 'Nearest first · within 2km')}</span>
          </>) : (<>
          <h2 className="text-base font-bold text-zinc-800">
            {t('지금 활발한 장소', 'Active places now')} <span className="text-[#4f7a34]">{pins.length}</span>
          </h2>
          <span className="text-[11px] text-zinc-400">{t('지도에 보이는 범위', 'In the map view')}</span>
          </>)}
        </div>
      </motion.div>

      <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-2">
        {pick ? (
          pick.loading ? (
            <div className="py-8 flex justify-center"><div className="w-5 h-5 border-2 border-zinc-200 border-t-zinc-500 rounded-full animate-spin" /></div>
          ) : pick.error || pick.places.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-400">{pick.error ?? t('근처에서 장소를 찾지 못했어요. 지도를 눌러 마킹하세요.', 'No places nearby. Tap the map to mark.')}</p>
          ) : pick.places.map((pl) => (
            <button
              key={pl.id}
              onClick={() => pick.onPick(pl)}
              className="w-full flex items-center gap-3 p-3 rounded-2xl border border-white/60 text-left active:scale-[0.98] transition-transform"
              style={cardBg}
            >
              <MapPin className="w-5 h-5 shrink-0 text-[#4f7a34]" />
              <span className="flex-1 min-w-0 text-sm font-bold text-zinc-800 truncate">{pl.name}</span>
              <span className="text-xs font-bold text-zinc-400 shrink-0">{fmtDist(pl.distKm)}</span>
            </button>
          ))
        ) : pins.length === 0 ? (
          <div className="py-8 px-4 text-center space-y-1">
            <p className="text-sm font-bold text-zinc-500">{t('이 지역에 지금 활발한 장소가 없어요', 'No active places in this area')}</p>
            <p className="text-xs text-zinc-400">{t('지도를 옮기거나, 위의 "이 지역 카페 보기"로 카페를 찾아 첫 체크인을 해보세요.', 'Move the map, or use "Show cafes in this area" to find one and check in first.')}</p>
          </div>
        ) : pins.map((p) => (
          <button
            key={p.placeId}
            onClick={() => onSelect(p)}
            className="w-full flex items-center gap-3 p-3 rounded-2xl border border-white/60 text-left active:scale-[0.98] transition-transform"
            style={cardBg}
          >
            <img src={iconOf(p)} alt="" draggable={false} className="h-10 w-10 object-contain shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-zinc-800 truncate">{p.name || t('이름 없는 장소', 'Unnamed place')}</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {p.bolts > 0 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-0.5" style={{ background: 'rgba(244,211,94,0.35)', color: '#7a5a00' }}><Zap className="w-3 h-3" />{t('번개 지금', 'Bolt now')}</span>}
                {p.meetups > 0 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-0.5" style={{ background: 'rgba(143,181,112,0.22)', color: '#2d5a1b' }}><CalendarDays className="w-3 h-3" />{t(`모임 ${p.meetups} 예정`, `${p.meetups} upcoming`)}</span>}
                {p.checkins > 0 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,0,0,0.05)', color: '#52525b' }}>{t(`${p.checkins}명 체크인`, `${p.checkins} checked in`)}</span>}
              </div>
            </div>
          </button>
        ))}
      </div>
    </motion.div>
  );
}

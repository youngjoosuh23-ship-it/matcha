import { motion } from 'motion/react';
import { X, MapPin, Phone, Calendar } from 'lucide-react';
import { TourFestival, formatTourDate } from '../lib/tourapi';
import { panelBg } from '../design/tokens';

interface TourFestivalPanelProps {
  festival: TourFestival;
  onClose: () => void;
}

export default function TourFestivalPanel({ festival, onClose }: TourFestivalPanelProps) {
  const dateRange = festival.eventstartdate && festival.eventenddate
    ? `${formatTourDate(festival.eventstartdate)} ~ ${formatTourDate(festival.eventenddate)}`
    : null;

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="absolute inset-x-0 bottom-0 z-40 rounded-t-[40px] shadow-2xl border border-white/60 flex flex-col font-sans overflow-hidden"
      style={{ ...panelBg, maxHeight: '80vh' }}
    >
      {/* 헤더 */}
      <div className="shrink-0 px-6 pt-5 pb-4 space-y-4" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <div className="w-10 h-1 rounded-full mx-auto" style={{ background: 'rgba(0,0,0,0.12)' }} />

        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-10 h-10 rounded-full flex items-center justify-center text-zinc-600 hover:text-zinc-900 transition-colors"
          style={{ background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(0,0,0,0.08)' }}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="pr-12 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xl">🎪</span>
            <h2 className="text-2xl font-bold text-zinc-800 leading-tight">{festival.title}</h2>
          </div>
          <span
            className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
            style={{ background: '#d97706' }}
          >
            한국관광공사 공공 행사
          </span>
        </div>
      </div>

      {/* 이미지 */}
      {festival.firstimage && (
        <div className="shrink-0 w-full h-44 overflow-hidden">
          <img src={festival.firstimage} alt={festival.title} className="w-full h-full object-cover" />
        </div>
      )}

      {/* 상세 정보 */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

        {dateRange && (
          <div className="flex items-start gap-3 rounded-2xl p-4 border border-white/60" style={{ background: 'rgba(255,255,255,0.45)' }}>
            <Calendar className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-zinc-500 mb-0.5">행사 기간</p>
              <p className="text-sm font-bold text-zinc-800">{dateRange}</p>
            </div>
          </div>
        )}

        {(festival.addr1 || festival.eventplace) && (
          <div className="flex items-start gap-3 rounded-2xl p-4 border border-white/60" style={{ background: 'rgba(255,255,255,0.45)' }}>
            <MapPin className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-zinc-500 mb-0.5">장소</p>
              {festival.eventplace && (
                <p className="text-sm font-bold text-zinc-800">{festival.eventplace}</p>
              )}
              {festival.addr1 && (
                <p className="text-xs text-zinc-400 mt-0.5">{festival.addr1}</p>
              )}
            </div>
          </div>
        )}

        {festival.tel && (
          <a
            href={`tel:${festival.tel}`}
            className="flex items-center gap-3 rounded-2xl p-4 border border-white/60 transition-opacity active:opacity-70"
            style={{ background: 'rgba(255,255,255,0.45)' }}
          >
            <Phone className="w-4 h-4 text-zinc-400 shrink-0" />
            <div>
              <p className="text-xs font-bold text-zinc-500 mb-0.5">문의</p>
              <p className="text-sm font-bold text-zinc-800">{festival.tel}</p>
            </div>
          </a>
        )}

        <p className="text-[11px] text-zinc-300 text-center pt-2">
          이 정보는 한국관광공사 공공데이터를 활용합니다
        </p>

        <div className="h-4" />
      </div>
    </motion.div>
  );
}

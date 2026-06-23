import { motion } from 'motion/react';
import { X, MapPin, Calendar } from 'lucide-react';
import { CultureEvent } from '../lib/cultureapi';
import { panelBg } from '../design/tokens';
import { useLanguage } from '../lib/i18n';

interface CultureEventPanelProps {
  event: CultureEvent;
  onClose: () => void;
}

function formatDate(yyyymmdd: string): string {
  if (yyyymmdd.length !== 8) return yyyymmdd;
  return `${yyyymmdd.slice(0, 4)}.${yyyymmdd.slice(4, 6)}.${yyyymmdd.slice(6, 8)}`;
}

export default function CultureEventPanel({ event, onClose }: CultureEventPanelProps) {
  const { t } = useLanguage();
  const dateRange = event.startDate && event.endDate
    ? `${formatDate(event.startDate)} ~ ${formatDate(event.endDate)}`
    : null;

  const locationStr = [event.place, event.sigungu || event.area].filter(Boolean).join(' · ');

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

        <div className="pr-12 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xl">🎭</span>
            <h2 className="text-2xl font-bold text-zinc-800 leading-tight">{event.title}</h2>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
              style={{ background: '#7c3aed' }}
            >
              {t('한국문화정보원', 'Korea Culture Info Service')}
            </span>
            {event.realmName && (
              <span
                className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(124,58,237,0.12)', color: '#7c3aed' }}
              >
                {event.realmName}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 썸네일 이미지 */}
      {event.thumbnail && (
        <div className="shrink-0 w-full h-44 overflow-hidden">
          <img src={event.thumbnail} alt={event.title} className="w-full h-full object-cover" />
        </div>
      )}

      {/* 상세 정보 */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">

        {dateRange && (
          <div className="flex items-start gap-3 rounded-2xl p-4 border border-white/60" style={{ background: 'rgba(255,255,255,0.45)' }}>
            <Calendar className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-zinc-500 mb-0.5">{t('행사 기간', 'Event period')}</p>
              <p className="text-sm font-bold text-zinc-800">{dateRange}</p>
            </div>
          </div>
        )}

        {locationStr && (
          <div className="flex items-start gap-3 rounded-2xl p-4 border border-white/60" style={{ background: 'rgba(255,255,255,0.45)' }}>
            <MapPin className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-zinc-500 mb-0.5">{t('장소', 'Venue')}</p>
              <p className="text-sm font-bold text-zinc-800">{locationStr}</p>
            </div>
          </div>
        )}

        <p className="text-[11px] text-zinc-300 text-center pt-2">
          {t('이 정보는 한국문화정보원 공공데이터를 활용합니다', 'This information uses Korea Culture Info Service open data')}
        </p>
        <div className="h-4" />
      </div>
    </motion.div>
  );
}

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { X, MapPin, Phone, Calendar, Clock, Users, Ticket, ExternalLink } from 'lucide-react';
import { TourFestival, TourFestivalDetail, fetchFestivalDetail, formatTourDate } from '../lib/tourapi';
import { panelBg } from '../design/tokens';

interface TourFestivalPanelProps {
  festival: TourFestival;
  onClose: () => void;
}

export default function TourFestivalPanel({ festival, onClose }: TourFestivalPanelProps) {
  const [detail, setDetail] = useState<TourFestivalDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchFestivalDetail(festival.contentId).then((d) => {
      setDetail(d);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [festival.contentId]);

  const dateRange = festival.eventstartdate && festival.eventenddate
    ? `${formatTourDate(festival.eventstartdate)} ~ ${formatTourDate(festival.eventenddate)}`
    : null;

  const eventplace = detail?.eventplace || festival.eventplace;
  const addr = festival.addr1;

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
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">

        {/* 행사 기간 */}
        {dateRange && (
          <InfoRow icon={<Calendar className="w-4 h-4 text-amber-600" />} label="행사 기간" value={dateRange} />
        )}

        {/* 행사 시간 */}
        {detail?.playtime && (
          <InfoRow icon={<Clock className="w-4 h-4 text-amber-600" />} label="행사 시간" value={detail.playtime} />
        )}

        {/* 장소 */}
        {(eventplace || addr) && (
          <InfoRow
            icon={<MapPin className="w-4 h-4 text-zinc-400" />}
            label="장소"
            value={eventplace}
            sub={addr}
          />
        )}

        {/* 주관기관 */}
        {detail?.sponsor1 && (
          <InfoRow icon={<Users className="w-4 h-4 text-zinc-400" />} label="주관" value={detail.sponsor1} />
        )}

        {/* 이용요금 */}
        {detail?.usetimefestival && (
          <InfoRow icon={<Ticket className="w-4 h-4 text-zinc-400" />} label="이용요금" value={detail.usetimefestival} />
        )}

        {/* 관람 연령 */}
        {detail?.agelimit && (
          <InfoRow icon={<Users className="w-4 h-4 text-zinc-400" />} label="관람 연령" value={detail.agelimit} />
        )}

        {/* 전화 */}
        {(festival.tel || detail?.sponsor1tel) && (
          <a
            href={`tel:${festival.tel || detail?.sponsor1tel}`}
            className="flex items-center gap-3 rounded-2xl p-4 border border-white/60 transition-opacity active:opacity-70"
            style={{ background: 'rgba(255,255,255,0.45)' }}
          >
            <Phone className="w-4 h-4 text-zinc-400 shrink-0" />
            <div>
              <p className="text-xs font-bold text-zinc-500 mb-0.5">문의</p>
              <p className="text-sm font-bold text-zinc-800">{festival.tel || detail?.sponsor1tel}</p>
            </div>
          </a>
        )}

        {/* 홈페이지 */}
        {detail?.homepage && (
          <a
            href={detail.homepage.replace(/<[^>]+>/g, '').trim()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-2xl p-4 border border-white/60 transition-opacity active:opacity-70"
            style={{ background: 'rgba(255,255,255,0.45)' }}
          >
            <ExternalLink className="w-4 h-4 text-zinc-400 shrink-0" />
            <p className="text-sm font-bold text-zinc-800">홈페이지 바로가기</p>
          </a>
        )}

        {/* 예매처 */}
        {detail?.bookingplace && (
          <InfoRow icon={<Ticket className="w-4 h-4 text-zinc-400" />} label="예매처" value={detail.bookingplace} />
        )}

        {/* 소개 */}
        {loading ? (
          <div className="space-y-2">
            <div className="h-3 rounded-xl animate-pulse w-full" style={{ background: 'rgba(0,0,0,0.06)' }} />
            <div className="h-3 rounded-xl animate-pulse w-4/5" style={{ background: 'rgba(0,0,0,0.06)' }} />
            <div className="h-3 rounded-xl animate-pulse w-3/4" style={{ background: 'rgba(0,0,0,0.06)' }} />
          </div>
        ) : detail?.overview ? (
          <div className="rounded-2xl p-4 border border-white/60" style={{ background: 'rgba(255,255,255,0.45)' }}>
            <p className="text-xs font-bold text-zinc-500 mb-2">소개</p>
            <p className="text-sm text-zinc-700 leading-relaxed">{detail.overview}</p>
          </div>
        ) : null}

        <p className="text-[11px] text-zinc-300 text-center pt-2">
          이 정보는 한국관광공사 공공데이터를 활용합니다
        </p>
        <div className="h-4" />
      </div>
    </motion.div>
  );
}

function InfoRow({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value?: string; sub?: string }) {
  if (!value && !sub) return null;
  return (
    <div className="flex items-start gap-3 rounded-2xl p-4 border border-white/60" style={{ background: 'rgba(255,255,255,0.45)' }}>
      <div className="shrink-0 mt-0.5">{icon}</div>
      <div>
        <p className="text-xs font-bold text-zinc-500 mb-0.5">{label}</p>
        {value && <p className="text-sm font-bold text-zinc-800">{value}</p>}
        {sub && <p className="text-xs text-zinc-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

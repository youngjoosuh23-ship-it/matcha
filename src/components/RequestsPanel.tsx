import { useState } from 'react';
import { X, Leaf, Check, XCircle, Clock, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { ChatRequest } from '../types';
import { cn } from '../lib/utils';
import { panelBg, cardBg } from '../design/tokens';
import { useLanguage, type Lang } from '../lib/i18n';

interface RequestsPanelProps {
  incomingRequests: ChatRequest[];
  sentRequests: ChatRequest[];
  onAccept: (request: ChatRequest) => Promise<void>;
  onDecline: (request: ChatRequest) => void;
  onDismiss: (request: ChatRequest) => void;
  onClose: () => void;
}

function timeLeft(expiresAt: any, lang: Lang): string {
  if (!expiresAt) return '';
  const ms = (expiresAt.toDate?.() ?? new Date(expiresAt)).getTime() - Date.now();
  if (ms <= 0) return lang === 'ko' ? '만료됨' : 'Expired';
  const min = Math.floor(ms / 60000);
  if (lang === 'ko') return min > 0 ? `${min}분 남음` : '곧 만료';
  return min > 0 ? `${min}m left` : 'expiring soon';
}

function getStatusLabel(status: string, lang: Lang): { text: string; bg: string; color: string } {
  const table: Record<string, { ko: string; en: string; bg: string; color: string }> = {
    pending:  { ko: '대기 중', en: 'Pending',  bg: 'rgba(244,196,176,0.4)', color: '#8b4a2e' },
    accepted: { ko: '수락됨',  en: 'Accepted', bg: 'rgba(143,181,112,0.3)', color: '#2d5a1b' },
    declined: { ko: '거절됨',  en: 'Declined', bg: 'rgba(0,0,0,0.06)', color: 'rgba(0,0,0,0.4)' },
    expired:  { ko: '만료됨',  en: 'Expired',  bg: 'rgba(0,0,0,0.04)', color: 'rgba(0,0,0,0.3)' },
  };
  const entry = table[status] ?? table.pending;
  return { text: lang === 'ko' ? entry.ko : entry.en, bg: entry.bg, color: entry.color };
}

export default function RequestsPanel({ incomingRequests, sentRequests, onAccept, onDecline, onDismiss, onClose }: RequestsPanelProps) {
  const { lang, t } = useLanguage();
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(new Set());

  const handleAccept = async (req: ChatRequest) => {
    setAcceptingId(req.id);
    try {
      await onAccept(req);
      setAcceptedIds(prev => new Set(prev).add(req.id));
    } catch (e) {
      console.error('accept failed:', e);
    } finally {
      setAcceptingId(null);
    }
  };

  const isEmpty = incomingRequests.length === 0 && sentRequests.length === 0;

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/15 backdrop-blur-[2px] flex justify-end font-sans"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        className="h-full w-full sm:max-w-sm border-l border-white/60 shadow-2xl flex flex-col"
        style={panelBg}
      >
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <div>
            <h2 className="text-xl font-bold text-zinc-800">{t('요청', 'Requests')}</h2>
            {incomingRequests.length > 0 && (
              <p className="text-xs font-medium mt-0.5 text-[#8b4a2e]">{t(`${incomingRequests.length}개의 새 요청`, `${incomingRequests.length} new requests`)}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-zinc-600 hover:text-zinc-900 transition-colors"
            style={{ background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(0,0,0,0.08)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {incomingRequests.length > 0 && (
            <div className="px-4 pt-4 pb-2 space-y-2">
              <p className="text-[11px] font-bold text-zinc-400 px-1 uppercase tracking-wider">{t('받은 요청', 'Received')}</p>
              <AnimatePresence>
                {incomingRequests.map((req) => (
                  <motion.div
                    key={req.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 40 }}
                    className="rounded-2xl p-3.5 space-y-3 border border-white/60"
                    style={cardBg}
                  >
                    <div className="flex items-center gap-3">
                      <img src={req.fromUserPhoto} alt={req.fromUserName} className="w-10 h-10 rounded-full object-cover" referrerPolicy="no-referrer" />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-zinc-800 text-sm">{req.fromUserName}</p>
                        <p className="text-xs text-zinc-500 truncate">{req.placeName}</p>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] font-bold shrink-0 text-[#8b4a2e]">
                        <Clock className="w-3 h-3" />
                        {timeLeft(req.expiresAt, lang)}
                      </div>
                    </div>

                    {req.message && (
                      <p className="text-xs text-zinc-600 rounded-xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(0,0,0,0.06)' }}>
                        "{req.message}"
                      </p>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => onDecline(req)}
                        disabled={acceptingId === req.id || acceptedIds.has(req.id)}
                        className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl font-bold text-sm text-zinc-500 hover:text-zinc-700 transition-colors active:scale-95 disabled:opacity-40"
                        style={{ background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(0,0,0,0.08)' }}
                      >
                        <XCircle className="w-4 h-4" />
                        {t('거절', 'Decline')}
                      </button>
                      <button
                        onClick={() => handleAccept(req)}
                        disabled={acceptingId === req.id || acceptedIds.has(req.id)}
                        className={cn(
                          'flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-60',
                          acceptedIds.has(req.id) ? 'text-white' : 'text-white'
                        )}
                        style={{
                          background: acceptedIds.has(req.id) ? 'rgba(143,181,112,0.85)' : '#1a2418',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                        }}
                      >
                        {acceptingId === req.id
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : acceptedIds.has(req.id)
                            ? <><Check className="w-4 h-4" /> {t('수락됨!', 'Accepted!')}</>
                            : <><Check className="w-4 h-4" /> {t('수락하기', 'Accept')}</>
                        }
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {sentRequests.length > 0 && (
            <div className="px-4 pt-4 pb-2 space-y-2">
              <p className="text-[11px] font-bold text-zinc-400 px-1 uppercase tracking-wider">{t('보낸 요청', 'Sent')}</p>
              <AnimatePresence>
                {sentRequests.map((req) => {
                  const sl = getStatusLabel(req.status, lang);
                  return (
                    <motion.div
                      key={req.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 40 }}
                      className="flex items-center gap-3 p-3.5 rounded-2xl border border-white/60"
                      style={cardBg}
                    >
                      {req.toUserPhoto ? (
                        <img src={req.toUserPhoto} alt={req.toUserName} className="w-10 h-10 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.65)' }}>
                          <Leaf className="w-4 h-4 text-zinc-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-zinc-800 text-sm">{req.toUserName ?? t('상대방', 'Partner')}</p>
                        <p className="text-xs text-zinc-500 truncate">{req.placeName}</p>
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0" style={{ background: sl.bg, color: sl.color }}>
                        {sl.text}
                      </span>
                      <button onClick={() => onDismiss(req)} className="ml-1 p-1 text-zinc-300 hover:text-zinc-500 transition-colors shrink-0">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}

          {isEmpty && (
            <div className="flex flex-col items-center justify-center h-64 gap-4 px-8 text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(0,0,0,0.06)' }}>
                <Leaf className="w-7 h-7 text-zinc-300" />
              </div>
              <p className="font-bold text-zinc-500">{t('요청이 없어요', 'No requests yet')}</p>
              <p className="text-sm text-zinc-400 leading-relaxed">{t('체크인하고 채팅 요청을 보내거나 받아보세요!', 'Check in to send or receive chat requests!')}</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

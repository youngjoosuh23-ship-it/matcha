import { useState } from 'react';
import { motion } from 'motion/react';
import { submitFeedback } from '../lib/firebase';
import type { Chat, Feedback, UserProfile } from '../types';
import { cn } from '../lib/utils';

interface FeedbackModalProps {
  chat: Chat;
  myProfile: UserProfile;
  onDone: () => void;
}

const CAFE_OPTIONS: { value: Feedback['cafeRating']; emoji: string; label: string }[] = [
  { value: 'bad', emoji: '😕', label: '별로' },
  { value: 'ok', emoji: '😊', label: '괜찮아요' },
  { value: 'great', emoji: '🌟', label: '최고!' },
];

const PARTNER_OPTIONS: { value: Feedback['partnerRating']; emoji: string; label: string }[] = [
  { value: 'awkward', emoji: '😐', label: '어색했어요' },
  { value: 'good', emoji: '😊', label: '좋았어요' },
  { value: 'want_again', emoji: '💕', label: '다시 만나고 싶어요' },
];

export default function FeedbackModal({ chat, myProfile, onDone }: FeedbackModalProps) {
  const [cafeRating, setCafeRating] = useState<Feedback['cafeRating'] | null>(null);
  const [partnerRating, setPartnerRating] = useState<Feedback['partnerRating'] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const otherId = chat.participants.find(p => p !== myProfile.uid) ?? '';

  const handleSubmit = async () => {
    if (!cafeRating || !partnerRating || submitting) return;
    setSubmitting(true);
    try {
      await submitFeedback({
        fromUserId: myProfile.uid,
        toUserId: otherId,
        chatId: chat.id,
        placeId: chat.placeId,
        cafeRating,
        partnerRating,
      });
      setDone(true);
      setTimeout(onDone, 1400);
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-zinc-950/50 backdrop-blur-sm font-sans">
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="w-full sm:max-w-sm bg-white rounded-t-[40px] sm:rounded-[40px] p-6 space-y-7"
      >
        {/* Handle */}
        <div className="w-10 h-1 bg-zinc-200 rounded-full mx-auto sm:hidden" />

        {done ? (
          <div className="py-8 flex flex-col items-center gap-3 text-center">
            <span className="text-5xl">🍵</span>
            <p className="text-lg font-bold text-zinc-900">피드백 감사해요!</p>
            <p className="text-sm text-zinc-400">오늘의 말차슬쩍이 기록되었어요.</p>
          </div>
        ) : (
          <>
            <div className="text-center space-y-1">
              <h3 className="text-xl font-bold text-zinc-900">오늘 어떠셨나요?</h3>
              <p className="text-sm text-zinc-400">{chat.placeName}에서의 말차슬쩍</p>
            </div>

            {/* Cafe rating */}
            <div className="space-y-3">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">카페 분위기</p>
              <div className="grid grid-cols-3 gap-2">
                {CAFE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setCafeRating(opt.value)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 py-3 rounded-2xl border font-bold text-sm transition-all active:scale-95',
                      cafeRating === opt.value
                        ? 'bg-zinc-900 border-zinc-900 text-white shadow-lg'
                        : 'bg-zinc-50 border-transparent text-zinc-500 hover:bg-zinc-100'
                    )}
                  >
                    <span className="text-2xl">{opt.emoji}</span>
                    <span className="text-xs">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Partner rating */}
            <div className="space-y-3">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                상대방은? <span className="normal-case font-medium text-zinc-300">(익명으로 전달돼요)</span>
              </p>
              <div className="grid grid-cols-3 gap-2">
                {PARTNER_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setPartnerRating(opt.value)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 py-3 rounded-2xl border font-bold text-sm transition-all active:scale-95',
                      partnerRating === opt.value
                        ? 'bg-zinc-900 border-zinc-900 text-white shadow-lg'
                        : 'bg-zinc-50 border-transparent text-zinc-500 hover:bg-zinc-100'
                    )}
                  >
                    <span className="text-2xl">{opt.emoji}</span>
                    <span className="text-[11px] text-center leading-tight">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={!cafeRating || !partnerRating || submitting}
              className="w-full py-4 rounded-2xl bg-zinc-900 text-white font-bold shadow-xl shadow-zinc-900/20 hover:bg-zinc-950 disabled:opacity-40 active:scale-95 transition-all"
            >
              {submitting
                ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                : '완료'}
            </button>

            <button onClick={onDone} className="w-full text-center text-sm text-zinc-300 hover:text-zinc-400 transition-colors">
              건너뛰기
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}

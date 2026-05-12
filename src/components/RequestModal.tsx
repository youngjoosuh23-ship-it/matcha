import { useState } from 'react';
import { X, Send, Leaf } from 'lucide-react';
import { motion } from 'motion/react';
import { sendChatRequest } from '../lib/firebase';
import type { CheckIn, UserProfile } from '../types';
import { cn } from '../lib/utils';

interface RequestModalProps {
  target: CheckIn;
  myProfile: UserProfile;
  placeName: string;
  onClose: () => void;
  onSent: () => void;
}

const STYLE_EMOJI: Record<string, string> = {
  quiet: '🤫', light: '💬', friendly: '💬', business: '💼', language: '🌍',
};

const MAX_LEN = 60;

const EXAMPLE_MESSAGES = [
  '안녕하세요! 말차 한 잔 하며 잠깐 얘기 나눠볼까요? 🍵',
  '반갑습니다! 같은 공간에 있는 김에 인사라도 해요 😊',
  '어떤 작업 중이세요? 저도 비슷한 분야라 여쭤봐요!',
];

export default function RequestModal({ target, myProfile, placeName, onClose, onSent }: RequestModalProps) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (sending || sent) return;
    setSending(true);
    try {
      await sendChatRequest(myProfile, target.userId, target.userName, target.userPhoto, target.placeId, placeName, message.trim());
      setSent(true);
      setTimeout(onSent, 1200);
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-zinc-950/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="w-full sm:max-w-sm bg-white rounded-t-[40px] sm:rounded-[40px] p-6 space-y-6 font-sans"
      >
        {/* Handle */}
        <div className="w-10 h-1 bg-zinc-200 rounded-full mx-auto sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-zinc-900">말차 요청보내기</h3>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-xl transition-colors">
            <X className="w-4 h-4 text-zinc-400" />
          </button>
        </div>

        {/* Target profile */}
        <div className="flex items-center gap-4 p-4 bg-zinc-50 rounded-3xl">
          <div className="relative">
            <img
              src={target.userPhoto}
              alt={target.userName}
              className="w-14 h-14 rounded-2xl object-cover border-2 border-white shadow-sm"
              referrerPolicy="no-referrer"
            />
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center text-xs shadow-sm border border-zinc-100">
              {STYLE_EMOJI[target.userStyle] ?? '🍵'}
            </div>
          </div>
          <div>
            <p className="font-bold text-zinc-900">{target.userName}</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {target.userField && (
                <span className="text-[10px] font-bold bg-zinc-900 text-white px-2 py-0.5 rounded-full">
                  {target.userField}
                </span>
              )}
              {target.userTags.slice(0, 2).map(tag => (
                <span key={tag} className="text-[10px] font-medium text-zinc-400">#{tag}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Message input */}
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_MESSAGES.map((ex) => (
              <button
                key={ex}
                onClick={() => setMessage(ex)}
                className={cn(
                  "text-xs px-3 py-1.5 rounded-2xl border font-medium transition-all text-left",
                  message === ex
                    ? "bg-zinc-900 text-white border-zinc-900"
                    : "bg-zinc-50 text-zinc-500 border-zinc-100 hover:border-zinc-300"
                )}
              >
                {ex}
              </button>
            ))}
          </div>
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-zinc-400">직접 입력 (선택)</label>
            <span className={cn("text-xs font-medium", message.length > MAX_LEN ? 'text-red-500' : 'text-zinc-300')}>
              {message.length}/{MAX_LEN}
            </span>
          </div>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, MAX_LEN))}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="직접 메시지를 입력해도 돼요"
            className="w-full bg-zinc-50 border-0 px-4 py-3 rounded-2xl text-sm outline-none focus:ring-2 ring-zinc-900/5 transition-all"
          />
        </div>

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={sending || sent}
          className={cn(
            "w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold transition-all active:scale-95",
            sent
              ? "bg-emerald-500 text-white"
              : "bg-zinc-900 text-white shadow-xl shadow-zinc-900/20 hover:bg-zinc-950 disabled:opacity-60"
          )}
        >
          {sent ? (
            <><Leaf className="w-5 h-5" /> 요청을 보냈어요!</>
          ) : sending ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <><Send className="w-5 h-5" /> 말차 요청보내기</>
          )}
        </button>
      </motion.div>
    </div>
  );
}

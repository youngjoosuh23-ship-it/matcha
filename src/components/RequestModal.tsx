import { useState } from 'react';
import { X, Send, Leaf } from 'lucide-react';
import { motion } from 'motion/react';
import { sendChatRequest } from '../lib/firebase';
import type { CheckIn, UserProfile } from '../types';
import { cn } from '../lib/utils';
import { panelBg, cardBg } from '../design/tokens';
import { useLanguage } from '../lib/i18n';

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

const EXAMPLE_MESSAGES_KO = [
  '안녕하세요! 잠깐 얘기 나눠볼까요? 🍵',
  '반갑습니다! 같은 공간에 있는 김에 인사라도 해요 😊',
  '어떤 작업 중이세요? 저도 비슷한 분야라 여쭤봐요!',
];

const EXAMPLE_MESSAGES_EN = [
  'Hi! Want to chat for a bit? 🍵',
  'Nice to meet you! Since we\'re in the same spot, thought I\'d say hi 😊',
  'What are you working on? I\'m curious since I work in a similar field!',
];

export default function RequestModal({ target, myProfile, placeName, onClose, onSent }: RequestModalProps) {
  const { lang, t } = useLanguage();
  const EXAMPLE_MESSAGES = lang === 'ko' ? EXAMPLE_MESSAGES_KO : EXAMPLE_MESSAGES_EN;
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
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/15 backdrop-blur-[2px]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="w-full sm:max-w-sm rounded-t-[40px] sm:rounded-[40px] p-6 space-y-6 font-sans border border-white/60 shadow-2xl"
        style={panelBg}
      >
        <div className="w-10 h-1 rounded-full mx-auto sm:hidden" style={{ background: 'rgba(0,0,0,0.12)' }} />

        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-zinc-800">{t('채팅 요청보내기', 'Send a chat request')}</h3>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-zinc-600 hover:text-zinc-900 transition-colors"
            style={{ background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(0,0,0,0.08)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Target profile */}
        <div className="flex items-center gap-4 p-4 rounded-3xl border border-white/60" style={cardBg}>
          <div className="relative">
            <img src={target.userPhoto} alt={target.userName} className="w-14 h-14 rounded-2xl object-cover" referrerPolicy="no-referrer" style={{ border: '2px solid rgba(255,255,255,0.8)' }} />
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs shadow-sm" style={{ background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(0,0,0,0.06)' }}>
              {STYLE_EMOJI[target.userStyle] ?? '🍵'}
            </div>
          </div>
          <div>
            <p className="font-bold text-zinc-800">{target.userName}</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {target.userField && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-[#2d5a1b]" style={{ background: 'rgba(143,181,112,0.25)', border: '1px solid rgba(143,181,112,0.4)' }}>
                  {target.userField}
                </span>
              )}
              {target.userTags.slice(0, 2).map(tag => (
                <span key={tag} className="text-[10px] font-medium text-zinc-400">#{tag}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Message */}
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_MESSAGES.map((ex) => (
              <button
                key={ex}
                onClick={() => setMessage(ex)}
                className={cn(
                  'text-xs px-3 py-1.5 rounded-2xl font-medium transition-all text-left border',
                  message === ex
                    ? 'text-white border-transparent'
                    : 'text-zinc-600 border-white/60 hover:border-white/80'
                )}
                style={message === ex
                  ? { background: '#1a2418' }
                  : { background: 'rgba(255,255,255,0.55)' }
                }
              >
                {ex}
              </button>
            ))}
          </div>
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-zinc-400">{t('직접 입력 (선택)', 'Write your own (optional)')}</label>
            <span className={cn('text-xs font-medium', message.length > MAX_LEN ? 'text-red-500' : 'text-zinc-400')}>
              {message.length}/{MAX_LEN}
            </span>
          </div>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, MAX_LEN))}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={t('직접 메시지를 입력해도 돼요', 'Type your own message')}
            className="w-full px-4 py-3 rounded-2xl text-sm outline-none text-zinc-800 placeholder:text-zinc-400 transition-all"
            style={{ background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(0,0,0,0.08)' }}
          />
        </div>

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={sending || sent}
          className={cn(
            'w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold transition-all active:scale-95 disabled:opacity-60',
            sent ? 'text-white' : 'text-white'
          )}
          style={{
            background: sent ? 'rgba(143,181,112,0.85)' : '#1a2418',
            boxShadow: '0 8px 24px -8px rgba(0,0,0,0.3)'
          }}
        >
          {sent ? (
            <><Leaf className="w-5 h-5" /> {t('요청을 보냈어요!', 'Request sent!')}</>
          ) : sending ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <><Send className="w-5 h-5" /> {t('채팅 요청보내기', 'Send chat request')}</>
          )}
        </button>
      </motion.div>
    </div>
  );
}

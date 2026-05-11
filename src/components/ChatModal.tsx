import { useEffect, useRef, useState } from 'react';
import { X, Send, Leaf, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { subscribeToMessages, sendMessage } from '../lib/firebase';
import type { Chat, Message, UserProfile } from '../types';
import { cn } from '../lib/utils';

interface ChatModalProps {
  chat: Chat;
  myProfile: UserProfile;
  onClose: () => void;
  onEnd: () => void;
}

const ICEBREAKERS = [
  '지금 어떤 자리에 계세요? 🪑',
  '어떤 작업 중이세요? 💻',
  '오늘 몇 시까지요? ⏰',
];

function timeLeft(expiresAt: any): string {
  if (!expiresAt) return '';
  const ms = (expiresAt.toDate?.() ?? new Date(expiresAt)).getTime() - Date.now();
  if (ms <= 0) return '만료됨';
  const hr = Math.floor(ms / 3600000);
  const min = Math.floor((ms % 3600000) / 60000);
  return hr > 0 ? `${hr}시간 ${min}분` : `${min}분`;
}

export default function ChatModal({ chat, myProfile, onClose, onEnd }: ChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const otherId = chat.participants.find(p => p !== myProfile.uid) ?? '';
  const otherName = chat.participantNames[otherId] ?? '상대방';
  const otherPhoto = chat.participantPhotos[otherId] ?? '';

  useEffect(() => {
    const unsub = subscribeToMessages(chat.id, setMessages);
    return unsub;
  }, [chat.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (content?: string) => {
    const msg = (content ?? text).trim();
    if (!msg || sending) return;
    setSending(true);
    setText('');
    try {
      await sendMessage(chat.id, myProfile.uid, msg);
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-white font-sans">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-100 bg-white">
        <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-xl transition-colors shrink-0">
          <X className="w-5 h-5 text-zinc-500" />
        </button>
        <div className="relative shrink-0">
          {otherPhoto ? (
            <img src={otherPhoto} alt={otherName} className="w-10 h-10 rounded-2xl object-cover border-2 border-white shadow-sm" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-10 h-10 rounded-2xl bg-zinc-100 flex items-center justify-center">
              <Leaf className="w-4 h-4 text-zinc-400" />
            </div>
          )}
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-zinc-900 text-sm leading-tight">{otherName}</p>
          <p className="text-xs text-zinc-400 truncate">{chat.placeName}</p>
        </div>
        <div className="flex items-center gap-1 text-xs font-bold text-zinc-400 shrink-0">
          <Clock className="w-3.5 h-3.5" />
          {timeLeft(chat.expiresAt)}
        </div>
        <button
          onClick={onEnd}
          className="shrink-0 px-3 py-1.5 text-xs font-bold text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
        >
          종료
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {/* Icebreakers — only when no messages yet */}
        {messages.length === 0 && (
          <div className="space-y-3 pb-4">
            <p className="text-center text-xs text-zinc-300 font-medium">대화를 시작해보세요 🍵</p>
            {ICEBREAKERS.map((ib) => (
              <button
                key={ib}
                onClick={() => handleSend(ib)}
                className="w-full text-left px-4 py-3 bg-zinc-50 rounded-2xl text-sm text-zinc-500 font-medium hover:bg-zinc-100 hover:text-zinc-700 transition-colors border border-zinc-100 active:scale-95"
              >
                {ib}
              </button>
            ))}
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const isMine = msg.senderId === myProfile.uid;
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn('flex', isMine ? 'justify-end' : 'justify-start')}
              >
                {!isMine && (
                  <img
                    src={otherPhoto}
                    alt={otherName}
                    className="w-8 h-8 rounded-xl object-cover border-2 border-white shadow-sm mr-2 self-end shrink-0"
                    referrerPolicy="no-referrer"
                  />
                )}
                <div
                  className={cn(
                    'max-w-[72%] px-4 py-2.5 rounded-3xl text-sm leading-relaxed',
                    isMine
                      ? 'bg-zinc-900 text-white rounded-br-lg'
                      : 'bg-zinc-100 text-zinc-800 rounded-bl-lg'
                  )}
                >
                  {msg.text}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-zinc-100 bg-white flex gap-2 items-center">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder="메시지 입력..."
          className="flex-1 bg-zinc-50 border-0 px-4 py-3 rounded-2xl text-sm outline-none focus:ring-2 ring-zinc-900/5 transition-all"
        />
        <button
          onClick={() => handleSend()}
          disabled={!text.trim() || sending}
          className="w-11 h-11 bg-zinc-900 rounded-2xl flex items-center justify-center text-white disabled:opacity-30 active:scale-90 transition-all shrink-0"
        >
          {sending
            ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <Send className="w-4 h-4" />
          }
        </button>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Paperclip, MoreVertical, Leaf, PlusCircle, Smile, Search, Send } from 'lucide-react';
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
        <button onClick={onClose} className="p-2 -ml-1 hover:bg-zinc-100 rounded-xl transition-colors shrink-0">
          <ArrowLeft className="w-5 h-5 text-zinc-800" />
        </button>
        <p className="flex-1 font-bold text-zinc-900 text-base truncate">{otherName}</p>
        <button className="p-2 hover:bg-zinc-100 rounded-xl transition-colors shrink-0">
          <Paperclip className="w-5 h-5 text-zinc-500" />
        </button>
        <button
          onClick={onEnd}
          className="p-2 hover:bg-zinc-100 rounded-xl transition-colors shrink-0"
        >
          <MoreVertical className="w-5 h-5 text-zinc-500" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => {
            const isMine = msg.senderId === myProfile.uid;
            const prevMsg = messages[i - 1];
            const isFirstInGroup = !prevMsg || prevMsg.senderId !== msg.senderId;

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn('flex items-end gap-2', isMine ? 'justify-end' : 'justify-start', isFirstInGroup && i !== 0 && 'mt-3')}
              >
                {!isMine && (
                  <div className="w-8 shrink-0 self-end">
                    {isFirstInGroup && (
                      otherPhoto ? (
                        <img
                          src={otherPhoto}
                          alt={otherName}
                          className="w-8 h-8 rounded-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center">
                          <Leaf className="w-3.5 h-3.5 text-zinc-400" />
                        </div>
                      )
                    )}
                  </div>
                )}
                <div
                  className={cn(
                    'max-w-[72%] px-4 py-2.5 text-sm leading-relaxed',
                    isMine
                      ? 'bg-zinc-800 text-white rounded-3xl rounded-br-md'
                      : 'bg-zinc-100 text-zinc-800 rounded-3xl rounded-bl-md'
                  )}
                >
                  {msg.text}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Icebreakers as pills — shown at bottom when no messages */}
        {messages.length === 0 && (
          <div className="pt-4 flex flex-col items-center gap-4">
            <p className="text-xs text-zinc-300 font-medium">대화를 시작해보세요 🍵</p>
            <div className="flex flex-wrap justify-center gap-2">
              {ICEBREAKERS.map((ib) => (
                <button
                  key={ib}
                  onClick={() => handleSend(ib)}
                  className="px-4 py-2 bg-zinc-100 rounded-full text-sm text-zinc-500 font-medium hover:bg-zinc-200 hover:text-zinc-700 transition-colors active:scale-95"
                >
                  {ib}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Icebreaker pills — also shown after last message */}
        {messages.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-3 justify-end">
            {ICEBREAKERS.map((ib) => (
              <button
                key={ib}
                onClick={() => handleSend(ib)}
                className="px-3 py-1.5 bg-zinc-100 rounded-full text-xs text-zinc-500 font-medium hover:bg-zinc-200 transition-colors active:scale-95"
              >
                {ib}
              </button>
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input Bar */}
      <div className="px-4 py-3 border-t border-zinc-100 bg-white flex items-center gap-3">
        <button className="shrink-0 text-zinc-400 hover:text-zinc-600 transition-colors">
          <PlusCircle className="w-6 h-6" />
        </button>
        <button className="shrink-0 text-zinc-400 hover:text-zinc-600 transition-colors">
          <Smile className="w-6 h-6" />
        </button>
        <div className="flex-1 relative">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="메시지 입력..."
            className="w-full bg-zinc-50 border-0 px-4 py-2.5 rounded-2xl text-sm outline-none focus:ring-2 ring-zinc-900/5 transition-all"
          />
        </div>
        {text.trim() ? (
          <button
            onClick={() => handleSend()}
            disabled={sending}
            className="shrink-0 text-zinc-800 hover:text-zinc-600 transition-colors disabled:opacity-30"
          >
            {sending
              ? <div className="w-5 h-5 border-2 border-zinc-300 border-t-zinc-800 rounded-full animate-spin" />
              : <Send className="w-5 h-5" />
            }
          </button>
        ) : (
          <button className="shrink-0 text-zinc-400 hover:text-zinc-600 transition-colors">
            <Search className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}

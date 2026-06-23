import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Paperclip, Leaf, PlusCircle, Smile, Search, Send, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { subscribeToMessages, sendMessage, uploadChatImage } from '../lib/firebase';
import type { Chat, Message, UserProfile } from '../types';
import { cn } from '../lib/utils';
import EmojiPicker from './EmojiPicker';
import { fullscreenBg, chatBarBg } from '../design/tokens';
import { useLanguage } from '../lib/i18n';

interface ChatModalProps {
  chat: Chat;
  myProfile: UserProfile;
  onClose: () => void;
  onEnd: (chat: Chat) => void;
}

const ICEBREAKERS_KO = [
  '지금 어떤 자리에 계세요? 🪑',
  '어떤 작업 중이세요? 💻',
  '오늘 몇 시까지요? ⏰',
];

const ICEBREAKERS_EN = [
  'Where are you sitting? 🪑',
  'What are you working on? 💻',
  'Until what time today? ⏰',
];

export default function ChatModal({ chat, myProfile, onClose, onEnd }: ChatModalProps) {
  const { lang, t } = useLanguage();
  const ICEBREAKERS = lang === 'ko' ? ICEBREAKERS_KO : ICEBREAKERS_EN;
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [imagePreview, setImagePreview] = useState<{ file: File; url: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [ttl, setTtl] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const otherId = chat.participants.find(p => p !== myProfile.uid) ?? '';
  const otherName = chat.participantNames[otherId] ?? t('상대방', 'Partner');
  const otherPhoto = chat.participantPhotos[otherId] ?? '';

  useEffect(() => {
    const unsub = subscribeToMessages(chat.id, setMessages);
    return unsub;
  }, [chat.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const update = () => {
      if (!chat.expiresAt) return;
      const ms = (chat.expiresAt.toDate?.()?.getTime() ?? new Date(chat.expiresAt).getTime()) - Date.now();
      if (ms <= 0) { setTtl(t('만료됨', 'Expired')); return; }
      const hr = Math.floor(ms / 3600000);
      const min = Math.floor((ms % 3600000) / 60000);
      setTtl(hr > 0 ? t(`${hr}시간 ${min}분`, `${hr}h ${min}m`) : t(`${min}분`, `${min}m`));
    };
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, [chat.expiresAt, lang]);

  const handleSend = async (content?: string) => {
    const msg = (content ?? text).trim();
    if ((!msg && !imagePreview) || sending) return;
    setSending(true);
    setText('');
    const preview = imagePreview;
    setImagePreview(null);
    try {
      if (preview) {
        setUploading(true);
        const imageUrl = await uploadChatImage(chat.id, preview.file);
        setUploading(false);
        await sendMessage(chat.id, myProfile.uid, msg || '', imageUrl);
      } else {
        await sendMessage(chat.id, myProfile.uid, msg);
      }
    } catch (e: any) {
      console.error('send error:', e);
      setUploadError(e?.message ?? String(e));
      setTimeout(() => setUploadError(null), 6000);
    } finally {
      setSending(false);
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImagePreview({ file, url });
    e.target.value = '';
  };

  const appendEmoji = (emoji: string) => {
    setText(prev => prev + emoji);
    inputRef.current?.focus();
  };

  return (
    <div className="fixed inset-0 z-[70] flex flex-col font-sans" style={fullscreenBg}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 shrink-0" style={{ ...chatBarBg, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <button onClick={onClose} className="p-2 -ml-1 rounded-xl transition-colors text-zinc-700 hover:bg-black/05 shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </button>
        {otherPhoto ? (
          <img src={otherPhoto} alt={otherName} className="w-8 h-8 rounded-full object-cover shrink-0" style={{ border: '2px solid rgba(255,255,255,0.8)' }} referrerPolicy="no-referrer" />
        ) : (
          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(0,0,0,0.08)' }}>
            <Leaf className="w-3.5 h-3.5 text-zinc-400" />
          </div>
        )}
        <p className="flex-1 font-bold text-zinc-800 text-base truncate">{otherName}</p>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-2 rounded-xl transition-colors text-zinc-500 hover:text-zinc-700 shrink-0"
        >
          <Paperclip className="w-5 h-5" />
        </button>
      </div>

      {/* TTL banner */}
      {ttl && (
        <div className="px-4 py-2 shrink-0" style={{ background: 'rgba(255,255,255,0.60)', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
          <p className="text-xs text-zinc-400">
            {lang === 'ko' ? (
              <>🍵 이 대화는 <span className="font-bold text-zinc-600">{ttl}</span> 후 종료돼요</>
            ) : (
              <>🍵 This chat ends in <span className="font-bold text-zinc-600">{ttl}</span></>
            )}
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1" onClick={() => setShowEmoji(false)}>
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
                className={cn(
                  'flex items-end gap-2',
                  isMine ? 'justify-end' : 'justify-start',
                  isFirstInGroup && i !== 0 && 'mt-3'
                )}
              >
                {!isMine && (
                  <div className="w-8 shrink-0 self-end">
                    {isFirstInGroup && (
                      otherPhoto ? (
                        <img src={otherPhoto} alt={otherName} className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(0,0,0,0.08)' }}>
                          <Leaf className="w-3.5 h-3.5 text-zinc-400" />
                        </div>
                      )
                    )}
                  </div>
                )}
                <div className={cn('max-w-[72%]', isMine ? 'items-end' : 'items-start', 'flex flex-col gap-1')}>
                  {msg.imageUrl && (
                    <img
                      src={msg.imageUrl}
                      alt={t('첨부 이미지', 'Attached image')}
                      className={cn('max-w-full rounded-2xl object-cover max-h-64', isMine ? 'rounded-br-md' : 'rounded-bl-md')}
                    />
                  )}
                  {msg.text && (
                    <div
                      className={cn('px-4 py-2.5 text-sm leading-relaxed', isMine ? 'rounded-3xl rounded-br-md text-white' : 'rounded-3xl rounded-bl-md text-zinc-800')}
                      style={isMine
                        ? { background: '#1a2418' }
                        : { background: 'rgba(255,255,255,0.72)', border: '1px solid rgba(0,0,0,0.06)' }
                      }
                    >
                      {msg.text}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {messages.length === 0 && (
          <div className="pt-4 flex flex-col items-center gap-4">
            <p className="text-xs text-zinc-400 font-medium">{t('대화를 시작해보세요', 'Start the conversation')} 🍵</p>
            <div className="flex flex-wrap justify-center gap-2">
              {ICEBREAKERS.map((ib) => (
                <button key={ib} onClick={() => handleSend(ib)} className="px-4 py-2 rounded-full text-sm text-zinc-600 font-medium transition-colors active:scale-95" style={{ background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(0,0,0,0.08)' }}>
                  {ib}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-3 justify-end">
            {ICEBREAKERS.map((ib) => (
              <button key={ib} onClick={() => handleSend(ib)} className="px-3 py-1.5 rounded-full text-xs text-zinc-500 font-medium transition-colors active:scale-95" style={{ background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(0,0,0,0.08)' }}>
                {ib}
              </button>
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Image preview */}
      <AnimatePresence>
        {imagePreview && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="px-4 pb-2 flex items-center gap-2 shrink-0">
            <div className="relative inline-block">
              <img src={imagePreview.url} alt={t('미리보기', 'Preview')} className="h-20 rounded-2xl object-cover" style={{ border: '1px solid rgba(0,0,0,0.08)' }} />
              <button onClick={() => setImagePreview(null)} className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-white" style={{ background: '#1a2418' }}>
                <X className="w-3 h-3" />
              </button>
            </div>
            <p className="text-xs text-zinc-400">{t('사진이 첨부됩니다', 'Photo will be attached')}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload error */}
      {uploadError && (
        <div className="px-4 py-2 shrink-0" style={{ background: 'rgba(239,68,68,0.08)', borderTop: '1px solid rgba(239,68,68,0.15)' }}>
          <p className="text-xs text-red-500 font-medium break-all">{uploadError}</p>
        </div>
      )}

      {/* Input Bar */}
      <div className="px-4 py-3 shrink-0 relative" style={{ ...chatBarBg, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
        <AnimatePresence>
          {showEmoji && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} className="absolute bottom-full left-4 mb-1">
              <EmojiPicker onSelect={appendEmoji} onClose={() => setShowEmoji(false)} />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-3">
          <button onClick={() => fileInputRef.current?.click()} className="shrink-0 text-zinc-400 hover:text-zinc-600 transition-colors">
            <PlusCircle className="w-6 h-6" />
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

          <button
            onClick={() => setShowEmoji(v => !v)}
            className={cn('shrink-0 transition-colors', showEmoji ? 'text-zinc-700' : 'text-zinc-400 hover:text-zinc-600')}
          >
            <Smile className="w-6 h-6" />
          </button>

          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && !isComposing && handleSend()}
            onFocus={() => setShowEmoji(false)}
            placeholder={t('메시지 입력...', 'Type a message...')}
            className="flex-1 px-4 py-2.5 rounded-2xl text-sm outline-none text-zinc-800 placeholder:text-zinc-400 transition-all"
            style={{ background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(0,0,0,0.08)' }}
          />

          {(text.trim() || imagePreview) ? (
            <button
              onClick={() => handleSend()}
              disabled={sending || uploading}
              className="shrink-0 text-zinc-700 hover:text-zinc-900 transition-colors disabled:opacity-30"
            >
              {sending || uploading
                ? <div className="w-5 h-5 border-2 border-zinc-300 border-t-zinc-700 rounded-full animate-spin" />
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
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, LogOut, PlusCircle, Smile, Send, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { subscribeToOpenMessages, sendOpenMessage, leaveOpenRoom, uploadOpenRoomImage } from '../lib/firebase';
import type { OpenMessage, OpenRoom, UserProfile } from '../types';
import { cn } from '../lib/utils';
import EmojiPicker from './EmojiPicker';
import { fullscreenBg, chatBarBg } from '../design/tokens';

interface OpenChatModalProps {
  room: OpenRoom;
  myProfile: UserProfile;
  onClose: () => void;
  onLeave: () => void;
}

export default function OpenChatModal({ room, myProfile, onClose, onLeave }: OpenChatModalProps) {
  const [messages, setMessages] = useState<OpenMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [imagePreview, setImagePreview] = useState<{ file: File; url: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return subscribeToOpenMessages(room.id, setMessages);
  }, [room.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (content?: string) => {
    const msg = (content ?? text).trim();
    if ((!msg && !imagePreview) || sending) return;
    setSending(true);
    setText('');
    const preview = imagePreview;
    setImagePreview(null);
    try {
      let imageUrl: string | undefined;
      if (preview) {
        setUploading(true);
        imageUrl = await uploadOpenRoomImage(room.id, preview.file);
        setUploading(false);
      }
      await sendOpenMessage(room.id, myProfile.uid, myProfile.displayName, myProfile.photoURL, msg, imageUrl);
    } catch (e) {
      console.error('send error:', e);
    } finally {
      setSending(false);
      setUploading(false);
    }
  };

  const handleLeave = async () => {
    const members = room.members ?? [];
    const isLast = members.length === 1 && members[0] === myProfile.uid;
    try {
      await leaveOpenRoom(room.id, myProfile.uid, isLast);
    } catch (e) {
      console.error('leave error:', e);
    }
    onLeave();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImagePreview({ file, url: URL.createObjectURL(file) });
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-[80] flex flex-col font-sans" style={fullscreenBg}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 shrink-0" style={{ ...chatBarBg, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <button onClick={onClose} className="p-2 -ml-1 rounded-xl transition-colors text-zinc-700 shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex -space-x-2 shrink-0">
          {(room.members ?? []).slice(0, 4).map((uid) => (
            room.memberPhotos?.[uid] && (
              <img
                key={uid}
                src={room.memberPhotos[uid]}
                alt={room.memberNames?.[uid] ?? ''}
                className="w-8 h-8 rounded-full object-cover"
                style={{ border: '2px solid rgba(255,255,255,0.8)' }}
                referrerPolicy="no-referrer"
              />
            )
          ))}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-bold text-zinc-800 text-sm truncate">{room.placeName} 오픈 채팅</p>
          <p className="text-xs text-zinc-400">{room.members?.length ?? 0}명 참여 중</p>
        </div>

        <button
          onClick={() => setConfirmLeave(true)}
          className="p-2 rounded-xl transition-colors text-zinc-400 hover:text-red-400 shrink-0"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      {/* Leave confirm banner */}
      <AnimatePresence>
        {confirmLeave && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="flex items-center justify-between px-4 py-2.5 shrink-0"
            style={{ background: 'rgba(239,68,68,0.08)', borderBottom: '1px solid rgba(239,68,68,0.12)' }}
          >
            <p className="text-sm font-medium text-red-600">채팅방을 나가시겠어요?</p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmLeave(false)}
                className="px-3 py-1 text-xs font-bold text-zinc-500 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(0,0,0,0.08)' }}
              >
                취소
              </button>
              <button
                onClick={handleLeave}
                className="px-3 py-1 text-xs font-bold text-white rounded-xl"
                style={{ background: 'rgba(239,68,68,0.85)' }}
              >
                나가기
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
                className={cn('flex items-end gap-2', isMine ? 'justify-end' : 'justify-start', isFirstInGroup && i !== 0 && 'mt-4')}
              >
                {!isMine && (
                  <div className="w-8 shrink-0 self-end">
                    {isFirstInGroup && (
                      <img src={msg.senderPhoto} alt={msg.senderName} className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
                    )}
                  </div>
                )}

                <div className={cn('max-w-[72%] flex flex-col gap-1', isMine ? 'items-end' : 'items-start')}>
                  {!isMine && isFirstInGroup && (
                    <span className="text-[11px] font-bold text-zinc-500 pl-1">{msg.senderName}</span>
                  )}

                  {msg.imageUrl && (
                    <img
                      src={msg.imageUrl}
                      alt="첨부 이미지"
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
          <div className="pt-8 flex flex-col items-center gap-3 text-center">
            <p className="text-xs text-zinc-400 font-medium">아직 메시지가 없어요.</p>
            <p className="text-xs text-zinc-400">첫 번째로 인사를 건네보세요 👋</p>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Image preview */}
      <AnimatePresence>
        {imagePreview && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="px-4 pb-2 flex items-center gap-2 shrink-0">
            <div className="relative inline-block">
              <img src={imagePreview.url} alt="미리보기" className="h-20 rounded-2xl object-cover" style={{ border: '1px solid rgba(0,0,0,0.08)' }} />
              <button onClick={() => setImagePreview(null)} className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-white" style={{ background: '#1a2418' }}>
                <X className="w-3 h-3" />
              </button>
            </div>
            <p className="text-xs text-zinc-400">사진이 첨부됩니다</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input bar */}
      <div className="px-4 py-3 shrink-0 relative" style={{ ...chatBarBg, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
        <AnimatePresence>
          {showEmoji && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} className="absolute bottom-full left-4 mb-1">
              <EmojiPicker onSelect={(e) => { setText(p => p + e); inputRef.current?.focus(); }} onClose={() => setShowEmoji(false)} />
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
            placeholder="메시지 입력..."
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
          ) : null}
        </div>
      </div>
    </div>
  );
}

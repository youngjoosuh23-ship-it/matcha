import { useState } from 'react';
import { X, Leaf, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { Chat, UserProfile } from '../types';
import { cn } from '../lib/utils';

interface ChatsPanelProps {
  activeChats: Chat[];
  myProfile: UserProfile;
  lastReadTimes: Record<string, number>;
  onOpenChat: (chat: Chat) => void;
  onEndChat: (chat: Chat) => void;
  onClose: () => void;
}

function relativeTime(ts: any): string {
  if (!ts) return '';
  const ms = Date.now() - (ts.toDate?.()?.getTime() ?? new Date(ts).getTime());
  const min = Math.floor(ms / 60000);
  if (min < 1) return '방금';
  if (min < 60) return `${min}분`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간`;
  return `${Math.floor(hr / 24)}일`;
}

function isUnread(chat: Chat, lastReadTimes: Record<string, number>): boolean {
  if (!chat.lastMessageAt) return false;
  const msgTime = chat.lastMessageAt.toDate?.()?.getTime() ?? new Date(chat.lastMessageAt).getTime();
  return msgTime > (lastReadTimes[chat.id] ?? 0);
}

export default function ChatsPanel({ activeChats, myProfile, lastReadTimes, onOpenChat, onEndChat, onClose }: ChatsPanelProps) {
  const [confirmEndId, setConfirmEndId] = useState<string | null>(null);

  return (
    <div
      className="fixed inset-0 z-[60] bg-zinc-950/30 backdrop-blur-sm flex justify-end font-sans"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        className="h-full w-full sm:max-w-sm bg-white shadow-2xl flex flex-col"
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100">
          <div>
            <h2 className="text-xl font-bold text-zinc-900">채팅</h2>
            {activeChats.length > 0 && (
              <p className="text-xs text-zinc-400 font-medium mt-0.5">{activeChats.length}개의 대화</p>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-zinc-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeChats.length > 0 ? (
            <AnimatePresence>
              {activeChats.map((chat) => {
                const otherId = chat.participants.find(p => p !== myProfile.uid) ?? '';
                const otherName = chat.participantNames[otherId] ?? '상대방';
                const otherPhoto = chat.participantPhotos[otherId] ?? '';
                const unread = isUnread(chat, lastReadTimes);

                return (
                  <motion.div
                    key={chat.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    {confirmEndId === chat.id ? (
                      <div className="mx-4 my-1 flex items-center gap-2 p-3.5 bg-red-50 rounded-2xl border border-red-100">
                        <p className="flex-1 text-sm font-medium text-red-600">채팅을 종료할까요?</p>
                        <button
                          onClick={() => setConfirmEndId(null)}
                          className="px-3 py-1.5 text-xs font-bold text-zinc-500 bg-white rounded-xl border border-zinc-200 hover:bg-zinc-50"
                        >
                          취소
                        </button>
                        <button
                          onClick={() => { setConfirmEndId(null); onEndChat(chat); }}
                          className="px-3 py-1.5 text-xs font-bold text-white bg-red-500 rounded-xl hover:bg-red-600"
                        >
                          종료
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center hover:bg-zinc-50 transition-colors group">
                        <button
                          onClick={() => onOpenChat(chat)}
                          className="flex-1 flex items-center gap-3 px-5 py-3.5 text-left"
                        >
                          <div className="relative shrink-0">
                            {otherPhoto ? (
                              <img src={otherPhoto} alt={otherName} className="w-12 h-12 rounded-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-zinc-200 flex items-center justify-center">
                                <Leaf className="w-5 h-5 text-zinc-400" />
                              </div>
                            )}
                            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-zinc-900 text-sm leading-tight">{otherName}</p>
                            <p className={cn('text-xs truncate mt-0.5', unread ? 'text-zinc-700 font-semibold' : 'text-zinc-400')}>
                              {chat.lastMessage ?? '대화를 시작해보세요'}
                            </p>
                          </div>

                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            {chat.lastMessageAt && (
                              <span className="text-[10px] text-zinc-400">{relativeTime(chat.lastMessageAt)}</span>
                            )}
                            {unread && (
                              <span className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">N</span>
                            )}
                          </div>
                        </button>

                        <button
                          onClick={() => setConfirmEndId(chat.id)}
                          className="px-3 py-3.5 text-zinc-200 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 gap-4 px-8 text-center">
              <Leaf className="w-12 h-12 text-zinc-200" />
              <p className="font-bold text-zinc-400">아직 채팅이 없어요</p>
              <p className="text-sm text-zinc-300">말차 요청을 수락하면 채팅이 시작돼요!</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

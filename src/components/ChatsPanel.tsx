import { useState } from 'react';
import { X, Leaf, Trash2, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { Chat, OpenRoom, UserProfile } from '../types';
import { cn } from '../lib/utils';
import { panelBg, cardBg } from '../design/tokens';
import { useLanguage, type Lang } from '../lib/i18n';

const SWIPE_OPEN_X = -80;

function SwipeRow({ id, isOpen, onSwipe, onDeleteClick, children }: {
  id: string;
  isOpen: boolean;
  onSwipe: (id: string | null) => void;
  onDeleteClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden">
      <button
        onClick={onDeleteClick}
        className="absolute right-0 top-0 h-full w-20 flex items-center justify-center text-white"
        style={{ background: 'rgba(239,68,68,0.85)' }}
      >
        <Trash2 className="w-5 h-5" />
      </button>
      <motion.div
        drag="x"
        dragConstraints={{ left: SWIPE_OPEN_X, right: 0 }}
        dragElastic={0.05}
        dragMomentum={false}
        animate={{ x: isOpen ? SWIPE_OPEN_X : 0 }}
        onDragEnd={(_, info) => onSwipe(info.offset.x < SWIPE_OPEN_X / 2 ? id : null)}
        className="relative"
        style={cardBg}
      >
        {children}
        {isOpen && <button onClick={() => onSwipe(null)} aria-label="close" className="absolute inset-0" />}
      </motion.div>
    </div>
  );
}

interface ChatsPanelProps {
  activeChats: Chat[];
  openRooms: OpenRoom[];
  myProfile: UserProfile;
  lastReadTimes: Record<string, number>;
  onOpenChat: (chat: Chat) => void;
  onOpenRoom: (room: OpenRoom) => void;
  onEndChat: (chat: Chat) => void;
  onLeaveRoom: (room: OpenRoom) => void;
  onClose: () => void;
}

function relativeTime(ts: any, lang: Lang): string {
  if (!ts) return '';
  const ms = Date.now() - (ts.toDate?.()?.getTime() ?? new Date(ts).getTime());
  const min = Math.floor(ms / 60000);
  if (min < 1) return lang === 'ko' ? '방금' : 'now';
  if (min < 60) return lang === 'ko' ? `${min}분` : `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return lang === 'ko' ? `${hr}시간` : `${hr}h`;
  return lang === 'ko' ? `${Math.floor(hr / 24)}일` : `${Math.floor(hr / 24)}d`;
}

function getLastTime(ts: any): number {
  if (!ts) return 0;
  return ts.toDate?.()?.getTime() ?? new Date(ts).getTime();
}

export default function ChatsPanel({ activeChats, openRooms, myProfile, lastReadTimes, onOpenChat, onOpenRoom, onEndChat, onLeaveRoom, onClose }: ChatsPanelProps) {
  const { lang, t } = useLanguage();
  const [confirmEndId, setConfirmEndId] = useState<string | null>(null);
  const [confirmLeaveId, setConfirmLeaveId] = useState<string | null>(null);
  const [openSwipeId, setOpenSwipeId] = useState<string | null>(null);

  type Item =
    | { kind: 'private'; chat: Chat; sortTs: number }
    | { kind: 'open'; room: OpenRoom; sortTs: number };

  const items: Item[] = [
    ...activeChats.map(chat => ({ kind: 'private' as const, chat, sortTs: getLastTime(chat.lastMessageAt) })),
    ...openRooms.map(room => ({ kind: 'open' as const, room, sortTs: getLastTime(room.lastMessageAt) })),
  ].sort((a, b) => b.sortTs - a.sortTs);

  const totalCount = items.length;

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
            <h2 className="text-xl font-bold text-zinc-800">{t('채팅', 'Chats')}</h2>
            {totalCount > 0 && (
              <p className="text-xs text-zinc-500 font-medium mt-0.5">{t(`${totalCount}개의 대화`, `${totalCount} conversations`)}</p>
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
          {items.length > 0 ? (
            <AnimatePresence>
              {items.map((item) => {
                const id = item.kind === 'private' ? item.chat.id : item.room.id;
                const lastMsgAt = item.kind === 'private' ? item.chat.lastMessageAt : item.room.lastMessageAt;
                const isUnread = (() => {
                  if (!lastMsgAt) return false;
                  const msgTime = lastMsgAt.toDate?.()?.getTime() ?? new Date(lastMsgAt).getTime();
                  return msgTime > (lastReadTimes[id] ?? 0);
                })();

                if (item.kind === 'private') {
                  const { chat } = item;
                  const otherId = chat.participants.find(p => p !== myProfile.uid) ?? '';
                  const otherName = chat.participantNames[otherId] ?? t('상대방', 'Partner');
                  const otherPhoto = chat.participantPhotos[otherId] ?? '';

                  return (
                    <motion.div key={chat.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -20 }}>
                      {confirmEndId === chat.id ? (
                        <div className="mx-4 my-1 flex items-center gap-2 p-3.5 rounded-2xl border border-red-200" style={{ background: 'rgba(239,68,68,0.08)' }}>
                          <p className="flex-1 text-sm font-medium text-red-600">{t('채팅을 종료할까요?', 'End this chat?')}</p>
                          <button onClick={() => setConfirmEndId(null)} className="px-3 py-1.5 text-xs font-bold text-zinc-500 rounded-xl border border-zinc-200" style={{ background: 'rgba(255,255,255,0.65)' }}>{t('취소', 'Cancel')}</button>
                          <button onClick={() => { setConfirmEndId(null); onEndChat(chat); }} className="px-3 py-1.5 text-xs font-bold text-white rounded-xl" style={{ background: 'rgba(239,68,68,0.85)' }}>{t('종료', 'End')}</button>
                        </div>
                      ) : (
                        <SwipeRow
                          id={chat.id}
                          isOpen={openSwipeId === chat.id}
                          onSwipe={setOpenSwipeId}
                          onDeleteClick={() => { setOpenSwipeId(null); setConfirmEndId(chat.id); }}
                        >
                          <div className="flex items-center transition-colors" style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.30)')}
                            onMouseLeave={e => (e.currentTarget.style.background = '')}
                          >
                            <button onClick={() => onOpenChat(chat)} className="flex-1 flex items-center gap-3 px-5 py-3.5 text-left">
                              <div className="relative shrink-0">
                                {otherPhoto
                                  ? <img src={otherPhoto} alt={otherName} className="w-12 h-12 rounded-full object-cover" referrerPolicy="no-referrer" />
                                  : <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.65)' }}><Leaf className="w-5 h-5 text-zinc-400" /></div>
                                }
                                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white" style={{ background: '#8fb570' }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-zinc-800 text-sm leading-tight">{otherName}</p>
                                <p className={cn('text-xs truncate mt-0.5', isUnread ? 'text-zinc-700 font-semibold' : 'text-zinc-400')}>
                                  {chat.lastMessage ?? t('대화를 시작해보세요', 'Start the conversation')}
                                </p>
                              </div>
                              <div className="flex flex-col items-end gap-1.5 shrink-0">
                                {lastMsgAt && <span className="text-[10px] text-zinc-400">{relativeTime(lastMsgAt, lang)}</span>}
                                {isUnread && <span className="w-5 h-5 text-[10px] font-bold rounded-full flex items-center justify-center" style={{ background: '#f4c4b0', color: '#1a2418' }}>N</span>}
                              </div>
                            </button>
                          </div>
                        </SwipeRow>
                      )}
                    </motion.div>
                  );
                }

                // Open room
                const { room } = item;
                const isCreator = room.creatorId === myProfile.uid;
                const isLast = (room.members?.length ?? 0) === 1;

                return (
                  <motion.div key={room.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -20 }}>
                    {confirmLeaveId === room.id ? (
                      <div className="mx-4 my-1 flex items-center gap-2 p-3.5 rounded-2xl border border-red-200" style={{ background: 'rgba(239,68,68,0.08)' }}>
                        <p className="flex-1 text-sm font-medium text-red-600">
                          {isCreator && isLast ? t('방을 나가면 삭제돼요.', 'Leaving will delete this room.') : t('채팅방을 나가시겠어요?', 'Leave this chat room?')}
                        </p>
                        <button onClick={() => setConfirmLeaveId(null)} className="px-3 py-1.5 text-xs font-bold text-zinc-500 rounded-xl border border-zinc-200" style={{ background: 'rgba(255,255,255,0.65)' }}>{t('취소', 'Cancel')}</button>
                        <button onClick={() => { setConfirmLeaveId(null); onLeaveRoom(room); }} className="px-3 py-1.5 text-xs font-bold text-white rounded-xl" style={{ background: 'rgba(239,68,68,0.85)' }}>{t('나가기', 'Leave')}</button>
                      </div>
                    ) : (
                      <SwipeRow
                        id={room.id}
                        isOpen={openSwipeId === room.id}
                        onSwipe={setOpenSwipeId}
                        onDeleteClick={() => { setOpenSwipeId(null); setConfirmLeaveId(room.id); }}
                      >
                        <div className="flex items-center transition-colors" style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.30)')}
                          onMouseLeave={e => (e.currentTarget.style.background = '')}
                        >
                          <button onClick={() => onOpenRoom(room)} className="flex-1 flex items-center gap-3 px-5 py-3.5 text-left">
                            <div className="relative shrink-0">
                              {room.creatorPhoto
                                ? <img src={room.creatorPhoto} alt={room.creatorName} className="w-12 h-12 rounded-full object-cover" referrerPolicy="no-referrer" />
                                : <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.65)' }}><Users className="w-5 h-5 text-zinc-400" /></div>
                              }
                              <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center" style={{ background: '#8b4a2e' }}>
                                <Users className="w-2.5 h-2.5 text-white" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="font-bold text-zinc-800 text-sm leading-tight truncate">{t(`${room.placeName} 오픈채팅`, `${room.placeName} open chat`)}</p>
                                {isCreator && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 text-white" style={{ background: '#1a2418' }}>{t('방장', 'Host')}</span>
                                )}
                              </div>
                              <p className={cn('text-xs truncate mt-0.5', isUnread ? 'text-zinc-700 font-semibold' : 'text-zinc-400')}>
                                {room.lastMessage ?? (room.description || t(`${room.members?.length ?? 0}명 참여 중`, `${room.members?.length ?? 0} joined`))}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-1.5 shrink-0">
                              {lastMsgAt && <span className="text-[10px] text-zinc-400">{relativeTime(lastMsgAt, lang)}</span>}
                              {isUnread && <span className="w-5 h-5 text-[10px] font-bold rounded-full flex items-center justify-center" style={{ background: '#f4c4b0', color: '#1a2418' }}>N</span>}
                            </div>
                          </button>
                        </div>
                      </SwipeRow>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 gap-4 px-8 text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(0,0,0,0.06)' }}>
                <Leaf className="w-7 h-7 text-zinc-300" />
              </div>
              <p className="font-bold text-zinc-500">{t('아직 채팅이 없어요', 'No chats yet')}</p>
              <p className="text-sm text-zinc-400 leading-relaxed">{t('말차 요청을 수락하면 채팅이 시작돼요!', 'Accept a Matcha request to start chatting!')}</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

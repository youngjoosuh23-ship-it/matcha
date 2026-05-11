import { useState } from 'react';
import { X, Leaf, MessageCircle, Check, XCircle, Clock, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { ChatRequest, Chat, UserProfile } from '../types';
import { cn } from '../lib/utils';

interface RequestsPanelProps {
  incomingRequests: ChatRequest[];
  sentRequests: ChatRequest[];
  activeChats: Chat[];
  myProfile: UserProfile;
  onAccept: (request: ChatRequest) => Promise<void>;
  onDecline: (request: ChatRequest) => void;
  onOpenChat: (chat: Chat) => void;
  onClose: () => void;
}

function timeLeft(expiresAt: any): string {
  if (!expiresAt) return '';
  const ms = (expiresAt.toDate?.() ?? new Date(expiresAt)).getTime() - Date.now();
  if (ms <= 0) return '만료됨';
  const min = Math.floor(ms / 60000);
  return min > 0 ? `${min}분 남음` : '곧 만료';
}

function chatTimeLeft(expiresAt: any): string {
  if (!expiresAt) return '';
  const ms = (expiresAt.toDate?.() ?? new Date(expiresAt)).getTime() - Date.now();
  if (ms <= 0) return '만료됨';
  const hr = Math.floor(ms / 3600000);
  const min = Math.floor((ms % 3600000) / 60000);
  return hr > 0 ? `${hr}시간 ${min}분 남음` : `${min}분 남음`;
}

export default function RequestsPanel({
  incomingRequests,
  sentRequests,
  activeChats,
  myProfile,
  onAccept,
  onDecline,
  onOpenChat,
  onClose,
}: RequestsPanelProps) {
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(new Set());
  const totalCount = incomingRequests.length + activeChats.length;

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

  const statusBadge = (status: ChatRequest['status']) => {
    switch (status) {
      case 'pending':   return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-600">대기중</span>;
      case 'accepted':  return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600">수락됨</span>;
      case 'declined':
      case 'expired':   return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-400">거절됨</span>;
    }
  };

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
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-100">
          <div>
            <h2 className="text-xl font-bold text-zinc-900">알림</h2>
            {totalCount > 0 && (
              <p className="text-xs text-zinc-400 font-medium mt-0.5">{totalCount}개의 알림</p>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-zinc-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Incoming requests */}
          {incomingRequests.length > 0 && (
            <div className="p-4 space-y-3">
              <p className="text-xs font-bold text-zinc-400 px-2 uppercase tracking-wider">받은 말차 요청</p>
              <AnimatePresence>
                {incomingRequests.map((req) => (
                  <motion.div
                    key={req.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 40 }}
                    className="bg-zinc-50 rounded-3xl p-4 space-y-3 border border-zinc-100"
                  >
                    {/* Sender info */}
                    <div className="flex items-center gap-3">
                      <img
                        src={req.fromUserPhoto}
                        alt={req.fromUserName}
                        className="w-12 h-12 rounded-2xl object-cover border-2 border-white shadow-sm"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-zinc-900 text-sm">{req.fromUserName}</p>
                        <p className="text-xs text-zinc-400 font-medium truncate">{req.placeName}</p>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-amber-500">
                        <Clock className="w-3 h-3" />
                        {timeLeft(req.expiresAt)}
                      </div>
                    </div>

                    {/* Message */}
                    {req.message && (
                      <p className="text-sm text-zinc-600 bg-white rounded-2xl px-4 py-3 border border-zinc-100">
                        "{req.message}"
                      </p>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => onDecline(req)}
                        disabled={acceptingId === req.id || acceptedIds.has(req.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-zinc-100 text-zinc-500 font-bold text-sm hover:bg-zinc-200 transition-colors active:scale-95 disabled:opacity-40"
                      >
                        <XCircle className="w-4 h-4" />
                        거절
                      </button>
                      <button
                        onClick={() => handleAccept(req)}
                        disabled={acceptingId === req.id || acceptedIds.has(req.id)}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl font-bold text-sm shadow-lg transition-all active:scale-95 disabled:opacity-60",
                          acceptedIds.has(req.id)
                            ? "bg-emerald-500 text-white"
                            : "bg-zinc-900 text-white hover:bg-zinc-950"
                        )}
                      >
                        {acceptingId === req.id
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : acceptedIds.has(req.id)
                            ? <><Check className="w-4 h-4" /> 수락됨!</>
                            : <><Check className="w-4 h-4" /> 수락하기</>
                        }
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Active chats */}
          {activeChats.length > 0 && (
            <div className="p-4 space-y-3">
              <p className="text-xs font-bold text-zinc-400 px-2 uppercase tracking-wider">진행 중인 채팅</p>
              {activeChats.map((chat) => {
                const otherId = chat.participants.find(p => p !== myProfile.uid) ?? '';
                const otherName = chat.participantNames[otherId] ?? '상대방';
                const otherPhoto = chat.participantPhotos[otherId] ?? '';
                return (
                  <button
                    key={chat.id}
                    onClick={() => onOpenChat(chat)}
                    className="w-full flex items-center gap-3 p-4 bg-zinc-50 rounded-3xl border border-zinc-100 hover:border-zinc-200 transition-colors text-left"
                  >
                    <div className="relative">
                      {otherPhoto ? (
                        <img
                          src={otherPhoto}
                          alt={otherName}
                          className="w-12 h-12 rounded-2xl object-cover border-2 border-white shadow-sm"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-2xl bg-zinc-200 flex items-center justify-center">
                          <Leaf className="w-5 h-5 text-zinc-400" />
                        </div>
                      )}
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-zinc-900 text-sm">{otherName}</p>
                      <p className={cn("text-xs truncate", chat.lastMessage ? 'text-zinc-500' : 'text-zinc-300 italic')}>
                        {chat.lastMessage ?? '아직 메시지가 없어요'}
                      </p>
                    </div>
                    <div className="text-right">
                      <MessageCircle className="w-4 h-4 text-zinc-300 mb-1" />
                      <p className="text-[10px] text-zinc-300 whitespace-nowrap">{chatTimeLeft(chat.expiresAt)}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Sent requests */}
          {sentRequests.filter(r => r.status === 'pending' || r.status === 'accepted').length > 0 && (
            <div className="p-4 space-y-3">
              <p className="text-xs font-bold text-zinc-400 px-2 uppercase tracking-wider">보낸 말차 요청</p>
              {sentRequests.filter(r => r.status === 'pending' || r.status === 'accepted').map((req) => {
                const linkedChat = activeChats.find(c => c.requestId === req.id);
                return (
                  <div key={req.id} className="flex items-center gap-3 p-4 bg-zinc-50 rounded-3xl border border-zinc-100">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-zinc-900 text-sm truncate">{req.placeName}</p>
                        {statusBadge(req.status)}
                      </div>
                      {req.message && (
                        <p className="text-xs text-zinc-400 truncate mt-0.5">"{req.message}"</p>
                      )}
                    </div>
                    {linkedChat ? (
                      <button
                        onClick={() => { onOpenChat(linkedChat); onClose(); }}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-zinc-900 text-white text-xs font-bold rounded-2xl hover:bg-zinc-950 active:scale-95 transition-all"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        채팅 열기
                      </button>
                    ) : (
                      <div className="flex items-center gap-1 text-[10px] font-bold text-zinc-300 shrink-0">
                        <Clock className="w-3 h-3" />
                        {req.status === 'pending' ? timeLeft(req.expiresAt) : ''}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Empty state */}
          {totalCount === 0 && sentRequests.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 gap-4 px-8 text-center">
              <Leaf className="w-12 h-12 text-zinc-200" />
              <p className="font-bold text-zinc-400">아직 알림이 없어요</p>
              <p className="text-sm text-zinc-300">카페에서 체크인하고 사람들에게 말차 요청을 보내보세요!</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// 진행 중인 채팅방을 구독하고, 내 요청이 수락되면 채팅창을 자동으로 연다.
import { useEffect, useRef, useState } from 'react';
import { subscribeToChats } from '../lib/firebase';
import type { Chat, ChatRequest } from '../types';

export function useChats(profileUid: string | undefined, sentRequests: ChatRequest[]) {
  const [activeChats, setActiveChats] = useState<Chat[]>([]);
  const [openChat, setOpenChat] = useState<Chat | null>(null);
  const [pendingFeedback, setPendingFeedback] = useState<Chat | null>(null);
  const pendingRequestIdsRef = useRef<Set<string>>(new Set());
  const seenChatIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!profileUid) return;
    return subscribeToChats(profileUid, setActiveChats);
  }, [profileUid]);

  // 보낸 요청 중 pending인 것들의 ID 추적 (수락됐을 때 자동 오픈용)
  useEffect(() => {
    sentRequests.forEach(req => {
      if (req.status === 'pending') pendingRequestIdsRef.current.add(req.id);
    });
  }, [sentRequests]);

  // 내가 보낸 요청이 수락돼서 새 채팅방이 생기면 자동 오픈
  useEffect(() => {
    for (const chat of activeChats) {
      if (!seenChatIdsRef.current.has(chat.id)) {
        seenChatIdsRef.current.add(chat.id);
        if (chat.requestId && pendingRequestIdsRef.current.has(chat.requestId)) {
          pendingRequestIdsRef.current.delete(chat.requestId);
          setOpenChat(chat);
          break;
        }
      }
    }
  }, [activeChats]);

  return { activeChats, openChat, setOpenChat, pendingFeedback, setPendingFeedback };
}

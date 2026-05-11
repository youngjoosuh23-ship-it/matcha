// 내가 받은 말차 요청(pending)과 내가 보낸 요청 목록을 실시간으로 구독한다.
import { useEffect, useState } from 'react';
import { subscribeToIncomingRequests, subscribeToSentRequests } from '../lib/firebase';
import type { ChatRequest } from '../types';

export function useRequests(profileUid: string | undefined) {
  const [incomingRequests, setIncomingRequests] = useState<ChatRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<ChatRequest[]>([]);

  useEffect(() => {
    if (!profileUid) return;
    const unsubIncoming = subscribeToIncomingRequests(profileUid, setIncomingRequests);
    const unsubSent = subscribeToSentRequests(profileUid, setSentRequests);
    return () => { unsubIncoming(); unsubSent(); };
  }, [profileUid]);

  return { incomingRequests, sentRequests };
}

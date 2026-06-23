import { useEffect, useState } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, Globe } from 'lucide-react';
import logoSvg from './assets/logo.svg';
import { useLanguage } from './lib/i18n';

import { signInWithGoogle, respondToRequest, fetchChatById, endChat, deleteChatRequest, leaveOpenRoom, subscribeToOpenRoomsForUser } from './lib/firebase';
import { useAuth } from './hooks/useAuth';
import { useRequests } from './hooks/useRequests';
import { useChats } from './hooks/useChats';
import type { Chat, ChatRequest, OpenRoom } from './types';

import Header from './components/Header';
import MainMap from './components/MainMap';
import ProfilePanel from './components/ProfilePanel';
import RequestsPanel from './components/RequestsPanel';
import ChatsPanel from './components/ChatsPanel';
import ChatModal from './components/ChatModal';
import OpenChatModal from './components/OpenChatModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import IntroModal from './components/IntroModal';
import PolicyModal, { type PolicyType } from './components/PolicyModal';

const MAPS_API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';
const hasValidKey = Boolean(MAPS_API_KEY) && MAPS_API_KEY !== 'MY_GOOGLE_MAPS_KEY';

export default function App() {
  const { lang, toggleLang } = useLanguage();
  const { user, profile, setProfile, loading } = useAuth();
  const { incomingRequests, sentRequests } = useRequests(profile?.uid);
  const { activeChats, openChat, setOpenChat } = useChats(profile?.uid, sentRequests);
  const [myOpenRooms, setMyOpenRooms] = useState<OpenRoom[]>([]);
  const [activeOpenRoomId, setActiveOpenRoomId] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.uid) return;
    return subscribeToOpenRoomsForUser(profile.uid, (rooms) => {
      setMyOpenRooms(rooms);
      // 방이 삭제되거나 내가 나갔으면 모달 자동 닫기
      setActiveOpenRoomId(prev => prev && rooms.some(r => r.id === prev) ? prev : null);
    });
  }, [profile?.uid]);

  // 항상 Firestore 최신 데이터 사용
  const activeOpenRoom = myOpenRooms.find(r => r.id === activeOpenRoomId) ?? null;

  const [showProfile, setShowProfile] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const [showChats, setShowChats] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [policyModal, setPolicyModal] = useState<PolicyType | null>(null);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeAge, setAgreeAge] = useState(false);
  const allAgreed = agreeTerms && agreePrivacy && agreeAge;
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('matcha_dismissed_requests') ?? '[]')); }
    catch { return new Set(); }
  });

  const handleDismissRequest = async (req: ChatRequest) => {
    const next = new Set(dismissedIds).add(req.id);
    setDismissedIds(next);
    localStorage.setItem('matcha_dismissed_requests', JSON.stringify([...next]));
    try { await deleteChatRequest(req.id); } catch { /* 규칙 차단 시 로컬에서만 숨김 */ }
  };

  const visibleSentRequests = sentRequests.filter(r => !dismissedIds.has(r.id));

  const [lastReadTimes, setLastReadTimes] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    try {
      const stored = localStorage.getItem('matcha_last_read');
      if (stored) Object.assign(init, JSON.parse(stored));
    } catch {}
    return init;
  });

  const markChatRead = (chatId: string) => {
    const now = Date.now();
    setLastReadTimes(prev => {
      const next = { ...prev, [chatId]: now };
      localStorage.setItem('matcha_last_read', JSON.stringify(next));
      return next;
    });
  };

  // 채팅/오픈채팅 열려 있는 동안 새 메시지 오면 자동으로 read time 갱신
  useEffect(() => {
    if (!openChat) return;
    markChatRead(openChat.id);
  }, [openChat?.lastMessageAt]);

  useEffect(() => {
    if (!activeOpenRoomId) return;
    markChatRead(activeOpenRoomId);
  }, [myOpenRooms.find(r => r.id === activeOpenRoomId)?.lastMessageAt]);

  const unreadChatCount = [
    ...activeChats.filter(chat => {
      if (!chat.lastMessageAt) return false;
      const msgTime = chat.lastMessageAt.toDate?.()?.getTime() ?? new Date(chat.lastMessageAt).getTime();
      return msgTime > (lastReadTimes[chat.id] ?? 0);
    }),
    ...myOpenRooms.filter(room => {
      if (!room.lastMessageAt) return false;
      const msgTime = room.lastMessageAt.toDate?.()?.getTime() ?? new Date(room.lastMessageAt).getTime();
      return msgTime > (lastReadTimes[room.id] ?? 0);
    }),
  ].length;

  const handleAccept = async (request: ChatRequest) => {
    if (!profile) return;
    try {
      const chatId = await respondToRequest(request, 'accepted', profile);
      if (chatId) {
        const chat = await fetchChatById(chatId);
        if (chat) { setOpenChat(chat); setShowRequests(false); }
      }
    } catch (err) {
      console.error('handleAccept failed:', err);
    }
  };

  const handleDecline = async (request: ChatRequest) => {
    if (!profile) return;
    await respondToRequest(request, 'declined', profile);
  };

  const handleEndChat = async (chat: Chat) => {
    try { await endChat(chat.id); } catch (e) { console.error(e); }
    if (openChat?.id === chat.id) setOpenChat(null);
  };

  const handleLeaveOpenRoom = async (room: OpenRoom) => {
    if (!profile) return;
    const isLast = (room.members?.length ?? 0) === 1 && room.members?.[0] === profile.uid;
    try { await leaveOpenRoom(room.id, profile.uid, isLast); } catch (e) { console.error(e); }
    setActiveOpenRoomId(null);
  };

  if (!hasValidKey) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 p-6 text-center">
        <div className="max-w-md space-y-6">
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-zinc-100 font-sans">
            <h2 className="text-2xl font-bold text-zinc-900 mb-4">Google Maps API Key Required</h2>
            <p className="text-zinc-600 mb-6">To use Matchat, you need to provide a Google Maps Platform API key.</p>
            <ol className="text-left space-y-3 mb-8 text-sm">
              <li>1. <a href="https://console.cloud.google.com/google/maps-apis/start" target="_blank" rel="noopener" className="text-blue-600 hover:underline">Get an API Key</a></li>
              <li>2. Open <strong>Settings</strong> (⚙️ gear icon)</li>
              <li>3. Select <strong>Secrets</strong></li>
              <li>4. Add <code>GOOGLE_MAPS_PLATFORM_KEY</code> as the name</li>
              <li>5. Paste your key and save</li>
            </ol>
            <div className="p-4 bg-amber-50 rounded-xl text-amber-800 text-xs font-medium">
              The app will rebuild automatically after you add the secret.
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#f5f8ee] gap-4">
        <motion.img
          src={logoSvg}
          alt="Matcha"
          className="w-24 h-24"
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        />
        <p className="text-sm font-medium text-zinc-400">{lang === 'ko' ? '잠깐만요...' : 'Just a moment...'}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="relative flex flex-col items-center justify-center min-h-screen bg-zinc-50 px-6 font-sans">
        <button
          onClick={toggleLang}
          className="absolute top-5 right-5 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-zinc-600 bg-white border border-zinc-200 shadow-sm active:scale-95"
        >
          <Globe className="w-3.5 h-3.5" />
          {lang === 'ko' ? 'EN' : '한국어'}
        </button>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-sm w-full space-y-8 text-center"
        >
          <div className="space-y-2">
            <motion.img
              src={logoSvg}
              alt="Matcha"
              className="w-28 h-28 mx-auto mb-4"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 14 }}
            />
            <h1 className="text-4xl font-bold tracking-tight text-zinc-900">Matcha</h1>
            <p className="text-zinc-500 font-medium italic">
              {lang === 'ko' ? '"말차 한 잔처럼, 깊고 조용한 연결"' : '"A quiet connection, like a cup of matcha"'}
            </p>
          </div>
          <p className="text-zinc-600 text-sm leading-relaxed">
            {lang === 'ko' ? (
              <>카페에서 나누는 느슨한 연결과 말차.<br />지금 내 주변에서 당신과 대화하고 싶은 사람을 찾아보세요.</>
            ) : (
              <>Casual connections over matcha at the cafe.<br />Find someone nearby who wants to talk with you, right now.</>
            )}
          </p>

          {/* 약관 동의 */}
          <div className="bg-white rounded-2xl border border-zinc-200 px-5 py-4 space-y-3 text-left shadow-sm">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={e => setAgreeTerms(e.target.checked)}
                className="w-5 h-5 rounded accent-[#1a2418] cursor-pointer shrink-0"
              />
              <span className="text-sm text-zinc-700">
                {lang === 'ko' ? (
                  <>(필수){' '}
                    <button type="button" onClick={() => setPolicyModal('terms')} className="text-[#1a2418] font-semibold underline underline-offset-2">이용약관</button>
                    에 동의합니다
                  </>
                ) : (
                  <>(Required) I agree to the{' '}
                    <button type="button" onClick={() => setPolicyModal('terms')} className="text-[#1a2418] font-semibold underline underline-offset-2">Terms of Service</button>
                  </>
                )}
              </span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={agreePrivacy}
                onChange={e => setAgreePrivacy(e.target.checked)}
                className="w-5 h-5 rounded accent-[#1a2418] cursor-pointer shrink-0"
              />
              <span className="text-sm text-zinc-700">
                {lang === 'ko' ? (
                  <>(필수){' '}
                    <button type="button" onClick={() => setPolicyModal('privacy')} className="text-[#1a2418] font-semibold underline underline-offset-2">개인정보처리방침</button>
                    에 동의합니다
                  </>
                ) : (
                  <>(Required) I agree to the{' '}
                    <button type="button" onClick={() => setPolicyModal('privacy')} className="text-[#1a2418] font-semibold underline underline-offset-2">Privacy Policy</button>
                  </>
                )}
              </span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={agreeAge}
                onChange={e => setAgreeAge(e.target.checked)}
                className="w-5 h-5 rounded accent-[#1a2418] cursor-pointer shrink-0"
              />
              <span className="text-sm text-zinc-700">
                {lang === 'ko' ? '(필수) 만 14세 이상입니다' : '(Required) I am 14 years or older'}
              </span>
            </label>
          </div>

          <button
            onClick={() => allAgreed && signInWithGoogle()}
            disabled={!allAgreed}
            className="w-full flex items-center justify-center gap-3 bg-white text-zinc-900 border border-zinc-200 py-4 rounded-2xl font-bold shadow-sm transition-all group active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer hover:bg-zinc-50"
          >
            <LogIn className="w-5 h-5 text-zinc-400 group-hover:text-zinc-600" />
            {lang === 'ko' ? 'Google로 시작하기' : 'Continue with Google'}
          </button>
        </motion.div>

        {policyModal && (
          <PolicyModal type={policyModal} onClose={() => setPolicyModal(null)} />
        )}
      </div>
    );
  }

  return (
    <APIProvider apiKey={MAPS_API_KEY} version="weekly">
      <div className="relative h-screen w-full overflow-hidden bg-white text-zinc-900 font-sans">
        <Header
          onProfileClick={() => setShowProfile(true)}
          onLogoClick={() => setShowIntro(true)}
          onRequestsClick={() => { setShowChats(false); setShowRequests(true); }}
          onChatClick={() => { setShowRequests(false); setShowChats(true); }}
          userPhoto={profile?.photoURL}
          requestCount={incomingRequests.length}
          chatCount={unreadChatCount}
        />

        <main className="h-full w-full">
          <MainMap profile={profile} sentRequests={visibleSentRequests} activeChats={activeChats} />
        </main>

        <AnimatePresence>
          {showRequests && profile && (
            <RequestsPanel
              incomingRequests={incomingRequests}
              sentRequests={visibleSentRequests}
              onAccept={handleAccept}
              onDecline={handleDecline}
              onDismiss={handleDismissRequest}
              onClose={() => setShowRequests(false)}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showChats && profile && (
            <ChatsPanel
              activeChats={activeChats}
              openRooms={myOpenRooms}
              myProfile={profile}
              onOpenChat={(chat) => { markChatRead(chat.id); setOpenChat(chat); setShowChats(false); }}
              onOpenRoom={(room) => { markChatRead(room.id); setActiveOpenRoomId(room.id); setShowChats(false); }}
              lastReadTimes={lastReadTimes}
              onEndChat={handleEndChat}
              onLeaveRoom={handleLeaveOpenRoom}
              onClose={() => setShowChats(false)}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showProfile && profile && (
            <ProfilePanel
              profile={profile}
              onClose={() => setShowProfile(false)}
              onUpdate={(updated) => setProfile(updated)}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {openChat && profile && (
            <ChatModal
              chat={openChat}
              myProfile={profile}
              onClose={() => { setOpenChat(null); setShowChats(true); }}
              onEnd={(chat) => { setOpenChat(null); handleEndChat(chat); }}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {activeOpenRoom && profile && (
            <ErrorBoundary key={activeOpenRoom.id}>
              <OpenChatModal
                room={activeOpenRoom}
                myProfile={profile}
                onClose={() => { setActiveOpenRoomId(null); setShowChats(true); }}
                onLeave={() => setActiveOpenRoomId(null)}
              />
            </ErrorBoundary>
          )}
        </AnimatePresence>

        {showIntro && <IntroModal onClose={() => setShowIntro(false)} />}
      </div>
    </APIProvider>
  );
}

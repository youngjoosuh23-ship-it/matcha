import { useState } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, Leaf, LogIn } from 'lucide-react';

import { signInWithGoogle, respondToRequest, fetchChatById } from './lib/firebase';
import { useAuth } from './hooks/useAuth';
import { useRequests } from './hooks/useRequests';
import { useChats } from './hooks/useChats';
import type { ChatRequest } from './types';

import Header from './components/Header';
import MainMap from './components/MainMap';
import ProfilePanel from './components/ProfilePanel';
import RequestsPanel from './components/RequestsPanel';
import ChatModal from './components/ChatModal';
import FeedbackModal from './components/FeedbackModal';

const MAPS_API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';
const hasValidKey = Boolean(MAPS_API_KEY) && MAPS_API_KEY !== 'MY_GOOGLE_MAPS_KEY';

export default function App() {
  const { user, profile, setProfile, loading } = useAuth();
  const { incomingRequests, sentRequests } = useRequests(profile?.uid);
  const { activeChats, openChat, setOpenChat, pendingFeedback, setPendingFeedback } = useChats(profile?.uid, sentRequests);

  const [showProfile, setShowProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const handleAccept = async (request: ChatRequest) => {
    if (!profile) return;
    try {
      const chatId = await respondToRequest(request, 'accepted', profile);
      if (chatId) {
        const chat = await fetchChatById(chatId);
        if (chat) {
          setShowNotifications(false);
          setOpenChat(chat);
        }
      }
    } catch (err) {
      console.error('handleAccept failed:', err);
    }
  };

  const handleDecline = async (request: ChatRequest) => {
    if (!profile) return;
    await respondToRequest(request, 'declined', profile);
  };

  const notificationCount = incomingRequests.length + activeChats.length;

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
      <div className="flex items-center justify-center min-h-screen bg-zinc-50">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 px-6 font-sans">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-sm w-full space-y-8 text-center"
        >
          <div className="space-y-2">
            <div className="w-16 h-16 bg-green-800 rounded-2xl flex items-center justify-center mx-auto mb-6 transform rotate-3 shadow-lg">
              <Leaf className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-zinc-900">Matchat</h1>
            <p className="text-zinc-500 font-medium italic">"말차 한 잔처럼, 깊고 조용한 연결"</p>
          </div>
          <p className="text-zinc-600 text-sm leading-relaxed">
            카페에서 나누는 느슨한 연결과 말차.<br />
            지금 내 주변에서 당신과 대화하고 싶은 사람을 찾아보세요.
          </p>
          <button
            onClick={() => signInWithGoogle()}
            className="w-full flex items-center justify-center gap-3 bg-white text-zinc-900 border border-zinc-200 py-4 rounded-2xl font-bold shadow-sm hover:bg-zinc-50 transition-all group active:scale-95 cursor-pointer"
          >
            <LogIn className="w-5 h-5 text-zinc-400 group-hover:text-zinc-600" />
            Google로 시작하기
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <APIProvider apiKey={MAPS_API_KEY} version="weekly">
      <div className="relative h-screen w-full overflow-hidden bg-white text-zinc-900 font-sans">
        <Header
          onProfileClick={() => setShowProfile(true)}
          onNotificationsClick={() => setShowNotifications(true)}
          onChatClick={() => {
            if (activeChats.length === 1) setOpenChat(activeChats[0]);
            else if (activeChats.length > 1) setShowNotifications(true);
          }}
          userPhoto={profile?.photoURL}
          notificationCount={notificationCount}
          activeChatCount={activeChats.length}
        />

        <main className="h-full w-full">
          <MainMap profile={profile} />
        </main>

        <AnimatePresence>
          {showNotifications && profile && (
            <RequestsPanel
              incomingRequests={incomingRequests}
              sentRequests={sentRequests}
              activeChats={activeChats}
              myProfile={profile}
              onAccept={handleAccept}
              onDecline={handleDecline}
              onOpenChat={(chat) => { setOpenChat(chat); setShowNotifications(false); }}
              onClose={() => setShowNotifications(false)}
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
              onClose={() => setOpenChat(null)}
              onEnd={() => { setOpenChat(null); setPendingFeedback(openChat); }}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {pendingFeedback && profile && (
            <FeedbackModal
              chat={pendingFeedback}
              myProfile={profile}
              onDone={() => setPendingFeedback(null)}
            />
          )}
        </AnimatePresence>
      </div>
    </APIProvider>
  );
}

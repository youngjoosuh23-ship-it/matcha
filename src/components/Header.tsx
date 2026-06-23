import { User as UserIcon, LogOut, Bell, MessageCircle } from 'lucide-react';
import { auth } from '../lib/firebase';
import { useLanguage } from '../lib/i18n';
import { motion } from 'motion/react';
import logoSvg from '../assets/logo.svg';

interface HeaderProps {
  onProfileClick: () => void;
  onRequestsClick: () => void;
  onChatClick: () => void;
  onLogoClick: () => void;
  userPhoto?: string;
  requestCount?: number;
  chatCount?: number;
}

const glassBtn = 'backdrop-blur-[20px] border border-white/70 text-zinc-800 hover:bg-white/80 transition-all';

export default function Header({ onProfileClick, onRequestsClick, onChatClick, onLogoClick, userPhoto, requestCount = 0, chatCount = 0 }: HeaderProps) {
  const { lang, toggleLang } = useLanguage();
  return (
    <header className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={onLogoClick}
          className={`flex items-center gap-2.5 ${glassBtn} px-3 py-2 rounded-full shadow-lg pointer-events-auto cursor-pointer active:scale-95`}
          style={{ background: 'rgba(255,255,255,0.72)' }}
        >
          <img src={logoSvg} alt="Matcha" className="w-7 h-7" />
          <span className="font-bold tracking-tight text-sm text-zinc-800">Matcha</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2 pointer-events-auto"
        >
          <button
            onClick={onRequestsClick}
            className={`relative w-10 h-10 rounded-full flex items-center justify-center shadow-lg outline-none active:scale-95 ${glassBtn}`}
          style={{ background: 'rgba(255,255,255,0.72)' }}
          >
            <Bell className="w-4 h-4" />
            {requestCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#f4c4b0] text-[#1a2418] text-[10px] font-bold rounded-full flex items-center justify-center">
                {requestCount > 9 ? '9+' : requestCount}
              </span>
            )}
          </button>

          <button
            onClick={onChatClick}
            className={`relative w-10 h-10 rounded-full flex items-center justify-center shadow-lg outline-none active:scale-95 ${glassBtn}`}
          style={{ background: 'rgba(255,255,255,0.72)' }}
          >
            <MessageCircle className="w-4 h-4" />
            {chatCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#8fb570] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {chatCount > 9 ? '9+' : chatCount}
              </span>
            )}
          </button>

          <button
            onClick={toggleLang}
            className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg outline-none active:scale-95 text-[10px] font-bold ${glassBtn}`}
            style={{ background: 'rgba(255,255,255,0.72)' }}
            title="Switch language"
          >
            {lang === 'ko' ? 'EN' : '한'}
          </button>

          <button
            onClick={onProfileClick}
            className={`w-10 h-10 rounded-full overflow-hidden shadow-lg outline-none active:scale-95 border border-white/20`}
            style={{ background: 'conic-gradient(from 120deg, #8fb570, #c8dfb1, #f4c4b0, #c9b8e8, #8fb570)', padding: 2 }}
          >
            <div className="w-full h-full rounded-full overflow-hidden">
              {userPhoto ? (
                <img src={userPhoto} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-white/80 text-zinc-600">
                  <UserIcon className="w-4 h-4" />
                </div>
              )}
            </div>
          </button>

          <button
            onClick={() => auth.signOut()}
            className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg outline-none active:scale-95 ${glassBtn}`}
          style={{ background: 'rgba(255,255,255,0.72)' }}
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </motion.div>
      </div>
    </header>
  );
}

import { User as UserIcon, LogOut, Bell, MessageCircle } from 'lucide-react';
import { auth } from '../lib/firebase';
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

export default function Header({ onProfileClick, onRequestsClick, onChatClick, onLogoClick, userPhoto, requestCount = 0, chatCount = 0 }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={onLogoClick}
          className="flex items-center gap-2 bg-white/90 backdrop-blur-md px-3 py-2 rounded-2xl shadow-sm border border-zinc-100 pointer-events-auto cursor-pointer hover:bg-white hover:shadow-md transition-all active:scale-95"
        >
          <img src={logoSvg} alt="Matcha" className="w-8 h-8" />
          <span className="font-bold tracking-tight text-sm">Matcha</span>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2 pointer-events-auto"
        >
          <button
            onClick={onRequestsClick}
            className="relative w-10 h-10 rounded-2xl flex items-center justify-center bg-white shadow-sm border border-zinc-100 text-zinc-400 hover:text-zinc-700 transition-all outline-none"
          >
            <Bell className="w-4 h-4" />
            {requestCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border border-white">
                {requestCount > 9 ? '9+' : requestCount}
              </span>
            )}
          </button>

          <button
            onClick={onChatClick}
            className="relative w-10 h-10 rounded-2xl flex items-center justify-center bg-white shadow-sm border border-zinc-100 text-zinc-400 hover:text-zinc-700 transition-all outline-none"
          >
            <MessageCircle className="w-4 h-4" />
            {chatCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border border-white">
                {chatCount > 9 ? '9+' : chatCount}
              </span>
            )}
          </button>

          <button
            onClick={onProfileClick}
            className="w-10 h-10 rounded-2xl overflow-hidden bg-white shadow-sm border border-zinc-100 hover:ring-2 ring-zinc-900/5 transition-all outline-none"
          >
            {userPhoto ? (
              <img src={userPhoto} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-zinc-50 text-zinc-400">
                <UserIcon className="w-5 h-5" />
              </div>
            )}
          </button>
          
          <button
            onClick={() => auth.signOut()}
            className="w-10 h-10 rounded-2xl flex items-center justify-center bg-white shadow-sm border border-zinc-100 text-zinc-400 hover:text-zinc-600 transition-all outline-none"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </motion.div>
      </div>
    </header>
  );
}

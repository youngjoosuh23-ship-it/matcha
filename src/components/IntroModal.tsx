import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import logoSvg from '../assets/logo.svg';
import { panelBg, cardBg } from '../design/tokens';

interface IntroModalProps {
  onClose: () => void;
}

const FEATURES = [
  { emoji: '📍', title: '지금, 여기 사람들', desc: '체크인하면 같은 공간에 있는 사람들의 프로필이 보여요.' },
  { emoji: '💬', title: '오픈 채팅 요청', desc: '마음에 드는 사람에게 바로 채팅을 신청해보세요.' },
  { emoji: '🍁', title: '이벤트', desc: '주변에서 열리는 이벤트에 참여하거나 직접 만들어보세요.' },
  { emoji: '🔥', title: '핫플 현황', desc: '지금 가장 활발한 장소를 실시간으로 확인해요.' },
];

export default function IntroModal({ onClose }: IntroModalProps) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/15 backdrop-blur-[2px] font-sans"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ type: 'spring', damping: 26, stiffness: 280 }}
          className="w-full sm:max-w-sm rounded-t-[40px] sm:rounded-[40px] overflow-hidden border border-white/60 shadow-2xl"
          style={panelBg}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative px-6 pt-8 pb-8 flex flex-col items-center gap-3">
            <button
              onClick={onClose}
              className="absolute top-5 right-5 w-9 h-9 rounded-full flex items-center justify-center text-zinc-600 hover:text-zinc-900 transition-colors"
              style={{ background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(0,0,0,0.08)' }}
            >
              <X className="w-4 h-4" />
            </button>
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center shadow-xl"
              style={{ background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(255,255,255,0.8)' }}
            >
              <img src={logoSvg} alt="Matcha" className="w-14 h-14 drop-shadow-lg" />
            </div>
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-bold text-zinc-800 tracking-tight">Matcha</h2>
              <p className="text-sm text-zinc-500 font-medium">장소 기반 오픈 네트워킹</p>
            </div>
          </div>

          {/* Divider */}
          <div className="mx-6 h-px" style={{ background: 'rgba(0,0,0,0.08)' }} />

          {/* Features */}
          <div className="px-6 py-6 space-y-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex items-center gap-4">
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0"
                  style={cardBg as React.CSSProperties}
                >
                  {f.emoji}
                </div>
                <div className="space-y-0.5">
                  <p className="font-bold text-sm text-zinc-800">{f.title}</p>
                  <p className="text-xs text-zinc-500 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-6 pb-8 pt-2">
            <button
              onClick={onClose}
              className="w-full py-4 rounded-2xl font-bold text-white active:scale-95 transition-all"
              style={{ background: '#1a2418', boxShadow: '0 8px 24px -8px rgba(0,0,0,0.3)' }}
            >
              시작하기
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

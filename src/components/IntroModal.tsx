import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import logoSvg from '../assets/logo.svg';

interface IntroModalProps {
  onClose: () => void;
}

const FEATURES = [
  { emoji: '📍', title: '위치 기반 만남', desc: '카페나 어디서든 체크인하면 주변 사람들이 보여요.' },
  { emoji: '🍵', title: '말차 요청', desc: '마음에 드는 사람에게 대화 요청을 보내보세요.' },
  { emoji: '💬', title: '실시간 채팅', desc: '사진, 이모티콘과 함께 대화해요.' },
  { emoji: '⭐', title: '리뷰 시스템', desc: '대화 후 카페와 상대방에 대한 리뷰를 남겨요.' },
];

export default function IntroModal({ onClose }: IntroModalProps) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-zinc-950/50 backdrop-blur-sm font-sans"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ type: 'spring', damping: 26, stiffness: 280 }}
          className="w-full sm:max-w-sm bg-white rounded-t-[40px] sm:rounded-[40px] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative bg-[#f0f6e4] px-6 pt-8 pb-10 flex flex-col items-center gap-3">
            <button
              onClick={onClose}
              className="absolute top-5 right-5 w-9 h-9 bg-white/60 rounded-full flex items-center justify-center text-zinc-500 hover:bg-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <img src={logoSvg} alt="Matcha" className="w-20 h-20 drop-shadow-md" />
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Matcha</h2>
              <p className="text-sm text-zinc-500 font-medium italic">"말차 한 잔처럼, 깊고 조용한 연결"</p>
            </div>
          </div>

          {/* Features */}
          <div className="px-6 py-6 space-y-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex items-start gap-4">
                <div className="w-10 h-10 bg-zinc-50 rounded-2xl flex items-center justify-center text-xl shrink-0 border border-zinc-100">
                  {f.emoji}
                </div>
                <div className="space-y-0.5 pt-1">
                  <p className="font-bold text-sm text-zinc-900">{f.title}</p>
                  <p className="text-xs text-zinc-400 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-6 pb-8">
            <button
              onClick={onClose}
              className="w-full py-4 rounded-2xl bg-zinc-900 text-white font-bold hover:bg-zinc-950 active:scale-95 transition-all"
            >
              시작하기
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

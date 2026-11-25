import type { CSSProperties, ReactNode } from 'react';
import { motion } from 'motion/react';
import { panelBg } from '../design/tokens';
import { cn } from '../lib/utils';

interface SheetProps {
  onClose: () => void;            // 바깥(어두운 배경)을 누르면 호출
  children: ReactNode;
  z?: string;                     // 겹치는 순서 (Tailwind z 클래스) — 화면마다 다르므로 그대로 받음
  absolute?: boolean;             // 지도 화면 안에 띄울 때 (기본은 화면 전체 기준 fixed)
  center?: boolean;               // 넓은 화면에서는 가운데 카드로
  className?: string;             // 패널 안쪽 여백·크기
  handle?: string | false;        // 손잡이 막대 추가 클래스, false면 없음
  style?: CSSProperties;
  role?: string;
}

// 아래에서 올라오는 시트의 공통 겉틀: 어두운 배경 + 올라오는 패널 + 손잡이
export default function Sheet({ onClose, children, z = 'z-[60]', absolute, center, className, handle = '', style, role }: SheetProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(absolute ? 'absolute' : 'fixed', 'inset-0 flex items-end justify-center bg-black/15 backdrop-blur-[2px] font-sans', z, center && 'sm:items-center')}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        role={role}
        aria-modal={role ? true : undefined}
        className={cn('w-full sm:max-w-sm rounded-t-[40px] border border-white/60 shadow-2xl', center && 'sm:rounded-[40px]', className)}
        style={{ ...panelBg, ...style }}
        onClick={(e) => e.stopPropagation()}
      >
        {handle !== false && <div className={cn('w-10 h-1 rounded-full mx-auto', handle)} style={{ background: 'rgba(0,0,0,0.12)' }} />}
        {children}
      </motion.div>
    </motion.div>
  );
}

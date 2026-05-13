// ─── Panels & Modals ───────────────────────────────────────────────────────
// 바텀시트, 사이드패널, 모달의 배경 (지도가 뒤로 비침)
export const panelBg = {
  background: 'rgba(255,255,255,0.62)',
  backdropFilter: 'blur(40px) saturate(1.6)',
  WebkitBackdropFilter: 'blur(40px) saturate(1.6)',
} as const;

// 패널 내부 카드/리스트 아이템
export const cardBg = {
  background: 'rgba(255,255,255,0.82)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
} as const;

// ─── Inputs ────────────────────────────────────────────────────────────────
export const inputStyle = {
  background: 'rgba(255,255,255,0.65)',
  border: '1px solid rgba(0,0,0,0.08)',
} as const;

// ─── Buttons ───────────────────────────────────────────────────────────────
// 닫기, 보조 액션 버튼 (글래스)
export const btnGlass = {
  background: 'rgba(255,255,255,0.65)',
  border: '1px solid rgba(0,0,0,0.08)',
} as const;

// 지도 위 FAB / 헤더 버튼
export const btnMapFab = {
  background: 'rgba(255,255,255,0.72)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.8)',
} as const;

// 주요 CTA 버튼 (체크인, 전송, 저장 등)
export const btnPrimary = {
  background: '#1a2418',
  boxShadow: '0 8px 24px -8px rgba(0,0,0,0.3)',
} as const;

// ─── Misc ──────────────────────────────────────────────────────────────────
// 드래그 핸들
export const dragHandle = { background: 'rgba(0,0,0,0.12)' } as const;

// 구분선 (패널 헤더 아래 등)
export const dividerStyle = { borderBottom: '1px solid rgba(0,0,0,0.06)' } as const;

// 전체화면 모달 배경 (채팅 등)
export const fullscreenBg = {
  background: 'rgba(255,255,255,0.88)',
  backdropFilter: 'blur(40px)',
  WebkitBackdropFilter: 'blur(40px)',
} as const;

// 채팅 헤더 / 입력바
export const chatBarBg = {
  background: 'rgba(255,255,255,0.72)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
} as const;

// ─── Colors ────────────────────────────────────────────────────────────────
export const colors = {
  brand:    '#1a2418',   // 다크 그린 (CTA, 배지)
  matcha:   '#8fb570',   // 연두 (체크인, 수락, 온라인)
  peach:    '#f4c4b0',   // 피치 (요청, 이벤트 뱃지)
  lavender: '#c9b8e8',   // 라벤더
  matchaDark: '#2d5a1b', // 마차 다크 텍스트
  peachDark:  '#8b4a2e', // 피치 다크 텍스트
} as const;

// ─── Overlay (Tailwind className) ──────────────────────────────────────────
// 패널/모달 뒤 딤 처리: className="bg-black/15 backdrop-blur-[2px]"
export const overlayClass = 'bg-black/15 backdrop-blur-[2px]';

// 패널 테두리
export const panelBorderClass = 'border border-white/60';
export const cardBorderClass  = 'border border-white/60';

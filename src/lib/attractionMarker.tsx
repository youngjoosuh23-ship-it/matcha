import React from 'react';

export type CountryRegion = 'KR' | 'JP' | 'CN' | 'SEA' | 'IN' | 'ME' | 'EU' | 'DEFAULT';

export function detectRegion(lat: number, lng: number): CountryRegion {
  if (lat >= 33 && lat <= 39 && lng >= 124 && lng <= 132) return 'KR';
  if (lat >= 30 && lat <= 46 && lng >= 129 && lng <= 146) return 'JP';
  if (lat >= 0  && lat <= 28 && lng >= 97  && lng <= 115) return 'SEA';
  if (lat >= 8  && lat <= 38 && lng >= 68  && lng <= 97)  return 'IN';
  if (lat >= 14 && lat <= 45 && lng >= 30  && lng <= 72)  return 'ME';
  if (lat >= 18 && lat <= 54 && lng >= 73  && lng <= 135) return 'CN';
  if (lat >= 35 && lat <= 72 && lng >= -12 && lng <= 45)  return 'EU';
  return 'DEFAULT';
}

interface MarkerProps {
  isHistoric: boolean;
}

// 한국 — 한옥
function HanokMarker({ isHistoric }: MarkerProps) {
  const roofColor   = isHistoric ? '#5a3e28' : '#2e6ea6';
  const bodyColor   = isHistoric ? '#e8b87a' : '#f0f0f0';
  const columnColor = isHistoric ? '#b5723a' : '#2e6ea6';
  const doorColor   = isHistoric ? '#8b4513' : '#2e6ea6';
  return (
    <svg width="36" height="38" viewBox="0 0 36 38" fill="none">
      <path d="M18 4 L32 17 L4 17 Z" fill={roofColor} />
      <path d="M4 17 Q1 16 0 18"  stroke={roofColor} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M32 17 Q35 16 36 18" stroke={roofColor} strokeWidth="1.8" strokeLinecap="round" />
      <rect x="14" y="3" width="8" height="2.5" rx="1" fill="#c0392b" />
      <rect x="7" y="17" width="22" height="14" fill={bodyColor} />
      <rect x="8"    y="17" width="2.5" height="14" fill={columnColor} />
      <rect x="25.5" y="17" width="2.5" height="14" fill={columnColor} />
      <path d="M15 24 L15 31 L21 31 L21 24 Q21 21 18 21 Q15 21 15 24Z" fill={doorColor} />
      <rect x="4" y="31" width="28" height="3" rx="1" fill="#c4a882" />
    </svg>
  );
}

// 일본 — 도리이
function ToriiMarker({ isHistoric }: MarkerProps) {
  const color = isHistoric ? '#c0392b' : '#e74c3c';
  return (
    <svg width="36" height="38" viewBox="0 0 36 38" fill="none">
      <path d="M0 10 Q18 5 36 10" stroke={color} strokeWidth="4" strokeLinecap="round" />
      <line x1="5" y1="16" x2="31" y2="16" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="9"  y1="9"  x2="9"  y2="36" stroke={color} strokeWidth="3.5" strokeLinecap="round" />
      <line x1="27" y1="9"  x2="27" y2="36" stroke={color} strokeWidth="3.5" strokeLinecap="round" />
      <line x1="2" y1="36" x2="34" y2="36" stroke="#8b4513" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// 중국/동남아 — 파고다 (3단 탑)
function PagodaMarker({ isHistoric }: MarkerProps) {
  const roofColor = isHistoric ? '#8b2500' : '#b5451b';
  const bodyColor = isHistoric ? '#f5deb3' : '#fdebd0';
  return (
    <svg width="36" height="38" viewBox="0 0 36 38" fill="none">
      {/* 꼭대기 */}
      <line x1="18" y1="2" x2="18" y2="8" stroke={roofColor} strokeWidth="2" strokeLinecap="round" />
      {/* 1단 지붕 */}
      <path d="M18 8 L26 13 L10 13 Z" fill={roofColor} />
      <path d="M10 13 Q8 12 7 14"  stroke={roofColor} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M26 13 Q28 12 29 14" stroke={roofColor} strokeWidth="1.5" strokeLinecap="round" />
      <rect x="13" y="13" width="10" height="5" fill={bodyColor} />
      {/* 2단 지붕 */}
      <path d="M18 18 L28 23 L8 23 Z" fill={roofColor} />
      <path d="M8  23 Q6  22 5  24"  stroke={roofColor} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M28 23 Q30 22 31 24"  stroke={roofColor} strokeWidth="1.5" strokeLinecap="round" />
      <rect x="11" y="23" width="14" height="6" fill={bodyColor} />
      {/* 기단 */}
      <rect x="7" y="29" width="22" height="3" rx="1" fill="#c4a882" />
      <rect x="4" y="32" width="28" height="2.5" rx="1" fill="#b8a090" />
    </svg>
  );
}

// 유럽 — 고딕 첨탑 타워
function GothicTowerMarker({ isHistoric }: MarkerProps) {
  const stoneColor  = isHistoric ? '#6d7a8c' : '#8394a8';
  const accentColor = isHistoric ? '#4a5568' : '#5a6a80';
  return (
    <svg width="36" height="38" viewBox="0 0 36 38" fill="none">
      {/* 첨탑 */}
      <path d="M18 2 L22 12 L14 12 Z" fill={accentColor} />
      {/* 타워 몸체 */}
      <rect x="12" y="12" width="12" height="20" fill={stoneColor} />
      {/* 고딕 창문 */}
      <path d="M16 16 L16 22 L20 22 L20 16 Q20 13 18 13 Q16 13 16 16Z" fill={accentColor} />
      {/* 측면 작은 탑 */}
      <rect x="8"  y="18" width="4" height="14" fill={stoneColor} />
      <path d="M8 18 L10 14 L12 18 Z" fill={accentColor} />
      <rect x="24" y="18" width="4" height="14" fill={stoneColor} />
      <path d="M24 18 L26 14 L28 18 Z" fill={accentColor} />
      {/* 기단 */}
      <rect x="6" y="32" width="24" height="3" rx="1" fill="#b8b0a0" />
    </svg>
  );
}

// 중동 — 모스크 돔 + 미나렛
function MosqueMarker({ isHistoric }: MarkerProps) {
  const domeColor    = isHistoric ? '#2e7d6e' : '#3d9e8c';
  const minaretColor = isHistoric ? '#4a8c7c' : '#5aaa99';
  return (
    <svg width="36" height="38" viewBox="0 0 36 38" fill="none">
      {/* 미나렛 */}
      <rect x="2" y="14" width="5" height="18" fill={minaretColor} />
      <path d="M2 14 L4.5 10 L7 14 Z" fill={minaretColor} />
      <circle cx="4.5" cy="9" r="1.5" fill="#f0c040" />
      {/* 돔 */}
      <path d="M9 22 Q9 9 18 9 Q27 9 27 22 Z" fill={domeColor} />
      {/* 초승달 */}
      <path d="M16 5 Q19 3 21 6 Q17 5 16 8 Q13 6 16 5Z" fill="#f0c040" />
      {/* 몸체 */}
      <rect x="9" y="22" width="18" height="10" fill={domeColor} />
      {/* 문 */}
      <path d="M15 25 L15 32 L21 32 L21 25 Q21 22 18 22 Q15 22 15 25Z" fill="#1a5c4e" />
      {/* 기단 */}
      <rect x="5" y="32" width="26" height="3" rx="1" fill="#c4b090" />
    </svg>
  );
}

// 인도 — 고푸람 사원
function TempleMarker({ isHistoric }: MarkerProps) {
  const baseColor   = isHistoric ? '#c8772a' : '#e8952e';
  const accentColor = isHistoric ? '#8b4513' : '#a05520';
  return (
    <svg width="36" height="38" viewBox="0 0 36 38" fill="none">
      {/* 칼라샤 (꼭대기 장식) */}
      <circle cx="18" cy="4" r="2" fill="#f0c040" />
      <line x1="18" y1="6" x2="18" y2="9" stroke={accentColor} strokeWidth="1.5" />
      {/* 1단 */}
      <rect x="14" y="9"  width="8"  height="4"  fill={baseColor} />
      {/* 2단 */}
      <rect x="11" y="13" width="14" height="4"  fill={baseColor} />
      {/* 3단 */}
      <rect x="8"  y="17" width="20" height="4"  fill={baseColor} />
      {/* 4단 */}
      <rect x="6"  y="21" width="24" height="4"  fill={baseColor} />
      {/* 가로 줄 장식 */}
      <line x1="6"  y1="13" x2="30" y2="13" stroke={accentColor} strokeWidth="0.8" />
      <line x1="6"  y1="17" x2="30" y2="17" stroke={accentColor} strokeWidth="0.8" />
      <line x1="6"  y1="21" x2="30" y2="21" stroke={accentColor} strokeWidth="0.8" />
      {/* 문 */}
      <path d="M15 26 L15 32 L21 32 L21 26 Q21 23 18 23 Q15 23 15 26Z" fill={accentColor} />
      {/* 기단 */}
      <rect x="4" y="32" width="28" height="3" rx="1" fill="#c4a882" />
    </svg>
  );
}

// 기본 — 랜드마크 핀
function DefaultMarker({ isHistoric }: MarkerProps) {
  const color = isHistoric ? '#8b4513' : '#4a90d9';
  return (
    <svg width="32" height="38" viewBox="0 0 32 38" fill="none">
      <circle cx="16" cy="14" r="12" fill={color} />
      <circle cx="16" cy="14" r="7" fill="white" fillOpacity="0.35" />
      <path d="M16 26 L10 36 L16 32 L22 36 Z" fill={color} />
      {isHistoric
        ? <path d="M11 14 L14 17 L21 10" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        : <circle cx="16" cy="14" r="3.5" fill="white" />
      }
    </svg>
  );
}

export function AttractionMarker({ region, isHistoric }: { region: CountryRegion; isHistoric: boolean }) {
  switch (region) {
    case 'KR':      return <HanokMarker isHistoric={isHistoric} />;
    case 'JP':      return <ToriiMarker isHistoric={isHistoric} />;
    case 'CN':
    case 'SEA':     return <PagodaMarker isHistoric={isHistoric} />;
    case 'EU':      return <GothicTowerMarker isHistoric={isHistoric} />;
    case 'ME':      return <MosqueMarker isHistoric={isHistoric} />;
    case 'IN':      return <TempleMarker isHistoric={isHistoric} />;
    default:        return <DefaultMarker isHistoric={isHistoric} />;
  }
}

// Matcha ghost-in-bowl logo, also reusable in different sizes
const MatchaLogo = ({ size = 120 }) => (
  <svg width={size} height={size} viewBox="0 0 120 120" fill="none">
    <defs>
      <radialGradient id="bowlGlow" cx="50%" cy="40%" r="55%">
        <stop offset="0%" stopColor="#c8dfb1"/>
        <stop offset="60%" stopColor="#8fb570"/>
        <stop offset="100%" stopColor="#6b9b5f"/>
      </radialGradient>
      <linearGradient id="matchaLiquid" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#4a7c3a"/>
        <stop offset="100%" stopColor="#2a4a32"/>
      </linearGradient>
    </defs>
    {/* outer halo */}
    <circle cx="60" cy="60" r="58" fill="url(#bowlGlow)" opacity="0.95"/>
    {/* bowl */}
    <path d="M30 62 Q60 92 90 62 L86 78 Q60 100 34 78 Z" fill="url(#matchaLiquid)"/>
    {/* foam highlights */}
    <ellipse cx="48" cy="64" rx="2" ry="1" fill="#a8c98a" opacity="0.7"/>
    <ellipse cx="72" cy="68" rx="1.5" ry="0.8" fill="#a8c98a" opacity="0.7"/>
    <ellipse cx="60" cy="72" rx="2" ry="1" fill="#a8c98a" opacity="0.6"/>
    {/* whisk */}
    <rect x="74" y="36" width="3.4" height="32" rx="1.6" fill="#c89a5b" transform="rotate(18 75 52)"/>
    <path d="M73 60 Q78 64 84 60 L82 70 Q78 72 74 70 Z" fill="#d4a868"/>
    {/* ghost */}
    <g transform="translate(38 30)">
      <path d="M0 14 Q0 0 14 0 Q28 0 28 14 L28 30 Q24 26 22 30 Q19 26 16 30 Q13 26 10 30 Q7 26 4 30 Q2 26 0 30 Z" fill="#f8f5ee"/>
      {/* eyes */}
      <circle cx="9" cy="14" r="1.6" fill="#2a3a28"/>
      <circle cx="19" cy="14" r="1.6" fill="#2a3a28"/>
      {/* cheek */}
      <ellipse cx="6" cy="19" rx="2.2" ry="1.4" fill="#f4c4b0" opacity="0.7"/>
      <ellipse cx="22" cy="19" rx="2.2" ry="1.4" fill="#f4c4b0" opacity="0.7"/>
    </g>
    {/* sparkles */}
    <g fill="#fff" opacity="0.95">
      <path d="M84 22 l1 4 l4 1 l-4 1 l-1 4 l-1-4 l-4-1 l4-1 z"/>
      <path d="M92 36 l0.7 2.4 l2.4 0.7 l-2.4 0.7 l-0.7 2.4 l-0.7-2.4 l-2.4-0.7 l2.4-0.7 z"/>
      <path d="M28 28 l0.6 2 l2 0.6 l-2 0.6 l-0.6 2 l-0.6-2 l-2-0.6 l2-0.6 z"/>
    </g>
    {/* polka dots */}
    <circle cx="44" cy="78" r="1" fill="#a8c98a" opacity="0.55"/>
    <circle cx="78" cy="80" r="1" fill="#a8c98a" opacity="0.55"/>
    <circle cx="56" cy="86" r="1" fill="#a8c98a" opacity="0.55"/>
    <circle cx="68" cy="84" r="1" fill="#a8c98a" opacity="0.55"/>
  </svg>
);

window.MatchaLogo = MatchaLogo;

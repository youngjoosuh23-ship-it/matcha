// ===== Screen 02: Map (main) =====
function MapScreen() {
  // Simulated nearby people pins
  const pins = [
    { x: 28, y: 38, color: '#f4c4b0', label: '지수', tag: 'Design' },
    { x: 58, y: 30, color: '#8fb570', label: '민재', tag: 'IT', hot: true },
    { x: 72, y: 56, color: '#c9b8e8', label: '하은', tag: 'Marketing' },
    { x: 42, y: 68, color: '#f4c4b0', label: '준호', tag: 'Finance' },
    { x: 22, y: 70, color: '#8fb570', label: '서연', tag: 'IT' },
    { x: 80, y: 80, color: '#c9b8e8', label: '도윤', tag: 'Other' }
  ];

  return (
    <div className="screen">
      {/* Faux map surface */}
      <div className="map-tile"></div>
      {/* Roads layer */}
      <svg className="map-roads" viewBox="0 0 390 760" preserveAspectRatio="none">
        <g stroke="#c8bfa8" strokeWidth="14" fill="none" strokeLinecap="round" opacity="0.5">
          <path d="M-20 220 Q200 180 410 240"/>
          <path d="M-20 500 Q200 540 410 480"/>
          <path d="M180 -20 Q200 380 220 780"/>
        </g>
        <g stroke="#fefefe" strokeWidth="6" fill="none" strokeLinecap="round">
          <path d="M-20 220 Q200 180 410 240"/>
          <path d="M-20 500 Q200 540 410 480"/>
          <path d="M180 -20 Q200 380 220 780"/>
        </g>
        <g stroke="#b8af98" strokeWidth="3" fill="none" opacity="0.6">
          <path d="M40 60 L380 320"/>
          <path d="M20 700 L300 420"/>
          <path d="M120 730 Q240 600 380 660"/>
        </g>
      </svg>
      {/* dim overlay to make glass pop */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(20,40,25,0.18) 0%, rgba(20,40,25,0.05) 30%, rgba(20,40,25,0.08) 70%, rgba(20,40,25,0.32) 100%)' }}></div>

      <div className="statusbar" style={{ position: 'absolute', top: 0, left: 0, right: 0, color: '#1a2418' }}>
        <span>9:41</span>
        <div className="sb-icons" style={{ filter: 'invert(1)' }}>
          <svg width="18" height="11" viewBox="0 0 18 11" fill="white"><path d="M1 7v3h2V7zM5 5v5h2V5zM9 3v7h2V3zM13 1v9h2V1z"/></svg>
          <svg width="16" height="11" viewBox="0 0 16 11" fill="none" stroke="white" strokeWidth="1.2"><path d="M1 4a10 10 0 0 1 14 0M3 6.5a7 7 0 0 1 10 0M5.5 9a4 4 0 0 1 5 0"/></svg>
          <svg width="24" height="11" viewBox="0 0 24 11" fill="none" stroke="white" strokeWidth="1"><rect x="1" y="1" width="20" height="9" rx="2"/><rect x="3" y="3" width="16" height="5" rx="1" fill="white"/></svg>
        </div>
      </div>

      {/* Top bar */}
      <div style={{ position: 'absolute', top: 50, left: 16, right: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 4 }}>
        {/* Matcha brand pill */}
        <div className="glass sheen" style={{ borderRadius: 999, padding: '8px 16px 8px 8px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg, #c8dfb1, #6b9b5f)', display: 'grid', placeItems: 'center' }}>
            <MatchaLogo size={32}/>
          </div>
          <span style={{ fontWeight: 700, fontSize: 15, color: 'white', letterSpacing: '-0.01em' }}>Matcha</span>
        </div>

        {/* top icons */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="glass sheen" style={{ width: 44, height: 44, borderRadius: '50%', display: 'grid', placeItems: 'center', cursor: 'pointer', border: '1px solid var(--glass-border)', color: 'white', position: 'relative' }}>
            <IconBell size={20}/>
            <span style={{ position: 'absolute', top: 8, right: 9, width: 8, height: 8, borderRadius: '50%', background: '#f4c4b0', boxShadow: '0 0 8px #f4c4b0' }}></span>
          </button>
          <button className="glass sheen" style={{ width: 44, height: 44, borderRadius: '50%', display: 'grid', placeItems: 'center', cursor: 'pointer', border: '1px solid var(--glass-border)', color: 'white' }}>
            <IconChat size={19}/>
          </button>
          <button className="glass sheen" style={{ width: 44, height: 44, borderRadius: '50%', display: 'grid', placeItems: 'center', cursor: 'pointer', border: '1px solid var(--glass-border)', padding: 2 }}>
            <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'linear-gradient(135deg, #c9b8e8, #f4c4b0, #8fb570)' }}></div>
          </button>
        </div>
      </div>

      {/* people pins */}
      {pins.map((p, i) => (
        <div key={i} style={{ position: 'absolute', left: `${p.x}%`, top: `${p.y}%`, transform: 'translate(-50%, -50%)', zIndex: 3 }}>
          {p.hot && <div style={{ position: 'absolute', inset: -14, borderRadius: '50%', background: 'radial-gradient(circle, rgba(244,196,176,0.6), transparent 70%)', animation: 'pulse 2s infinite' }}></div>}
          <div className="glass sheen" style={{ padding: 3, borderRadius: '50%', borderWidth: 1.5 }}>
            <div style={{ width: 42, height: 42, borderRadius: '50%', background: `linear-gradient(135deg, ${p.color}, rgba(255,255,255,0.4))`, display: 'grid', placeItems: 'center', color: 'white', fontWeight: 700, fontSize: 13, fontFamily: 'Noto Sans KR' }}>
              {p.label}
            </div>
          </div>
        </div>
      ))}

      {/* You-are-here */}
      <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', zIndex: 3 }}>
        <div style={{ position: 'absolute', inset: -42, borderRadius: '50%', background: 'radial-gradient(circle, rgba(143,181,112,0.45), transparent 70%)' }}></div>
        <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#8fb570', border: '4px solid white', boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}></div>
      </div>

      {/* Right rail icons */}
      <div style={{ position: 'absolute', right: 14, top: '32%', display: 'flex', flexDirection: 'column', gap: 10, zIndex: 4 }}>
        <button className="glass sheen" style={{ width: 44, height: 44, borderRadius: '50%', display: 'grid', placeItems: 'center', color: 'white', cursor: 'pointer' }}>
          <IconSearch size={18}/>
        </button>
        <button className="glass sheen" style={{ width: 44, height: 44, borderRadius: '50%', display: 'grid', placeItems: 'center', color: 'white', cursor: 'pointer', background: 'linear-gradient(135deg, rgba(244,196,176,0.5), rgba(255,255,255,0.18))' }}>
          <IconFlame size={18}/>
        </button>
        <button className="glass sheen" style={{ width: 44, height: 44, borderRadius: '50%', display: 'grid', placeItems: 'center', color: 'white', cursor: 'pointer' }}>
          <IconLocate size={18}/>
        </button>
        <button className="glass sheen" style={{ width: 44, height: 44, borderRadius: '50%', display: 'grid', placeItems: 'center', color: 'white', cursor: 'pointer' }}>
          <IconCompass size={18}/>
        </button>
      </div>

      {/* Bottom sheet — nearby ticker */}
      <div className="glass-strong sheen" style={{ position: 'absolute', left: 14, right: 14, bottom: 26, padding: '16px 18px', borderRadius: 28 }}>
        <div style={{ width: 44, height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.45)', margin: '0 auto 14px' }}></div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <div className="label-row"><IconSparkle size={12}/> 지금 내 주변</div>
            <div className="font-kr" style={{ fontSize: 18, fontWeight: 700, color: 'white', marginTop: 4, letterSpacing: '-0.01em' }}>
              근처에 <span style={{ color: '#c8dfb1' }}>12명</span>이 말차를 기다려요
            </div>
          </div>
          <button className="glass-soft" style={{ width: 38, height: 38, borderRadius: '50%', display: 'grid', placeItems: 'center', color: 'white', cursor: 'pointer', border: 'none' }}>
            <IconFilter size={16}/>
          </button>
        </div>

        <div style={{ display: 'flex', gap: 10, overflow: 'hidden' }}>
          {[
            { name: '민재', dist: '120m', tag: 'IT', color: '#8fb570' },
            { name: '하은', dist: '340m', tag: 'Marketing', color: '#c9b8e8' },
            { name: '준호', dist: '500m', tag: 'Finance', color: '#f4c4b0' }
          ].map((p, i) => (
            <div key={i} className="glass-soft" style={{ flex: 1, padding: 10, borderRadius: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: `linear-gradient(135deg, ${p.color}, rgba(255,255,255,0.4))`, display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 10, color: 'white', fontFamily: 'Noto Sans KR' }}>{p.name}</div>
                <div className="font-kr" style={{ fontSize: 12, fontWeight: 600, color: 'white' }}>{p.dist}</div>
              </div>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.72)' }}>{p.tag}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="home-indicator" style={{ background: 'rgba(255,255,255,0.85)' }}></div>

      <style>{`
        @keyframes pulse {
          0%,100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.9; transform: scale(1.15); }
        }
      `}</style>
    </div>
  );
}

window.MapScreen = MapScreen;

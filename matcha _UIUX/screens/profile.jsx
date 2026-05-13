// ===== Screen 04: Profile =====
function ProfileScreen() {
  const fields = ['IT', 'Marketing', 'Design', 'Finance', 'Other'];
  const moods = [
    { label: '느슨하게', emoji: '🍃', desc: '가벼운 수다' },
    { label: '진솔하게', emoji: '🌿', desc: '깊은 이야기' },
    { label: '협업 모드', emoji: '✨', desc: '함께 일' }
  ];

  return (
    <div className="screen">
      {/* Map peek behind */}
      <div className="map-tile" style={{ filter: 'blur(3px) brightness(0.88)' }}></div>
      <svg className="map-roads" viewBox="0 0 390 760" preserveAspectRatio="none" style={{ opacity: 0.5, filter: 'blur(1px)' }}>
        <g stroke="#c8bfa8" strokeWidth="14" fill="none" strokeLinecap="round">
          <path d="M-20 220 Q200 180 410 240"/>
          <path d="M-20 500 Q200 540 410 480"/>
          <path d="M180 -20 Q200 380 220 780"/>
        </g>
      </svg>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(26,58,42,0.55) 0%, rgba(26,58,42,0.78) 100%)' }}></div>
      <div className="blob" style={{ width: 240, height: 240, background: '#c9b8e8', top: 80, right: -80, opacity: 0.5 }}></div>
      <div className="blob" style={{ width: 280, height: 280, background: '#8fb570', bottom: -100, left: -80, opacity: 0.7 }}></div>

      <div className="statusbar"><span>9:41</span>
        <div className="sb-icons">
          <svg width="18" height="11" viewBox="0 0 18 11" fill="white"><path d="M1 7v3h2V7zM5 5v5h2V5zM9 3v7h2V3zM13 1v9h2V1z"/></svg>
          <svg width="16" height="11" viewBox="0 0 16 11" fill="none" stroke="white" strokeWidth="1.2"><path d="M1 4a10 10 0 0 1 14 0M3 6.5a7 7 0 0 1 10 0M5.5 9a4 4 0 0 1 5 0"/></svg>
          <svg width="24" height="11" viewBox="0 0 24 11" fill="none" stroke="white" strokeWidth="1"><rect x="1" y="1" width="20" height="9" rx="2"/><rect x="3" y="3" width="16" height="5" rx="1" fill="white"/></svg>
        </div>
      </div>

      <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', height: 'calc(100% - 44px)' }}>
        {/* Header */}
        <div style={{ padding: '8px 22px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="font-kr" style={{ fontSize: 22, fontWeight: 800, color: 'white', letterSpacing: '-0.02em' }}>내 프로필</div>
          <button className="glass" style={{ width: 38, height: 38, borderRadius: '50%', display: 'grid', placeItems: 'center', color: 'white', cursor: 'pointer' }}>
            <IconClose size={16}/>
          </button>
        </div>

        {/* Scroll content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 14px' }}>
          {/* Identity card */}
          <div className="glass sheen" style={{ padding: 18, borderRadius: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 14 }}>
            <div className="avatar-ring" style={{ marginBottom: 12 }}>
              <div style={{ width: 92, height: 92, borderRadius: '50%', background: 'linear-gradient(135deg, #c9b8e8, #f4c4b0)', display: 'grid', placeItems: 'center', border: '3px solid rgba(255,255,255,0.85)', overflow: 'hidden' }}>
                {/* "Up" balloon-style avatar */}
                <svg width="80" height="80" viewBox="0 0 80 80">
                  <defs>
                    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor="#c8d8ee"/>
                      <stop offset="1" stopColor="#e9b8d0"/>
                    </linearGradient>
                  </defs>
                  <rect width="80" height="80" fill="url(#sky)"/>
                  {[['#f4c4b0',24,18],['#8fb570',32,12],['#c9b8e8',40,20],['#f4d4a0',48,14],['#c9b8e8',28,28],['#f4c4b0',46,28],['#8fb570',38,32]].map((b,i) => (
                    <circle key={i} cx={b[1]} cy={b[2]} r="6" fill={b[0]}/>
                  ))}
                  <line x1="38" y1="34" x2="38" y2="56" stroke="white" strokeWidth="0.5"/>
                  <rect x="32" y="56" width="14" height="12" rx="1.5" fill="#a8745c"/>
                  <rect x="34" y="60" width="3" height="4" fill="#f4e6c4"/>
                  <rect x="41" y="60" width="3" height="4" fill="#f4e6c4"/>
                </svg>
              </div>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'white', letterSpacing: '-0.02em', marginBottom: 2 }}>youngjoo Suh</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.12)', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.78)', marginTop: 2 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#8fb570' }}></span>
              Collaboration Card
            </div>
          </div>

          {/* 한 마디 */}
          <div style={{ marginBottom: 16 }}>
            <div className="label-row" style={{ marginBottom: 8, padding: '0 4px' }}>
              <IconSparkle size={13}/>
              <span className="font-kr" style={{ textTransform: 'none', letterSpacing: 0, fontSize: 13 }}>나를 표현하는 한 마디</span>
            </div>
            <div className="glass-soft" style={{ padding: '14px 16px', borderRadius: 16, minHeight: 76, display: 'flex', alignItems: 'flex-start' }}>
              <div className="font-kr" style={{ fontSize: 14, color: 'rgba(255,255,255,0.92)', lineHeight: 1.5 }}>
                실리콘밸리 출신, 조용한 카페에서 새 아이디어 굽는 중 ☕
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>32 / 80</div>
          </div>

          {/* 전문분야 */}
          <div style={{ marginBottom: 16 }}>
            <div className="label-row" style={{ marginBottom: 10, padding: '0 4px' }}>
              <IconBriefcase size={13}/>
              <span className="font-kr" style={{ textTransform: 'none', letterSpacing: 0, fontSize: 13 }}>전문 분야</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {fields.map(f => (
                <div key={f} className={"chip " + (f === 'IT' ? 'matcha' : '')}>{f}</div>
              ))}
            </div>
          </div>

          {/* 말차 성향 */}
          <div style={{ marginBottom: 12 }}>
            <div className="label-row" style={{ marginBottom: 10, padding: '0 4px' }}>
              <IconLeaf size={13}/>
              <span className="font-kr" style={{ textTransform: 'none', letterSpacing: 0, fontSize: 13 }}>말차 성향</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {moods.map((m, i) => (
                <div key={i} className={"glass-soft" + (i === 0 ? '' : '')} style={{ padding: '12px 8px', borderRadius: 16, textAlign: 'center', cursor: 'pointer', border: i === 0 ? '1px solid rgba(200,223,177,0.7)' : '1px solid rgba(255,255,255,0.18)', background: i === 0 ? 'rgba(143,181,112,0.22)' : undefined }}>
                  <div style={{ fontSize: 22, marginBottom: 4 }}>{m.emoji}</div>
                  <div className="font-kr" style={{ fontSize: 12, fontWeight: 700, color: 'white' }}>{m.label}</div>
                  <div className="font-kr" style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>{m.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom action bar */}
        <div style={{ padding: '12px 16px 18px', display: 'flex', gap: 10 }}>
          <button className="btn-ghost" style={{ width: 90, height: 52 }}>
            <span className="font-kr">취소</span>
          </button>
          <button className="btn-primary" style={{ flex: 1, height: 52, background: 'linear-gradient(180deg, #2a4a32 0%, #1a2418 100%)', color: 'white', border: '1px solid rgba(255,255,255,0.22)', boxShadow: '0 12px 32px -8px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.15)' }}>
            <IconSave size={18} stroke="white"/>
            <span className="font-kr">설정 저장하기</span>
          </button>
        </div>
      </div>

      <div className="home-indicator"></div>
    </div>
  );
}

window.ProfileScreen = ProfileScreen;

// ===== Screen 03: Chat (empty) =====
function ChatScreen() {
  const requests = [
    { name: '민재', tag: 'IT', dist: '120m', msg: '카페 만월경에서 30분 후 어떠세요?', color: '#8fb570' },
    { name: '하은', tag: 'Marketing', dist: '340m', msg: '오늘 오후 비어있어요 ☕', color: '#c9b8e8' }
  ];

  return (
    <div className="screen">
      {/* Map peek behind */}
      <div className="map-tile" style={{ filter: 'blur(2px) brightness(0.85)' }}></div>
      <svg className="map-roads" viewBox="0 0 390 760" preserveAspectRatio="none" style={{ opacity: 0.5 }}>
        <g stroke="#c8bfa8" strokeWidth="14" fill="none" strokeLinecap="round">
          <path d="M-20 220 Q200 180 410 240"/>
          <path d="M-20 500 Q200 540 410 480"/>
          <path d="M180 -20 Q200 380 220 780"/>
        </g>
      </svg>
      {/* Dark-green wash */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(26,58,42,0.65) 0%, rgba(26,58,42,0.85) 100%)' }}></div>
      {/* color blobs */}
      <div className="blob" style={{ width: 280, height: 280, background: '#8fb570', top: -80, right: -80 }}></div>
      <div className="blob" style={{ width: 240, height: 240, background: '#c9b8e8', bottom: '20%', left: -100, opacity: 0.45 }}></div>

      <div className="statusbar"><span>9:41</span>
        <div className="sb-icons">
          <svg width="18" height="11" viewBox="0 0 18 11" fill="white"><path d="M1 7v3h2V7zM5 5v5h2V5zM9 3v7h2V3zM13 1v9h2V1z"/></svg>
          <svg width="16" height="11" viewBox="0 0 16 11" fill="none" stroke="white" strokeWidth="1.2"><path d="M1 4a10 10 0 0 1 14 0M3 6.5a7 7 0 0 1 10 0M5.5 9a4 4 0 0 1 5 0"/></svg>
          <svg width="24" height="11" viewBox="0 0 24 11" fill="none" stroke="white" strokeWidth="1"><rect x="1" y="1" width="20" height="9" rx="2"/><rect x="3" y="3" width="16" height="5" rx="1" fill="white"/></svg>
        </div>
      </div>

      {/* Header */}
      <div style={{ position: 'relative', zIndex: 2, padding: '14px 22px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div className="font-kr" style={{ fontSize: 28, fontWeight: 800, color: 'white', letterSpacing: '-0.02em', lineHeight: 1 }}>채팅</div>
          <div className="font-kr" style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 6, fontWeight: 500 }}>오늘 받은 말차 요청 <span style={{ color: '#c8dfb1' }}>2</span></div>
        </div>
        <button className="glass sheen" style={{ width: 40, height: 40, borderRadius: '50%', display: 'grid', placeItems: 'center', color: 'white', cursor: 'pointer', border: '1px solid var(--glass-border)' }}>
          <IconClose size={18}/>
        </button>
      </div>

      {/* Tabs */}
      <div style={{ position: 'relative', zIndex: 2, padding: '0 22px', display: 'flex', gap: 8, marginBottom: 18 }}>
        <div className="chip active" style={{ flex: 1, justifyContent: 'center' }}>받은 요청 <span style={{ background: 'rgba(143,181,112,0.25)', color: '#2a4a32', padding: '1px 7px', borderRadius: 10, fontSize: 11 }}>2</span></div>
        <div className="chip" style={{ flex: 1, justifyContent: 'center' }}>진행 중</div>
        <div className="chip" style={{ flex: 1, justifyContent: 'center' }}>지난 만남</div>
      </div>

      {/* Request cards */}
      <div style={{ position: 'relative', zIndex: 2, padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {requests.map((r, i) => (
          <div key={i} className="glass sheen" style={{ padding: 14, borderRadius: 22, display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: `linear-gradient(135deg, ${r.color}, rgba(255,255,255,0.4))`, display: 'grid', placeItems: 'center', fontWeight: 700, color: 'white', fontFamily: 'Noto Sans KR', fontSize: 14, flexShrink: 0 }}>{r.name}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span className="font-kr" style={{ fontWeight: 700, color: 'white', fontSize: 14 }}>{r.name}</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.6)', padding: '2px 6px', borderRadius: 6, background: 'rgba(255,255,255,0.1)' }}>{r.tag}</span>
                <span className="font-kr" style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginLeft: 'auto' }}>{r.dist}</span>
              </div>
              <div className="font-kr" style={{ fontSize: 12, color: 'rgba(255,255,255,0.78)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.msg}</div>
            </div>
            <button style={{ width: 36, height: 36, borderRadius: '50%', background: '#8fb570', border: 'none', color: 'white', display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0, boxShadow: '0 4px 12px rgba(143,181,112,0.5)' }}>
              <IconArrowRight size={16} stroke="white"/>
            </button>
          </div>
        ))}
      </div>

      {/* Divider label */}
      <div style={{ position: 'relative', zIndex: 2, padding: '32px 22px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.18)' }}></div>
        <div className="font-kr" style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: '0.05em' }}>대화 중인 사람</div>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.18)' }}></div>
      </div>

      {/* Empty state */}
      <div style={{ position: 'relative', zIndex: 2, padding: '0 22px', flex: 1, display: 'flex' }}>
        <div className="glass-soft sheen" style={{ width: '100%', borderRadius: 24, padding: '40px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', minHeight: 220 }}>
          <div className="glass sheen" style={{ width: 76, height: 76, borderRadius: '50%', display: 'grid', placeItems: 'center', color: 'white', marginBottom: 18 }}>
            <IconLeaf size={34} stroke="rgba(255,255,255,0.85)"/>
          </div>
          <div className="font-kr" style={{ fontSize: 16, fontWeight: 700, color: 'white', marginBottom: 8 }}>아직 채팅이 없어요</div>
          <div className="font-kr" style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5, maxWidth: 260 }}>
            말차 요청을 수락하면<br/>이곳에서 따뜻한 대화가 시작돼요
          </div>
        </div>
      </div>

      <div style={{ height: 30 }}></div>
      <div className="home-indicator"></div>
    </div>
  );
}

window.ChatScreen = ChatScreen;

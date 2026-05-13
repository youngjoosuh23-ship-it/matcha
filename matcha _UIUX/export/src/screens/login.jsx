// ===== Screen 01: Login =====
function LoginScreen() {
  return (
    <div className="screen">
      <div className="backdrop"></div>
      {/* color blobs */}
      <div className="blob" style={{ width: 280, height: 280, background: '#f4c4b0', top: -60, right: -60 }}></div>
      <div className="blob" style={{ width: 340, height: 340, background: '#8fb570', bottom: -100, left: -80, opacity: 0.85 }}></div>
      <div className="blob" style={{ width: 180, height: 180, background: '#c9b8e8', top: '40%', right: -40, opacity: 0.55 }}></div>

      <div className="statusbar">
        <span>9:41</span>
        <div className="sb-icons">
          <svg width="18" height="11" viewBox="0 0 18 11" fill="white"><path d="M1 7v3h2V7zM5 5v5h2V5zM9 3v7h2V3zM13 1v9h2V1z" /></svg>
          <svg width="16" height="11" viewBox="0 0 16 11" fill="none" stroke="white" strokeWidth="1.2"><path d="M1 4a10 10 0 0 1 14 0M3 6.5a7 7 0 0 1 10 0M5.5 9a4 4 0 0 1 5 0" /></svg>
          <svg width="24" height="11" viewBox="0 0 24 11" fill="none" stroke="white" strokeWidth="1"><rect x="1" y="1" width="20" height="9" rx="2" /><rect x="3" y="3" width="16" height="5" rx="1" fill="white" /></svg>
        </div>
      </div>

      <div style={{ position: 'relative', zIndex: 2, padding: '60px 28px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', height: "716px" }}>
        {/* hero logo with glass halo */}
        <div style={{ marginTop: 64, position: 'relative' }}>
          <div className="glass sheen" style={{ width: 184, height: 184, borderRadius: '50%', display: 'grid', placeItems: 'center', padding: 16 }}>
            <MatchaLogo size={148} />
          </div>
          {/* floating tiny chips */}
          <div className="glass-soft" style={{ position: 'absolute', top: -8, right: -28, padding: '6px 12px', fontSize: 11, fontWeight: 600, color: 'white', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#8fb570', boxShadow: '0 0 8px #8fb570' }}></span>
            243명 근처
          </div>
        </div>

        {/* wordmark */}
        <h1 style={{ marginTop: 30, fontSize: 56, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1, color: 'white', textShadow: '0 4px 24px rgba(0,0,0,0.2)', fontFamily: "-apple-system" }}>Matcha</h1>

        <p className="font-kr" style={{ marginTop: 18, fontSize: 15, fontStyle: 'italic', fontWeight: 500, color: 'rgba(255,255,255,0.92)', textAlign: 'center', letterSpacing: '-0.005em', fontFamily: "system-ui" }}>
          "말차 한 잔처럼, 깊고 조용한 연결"
        </p>

        <p className="font-kr" style={{ marginTop: 28, fontSize: 14, lineHeight: 1.65, color: 'rgba(255,255,255,0.75)', fontWeight: 400, maxWidth: 300, height: "69.2812px", textAlign: "center" }}>
          카페에서 나누는 느슨한 연결과 말차.<br />
          지금 내 주변에서 당신과 대화하고<br />싶은 사람을 찾아보세요.
        </p>

        <div style={{ flex: 1 }}></div>

        <button className="btn-primary" style={{ marginBottom: 18 }}>
          <IconLoginArrow size={20} stroke="#1a2418" />
          <span className="font-kr">Google로 시작하기</span>
        </button>

        <div className="font-kr" style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', textAlign: 'center', marginBottom: 28, letterSpacing: '-0.01em' }}>
          시작하면 <u>이용약관</u> 및 <u>개인정보처리방침</u>에 동의합니다
        </div>
      </div>

      <div className="home-indicator"></div>
    </div>);

}

window.LoginScreen = LoginScreen;
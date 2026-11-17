import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { LanguageProvider } from './lib/i18n.tsx';
import './index.css';

// Prevent browser pinch-to-zoom (iOS ignores user-scalable=no viewport meta)
document.addEventListener('gesturestart', e => e.preventDefault(), { passive: false });
document.addEventListener('gesturechange', e => e.preventDefault(), { passive: false });
document.addEventListener('touchmove', (e) => {
  if (e.touches.length > 1) e.preventDefault();
}, { passive: false });

// 새 버전이 준비되면(새 서비스 워커가 제어권을 가져가면) 한 번 새로고침해서 바로 적용.
// 첫 설치 때는 기존 controller가 없으므로 새로고침하지 않음.
if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
  navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { once: true });
}

createRoot(document.getElementById('root')!).render(
  <LanguageProvider>
    <App />
  </LanguageProvider>
);

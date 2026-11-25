import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['logo.svg', 'icon-192.png', 'icon-512.png'],
        manifest: {
          name: 'Matcha',
          short_name: 'Matcha',
          description: '카페에서 나누는 느슨한 연결. 지금 내 주변의 사람을 만나보세요.',
          theme_color: '#8fb570',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          icons: [
            { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          navigateFallback: '/index.html',
          globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
          cleanupOutdatedCaches: true,
          skipWaiting: true,
          clientsClaim: true,
        },
      }),
    ],
    define: {
      // 콘솔에서 지도 스타일을 연결한 지도 ID (POI 숨김, 무채색). 없으면 MainMap의 기본값
      'process.env.GOOGLE_MAP_ID': JSON.stringify(env.GOOGLE_MAP_ID || ''),
      'process.env.GOOGLE_MAPS_PLATFORM_KEY': JSON.stringify(env.GOOGLE_MAPS_PLATFORM_KEY || env.VITE_GOOGLE_MAPS_PLATFORM_KEY || ''),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      proxy: {
        '/tourapi': {
          target: 'https://apis.data.go.kr',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/tourapi/, ''),
        },
        '/cultureapi': {
          target: 'https://apis.data.go.kr',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/cultureapi/, ''),
        },
      },
    },
  };
});

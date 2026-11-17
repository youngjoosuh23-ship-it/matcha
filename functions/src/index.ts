import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import * as admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import fetch from 'node-fetch';

admin.initializeApp();

const TOUR_API_KEY = defineSecret('TOUR_API_KEY');

async function verifyAuth(req: any, res: any): Promise<boolean> {
  const authHeader = req.headers.authorization as string | undefined;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  try {
    await getAuth().verifyIdToken(authHeader.slice(7));
    return true;
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
}

function injectApiKey(url: string, key: string): string {
  const u = new URL(url, 'https://placeholder.invalid');
  u.searchParams.delete('serviceKey');
  u.searchParams.set('serviceKey', key);
  return u.search;
}

// 공개 호출 허용(invoker: public) — 인증은 verifyAuth가 Firebase ID 토큰으로 직접 검사.
// Hosting rewrite가 함수를 호출하려면 Cloud Run 쪽은 공개여야 함.
const proxyOptions = {
  cors: true,
  region: 'asia-northeast3',
  invoker: 'public' as const,
  maxInstances: 5,     // 대량 호출 시 비용 상한
};

// 앱이 실제로 쓰는 경로만 통과 — 로그인 사용자가 우리 API 키로 다른 공공 API를 호출하지 못하게
export const ALLOWED_PATHS = {
  tourapi: /^\/B551011\/KorService2\/(locationBasedList2|detailIntro2|detailCommon2)$/,
  cultureapi: /^\/B553457\/cultureinfo\/period2$/,
  fstvlapi: /^\/openapi\/tn_pubr_public_cltur_fstvl_api$/,
};

function dataGoKrProxy(prefix: keyof typeof ALLOWED_PATHS, host: string) {
  return onRequest({ ...proxyOptions, secrets: [TOUR_API_KEY] }, async (req, res) => {
    if (!await verifyAuth(req, res)) return;
    const path = req.url.replace(new RegExp(`^/${prefix}`), '');
    const base = path.split('?')[0];
    if (!ALLOWED_PATHS[prefix].test(base)) { res.status(403).json({ error: 'Path not allowed' }); return; }
    const qs = injectApiKey(path, TOUR_API_KEY.value());
    const started = Date.now();
    try {
      // 공공 API가 응답하지 않으면 50초에 끊고 504 — 함수 제한(60초)에 걸려 원인 없이 죽지 않도록
      const upstream = await fetch(`https://${host}${base}${qs}`, { signal: AbortSignal.timeout(50_000) as any });
      const body = await upstream.text();
      console.log(`${prefix} ${base} → ${upstream.status} ${Date.now() - started}ms ${body.length}B`);
      res.status(upstream.status).send(body);
    } catch (e) {
      console.error(`${prefix} ${base} → failed after ${Date.now() - started}ms: ${(e as Error).name}`);
      res.status(504).json({ error: `${prefix} upstream did not respond` });
    }
  });
}

export const tourApiProxy = dataGoKrProxy('tourapi', 'apis.data.go.kr');
export const cultureApiProxy = dataGoKrProxy('cultureapi', 'apis.data.go.kr');
export const fstvlApiProxy = dataGoKrProxy('fstvlapi', 'api.data.go.kr');

export const overpassProxy = onRequest(
  proxyOptions,
  async (req, res) => {
    if (!await verifyAuth(req, res)) return;
    const query: string | undefined = req.body?.data ?? (req.query['data'] as string | undefined);
    if (!query) { res.status(400).json({ error: 'no query' }); return; }
    try {
      const upstream = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
      });
      const body = await upstream.text();
      res.status(upstream.status).set('Content-Type', 'application/json').send(body);
    } catch {
      res.status(502).json({ error: 'Overpass proxy error' });
    }
  }
);

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

export const tourApiProxy = onRequest(
  { cors: true, region: 'asia-northeast3', secrets: [TOUR_API_KEY] },
  async (req, res) => {
    if (!await verifyAuth(req, res)) return;
    const path = req.url.replace(/^\/tourapi/, '');
    const qs = injectApiKey(path, TOUR_API_KEY.value());
    const base = path.split('?')[0];
    const target = `https://apis.data.go.kr${base}${qs}`;
    try {
      const upstream = await fetch(target);
      const body = await upstream.text();
      res.status(upstream.status).send(body);
    } catch {
      res.status(502).json({ error: 'TourAPI proxy error' });
    }
  }
);

export const cultureApiProxy = onRequest(
  { cors: true, region: 'asia-northeast3', secrets: [TOUR_API_KEY] },
  async (req, res) => {
    if (!await verifyAuth(req, res)) return;
    const path = req.url.replace(/^\/cultureapi/, '');
    const qs = injectApiKey(path, TOUR_API_KEY.value());
    const base = path.split('?')[0];
    const target = `https://apis.data.go.kr${base}${qs}`;
    try {
      const upstream = await fetch(target);
      const body = await upstream.text();
      res.status(upstream.status).send(body);
    } catch {
      res.status(502).json({ error: 'CultureAPI proxy error' });
    }
  }
);

export const fstvlApiProxy = onRequest(
  { cors: true, region: 'asia-northeast3', secrets: [TOUR_API_KEY] },
  async (req, res) => {
    if (!await verifyAuth(req, res)) return;
    const path = req.url.replace(/^\/fstvlapi/, '');
    const qs = injectApiKey(path, TOUR_API_KEY.value());
    const base = path.split('?')[0];
    const target = `https://api.data.go.kr${base}${qs}`;
    try {
      const upstream = await fetch(target);
      const body = await upstream.text();
      res.status(upstream.status).send(body);
    } catch {
      res.status(502).json({ error: 'FstvlAPI proxy error' });
    }
  }
);

export const overpassProxy = onRequest(
  { cors: true, region: 'asia-northeast3' },
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

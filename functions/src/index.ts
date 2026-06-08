import { onRequest } from 'firebase-functions/v2/https';
import fetch from 'node-fetch';

export const tourApiProxy = onRequest(
  { cors: true, region: 'asia-northeast3' },
  async (req, res) => {
    const upstreamPath = req.url.replace(/^\/tourapi/, '');
    const target = `https://apis.data.go.kr${upstreamPath}`;
    try {
      const upstream = await fetch(target);
      const body = await upstream.text();
      res.status(upstream.status).send(body);
    } catch (err) {
      res.status(502).json({ error: 'TourAPI proxy error' });
    }
  }
);

export const cultureApiProxy = onRequest(
  { cors: true, region: 'asia-northeast3' },
  async (req, res) => {
    const upstreamPath = req.url.replace(/^\/cultureapi/, '');
    const target = `https://apis.data.go.kr${upstreamPath}`;
    try {
      const upstream = await fetch(target);
      const body = await upstream.text();
      res.status(upstream.status).send(body);
    } catch (err) {
      res.status(502).json({ error: 'CultureAPI proxy error' });
    }
  }
);

export const overpassProxy = onRequest(
  { cors: true, region: 'asia-northeast3' },
  async (req, res) => {
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
    } catch (err) {
      res.status(502).json({ error: 'Overpass proxy error' });
    }
  }
);

import { onRequest } from 'firebase-functions/v2/https';
import fetch from 'node-fetch';

export const tourApiProxy = onRequest(
  { cors: true, region: 'asia-northeast3' },
  async (req, res) => {
    // Strip the /tourapi prefix that Firebase Hosting rewrites preserve
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

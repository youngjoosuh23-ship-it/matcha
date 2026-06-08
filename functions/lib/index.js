"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.overpassProxy = exports.cultureApiProxy = exports.tourApiProxy = void 0;
const https_1 = require("firebase-functions/v2/https");
const node_fetch_1 = __importDefault(require("node-fetch"));
exports.tourApiProxy = (0, https_1.onRequest)({ cors: true, region: 'asia-northeast3' }, async (req, res) => {
    const upstreamPath = req.url.replace(/^\/tourapi/, '');
    const target = `https://apis.data.go.kr${upstreamPath}`;
    try {
        const upstream = await (0, node_fetch_1.default)(target);
        const body = await upstream.text();
        res.status(upstream.status).send(body);
    }
    catch (err) {
        res.status(502).json({ error: 'TourAPI proxy error' });
    }
});
exports.cultureApiProxy = (0, https_1.onRequest)({ cors: true, region: 'asia-northeast3' }, async (req, res) => {
    const upstreamPath = req.url.replace(/^\/cultureapi/, '');
    const target = `https://apis.data.go.kr${upstreamPath}`;
    try {
        const upstream = await (0, node_fetch_1.default)(target);
        const body = await upstream.text();
        res.status(upstream.status).send(body);
    }
    catch (err) {
        res.status(502).json({ error: 'CultureAPI proxy error' });
    }
});
exports.overpassProxy = (0, https_1.onRequest)({ cors: true, region: 'asia-northeast3' }, async (req, res) => {
    const query = req.body?.data ?? req.query['data'];
    if (!query) {
        res.status(400).json({ error: 'no query' });
        return;
    }
    try {
        const upstream = await (0, node_fetch_1.default)('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `data=${encodeURIComponent(query)}`,
        });
        const body = await upstream.text();
        res.status(upstream.status).set('Content-Type', 'application/json').send(body);
    }
    catch (err) {
        res.status(502).json({ error: 'Overpass proxy error' });
    }
});
//# sourceMappingURL=index.js.map
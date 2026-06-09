"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.overpassProxy = exports.fstvlApiProxy = exports.cultureApiProxy = exports.tourApiProxy = void 0;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const admin = __importStar(require("firebase-admin"));
const auth_1 = require("firebase-admin/auth");
const node_fetch_1 = __importDefault(require("node-fetch"));
admin.initializeApp();
const TOUR_API_KEY = (0, params_1.defineSecret)('TOUR_API_KEY');
async function verifyAuth(req, res) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized' });
        return false;
    }
    try {
        await (0, auth_1.getAuth)().verifyIdToken(authHeader.slice(7));
        return true;
    }
    catch {
        res.status(401).json({ error: 'Unauthorized' });
        return false;
    }
}
function injectApiKey(url, key) {
    const u = new URL(url, 'https://placeholder.invalid');
    u.searchParams.delete('serviceKey');
    u.searchParams.set('serviceKey', key);
    return u.search;
}
exports.tourApiProxy = (0, https_1.onRequest)({ cors: true, region: 'asia-northeast3', secrets: [TOUR_API_KEY] }, async (req, res) => {
    if (!await verifyAuth(req, res))
        return;
    const path = req.url.replace(/^\/tourapi/, '');
    const qs = injectApiKey(path, TOUR_API_KEY.value());
    const base = path.split('?')[0];
    const target = `https://apis.data.go.kr${base}${qs}`;
    try {
        const upstream = await (0, node_fetch_1.default)(target);
        const body = await upstream.text();
        res.status(upstream.status).send(body);
    }
    catch {
        res.status(502).json({ error: 'TourAPI proxy error' });
    }
});
exports.cultureApiProxy = (0, https_1.onRequest)({ cors: true, region: 'asia-northeast3', secrets: [TOUR_API_KEY] }, async (req, res) => {
    if (!await verifyAuth(req, res))
        return;
    const path = req.url.replace(/^\/cultureapi/, '');
    const qs = injectApiKey(path, TOUR_API_KEY.value());
    const base = path.split('?')[0];
    const target = `https://apis.data.go.kr${base}${qs}`;
    try {
        const upstream = await (0, node_fetch_1.default)(target);
        const body = await upstream.text();
        res.status(upstream.status).send(body);
    }
    catch {
        res.status(502).json({ error: 'CultureAPI proxy error' });
    }
});
exports.fstvlApiProxy = (0, https_1.onRequest)({ cors: true, region: 'asia-northeast3', secrets: [TOUR_API_KEY] }, async (req, res) => {
    if (!await verifyAuth(req, res))
        return;
    const path = req.url.replace(/^\/fstvlapi/, '');
    const qs = injectApiKey(path, TOUR_API_KEY.value());
    const base = path.split('?')[0];
    const target = `https://api.data.go.kr${base}${qs}`;
    try {
        const upstream = await (0, node_fetch_1.default)(target);
        const body = await upstream.text();
        res.status(upstream.status).send(body);
    }
    catch {
        res.status(502).json({ error: 'FstvlAPI proxy error' });
    }
});
exports.overpassProxy = (0, https_1.onRequest)({ cors: true, region: 'asia-northeast3' }, async (req, res) => {
    if (!await verifyAuth(req, res))
        return;
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
    catch {
        res.status(502).json({ error: 'Overpass proxy error' });
    }
});
//# sourceMappingURL=index.js.map
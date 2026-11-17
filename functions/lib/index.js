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
exports.overpassProxy = exports.fstvlApiProxy = exports.cultureApiProxy = exports.tourApiProxy = exports.ALLOWED_PATHS = void 0;
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
// 공개 호출 허용(invoker: public) — 인증은 verifyAuth가 Firebase ID 토큰으로 직접 검사.
// Hosting rewrite가 함수를 호출하려면 Cloud Run 쪽은 공개여야 함.
const proxyOptions = {
    cors: true,
    region: 'asia-northeast3',
    invoker: 'public',
    maxInstances: 5, // 대량 호출 시 비용 상한
    timeoutSeconds: 30, // 공공 API가 응답하지 않을 때 60초까지 붙잡지 않도록
};
// 앱이 실제로 쓰는 경로만 통과 — 로그인 사용자가 우리 API 키로 다른 공공 API를 호출하지 못하게
exports.ALLOWED_PATHS = {
    tourapi: /^\/B551011\/KorService2\/(locationBasedList2|detailIntro2|detailCommon2)$/,
    cultureapi: /^\/B553457\/cultureinfo\/period2$/,
    fstvlapi: /^\/openapi\/tn_pubr_public_cltur_fstvl_api$/,
};
function dataGoKrProxy(prefix, host) {
    return (0, https_1.onRequest)({ ...proxyOptions, secrets: [TOUR_API_KEY] }, async (req, res) => {
        if (!await verifyAuth(req, res))
            return;
        const path = req.url.replace(new RegExp(`^/${prefix}`), '');
        const base = path.split('?')[0];
        if (!exports.ALLOWED_PATHS[prefix].test(base)) {
            res.status(403).json({ error: 'Path not allowed' });
            return;
        }
        const qs = injectApiKey(path, TOUR_API_KEY.value());
        try {
            const upstream = await (0, node_fetch_1.default)(`https://${host}${base}${qs}`);
            const body = await upstream.text();
            res.status(upstream.status).send(body);
        }
        catch {
            res.status(502).json({ error: `${prefix} proxy error` });
        }
    });
}
exports.tourApiProxy = dataGoKrProxy('tourapi', 'apis.data.go.kr');
exports.cultureApiProxy = dataGoKrProxy('cultureapi', 'apis.data.go.kr');
exports.fstvlApiProxy = dataGoKrProxy('fstvlapi', 'api.data.go.kr');
exports.overpassProxy = (0, https_1.onRequest)(proxyOptions, async (req, res) => {
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
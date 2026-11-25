// 손그림 마커 시트(matcha _UIUX/map-markers-sheet.jpg)에서 아이콘 12개를 잘라 배경을 투명하게 만든다.
// 실행: node scripts/make-map-markers.mjs → public/markers/*.png
// 각 PNG는 바늘·깃대 끝이 "아래 가운데"에 오도록 잘라서, AdvancedMarker(아래 가운데 = 좌표)에 그대로 꽂힌다.
import sharp from 'sharp';

const SRC = 'matcha _UIUX/map-markers-sheet.jpg';
const OUT = 'public/markers';
const NAMES = [
  ['pin-hole', 'pin-star', 'pin-plain', 'pin-dots'],
  ['flag-a', 'flag-b', 'flag-c', 'flag-d'],
  ['heart', 'star', 'leaf', 'house'],
];
const COL_X = [272, 557, 848, 1131];          // 칸 가운데 (시트 기준 픽셀)
const ROW_Y = [[55, 245], [290, 485], [512, 715]];
const HALF = 120;                             // 가운데에서 좌우로 볼 범위 — 시트 가장자리 얼룩 제외
const INK = 70, A0 = 12, A1 = 90;             // 아이콘 판정 / 투명→불투명 구간 (배경과의 색 차이)
const OUT_H = 132;                            // 출력 높이 (화면에서는 44~52px로 표시 → 약 3배 해상도)

const WHITE_HOLE = new Set(['pin-hole', 'pin-dots']);  // 핀 머리의 구멍을 흰색으로 메움

// 바깥과 이어지지 않은 투명 영역(= 구멍)과 그 가장자리 2px를 흰 바탕에 합성
function fillHoleWhite(buf, w, h) {
  const clear = i => buf[i * 4 + 3] < 128;
  const outside = new Uint8Array(w * h), stack = [];
  for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);
  while (stack.length) {
    const i = stack.pop();
    if (outside[i] || !clear(i)) continue;
    outside[i] = 1;
    const x = i % w, y = (i / w) | 0;
    if (x > 0) stack.push(i - 1); if (x < w - 1) stack.push(i + 1);
    if (y > 0) stack.push(i - w); if (y < h - 1) stack.push(i + w);
  }
  const hole = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) if (clear(i) && !outside[i]) hole[i] = 1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let near = false;
    for (let dy = -2; dy <= 2 && !near; dy++) for (let dx = -2; dx <= 2 && !near; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && yy >= 0 && xx < w && yy < h && hole[yy * w + xx]) near = true;
    }
    if (!near) continue;
    const o = (y * w + x) * 4, a = buf[o + 3] / 255;
    for (let k = 0; k < 3; k++) buf[o + k] = Math.round(buf[o + k] * a + 255 * (1 - a));
    buf[o + 3] = 255;
  }
}

const { data, info } = await sharp(SRC).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width;
const px = (x, y) => { const i = (y * W + x) * 3; return [data[i], data[i + 1], data[i + 2]]; };

// 배경색: 네 모서리 평균
let bg = [0, 0, 0], n = 0;
for (const [x0, y0] of [[5, 5], [W - 30, 5], [5, info.height - 30], [W - 30, info.height - 30]])
  for (let y = y0; y < y0 + 20; y++) for (let x = x0; x < x0 + 20; x++) { const c = px(x, y); bg = bg.map((v, k) => v + c[k]); n++; }
bg = bg.map(v => v / n);
const diff = c => Math.max(...c.map((v, k) => Math.abs(v - bg[k])));

for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
  const [y0, y1] = ROW_Y[r], x0 = COL_X[c] - HALF, x1 = COL_X[c] + HALF;
  let minx = 1e9, maxx = -1, miny = 1e9, maxy = -1, tipx = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    if (diff(px(x, y)) <= INK) continue;
    minx = Math.min(minx, x); maxx = Math.max(maxx, x); miny = Math.min(miny, y);
    if (y >= maxy) { maxy = y; tipx = x; }
  }
  // 끝(tip)을 가운데로: 좌우 폭을 tip 기준 대칭으로, 그림자(오른쪽 아래) 여유 포함
  const half = Math.max(tipx - minx, maxx + 30 - tipx) + 6;
  const left = tipx - half, top = miny - 6, w = half * 2 + 1, h = maxy - top + 2;
  const out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const sx = left + x, sy = top + y, o = (y * w + x) * 4;
    if (sx < x0 - 10 || sx > x1 + 10) continue;              // 범위 밖은 투명
    const col = px(sx, sy), a = Math.min(1, Math.max(0, (diff(col) - A0) / (A1 - A0)));
    // 배경색을 걷어내 가장자리의 흰 테두리를 없앰 (un-premultiply)
    for (let k = 0; k < 3; k++) out[o + k] = a > 0 ? Math.max(0, Math.min(255, Math.round((col[k] - (1 - a) * bg[k]) / a))) : 0;
    out[o + 3] = Math.round(a * 255);
  }
  const name = NAMES[r][c];
  if (WHITE_HOLE.has(name)) fillHoleWhite(out, w, h);
  await sharp(out, { raw: { width: w, height: h, channels: 4 } })
    .resize({ height: OUT_H }).png({ compressionLevel: 9 }).toFile(`${OUT}/${name}.png`);
  console.log(name.padEnd(9), `${w}x${h} tip→center`);
}

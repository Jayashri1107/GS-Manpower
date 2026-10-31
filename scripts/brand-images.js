// Renders PNG brand images that cannot be SVG: the social-share image and home-screen icons.
// Pure Node (zlib only). Run: node scripts/brand-images.js
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT = path.join(__dirname, '..', 'src', 'assets', 'img');
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const NAVY = hex('#14213D'), SAFFRON = hex('#F2A007'), WHITE = hex('#FFFFFF'), PAPER = hex('#F6F4EF'), STEEL_LIGHT = hex('#C9CDD6');
const SS = 3; // supersampling

// radius > 0 gives a transparent PNG whose background is a rounded square (used for favicons).
function canvas(w, h, bg, radius = 0) {
  const layers = [];
  return {
    w, h,
    layer(color) { const m = { color, mask: new Uint8Array(w * SS * h * SS) }; layers.push(m); return m; },
    png(file) {
      const W = w * SS;
      const ch = radius ? 4 : 3;
      const inBg = (px, py) => { const dx = Math.max(radius - px, 0, px - (w - radius)), dy = Math.max(radius - py, 0, py - (h - radius)); return dx * dx + dy * dy <= radius * radius; };
      const rows = Buffer.alloc((w * ch + 1) * h);
      for (let y = 0; y < h; y++) {
        rows[y * (w * ch + 1)] = 0;
        for (let x = 0; x < w; x++) {
          let px = bg.slice();
          for (const L of layers) {
            let cov = 0;
            for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) cov += L.mask[(y * SS + sy) * W + x * SS + sx];
            if (cov) { const a = cov / (SS * SS); px = px.map((c, i) => c * (1 - a) + L.color[i] * a); }
          }
          const o = y * (w * ch + 1) + 1 + x * ch;
          rows[o] = px[0]; rows[o + 1] = px[1]; rows[o + 2] = px[2];
          if (radius) {
            let a = 0;
            for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) a += inBg(x + (sx + 0.5) / SS, y + (sy + 0.5) / SS);
            rows[o + 3] = Math.round(255 * a / (SS * SS));
          }
        }
      }
      const chunk = (t, d) => { const b = Buffer.alloc(8 + d.length + 4); b.writeUInt32BE(d.length); b.write(t, 4); d.copy(b, 8); b.writeUInt32BE(zlib.crc32(Buffer.concat([Buffer.from(t), d])) >>> 0, 8 + d.length); return b; };
      const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = radius ? 6 : 2;
      const out = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(rows, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
      if (file) fs.writeFileSync(file, out);
      return out;
    },
  };
}

// Shape stamping on a layer (coordinates in output pixels).
function stamp(cv, L, minX, minY, maxX, maxY, inside) {
  const W = cv.w * SS;
  const x0 = Math.max(0, Math.floor(minX * SS)), x1 = Math.min(W - 1, Math.ceil(maxX * SS));
  const y0 = Math.max(0, Math.floor(minY * SS)), y1 = Math.min(cv.h * SS - 1, Math.ceil(maxY * SS));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (inside((x + 0.5) / SS, (y + 0.5) / SS)) L.mask[y * W + x] = 1;
}
function capsule(cv, L, ax, ay, bx, by, r) {
  const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy || 1;
  stamp(cv, L, Math.min(ax, bx) - r, Math.min(ay, by) - r, Math.max(ax, bx) + r, Math.max(ay, by) + r, (x, y) => {
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len2));
    const px = ax + t * dx - x, py = ay + t * dy - y;
    return px * px + py * py <= r * r;
  });
}
const circle = (cv, L, cx, cy, r) => stamp(cv, L, cx - r, cy - r, cx + r, cy + r, (x, y) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r);
function polyline(cv, L, pts, r) { for (let i = 1; i < pts.length; i++) capsule(cv, L, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], r); }

// The G Guardian mark, from the 48-unit SVG geometry, drawn at (ox, oy) with `size` px for 48 units.
function mark(cv, gColor, ox, oy, size) {
  const k = size / 48, P = (x, y) => [ox + x * k, oy + y * k];
  const G = cv.layer(gColor), F = cv.layer(SAFFRON);
  const [cx, cy] = P(24, 24), R = 15 * k, w = 3.25 * k;
  stamp(cv, G, cx - R - w, cy - R - w, cx + R + w, cy + R + w, (x, y) => {
    const d = Math.hypot(x - cx, y - cy), a = Math.atan2(y - cy, x - cx) * 180 / Math.PI;
    return Math.abs(d - R) <= w && !(a > -50 && a < 0);
  });
  circle(cv, G, ...P(33.64, 12.51), w);
  capsule(cv, G, ...P(39, 24), ...P(31, 24), w);
  circle(cv, F, ...P(22.5, 16.5), 3.3 * k);
  capsule(cv, F, ...P(22.5, 23.6), ...P(22.5, 27.6), 3.2 * k);
}

// Minimal stroke font (capitals) on a 10 × 14 grid.
const ell = (from, to, n = 18) => Array.from({ length: n + 1 }, (_, i) => { const a = (from + (to - from) * i / n) * Math.PI / 180; return [5 + 5 * Math.cos(a), 7 + 7 * Math.sin(a)]; });
const FONT = {
  A: [[[0, 14], [5, 0], [10, 14]], [[2, 9], [8, 9]]],
  C: [ell(-45, -315)],
  D: [[[0, 0], [0, 14], [5, 14], [8.5, 12], [10, 7], [8.5, 2], [5, 0], [0, 0]]],
  E: [[[10, 0], [0, 0], [0, 14], [10, 14]], [[0, 7], [8, 7]]],
  F: [[[10, 0], [0, 0], [0, 14]], [[0, 7], [8, 7]]],
  G: [ell(-45, -360).concat([[6, 7]])],
  H: [[[0, 0], [0, 14]], [[10, 0], [10, 14]], [[0, 7], [10, 7]]],
  I: [[[5, 0], [5, 14]]],
  L: [[[0, 0], [0, 14], [10, 14]]],
  M: [[[0, 14], [0, 0], [5, 9], [10, 0], [10, 14]]],
  N: [[[0, 14], [0, 0], [10, 14], [10, 0]]],
  O: [ell(0, 360, 28)],
  P: [[[0, 14], [0, 0], [6.5, 0], [9.3, 1.3], [10, 3.6], [9.3, 5.8], [6.5, 7], [0, 7]]],
  R: [[[0, 14], [0, 0], [6.5, 0], [9.3, 1.3], [10, 3.6], [9.3, 5.8], [6.5, 7], [0, 7]], [[5, 7], [10, 14]]],
  S: [[[9.6, 2.2], [8, 0.4], [5, 0], [2, 0.5], [0.4, 2.4], [0.8, 4.8], [3, 6.2], [7, 7.6], [9.4, 9], [10, 11.4], [8.6, 13.4], [5, 14], [2, 13.6], [0.3, 11.8]]],
  T: [[[0, 0], [10, 0]], [[5, 0], [5, 14]]],
  U: [[[0, 0], [0, 10], [1.5, 13], [5, 14], [8.5, 13], [10, 10], [10, 0]]],
  W: [[[0, 0], [2.5, 14], [5, 5], [7.5, 14], [10, 0]]],
  Y: [[[0, 0], [5, 7], [10, 0]], [[5, 7], [5, 14]]],
};
function text(cv, color, str, x, y, h, weight, gap = 3.2) {
  const L = cv.layer(color), k = h / 14, r = weight / 2;
  for (const ch of str) {
    if (ch === ' ') { x += 6 * k; continue; }
    if (ch === '·') { circle(cv, L, x + 3 * k, y + 7 * k, r * 1.1); x += 6 * k + gap * k; continue; }
    const narrow = ch === 'I';
    for (const stroke of FONT[ch]) polyline(cv, L, stroke.map(([px, py]) => [x + (narrow ? px - 4 : px) * k, y + py * k]), r);
    x += (narrow ? 2 : 10) * k + gap * k;
  }
  return x;
}

fs.mkdirSync(OUT, { recursive: true });

// Social share image 1200 × 630.
const og = canvas(1200, 630, NAVY);
mark(og, WHITE, 90, 165, 300);
text(og, WHITE, 'GS MANPOWER', 430, 236, 66, 12, 3);
text(og, STEEL_LIGHT, 'STAFFING · HEALTHCARE · INDUSTRY', 434, 340, 23, 4.2, 3.4);
capsule(og, og.layer(SAFFRON), 436, 400, 600, 400, 5);
og.png(path.join(OUT, 'og-image.png'));

// Home-screen icons: navy G on paper (primary colours), mark only.
for (const [name, size] of [['apple-touch-icon.png', 180], ['icon-192.png', 192], ['icon-512.png', 512]]) {
  const ic = canvas(size, size, PAPER);
  const k = (size * 0.78) / 36.5; // the mark spans 36.5 of its 48 units
  mark(ic, NAVY, size * 0.11 - 5.75 * k, size * 0.11 - 5.75 * k, 48 * k);
  ic.png(path.join(OUT, name));
}
// Browser-tab icons: white G on a navy rounded square, readable on light and dark tabs.
function tabIcon(size) {
  const ic = canvas(size, size, NAVY, size * 0.22);
  const k = (size * 0.8) / 36.5;
  mark(ic, WHITE, size * 0.1 - 5.75 * k, size * 0.1 - 5.75 * k, 48 * k);
  return ic;
}
tabIcon(32).png(path.join(OUT, 'favicon-32.png'));
// favicon.ico holding 16, 32 and 48 px PNGs (served from the site root for browsers that ask for /favicon.ico).
const sizes = [16, 32, 48];
const pngs = sizes.map((sz) => tabIcon(sz).png());
const head = Buffer.alloc(6 + 16 * sizes.length);
head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(sizes.length, 4);
let offset = head.length;
sizes.forEach((sz, i) => {
  const e = 6 + 16 * i;
  head[e] = sz; head[e + 1] = sz; head.writeUInt16LE(1, e + 4); head.writeUInt16LE(32, e + 6);
  head.writeUInt32LE(pngs[i].length, e + 8); head.writeUInt32LE(offset, e + 12); offset += pngs[i].length;
});
fs.writeFileSync(path.join(OUT, 'favicon.ico'), Buffer.concat([head, ...pngs]));
console.log('Wrote og-image.png, apple-touch-icon.png, icon-192.png, icon-512.png, favicon-32.png, favicon.ico');

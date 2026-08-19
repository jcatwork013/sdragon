// ── tiny math / timing helpers ───────────────────────────────────────────────
export const TAU = Math.PI * 2;
export const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
export const lerp  = (a, b, t) => a + (b - a) * t;
export const inv   = (a, b, v) => (v - a) / (b - a || 1);
export const rand  = (a = 1, b = 0) => b + Math.random() * (a - b);
export const randInt = (n) => (Math.random() * n) | 0;
export const pick  = (arr) => arr[(Math.random() * arr.length) | 0];
export const dist  = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);

// frame-rate independent approach: t = 1 - pow(k, dt)
export const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.pow(k, dt));

// ── easing ───────────────────────────────────────────────────────────────────
export const ease = {
  linear:  t => t,
  inQuad:  t => t * t,
  outQuad: t => t * (2 - t),
  inOut:   t => t < .5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  outCubic:t => 1 - Math.pow(1 - t, 3),
  inCubic: t => t * t * t,
  outQuart:t => 1 - Math.pow(1 - t, 4),
  outBack: t => { const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
  inBack:  t => { const c = 1.9; return (c + 1) * t * t * t - c * t * t; },
  outElastic: t => t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - .75) * (TAU / 3)) + 1,
  outBounce: t => {
    const n = 7.5625, d = 2.75;
    if (t < 1 / d) return n * t * t;
    if (t < 2 / d) return n * (t -= 1.5 / d) * t + .75;
    if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + .9375;
    return n * (t -= 2.625 / d) * t + .984375;
  },
};

// ── deterministic RNG (seeded) — used for stable background scenery ─────────
export function mulberry32(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ── colour ───────────────────────────────────────────────────────────────────
export function shade(hex, amt) {           // amt: -1 (black) … +1 (white)
  const n = parseInt(hex.slice(1), 16);
  let r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255;
  const t = amt < 0 ? 0 : 255, p = Math.abs(amt);
  r = Math.round(lerp(r, t, p)); g = Math.round(lerp(g, t, p)); b = Math.round(lerp(b, t, p));
  return `rgb(${r},${g},${b})`;
}
export const rgba = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`;
};

// ── canvas helpers ───────────────────────────────────────────────────────────
export function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y,     x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x,     y + h, rr);
  ctx.arcTo(x,     y + h, x,     y,     rr);
  ctx.arcTo(x,     y,     x + w, y,     rr);
  ctx.closePath();
}
export function poly(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
}
export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}
/** Text with an outline + drop shadow — the chunky casual-game look. */
export function strokeText(ctx, text, x, y, {
  font = '800 40px "Baloo 2"', fill = '#fff', stroke = '#000', lw = 6,
  align = 'center', baseline = 'alphabetic', shadow = 'rgba(0,0,0,.45)', sy = 4,
} = {}) {
  ctx.save();
  ctx.font = font; ctx.textAlign = align; ctx.textBaseline = baseline;
  ctx.lineJoin = 'round'; ctx.miterLimit = 2;
  if (shadow) { ctx.fillStyle = shadow; ctx.fillText(text, x, y + sy); }
  if (lw > 0) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.strokeText(text, x, y); }
  ctx.fillStyle = fill; ctx.fillText(text, x, y);
  ctx.restore();
}

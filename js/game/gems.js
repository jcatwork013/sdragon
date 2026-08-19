// ── Đá quý vẽ bằng code ──────────────────────────────────────────────────────
// 6 họ gem: KHÁC MÀU **và** KHÁC HÌNH → người mù màu vẫn chơi được.
// Mỗi gem được render sẵn 1 lần ra canvas ngoài màn hình rồi tái sử dụng.
import { TAU, poly, makeCanvas, shade, rgba, clamp, lerp } from '../core/util.js';
import { perf } from '../core/perf.js';

export const GEMS = [
  { id:'sapphire', name:'Lam Ngọc', name_en:'Sapphire',  base:'#2f7ff0', lite:'#bfe0ff', dark:'#0d2f6b', spark:'#eaf5ff', shape:'round'    },
  { id:'amethyst', name:'Tử Tinh', name_en:'Amethyst',   base:'#a34df0', lite:'#e8c2ff', dark:'#43126f', spark:'#f8e9ff', shape:'marquise' },
  { id:'ruby',     name:'Huyết Ngọc', name_en:'Ruby',base:'#f03560', lite:'#ffc0cf', dark:'#750b28', spark:'#ffeaf0', shape:'pear'     },
  { id:'topaz',    name:'Hoàng Tinh', name_en:'Topaz',base:'#f5a51e', lite:'#ffe6a8', dark:'#7d4405', spark:'#fff6dd', shape:'hex'      },
  { id:'emerald',  name:'Bích Ngọc', name_en:'Emerald', base:'#25c777', lite:'#b6ffd8', dark:'#075131', spark:'#e8fff4', shape:'emerald'  },
  { id:'aqua',     name:'Thủy Tinh', name_en:'Aquamarine', base:'#1ed2d8', lite:'#b4ffff', dark:'#065a63', spark:'#e6ffff', shape:'trillion' },
];
export const GEM_COUNT = GEMS.length;

// ── loại gem đặc biệt ────────────────────────────────────────────────────────
export const SP = { NONE:0, LINE_H:1, LINE_V:2, CROSS:3, BOMB:4 };

/** Vật phẩm bất ngờ gắn thêm trên một viên đá — phá viên đó là nhận thưởng. */
export const TOKEN = { NONE:0, CLOCK:1, COIN:2, STAR:3 };
export const TOKEN_INFO = {
  [TOKEN.CLOCK]: { colour:'#ffd23f', ring:'#7a4a05' },
  [TOKEN.COIN]:  { colour:'#ffd23f', ring:'#8a5c00' },
  [TOKEN.STAR]:  { colour:'#8ef08a', ring:'#0d3a16' },
};

const circle = (n) => Array.from({ length: n }, (_, i) => {
  const a = -Math.PI / 2 + i / n * TAU;
  return [Math.cos(a), Math.sin(a)];
});

const SHAPES = {
  round:    circle(10),
  marquise: [[0,-1],[.35,-.55],[.5,0],[.35,.55],[0,1],[-.35,.55],[-.5,0],[-.35,-.55]],
  pear:     [[0,-1],[.34,-.5],[.55,.1],[.42,.62],[0,.92],[-.42,.62],[-.55,.1],[-.34,-.5]],
  hex:      circle(6),
  emerald:  [[-.42,-.9],[.42,-.9],[.72,-.6],[.72,.6],[.42,.9],[-.42,.9],[-.72,.6],[-.72,-.6]],
  trillion: [[0,-1],[.5,-.29],[.87,.5],[0,.58],[-.87,.5],[-.5,-.29]],
};

const SPRITE = 128;          // độ phân giải render sẵn — thừa cho ô 64px @2x DPR
const LIGHT  = -Math.PI * 0.72;   // hướng nguồn sáng (trên-trái)

/** Vẽ 1 viên đá cắt giác: thân → các mặt cắt → mặt bàn → chớp sáng → viền. */
function renderGem(ctx, g, R) {
  const pts = SHAPES[g.shape].map(([x, y]) => [x * R, y * R]);
  const table = pts.map(([x, y]) => [x * 0.5, y * 0.5]);   // "mặt bàn" ở giữa
  const n = pts.length;

  // bóng đổ mềm
  ctx.save();
  ctx.globalAlpha = 0.30;
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.ellipse(0, R * 0.86, R * 0.72, R * 0.24, 0, 0, TAU); ctx.fill();
  ctx.restore();

  // thân đá
  const body = ctx.createLinearGradient(-R, -R, R, R);
  body.addColorStop(0, g.lite); body.addColorStop(.42, g.base); body.addColorStop(1, g.dark);
  poly(ctx, pts); ctx.fillStyle = body; ctx.fill();

  // các mặt cắt — độ sáng phụ thuộc hướng mặt so với nguồn sáng
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const quad = [pts[i], pts[j], table[j], table[i]];
    const cx = (pts[i][0] + pts[j][0]) / 2, cy = (pts[i][1] + pts[j][1]) / 2;
    const lit = clamp(0.5 + 0.5 * Math.cos(Math.atan2(cy, cx) - LIGHT), 0, 1);
    poly(ctx, quad);
    ctx.fillStyle = lit > 0.5 ? rgba('#ffffff', (lit - .5) * 0.78)
                              : `rgba(0,0,0,${(.5 - lit) * 0.5})`;
    ctx.fill();
    ctx.strokeStyle = rgba('#ffffff', 0.14); ctx.lineWidth = R * 0.035; ctx.stroke();
  }

  // mặt bàn
  const tg = ctx.createLinearGradient(-R * .5, -R * .5, R * .5, R * .5);
  tg.addColorStop(0, shade(g.lite, .35)); tg.addColorStop(.55, g.base); tg.addColorStop(1, shade(g.dark, .12));
  poly(ctx, table); ctx.fillStyle = tg; ctx.fill();
  ctx.strokeStyle = rgba('#ffffff', .38); ctx.lineWidth = R * .045; ctx.stroke();

  // chớp sáng chính + phụ
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = rgba('#ffffff', .62);
  ctx.beginPath(); ctx.ellipse(-R * .3, -R * .42, R * .24, R * .13, -0.7, 0, TAU); ctx.fill();
  ctx.fillStyle = rgba('#ffffff', .30);
  ctx.beginPath(); ctx.ellipse(R * .28, R * .3, R * .12, R * .07, -0.7, 0, TAU); ctx.fill();
  ctx.restore();

  // viền ngoài
  poly(ctx, pts);
  ctx.strokeStyle = rgba('#000000', .5); ctx.lineWidth = R * .075; ctx.stroke();
  ctx.strokeStyle = rgba(g.lite, .55);   ctx.lineWidth = R * .032; ctx.stroke();
}

/** Cache sprite — build 1 lần lúc khởi động. */
const cache = [];
export function buildGemSprites() {
  if (cache.length) return cache;
  for (const g of GEMS) {
    const c = makeCanvas(SPRITE, SPRITE);
    const ctx = c.getContext('2d');
    ctx.translate(SPRITE / 2, SPRITE / 2 - SPRITE * 0.03);
    renderGem(ctx, g, SPRITE * 0.40);
    cache.push(c);
  }
  return cache;
}

/**
 * Vẽ 1 gem lên bàn cờ.
 * @param {number} type   chỉ số họ gem
 * @param {number} size   cạnh ô
 * @param {object} o      { special, t (thời gian), scale, alpha, rot, glow, hint }
 */
export function drawGem(ctx, type, x, y, size, o = {}) {
  const spr = cache[type] || buildGemSprites()[type];
  const g = GEMS[type];
  const s  = (o.scale ?? 1);
  const a  = (o.alpha ?? 1);
  if (a <= 0.01 || s <= 0.01) return;
  const d = size * 1.02 * s;

  ctx.save();
  ctx.translate(x, y);
  if (o.rot) ctx.rotate(o.rot);
  ctx.globalAlpha = a;

  if (o.glow) {                                   // hào quang khi được chọn / gợi ý
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = a * o.glow;
    const rg = ctx.createRadialGradient(0, 0, d * .18, 0, 0, d * .78);
    rg.addColorStop(0, rgba(g.lite, .95)); rg.addColorStop(1, rgba(g.base, 0));
    ctx.fillStyle = rg;
    ctx.beginPath(); ctx.arc(0, 0, d * .78, 0, TAU); ctx.fill();
    ctx.restore();
  }

  ctx.drawImage(spr, -d / 2, -d / 2, d, d);

  // ánh lấp lánh chạy ngang — nhịp lệch nhau theo từng viên
  const t = o.t ?? 0;
  const ph = (t * 0.55 + type * 0.37 + (o.seed ?? 0)) % 3.4;
  if (ph < 0.8 && perf.wantShimmer) {
    const k = ph / 0.8, w = d * 0.24;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = a * Math.sin(k * Math.PI) * 0.55;
    const lg = ctx.createLinearGradient(-d / 2, 0, d / 2, 0);
    const c0 = clamp(k - .12, 0, 1), c1 = clamp(k + .12, 0, 1);
    lg.addColorStop(0, 'rgba(255,255,255,0)');
    lg.addColorStop(c0, 'rgba(255,255,255,0)');
    lg.addColorStop(clamp(k, c0, c1), g.spark);
    lg.addColorStop(c1, 'rgba(255,255,255,0)');
    lg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = lg;
    ctx.beginPath(); ctx.arc(0, 0, d * .46, 0, TAU); ctx.fill();
    ctx.restore();
  }

  if (o.special) drawSpecialMark(ctx, o.special, d, t, g);
  if (o.token) drawToken(ctx, o.token, d, t);
  ctx.restore();
}

/** Huy hiệu vật phẩm gắn ở góc viên đá. */
function drawToken(ctx, tk, d, t) {
  const info = TOKEN_INFO[tk]; if (!info) return;
  const r = d * .20, bx = d * .27, by = -d * .27;
  const pop = 1 + .10 * Math.sin(t * 7);
  ctx.save();
  ctx.translate(bx, by); ctx.scale(pop, pop);
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU);
  ctx.fillStyle = '#fffbe8'; ctx.fill();
  ctx.strokeStyle = info.ring; ctx.lineWidth = r * .28; ctx.stroke();
  ctx.strokeStyle = info.colour; ctx.lineWidth = r * .16; ctx.stroke();
  ctx.strokeStyle = info.ring; ctx.lineWidth = r * .22; ctx.lineCap = 'round';
  if (tk === TOKEN.CLOCK) {
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -r * .48); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(r * .40, r * .22); ctx.stroke();
  } else if (tk === TOKEN.COIN) {
    ctx.fillStyle = info.colour;
    ctx.beginPath(); ctx.arc(0, 0, r * .46, 0, TAU); ctx.fill();
  } else {
    ctx.fillStyle = info.colour;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .24 : r * .55;
      i ? ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

/**
 * Dấu hiệu đá đặc biệt — vẽ động mỗi khung hình (không nướng vào sprite) để
 * có được hào quang đập nhịp, tia sáng chạy và lấp lánh.
 */
function drawSpecialMark(ctx, sp, d, t, g) {
  ctx.save();
  const pulse = .78 + .22 * Math.sin(t * 5.5);

  // ── TRỨNG LĂNG KÍNH: cầu pha lê tán sắc ────────────────────────────────
  if (sp === SP.BOMB) {
    // quầng sáng ngoài
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const halo = ctx.createRadialGradient(0, 0, d * .18, 0, 0, d * .78);
    halo.addColorStop(0, `rgba(255,255,255,${.30 * pulse})`);
    halo.addColorStop(.55, `rgba(180,150,255,${.20 * pulse})`);
    halo.addColorStop(1, 'rgba(180,150,255,0)');
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(0, 0, d * .78, 0, TAU); ctx.fill();
    ctx.restore();

    // lõi tối để cầu vồng nổi lên
    ctx.beginPath(); ctx.arc(0, 0, d * .34, 0, TAU);
    const core = ctx.createRadialGradient(-d * .10, -d * .12, d * .02, 0, 0, d * .34);
    core.addColorStop(0, '#3a2a5c'); core.addColorStop(1, '#100a1e');
    ctx.fillStyle = core; ctx.fill();

    // vành tán sắc quay — cắt thành VÀNH KHUYÊN để lõi trắng không bị tia cắt ngang
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, d * .34, 0, TAU);
    ctx.arc(0, 0, d * .19, 0, TAU, true);
    ctx.clip('evenodd');
    ctx.rotate(t * 1.15);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 12; i++) {
      ctx.save(); ctx.rotate(i / 12 * TAU);
      const gg = ctx.createLinearGradient(0, 0, d * .38, 0);
      gg.addColorStop(0, `hsla(${i * 30},100%,72%,0)`);
      gg.addColorStop(.55, `hsla(${i * 30},100%,68%,${.85 * pulse})`);
      gg.addColorStop(1, `hsla(${i * 30 + 20},100%,60%,0)`);
      ctx.fillStyle = gg;
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.arc(0, 0, d * .38, -0.16, 0.16); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    ctx.restore();

    // mặt cắt pha lê + viền
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(255,255,255,${.55 * pulse})`; ctx.lineWidth = d * .022;
    ctx.beginPath(); ctx.arc(0, 0, d * .34, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, d * .19, 0, TAU);
    ctx.strokeStyle = `rgba(255,255,255,${.45 * pulse})`; ctx.lineWidth = d * .016; ctx.stroke();
    // lõi trắng chói
    const wc = ctx.createRadialGradient(-d * .04, -d * .05, 0, 0, 0, d * .19);
    wc.addColorStop(0, `rgba(255,255,255,${pulse})`);
    wc.addColorStop(.55, `rgba(226,214,255,${.85 * pulse})`);
    wc.addColorStop(1, `rgba(170,140,255,${.35 * pulse})`);
    ctx.fillStyle = wc; ctx.beginPath(); ctx.arc(0, 0, d * .19, 0, TAU); ctx.fill();
    ctx.fillStyle = `rgba(255,255,255,${.9 * pulse})`;
    ctx.beginPath(); ctx.ellipse(-d * .06, -d * .07, d * .045, d * .028, -.6, 0, TAU); ctx.fill();
    // 4 tia chớp toả RA NGOÀI vành, không đi qua lõi
    ctx.save();
    ctx.rotate(t * .5);
    ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      ctx.save(); ctx.rotate(i / 4 * TAU);
      const sg2 = ctx.createLinearGradient(0, -d * .36, 0, -d * .52);
      sg2.addColorStop(0, `rgba(255,255,255,${.85 * pulse})`);
      sg2.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.strokeStyle = sg2; ctx.lineWidth = d * .028;
      ctx.beginPath(); ctx.moveTo(0, -d * .36); ctx.lineTo(0, -d * .52); ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
    ctx.restore();
    ctx.restore();
    return;
  }

  // ── KẺ SỌC / CHỮ THẬP: luồng năng lượng chạy trong lòng đá ─────────────
  const beam = (horiz) => {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    if (!horiz) ctx.rotate(Math.PI / 2);
    const L = d * .46, th = d * .17;
    // thân luồng
    const bg = ctx.createLinearGradient(-L, 0, L, 0);
    bg.addColorStop(0, 'rgba(255,240,190,0)');
    bg.addColorStop(.22, `rgba(255,236,160,${.55 * pulse})`);
    bg.addColorStop(.5,  `rgba(255,255,255,${.92 * pulse})`);
    bg.addColorStop(.78, `rgba(255,236,160,${.55 * pulse})`);
    bg.addColorStop(1, 'rgba(255,240,190,0)');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.moveTo(-L, 0);
    ctx.quadraticCurveTo(-L * .3, -th, 0, -th * .62);
    ctx.quadraticCurveTo(L * .3, -th, L, 0);
    ctx.quadraticCurveTo(L * .3, th, 0, th * .62);
    ctx.quadraticCurveTo(-L * .3, th, -L, 0);
    ctx.closePath(); ctx.fill();
    // vệt sáng chạy dọc luồng
    const run = ((t * 1.7) % 1) * 2 - 1;
    const sg = ctx.createRadialGradient(run * L, 0, 0, run * L, 0, d * .22);
    sg.addColorStop(0, 'rgba(255,255,255,.95)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sg;
    ctx.beginPath(); ctx.ellipse(run * L, 0, d * .22, th * .9, 0, 0, TAU); ctx.fill();
    // mũi tên hai đầu
    ctx.strokeStyle = `rgba(255,255,255,${.95 * pulse})`;
    ctx.lineWidth = d * .055; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const sgn of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sgn * (L - d * .17), -d * .11);
      ctx.lineTo(sgn * L, 0);
      ctx.lineTo(sgn * (L - d * .17), d * .11);
      ctx.stroke();
    }
    ctx.restore();
  };

  if (sp === SP.LINE_H) beam(true);
  if (sp === SP.LINE_V) beam(false);
  if (sp === SP.CROSS) {
    beam(true); beam(false);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.rotate(t * .9);
    const rg = ctx.createRadialGradient(0, 0, d * .04, 0, 0, d * .22);
    rg.addColorStop(0, `rgba(255,255,255,${pulse})`);
    rg.addColorStop(1, 'rgba(255,220,140,0)');
    ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(0, 0, d * .22, 0, TAU); ctx.fill();
    ctx.strokeStyle = `rgba(255,246,200,${.8 * pulse})`; ctx.lineWidth = d * .026;
    ctx.beginPath(); ctx.arc(0, 0, d * .155, 0, TAU); ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

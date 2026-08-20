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

const SPRITE = 192;          // độ phân giải render sẵn — dư cho ô 80px @2x DPR
const LIGHT  = -Math.PI * 0.72;   // hướng nguồn sáng (trên-trái)
/**
 * Vẽ 1 viên đá cắt giác kiểu "brilliant": bóng đổ → thân → đáy (pavilion) →
 * HAI vành mặt cắt lệch pha nhau → vành đai → mặt bàn → chớp sáng → viền.
 *
 * Chỗ ăn tiền là hai vành mặt cắt: vành trong sáng ngược pha với vành ngoài,
 * tạo ra lưới sáng-tối xen kẽ — đúng cái làm mắt đọc ra "đá quý có giác cắt"
 * chứ không phải "hình đa giác tô gradient".
 */
function renderGem(ctx, g, R) {
  // giữ nguyên mọi góc của hình gốc, chỉ chèn thêm điểm giữa các cạnh dài
  const src = [];
  {
    const p = SHAPES[g.shape];
    for (let i = 0; i < p.length; i++) {
      const a = p[i], b = p[(i + 1) % p.length];
      const k = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.52));
      for (let m = 0; m < k; m++) src.push([lerp(a[0], b[0], m / k), lerp(a[1], b[1], m / k)]);
    }
  }
  const ring = (k) => src.map(([x, y]) => [x * R * k, y * R * k]);
  const pts    = ring(1);        // mép ngoài
  const girdle = ring(0.94);     // vành đai
  const mid    = ring(0.70);     // vành giác giữa
  const table  = ring(0.40);     // mặt bàn
  const n = pts.length;
  const lit = (x, y, phase = 0) => clamp(0.5 + 0.5 * Math.cos(Math.atan2(y, x) - LIGHT + phase), 0, 1);

  // bóng đổ mềm
  ctx.save();
  const sh = ctx.createRadialGradient(0, R * 0.86, 0, 0, R * 0.86, R * 0.78);
  sh.addColorStop(0, 'rgba(0,0,0,.40)'); sh.addColorStop(.6, 'rgba(0,0,0,.20)');
  sh.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sh;
  ctx.save(); ctx.translate(0, R * 0.86); ctx.scale(1, 0.30); ctx.translate(0, -R * 0.86);
  ctx.beginPath(); ctx.arc(0, R * 0.86, R * 0.78, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.restore();

  // ── thân: sáng ở đỉnh trên-trái, đậm dần xuống đáy ────────────────────────
  poly(ctx, pts);
  const body = ctx.createRadialGradient(-R * .34, -R * .40, R * .05, 0, R * .12, R * 1.32);
  body.addColorStop(0, shade(g.lite, .30));
  body.addColorStop(.34, g.base);
  body.addColorStop(1, g.dark);
  ctx.fillStyle = body; ctx.fill();

  // ── đáy đá: ánh màu dội ngược lên, làm viên đá "trong" chứ không đặc ─────
  ctx.save();
  poly(ctx, pts); ctx.clip();
  ctx.globalCompositeOperation = 'lighter';
  const up = ctx.createRadialGradient(R * .10, R * .62, 0, R * .10, R * .62, R * .82);
  up.addColorStop(0, rgba(g.base, .55)); up.addColorStop(1, rgba(g.base, 0));
  ctx.fillStyle = up;
  ctx.beginPath(); ctx.arc(R * .10, R * .62, R * .82, 0, TAU); ctx.fill();
  ctx.restore();

  // ── vành giác NGOÀI: mép ngoài → vành giữa ───────────────────────────────
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const cx = (pts[i][0] + pts[j][0]) / 2, cy = (pts[i][1] + pts[j][1]) / 2;
    const k = lit(cx, cy);
    poly(ctx, [pts[i], pts[j], mid[j], mid[i]]);
    ctx.fillStyle = k > .5 ? rgba('#ffffff', (k - .5) * 1.00)
                           : `rgba(10,5,26,${(.5 - k) * 0.42})`;
    ctx.fill();
  }
  // ── vành giác TRONG: lệch pha nửa vòng → sáng/tối cài răng lược ──────────
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const cx = (mid[i][0] + mid[j][0]) / 2, cy = (mid[i][1] + mid[j][1]) / 2;
    const k = lit(cx, cy, Math.PI * .62);
    poly(ctx, [mid[i], mid[j], table[j], table[i]]);
    ctx.fillStyle = k > .5 ? rgba('#ffffff', (k - .5) * 0.78)
                           : `rgba(10,5,26,${(.5 - k) * 0.34})`;
    ctx.fill();
  }
  // gân giác — nét mảnh sáng dọc các cạnh giác, thứ làm đá "sắc"
  ctx.strokeStyle = rgba('#ffffff', .22); ctx.lineWidth = R * .022;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    ctx.moveTo(pts[i][0], pts[i][1]); ctx.lineTo(mid[i][0], mid[i][1]);
    ctx.lineTo(table[i][0], table[i][1]);
  }
  ctx.stroke();

  // ── vành đai: dải sáng mảnh chạy quanh mép, tách đá khỏi nền ─────────────
  ctx.save();
  poly(ctx, pts); ctx.clip();
  poly(ctx, girdle);
  ctx.strokeStyle = rgba(g.lite, .58); ctx.lineWidth = R * .085; ctx.stroke();
  ctx.restore();

  // ── mặt bàn ──────────────────────────────────────────────────────────────
  poly(ctx, table);
  const tg = ctx.createLinearGradient(-R * .42, -R * .46, R * .38, R * .42);
  tg.addColorStop(0, shade(g.lite, .48));
  tg.addColorStop(.46, shade(g.base, .12));
  tg.addColorStop(1, shade(g.dark, .18));
  ctx.fillStyle = tg; ctx.fill();
  ctx.strokeStyle = rgba('#ffffff', .48); ctx.lineWidth = R * .042; ctx.stroke();

  // ── chớp sáng: một vệt mềm + một ngôi sao 4 cánh sắc ─────────────────────
  ctx.save();
  poly(ctx, pts); ctx.clip();                       // <- không có dòng này thì sáng tràn ra nền
  ctx.globalCompositeOperation = 'lighter';
  const hi = ctx.createRadialGradient(-R * .28, -R * .38, 0, -R * .28, -R * .38, R * .40);
  hi.addColorStop(0, 'rgba(255,255,255,.78)'); hi.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = hi;
  ctx.beginPath(); ctx.ellipse(-R * .28, -R * .38, R * .32, R * .19, -0.7, 0, TAU); ctx.fill();
  // ngôi sao lấp lánh — 4 cánh nhọn, hai trục dài ngắn khác nhau cho tự nhiên
  ctx.translate(-R * .26, -R * .36); ctx.rotate(-0.36);
  ctx.fillStyle = 'rgba(255,255,255,.92)';
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * TAU, rr = i % 2 ? R * .035 : (i % 4 === 0 ? R * .30 : R * .19);
    i ? ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath(); ctx.fill();
  ctx.restore();
  // chớp phụ ở đáy đối diện
  ctx.save();
  poly(ctx, pts); ctx.clip();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = rgba('#ffffff', .30);
  ctx.beginPath(); ctx.ellipse(R * .28, R * .32, R * .14, R * .08, -0.7, 0, TAU); ctx.fill();
  ctx.restore();

  // ── viền ngoài: nét tối dày + nét màu mảnh phía trong ───────────────────
  poly(ctx, pts);
  ctx.strokeStyle = rgba('#000000', .55); ctx.lineWidth = R * .085;
  ctx.lineJoin = 'round'; ctx.stroke();
  ctx.strokeStyle = rgba(g.lite, .62);   ctx.lineWidth = R * .030; ctx.stroke();
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
    const k = ph / 0.8;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = a * Math.sin(k * Math.PI) * 0.42;
    const lg = ctx.createLinearGradient(-d / 2, 0, d / 2, 0);
    const c0 = clamp(k - .12, 0, 1), c1 = clamp(k + .12, 0, 1);
    lg.addColorStop(0, 'rgba(255,255,255,0)');
    lg.addColorStop(c0, 'rgba(255,255,255,0)');
    lg.addColorStop(clamp(k, c0, c1), g.spark);
    lg.addColorStop(c1, 'rgba(255,255,255,0)');
    lg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = lg;
    ctx.beginPath(); ctx.arc(0, 0, d * .34, 0, TAU); ctx.fill();
    ctx.restore();
  }

  if (o.special) drawSpecialMark(ctx, o.special, d, t, g);
  if (o.token) drawToken(ctx, o.token, d, t);
  ctx.restore();
}

/** Huy hiệu vật phẩm gắn ở góc viên đá — nhìn là biết phá viên này được gì. */
function drawToken(ctx, tk, d, t) {
  const info = TOKEN_INFO[tk]; if (!info) return;
  const r = d * .21, bx = d * .27, by = -d * .27;
  const pop = 1 + .08 * Math.sin(t * 7);
  ctx.save();
  ctx.translate(bx, by); ctx.scale(pop, pop);

  // bóng đổ — tách huy hiệu khỏi viên đá bên dưới
  ctx.fillStyle = 'rgba(0,0,0,.38)';
  ctx.beginPath(); ctx.arc(r * .10, r * .16, r, 0, TAU); ctx.fill();

  // vành kim loại
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU);
  const ring = ctx.createLinearGradient(0, -r, 0, r);
  ring.addColorStop(0, shade(info.colour, .55));
  ring.addColorStop(.5, info.colour);
  ring.addColorStop(1, shade(info.ring, .10));
  ctx.fillStyle = ring; ctx.fill();
  ctx.strokeStyle = info.ring; ctx.lineWidth = r * .17; ctx.stroke();

  // mặt trong sáng, hơi lõm
  ctx.beginPath(); ctx.arc(0, 0, r * .70, 0, TAU);
  // mặt trong luôn màu kem, KHÔNG ăn theo màu huy hiệu — nếu ăn theo thì sao
  // xanh nằm trên nền xanh, đồng vàng nằm trên nền vàng, nhìn không ra hình gì.
  const face = ctx.createLinearGradient(0, -r * .7, 0, r * .7);
  face.addColorStop(0, '#fffdf3'); face.addColorStop(1, '#f2e2bc');
  ctx.fillStyle = face; ctx.fill();
  ctx.strokeStyle = rgba('#000000', .28); ctx.lineWidth = r * .07; ctx.stroke();

  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (tk === TOKEN.CLOCK) {
    ctx.strokeStyle = info.ring; ctx.lineWidth = r * .13;
    for (let i = 0; i < 4; i++) {                       // vạch giờ
      const a = i * Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * .56, Math.sin(a) * r * .56);
      ctx.lineTo(Math.cos(a) * r * .44, Math.sin(a) * r * .44);
      ctx.stroke();
    }
    ctx.lineWidth = r * .17;
    ctx.beginPath(); ctx.moveTo(0, r * .04); ctx.lineTo(0, -r * .40); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, r * .04); ctx.lineTo(r * .32, r * .18); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, r * .02, r * .09, 0, TAU); ctx.fillStyle = info.ring; ctx.fill();
  } else if (tk === TOKEN.COIN) {
    ctx.beginPath(); ctx.arc(0, 0, r * .46, 0, TAU);
    const cg = ctx.createLinearGradient(0, -r * .5, 0, r * .5);
    cg.addColorStop(0, shade(info.colour, .45)); cg.addColorStop(1, shade(info.colour, -.18));
    ctx.fillStyle = cg; ctx.fill();
    ctx.strokeStyle = info.ring; ctx.lineWidth = r * .13; ctx.stroke();
    ctx.strokeStyle = rgba('#ffffff', .75); ctx.lineWidth = r * .08;
    ctx.beginPath(); ctx.arc(0, 0, r * .26, Math.PI * .9, Math.PI * 1.75); ctx.stroke();
  } else {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .24 : r * .56;
      i ? ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
    const sg = ctx.createLinearGradient(0, -r * .56, 0, r * .56);
    sg.addColorStop(0, shade(info.colour, .50)); sg.addColorStop(1, shade(info.colour, -.20));
    ctx.fillStyle = sg; ctx.fill();
    ctx.strokeStyle = info.ring; ctx.lineWidth = r * .13; ctx.lineJoin = 'round'; ctx.stroke();
  }
  // chớp sáng trên vành
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  ctx.beginPath(); ctx.ellipse(-r * .34, -r * .58, r * .30, r * .13, -.5, 0, TAU); ctx.fill();
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
    for (let i = 0; i < 18; i++) {
      ctx.save(); ctx.rotate(i / 18 * TAU);
      const gg = ctx.createLinearGradient(0, 0, d * .38, 0);
      gg.addColorStop(0, `hsla(${i * 20},100%,74%,0)`);
      gg.addColorStop(.55, `hsla(${i * 20},100%,70%,${.9 * pulse})`);
      gg.addColorStop(1, `hsla(${i * 20 + 18},100%,62%,0)`);
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
    wc.addColorStop(.42, `rgba(240,232,255,${.95 * pulse})`);
    wc.addColorStop(1, `rgba(170,140,255,${.42 * pulse})`);
    ctx.fillStyle = wc; ctx.beginPath(); ctx.arc(0, 0, d * .19, 0, TAU); ctx.fill();
    ctx.fillStyle = `rgba(255,255,255,${.9 * pulse})`;
    ctx.beginPath(); ctx.ellipse(-d * .06, -d * .07, d * .045, d * .028, -.6, 0, TAU); ctx.fill();
    // 4 tia chớp toả RA NGOÀI vành, không đi qua lõi
    // Tia chớp: 8 tia dài–ngắn xen kẽ, quay ngược chiều vành tán sắc. Hai lớp
    // quay ngược nhau làm viên đá lúc nào cũng nhấp nháy, không bao giờ đứng im.
    ctx.save();
    ctx.rotate(-t * .62);
    ctx.lineCap = 'round';
    for (let i = 0; i < 8; i++) {
      const long = i % 2 === 0;
      const r0 = d * .34, r1 = d * (long ? .56 : .45);
      ctx.save(); ctx.rotate(i / 8 * TAU);
      const sg2 = ctx.createLinearGradient(0, -r0, 0, -r1);
      sg2.addColorStop(0, `rgba(255,255,255,${(long ? .92 : .62) * pulse})`);
      sg2.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.strokeStyle = sg2; ctx.lineWidth = d * (long ? .030 : .020);
      ctx.beginPath(); ctx.moveTo(0, -r0); ctx.lineTo(0, -r1); ctx.stroke();
      ctx.restore();
    }
    ctx.restore();

    // hạt lấp lánh bay quanh — mỗi hạt là một ngôi sao bốn cánh nhỏ
    if (perf.wantShimmer) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 5; i++) {
        const a = t * (.7 + i * .11) + i * 1.257;
        const rr = d * (.40 + .07 * Math.sin(t * 2 + i));
        const px = Math.cos(a) * rr, py = Math.sin(a) * rr * .9;
        const tw = Math.pow(clamp(.5 + .5 * Math.sin(t * 3.4 + i * 2.1), 0, 1), 2);
        if (tw < .04) continue;
        const sz = d * .055 * (.55 + tw);
        ctx.fillStyle = `hsla(${(i * 62 + t * 40) % 360},100%,82%,${tw})`;
        ctx.beginPath();
        for (let k = 0; k < 8; k++) {
          const aa = k / 8 * TAU, r2 = k % 2 ? sz * .26 : sz;
          k ? ctx.lineTo(px + Math.cos(aa) * r2, py + Math.sin(aa) * r2)
            : ctx.moveTo(px + Math.cos(aa) * r2, py + Math.sin(aa) * r2);
        }
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
    ctx.restore();
    ctx.restore();
    return;
  }

  // ── KẺ SỌC / CHỮ THẬP: luồng năng lượng chạy trong lòng đá ─────────────
  const beam = (horiz) => {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    if (!horiz) ctx.rotate(Math.PI / 2);
    const L = d * .42, th = d * .105;
    // thân luồng — hai đầu ăn theo màu họ gem, chỉ lõi giữa mới trắng
    const bg = ctx.createLinearGradient(-L, 0, L, 0);
    bg.addColorStop(0, rgba(g.lite, 0));
    bg.addColorStop(.20, rgba(g.lite, .70 * pulse));
    bg.addColorStop(.5,  `rgba(255,255,255,${.72 * pulse})`);
    bg.addColorStop(.80, rgba(g.lite, .70 * pulse));
    bg.addColorStop(1, rgba(g.lite, 0));
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
    const sg = ctx.createRadialGradient(run * L, 0, 0, run * L, 0, d * .18);
    sg.addColorStop(0, 'rgba(255,255,255,.9)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sg;
    ctx.beginPath(); ctx.ellipse(run * L, 0, d * .18, th * .9, 0, 0, TAU); ctx.fill();
    // mũi tên hai đầu
    ctx.lineWidth = d * .050; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const sgn of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sgn * (L - d * .15), -d * .10);
      ctx.lineTo(sgn * L, 0);
      ctx.lineTo(sgn * (L - d * .15), d * .10);
      ctx.strokeStyle = `rgba(255,255,255,${.95 * pulse})`; ctx.stroke();
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
    const rg = ctx.createRadialGradient(0, 0, d * .03, 0, 0, d * .17);
    rg.addColorStop(0, `rgba(255,255,255,${.9 * pulse})`);
    rg.addColorStop(1, rgba(g.lite, 0));
    ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(0, 0, d * .17, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgba(g.spark, .8 * pulse); ctx.lineWidth = d * .024;
    ctx.beginPath(); ctx.arc(0, 0, d * .125, 0, TAU); ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

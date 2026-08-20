// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  BẢN ĐỒ THẾ GIỚI — 10 mảnh trải trên một tấm bản đồ vẽ tay.              ║
// ║  Mảnh 1 đang mở (3 chương · 45 màn); 9 mảnh còn lại là bóng mờ dấu "?".   ║
// ╚══════════════════════════════════════════════════════════════════════════╝
import { TAU, clamp, lerp, ease, rgba, shade, strokeText, roundRect, mulberry32 } from '../core/util.js';
import { t, tx } from '../core/i18n.js';
import { Hit, textBtn, glassPanel, icon, C, FONT } from '../ui/widgets.js';
import { REGIONS, EPISODES, ALL_LEVELS } from '../data/levels.js';
import { bleed } from '../core/layout.js';

/** Vị trí 10 mảnh trên tấm bản đồ, theo tỉ lệ 0..1 — xếp thành đường vòng cung. */
const SPOTS = [
  [.12, .70], [.24, .50], [.36, .66], [.47, .42],
  [.57, .62], [.66, .38], [.75, .58], [.83, .36],
  [.90, .58], [.95, .34],
];

export default {
  name: 'world',

  enter(G, arg = {}) {
    this.t = 0;
    this.after = arg.after || (() => G.go('map'));
    this.sel = 0;
    const R = mulberry32(4242);
    this.deco = Array.from({ length: 54 }, () => ({
      x: R(), y: .22 + R() * .72, s: .5 + R() * .9, k: (R() * 3) | 0, ph: R() * TAU,
    }));
    this.clouds = Array.from({ length: 6 }, () => ({ x: R(), y: .10 + R() * .22, s: .6 + R() * .8, v: .004 + R() * .01 }));
    this.hits = [
      new Hit('close', G.W / 2 - 120, G.H - 84, 240, 60, { act: () => { G.sfx('button'); this.after(); } }),
      ...REGIONS.map((r, i) => new Hit('rg' + i, 0, 0, 84, 84, { circle: true, act: () => this.pick(G, i) })),
    ];
    G.music('trail');
  },

  pick(G, i) {
    this.sel = i;
    G.sfx(REGIONS[i].open ? 'select' : 'invalid');
  },

  update(G, dt) {
    this.t += dt;
    for (const c of this.clouds) { c.x += c.v * dt; if (c.x > 1.2) c.x = -.2; }
    // cập nhật vùng bấm theo cỡ màn hiện tại
    REGIONS.forEach((r, i) => {
      const h = this.hits.find(x => x.id === 'rg' + i); if (!h) return;
      const [fx, fy] = SPOTS[i];
      h.x = fx * G.W - 42; h.y = fy * G.H - 42;
    });
  },
  up() {}, key(G, e) { if (e.key === 'Escape') this.after(); },

  draw(G, ctx) {
    const { W, H } = G, T = this.t;

    // ── nền: tấm bản đồ da thuộc ──────────────────────────────────────────
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#1a1230'); bg.addColorStop(1, '#0c0819');
    ctx.fillStyle = bg; ctx.fillRect(...bleed(G));

    const M = 26;
    ctx.save();
    roundRect(ctx, M, 76, W - M * 2, H - 176, 22); ctx.clip();
    const pg = ctx.createLinearGradient(0, 76, W, H - 100);
    pg.addColorStop(0, '#e8d5aa'); pg.addColorStop(.5, '#dcc596'); pg.addColorStop(1, '#c9ac78');
    ctx.fillStyle = pg; ctx.fillRect(M, 76, W - M * 2, H - 176);

    // biển ở dưới, đất ở trên — hai mảng lớn cho ra dáng bản đồ
    ctx.fillStyle = '#9fc4c9';
    ctx.beginPath();
    ctx.moveTo(M, H - 100);
    for (let x = M; x <= W - M; x += 40)
      ctx.lineTo(x, H - 150 + Math.sin(x * .011 + 1.2) * 16);
    ctx.lineTo(W - M, H - 100); ctx.closePath(); ctx.fill();
    // sóng biển kiểu bản đồ cổ
    ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (let r0 = 0; r0 < 3; r0++)
      for (let x = M + 30 + (r0 % 2) * 34; x < W - M - 30; x += 68) {
        const y = H - 132 + r0 * 17;
        ctx.beginPath();
        ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 9, y - 6, x + 18, y);
        ctx.quadraticCurveTo(x + 27, y + 6, x + 36, y);
        ctx.stroke();
      }

    // dãy núi vẽ nét kiểu bản đồ cổ
    ctx.strokeStyle = 'rgba(90,70,40,.55)'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    for (let i = 0; i < 22; i++) {
      const x = M + 40 + i * ((W - M * 2 - 80) / 21), y = 150 + (i % 3) * 26 + Math.sin(i) * 14;
      const w = 26 + (i % 4) * 6;
      ctx.beginPath();
      ctx.moveTo(x - w, y + 14); ctx.lineTo(x, y - 16); ctx.lineTo(x + w, y + 14);
      ctx.stroke();
    }
    // rừng cây
    for (const d of this.deco) {
      const x = M + d.x * (W - M * 2), y = 76 + d.y * (H - 176);
      if (y > H - 165) continue;
      ctx.save(); ctx.globalAlpha = .5;
      ctx.strokeStyle = 'rgba(70,90,50,.85)'; ctx.lineWidth = 2;
      if (d.k === 0) {
        ctx.beginPath(); ctx.arc(x, y, 6 * d.s, 0, TAU); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x, y + 6 * d.s); ctx.lineTo(x, y + 11 * d.s); ctx.stroke();
      } else if (d.k === 1) {
        ctx.beginPath();
        ctx.moveTo(x - 6 * d.s, y + 7 * d.s); ctx.lineTo(x, y - 8 * d.s); ctx.lineTo(x + 6 * d.s, y + 7 * d.s);
        ctx.closePath(); ctx.stroke();
      } else {
        ctx.beginPath(); ctx.moveTo(x - 7 * d.s, y); ctx.quadraticCurveTo(x, y - 5 * d.s, x + 7 * d.s, y); ctx.stroke();
      }
      ctx.restore();
    }
    // mây trôi
    for (const c of this.clouds) {
      const x = M + c.x * (W - M * 2), y = 76 + c.y * (H - 176);
      ctx.save(); ctx.globalAlpha = .35; ctx.fillStyle = '#fff';
      for (const [dx, dy, r] of [[-1, 0, .9], [0, -.4, 1.2], [1, 0, .8]]) {
        ctx.beginPath(); ctx.arc(x + dx * 26 * c.s, y + dy * 14 * c.s, r * 18 * c.s, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }

    // ── lộ trình nối 10 mảnh ─────────────────────────────────────────────
    ctx.save();
    ctx.strokeStyle = 'rgba(110,80,40,.55)'; ctx.lineWidth = 5;
    ctx.setLineDash([11, 10]); ctx.lineDashOffset = -T * 18; ctx.lineCap = 'round';
    // đường mòn mượt: nối qua TRUNG ĐIỂM nên không bị gãy khúc hay vồng lên
    const P = SPOTS.map(([fx, fy]) => [fx * W, fy * H]);
    ctx.beginPath();
    ctx.moveTo(P[0][0], P[0][1]);
    for (let i = 1; i < P.length - 1; i++) {
      const mx = (P[i][0] + P[i + 1][0]) / 2, my = (P[i][1] + P[i + 1][1]) / 2;
      ctx.quadraticCurveTo(P[i][0], P[i][1], mx, my);
    }
    ctx.lineTo(P[P.length - 1][0], P[P.length - 1][1]);
    ctx.strokeStyle = 'rgba(120,88,44,.30)'; ctx.lineWidth = 11; ctx.setLineDash([]);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(96,68,32,.75)'; ctx.lineWidth = 4.5;
    ctx.setLineDash([11, 10]); ctx.lineDashOffset = -T * 18;
    ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
    ctx.restore();

    // ── các mảnh ─────────────────────────────────────────────────────────
    REGIONS.forEach((r, i) => {
      const [fx, fy] = SPOTS[i];
      const x = fx * W, y = fy * H;
      const on = this.sel === i;
      const pulse = r.open ? 1 + Math.sin(T * 3) * .04 : 1;
      ctx.save();
      ctx.translate(x, y); ctx.scale(pulse, pulse);

      ctx.fillStyle = 'rgba(60,44,20,.34)';
      ctx.beginPath(); ctx.ellipse(0, 34, 34, 10, 0, 0, TAU); ctx.fill();

      ctx.beginPath(); ctx.arc(0, 0, 34, 0, TAU);
      if (r.open) {
        const g = ctx.createLinearGradient(0, -34, 0, 34);
        g.addColorStop(0, shade(r.hue, .34)); g.addColorStop(1, shade(r.hue, -.24));
        ctx.fillStyle = g; ctx.fill();
        ctx.strokeStyle = '#5d4218'; ctx.lineWidth = 5; ctx.stroke();
        ctx.strokeStyle = '#ffe066'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(0, 0, 29, 0, TAU); ctx.stroke();
        strokeText(ctx, String(i + 1), 0, 2,
          { font: FONT.disp(28), fill: '#fff', stroke: '#3d2a08', lw: 5, baseline: 'middle' });
      } else {
        const g = ctx.createLinearGradient(0, -34, 0, 34);
        g.addColorStop(0, '#6b5a3e'); g.addColorStop(1, '#3f3526');
        ctx.fillStyle = g; ctx.fill();
        ctx.strokeStyle = '#2f2718'; ctx.lineWidth = 5; ctx.stroke();
        // bóng địa danh mờ bên trong — gợi "có gì đó ở đây"
        ctx.save();
        ctx.beginPath(); ctx.arc(0, 0, 29, 0, TAU); ctx.clip();
        ctx.globalAlpha = .30; ctx.fillStyle = shade(r.hue, -.1);
        ctx.beginPath();
        ctx.moveTo(-24, 20); ctx.lineTo(-8, -8); ctx.lineTo(4, 8);
        ctx.lineTo(16, -14); ctx.lineTo(28, 20); ctx.closePath(); ctx.fill();
        ctx.restore();
        ctx.save(); ctx.translate(0, -2); ctx.globalAlpha = .9; icon.lock(ctx, 34); ctx.restore();
        strokeText(ctx, '?', 0, 21,
          { font: FONT.disp(15), fill: '#d8c8a4', stroke: '#2f2718', lw: 3, baseline: 'middle' });
      }
      if (r.open) {                                   // biển tên nhỏ dưới chân
        ctx.save();
        ctx.font = FONT.disp(15);
        const nw = ctx.measureText(tx(r, 'name')).width + 22;
        roundRect(ctx, -nw / 2, 40, nw, 24, 12);
        ctx.fillStyle = 'rgba(48,34,14,.9)'; ctx.fill();
        ctx.strokeStyle = 'rgba(255,224,102,.6)'; ctx.lineWidth = 1.6; ctx.stroke();
        strokeText(ctx, tx(r, 'name'), 0, 52,
          { font: FONT.disp(15), fill: '#ffe066', stroke: null, lw: 0, baseline: 'middle', shadow: null });
        ctx.restore();
      }
      if (on) {
        ctx.strokeStyle = `rgba(255,224,102,${.55 + .35 * Math.sin(T * 6)})`;
        ctx.lineWidth = 3.5; ctx.setLineDash([9, 7]); ctx.lineDashOffset = -T * 32;
        ctx.beginPath(); ctx.arc(0, 0, 44, 0, TAU); ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.restore();
    });

    // ── la bàn hoa gió ở góc bản đồ ──────────────────────────────────────
    ctx.save();
    ctx.translate(W - 92, 152);
    ctx.globalAlpha = .8;
    ctx.strokeStyle = 'rgba(96,68,32,.8)'; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.arc(0, 0, 30, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 24, 0, TAU); ctx.stroke();
    for (let i = 0; i < 4; i++) {
      ctx.save(); ctx.rotate(i * Math.PI / 2 + T * .12);
      ctx.beginPath();
      ctx.moveTo(0, -28); ctx.lineTo(6, 0); ctx.lineTo(0, 6); ctx.lineTo(-6, 0);
      ctx.closePath();
      ctx.fillStyle = i === 0 ? '#c8442f' : '#8a6a3a'; ctx.fill();
      ctx.strokeStyle = 'rgba(60,40,16,.9)'; ctx.lineWidth = 1.6; ctx.stroke();
      ctx.restore();
    }
    strokeText(ctx, 'B', 0, -40,
      { font: FONT.disp(14), fill: '#7a5a2a', stroke: null, lw: 0, baseline: 'middle', shadow: null });
    ctx.restore();

    // viền tối quanh mép cho ra chất giấy cũ
    ctx.save();
    roundRect(ctx, M, 76, W - M * 2, H - 176, 22); ctx.clip();
    const vg = ctx.createRadialGradient(W / 2, (H - 100) / 2 + 40, H * .16, W / 2, (H - 100) / 2 + 40, W * .62);
    vg.addColorStop(0, 'rgba(60,40,14,0)'); vg.addColorStop(1, 'rgba(60,40,14,.42)');
    ctx.fillStyle = vg; ctx.fillRect(M, 76, W - M * 2, H - 176);
    ctx.restore();
    roundRect(ctx, M, 76, W - M * 2, H - 176, 22);
    ctx.strokeStyle = '#5d4218'; ctx.lineWidth = 5; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,236,190,.45)'; ctx.lineWidth = 2;
    roundRect(ctx, M + 5, 81, W - M * 2 - 10, H - 186, 18); ctx.stroke();

    // ── cartouche tiêu đề ────────────────────────────────────────────────
    ctx.save();
    ctx.font = FONT.disp(34);
    const tw = ctx.measureText(t('world')).width + 96;
    roundRect(ctx, W / 2 - tw / 2, 18, tw, 52, 14);
    const cg = ctx.createLinearGradient(0, 18, 0, 70);
    cg.addColorStop(0, '#e8d5aa'); cg.addColorStop(1, '#c9a86e');
    ctx.fillStyle = cg; ctx.fill();
    ctx.strokeStyle = '#5d4218'; ctx.lineWidth = 4; ctx.stroke();
    for (const sx of [-1, 1]) {                       // hai đầu cuộn giấy
      ctx.beginPath();
      ctx.ellipse(W / 2 + sx * (tw / 2 + 8), 44, 10, 26, 0, 0, TAU);
      ctx.fillStyle = '#b8934f'; ctx.fill();
      ctx.strokeStyle = '#5d4218'; ctx.lineWidth = 3; ctx.stroke();
    }
    ctx.restore();
    strokeText(ctx, t('world'), W / 2, 45,
      { font: FONT.disp(30), fill: '#4a3210', stroke: null, lw: 0, baseline: 'middle', shadow: null });

    const r = REGIONS[this.sel];
    const pw = 420, px = W / 2 - pw / 2, py = H - 168;
    glassPanel(ctx, px, py, pw, 72, 18);
    if (r.open) {
      const eps = EPISODES.filter(e => r.episodes?.includes(e.id));
      const lv = ALL_LEVELS.filter(l => r.episodes?.includes(l.ep));
      const stars = lv.reduce((a, l) => a + (G.save.stars[l.id] || 0), 0);
      strokeText(ctx, `${t('region', { n: this.sel + 1 })} · ${tx(r, 'name')}`, W / 2, py + 26,
        { font: FONT.disp(22), fill: '#ffe066', stroke: '#3a1d6e', lw: 5, baseline: 'middle' });
      strokeText(ctx, `${eps.length} ${t('episode').toLowerCase()} · ${lv.length} ${t('level').toLowerCase()} · ${stars}/${lv.length * 3} ★`,
        W / 2, py + 52,
        { font: FONT.ui(14, 700), fill: '#e6dcff', stroke: null, lw: 0, baseline: 'middle', shadow: null });
    } else {
      strokeText(ctx, `${t('region', { n: this.sel + 1 })} · ? ? ?`, W / 2, py + 26,
        { font: FONT.disp(22), fill: '#c0b4d8', stroke: '#2b1740', lw: 5, baseline: 'middle' });
      strokeText(ctx, t('regionLocked'), W / 2, py + 52,
        { font: FONT.ui(13, 600), fill: '#a096c0', stroke: null, lw: 0, baseline: 'middle', shadow: null });
    }

    const cl = this.hits.find(h => h.id === 'close');
    textBtn(ctx, cl.x, cl.y, cl.w, cl.h, t('back'),
      { press: cl.press, hover: cl.hover, font: FONT.disp(24) });
  },
};

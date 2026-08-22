// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  CHUYỂN VÙNG — hoạt cảnh khi chinh phục xong một mảnh đất.               ║
// ║                                                                          ║
// ║  Ba nhịp, tự chạy, chạm để bỏ qua:                                       ║
// ║    ① CHIA TAY   — vùng cũ, cả dàn vẫy tay, con dấu "ĐÃ CHINH PHỤC" đóng  ║
// ║       sập xuống.                                                         ║
// ║    ② BẢN ĐỒ LỚN — kéo ra xa, thấy cả tấm da thuộc; mảnh vừa xong đóng    ║
// ║       dấu tích, con đường bò tới mảnh kế rồi mảnh đó bật mở.             ║
// ║    ③ VÙNG MỚI  — tên vùng mới hiện ra, đổi tông màu, mời lên đường.      ║
// ║                                                                          ║
// ║  Mục đích: chinh phục một vùng là chuyện lớn, phải có một nhịp nghỉ đủ   ║
// ║  dài để người chơi thấy mình vừa làm được gì — bảng kết quả màn thường   ║
// ║  quá ngắn cho việc đó.                                                   ║
// ╚══════════════════════════════════════════════════════════════════════════╝
import { TAU, clamp, lerp, ease, rgba, shade, strokeText, roundRect, mulberry32 } from '../core/util.js';
import { t, tx } from '../core/i18n.js';
import { Hit, textBtn, glassPanel, sunburst, FONT } from '../ui/widgets.js';
import { Cricket } from '../game/cricket.js';
import { Enemy } from '../game/enemy.js';
import { BREEDS } from '../data/characters.js';
import { bleed } from '../core/layout.js';
import { perf, Q } from '../core/perf.js';

const BEAT = [2.6, 6.0];          // mốc kết thúc nhịp ① và ②

export default {
  name: 'region',

  enter(G, arg = {}) {
    this.done = arg.done;          // mảnh vừa chinh phục
    this.next = arg.next;          // mảnh kế
    this.after = arg.after || (() => G.go('map'));
    this.t = 0;
    this.hero = new Cricket(BREEDS.find(b => b.id === (G.save.breed || 'ember')) || BREEDS[0], G.save.xp);
    this.hero.gear = { ...(G.save.equip || {}) };
    this.hero.react('happy', 4);
    this.cast = [new Enemy('ant', 1), new Enemy('mantis', 1)];
    const R = mulberry32(31337);
    this.stars = Array.from({ length: 60 }, () => ({ x: R(), y: R(), r: .6 + R() * 1.7, ph: R() * TAU }));
    this.hits = [new Hit('go', G.W / 2 - 150, G.H - 106, 300, 62,
      { act: () => { G.sfx('button'); this.after(); } })];
    G.sfx('win');
    G.music('trail');
  },

  update(G, dt) {
    this.t += dt;
    this.hero.update(dt);
    for (const c of this.cast) c.update(dt);
    G.world.update(dt, 0);
  },

  /** Chạm để nhảy sang nhịp sau; ở nhịp cuối thì đi luôn. */
  up(G) {
    if (this.t < .4) return;
    if (this.t < BEAT[0]) this.t = BEAT[0];
    else if (this.t < BEAT[1]) this.t = BEAT[1];
    else this.after();
  },
  key(G, e) { if (e.key === 'Escape' || e.key === 'Enter') this.after(); },

  draw(G, ctx) {
    const { W, H } = G, T = this.t;
    const beat = T < BEAT[0] ? 0 : T < BEAT[1] ? 1 : 2;

    G.world.draw(ctx);
    ctx.fillStyle = 'rgba(12,7,26,.42)'; ctx.fillRect(...bleed(G));

    if (beat === 0) this.beatFarewell(G, ctx, T);
    else if (beat === 1) this.beatMap(G, ctx, T - BEAT[0]);
    else this.beatNew(G, ctx, T - BEAT[1]);

    if (beat < 2)
      strokeText(ctx, t('tapStart'), W / 2, H - 30,
        { font: FONT.ui(14, 700), fill: 'rgba(255,255,255,.55)', stroke: 'rgba(0,0,0,.5)', lw: 3, baseline: 'middle' });
    else {
      const h = this.hits[0];
      textBtn(ctx, h.x, h.y, h.w, h.h, t('regionGo'), { press: h.press, hover: h.hover, font: FONT.disp(24) });
    }
  },

  // ── ① chia tay vùng cũ ────────────────────────────────────────────────
  beatFarewell(G, ctx, T) {
    const { W, H } = G;
    this.hero.draw(ctx, W * .34, H * .78, Math.min(140, W * .11), 1);
    this.cast.forEach((c, i) => {
      ctx.save();
      ctx.translate(W * (.56 + i * .13), H * .78 - Math.abs(Math.sin(T * 3 + i)) * 14);
      ctx.scale(-1, 1); c.draw(ctx, 0, 0, 100); ctx.restore();
    });
    // con dấu đóng sập xuống
    const k = clamp((T - .5) / .45, 0, 1);
    if (k > 0) {
      const sc = 3.2 - 2.2 * ease.outCubic(k);
      ctx.save();
      ctx.translate(W / 2, H * .34);
      ctx.rotate(-.16 + (1 - k) * .5);
      ctx.scale(sc, sc);
      ctx.globalAlpha = clamp(k * 1.6, 0, 1);
      const bw = 460, bh = 128;
      roundRect(ctx, -bw / 2, -bh / 2, bw, bh, 16);
      ctx.strokeStyle = '#c8342a'; ctx.lineWidth = 9; ctx.stroke();
      ctx.strokeStyle = 'rgba(200,52,42,.45)'; ctx.lineWidth = 3;
      roundRect(ctx, -bw / 2 + 14, -bh / 2 + 14, bw - 28, bh - 28, 10); ctx.stroke();
      strokeText(ctx, t('regionDone'), 0, -14,
        { font: FONT.disp(38), fill: '#e8483a', stroke: 'rgba(255,255,255,.55)', lw: 5, baseline: 'middle', shadow: null });
      strokeText(ctx, tx(this.done, 'name') || '', 0, 32,
        { font: FONT.disp(24), fill: '#c8342a', stroke: null, lw: 0, baseline: 'middle', shadow: null });
      ctx.restore();
      if (k >= 1 && !this._stamped) { this._stamped = true; G.sfx('bomb'); G.fx.shake(18); }
    }
  },

  // ── ② kéo ra bản đồ lớn ───────────────────────────────────────────────
  beatMap(G, ctx, T) {
    const { W, H } = G;
    const k = ease.outCubic(clamp(T / .7, 0, 1));
    const mw = Math.min(W - 140, 760) * (.5 + .5 * k), mh = mw * .46;
    const mx = W / 2 - mw / 2, my = H * .30 - mh / 2 + (1 - k) * 40;
    ctx.save();
    ctx.globalAlpha = k;
    // tấm da thuộc
    roundRect(ctx, mx, my, mw, mh, 18);
    const pg = ctx.createLinearGradient(0, my, 0, my + mh);
    pg.addColorStop(0, '#e8d5aa'); pg.addColorStop(1, '#c9ac78');
    ctx.fillStyle = pg; ctx.fill();
    ctx.strokeStyle = '#8a6a32'; ctx.lineWidth = 5; ctx.stroke();
    ctx.save(); roundRect(ctx, mx, my, mw, mh, 18); ctx.clip();
    // biển dưới đáy + một hồ nhỏ, cho ra dáng bản đồ có nước
    ctx.fillStyle = '#9fc4c9';
    ctx.fillRect(mx, my + mh * .74, mw, mh * .26);
    ctx.beginPath(); ctx.ellipse(mx + mw * .30, my + mh * .42, mw * .09, mh * .09, 0, 0, TAU);
    ctx.fillStyle = '#8fbcc2'; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1.6;
    for (let i = 0; i < 3; i++) {
      const yy = my + mh * (.80 + i * .06);
      ctx.beginPath();
      for (let x = mx; x < mx + mw; x += 26) {
        ctx.moveTo(x, yy); ctx.quadraticCurveTo(x + 6, yy - 4, x + 13, yy);
        ctx.quadraticCurveTo(x + 20, yy + 4, x + 26, yy);
      }
      ctx.stroke();
    }
    ctx.restore();

    // hai mốc: vùng cũ (đã xong) và vùng mới
    const A = [mx + mw * .26, my + mh * .56], B = [mx + mw * .74, my + mh * .38];
    const reach = clamp((T - .8) / .9, 0, 1);
    ctx.strokeStyle = 'rgba(96,68,32,.8)'; ctx.lineWidth = 4;
    ctx.setLineDash([10, 9]); ctx.lineDashOffset = -T * 20;
    ctx.beginPath();
    ctx.moveTo(A[0], A[1]);
    ctx.lineTo(lerp(A[0], B[0], reach), lerp(A[1], B[1], reach));
    ctx.stroke(); ctx.setLineDash([]);

    const node = (p, col, lbl, on) => {
      ctx.beginPath(); ctx.arc(p[0], p[1] + 4, 28, 0, TAU);
      ctx.fillStyle = 'rgba(60,40,16,.45)'; ctx.fill();
      ctx.beginPath(); ctx.arc(p[0], p[1], 28, 0, TAU);
      ctx.fillStyle = on ? col : '#6b5a44'; ctx.fill();
      ctx.strokeStyle = '#3f2a10'; ctx.lineWidth = 4; ctx.stroke();
      if (lbl) strokeText(ctx, lbl, p[0], p[1] + 52,
        { font: FONT.ui(13, 800), fill: '#4a3212', stroke: null, lw: 0, baseline: 'middle', shadow: null });
    };
    node(A, '#7fb861', tx(this.done, 'name') || '', true);
    // dấu tích trên vùng đã xong
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(A[0] - 11, A[1]); ctx.lineTo(A[0] - 3, A[1] + 9); ctx.lineTo(A[0] + 12, A[1] - 9);
    ctx.stroke();

    const pop = reach >= 1 ? ease.outBack(clamp((T - 1.7) / .5, 0, 1)) : 0;
    if (pop > 0) {
      ctx.save();
      ctx.translate(B[0], B[1]); ctx.scale(pop, pop); ctx.translate(-B[0], -B[1]);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const gg = ctx.createRadialGradient(B[0], B[1], 6, B[0], B[1], 74);
      gg.addColorStop(0, 'rgba(255,214,110,.7)'); gg.addColorStop(1, 'rgba(255,214,110,0)');
      ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(B[0], B[1], 74, 0, TAU); ctx.fill();
      ctx.restore();
      node(B, this.next?.hue || '#6fa8c8', t('regionNew'), true);
      ctx.restore();
      if (!this._popped) { this._popped = true; G.sfx('levelup'); }
    } else node(B, '#6b5a44', '', false);
    ctx.restore();

    strokeText(ctx, t('regionOpening'), W / 2, H * .70,
      { font: FONT.disp(26), fill: '#ffe066', stroke: '#3a2000', lw: 5, baseline: 'middle' });
  },

  // ── ③ vùng đất mới ────────────────────────────────────────────────────
  beatNew(G, ctx, T) {
    const { W, H } = G;
    const k = ease.outBack(clamp(T / .55, 0, 1));
    ctx.save();
    ctx.beginPath(); ctx.rect(...bleed(G)); ctx.clip();
    sunburst(ctx, W / 2, H * .38, W * .5, T, this.next?.hue || '#6fa8c8', 16, .18);
    ctx.restore();
    if (perf.quality > Q.LOW) for (const s of this.stars) {
      const [bx, by, bw, bh] = bleed(G);
      ctx.globalAlpha = .25 + .45 * Math.abs(Math.sin(T * 2 + s.ph));
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(bx + s.x * bw, by + s.y * bh * .6, s.r, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;

    const bw2 = Math.min(W - 140, 640), bh2 = 168;
    ctx.save();
    ctx.translate(W / 2, H * .34); ctx.scale(k, k); ctx.translate(-W / 2, -(H * .34));
    glassPanel(ctx, W / 2 - bw2 / 2, H * .34 - bh2 / 2, bw2, bh2, 24,
      { top: 'rgba(30,18,58,.94)', bot: 'rgba(12,7,26,.96)', rim: 'rgba(255,214,110,.7)' });
    // Mảnh kế ĐÃ MỞ thì mời đi tiếp; CHƯA MỞ thì nói thẳng là còn đang khai phá,
    // đừng hô "vùng đất mới" rồi bắt người chơi đâm đầu vào chỗ chưa có gì.
    const ready = !!(this.next && this.next.open);
    strokeText(ctx, ready ? t('regionNew') : t('regionSoon'), W / 2, H * .34 - 40,
      { font: FONT.ui(15, 800), fill: '#ffe9a8', stroke: '#3a2000', lw: 3, baseline: 'middle' });
    strokeText(ctx, tx(this.next || {}, 'name') || t('regionSoon'), W / 2, H * .34 + 2,
      { font: FONT.disp(42), fill: '#ffd23f', stroke: '#5a2a00', lw: 9, baseline: 'middle' });
    strokeText(ctx, ready ? tx(this.next, 'teaser') || '' : t('regionSoonNote'), W / 2, H * .34 + 46,
      { font: FONT.ui(14, 600), fill: '#cfc4ea', stroke: null, lw: 0, baseline: 'middle', shadow: null });
    ctx.restore();

    this.hero.draw(ctx, W * .5, H * .80, Math.min(140, W * .11), 1);
  },
};

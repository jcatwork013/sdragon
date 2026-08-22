// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  MỞ CHƯƠNG — chạy MỘT LẦN khi lần đầu bước sang một vùng đất mới.        ║
// ║                                                                          ║
// ║  Mục đích: đánh dấu "mình vừa qua một cột mốc". Nếu đi từ chương này sang ║
// ║  chương khác mà màn hình y hệt, người chơi không cảm được là đã tiến lên. ║
// ║                                                                          ║
// ║  Nên ở đây đổi CẢ BA thứ cùng lúc: bảng màu trời-đồi-núi lấy thẳng từ     ║
// ║  chương mới, một câu dẫn tếu, và cả dàn nhân vật ùa ra reo hò.            ║
// ╚══════════════════════════════════════════════════════════════════════════╝
import { TAU, clamp, lerp, ease, rgba, shade, strokeText, roundRect, mulberry32 } from '../core/util.js';
import { t, tx } from '../core/i18n.js';
import { Hit, textBtn, glassPanel, sunburst, pillTag, FONT } from '../ui/widgets.js';
import { Cricket } from '../game/cricket.js';
import { Enemy } from '../game/enemy.js';
import { BREEDS } from '../data/characters.js';
import { bleed } from '../core/layout.js';
import { perf, Q } from '../core/perf.js';

const R0 = mulberry32(4242);
const CONFETTI = Array.from({ length: 54 }, () => ({
  x: R0(), y: -R0() * .6, v: .18 + R0() * .34, w: 6 + R0() * 9, h: 9 + R0() * 12,
  sp: R0() * TAU, rv: (R0() - .5) * 6,
  c: ['#ffd23f', '#8ef08a', '#a8dcff', '#ff9ec4', '#c9a8ff'][(R0() * 5) | 0],
}));

export default {
  name: 'chapter',

  enter(G, arg = {}) {
    this.ep = arg.ep;
    this.after = arg.after || (() => G.go('map'));
    this.t = 0;
    this.hero = new Cricket(BREEDS.find(b => b.id === (G.save.breed || 'ember')) || BREEDS[0], G.save.xp);
    this.hero.gear = { ...(G.save.equip || {}) };
    this.hero.react('happy', 3);
    this.cast = [
      new Enemy('ant', 1), new Enemy('wasp', 1), new Enemy('mantis', 1),
    ];
    this.conf = CONFETTI.map(c => ({ ...c }));
    this.hits = [
      new Hit('go', G.W / 2 - 140, G.H - 116, 280, 64,
        { act: () => { G.sfx('button'); this.after(); } }),
    ];
    G.world.setTheme({ sky: this.ep.sky, hill: this.ep.hill, mount: this.ep.mount, biome: this.ep.biome });
    G.sfx('levelup');
    G.music('trail');
  },

  update(G, dt) {
    this.t += dt;
    this.hero.update(dt);
    for (const c of this.cast) c.update(dt);
    G.world.update(dt, 0);
    for (const c of this.conf) {
      c.y += c.v * dt;
      c.sp += c.rv * dt;
      if (c.y > 1.15) { c.y = -.15; c.x = Math.random(); }
    }
  },

  up(G) { if (this.t > .5) this.after(); },
  key(G, e) { if (e.key === 'Escape' || e.key === 'Enter') this.after(); },

  draw(G, ctx) {
    const { W, H } = G, T = this.t, E = this.ep;
    G.world.draw(ctx);
    ctx.fillStyle = 'rgba(14,8,30,.34)'; ctx.fillRect(...bleed(G));

    // tia sáng toả sau tấm biển
    ctx.save();
    ctx.beginPath(); ctx.rect(...bleed(G)); ctx.clip();
    sunburst(ctx, W / 2, H * .34, W * .46, T, '#ffd23f', 16, .16);
    ctx.restore();

    // ── DẢI BĂNG-RÔN ────────────────────────────────────────────────────
    const k = ease.outBack(clamp(T / .55, 0, 1));
    const bw = Math.min(W - 120, 720), bh = 190;
    const bx = W / 2 - bw / 2, by = H * .20;
    ctx.save();
    ctx.translate(W / 2, by + bh / 2);
    ctx.rotate(Math.sin(T * 1.1) * .012);
    ctx.scale(k, k);
    ctx.translate(-W / 2, -(by + bh / 2));
    glassPanel(ctx, bx, by, bw, bh, 26,
      { top: 'rgba(30,18,58,.94)', bot: 'rgba(12,7,26,.96)', rim: 'rgba(255,214,110,.75)' });

    // nhãn "CHƯƠNG n"
    ctx.font = FONT.ui(14, 800);
    const lbl = `${t('episode')} ${E.week}`;
    const lw = ctx.measureText(lbl).width + 40;
    pillTag(ctx, W / 2 - lw / 2, by + 16, lw, 28);
    strokeText(ctx, lbl, W / 2, by + 30,
      { font: FONT.ui(14, 800), fill: '#2b1740', stroke: null, lw: 0, baseline: 'middle', shadow: null });

    // tên vùng — chữ lớn, viền dày, gradient vàng
    ctx.save();
    ctx.font = FONT.disp(Math.min(52, bw * .085));
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round'; ctx.miterLimit = 2;
    const ty = by + 84, nm = tx(E, 'name');
    ctx.strokeStyle = '#3a1d00'; ctx.lineWidth = 14; ctx.strokeText(nm, W / 2, ty);
    ctx.strokeStyle = '#a85e00'; ctx.lineWidth = 7;  ctx.strokeText(nm, W / 2, ty);
    const tg = ctx.createLinearGradient(0, ty - 30, 0, ty + 28);
    tg.addColorStop(0, '#fff8d0'); tg.addColorStop(.5, '#ffd23f'); tg.addColorStop(1, '#ffa412');
    ctx.fillStyle = tg; ctx.fillText(nm, W / 2, ty);
    ctx.restore();

    strokeText(ctx, tx(E, 'tag'), W / 2, by + 128,
      { font: FONT.ui(16, 700), fill: '#ffe9a8', stroke: '#3a2000', lw: 3, baseline: 'middle' });
    strokeText(ctx, tx(E, 'hook'), W / 2, by + 160,
      { font: FONT.ui(15, 600), fill: '#efe8ff', stroke: 'rgba(0,0,0,.5)', lw: 3, baseline: 'middle' });
    ctx.restore();

    // ── DÀN NHÂN VẬT reo hò ─────────────────────────────────────────────
    const gy = H * .755;      // chừa chỗ cho nút, kẻo dàn nhân vật đứng đè lên
    this.hero.draw(ctx, W * .30, gy, Math.min(128, W * .10), 1);
    const spots = [[.56, .92, 1], [.68, .84, -1], [.80, 1.0, -1]];
    this.cast.forEach((c, i) => {
      const [fx, sc, face] = spots[i];
      ctx.save();
      ctx.translate(W * fx, gy - Math.abs(Math.sin(T * 3 + i * 1.1)) * 16);
      if (face < 0) ctx.scale(-1, 1);
      c.draw(ctx, 0, 0, 96 * sc);
      ctx.restore();
    });

    // ── KIM TUYẾN ───────────────────────────────────────────────────────
    if (perf.quality > Q.LOW) {
      const [cbx, cby, cbw, cbh] = bleed(G);
      ctx.save();
      for (const c of this.conf) {
        ctx.save();
        ctx.translate(cbx + c.x * cbw, cby + c.y * cbh);
        ctx.rotate(c.sp);
        ctx.fillStyle = c.c;
        ctx.globalAlpha = .9;
        ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h * (.4 + .6 * Math.abs(Math.cos(c.sp))));
        ctx.restore();
      }
      ctx.restore();
    }

    const h = this.hits[0];
    textBtn(ctx, h.x, h.y, h.w, h.h, t('chapterGo'),
      { press: h.press, hover: h.hover, font: FONT.disp(24) });
  },
};

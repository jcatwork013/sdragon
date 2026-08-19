// ── Chọn trứng — mở đầu cốt truyện ──────────────────────────────────────────
import { TAU, lerp, clamp, ease, rgba, shade, strokeText, rand } from '../core/util.js';
import { t, tx } from '../core/i18n.js';
import { Hit, textBtn, roundBtn, card, glassPanel, icon, C, FONT } from '../ui/widgets.js';
import { BREEDS } from '../data/characters.js';
import { Cricket, drawEgg } from '../game/cricket.js';

const STATS = ['might', 'spirit', 'fortune', 'breath'];

export default {
  name: 'egg',
  enter(G) {
    this.t = 0;
    this.sel = 0;
    this.phase = 'choose';        // choose → hatch → reveal
    this.hatchT = 0;
    this.baby = null;
    this.hits = [];
    const n = BREEDS.length, gap = 210, x0 = G.W / 2 - (n - 1) * gap / 2;
    BREEDS.forEach((b, i) => {
      this.hits.push(new Hit('egg' + i, x0 + i * gap - 66, 176, 132, 190, {
        act: () => { if (this.sel !== i) { this.sel = i; G.sfx('select'); } },
      }));
    });
    this.hits.push(new Hit('go', G.W / 2 - 130, 606, 260, 62, { act: () => this.startHatch(G) }));
    G.audio.play(G.songs.nest);
    G.world.setTheme({ sky: ['#ffe0bd', '#d9c4f0', '#9d8fd4'], hill: '#7fb861', mount: '#9a94c8' });
  },

  startHatch(G) {
    if (this.phase !== 'choose') return;
    this.phase = 'hatch'; this.hatchT = 0;
    this.hits.forEach(h => h.disabled = true);
    G.sfx('crack');
  },

  update(G, dt) {
    this.t += dt;
    G.world.update(dt, 0);
    if (this.phase === 'hatch') {
      const prev = this.hatchT;
      this.hatchT += dt;
      const b = BREEDS[this.sel];
      if (prev < .55 && this.hatchT >= .55) G.sfx('crack');
      if (prev < 1.1 && this.hatchT >= 1.1) G.sfx('crack');
      if (prev < 1.75 && this.hatchT >= 1.75) {
        G.sfx('roar');
        G.fx.burst(G.W / 2, 330, { lite: b.shellA, base: b.shellB, dark: shade(b.shellB, -.3), spark: b.spot }, 30, 1.5);
        G.fx.ring(G.W / 2, 330, b.eye, 20, 300, .7, 12);
        G.fx.sparkle(G.W / 2, 330, b.eye, 30);
        G.fx.shake(16);
        this.baby = new Cricket(b, 600);
        this.baby.react('happy', 2);
        this.phase = 'reveal';
      }
    }
    if (this.phase === 'reveal') {
      this.hatchT += dt;
      this.baby.update(dt);
      if (this.hatchT > 3.4) {
        G.save.breed = BREEDS[this.sel].id;
        G.save.xp = 600;
        Object.assign(G.save.stats, { ...BREEDS[this.sel].stats });
        // Lần chơi đầu: dẫn thẳng vào màn hướng dẫn thay vì thả người chơi vào bản đồ
        if (!G.save.seenHelp) { G.save.seenHelp = true; G.persist(); G.go('help', 'map'); }
        else { G.persist(); G.go('map'); }
      }
    }
  },

  draw(G, ctx) {
    const { W, H } = G, T = this.t;
    G.world.draw(ctx);
    ctx.fillStyle = 'rgba(20,12,42,.42)'; ctx.fillRect(0, 0, W, H);

    if (this.phase === 'choose') {
      strokeText(ctx, t('eggTitle'), W / 2, 88, { font: FONT.disp(46), fill: '#fff', stroke: '#3a1d6e', lw: 9, baseline: 'middle' });
      strokeText(ctx, t('eggHint'), W / 2, 132, { font: FONT.ui(17, 600), fill: '#ffe9b0', stroke: '#4a2a10', lw: 4, baseline: 'middle' });

      // bệ + trứng
      this.hits.filter(h => h.id.startsWith('egg')).forEach((h, i) => {
        const b = BREEDS[i], on = this.sel === i;
        const cx = h.x + h.w / 2, cy = h.y + 116;
        // bệ đá
        ctx.save();
        ctx.fillStyle = 'rgba(30,18,52,.55)';
        ctx.beginPath(); ctx.ellipse(cx, cy + 78, 62, 17, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#5b4a7a';
        ctx.beginPath(); ctx.ellipse(cx, cy + 70, 58, 16, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#7a6699';
        ctx.beginPath(); ctx.ellipse(cx, cy + 64, 58, 15, 0, 0, TAU); ctx.fill();
        ctx.restore();
        const lift = on ? -10 - Math.sin(T * 2.4) * 5 : 0;
        drawEgg(ctx, b, cx, cy + lift, 62, { t: T + i, wobble: on ? .5 : .12, selected: on, glow: on ? 1 : .25 });
        strokeText(ctx, tx(b, 'name'), cx, cy + 116, {
          font: FONT.disp(23), fill: on ? '#ffe066' : '#fff', stroke: '#33194f', lw: 6, baseline: 'middle' });
      });

      // bảng thông tin giống rồng
      const b = BREEDS[this.sel];
      const px = W / 2 - 300, py = 418, pw = 600, ph = 168;
      card(ctx, px, py, pw, ph, 20, { top: '#fffdf7', bot: '#e3eefb' });
      strokeText(ctx, tx(b, 'kind'), px + pw - 26, py + 36, {
        font: FONT.ui(15, 800), fill: '#6a5a86', stroke: null, lw: 0, align: 'right', baseline: 'middle', shadow: null });
      strokeText(ctx, tx(b, 'epithet'), px + 26, py + 36, {
        font: FONT.disp(26), fill: C.orange, stroke: C.orangeDark, lw: 5, align: 'left', baseline: 'middle' });
      strokeText(ctx, `${t('trait')}: ${tx(b, 'trait')}`, px + 26, py + 70, {
        font: FONT.ui(17, 800), fill: '#2b1740', stroke: null, lw: 0, align: 'left', baseline: 'middle', shadow: null });
      ctx.save();
      ctx.font = FONT.ui(15, 400); ctx.fillStyle = '#4a3a66'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(tx(b, 'traitDesc'), px + 26, py + 96);
      ctx.restore();
      // 4 chỉ số khởi điểm
      STATS.forEach((k, i) => {
        const sx = px + 26 + i * 142, sy = py + 126;
        strokeText(ctx, t(k), sx, sy, { font: FONT.ui(13, 800), fill: '#5b4a7a', stroke: null, lw: 0, align: 'left', baseline: 'middle', shadow: null });
        for (let d = 0; d < 4; d++) {
          ctx.fillStyle = d < b.stats[k] ? C.orange : 'rgba(120,140,170,.3)';
          ctx.beginPath(); ctx.arc(sx + 6 + d * 17, sy + 20, 6, 0, TAU); ctx.fill();
        }
      });

      const go = this.hits.find(h => h.id === 'go');
      textBtn(ctx, go.x, go.y, go.w, go.h, t('hatch'), { press: go.press, hover: go.hover, font: FONT.disp(28) });
    } else {
      // hoạt cảnh nở trứng
      const b = BREEDS[this.sel], k = this.hatchT;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(W / 2, 330, 20, W / 2, 330, 420);
      g.addColorStop(0, rgba(b.eye, clamp(k * .3, 0, .5))); g.addColorStop(1, rgba(b.eye, 0));
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.restore();

      if (this.phase === 'hatch') {
        drawEgg(ctx, b, W / 2, 330, 100, { t: T, wobble: clamp(k * 1.6, 0, 1), crack: clamp((k - .35) / 1.3, 0, 1), glow: clamp(k, 0, 1) });
        strokeText(ctx, '. . .', W / 2, 500, { font: FONT.disp(40), fill: '#fff', stroke: '#3a1d6e', lw: 8, baseline: 'middle' });
      } else {
        const s = ease.outBack(clamp((this.hatchT - 1.75) / .6, 0, 1));
        ctx.save(); ctx.translate(W / 2, 360); ctx.scale(s, s);
        this.baby.draw(ctx, 0, 0, 210, 1);
        ctx.restore();
        strokeText(ctx, tx(b, 'name'), W / 2, 520, { font: FONT.disp(48), fill: '#ffe066', stroke: '#5c3a00', lw: 9, baseline: 'middle' });
        ctx.save();
        ctx.globalAlpha = clamp((this.hatchT - 2.3) / .5, 0, 1);
        ctx.font = FONT.ui(18, 600); ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
        ctx.fillText(tx(G.episodeOf(0), 'story'), W / 2, 576);
        ctx.restore();
      }
    }
  },
};

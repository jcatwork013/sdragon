// ── Màn mở đầu ──────────────────────────────────────────────────────────────
import { TAU, rand, lerp, clamp, ease, rgba, strokeText, mulberry32 } from '../core/util.js';
import { t, getLang, toggleLang, LANGS } from '../core/i18n.js';
import { Hit, textBtn, roundBtn, icon, C, FONT, glassPanel } from '../ui/widgets.js';
import { Cricket } from '../game/cricket.js';
import { BREEDS } from '../data/characters.js';
import { VERSION } from '../core/version.js';
import { drawGem, GEMS } from '../game/gems.js';

const R = mulberry32(1337);
const stars = Array.from({ length: 90 }, () => ({ x: R(), y: R() * .62, r: R() * 1.8 + .5, ph: R() * TAU }));
const motes = Array.from({ length: 18 }, () => ({ x: R(), y: R(), s: .35 + R() * .5, ph: R() * TAU, g: (R() * 6) | 0, v: .02 + R() * .05 }));

export default {
  name: 'title',
  enter(G) {
    this.t = 0;
    this.hero = new Cricket(BREEDS.find(b => b.id === (G.save.breed || 'ember')) || BREEDS[0], 9800);
    this.hero.onFire = (x, y, dx, dy) => G.fx.fire(x, y, dx, dy, 3);
    this.fireAt = 2.4;
    const cx = G.W / 2, hasSave = !!G.save.breed;
    this.hits = [
      new Hit('play',  cx - 150, 470, 300, 66, { act: () => hasSave ? G.go('map') : G.go('egg') }),
      new Hit('new',   cx - 150, 552, 300, 52, { act: () => G.confirmNew(), hidden: !hasSave }),
      new Hit('help',  G.W - 218, 26, 52, 52, { circle: true, act: () => { G.sfx('button'); G.go('help', 'title'); } }),
      new Hit('lang',  G.W - 152, 26, 52, 52, { circle: true, act: () => { toggleLang(); G.sfx('button'); } }),
      new Hit('music', G.W -  86, 26, 52, 52, { circle: true, act: () => { G.toggleMute(); } }),
    ];
    G.audio.play(G.songs.title);
  },
  update(G, dt) {
    this.t += dt;
    this.hero.update(dt);
    this.fireAt -= dt;
    if (this.fireAt <= 0) { this.fireAt = 5.5 + Math.random() * 4; this.hero.breatheFire(1.0); G.sfx('roar'); }
    for (const m of motes) { m.y -= m.v * dt; if (m.y < -.08) { m.y = 1.08; m.x = Math.random(); } }
  },
  draw(G, ctx) {
    const { W, H } = G, T = this.t;

    // trời đêm
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#150d33'); sky.addColorStop(.42, '#3b2263');
    sky.addColorStop(.72, '#7b3f6e'); sky.addColorStop(1, '#c26a4e');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

    // sao
    for (const s of stars) {
      ctx.globalAlpha = .3 + .7 * Math.abs(Math.sin(T * .9 + s.ph));
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(s.x * W, s.y * H, s.r, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // trăng
    const mx = W * .8, my = H * .17;
    const mg = ctx.createRadialGradient(mx, my, 0, mx, my, 150);
    mg.addColorStop(0, 'rgba(255,240,210,.55)'); mg.addColorStop(1, 'rgba(255,220,180,0)');
    ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(mx, my, 150, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff4dc'; ctx.beginPath(); ctx.arc(mx, my, 42, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(210,190,170,.4)';
    ctx.beginPath(); ctx.arc(mx - 12, my - 8, 9, 0, TAU); ctx.arc(mx + 14, my + 10, 6, 0, TAU); ctx.fill();

    // đá quý trôi
    for (const m of motes) {
      ctx.save();
      ctx.globalAlpha = .30;
      drawGem(ctx, m.g, m.x * W, m.y * H, 54 * m.s, { t: T, seed: m.ph, rot: Math.sin(T * .5 + m.ph) * .3 });
      ctx.restore();
    }

    // núi bóng đổ
    const ridge = (yBase, amp, col, seed) => {
      const r = mulberry32(seed);
      ctx.beginPath(); ctx.moveTo(-40, H);
      for (let x = -40; x <= W + 40; x += 70)
        ctx.lineTo(x, yBase + Math.sin(x * .006 + seed) * amp - r() * amp * .6);
      ctx.lineTo(W + 40, H); ctx.closePath();
      ctx.fillStyle = col; ctx.fill();
    };
    ridge(H * .60, 40, '#2b1a4a', 3);
    ridge(H * .70, 30, '#1d1136', 9);

    // vách đá rồng đậu — dịch sang trái để không đè cụm nút
    ctx.fillStyle = '#150c28';
    ctx.beginPath();
    ctx.moveTo(-W * .02, H); ctx.lineTo(W * .04, H * .80);
    ctx.lineTo(W * .32, H * .76); ctx.lineTo(W * .38, H); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#20143a';
    ctx.beginPath();
    ctx.moveTo(W * .04, H * .80); ctx.lineTo(W * .32, H * .76);
    ctx.lineTo(W * .33, H * .79); ctx.lineTo(W * .05, H * .83); ctx.closePath(); ctx.fill();

    // rồng
    this.hero.draw(ctx, W * .185, H * .765, 178, 1);

    // tiêu đề
    const bob = Math.sin(T * 1.4) * 4;
    ctx.save();
    ctx.translate(W / 2, 190 + bob);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const gl = ctx.createRadialGradient(0, 0, 10, 0, 0, 320);
    gl.addColorStop(0, 'rgba(180,140,255,.5)'); gl.addColorStop(1, 'rgba(180,140,255,0)');
    ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(0, 0, 320, 0, TAU); ctx.fill();
    ctx.restore();
    strokeText(ctx, 'SDrakon', 0, 0, { font: '108px "Bungee","Baloo 2",sans-serif', fill: '#fff', stroke: '#3a1d6e', lw: 14, baseline: 'middle' });
    strokeText(ctx, t('tagline'), 0, 74, { font: FONT.disp(40), fill: '#ff5f7a', stroke: '#5c0b22', lw: 8, baseline: 'middle' });
    ctx.restore();

    // nút
    const hasSave = !!G.save.breed;
    for (const h of this.hits) {
      if (h.hidden) continue;
      if (h.id === 'play')
        textBtn(ctx, h.x, h.y, h.w, h.h, hasSave ? t('continueGame') : t('newGame'),
          { press: h.press, hover: h.hover });
      else if (h.id === 'new')
        textBtn(ctx, h.x, h.y, h.w, h.h, G.confirmPending > 0 ? t('confirmReset') : t('newGame'),
          { press: h.press, hover: h.hover,
            colour: G.confirmPending > 0 ? '#e8384f' : '#7a5fae',
            dark:   G.confirmPending > 0 ? '#8c0f22' : '#3b2263',
            lite:   G.confirmPending > 0 ? '#ff9aa8' : '#c0a0ff',
            font: FONT.disp(G.confirmPending > 0 ? 17 : 22) });
      else if (h.id === 'help')
        roundBtn(ctx, h.x + 26, h.y + 26, 26, (c, s) => icon.help(c, s), { press: h.press, hover: h.hover });
      else if (h.id === 'lang')
        roundBtn(ctx, h.x + 26, h.y + 26, 26, (c, s) => icon.globe(c, s), { press: h.press, hover: h.hover });
      else
        roundBtn(ctx, h.x + 26, h.y + 26, 26, (c, s) => icon.note(c, s, !G.audio.muted), { press: h.press, hover: h.hover });
    }
    // nhãn ngôn ngữ hiện tại
    strokeText(ctx, getLang().toUpperCase(), G.W - 126, 92,
      { font: FONT.ui(14, 800), fill: '#fff', stroke: '#2b1740', lw: 3, baseline: 'middle' });

    strokeText(ctx, 'v' + VERSION + ' · ' + t('tapStart'), W / 2, H - 26,
      { font: FONT.ui(15, 600), fill: 'rgba(255,255,255,.62)', stroke: 'rgba(0,0,0,.4)', lw: 3, baseline: 'middle' });
  },
};

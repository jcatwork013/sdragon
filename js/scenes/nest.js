// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  TỔ DẾ — nơi nuôi và trang bị cho nhân vật.                              ║
// ║  Ba thẻ: HUẤN LUYỆN (tiêu vàng) · CHẾ TẠO (tiêu nguyên liệu) · TRANG BỊ. ║
// ╚══════════════════════════════════════════════════════════════════════════╝
import { TAU, clamp, lerp, ease, rgba, shade, strokeText, roundRect } from '../core/util.js';
import { t, tx } from '../core/i18n.js';
import { Hit, textBtn, card, glassPanel, statBar, icon, matIcon, C, FONT, starBar } from '../ui/widgets.js';
import { BREEDS, STAGES, TRAININGS, stageFor, nextStage } from '../data/characters.js';
import { MATS, MAT_LIST, SLOTS, RECIPES, recipeById, canCraft, gearBonus, canEquip } from '../data/gear.js';
import { heroPower } from '../data/duel.js';
import { bleed } from '../core/layout.js';

const TABS = [
  { id: 'train', vi: 'Huấn luyện', en: 'Train' },
  { id: 'craft', vi: 'Chế tạo',    en: 'Craft' },
  { id: 'gear',  vi: 'Trang bị',   en: 'Gear'  },
];
// Bảng phải bám mép phải và co theo bề ngang thật của thiết bị.
let PX = 640, PW = 616, LX = 24, HEROX = 330;
let PORTRAIT = false, PANEL_Y = 80, HEROY = 446;
function relayout(G) {
  const W = G.W;
  PORTRAIT = G.H > W;
  if (PORTRAIT) {
    LX = 18; PX = 18; PW = W - 36; HEROX = W / 2;
    PANEL_Y = G.H < 1120 ? 450 : Math.min(620, G.H * .45);
    // Đặt toàn thân dưới kho nguyên liệu và trên mép bảng. Nhân vật vẫn lớn
    // nhưng mặt/khăn không còn bị thanh nguyên liệu cắt ngang.
    HEROY = PANEL_Y - 108;
    return;
  }
  const M = W < 1240 ? 18 : 26;
  PW = Math.max(420, Math.min(640, W - 700));
  PX = W - M - PW;
  LX = M;
  HEROX = LX + 274 + (PX - (LX + 274)) / 2;     // nhân vật đứng giữa hai bảng
}

export default {
  name: 'nest',

  enter(G) {
    relayout(G);
    this.t = 0; this.toast = null; this.toastT = 0; this.evolveT = 0;
    this.tab = 'train'; this.scroll = 0; this.bubble = null;
    this.craftSlot = 'helm';
    this.build(G);
    G.audio.play(G.songs.nest);
  },

  build(G) {
    const tabsY = PORTRAIT ? PANEL_Y + 12 : 92;
    const contentY = PORTRAIT ? PANEL_Y + 80 : 160;
    this.hits = [
      new Hit('back', LX, 24, 120, 52, { act: () => { G.sfx('button'); G.go('map'); } }),
      ...TABS.map((tb, i) => new Hit('tab_' + tb.id, PX + i * (PW / 3), tabsY, PW / 3 - 10, 46,
        { act: () => { this.tab = tb.id; this.build(G); G.sfx('select'); } })),
    ];
    if (this.tab === 'train') {
      this.hits.push(new Hit('feed', LX, G.H - 96, 190, 60, { act: () => this.feed(G) }));
      TRAININGS.forEach((tr, i) =>
        this.hits.push(new Hit('tr' + i, PX + 12, contentY + i * 84, PW - 24, 70, { act: () => this.train(G, tr) })));
    } else if (this.tab === 'craft') {
      const gap = 8, filterW = (PW - 24 - gap * (SLOTS.length - 1)) / SLOTS.length;
      SLOTS.forEach((sl, i) => this.hits.push(
        new Hit('cf_' + sl.id, PX + 12 + i * (filterW + gap), contentY - 2, filterW, 42,
          { act: () => { this.craftSlot = sl.id; this.build(G); G.sfx('select'); } })));
      RECIPES.filter(r => r.slot === this.craftSlot).forEach((r, i) => {
        this.hits.push(new Hit('cr_' + r.id, PX + 12, contentY + 52 + i * 96, PW - 24, 84,
          { act: () => this.craft(G, r) }));
      });
    } else {
      // Bốn ô (thêm Khăn) mà vẫn dùng bước nhảy 120 của thời ba ô thì ô cuối
      // chui xuống dưới bảng Tổng cộng. Thu thẻ lại và dời bảng tổng xuống.
      SLOTS.forEach((sl, i) =>
        this.hits.push(new Hit('sl_' + sl.id, PX + 12, contentY - 2 + i * 96, PW - 24, 86,
          { act: () => this.cycle(G, sl.id) })));
      this.hits.push(new Hit('strip', PX + 12, PORTRAIT ? PANEL_Y + 468 : 550, PW - 24, 48, { act: () => this.unequipAll(G) }));
    }
  },

  say(msg, bad = false) { this.toast = msg; this.toastT = 1.9; this.toastBad = bad; },

  // ── hành động ─────────────────────────────────────────────────────────────
  feed(G) {
    if (G.save.food <= 0) { G.sfx('invalid'); this.say(t('notEnough'), true); return; }
    if ((G.save.fed ?? 0) >= G.FED_MAX) G.save.fedAt = Date.now();
    G.save.fed = Math.min(G.FED_MAX, (G.save.fed ?? 0) + G.FED_FEED);   // hồi một phần, không no căng
    G.save.food--; this.gainXp(G, 420);
    G.hero.react('eat', .8); G.sfx('gulp');
    G.fx.sparkle(HEROX, HEROY - 28, '#b6ffd8', 14);
    G.persist();
  },
  train(G, tr) {
    const lvl = G.save.stats[tr.id] || 0, cost = tr.cost(lvl);
    if (G.save.gold < cost) { G.sfx('invalid'); this.say(t('notEnough'), true); return; }
    G.save.gold -= cost; G.save.stats[tr.id] = lvl + 1;
    this.gainXp(G, 260);
    G.hero.react('happy', 1.1); G.sfx('levelup');
    G.fx.ring(HEROX, HEROY - 28, '#ffd23f', 20, 220, .6, 10);
    this.say(t('trained'));
    G.persist();
  },
  craft(G, r) {
    if (G.save.crafted?.[r.id]) { G.sfx('select'); this.equip(G, r); return; }
    if (!canCraft(G.save, r)) { G.sfx('invalid'); this.say(t('needMats'), true); return; }
    for (const [m, n] of Object.entries(r.cost)) G.save.mats[m] -= n;
    G.save.crafted = G.save.crafted || {};
    G.save.crafted[r.id] = true;
    this.equip(G, r);                       // chế xong mặc luôn cho tiện
    G.sfx('levelup'); G.hero.react('proud', 1.4);
    G.fx.ring(HEROX, HEROY - 28, r.col, 16, 240, .7, 12);
    G.fx.sparkle(HEROX, HEROY - 28, r.col, 22);
    this.say(t('crafted', { n: tx(r, 'name') }));
    G.persist();
  },
  equip(G, r) {
    const rq = canEquip(G.save, r);
    if (!rq.ok) { G.sfx('invalid'); this.say(t('needStage', { s: tx(STAGES[rq.need], 'name') }), true); return; }
    G.save.equip = G.save.equip || {};
    G.save.equip[r.slot] = r.id;
    G.hero.gear = { ...G.save.equip };
    G.persist();
  },
  /** Bấm vào ô trang bị để xoay vòng qua các món đã chế của ô đó. */
  cycle(G, slot) {
    // Chỉ xoay vòng qua món ĐỦ ĐIỀU KIỆN mặc, kẻo bấm trúng món khoá thì im re.
    const all = RECIPES.filter(r => r.slot === slot && G.save.crafted?.[r.id]);
    const owned = all.filter(r => canEquip(G.save, r).ok);
    if (!all.length) { G.sfx('invalid'); this.say(t('noGear'), true); return; }
    if (!owned.length) {
      G.sfx('invalid');
      this.say(t('needStage', { s: tx(STAGES[canEquip(G.save, all[0]).need], 'name') }), true);
      return;
    }
    const cur = G.save.equip?.[slot];
    const i = owned.findIndex(r => r.id === cur);
    const next = i + 1 >= owned.length ? null : owned[i + 1];   // vòng cuối = tháo ra
    G.save.equip[slot] = next ? next.id : (i === -1 ? owned[0].id : null);
    G.hero.gear = { ...G.save.equip };
    G.sfx('select'); G.persist();
  },
  unequipAll(G) {
    G.save.equip = { helm: null, scarf: null, armor: null, weapon: null };
    G.hero.gear = { ...G.save.equip };
    G.sfx('button'); this.say(t('unequipped'));
    G.persist();
  },
  gainXp(G, n) {
    const before = stageFor(G.save.xp).id;
    G.save.xp += n; G.hero.xp = G.save.xp;
    if (stageFor(G.save.xp).id > before) {
      this.evolveT = 2.2;
      G.hero.chirpBurst(1.2); G.sfx('chirp'); G.fx.shake(18);
      G.fx.ring(HEROX, HEROY - 28, '#fff', 30, 420, .9, 16);
    }
  },

  up(G, x, y) {
    // chạm vào con dế giữa màn → nó giãy nảy lên
    if (Math.hypot(x - HEROX, y - (HEROY - 60)) < 130) {
      const p = G.hero.poke();
      this.bubble = { p, t: 0 };
      G.sfx(p.mood === 'chirp' ? 'chirp' : 'select');
      G.fx.sparkle(HEROX, HEROY - 80, '#ffe9a8', 12);
    }
  },

  update(G, dt) {
    this.t += dt;
    G.world.update(dt, 0);
    G.hero.update(dt);
    if (this.toastT > 0) this.toastT -= dt;
    if (this.bubble) { this.bubble.t += dt; if (this.bubble.t > 3.2) this.bubble = null; }
    if (this.evolveT > 0) this.evolveT -= dt;
  },

  // ── vẽ ────────────────────────────────────────────────────────────────────
  draw(G, ctx) {
    const { W, H } = G, S = G.save;
    G.world.draw(ctx);
    ctx.fillStyle = 'rgba(24,14,46,.36)'; ctx.fillRect(...bleed(G));
    strokeText(ctx, t('nestTitle'), HEROX, 52,
      { font: FONT.disp(36), fill: '#fff', stroke: '#3a1d6e', lw: 8, baseline: 'middle' });

    this.drawHero(G, ctx);
    this.drawLeft(G, ctx);

    glassPanel(ctx, PX - (PORTRAIT ? 0 : 12), PANEL_Y, PW + (PORTRAIT ? 0 : 24), H - PANEL_Y - (PORTRAIT ? 112 : 80), 22);
    TABS.forEach((tb, i) => {
      const h = this.hits.find(x => x.id === 'tab_' + tb.id); if (!h) return;
      const on = this.tab === tb.id;
      textBtn(ctx, h.x, h.y, h.w, h.h, tx(tb, 'vi'), {
        press: h.press, hover: h.hover, font: FONT.disp(20),
        colour: on ? '#3fbf4a' : '#4a4f66', dark: on ? '#1d6b24' : '#2b2f40', lite: on ? '#8ef08a' : '#7a8098',
      });
    });
    if (this.tab === 'train') this.drawTrain(G, ctx);
    else if (this.tab === 'craft') this.drawCraft(G, ctx);
    else this.drawGear(G, ctx);

    const bk = this.hits.find(h => h.id === 'back');
    textBtn(ctx, bk.x, bk.y, bk.w, bk.h, '‹ ' + t('back'),
      { press: bk.press, hover: bk.hover, colour: '#7a5fae', dark: '#3b2263', lite: '#c0a0ff', font: FONT.disp(20) });

    if (this.bubble) {
      const b = this.bubble, txt = tx(b.p, 'vi');
      ctx.save();
      ctx.globalAlpha = clamp((3.2 - b.t) / .5, 0, 1);
      const e = ease.outBack(clamp(b.t / .22, 0, 1));
      ctx.font = FONT.disp(21);
      const bw = ctx.measureText(txt).width + 46;
      const bx = HEROX, by = PORTRAIT ? HEROY - 145 : H * .62 - 250;
      ctx.translate(bx, by); ctx.scale(e, e); ctx.translate(-bx, -by);
      glassPanel(ctx, bx - bw / 2, by - 27, bw, 52, 16,
        { top: 'rgba(60,40,16,.95)', bot: 'rgba(30,18,6,.96)', rim: 'rgba(255,214,110,.7)' });
      ctx.beginPath();
      ctx.moveTo(bx - 12, by + 25); ctx.lineTo(bx, by + 42); ctx.lineTo(bx + 12, by + 25);
      ctx.closePath(); ctx.fillStyle = 'rgba(30,18,6,.96)'; ctx.fill();
      strokeText(ctx, txt, bx, by - 1,
        { font: FONT.disp(21), fill: '#ffe066', stroke: '#3a2000', lw: 5, baseline: 'middle' });
      ctx.restore();
    } else if (!PORTRAIT) {
      strokeText(ctx, t('pokeHint'), HEROX, PORTRAIT ? HEROY + 64 : H * .62 - 250,
        { font: FONT.ui(13, 600), fill: 'rgba(255,255,255,.35)', stroke: null, lw: 0, baseline: 'middle', shadow: null });
    }
    if (this.toastT > 0) {
      ctx.save(); ctx.globalAlpha = clamp(this.toastT, 0, 1);
      ctx.font = FONT.disp(23);
      const w = ctx.measureText(this.toast).width + 56;
      glassPanel(ctx, HEROX - w / 2, H - 150, w, 50, 16,
        { top: this.toastBad ? 'rgba(120,20,40,.94)' : 'rgba(24,80,44,.94)', bot: 'rgba(14,8,30,.96)' });
      strokeText(ctx, this.toast, HEROX, H - 125,
        { font: FONT.disp(23), fill: '#fff', stroke: '#1a0f30', lw: 5, baseline: 'middle' });
      ctx.restore();
    }
  },

  drawHero(G, ctx) {
    const dx = HEROX, dy = PORTRAIT ? HEROY : G.H * .62;
    const nestScale = PORTRAIT ? 1.16 : 1;
    ctx.save();
    ctx.fillStyle = 'rgba(20,12,40,.4)';
    ctx.beginPath(); ctx.ellipse(dx, dy + 20, 190 * nestScale, 46 * nestScale, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#8a6329';
    ctx.beginPath(); ctx.ellipse(dx, dy + 14, 168 * nestScale, 40 * nestScale, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#5d4218';
    ctx.beginPath(); ctx.ellipse(dx, dy + 8, 130 * nestScale, 28 * nestScale, 0, 0, TAU); ctx.fill();
    ctx.restore();
    this.straw = this.straw || Array.from({ length: 42 }, (_, i) => ({
      a: i / 42 * TAU, r: 150 + Math.sin(i * 3.1) * 20, sp: .34 + (i % 5) * .09, tone: i % 3 }));
    const ring = (front) => {
      ctx.save(); ctx.lineCap = 'round';
      for (const w of this.straw) {
        if ((Math.sin(w.a) > 0) !== front) continue;
        ctx.strokeStyle = w.tone === 0 ? '#d9ab55' : w.tone === 1 ? '#b9873a' : '#8f6626';
        ctx.lineWidth = 6;
        const yo = front ? 44 : 4;
        ctx.beginPath();
        ctx.moveTo(dx + Math.cos(w.a) * w.r * .92, dy + Math.sin(w.a) * w.r * .26 + yo);
        ctx.lineTo(dx + Math.cos(w.a + w.sp) * w.r, dy + Math.sin(w.a + w.sp) * w.r * .26 + yo + 8);
        ctx.stroke();
      }
      ctx.restore();
    };
    ring(false);
    if (this.evolveT > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const k = clamp(this.evolveT / 2.2, 0, 1);
      const g = ctx.createRadialGradient(dx, dy - 60, 10, dx, dy - 60, 320);
      g.addColorStop(0, `rgba(255,240,190,${k * .7})`); g.addColorStop(1, 'rgba(255,220,150,0)');
      ctx.fillStyle = g; ctx.fillRect(...bleed(G));
      ctx.restore();
    }
    G.hero.gear = { ...(G.save.equip || {}) };
    // Bề ngang nhân vật ≈ 1.87×S. Cỡ cố định 200 làm nó thò sang cả bảng
    // trang bị bên phải, nên tính theo đúng khoảng trống còn lại.
    G.hero.draw(ctx, dx, dy - 30, PORTRAIT ? 170 : clamp(((PX - 12) - (LX + 274)) / 2.35, 92, 200), 1);
    ring(true);
    if (this.evolveT > 1.2)
      strokeText(ctx, t('newStage'), dx, dy - 250,
        { font: FONT.disp(32), fill: '#ffe066', stroke: '#5c3a00', lw: 8, baseline: 'middle' });
  },

  drawLeft(G, ctx) {
    const S = G.save;
    const breed = BREEDS.find(b => b.id === S.breed) || BREEDS[0];
    const st = stageFor(S.xp), nx = nextStage(S.xp);
    if (PORTRAIT) {
      card(ctx, LX, 92, G.W - 36, 112, 20, { top: '#fffdf7', bot: '#e3eefb' });
      strokeText(ctx, tx(breed, 'name'), LX + 18, 121,
        { font: FONT.disp(27), fill: C.orange, stroke: C.orangeDark, lw: 5, align: 'left', baseline: 'middle' });
      const pw = heroPower(S);
      strokeText(ctx, `${tx(st, 'name')} · ${t('duelPower')} ${pw.power}`, LX + 18, 149,
        { font: FONT.ui(13, 700), fill: '#4a3a66', stroke: null, lw: 0, align: 'left', baseline: 'middle', shadow: null });
      starBar(ctx, LX + 18, 166, G.W - 72, 26, nx ? (S.xp - st.xp) / (nx.xp - st.xp) : 1, { t: this.t });
      ctx.save(); ctx.translate(G.W - 190, 122); icon.pouch(ctx, 32); ctx.restore();
      strokeText(ctx, String(S.gold), G.W - 168, 122,
        { font: FONT.disp(21), fill: '#2b1740', stroke: null, lw: 0, align: 'left', baseline: 'middle', shadow: null });
      ctx.save(); ctx.translate(G.W - 86, 122); icon.leaf(ctx, 32); ctx.restore();
      strokeText(ctx, String(S.food), G.W - 64, 122,
        { font: FONT.disp(21), fill: '#2b1740', stroke: null, lw: 0, align: 'left', baseline: 'middle', shadow: null });

      glassPanel(ctx, LX, 216, G.W - 36, 68, 18);
      MAT_LIST.forEach((m, i) => {
        const x = LX + 38 + i * ((G.W - 112) / MAT_LIST.length), y = 250;
        ctx.save(); ctx.translate(x, y); matIcon(ctx, m.id, 24, m.col); ctx.restore();
        strokeText(ctx, String(S.mats?.[m.id] || 0), x + 18, y,
          { font: FONT.ui(12, 800), fill: '#f3ebff', stroke: '#2a1748', lw: 3, align: 'left', baseline: 'middle' });
      });
      return;
    }
    card(ctx, LX, 92, 274, 176, 20, { top: '#fffdf7', bot: '#e3eefb' });
    strokeText(ctx, tx(breed, 'name'), LX + 18, 124,
      { font: FONT.disp(27), fill: C.orange, stroke: C.orangeDark, lw: 5, align: 'left', baseline: 'middle' });
    ctx.save();
    ctx.font = FONT.ui(14, 600); ctx.fillStyle = '#4a3a66'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(`${t('stage')}: ${tx(st, 'name')}`, LX + 18, 152);
    const pw = heroPower(S);
    ctx.fillText(`${t('duelPower')}: ${pw.power}`, LX + 18, 174);
    ctx.restore();
    starBar(ctx, LX + 18, 192, 238, 28, nx ? (S.xp - st.xp) / (nx.xp - st.xp) : 1, { t: this.t });
    strokeText(ctx, nx ? t('toNext', { n: nx.xp - S.xp, s: tx(nx, 'name') }) : t('maxStage'), LX + 18, 238,
      { font: FONT.ui(12, 600), fill: '#4a3a66', stroke: null, lw: 0, align: 'left', baseline: 'middle', shadow: null });

    card(ctx, LX, 282, 274, 76, 18, { top: '#fffdf7', bot: '#e3eefb' });
    ctx.save(); ctx.translate(60, 320); icon.pouch(ctx, 36); ctx.restore();
    strokeText(ctx, String(S.gold), LX + 64, 320,
      { font: FONT.disp(24), fill: '#2b1740', stroke: null, lw: 0, align: 'left', baseline: 'middle', shadow: null });
    ctx.save(); ctx.translate(190, 320); icon.leaf(ctx, 36); ctx.restore();
    strokeText(ctx, String(S.food), 218, 320,
      { font: FONT.disp(24), fill: '#2b1740', stroke: null, lw: 0, align: 'left', baseline: 'middle', shadow: null });

    // kho nguyên liệu
    glassPanel(ctx, LX, 372, 274, 128, 18);
    strokeText(ctx, t('mats'), LX + 18, 396,
      { font: FONT.disp(19), fill: '#ffe066', stroke: '#3a1d6e', lw: 4, align: 'left', baseline: 'middle' });
    MAT_LIST.forEach((m, i) => {
      const col = i % 2, row = (i / 2) | 0;
      const x = LX + 22 + col * 128, y = 424 + row * 26;
      ctx.save(); ctx.translate(x, y); matIcon(ctx, m.id, 22, m.col); ctx.restore();
      ctx.save();
      ctx.font = FONT.ui(12, 700); ctx.fillStyle = '#e6dcff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(`${tx(m, 'name')} ${S.mats?.[m.id] || 0}`, x + 14, y);
      ctx.restore();
    });
  },

  drawTrain(G, ctx) {
    const S = G.save;
    TRAININGS.forEach((tr, i) => {
      const h = this.hits.find(x => x.id === 'tr' + i); if (!h) return;
      const lvl = S.stats[tr.id] || 0, cost = tr.cost(lvl), ok = S.gold >= cost;
      textBtn(ctx, h.x, h.y, h.w, h.h, '', {
        press: h.press, hover: h.hover,
        colour: ok ? '#3f8fd0' : '#5b5f74', dark: ok ? '#1c5f9e' : '#33374a', lite: ok ? '#a8dcff' : '#8d92a8' });
      const cy = h.y + h.press * 4 + h.h / 2;
      ctx.save(); ctx.translate(h.x + 34, cy); ctx.globalAlpha = ok ? 1 : .55;
      (icon[tr.glyph] || icon.star)(ctx, 38); ctx.restore();
      strokeText(ctx, tx(tr, 'name'), h.x + 62, cy - 11,
        { font: FONT.disp(22), fill: '#fff', stroke: '#12263e', lw: 4, align: 'left', baseline: 'middle', shadow: null });
      strokeText(ctx, `Lv.${lvl}  ·  ${tx(tr, 'desc')}${lvl + 1}`, h.x + 62, cy + 13,
        { font: FONT.ui(13, 700), fill: '#d8f0ff', stroke: null, lw: 0, align: 'left', baseline: 'middle', shadow: null });
      ctx.save(); ctx.translate(h.x + h.w - 26, cy); ctx.globalAlpha = ok ? 1 : .55; icon.coin(ctx, 26); ctx.restore();
      strokeText(ctx, String(cost), h.x + h.w - 44, cy,
        { font: FONT.disp(21), fill: ok ? '#ffe066' : '#c0c4d4', stroke: '#12263e', lw: 4, align: 'right', baseline: 'middle', shadow: null });
    });
    const fd = this.hits.find(h => h.id === 'feed');
    if (fd) textBtn(ctx, fd.x, fd.y, fd.w, fd.h, t('feed'),
      { press: fd.press, hover: fd.hover, colour: C.orange, dark: C.orangeDark, lite: C.orangeLite, font: FONT.disp(22) });
  },

  drawCraft(G, ctx) {
    const S = G.save;
    // Lọc theo ô trang bị: người chơi đang tìm mũ thì chỉ nhìn thấy mũ, thay
    // vì phải quét một bức tường 16 công thức chen kín hai cột.
    SLOTS.forEach((sl) => {
      const h = this.hits.find(x => x.id === 'cf_' + sl.id); if (!h) return;
      const on = this.craftSlot === sl.id;
      textBtn(ctx, h.x, h.y, h.w, h.h, tx(sl, 'name'), {
        press: h.press, hover: h.hover, font: FONT.ui(14, 800),
        colour: on ? '#8b5fd6' : '#454a60', dark: on ? '#3b2263' : '#282c3b',
        lite: on ? '#cfa8ff' : '#757b91',
      });
    });
    RECIPES.filter(r => r.slot === this.craftSlot).forEach((r) => {
      const h = this.hits.find(x => x.id === 'cr_' + r.id); if (!h) return;
      const owned = !!S.crafted?.[r.id];
      const ok = owned || canCraft(S, r);
      const worn = S.equip?.[r.slot] === r.id;
      textBtn(ctx, h.x, h.y, h.w, h.h, '', {
        press: h.press, hover: h.hover,
        colour: worn ? '#3fbf4a' : owned ? '#8b5fd6' : ok ? '#3f8fd0' : '#4a4f66',
        dark:   worn ? '#1d6b24' : owned ? '#3b2263' : ok ? '#1c5f9e' : '#2b2f40',
        lite:   worn ? '#8ef08a' : owned ? '#cfa8ff' : ok ? '#a8dcff' : '#7a8098' });
      const cy = h.y + h.press * 4;
      // biểu tượng món đồ
      ctx.save(); ctx.translate(h.x + 30, cy + 30);
      gearIcon(ctx, r.slot, 34, r.col); ctx.restore();
      strokeText(ctx, tx(r, 'name'), h.x + 54, cy + 20,
        { font: FONT.disp(18), fill: '#fff', stroke: '#12263e', lw: 4, align: 'left', baseline: 'middle', shadow: null });
      const bonus = Object.entries(r.add).map(([k, v]) => `${t('st_' + k)}+${v}`).join('  ');
      strokeText(ctx, bonus, h.x + 54, cy + 42,
        { font: FONT.ui(12, 700), fill: '#d8f0ff', stroke: null, lw: 0, align: 'left', baseline: 'middle', shadow: null });
      // nguyên liệu cần
      if (!owned) {
        Object.entries(r.cost).forEach(([m, n], j) => {
          const have = S.mats?.[m] || 0;
          const x = h.x + 14 + j * 62, y = cy + 66;
          ctx.save(); ctx.translate(x, y); matIcon(ctx, m, 18, MATS[m].col); ctx.restore();
          strokeText(ctx, `${have}/${n}`, x + 11, y,
            { font: FONT.ui(12, 800), fill: have >= n ? '#8ef08a' : '#ff9aa8', stroke: null, lw: 0, align: 'left', baseline: 'middle', shadow: null });
        });
      } else {
        strokeText(ctx, worn ? t('worn') : t('ownedTap'), h.x + 14, cy + 66,
          { font: FONT.ui(12, 800), fill: worn ? '#8ef08a' : '#cfa8ff', stroke: null, lw: 0, align: 'left', baseline: 'middle', shadow: null });
      }
    });
  },

  drawGear(G, ctx) {
    const S = G.save;
    const g = gearBonus(S);
    SLOTS.forEach((sl, i) => {
      const h = this.hits.find(x => x.id === 'sl_' + sl.id); if (!h) return;
      const r = recipeById(S.equip?.[sl.id]);
      // Đếm cả đồ MUA ở cửa hàng — trước chỉ đếm đồ chế nên đang mặc đồ mua
      // mà vẫn hiện "đã có: 0", đọc ra như mặc một món không tồn tại.
      const owned = RECIPES.filter(x => x.slot === sl.id && S.crafted?.[x.id]).length
                  + Object.keys(S.owned || {}).filter(id => S.owned[id] && recipeById(id)?.slot === sl.id).length;
      textBtn(ctx, h.x, h.y, h.w, h.h, '', {
        press: h.press, hover: h.hover,
        colour: r ? '#3fbf4a' : '#4a4f66', dark: r ? '#1d6b24' : '#2b2f40', lite: r ? '#8ef08a' : '#7a8098' });
      const cy = h.y + h.press * 4;
      ctx.save(); ctx.translate(h.x + 40, cy + 43);
      gearIcon(ctx, sl.id, 46, r ? r.col : '#6b7086'); ctx.restore();
      strokeText(ctx, tx(sl, 'name'), h.x + 76, cy + 22,
        { font: FONT.ui(12, 800), fill: '#cfe6ff', stroke: null, lw: 0, align: 'left', baseline: 'middle', shadow: null });
      strokeText(ctx, r ? tx(r, 'name') : t('empty'), h.x + 76, cy + 45,
        { font: FONT.disp(21), fill: r ? '#fff' : '#9aa0b6', stroke: '#12263e', lw: 4, align: 'left', baseline: 'middle', shadow: null });
      if (r) strokeText(ctx, Object.entries(r.add).map(([k, v]) => `${t('st_' + k)}+${v}`).join('   '), h.x + 76, cy + 67,
        { font: FONT.ui(12, 700), fill: '#d8f0ff', stroke: null, lw: 0, align: 'left', baseline: 'middle', shadow: null });
      strokeText(ctx, t('ownCount', { n: owned }), h.x + h.w - 14, cy + 22,
        { font: FONT.ui(11, 700), fill: '#b0a4d0', stroke: null, lw: 0, align: 'right', baseline: 'middle', shadow: null });
    });
    // tổng cộng
    const sy = PORTRAIT ? PANEL_Y + 468 : 548;
    glassPanel(ctx, PX + 12, sy, PW - 24, 52, 14);
    strokeText(ctx, `${t('gearTotal')}:  ${t('st_hp')}+${g.hp}   ${t('st_atk')}+${g.atk}   ${t('st_crit')}+${g.crit}%`,
      PX + PW / 2, sy + 26, { font: FONT.disp(19), fill: '#ffe066', stroke: '#3a1d6e', lw: 4, baseline: 'middle' });
    const st = this.hits.find(h => h.id === 'strip');
    if (st) { st.x = PX + 12; st.y = sy; st.w = PW - 24; st.h = 52; }
  },
};

/** Biểu tượng cho từng ô trang bị — cùng một hình dùng cho cả bảng chế tạo
 *  lẫn ô đang mặc, nên phải đọc được ở cả cỡ 34px lẫn 52px. */
function gearIcon(ctx, slot, s, col) {
  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const ink = 'rgba(18,10,26,.75)';
  const body = () => {
    const g = ctx.createLinearGradient(-s * .34, -s * .40, s * .30, s * .40);
    g.addColorStop(0, shade(col, .46)); g.addColorStop(.48, col); g.addColorStop(1, shade(col, -.38));
    return g;
  };
  const paint = (lw = .085) => {
    ctx.fillStyle = body(); ctx.fill();
    ctx.strokeStyle = ink; ctx.lineWidth = s * lw; ctx.stroke();
  };
  const stud = (x, y, r) => {
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU);
    ctx.fillStyle = shade(col, .55); ctx.fill();
    ctx.strokeStyle = ink; ctx.lineWidth = s * .035; ctx.stroke();
  };

  if (slot === 'helm') {
    // hai chấu sừng — vẽ trước để nằm sau vòm mũ
    for (const d of [-1, 1]) {
      ctx.save(); ctx.translate(d * s * .27, -s * .26); ctx.rotate(d * .55);
      ctx.beginPath();
      ctx.moveTo(-s * .07, s * .12);
      ctx.quadraticCurveTo(0, -s * .34, s * .07, s * .12);
      ctx.closePath(); paint(.07);
      ctx.restore();
    }
    // vòm mũ
    ctx.beginPath();
    ctx.moveTo(-s * .34, s * .14);
    ctx.bezierCurveTo(-s * .36, -s * .32, s * .36, -s * .32, s * .34, s * .14);
    ctx.quadraticCurveTo(0, s * .02, -s * .34, s * .14);
    ctx.closePath(); paint();
    // vành mũ + thanh che mũi
    ctx.beginPath();
    ctx.moveTo(-s * .38, s * .12);
    ctx.quadraticCurveTo(0, s * .00, s * .38, s * .12);
    ctx.quadraticCurveTo(0, s * .24, -s * .38, s * .12);
    ctx.closePath();
    ctx.fillStyle = shade(col, -.26); ctx.fill();
    ctx.strokeStyle = ink; ctx.lineWidth = s * .06; ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-s * .05, s * .06); ctx.lineTo(-s * .05, s * .32);
    ctx.quadraticCurveTo(0, s * .38, s * .05, s * .32); ctx.lineTo(s * .05, s * .06);
    ctx.closePath();
    ctx.fillStyle = shade(col, -.10); ctx.fill();
    ctx.strokeStyle = ink; ctx.lineWidth = s * .05; ctx.stroke();
    stud(-s * .22, s * .11, s * .035); stud(s * .22, s * .11, s * .035);
    ctx.fillStyle = 'rgba(255,255,255,.50)';
    ctx.beginPath(); ctx.ellipse(-s * .12, -s * .16, s * .16, s * .055, -.22, 0, TAU); ctx.fill();

  } else if (slot === 'scarf') {
    // Thiếu nhánh này thì ô Khăn rơi xuống nhánh cuối và hiện ra con dao.
    ctx.beginPath();
    ctx.moveTo(-s * .36, -s * .18);
    ctx.quadraticCurveTo(0, -s * .34, s * .36, -s * .18);
    ctx.quadraticCurveTo(s * .16, s * .02, s * .10, s * .34);
    ctx.lineTo(-s * .04, s * .16);
    ctx.lineTo(-s * .16, s * .34);
    ctx.quadraticCurveTo(-s * .20, s * .00, -s * .36, -s * .18);
    ctx.closePath();
    ctx.fillStyle = col; ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = s * .05;
    ctx.beginPath(); ctx.moveTo(-s * .22, -s * .14); ctx.quadraticCurveTo(0, -s * .26, s * .22, -s * .14); ctx.stroke();
  } else if (slot === 'armor') {
    // tấm giáp ngực có bờ vai
    ctx.beginPath();
    ctx.moveTo(0, -s * .40);
    ctx.lineTo(s * .30, -s * .30);
    ctx.bezierCurveTo(s * .36, -s * .04, s * .28, s * .24, 0, s * .42);
    ctx.bezierCurveTo(-s * .28, s * .24, -s * .36, -s * .04, -s * .30, -s * .30);
    ctx.closePath(); paint();
    // sống giữa
    ctx.beginPath();
    ctx.moveTo(0, -s * .32); ctx.lineTo(0, s * .32);
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = s * .05; ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-s * .26, -s * .16); ctx.quadraticCurveTo(0, -s * .04, s * .26, -s * .16);
    ctx.strokeStyle = 'rgba(18,10,26,.42)'; ctx.lineWidth = s * .045; ctx.stroke();
    stud(-s * .19, -s * .24, s * .038); stud(s * .19, -s * .24, s * .038);
    ctx.fillStyle = 'rgba(255,255,255,.45)';
    ctx.beginPath(); ctx.ellipse(-s * .14, -s * .14, s * .09, s * .17, .28, 0, TAU); ctx.fill();

  } else {
    // vuốt/lưỡi gắn cán, tay cầm quấn dây
    ctx.save(); ctx.rotate(-.22);
    ctx.beginPath();
    ctx.moveTo(-s * .30, s * .34);
    ctx.lineTo(-s * .16, s * .18);
    ctx.lineTo(s * .12, -s * .12);
    ctx.stroke();
    ctx.strokeStyle = '#5f3c18'; ctx.lineWidth = s * .13; ctx.stroke();
    ctx.strokeStyle = '#9a6a34'; ctx.lineWidth = s * .075; ctx.stroke();
    // dây quấn
    ctx.strokeStyle = 'rgba(40,24,8,.60)'; ctx.lineWidth = s * .035;
    for (let i = 0; i < 3; i++) {
      const u = .10 + i * .16;
      ctx.beginPath();
      ctx.moveTo(-s * .30 + u * s * .30, s * .34 - u * s * .26);
      ctx.lineTo(-s * .24 + u * s * .30, s * .40 - u * s * .26);
      ctx.stroke();
    }
    // lưỡi
    ctx.beginPath();
    ctx.moveTo(s * .04, -s * .04);
    ctx.quadraticCurveTo(s * .30, -s * .40, s * .40, -s * .34);
    ctx.quadraticCurveTo(s * .40, -s * .10, s * .18, s * .10);
    ctx.closePath(); paint(.075);
    ctx.beginPath();
    ctx.moveTo(s * .12, -s * .06); ctx.quadraticCurveTo(s * .28, -s * .26, s * .36, -s * .28);
    ctx.strokeStyle = 'rgba(255,255,255,.60)'; ctx.lineWidth = s * .045; ctx.stroke();
    ctx.restore();
    // chuôi
    ctx.beginPath(); ctx.arc(-s * .24, s * .29, s * .085, 0, TAU);
    ctx.fillStyle = shade(col, .18); ctx.fill();
    ctx.strokeStyle = ink; ctx.lineWidth = s * .05; ctx.stroke();
  }
  ctx.restore();
}

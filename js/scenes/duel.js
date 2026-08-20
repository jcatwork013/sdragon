// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  MÀN ĐẤU TAY ĐÔI — kéo–búa–bao với thế lực hắc ám.                       ║
// ║  Mỗi hiệp hai bên cùng ra đòn; khắc chế thì đánh trúng, hết máu thì thua. ║
// ╚══════════════════════════════════════════════════════════════════════════╝
import { TAU, clamp, lerp, ease, rand, rgba, shade, strokeText, roundRect, poly } from '../core/util.js';
import { t, tx } from '../core/i18n.js';
import { Hit, textBtn, card, glassPanel, roundBtn, icon, matIcon, C, FONT } from '../ui/widgets.js';
import { MOVES, beats, makeFoe, heroPower } from '../data/duel.js';
import { Enemy, ENEMIES } from '../game/enemy.js';
import { BREEDS, stageFor } from '../data/characters.js';
import { rollMats, addMats, MATS } from '../data/gear.js';

const HX = 330, FX = 950, GY = 330;          // vị trí ta / địch / mặt đất

export default {
  name: 'duel',

  enter(G, arg = {}) {
    this.after = arg.after || (() => G.go('map'));
    this.t = 0;
    this.me = heroPower(G.save);
    this.hp = this.me.hp; this.maxHp = this.me.hp;
    this.foe = makeFoe(G.save, arg.bias || 1);
    this.foeArt = new Enemy(this.foe.def.art, 1);
    this.foeArt.def = { ...ENEMIES[this.foe.def.art], ...this.foe.def };
    this.foeArt.maxHp = this.foe.max; this.foeArt.hp = this.foe.hp;

    this.round = 0; this.charge = 0; this.streak = 0;
    this.phase = 'pick';                      // pick → reveal → resolve → pick | over
    this.pickMine = null; this.pickFoe = null;
    this.phaseT = 0; this.log = []; this.over = null; this.overT = 0;
    this.lungeMe = 0; this.lungeFoe = 0; this.flash = 0;
    this.history = [];                        // đòn địch đã ra, dùng để "đọc bài" nhẹ

    this.hits = [
      ...MOVES.map((m, i) => new Hit('mv' + i, G.W / 2 - 300 + i * 205, G.H - 132, 190, 78,
        { act: () => this.play(G, m.id) })),
      new Hit('flee', 28, G.H - 84, 170, 56, { act: () => this.flee(G) }),
    ];
    G.world.setTheme({ sky: ['#4a3560', '#2e2044', '#151024'], hill: '#39424a', mount: '#3b3450' });
    G.music('climax');
    G.hero.react('proud', 1.2);
  },

  // ── một hiệp ──────────────────────────────────────────────────────────────
  play(G, moveId) {
    if (this.phase !== 'pick' || this.over) return;
    this.pickMine = moveId;
    this.pickFoe = this.foeChoice();
    this.history.push(moveId);
    this.phase = 'reveal'; this.phaseT = 0;
    this.round++;
    G.sfx('select');
  },

  /** Địch chọn phần lớn ngẫu nhiên, nhưng hơi nghiêng về khắc chế đòn bạn hay dùng. */
  foeChoice() {
    if (this.history.length >= 3 && Math.random() < 0.34) {
      const count = {};
      for (const h of this.history.slice(-6)) count[h] = (count[h] || 0) + 1;
      const fav = Object.entries(count).sort((a, b) => b[1] - a[1])[0][0];
      const counter = MOVES.find(m => m.beats === fav);
      if (counter) return counter.id;
    }
    return MOVES[(Math.random() * MOVES.length) | 0].id;
  },

  resolve(G) {
    const a = this.pickMine, b = this.pickFoe;
    const crit = (p) => Math.random() * 100 < p;
    if (a === b) {                                   // hoà: cả hai sượt nhẹ
      const d = Math.round(this.me.atk * .18);
      this.hp -= d; this.foe.hp -= Math.round(this.foe.atk * .18);
      this.push(t('duelTie'), '#c9b8ff');
      G.sfx('tick');
      this.streak = 0;
    } else if (beats(a, b)) {                        // ta thắng thế
      const boost = this.charge >= 1 ? 2 : 1;
      const isCrit = crit(this.me.crit);
      const d = Math.round(this.me.atk * boost * (isCrit ? 1.7 : 1) * rand(1.1, .9));
      this.foe.hp -= d;
      this.lungeMe = 1; this.flash = .3;
      this.push((boost > 1 ? t('duelCharged') + ' ' : '') + (isCrit ? t('duelCrit') + ' ' : '') + `-${d}`, '#8ef08a');
      G.fx.float(FX, GY - 120, '-' + d, { size: isCrit ? 44 : 34, fill: '#fff', stroke: '#5c0010' });
      G.fx.burst(FX, GY - 90, { lite: '#ffd0d0', base: '#e8384f', dark: '#5c0010', spark: '#fff' }, 12, 1.2);
      G.fx.shake(boost > 1 ? 18 : 9);
      G.sfx(boost > 1 ? 'bomb' : 'blast');
      if (boost > 1) this.charge = 0;
      this.streak++;
      this.charge = Math.min(1, this.charge + 0.34 * this.me.charge);
      this.foeArt.damage(d);
    } else {                                         // địch thắng thế
      const isCrit = crit(this.foe.crit);
      const d = Math.round(this.foe.atk * (isCrit ? 1.6 : 1) * rand(1.1, .9));
      this.hp -= d;
      this.lungeFoe = 1; this.flash = .35;
      this.push((isCrit ? t('duelCrit') + ' ' : '') + `-${d}`, '#ff7a90');
      G.fx.float(HX, GY - 120, '-' + d, { size: isCrit ? 42 : 32, fill: '#ffb0bc', stroke: '#5c0010' });
      G.fx.shake(11);
      G.sfx('invalid');
      G.hero.react('hurt', .7);
      this.streak = 0;
      this.charge = Math.max(0, this.charge - .12);
    }
    this.hp = Math.max(0, this.hp);
    this.foe.hp = Math.max(0, this.foe.hp);
    if (this.foe.hp <= 0) return this.finish(G, true);
    if (this.hp <= 0) return this.finish(G, false);
    this.phase = 'pick'; this.pickMine = null; this.pickFoe = null;
  },

  push(msg, col) { this.log.unshift({ msg, col, t: 0 }); this.log.length = Math.min(this.log.length, 4); },

  flee(G) {
    if (this.over) return;
    const lost = Math.round(G.save.gold * .10);
    G.save.gold = Math.max(0, G.save.gold - lost);
    G.persist();
    this.fleeGold = lost;
    G.sfx('warn');
    this.finish(G, false, true);
  },

  finish(G, win, fled = false) {
    this.over = { win, fled }; this.overT = 0;
    const S = G.save;
    if (win) {
      this.rewardGold = 120 + Math.round(this.foe.power * 3.2);
      this.rewardXp = 150 + this.foe.power * 2;
      S.gold += this.rewardGold; S.xp += this.rewardXp;
      if (Math.random() < .45) S.food += 1;
      this.matsGot = addMats(S, rollMats(1 + Math.round(this.foe.ratio * 2), this.me.stage * 8));
      G.hero.xp = S.xp; G.persist();
      G.sfx('win'); G.hero.react('happy', 2.2); G.music('nest');
    } else if (!fled) {
      this.penaltyGold = Math.round(S.gold * .12);
      S.gold = Math.max(0, S.gold - this.penaltyGold);
      G.persist();
      G.sfx('lose'); G.hero.react('hurt', 2);
    }
    this.hits = [new Hit('done', G.W / 2 - 120, G.H - 116, 240, 64, { act: () => this.after() })];
  },

  update(G, dt) {
    this.t += dt;
    G.world.update(dt, 0);
    G.hero.update(dt);
    this.foeArt.update(dt);
    this.lungeMe = Math.max(0, this.lungeMe - dt * 2.6);
    this.lungeFoe = Math.max(0, this.lungeFoe - dt * 2.6);
    this.flash = Math.max(0, this.flash - dt * 2.2);
    for (const l of this.log) l.t += dt;
    if (this.over) { this.overT += dt; return; }
    if (this.phase === 'reveal') {
      this.phaseT += dt;
      if (this.phaseT > .62) { this.phase = 'resolve'; this.resolve(G); }
    }
  },

  up(G, x, y) {},
  key(G, e) {
    if (this.phase !== 'pick' || this.over) return;
    const i = ['1', '2', '3'].indexOf(e.key);
    if (i >= 0) this.play(G, MOVES[i].id);
  },

  // ── vẽ ────────────────────────────────────────────────────────────────────
  draw(G, ctx) {
    const { W, H } = G;
    G.world.draw(ctx);
    ctx.fillStyle = 'rgba(10,6,20,.52)'; ctx.fillRect(0, 0, W, H);

    strokeText(ctx, t('duelTitle'), W / 2, 44,
      { font: FONT.disp(34), fill: '#ff9aa8', stroke: '#3a0010', lw: 8, baseline: 'middle' });
    strokeText(ctx, t('duelRound', { n: this.round }), W / 2, 78,
      { font: FONT.ui(15, 700), fill: '#c9b8ff', stroke: null, lw: 0, baseline: 'middle', shadow: null });

    // ── hai đấu sĩ ────────────────────────────────────────────────────────
    const meLunge = ease.outQuad(this.lungeMe) * 60;
    const foeLunge = ease.outQuad(this.lungeFoe) * 60;
    G.hero.draw(ctx, HX + meLunge, GY, 178, 1);
    ctx.save();
    ctx.translate(FX - foeLunge, GY - 60);
    ctx.scale(-1, 1);                       // quay mặt về phía người chơi
    this.foeArt.draw(ctx, 0, 0, 210);
    ctx.restore();

    this.bar(ctx, 90, 128, 420, 30, this.hp / this.maxHp, '#3fbf4a', `${Math.ceil(this.hp)} / ${this.maxHp}`,
             tx(BREEDS.find(b => b.id === G.save.breed) || BREEDS[0], 'name'));
    this.bar(ctx, W - 510, 128, 420, 30, this.foe.hp / this.foe.max, '#e8384f',
             `${Math.ceil(this.foe.hp)} / ${this.foe.max}`, tx(this.foe.def, 'name'), true);

    // so sánh lực — cho biết trận này cân hay lệch
    const r = this.foe.ratio;
    const lbl = r < .95 ? t('duelWeaker') : r > 1.05 ? t('duelStronger') : t('duelEven');
    const col = r < .95 ? '#8ef08a' : r > 1.05 ? '#ff9aa8' : '#ffe066';
    strokeText(ctx, lbl, W / 2, 128,
      { font: FONT.disp(19), fill: col, stroke: '#1a0f30', lw: 5, baseline: 'middle' });
    strokeText(ctx, `${this.me.power} vs ${this.foe.power}`, W / 2, 156,
      { font: FONT.ui(13, 700), fill: '#b0a4d0', stroke: null, lw: 0, baseline: 'middle', shadow: null });

    // câu khích của địch
    if (this.round === 0 && !this.over) {
      ctx.save(); ctx.globalAlpha = .5 + .5 * Math.sin(this.t * 2);
      strokeText(ctx, '“' + tx(this.foe.def, 'taunt') + '”', W / 2, 196,
        { font: FONT.ui(16, 600), fill: '#ffd0d8', stroke: '#3a0010', lw: 3, baseline: 'middle' });
      ctx.restore();
    }

    // ── đòn đã ra ─────────────────────────────────────────────────────────
    if (this.phase === 'reveal' || this.phase === 'resolve') {
      const k = clamp(this.phaseT / .34, 0, 1);
      this.moveBadge(ctx, HX + 150, 202, this.pickMine, ease.outBack(k), '#8ef08a');
      this.moveBadge(ctx, FX - 150, 202, this.phaseT > .3 ? this.pickFoe : null, ease.outBack(clamp((this.phaseT - .3) / .3, 0, 1)), '#ff9aa8');
    }

    // ── thanh Gồng ────────────────────────────────────────────────────────
    const cx = W / 2 - 150, cy = H - 196;
    roundRect(ctx, cx, cy, 300, 20, 10);
    ctx.fillStyle = 'rgba(10,6,20,.85)'; ctx.fill();
    ctx.strokeStyle = 'rgba(255,214,110,.6)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.save(); roundRect(ctx, cx + 2, cy + 2, 296, 16, 8); ctx.clip();
    const cg = ctx.createLinearGradient(cx, 0, cx + 300, 0);
    cg.addColorStop(0, '#ff9a2b'); cg.addColorStop(1, '#ffe066');
    ctx.fillStyle = cg; ctx.fillRect(cx + 2, cy + 2, 296 * clamp(this.charge, 0, 1), 16);
    ctx.restore();
    strokeText(ctx, this.charge >= 1 ? t('duelChargeReady') : t('duelCharge'), W / 2, cy + 10,
      { font: FONT.ui(13, 800), fill: this.charge >= 1 ? '#2b1740' : '#efe8ff', stroke: null, lw: 0, baseline: 'middle', shadow: null });

    // ── nhật ký ───────────────────────────────────────────────────────────
    this.log.forEach((l, i) => {
      ctx.save(); ctx.globalAlpha = clamp(1 - i * .28 - l.t * .12, 0, 1);
      strokeText(ctx, l.msg, W / 2, 272 + i * 26,
        { font: FONT.disp(i === 0 ? 24 : 18), fill: l.col, stroke: '#1a0f30', lw: 5, baseline: 'middle' });
      ctx.restore();
    });

    // ── nút ───────────────────────────────────────────────────────────────
    if (!this.over) {
      MOVES.forEach((m, i) => {
        const h = this.hits.find(x => x.id === 'mv' + i); if (!h) return;
        const on = this.phase === 'pick';
        textBtn(ctx, h.x, h.y, h.w, h.h, '', {
          press: h.press, hover: h.hover,
          colour: on ? '#3f8fd0' : '#4a4f66', dark: on ? '#1c5f9e' : '#2b2f40', lite: on ? '#a8dcff' : '#7a8098',
        });
        const cyy = h.y + h.press * 4 + h.h / 2;
        ctx.save(); ctx.translate(h.x + 46, cyy); ctx.globalAlpha = on ? 1 : .5;
        moveIcon(ctx, m.id, 54); ctx.restore();
        strokeText(ctx, tx(m, 'vi'), h.x + 118, cyy - 8,
          { font: FONT.disp(24), fill: '#fff', stroke: '#12263e', lw: 5, baseline: 'middle', shadow: null });
        strokeText(ctx, `[${i + 1}]  ▸ ${tx(MOVES.find(x => x.id === m.beats), 'vi')}`, h.x + 118, cyy + 16,
          { font: FONT.ui(12, 700), fill: '#cfe6ff', stroke: null, lw: 0, baseline: 'middle', shadow: null });
      });
      const fl = this.hits.find(h => h.id === 'flee');
      if (fl) textBtn(ctx, fl.x, fl.y, fl.w, fl.h, t('duelFlee'),
        { press: fl.press, hover: fl.hover, colour: '#5b5f74', dark: '#33374a', lite: '#9aa0b6', font: FONT.disp(19) });
    }

    if (this.flash > 0) {
      ctx.save(); ctx.globalAlpha = this.flash * .45;
      ctx.fillStyle = this.lungeFoe > this.lungeMe ? '#ff2040' : '#ffffff';
      ctx.fillRect(0, 0, W, H); ctx.restore();
    }
    G.fx.draw(ctx);
    if (this.over) this.drawOver(G, ctx);
  },

  bar(ctx, x, y, w, h, v, col, num, name, right = false) {
    roundRect(ctx, x, y, w, h, h / 2);
    ctx.fillStyle = 'rgba(8,4,18,.9)'; ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.lineWidth = 3; ctx.stroke();
    ctx.save(); roundRect(ctx, x + 3, y + 3, w - 6, h - 6, (h - 6) / 2); ctx.clip();
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, shade(col, -.2)); g.addColorStop(1, shade(col, .3));
    ctx.fillStyle = g;
    const fw = (w - 6) * clamp(v, 0, 1);
    ctx.fillRect(right ? x + 3 + (w - 6 - fw) : x + 3, y + 3, fw, h - 6);
    ctx.restore();
    strokeText(ctx, name, right ? x + w : x, y - 14,
      { font: FONT.disp(22), fill: '#fff', stroke: '#1a0f30', lw: 5, align: right ? 'right' : 'left', baseline: 'middle' });
    strokeText(ctx, num, x + w / 2, y + h / 2 + 1,
      { font: FONT.ui(14, 800), fill: '#fff', stroke: '#1a0f30', lw: 3, baseline: 'middle' });
  },

  moveBadge(ctx, x, y, id, s, col) {
    if (!id || s <= .01) return;
    ctx.save();
    ctx.translate(x, y); ctx.scale(s, s);
    ctx.beginPath(); ctx.arc(0, 0, 46, 0, TAU);
    ctx.fillStyle = 'rgba(14,8,26,.92)'; ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.stroke();
    moveIcon(ctx, id, 68);
    ctx.restore();
  },

  drawOver(G, ctx) {
    const { W, H } = G;
    const k = clamp(this.overT / .5, 0, 1);
    ctx.fillStyle = `rgba(8,4,18,${.75 * k})`; ctx.fillRect(0, 0, W, H);
    const s = ease.outBack(k);
    ctx.save();
    ctx.translate(W / 2, H / 2 - 30); ctx.scale(s, s); ctx.translate(-W / 2, -(H / 2 - 30));
    glassPanel(ctx, W / 2 - 300, 180, 600, 260, 28,
      this.over.win ? { top: 'rgba(30,60,44,.95)', bot: 'rgba(12,26,20,.97)', rim: 'rgba(120,240,150,.5)' }
                    : { top: 'rgba(60,20,36,.95)', bot: 'rgba(24,8,16,.97)', rim: 'rgba(240,90,120,.45)' });
    strokeText(ctx, this.over.fled ? t('duelFled') : this.over.win ? t('duelWin') : t('duelLose'), W / 2, 246,
      { font: FONT.disp(46), fill: this.over.win ? '#8ef08a' : '#ff7a90', stroke: '#12060f', lw: 9, baseline: 'middle' });
    if (this.over.win)
      strokeText(ctx, `+${this.rewardGold} ${t('gold')}     +${this.rewardXp} EXP`, W / 2, 316,
        { font: FONT.disp(26), fill: '#ffe066', stroke: '#4a2d00', lw: 5, baseline: 'middle' });
    else
      strokeText(ctx, t('penalty', { g: this.penaltyGold || this.fleeGold || 0, x: 0 }), W / 2, 316,
        { font: FONT.disp(22), fill: '#ff9aa8', stroke: '#3a0008', lw: 5, baseline: 'middle' });
    if (this.over.win && this.matsGot) {
      const list = Object.entries(this.matsGot);
      const wRow = list.length * 96;
      list.forEach(([id, n], i) => {
        const m = MATS[id]; if (!m) return;
        const x = W / 2 - wRow / 2 + i * 96 + 48;
        ctx.save(); ctx.translate(x - 18, 352); matIcon(ctx, id, 30, m.col); ctx.restore();
        strokeText(ctx, '+' + n, x + 6, 352,
          { font: FONT.disp(20), fill: '#fff', stroke: '#1a0f30', lw: 4, baseline: 'middle' });
      });
    }
    strokeText(ctx, this.over.win ? t('duelTipWin') : t('duelTipLose'), W / 2, 392,
      { font: FONT.ui(15, 600), fill: '#c9b8ff', stroke: null, lw: 0, baseline: 'middle', shadow: null });
    ctx.restore();
    if (k >= 1) {
      const d = this.hits[0];
      textBtn(ctx, d.x, d.y, d.w, d.h, t('gotIt'), { press: d.press, hover: d.hover, font: FONT.disp(26) });
    }
  },
};

/** Ba biểu tượng đòn — vẽ tay cho rõ ràng ở mọi cỡ. */
function moveIcon(ctx, id, s) {
  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (id === 'huc') {                                  // HÚC: đầu lao tới + hai vạch gió
    ctx.fillStyle = '#ffd45c'; ctx.strokeStyle = '#7a4a05'; ctx.lineWidth = s * .07;
    ctx.beginPath(); ctx.ellipse(s * .05, 0, s * .24, s * .19, 0, 0, TAU); ctx.fill(); ctx.stroke();
    poly(ctx, [[s * .22, -s * .16], [s * .40, 0], [s * .22, s * .16]]);
    ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = s * .055;
    ctx.beginPath(); ctx.moveTo(-s * .40, -s * .10); ctx.lineTo(-s * .18, -s * .10);
    ctx.moveTo(-s * .40, s * .10); ctx.lineTo(-s * .18, s * .10); ctx.stroke();
  } else if (id === 'do') {                            // ĐỠ: khiên
    ctx.beginPath();
    ctx.moveTo(0, -s * .32);
    ctx.quadraticCurveTo(s * .30, -s * .24, s * .28, s * .04);
    ctx.quadraticCurveTo(s * .22, s * .28, 0, s * .36);
    ctx.quadraticCurveTo(-s * .22, s * .28, -s * .28, s * .04);
    ctx.quadraticCurveTo(-s * .30, -s * .24, 0, -s * .32);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, -s * .32, 0, s * .36);
    g.addColorStop(0, '#dfe9ff'); g.addColorStop(1, '#6f7b90');
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = '#3a4358'; ctx.lineWidth = s * .07; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = s * .05;
    ctx.beginPath(); ctx.moveTo(0, -s * .20); ctx.lineTo(0, s * .22); ctx.stroke();
  } else {                                             // VỤT: đuôi quất
    ctx.strokeStyle = '#7a4a05'; ctx.lineWidth = s * .13;
    ctx.beginPath();
    ctx.moveTo(-s * .34, s * .22);
    ctx.quadraticCurveTo(s * .04, s * .08, s * .16, -s * .28);
    ctx.stroke();
    ctx.strokeStyle = '#ffd45c'; ctx.lineWidth = s * .075; ctx.stroke();
    ctx.fillStyle = '#fff4d8'; ctx.strokeStyle = '#7a4a05'; ctx.lineWidth = s * .045;
    ctx.beginPath(); ctx.ellipse(s * .18, -s * .30, s * .10, s * .07, -.6, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = s * .05;
    ctx.beginPath(); ctx.arc(-s * .06, -s * .04, s * .30, -1.1, .3); ctx.stroke();
  }
  ctx.restore();
}

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  MÀN ĐẤU TAY ĐÔI — kéo–búa–bao với thế lực hắc ám.                       ║
// ║  Mỗi hiệp hai bên cùng ra đòn; khắc chế thì đánh trúng, hết máu thì thua. ║
// ╚══════════════════════════════════════════════════════════════════════════╝
import { TAU, clamp, lerp, ease, rand, rgba, shade, strokeText, roundRect, poly } from '../core/util.js';
import { t, tx } from '../core/i18n.js';
import { Hit, textBtn, card, glassPanel, roundBtn, icon, matIcon, sunburst, pillTag, C, FONT } from '../ui/widgets.js';
import { MOVES, beats, makeFoe, heroPower, rankById } from '../data/duel.js';
import { pickOuch } from '../data/beats.js';
import { Enemy, ENEMIES } from '../game/enemy.js';
import { Cricket } from '../game/cricket.js';
import { BREEDS, stageFor } from '../data/characters.js';
import { rollMats, addMats, MATS } from '../data/gear.js';
import { bleed } from '../core/layout.js';

let GY = 330;                                // mặt đất; dọc hạ xuống để dùng chiều cao
let PORTRAIT = false;
const INTRO_DUR = 2.0;                       // màn VS mở trận
const REVEAL_DUR = 0.78;                     // khoe chiêu
const CLASH_HIT = 0.26, CLASH_DUR = 0.72;    // lao vào · chạm · dội ra

export default {
  name: 'duel',

  enter(G, arg = {}) {
    PORTRAIT = G.H > G.W;
    GY = PORTRAIT ? Math.min(610, G.H * .40) : 330;
    this.after = arg.after || (() => G.go('map'));
    this.t = 0;
    this.me = heroPower(G.save);
    this.hp = this.me.hp; this.maxHp = this.me.hp;
    this.foe = makeFoe(G.save, arg.bias || 1);
    if (this.foe.def.cricket) {
      // Đối thủ là DẾ: vẽ bằng hàm vẽ nhân vật, bọc lại cho khớp API của Enemy
      // (damage/update/draw) để phần còn lại của màn không phải rẽ nhánh.
      const rival = new Cricket(this.foe.def.breed, 5200);
      rival.gear = {};
      this.foeArt = {
        rival,
        def: this.foe.def,
        damage: (d) => { rival.react('hurt', .7); if (this.foe.hp <= 0) rival.setPose('ko'); },
        update: (dt) => rival.update(dt),
        draw: (ctx, x, y, s) => rival.draw(ctx, x, y, s * .58, -1),
      };
    } else {
      this.foeArt = new Enemy(this.foe.def.art, 1);
      // Trộn bảng DARK đè lên bảng ENEMIES sẽ ghi đè luôn cả `id` — mà hàm vẽ
      // lại rẽ nhánh theo `id`. Hậu quả: MỌI đối thủ hắc ám đều ra con kiến,
      // kể cả Nhện Goá Phụ hay Bọ Ngựa Xám. Giữ lại id của LOÀI để vẽ đúng hình.
      this.foeArt.def = { ...ENEMIES[this.foe.def.art], ...this.foe.def, id: this.foe.def.art };
      this.foeArt.maxHp = this.foe.max; this.foeArt.hp = this.foe.hp;
    }

    this.round = 0; this.charge = 0; this.streak = 0;
    // Gồng nạp bằng THẮNG liên tiếp · Nộ nạp bằng ĂN ĐÒN. Hai thanh khác nhau:
    // một cái thưởng cho người đang trên cơ, một cái gỡ cho người đang bị đè.
    this.rage = 0; this.fury = false;
    // intro = màn VS · reveal = khoe chiêu · clash = lao vào nhau · resolve = ăn đòn
    this.phase = 'intro';
    this.introT = 0; this.clashT = 0; this.impacted = false;
    this.pickMine = null; this.pickFoe = null;
    this.phaseT = 0; this.log = []; this.over = null; this.overT = 0;
    this.lungeMe = 0; this.lungeFoe = 0; this.flash = 0; this.ouch = null;
    this.history = [];                        // đòn địch đã ra, dùng để "đọc bài" nhẹ

    this.hits = [
      ...MOVES.map((m, i) => new Hit('mv' + i, G.W / 2 - 300 + i * 205, G.H - 132, 190, 78,
        { act: () => this.play(G, m.id) })),
      new Hit('flee', 28, PORTRAIT ? G.H - 310 : G.H - 84, 170, 56, { act: () => this.flee(G) }),
    ];
    G.world.setTheme({ sky: ['#4a3560', '#2e2044', '#151024'], hill: '#39424a', mount: '#3b3450' });
    G.music('climax');
    G.hero.react('proud', 1.2);
  },

  /** Chỗ đứng hai bên — bám giữa màn hình để máy rộng không lệch về một phía. */
  pos(G) { const m = G.W / 2, d = PORTRAIT ? Math.min(205, G.W * .285) : 300; return { hx: m - d, fx: m + d }; },

  /** Rời màn đấu thì bỏ tư thế kết trận, kẻo dế nằm ngửa ở cả bản đồ. */
  exit(G) { G.hero.setPose(null); },

  // ── một hiệp ──────────────────────────────────────────────────────────────
  play(G, moveId) {
    if (this.phase !== 'pick' || this.over) return;
    this.pickMine = moveId;
    this.pickFoe = this.foeChoice();
    this.history.push(moveId);
    this.phase = 'reveal'; this.phaseT = 0;
    this.clashT = 0; this.impacted = false;
    this.round++;
    G.sfx('select');
  },

  /**
   * Địch ra đòn theo `lean` khai báo trong data/duel.js — đúng cái mà "bài học"
   * nói ra. Nếu để hoàn toàn ngẫu nhiên thì bài học là lời nói dối, người chơi
   * áp dụng vào lại thua, mất niềm tin ngay.
   */
  foeChoice() {
    const L = this.foe.def.lean, W = this.foe.def.leanW || 0;
    if (L === 'read') {                       // chuyên bắt bài đòn bạn hay dùng
      if (this.history.length >= 2 && Math.random() < W) {
        const count = {};
        for (const h of this.history.slice(-5)) count[h] = (count[h] || 0) + 1;
        const fav = Object.keys(count).sort((a, b) => count[b] - count[a])[0];
        const counter = MOVES.find(m => m.beats === fav);
        if (counter) return counter.id;
      }
    } else if (L && Math.random() < W) {
      return L;
    }
    return MOVES[(Math.random() * MOVES.length) | 0].id;
  },

  resolve(G) {
    const a = this.pickMine, b = this.pickFoe;
    const crit = (p) => Math.random() * 100 < p;
    const fury = this.fury;                          // hiệp này có nổi nộ không
    if (a === b) {
      // RA CÙNG MỘT ĐÒN = ĐỌ CÀNG, không phải hiệp trắng.
      // Bản cũ cho cả hai sượt nhẹ 18% rồi thôi; ra cùng đòn xảy ra 1/3 số hiệp
      // nên trận toàn những hiệp chẳng đi tới đâu — đúng cái "trùng nhau hoài".
      // Nay ai khoẻ hơn thì đè được, thua đọ vẫn mất máu thật.
      const mine = this.me.atk * rand(1.18, .82) * (fury ? 1.5 : 1);
      const theirs = this.foe.atk * rand(1.18, .82);
      if (mine >= theirs) {
        const d = Math.round(this.me.atk * .55 * (fury ? 1.5 : 1));
        this.foe.hp -= d; this.foeArt.damage(d);
        this.lungeMe = 1; this.flash = .28;
        this.push(t('duelClashWin') + ` -${d}`, '#8ef08a');
        G.fx.float(this.pos(G).fx, GY - 120, '-' + d, { size: 30, fill: '#fff', stroke: '#5c0010' });
        G.fx.shake(12); G.sfx('blast');
        this.charge = Math.min(1, this.charge + 0.16 * this.me.charge);
      } else {
        const d = Math.round(this.foe.atk * .55);
        this.hp -= d;
        this.lungeFoe = 1; this.flash = .3;
        this.push(t('duelClashLose') + ` -${d}`, '#ff7a90');
        G.fx.float(this.pos(G).hx, GY - 120, '-' + d, { size: 28, fill: '#ffb0bc', stroke: '#5c0010' });
        G.fx.shake(12); G.sfx('invalid'); G.hero.react('hurt', .8);
        this.addRage(d);
      }
      this.streak = 0;
    } else if (beats(a, b)) {                        // ta thắng thế
      const boost = (this.charge >= 1 ? 2 : 1) * (fury ? 1.9 : 1);
      const isCrit = crit(this.me.crit) || fury;
      const d = Math.round(this.me.atk * boost * (isCrit ? 1.7 : 1) * rand(1.1, .9));
      this.foe.hp -= d;
      this.lungeMe = 1; this.flash = .3;
      this.push((boost > 1 ? t('duelCharged') + ' ' : '') + (isCrit ? t('duelCrit') + ' ' : '') + `-${d}`, '#8ef08a');
      G.fx.float(this.pos(G).fx, GY - 120, '-' + d, { size: isCrit ? 44 : 34, fill: '#fff', stroke: '#5c0010' });
      G.fx.burst(this.pos(G).fx, GY - 90, { lite: '#ffd0d0', base: '#e8384f', dark: '#5c0010', spark: '#fff' }, 12, 1.2);
      G.fx.shake(boost > 1 ? 18 : 9);
      G.sfx(boost > 1 ? 'bomb' : 'blast');
      if (boost > 1) this.charge = 0;
      this.streak++;
      this.charge = Math.min(1, this.charge + 0.34 * this.me.charge);
      this.foeArt.damage(d);
    } else {                                         // địch thắng thế
      const isCrit = crit(this.foe.crit) && !fury;
      // Đang NỘ thì đau mấy cũng không đứng yên: chỉ ăn 45% đòn và vẫn quật lại.
      const d = Math.round(this.foe.atk * (isCrit ? 1.6 : 1) * rand(1.1, .9) * (fury ? .45 : 1));
      this.hp -= d;
      if (fury) {
        const back = Math.round(this.me.atk * .6);
        this.foe.hp -= back; this.foeArt.damage(back);
        this.lungeMe = 1;
        G.fx.float(this.pos(G).fx, GY - 150, '-' + back, { size: 26, fill: '#ffd45c', stroke: '#5c2a00' });
      }
      this.lungeFoe = 1; this.flash = .35;
      this.push((isCrit ? t('duelCrit') + ' ' : '') + `-${d}`, '#ff7a90');
      G.fx.float(this.pos(G).hx, GY - 120, '-' + d, { size: isCrit ? 42 : 32, fill: '#ffb0bc', stroke: '#5c0010' });
      // Đòn NẶNG (mất ≥18% máu trong một nhịp) thì phản ứng khác hẳn đòn thường:
      // kêu lên, rung mạnh, loé đỏ. Bật ở mọi cú trúng thì thành ồn và mất tác dụng.
      const heavy = d >= this.maxHp * .18;
      if (heavy) {
        this.ouch = { p: pickOuch(), t: 0 };
        this.flash = .55;
        G.fx.shake(22);
        G.sfx('bomb');
        G.hero.react('hurt', 1.3);
      } else {
        G.fx.shake(11);
        G.sfx('invalid');
        G.hero.react('hurt', .7);
      }
      this.streak = 0;
      this.charge = Math.max(0, this.charge - .12);
      this.addRage(d);
    }
    // Nộ chỉ giữ đúng MỘT hiệp: nổi lên, dứt điểm, rồi về 0.
    if (fury) { this.fury = false; this.rage = 0; }
    this.hp = Math.max(0, this.hp);
    this.foe.hp = Math.max(0, this.foe.hp);
    if (this.foe.hp <= 0) return this.finish(G, true);
    if (this.hp <= 0) return this.finish(G, false);
  },

  /** Ăn đòn thì máu nóng lên. Đầy thanh là hiệp sau nổi điên. */
  addRage(d) {
    if (this.fury) return;
    this.rage = clamp(this.rage + (d / this.maxHp) * 1.25, 0, 1);
    if (this.rage >= 1) { this.fury = true; this.push(t('duelRageReady'), '#ff9a2b'); }
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
      const RK = this.foe.rank || rankById('norm');
      this.rewardGold = Math.round((70 + this.foe.power * 1.7) * RK.reward);
      this.rewardXp = Math.round((150 + this.foe.power * 2) * RK.reward);
      S.gold += this.rewardGold; S.xp += this.rewardXp;
      S.duelStreak = (S.duelStreak || 0) + 1;      // thắng liên tiếp → sân khấu đổi màu
      if (Math.random() < .30) S.food += 1;
      this.matsGot = addMats(S, rollMats(1 + Math.round(this.foe.ratio * 2) + RK.mats, this.me.stage * 8));
      G.hero.xp = S.xp; G.persist();
      G.sfx('win'); G.hero.react('happy', 2.2); G.hero.setPose('taunt'); G.music('nest');
    } else if (!fled) {
      S.duelStreak = 0;
      this.penaltyGold = Math.round(S.gold * .12);
      S.gold = Math.max(0, S.gold - this.penaltyGold);
      // Thua thì học được thói quen của nó — lần sau vào trận là đã biết trước.
      S.lore = S.lore || {};
      this.lessonNew = !S.lore[this.foe.def.id];
      S.lore[this.foe.def.id] = true;
      G.persist();
      G.sfx('lose'); G.hero.react('hurt', 2); G.hero.setPose('ko');
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
    if (this.ouch) { this.ouch.t += dt; if (this.ouch.t > 1.9) this.ouch = null; }
    if (this.over) { this.overT += dt; return; }

    if (this.phase === 'intro') {
      this.introT += dt;
      if (this.introT > INTRO_DUR) this.phase = 'pick';
      return;
    }
    // Khoe chiêu TRƯỚC rồi mới đánh: người chơi kịp đọc mình ra gì, địch ra gì,
    // nên cú va chạm sau đó mới có nghĩa chứ không phải máu tự tụt.
    if (this.phase === 'reveal') {
      this.phaseT += dt;
      if (this.phaseT > REVEAL_DUR) { this.phase = 'clash'; this.clashT = 0; }
      return;
    }
    if (this.phase === 'clash') {
      this.clashT += dt;
      if (!this.impacted && this.clashT >= CLASH_HIT) {   // đúng lúc hai bên chạm nhau
        this.impacted = true;
        this.resolve(G);
      }
      if (this.clashT > CLASH_DUR && !this.over) {
        this.phase = 'pick'; this.pickMine = null; this.pickFoe = null;
      }
    }
  },

  up(G, x, y) {
    if (this.phase === 'intro' && this.introT > .35) { this.introT = INTRO_DUR; this.phase = 'pick'; }
  },
  key(G, e) {
    if (this.phase !== 'pick' || this.over) return;
    const i = ['1', '2', '3'].indexOf(e.key);
    if (i >= 0) this.play(G, MOVES[i].id);
  },

  // ── vẽ ────────────────────────────────────────────────────────────────────
  draw(G, ctx) {
    const { W, H } = G;
    G.world.draw(ctx);
    ctx.fillStyle = 'rgba(10,6,20,.52)'; ctx.fillRect(...bleed(G));

    strokeText(ctx, t('duelTitle'), W / 2, 44,
      { font: FONT.disp(34), fill: '#ff9aa8', stroke: '#3a0010', lw: 8, baseline: 'middle' });
    strokeText(ctx, t('duelRound', { n: this.round }), W / 2, 78,
      { font: FONT.ui(15, 700), fill: '#c9b8ff', stroke: null, lw: 0, baseline: 'middle', shadow: null });

    // ── SÀN ĐẤU ───────────────────────────────────────────────────────────
    // Một mặt elip có bề dày + bóng tiếp đất. Nhân vật vẫn vẽ phẳng, nhưng
    // đứng trên một mặt phẳng có phối cảnh thì mắt tự đọc ra chiều sâu — rẻ
    // hơn nhiều so với dựng lại toàn bộ phần vẽ theo kiểu 2.5D thật.
    const P = this.pos(G);
    const DROP = this.over ? 132 : 0;
    const FLOOR_Y = GY + DROP + 52, FRX = Math.min(W * .42, 560), FRY = 96;
    ctx.save();
    ctx.beginPath(); ctx.ellipse(W / 2, FLOOR_Y + 20, FRX, FRY, 0, 0, TAU);
    ctx.fillStyle = '#171029'; ctx.fill();                       // bề dày sàn
    ctx.beginPath(); ctx.ellipse(W / 2, FLOOR_Y, FRX, FRY, 0, 0, TAU);
    const fg2 = ctx.createRadialGradient(W / 2, FLOOR_Y - FRY * .4, FRY * .2, W / 2, FLOOR_Y, FRX);
    fg2.addColorStop(0, '#4a4160'); fg2.addColorStop(.55, '#352c4c'); fg2.addColorStop(1, '#221a36');
    ctx.fillStyle = fg2; ctx.fill();
    ctx.strokeStyle = 'rgba(190,170,255,.22)'; ctx.lineWidth = 3; ctx.stroke();
    // vòng tròn đấu trường
    ctx.beginPath(); ctx.ellipse(W / 2, FLOOR_Y, FRX * .82, FRY * .78, 0, 0, TAU);
    ctx.strokeStyle = 'rgba(255,214,110,.16)'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.restore();

    // ── HAI ĐẤU SĨ ────────────────────────────────────────────────────────
    // Pha 'clash': cả hai lấy đà lao vào giữa, chạm nhau rồi bật ngược ra.
    let adv = 0;
    if (this.phase === 'clash') {
      const k = clamp(this.clashT / CLASH_DUR, 0, 1), hit = CLASH_HIT / CLASH_DUR;
      adv = k < hit ? ease.inCubic(k / hit)
                    : 1 - ease.outCubic((k - hit) / (1 - hit)) * 1.15;
    }
    const meLunge = ease.outQuad(this.lungeMe) * 40 + adv * 190;
    const foeLunge = ease.outQuad(this.lungeFoe) * 40 + adv * 190;
    const meX = P.hx + meLunge, foeX = P.fx - foeLunge;

    // bóng tiếp đất — co lại khi lao tới, cho ra cảm giác dồn lực
    const contact = (x, w) => {
      ctx.save();
      ctx.fillStyle = 'rgba(8,4,18,.42)';
      ctx.beginPath(); ctx.ellipse(x, FLOOR_Y + 4, w * (1 - adv * .18), w * .22, 0, 0, TAU); ctx.fill();
      ctx.restore();
    };
    contact(meX, 96); contact(foeX, 104);

    // vệt gió khi lao
    if (adv > .12) {
      ctx.save();
      ctx.globalAlpha = clamp(adv, 0, 1) * .5;
      ctx.strokeStyle = '#cfe6ff'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      for (let i = 0; i < 4; i++) {
        const yy = GY + DROP - 30 - i * 26;
        ctx.beginPath(); ctx.moveTo(meX - 70 - i * 22, yy); ctx.lineTo(meX - 130 - i * 30, yy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(foeX + 70 + i * 22, yy); ctx.lineTo(foeX + 130 + i * 30, yy); ctx.stroke();
      }
      ctx.restore();
    }

    G.hero.draw(ctx, meX, GY + DROP, PORTRAIT ? 142 : 178, 1);
    ctx.save();
    ctx.translate(foeX, GY + DROP - 60);
    ctx.scale(-1, 1);                       // quay mặt về phía người chơi
    this.foeArt.draw(ctx, 0, 0, PORTRAIT ? 176 : 210);
    ctx.restore();

    const barX = PORTRAIT ? 56 : 90, barW = PORTRAIT ? W - 112 : 420;
    const myBarY = PORTRAIT ? 120 : 128, foeBarY = PORTRAIT ? 174 : 128;
    this.bar(ctx, barX, myBarY, barW, 30, this.hp / this.maxHp, '#3fbf4a', `${Math.ceil(this.hp)} / ${this.maxHp}`,
             tx(BREEDS.find(b => b.id === G.save.breed) || BREEDS[0], 'name'));
    this.bar(ctx, PORTRAIT ? barX : W - 510, foeBarY, barW, 30, this.foe.hp / this.foe.max, '#e8384f',
             `${Math.ceil(this.foe.hp)} / ${this.foe.max}`, tx(this.foe.def, 'name'), true);

    // ── THANH NỘ ─────────────────────────────────────────────────────────
    // Đặt ngay dưới thanh máu của mình: ăn đòn thì nó dâng lên, nhìn là hiểu
    // "đau thì điên", không cần đọc hướng dẫn.
    {
      // Rộng 420 thì mép phải chui xuống dưới huy hiệu đòn vừa ra — cắt còn 330.
      const rx = PORTRAIT ? 90 : 90, ry = PORTRAIT ? 216 : 166, rw = PORTRAIT ? W - 180 : 330, rh = 20, on = this.fury;
      roundRect(ctx, rx, ry, rw, rh, rh / 2);
      ctx.fillStyle = 'rgba(12,7,22,.85)'; ctx.fill();
      ctx.save(); roundRect(ctx, rx + 2, ry + 2, rw - 4, rh - 4, (rh - 4) / 2); ctx.clip();
      const rg = ctx.createLinearGradient(rx, 0, rx + rw, 0);
      if (on) { rg.addColorStop(0, '#fff2a8'); rg.addColorStop(.5, '#ff9a2b'); rg.addColorStop(1, '#ff2f4e'); }
      else { rg.addColorStop(0, '#ff7a3a'); rg.addColorStop(1, '#ff2f4e'); }
      ctx.fillStyle = rg;
      ctx.fillRect(rx + 2, ry + 2, (rw - 4) * (on ? 1 : clamp(this.rage, 0, 1)), rh - 4);
      if (on) {
        ctx.globalAlpha = .3; ctx.fillStyle = '#fff';
        for (let i = -2; i < rw / 18 + 2; i++) ctx.fillRect(rx + i * 18 + ((this.t * 70) % 18), ry, 8, rh);
        ctx.globalAlpha = 1;
      }
      ctx.restore();
      ctx.strokeStyle = on ? `rgba(255,190,90,${.6 + .4 * Math.sin(this.t * 7)})` : 'rgba(255,140,90,.5)';
      ctx.lineWidth = 2; roundRect(ctx, rx, ry, rw, rh, rh / 2); ctx.stroke();
      strokeText(ctx, on ? t('duelRageOn') : t('duelRage'), rx + rw / 2, ry + rh / 2 + 1,
        { font: FONT.ui(12, 800), fill: '#fff', stroke: '#5c1000', lw: 3, baseline: 'middle', shadow: null });
    }

    // so sánh lực — cho biết trận này cân hay lệch
    const r = this.foe.ratio;
    const lbl = r < .95 ? t('duelWeaker') : r > 1.05 ? t('duelStronger') : t('duelEven');
    const col = r < .95 ? '#8ef08a' : r > 1.05 ? '#ff9aa8' : '#ffe066';
    strokeText(ctx, lbl, W / 2, PORTRAIT ? 258 : 128,
      { font: FONT.disp(19), fill: col, stroke: '#1a0f30', lw: 5, baseline: 'middle' });
    strokeText(ctx, `${this.me.power} vs ${this.foe.power}`, W / 2, PORTRAIT ? 284 : 156,
      { font: FONT.ui(13, 700), fill: '#b0a4d0', stroke: null, lw: 0, baseline: 'middle', shadow: null });

    // câu khích của địch
    if (this.round === 0 && !this.over) {
      ctx.save(); ctx.globalAlpha = .5 + .5 * Math.sin(this.t * 2);
      strokeText(ctx, '“' + tx(this.foe.def, 'taunt') + '”', W / 2, PORTRAIT ? 316 : 196,
        { font: FONT.ui(16, 600), fill: '#ffd0d8', stroke: '#3a0010', lw: 3, baseline: 'middle' });
      ctx.restore();
    }

    // ── đòn đã ra ─────────────────────────────────────────────────────────
    if (this.phase === 'reveal' || this.phase === 'clash') {
      const k = clamp(this.phaseT / .34, 0, 1);
      this.moveBadge(ctx, P.hx + 150, 202, this.pickMine, ease.outBack(k), '#8ef08a');
      this.moveBadge(ctx, P.fx - 150, 202, this.phaseT > .3 ? this.pickFoe : null, ease.outBack(clamp((this.phaseT - .3) / .3, 0, 1)), '#ff9aa8');
    }

    // ── VÒNG KHẮC CHẾ ────────────────────────────────────────────────────
    // "Chơi không hiểu đòn nào hơn đòn nào" là lỗi của màn hình, không phải của
    // người chơi. Vẽ thẳng vòng Húc ▸ Vụt ▸ Đỡ ▸ Húc ra đây, luôn hiện.
    if (!this.over) {
      const ly = H - 240, RING = ['huc', 'vut', 'do', 'huc'];
      const names = RING.map(id => tx(MOVES.find(m => m.id === id), 'vi'));
      ctx.font = FONT.disp(18);
      const tw = names.map(nm => ctx.measureText(nm).width);
      const IC = 28, GAP = 7, ARR = 21;
      const total = tw.reduce((a, b) => a + b, 0) + RING.length * (IC + GAP) + (RING.length - 1) * ARR;
      let px = W / 2 - total / 2;
      // Tấm kính mờ phía sau: đặt chữ thẳng lên nền đấu trường thì chìm nghỉm.
      glassPanel(ctx, W / 2 - total / 2 - 22, ly - 40, total + 44, 66, 16);
      strokeText(ctx, t('duelRing'), W / 2, ly - 24,
        { font: FONT.ui(13, 800), fill: '#ffd45c', stroke: '#3a1d00', lw: 3, baseline: 'middle' });
      RING.forEach((id, i) => {
        const faded = i === 3 ? .45 : 1;             // ô cuối chỉ để khép vòng
        ctx.save(); ctx.globalAlpha = faded;
        ctx.translate(px + IC / 2, ly); moveIcon(ctx, id, IC); ctx.restore();
        px += IC + GAP;
        strokeText(ctx, names[i], px, ly, { font: FONT.disp(18), fill: i === 3 ? '#9a8fc0' : '#ffffff',
          stroke: '#1a0f30', lw: 4, align: 'left', baseline: 'middle' });
        px += tw[i];
        if (i < RING.length - 1) {
          // Mũi tên vẽ tay: ký tự '▸' không có trong bộ font đóng gói nên trên
          // một số máy nó ra ô vuông rỗng, đúng chỗ cần chỉ rõ "cái này thắng cái kia".
          const ax = px + ARR / 2;
          ctx.beginPath();
          ctx.moveTo(ax - 5, ly - 7); ctx.lineTo(ax + 6, ly); ctx.lineTo(ax - 5, ly + 7);
          ctx.closePath();
          ctx.fillStyle = '#ffd45c'; ctx.fill();
          ctx.strokeStyle = '#1a0f30'; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();
          px += ARR;
        }
      });
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
      strokeText(ctx, l.msg, W / 2, (PORTRAIT ? 354 : 272) + i * 26,
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
        strokeText(ctx, `[${i + 1}] · ${t('duelBeats')} > ${tx(MOVES.find(x => x.id === m.beats), 'vi')}`, h.x + 118, cyy + 16,
          { font: FONT.ui(12, 700), fill: '#cfe6ff', stroke: null, lw: 0, baseline: 'middle', shadow: null });
      });
      const fl = this.hits.find(h => h.id === 'flee');
      if (fl) textBtn(ctx, fl.x, fl.y, fl.w, fl.h, t('duelFlee'),
        { press: fl.press, hover: fl.hover, colour: '#5b5f74', dark: '#33374a', lite: '#9aa0b6', font: FONT.disp(19) });
    }

    // ── BONG BÓNG "UI DA" ────────────────────────────────────────────────
    if (this.ouch) {
      const o = this.ouch, txt = tx(o.p, 'vi');
      const k2 = ease.outBack(clamp(o.t / .2, 0, 1));
      const fade = clamp((1.9 - o.t) / .45, 0, 1);
      ctx.save();
      ctx.globalAlpha = fade;
      const bx4 = P.hx, by4 = GY + DROP - 210 - Math.sin(o.t * 9) * 4;
      ctx.translate(bx4, by4); ctx.scale(k2, k2); ctx.translate(-bx4, -by4);
      ctx.font = FONT.disp(22);
      const bw4 = ctx.measureText(txt).width + 44;
      roundRect(ctx, bx4 - bw4 / 2, by4 - 26, bw4, 50, 16);
      ctx.fillStyle = 'rgba(60,10,20,.95)'; ctx.fill();
      ctx.strokeStyle = '#ff7a90'; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(bx4 - 12, by4 + 23); ctx.lineTo(bx4 + 2, by4 + 42); ctx.lineTo(bx4 + 12, by4 + 23);
      ctx.closePath(); ctx.fillStyle = 'rgba(60,10,20,.95)'; ctx.fill();
      strokeText(ctx, txt, bx4, by4, { font: FONT.disp(22), fill: '#ffd0d8', stroke: '#3a0008', lw: 5, baseline: 'middle' });
      ctx.restore();
    }

    if (this.flash > 0) {
      ctx.save(); ctx.globalAlpha = this.flash * .45;
      ctx.fillStyle = this.lungeFoe > this.lungeMe ? '#ff2040' : '#ffffff';
      ctx.fillRect(...bleed(G)); ctx.restore();
    }
    G.fx.draw(ctx);
    if (this.phase === 'intro') this.drawIntro(G, ctx);
    if (this.over) this.drawOver(G, ctx);
  },

  /**
   * MÀN VS mở trận — hai mảng màu chéo trượt vào, hai đấu sĩ lao ra, chữ VS nổ
   * ở giữa. Chạm màn hình là bỏ qua, không bắt ai ngồi xem lại lần thứ mười.
   */
  drawIntro(G, ctx) {
    const { W, H } = G;
    const [BX, BY, BW, BH] = bleed(G);
    const T = this.introT;
    const inK  = ease.outCubic(clamp(T / .34, 0, 1));         // mảng màu trượt vào
    const chK  = ease.outBack(clamp((T - .22) / .40, 0, 1));   // đấu sĩ
    const vsK  = ease.outBack(clamp((T - .46) / .34, 0, 1));   // chữ VS
    const fade = 1 - ease.inCubic(clamp((T - (INTRO_DUR - .38)) / .38, 0, 1));

    ctx.save();
    ctx.globalAlpha = fade;

    const SPLIT = W * .50, SKEW = W * .06;
    // mảng trái (ta) — trượt từ ngoài vào
    ctx.save();
    ctx.translate(-(1 - inK) * BW, 0);
    ctx.beginPath();
    ctx.moveTo(BX, BY); ctx.lineTo(SPLIT + SKEW, BY);
    ctx.lineTo(SPLIT - SKEW, BY + BH); ctx.lineTo(BX, BY + BH); ctx.closePath();
    const lg = ctx.createLinearGradient(BX, BY, SPLIT, BY + BH);
    lg.addColorStop(0, '#1b6fd0'); lg.addColorStop(1, '#0d3f86');
    ctx.fillStyle = lg; ctx.fill();
    ctx.restore();
    // mảng phải (địch)
    ctx.save();
    ctx.translate((1 - inK) * BW, 0);
    ctx.beginPath();
    ctx.moveTo(SPLIT + SKEW, BY); ctx.lineTo(BX + BW, BY);
    ctx.lineTo(BX + BW, BY + BH); ctx.lineTo(SPLIT - SKEW, BY + BH); ctx.closePath();
    const rg = ctx.createLinearGradient(SPLIT, BY, BX + BW, BY + BH);
    rg.addColorStop(0, '#c8203c'); rg.addColorStop(1, '#7a0a1e');
    ctx.fillStyle = rg; ctx.fill();
    ctx.restore();

    // vạch chia sáng — che đúng đường ráp của hai mảng
    ctx.save();
    ctx.globalAlpha = inK;
    ctx.strokeStyle = 'rgba(255,255,255,.92)'; ctx.lineWidth = 7; ctx.lineCap = 'butt';
    ctx.beginPath(); ctx.moveTo(SPLIT + SKEW, BY); ctx.lineTo(SPLIT - SKEW, BY + BH); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,226,140,.55)'; ctx.lineWidth = 16;
    ctx.beginPath(); ctx.moveTo(SPLIT + SKEW, BY); ctx.lineTo(SPLIT - SKEW, BY + BH); ctx.stroke();
    ctx.restore();

    // tia sáng toả sau mỗi bên cho đỡ phẳng
    ctx.save();
    ctx.beginPath();
    ctx.rect(BX, BY, BW, BH); ctx.clip();
    sunburst(ctx, W * .26, H * .52, W * .30, this.t, '#7fd0ff', 14, .16);
    sunburst(ctx, W * .74, H * .52, W * .30, -this.t, '#ff8fa0', 14, .16);
    ctx.restore();

    // hai đấu sĩ lao ra từ hai mép
    ctx.save();
    ctx.translate(-(1 - chK) * 340, 0);
    G.hero.draw(ctx, W * .27, H * .66, 210, 1);
    ctx.restore();
    ctx.save();
    ctx.translate((1 - chK) * 340, 0);
    ctx.translate(W * .74, H * .60); ctx.scale(-1, 1);
    this.foeArt.draw(ctx, 0, 0, 250);
    ctx.restore();

    // tên hai bên
    strokeText(ctx, tx(BREEDS.find(b => b.id === G.save.breed) || BREEDS[0], 'name'), W * .26, H * .20,
      { font: FONT.disp(40), fill: '#fff', stroke: '#062a55', lw: 8, baseline: 'middle' });
    strokeText(ctx, tx(this.foe.def, 'name'), W * .74, H * .20,
      { font: FONT.disp(40), fill: '#fff', stroke: '#4a0512', lw: 8, baseline: 'middle' });
    // nhãn bậc — gặp con mạnh là biết ngay, và biết luôn là thưởng nặng tay hơn
    const RK = this.foe.rank || rankById('norm');
    if (RK.id !== 'norm') {
      const lbl2 = tx(RK, 'name');
      ctx.font = FONT.disp(22);
      const bw2 = ctx.measureText(lbl2).width + 46;
      pillTag(ctx, W * .74 - bw2 / 2, H * .255, bw2, 38,
        { lite: shade(RK.col, .4), base: RK.col, rim: 'rgba(60,20,0,.7)' });
      strokeText(ctx, lbl2, W * .74, H * .255 + 19,
        { font: FONT.disp(22), fill: '#2b1740', stroke: null, lw: 0, baseline: 'middle', shadow: null });
      const hintLines = t('duelRankHint').split(/\s+[—–-]\s+/, 2);
      hintLines.forEach((line, i) => strokeText(ctx, line, W * .74, H * .305 + i * 26,
        { font: FONT.ui(12, 700), fill: 'rgba(255,255,255,.8)', stroke: 'rgba(0,0,0,.5)', lw: 3, baseline: 'middle' }));
    }
    // đã từng thua nó → hiện luôn thói quen đã học được
    if (G.save.lore?.[this.foe.def.id]) {
      const tip = tx(this.foe.def, 'tell');
      ctx.font = FONT.ui(15, 700);
      const tw2 = ctx.measureText(tip).width + 52;
      roundRect(ctx, W / 2 - tw2 / 2, H * .70, tw2, 44, 14);
      ctx.fillStyle = 'rgba(10,6,22,.72)'; ctx.fill();
      ctx.strokeStyle = 'rgba(255,214,110,.8)'; ctx.lineWidth = 2; ctx.stroke();
      strokeText(ctx, tip, W / 2, H * .70 + 22,
        { font: FONT.ui(15, 700), fill: '#ffe066', stroke: '#3a2000', lw: 3, baseline: 'middle' });
    }
    strokeText(ctx, '“' + tx(this.foe.def, 'taunt') + '”', W / 2, H * .84,
      { font: FONT.ui(17, 600), fill: 'rgba(255,255,255,.85)', stroke: 'rgba(0,0,0,.55)', lw: 4, baseline: 'middle' });

    // chữ VS + vòng xung kích
    if (vsK > .01) {
      ctx.save();
      ctx.translate(W / 2, H * .46);
      const ring = clamp((T - .46) / .5, 0, 1);
      if (ring < 1) {
        ctx.save();
        ctx.globalAlpha = (1 - ring) * .8;
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 10 * (1 - ring);
        ctx.beginPath(); ctx.arc(0, 0, 60 + ring * 220, 0, TAU); ctx.stroke();
        ctx.restore();
      }
      ctx.scale(vsK, vsK);
      ctx.font = '124px "Bungee","Baloo 2",sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round'; ctx.miterLimit = 2;
      ctx.strokeStyle = '#12060f'; ctx.lineWidth = 22; ctx.strokeText('VS', 0, 0);
      const vg = ctx.createLinearGradient(0, -60, 0, 60);
      vg.addColorStop(0, '#ffffff'); vg.addColorStop(.55, '#ffe9a8'); vg.addColorStop(1, '#ffb02e');
      ctx.fillStyle = vg; ctx.fillText('VS', 0, 0);
      ctx.restore();
    }

    strokeText(ctx, t('tapStart'), W / 2, BY + BH - 34,
      { font: FONT.ui(14, 700), fill: 'rgba(255,255,255,.55)', stroke: 'rgba(0,0,0,.5)', lw: 3, baseline: 'middle' });
    ctx.restore();
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
    ctx.fillStyle = `rgba(8,4,18,${.75 * k})`; ctx.fillRect(...bleed(G));
    const s = ease.outBack(k);
    ctx.save();
    ctx.translate(W / 2, H / 2 - 30); ctx.scale(s, s); ctx.translate(-W / 2, -(H / 2 - 30));
    glassPanel(ctx, W / 2 - 300, 104, 600, 260, 28,
      this.over.win ? { top: 'rgba(30,60,44,.95)', bot: 'rgba(12,26,20,.97)', rim: 'rgba(120,240,150,.5)' }
                    : { top: 'rgba(60,20,36,.95)', bot: 'rgba(24,8,16,.97)', rim: 'rgba(240,90,120,.45)' });
    strokeText(ctx, this.over.fled ? t('duelFled') : this.over.win ? t('duelWin') : t('duelLose'), W / 2, this.over.win ? 170 : 152,
      { font: FONT.disp(46), fill: this.over.win ? '#8ef08a' : '#ff7a90', stroke: '#12060f', lw: 9, baseline: 'middle' });
    if (this.over.win)
      strokeText(ctx, `+${this.rewardGold} ${t('gold')}     +${this.rewardXp} EXP`, W / 2, 240,
        { font: FONT.disp(26), fill: '#ffe066', stroke: '#4a2d00', lw: 5, baseline: 'middle' });
    else
      strokeText(ctx, t('penalty', { g: this.penaltyGold || this.fleeGold || 0, x: 0 }), W / 2, 196,
        { font: FONT.disp(22), fill: '#ff9aa8', stroke: '#3a0008', lw: 5, baseline: 'middle' });
    if (this.over.win && this.matsGot) {
      const list = Object.entries(this.matsGot);
      const wRow = list.length * 96;
      list.forEach(([id, n], i) => {
        const m = MATS[id]; if (!m) return;
        const x = W / 2 - wRow / 2 + i * 96 + 48;
        ctx.save(); ctx.translate(x - 18, 276); matIcon(ctx, id, 30, m.col); ctx.restore();
        strokeText(ctx, '+' + n, x + 6, 276,
          { font: FONT.disp(20), fill: '#fff', stroke: '#1a0f30', lw: 4, baseline: 'middle' });
      });
    }
    // Thua thì trả về một thứ dùng được ở trận sau, chứ không chỉ trừ vàng.
    if (!this.over.win && !this.over.fled) {
      const D = this.foe.def;
      const bx2 = W / 2 - 270, by2 = 222, bw3 = 540, bh2 = 76;
      roundRect(ctx, bx2, by2, bw3, bh2, 16);
      ctx.fillStyle = 'rgba(28,20,10,.92)'; ctx.fill();
      ctx.strokeStyle = 'rgba(255,214,110,.75)'; ctx.lineWidth = 2.5; ctx.stroke();
      strokeText(ctx, `${this.lessonNew ? t('loreNew') : t('loreKnown')} · ${tx(D, 'trait')}`, bx2 + 18, by2 + 22,
        { font: FONT.disp(17), fill: '#ffd23f', stroke: '#3a2000', lw: 4, align: 'left', baseline: 'middle' });
      ctx.save();
      ctx.font = FONT.ui(14, 600); ctx.fillStyle = '#efe4c8';
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      const words = String(tx(D, 'tell')).split(' ');
      let ln = '', yy2 = by2 + 48;
      for (const wd of words) {
        const test = ln ? ln + ' ' + wd : wd;
        if (ctx.measureText(test).width > bw3 - 36 && ln) { ctx.fillText(ln, bx2 + 18, yy2); yy2 += 19; ln = wd; }
        else ln = test;
      }
      if (ln) ctx.fillText(ln, bx2 + 18, yy2);
      ctx.restore();
    }
    strokeText(ctx, this.over.win ? t('duelTipWin') : t('duelTipLose'), W / 2, 330,
      { font: FONT.ui(15, 600), fill: '#c9b8ff', stroke: null, lw: 0, baseline: 'middle', shadow: null });
    ctx.restore();
    if (k >= 1) {
      const d = this.hits[0];
      textBtn(ctx, d.x, d.y, d.w, d.h, t('gotIt'), { press: d.press, hover: d.hover, font: FONT.disp(26) });
    }
  },
};

/**
 * Ba biểu tượng đòn — vẽ bằng chính bộ phận của con dế, không mượn giáo/khiên/roi.
 * Trước đây là mũi giáo, cái khiên và ngọn roi: nhìn ra hiệp sĩ chứ không ra dế.
 *   HÚC = đầu chúi tới   ·   ĐỠ = cánh cứng dựng lên   ·   VỤT = càng sau quật
 */
export function moveIcon(ctx, id, s) {
  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (id === 'huc') {                                  // HÚC: đầu dế chúi tới
    // râu vuốt ngược ra sau
    ctx.strokeStyle = '#5a3a12'; ctx.lineWidth = s * .055;
    ctx.beginPath();
    ctx.moveTo(-s * .02, -s * .16);
    ctx.quadraticCurveTo(-s * .26, -s * .34, -s * .44, -s * .22);
    ctx.moveTo(-s * .04, -s * .06);
    ctx.quadraticCurveTo(-s * .28, -s * .18, -s * .46, -s * .04);
    ctx.stroke();
    // đầu: bầu về phía trước, hàm nhọn chúc xuống
    ctx.beginPath();
    ctx.moveTo(-s * .18, -s * .22);
    ctx.quadraticCurveTo(s * .24, -s * .26, s * .34, s * .02);
    ctx.quadraticCurveTo(s * .22, s * .28, -s * .18, s * .22);
    ctx.quadraticCurveTo(-s * .30, 0, -s * .18, -s * .22);
    ctx.closePath();
    const hg = ctx.createLinearGradient(-s * .2, -s * .24, s * .3, s * .2);
    hg.addColorStop(0, '#f0c069'); hg.addColorStop(1, '#a86a24');
    ctx.fillStyle = hg; ctx.fill();
    ctx.strokeStyle = '#4a2c10'; ctx.lineWidth = s * .06; ctx.stroke();
    // mắt to
    ctx.beginPath(); ctx.ellipse(s * .06, -s * .04, s * .10, s * .12, 0, 0, TAU);
    ctx.fillStyle = '#fffdf2'; ctx.fill(); ctx.strokeStyle = '#4a2c10'; ctx.lineWidth = s * .035; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(s * .09, -s * .02, s * .045, s * .06, 0, 0, TAU);
    ctx.fillStyle = '#2b1740'; ctx.fill();
    // vạch gió phía sau
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = s * .05;
    ctx.beginPath();
    ctx.moveTo(-s * .46, s * .12); ctx.lineTo(-s * .24, s * .12);
    ctx.moveTo(-s * .40, s * .26); ctx.lineTo(-s * .22, s * .26);
    ctx.stroke();
  } else if (id === 'do') {                            // ĐỠ: cánh cứng dựng chắn
    ctx.save(); ctx.translate(s * .04, 0); ctx.rotate(-.52);
    // Cánh nhìn nghiêng: bản lề ở đầu trên, mép trước THẲNG, đuôi thuôn nhọn —
    // đối xứng quá thì ra hạt hạnh nhân chứ không ra cánh.
    ctx.beginPath();
    ctx.moveTo(-s * .14, -s * .36);
    ctx.lineTo(s * .10, -s * .30);
    ctx.quadraticCurveTo(s * .26, s * .04, s * .06, s * .36);
    ctx.quadraticCurveTo(-s * .12, s * .30, -s * .20, s * .02);
    ctx.quadraticCurveTo(-s * .24, -s * .24, -s * .14, -s * .36);
    ctx.closePath();
    const wg = ctx.createLinearGradient(-s * .22, -s * .34, s * .24, s * .34);
    wg.addColorStop(0, '#fff3d4'); wg.addColorStop(.5, '#dfae52'); wg.addColorStop(1, '#7d5019');
    ctx.fillStyle = wg; ctx.fill();
    ctx.strokeStyle = '#4a2c10'; ctx.lineWidth = s * .065; ctx.stroke();
    // mép trước dày — chỗ hứng đòn
    ctx.strokeStyle = '#3a2109'; ctx.lineWidth = s * .09;
    ctx.beginPath(); ctx.moveTo(-s * .14, -s * .35); ctx.lineTo(s * .10, -s * .29); ctx.stroke();
    // gân cánh toả từ bản lề
    ctx.strokeStyle = 'rgba(74,44,16,.55)'; ctx.lineWidth = s * .032;
    for (const [ex, ey] of [[s * .12, s * .10], [s * .02, s * .28], [-s * .12, s * .18]]) {
      ctx.beginPath(); ctx.moveTo(-s * .06, -s * .28);
      ctx.quadraticCurveTo(ex * .5, ey * .4, ex, ey); ctx.stroke();
    }
    ctx.restore();
    // tia va chạm bật ra ở mép trái
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = s * .05;
    ctx.beginPath();
    ctx.moveTo(-s * .34, -s * .20); ctx.lineTo(-s * .48, -s * .28);
    ctx.moveTo(-s * .38, s * .00); ctx.lineTo(-s * .52, s * .00);
    ctx.moveTo(-s * .32, s * .20); ctx.lineTo(-s * .46, s * .30);
    ctx.stroke();
  } else {                                             // VỤT: càng sau quật ngang
    // vệt quật
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = s * .055;
    ctx.beginPath(); ctx.arc(-s * .04, s * .04, s * .42, -1.45, .35); ctx.stroke();
    // ĐÙI: khối to hình giọt, gốc ở dưới trái, đầu gối trên phải
    ctx.beginPath();
    ctx.moveTo(-s * .34, s * .30);
    ctx.quadraticCurveTo(-s * .30, s * .02, -s * .06, -s * .18);
    ctx.quadraticCurveTo(s * .10, -s * .06, s * .00, s * .14);
    ctx.quadraticCurveTo(-s * .12, s * .34, -s * .34, s * .30);
    ctx.closePath();
    const fg = ctx.createLinearGradient(-s * .34, s * .32, s * .04, -s * .18);
    fg.addColorStop(0, '#8a5a1e'); fg.addColorStop(1, '#f5cd7c');
    ctx.fillStyle = fg; ctx.fill();
    ctx.strokeStyle = '#4a2c10'; ctx.lineWidth = s * .065; ctx.stroke();
    // vân đùi
    ctx.strokeStyle = 'rgba(74,44,16,.45)'; ctx.lineWidth = s * .028;
    ctx.beginPath(); ctx.moveTo(-s * .26, s * .22); ctx.lineTo(-s * .12, s * .10);
    ctx.moveTo(-s * .22, s * .30); ctx.lineTo(-s * .06, s * .16); ctx.stroke();
    // ĐẦU GỐI
    ctx.beginPath(); ctx.arc(-s * .05, -s * .16, s * .075, 0, TAU);
    ctx.fillStyle = '#e8b45a'; ctx.fill();
    ctx.strokeStyle = '#4a2c10'; ctx.lineWidth = s * .045; ctx.stroke();
    // ỐNG CHÂN vươn ra + gai
    ctx.strokeStyle = '#4a2c10'; ctx.lineWidth = s * .085;
    ctx.beginPath(); ctx.moveTo(-s * .05, -s * .16); ctx.lineTo(s * .36, s * .10); ctx.stroke();
    ctx.strokeStyle = '#f0c069'; ctx.lineWidth = s * .045; ctx.stroke();
    ctx.strokeStyle = '#4a2c10'; ctx.lineWidth = s * .032;
    for (let i = 1; i <= 3; i++) {
      const k = i / 4, bx = lerp(-s * .05, s * .36, k), by = lerp(-s * .16, s * .10, k);
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + s * .06, by - s * .10); ctx.stroke();
    }
  }
  ctx.restore();
}

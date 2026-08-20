// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  Màn chơi chính — bàn cờ match-3 + HUD dựng theo bảng SCORE trong Figma. ║
// ╚══════════════════════════════════════════════════════════════════════════╝
import { TAU, clamp, lerp, ease, rand, randInt, rgba, shade, strokeText, roundRect } from '../core/util.js';
import { t, tx } from '../core/i18n.js';
import { Hit, card, glassPanel, statBar, roundBtn, textBtn, starBar, icon, matIcon, C, FONT, resultBanner } from '../ui/widgets.js';
import { Board } from '../game/board.js';
import { GEMS, SP, TOKEN } from '../game/gems.js';
import { BREEDS, STAGES, stageFor } from '../data/characters.js';
import { Enemy, ENEMIES, ATK } from '../game/enemy.js';
import { playLayout, bleed } from '../core/layout.js';
import { pickBeat, SPEAKERS, GOAL_NOUN } from '../data/beats.js';
import { rollMats, addMats, MATS } from '../data/gear.js';
import { hand } from './help.js';

const COLS = 8, ROWS = 8;
// Ô gem nhỏ lại trên màn hẹp → bàn cờ thấp hơn, chừa chỗ cho khung thoại
// mà không phải đè lên hàng gem cuối.
let CELL = 62;
let FW = COLS * CELL + 28, FH = ROWS * CELL + 28;
const ENEMY_Y = 82;                       // hàng thiên địch nằm ngay trên khung bàn cờ

// Các mốc bố cục được TÍNH LẠI theo bề ngang thật của thiết bị (xem core/layout.js):
// bàn cờ luôn ở giữa, thẻ nhân vật bám mép trái, bảng HUD bám mép phải.
let BX = 398, BY = 136, FX_ = 384, FY_ = 122;
let CARDX = 24, STRIPX = 292, HUDX = 950, HUDW = 306, COMPACT = false;
function relayout(W) {
  CELL = W < 1240 ? 56 : 62;
  FW = COLS * CELL + 28; FH = ROWS * CELL + 28;
  const L = playLayout(W, FW, FH);
  FX_ = L.boardX; FY_ = 122;
  BX = FX_ + 14; BY = FY_ + 14;
  CARDX = L.cardX; STRIPX = L.stripX; HUDX = L.hudX; HUDW = L.hudW; COMPACT = L.compact;
}

export default {
  name: 'play',

  enter(G) {
    relayout(G.W);
    const L = G.level;
    this.t = 0;
    this.score = 0; this.gold = 0; this.movesLeft = L.moves;
    this.over = null; this.overT = 0; this.paused = false;
    this.praiseT = 0; this.praise = ''; this.toastT = 0; this.toast = '';
    this.shownScore = 0;
    this.hammer = 2; this.shuffleUse = 1; this.hammerMode = false;
    this.breath = 0;                              // 0..1 nạp kỹ năng phun lửa
    this.dragFrom = null; this.moved = 0;
    this.warnT = 0;
    this.hitGoal = false; this.goalT = 0;
    this.tut = !G.save.seenTut && G.levelIndex === 0;   // dạy nước đi đầu tiên
    this.tutMove = null; this.tutT = 0;
    this.skillFx = null;                                // hiệu ứng kỹ năng đang chạy
    this.bubble = null; this.saidOnce = new Set();      // lời thoại trong màn

    // ── ĐỘI HÌNH THIÊN ĐỊCH ────────────────────────────────────────────
    this.enemies = (L.enemies || []).map(([kind, tier]) => new Enemy(kind, tier));
    this.maxHp = 300 + (G.save.stats.spirit || 0) * 20 + (G.save.breed === 'frost' ? 40 : 0);
    this.hp = this.maxHp;
    this.hitFlash = 0; this.dmgText = 0;

    // ── NGÂN SÁCH MÁU ĐỊCH ─────────────────────────────────────────────
    // Độ khó thật sự nằm ở chỗ ĐỊCH SỐNG ĐƯỢC BAO LÂU: còn sống là còn ra đòn.
    // Đo được ~150 điểm sát thương mỗi lượt đi, nên tổng máu bầy địch được đặt
    // bằng một tỉ lệ của "tổng sát thương cả ván" — tỉ lệ này leo dần theo màn.
    // Đo được: mỗi lượt đi gây ~96 sát thương lên CON ĐỊCH ĐẦU HÀNG (chỉ một
    // con nhận đòn mỗi lần ghép), không phải 150 như ước lượng ban đầu.
    const killFrac = 0.30 + Math.min(0.32, G.levelIndex * 0.0072);
    const hpBudget = Math.round(96 * L.moves * killFrac);
    // Lựa chọn ở Giếng Trời vọng lại: chọn KỂ THẬT thì Cóc Già nhẹ tay hơn,
    // chọn ĐÁNH thì nó thủ thế và khó nhằn hơn hẳn.
    const wellPick = G.save.choices?.well;
    const bossScale = G.levelIndex >= 39 && wellPick
      ? (wellPick === 'tell' ? 0.75 : 1.35) : 1;
    const hpSum = this.enemies.reduce((a, e) => a + e.maxHp, 0) || 1;
    for (const e of this.enemies) {
      e.maxHp = Math.max(120, Math.round(e.maxHp / hpSum * hpBudget * bossScale));
      e.hp = e.maxHp;
    }

    // ── TRẦN SÁT THƯƠNG ────────────────────────────────────────────────
    // Không để đội hình bốc ngẫu nhiên biến một màn thành bất khả thi: tính
    // tổng sát-thương-mỗi-giây của cả bầy rồi ép xuống dưới ngưỡng "một ván
    // đấu vừa đủ nghẹt thở". Nhờ vậy độ khó đến từ MÁU của địch (đánh lâu hay
    // nhanh) chứ không đến từ may rủi khi bốc quân.
    const dps = this.enemies.reduce((a, e) => a + e.dmg / e.every, 0);
    // Trần leo dần theo độ sâu: chương 1 nhẹ tay, chương 3 nghẹt thở.
    const frac = 0.60 + Math.min(0.85, G.levelIndex * 0.020);
    // Chia cho MỐC 110 GIÂY cố định, không chia cho độ dài màn: màn dài thì
    // tổng sát thương phải lớn hơn — dài mà an toàn thì lại thành dễ.
    const budget = (this.maxHp * frac) / 110;
    if (dps > budget) {
      const k = budget / dps;
      for (const e of this.enemies) e.dmg = Math.max(3, Math.round(e.dmg * k));
    }

    const S = G.save;
    this.spirit  = 1 + (S.stats.spirit  || 0) * 0.10;
    // "Điềm tĩnh" của nhân vật + luyện Ý chí → được cộng thêm giờ
    this.timeMax  = L.time + (S.stats.spirit || 0) * 6 + (S.breed === 'frost' ? 12 : 0);
    this.timeLeft = this.timeMax;
    this.fortune =     (S.stats.fortune || 0);
    this.might   =     (S.stats.might   || 0);
    this.breathRate = 1 + (S.stats.breath || 0) * 0.18;
    if (S.breed === 'frost') this.spirit *= 1.15;
    if (S.breed === 'void')  this.fortune += 2;
    if (S.breed === 'ember') this.might   += 1;

    this.board = new Board({ cols: COLS, rows: ROWS, size: CELL, colours: L.colours });
    this.board.fortune = this.fortune;
    this.board.tokenRate = L.tokenRate ?? 0.03;
    this.board.might = this.might;
    this.wire(G);

    G.world.setTheme({ sky: L.sky, hill: L.hill, mount: L.mount });
    G.hero.onFire = (x, y, dx, dy) => G.fx.fire(x, y, dx, dy, 4);

    this.hits = [
      new Hit('pause',   G.W - 78, 12, 52, 52, { circle: true, act: () => this.togglePause(G) }),
      new Hit('exit',    G.W - 142, 12, 52, 52, { circle: true, act: () => { G.sfx('button'); G.go('map'); } }),
      new Hit('restart', HUDX + HUDW * .23, 508, 64, 64, { circle: true, act: () => G.startLevel(G.levelIndex) }),
      new Hit('resume',  HUDX + HUDW * .54, 508, 64, 64, { circle: true, act: () => this.togglePause(G) }),
      new Hit('sk0', STRIPX + 8, 190, 62, 62, { act: () => this.useBreath(G) }),
      new Hit('sk1', STRIPX + 8, 268, 62, 62, { act: () => this.useHammer(G) }),
      new Hit('sk2', STRIPX + 8, 346, 62, 62, { act: () => this.useShuffle(G) }),
      new Hit('quit', G.W / 2 - 110, G.H / 2 + 6, 220, 54,
        { act: () => { G.sfx('button'); G.go('map'); }, hidden: true }),
      new Hit('howto', G.W / 2 - 110, G.H / 2 + 78, 220, 54,
        { act: () => { G.sfx('button'); G.go('help', 'map'); }, hidden: true }),
    ];
    this.music = G.levelTrack();
    G.music(this.music);
    this.say(G, 'start');
  },

  /**
   * Nhân vật nói một câu gắn với sự kiện vừa xảy ra trong ván.
   * `once` để mỗi loại sự kiện chỉ nói một lần mỗi màn — nói nhiều thành ồn.
   */
  say(G, trigger, once = true) {
    if (this.over) return;
    if (once && this.saidOnce.has(trigger)) return;
    const beat = pickBeat(G.act?.id || 'hatch', trigger);
    if (!beat) return;
    this.saidOnce.add(trigger);
    this.bubble = { beat, t: 0, dur: 4.2 };
  },

  // ── nối engine với hiệu ứng / điểm ────────────────────────────────────────
  wire(G) {
    const b = this.board;
    b.on.match = ({ count, cascade, cells, tokens }) => {
      const mult = 1 + (cascade - 1) * .55;
      const gained = Math.round(count * 42 * mult);
      this.score += gained;
      const g = Math.round(count * 1.8 * mult);
      this.gold += g;
      this.breath = clamp(this.breath + count * 0.022 * this.breathRate, 0, 1);
      // mỗi viên phá được hồi chút máu — chơi hay là trụ được, chơi dở thì đuối
      this.hp = Math.min(this.maxHp, this.hp + count * 1.0 * this.spirit);

      // ── vật phẩm bất ngờ ────────────────────────────────────────────────
      for (const tk of (tokens || [])) {
        const px = BX + tk.px + CELL / 2, py = BY + tk.py + CELL / 2;
        if (tk.token === TOKEN.CLOCK) {
          this.timeLeft = Math.min(this.timeMax * 1.5, this.timeLeft + 5);
          G.fx.float(px, py, t('plusTime', { n: 5 }), { size: 30, fill: '#ffe066', stroke: '#5c3a00' });
          G.fx.ring(px, py, '#ffd23f', 10, 90, .45, 7); G.sfx('coin');
        } else if (tk.token === TOKEN.COIN) {
          const g2 = 60 + Math.round(Math.random() * 60);
          this.gold += g2;
          G.fx.float(px, py, t('plusGold', { n: g2 }), { size: 26, fill: '#ffe066', stroke: '#5c3a00' });
          G.sfx('coin');
        } else if (tk.token === TOKEN.STAR) {
          const bonus = 400 + Math.round(Math.random() * 400);
          this.score += bonus;
          G.fx.float(px, py, '+' + bonus, { size: 32, fill: '#8ef08a', stroke: '#0d3a16' });
          G.fx.sparkle(px, py, '#b6ffd8', 18); G.sfx('special');
        }
        G.hero.react('happy', .7);
      }

      if (!this.hitGoal && this.score >= G.level.target) {
        this.hitGoal = true; this.goalT = 1.6;
        G.sfx('levelup'); G.hero.breatheFire(.9); G.fx.shake(10);
        this.say(G, 'goalHit');
      }

      let cx = 0, cy = 0, n = 0;
      for (const i of cells) {
        const c = b.grid[i]; if (!c) continue;
        cx += BX + c.px + CELL / 2; cy += BY + c.py + CELL / 2; n++;
        G.fx.burst(BX + c.px + CELL / 2, BY + c.py + CELL / 2, GEMS[c.type], 5 + Math.min(count, 6), .75 + cascade * .06);
      }
      if (n) {
        cx /= n; cy /= n;
        G.fx.float(cx, cy, '+' + gained, { size: 26 + Math.min(cascade, 5) * 5, fill: '#fff6c4', stroke: '#6b3a00' });
        G.fx.ring(cx, cy, GEMS[b.grid[cells[0]]?.type ?? 0].lite, 10, 46 + count * 5, .34, 5);
      }
      // ── đánh vào thiên địch ─────────────────────────────────────────
      const foe = this.enemies.find(e => e.alive);
      if (foe) {
        const dealt = foe.damage(Math.round(count * 16 * mult * (1 + this.might * .08)));
        const fx0 = FX_ + FW * ((this.enemies.indexOf(foe) + .5) / this.enemies.length);
        G.fx.float(fx0, ENEMY_Y - 12, '-' + dealt, { size: 24, fill: '#ffd0d0', stroke: '#5c0010', vy: -60 });
        G.fx.burst(fx0, ENEMY_Y, { lite: '#ffd0d0', base: '#e8384f', dark: '#5c0010', spark: '#fff' }, 6, .8);
        this.say(G, 'foeHit');
        if (!foe.alive) {
          this.say(G, 'foeDown', false);
          G.sfx('bomb'); G.fx.shake(14);
          G.fx.ring(fx0, ENEMY_Y, '#ffe066', 12, 150, .6, 10);
          this.score += 900; this.gold += 60;
          G.fx.float(fx0, ENEMY_Y - 40, t('foeDown'), { size: 26, fill: '#8ef08a', stroke: '#0d3a16' });
        }
      }
      G.sfx('match', cascade - 1);
      if (cascade >= 3) this.say(G, 'combo');
      if (cascade >= 2) {
        const p = t('praise');
        this.praise = p[clamp(cascade - 2, 0, p.length - 1)];
        this.praiseT = 1.25;
        G.sfx('combo', cascade);
        G.fx.shake(2 + cascade * 1.4);
        G.hero.react('happy', .8);
        if (cascade >= 4) G.hero.breatheFire(.55);
      }
    };
    b.on.special = (list) => {
      G.sfx('special');
      for (const s of list) {
        const c = b.grid[s.index]; if (!c) continue;
        G.fx.sparkle(BX + c.px + CELL / 2, BY + c.py + CELL / 2, GEMS[c.type].spark, 20);
      }
    };
    b.on.blast = (sp, cx, cy) => {
      const x = BX + cx * CELL + CELL / 2, y = BY + cy * CELL + CELL / 2;
      if (sp === SP.LINE_H || sp === SP.CROSS) G.fx.beam(x, y, true, FW, '#ffd76b');
      if (sp === SP.LINE_V || sp === SP.CROSS) G.fx.beam(x, y, false, FH, '#ffd76b');
      if (sp === SP.BOMB) { G.fx.ring(x, y, '#fff', 20, 300, .6, 11); G.sfx('bomb'); }
      else G.sfx('blast');
      G.fx.shake(sp === SP.BOMB ? 11 : 5);
    };
    b.on.noMoves = () => { this.toast = t('shuffling'); this.toastT = 2.0; G.sfx('warn'); };
    b.on.settle = () => this.checkEnd(G);
  },

  // ── kỹ năng ───────────────────────────────────────────────────────────────
  useBreath(G) {
    if (this.breath < 1 || this.board.phase !== 'idle' || this.over) { G.sfx('invalid'); return; }
    this.breath = 0;
    const r = randInt(ROWS);
    const ry = BY + r * CELL + CELL / 2;
    this.skillFx = { kind: 'fire', t: 0, dur: .95, row: r, y: ry };
    G.hero.breatheFire(1.1); G.sfx('roar'); G.fx.shake(22);
    G.fx.beam(BX + FW / 2 - 14, ry, true, FW, '#ff9a2b');
    for (let c = 0; c < COLS; c++) {
      const x = BX + c * CELL + CELL / 2;
      G.fx.fire(x, ry, 1, -.1, 8);
      G.fx.smoke(x, ry, 3, '#ffb04a');
    }
    G.fx.ring(BX + FW / 2 - 14, ry, '#ffb04a', 20, FW * .7, .55, 14);
    const out = [];
    for (let c = 0; c < COLS; c++) out.push(this.board.idx(c, r));
    this.board._beginPop(out, null);
  },
  useHammer(G) {
    if (this.hammer <= 0 || this.board.phase !== 'idle' || this.over) { G.sfx('invalid'); return; }
    this.hammerMode = !this.hammerMode;
    G.sfx('select');
  },
  useShuffle(G) {
    if (this.shuffleUse <= 0 || this.board.phase !== 'idle' || this.over) { G.sfx('invalid'); return; }
    this.shuffleUse--;
    this.board.phase = 'shuffle'; this.board.timer = 0;
    this.skillFx = { kind: 'shuffle', t: 0, dur: .75 };
    G.sfx('special'); G.fx.shake(12);
    G.fx.ring(BX + FW / 2 - 14, BY + FH / 2 - 14, '#a8dcff', 20, FW * .62, .55, 12);
    for (let k = 0; k < 22; k++) {
      const a = k / 22 * TAU, rr = FW * .32;
      G.fx.sparkle(BX + FW / 2 - 14 + Math.cos(a) * rr, BY + FH / 2 - 14 + Math.sin(a) * rr, '#cfe8ff', 4);
    }
  },

  togglePause(G) {
    if (this.over) return;
    this.paused = !this.paused;
    for (const id of ['howto', 'quit']) { const b = this.hits.find(h => h.id === id); if (b) b.hidden = !this.paused; }
    G.sfx('button');
    G.audio.setMusicVol(this.paused ? G.musicVol * .3 : G.musicVol);
  },

  // ── điều kiện thắng / thua ────────────────────────────────────────────────
  get foesLeft() { return this.enemies.filter(e => e.alive).length; },

  checkEnd(G) {
    if (this.over) return;
    if (this.hp <= 0) return this.finish(G, false, t('foeKilled'));
    if (this.timeLeft <= 0) return this.finish(G, this.score >= G.level.target, t('outOfTime'));
    // Chơi trọn số lượt rồi mới kết toán — nhờ vậy mốc 1★/2★/3★ mới khác nhau.
    if (this.movesLeft <= 0) return this.finish(G, this.score >= G.level.target, t('outOfMoves'));
  },

  finish(G, win, why = '') {
    this.over = { win, why }; this.overT = 0;
    this.board.locked = true;
    const L = G.level, S = G.save;
    if (win) {
      const ratio = this.score / L.target;
      this.starsEarned = ratio >= L.star[2] ? 3 : ratio >= L.star[1] ? 2 : 1;
      // Bỏ mặc thiên địch thì qua màn vẫn được, nhưng CHỈ 1 SAO và mất 1/4 vàng.
      this.foesSurvived = this.foesLeft;
      if (this.foesSurvived > 0) {
        this.starsEarned = 1;
        this.gold = Math.round(this.gold * 0.75);
      }
      this.xpGain = 180 + this.starsEarned * 140;
      S.stars[L.id] = Math.max(S.stars[L.id] || 0, this.starsEarned);
      S.best[L.id]  = Math.max(S.best[L.id] || 0, this.score);
      S.gold += this.gold;
      S.xp += this.xpGain;
      if (Math.random() < .5) S.food += 1;
      this.matsGot = addMats(S, rollMats(2 + this.starsEarned, G.levelIndex));   // nguyên liệu chế tạo
      if (G.levelIndex + 1 >= S.unlocked) S.unlocked = Math.min(G.levelIndex + 2, G.totalLevels);
      G.hero.xp = S.xp;
      G.persist();
      G.sfx('win'); G.hero.react('happy', 2.4); G.fx.shake(10); G.music('nest');
      this.say(G, 'win');
    } else {
      // ── CHẾ TÀI: thua thì mất vàng và mất EXP, không phải chơi lại là xong ──
      this.starsEarned = 0;
      this.penaltyGold = Math.round(S.gold * 0.15);
      this.penaltyXp = Math.min(S.xp, 120);
      S.gold = Math.max(0, S.gold - this.penaltyGold);
      S.xp = Math.max(0, S.xp - this.penaltyXp);
      G.hero.xp = S.xp;
      G.persist();
      G.sfx('lose'); G.hero.react('hurt', 2); G.fx.shake(16);
      this.say(G, 'lose');
    }
    this.hits = this.hits.filter(h => h.id === 'pause');
    const y = 470;
    if (win) {
      this.hits.push(new Hit('next', G.W / 2 - 210, y, 190, 62, { act: () => G.startLevel(Math.min(G.levelIndex + 1, G.totalLevels - 1)) }));
      this.hits.push(new Hit('map',  G.W / 2 +  20, y, 190, 62, { act: () => G.go('map') }));
    } else {
      this.hits.push(new Hit('retry', G.W / 2 - 210, y, 190, 62, { act: () => G.startLevel(G.levelIndex) }));
      this.hits.push(new Hit('map',   G.W / 2 +  20, y, 190, 62, { act: () => G.go('map') }));
    }
  },

  // ── vòng cập nhật ─────────────────────────────────────────────────────────
  update(G, dt) {
    this.t += dt;
    G.world.update(dt, Math.sin(this.t * .2) * 18);
    G.hero.update(dt);
    this.shownScore = lerp(this.shownScore, this.score, 1 - Math.pow(.001, dt));
    if (this.praiseT > 0) this.praiseT -= dt;
    if (this.toastT > 0) this.toastT -= dt;
    if (this.goalT > 0) this.goalT -= dt;
    if (this.skillFx) { this.skillFx.t += dt; if (this.skillFx.t >= this.skillFx.dur) this.skillFx = null; }
    if (this.bubble) { this.bubble.t += dt; if (this.bubble.t >= this.bubble.dur) this.bubble = null; }
    if (this.over) { this.overT += dt; return; }
    if (this.paused) return;

    this.board.update(dt);
    this.updateEnemies(G, dt);
    if (this.hitFlash > 0) this.hitFlash -= dt;

    if (this.tut) {
      this.tutT += dt;
      if (this.board.phase === 'idle') { if (!this.tutMove) this.tutMove = this.board.findMove(); }
      else this.tutMove = null;
    }

    // ── ĐỒNG HỒ: chạy liên tục, hết giờ là thua ngay ────────────────────
    this.timeLeft = Math.max(0, this.timeLeft - dt);
    this.updateMusic(G);
    if (this.timeLeft <= 25) this.say(G, 'lowTime');
    if (this.timeLeft <= 15) {
      this.warnT -= dt;
      if (this.warnT <= 0) { this.warnT = this.timeLeft <= 5 ? .45 : .9; G.sfx('tick'); }
    }
    if (this.timeLeft <= 0) { this.checkEnd(G); return; }
  },

  /** Đồng hồ của địch chạy độc lập; tới hạn là ra đòn theo kiểu riêng của loài. */
  updateEnemies(G, dt) {
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      const ev = e.update(dt);
      if (ev === 'windup') G.sfx('warn');
      if (ev !== 'strike') continue;

      const ex = FX_ + FW * ((i + .5) / this.enemies.length);
      let dmg = e.dmg, note = '';
      switch (e.def.atk) {
        case ATK.ROB: {
          dmg = Math.round(e.dmg * .55);
          const steal = Math.min(this.gold, 40 + e.dmg * 3);
          this.gold -= steal;
          this.score = Math.max(0, this.score - 300);
          note = t('foeRob', { n: steal });
          this.say(G, 'robbed');
          break;
        }
        case ATK.WEB: {
          dmg = Math.round(e.dmg * .45);
          const cells = this.board.webRandom(2 + Math.floor(e.dmg / 12));
          for (const c of cells) G.fx.sparkle(BX + c.px + CELL / 2, BY + c.py + CELL / 2, '#eaf2ff', 8);
          note = t('foeWeb');
          this.say(G, 'webbed');
          break;
        }
        case ATK.DRAIN: {
          dmg = Math.round(e.dmg * .45);
          // Hút giờ phải nhẹ tay: mất 8 giây mỗi đòn từng khiến chương 3 thua
          // vì hết giờ chứ không phải vì đánh dở — đo được qua dev/balance.mjs.
          this.timeLeft = Math.max(0, this.timeLeft - 4);
          note = t('foeDrain');
          break;
        }
        case ATK.SWARM: note = t('foeSwarm'); break;
        default: note = t('foeBite');
      }
      this.hp = Math.max(0, this.hp - dmg);
      this.hitFlash = .45;
      G.sfx('invalid'); G.fx.shake(11);
      G.hero.react('hurt', .8);
      G.fx.float(FX_ + FW / 2, FY_ + FH * .5, note, { size: 26, fill: '#ff9aa8', stroke: '#5c0010', max: 1.3 });
      G.fx.beam(ex, ENEMY_Y + 30, false, 120, '#ff5470');
      if (this.hp <= 0) { this.finish(G, false, t('foeKilled')); return; }
    }
  },

  /**
   * Nhạc đổi theo TÌNH HUỐNG, không chỉ theo màn:
   *   · dưới 25 giây  → "Lửa Đồng" (gấp rút)
   *   · còn trùm sống → "Đầm Bọ Ngựa" (cao trào)
   *   · dọn sạch địch → quay về bài vui của màn
   */
  updateMusic(G) {
    if (this.over || this.paused) return;
    let want = this.music;
    const boss = (this.enemies || []).some(e => e.alive && e.def.boss);
    if (boss) want = 'climax';
    if (this.timeLeft <= 25) want = 'chase';
    if (want !== this._nowPlaying) { this._nowPlaying = want; G.music(want); }
  },

  // ── nhập liệu ─────────────────────────────────────────────────────────────
  inBoard(x, y) { return x >= BX && y >= BY && x < BX + COLS * CELL && y < BY + ROWS * CELL; },

  down(G, x, y) {
    if (this.over || this.paused) return;
    if (!this.inBoard(x, y)) return;
    const cell = this.board.cellAt(x - BX, y - BY);
    if (!cell) return;
    if (this.hammerMode) {
      if (this.board.phase !== 'idle') return;
      this.hammerMode = false; this.hammer--;
      const i = this.board.idx(cell[0], cell[1]);
      const px = BX + cell[0] * CELL + CELL / 2, py = BY + cell[1] * CELL + CELL / 2;
      this.skillFx = { kind: 'hammer', t: 0, dur: .78, x: px, y: py, done: false };
      G.sfx('blast'); G.fx.shake(26);
      G.fx.ring(px, py, '#ffffff', 8, 190, .5, 14);
      G.fx.ring(px, py, '#ffd76b', 8, 130, .38, 9);
      for (let k = 0; k < 14; k++)
        G.fx.burst(px, py, { lite: '#e8eefc', base: '#9aa6bd', dark: '#4a5060', spark: '#ffffff' }, 4, 1.5);
      G.fx.smoke(px, py, 8, '#d8dfef');
      const out = new Set(); this.board.detonate(i, out);
      this.board._beginPop([...out], null);
      return;
    }
    this.dragFrom = cell; this.moved = 0; this.downXY = [x, y];
  },

  move(G, x, y) {
    if (!this.dragFrom || this.board.phase !== 'idle') return;
    const dx = x - this.downXY[0], dy = y - this.downXY[1];
    if (Math.hypot(dx, dy) < CELL * .42) return;
    const [c, r] = this.dragFrom;
    const [nc, nr] = Math.abs(dx) > Math.abs(dy) ? [c + Math.sign(dx), r] : [c, r + Math.sign(dy)];
    this.moved = 1;
    this.attempt(G, c, r, nc, nr);
    this.dragFrom = null;
  },

  up(G, x, y) {
    if (this.over || this.paused) { this.dragFrom = null; return; }
    if (!this.dragFrom || this.moved) { this.dragFrom = null; return; }
    const [c, r] = this.dragFrom; this.dragFrom = null;
    const b = this.board;
    if (b.sel) {
      const [sc, sr] = b.sel;
      if (sc === c && sr === r) { b.sel = null; return; }
      if (Math.abs(sc - c) + Math.abs(sr - r) === 1) { this.attempt(G, sc, sr, c, r); return; }
    }
    b.sel = [c, r]; b.idleT = 0; b.hint = null; G.sfx('select');
  },

  attempt(G, c1, r1, c2, r2) {
    const b = this.board;
    if (!b.trySwap(c1, r1, c2, r2)) { G.sfx('invalid'); return; }
    if (b.swapValid) {
      this.movesLeft--;
      if (this.tut) { this.tut = false; this.tutMove = null; G.save.seenTut = true; G.persist(); }
      G.sfx('swap');
      if (this.movesLeft <= 3) G.sfx('tick');
    } else {
      // Nước đi không tạo bộ trùng VẪN mất 1 lượt — người chơi phải tính trước,
      // không được thử mò. Hết lượt là thua.
      this.movesLeft--;
      b.phase = 'revert';
      G.sfx('invalid');
      G.fx.shake(6);
      const mx = BX + (c1 + c2) * CELL / 2 + CELL / 2, my = BY + (r1 + r2) * CELL / 2 + CELL / 2;
      G.fx.float(mx, my, t('wasted'), { size: 24, fill: '#ff9aa8', stroke: '#5c0010', max: .9 });
      G.fx.ring(mx, my, '#ff5470', 8, 70, .35, 6);
      if (this.movesLeft <= 0) this.checkEnd(G);
    }
  },

  // ── vẽ ────────────────────────────────────────────────────────────────────
  draw(G, ctx) {
    const { W, H } = G, L = G.level, S = G.save;
    G.world.draw(ctx);
    ctx.fillStyle = 'rgba(16,9,34,.30)'; ctx.fillRect(...bleed(G));

    if (!COMPACT) this.drawDragonCard(G, ctx);
    this.drawSkills(G, ctx);

    this.drawEnemies(G, ctx);

    // ── khung bàn cờ ────────────────────────────────────────────────────────
    glassPanel(ctx, FX_, FY_, FW, FH, 22, { top: 'rgba(12,7,26,.94)', bot: 'rgba(6,3,16,.96)', rim: 'rgba(150,120,255,.5)' });
    this.board.draw(ctx, BX, BY);

    if (this.hammerMode) {
      ctx.save();
      ctx.strokeStyle = `rgba(255,120,60,${.5 + .4 * Math.sin(this.t * 8)})`;
      ctx.lineWidth = 5; roundRect(ctx, FX_, FY_, FW, FH, 22); ctx.stroke();
      ctx.restore();
    }

    this.drawHUD(G, ctx);

    // thanh EXP dưới cùng
    const st = stageFor(S.xp);
    const nx = STAGES.find(s => s.xp > S.xp);
    const prog = nx ? (S.xp - st.xp) / (nx.xp - st.xp) : 1;
    starBar(ctx, 24, H - 56, W - 48, 34, prog, { t: this.t, label: `${tx(st, 'name')}  ·  ${S.xp} EXP` });

    // tên màn
    strokeText(ctx, `${t('level')} ${L.index} · ${tx(G.episodeOf(G.levelIndex), 'name')}`, FX_ + FW / 2, 24,
      { font: FONT.disp(22), fill: '#fff', stroke: '#2b1740', lw: 5, baseline: 'middle' });

    if (this.skillFx) this.drawSkillFx(ctx);
    if (this.tut && this.tutMove) this.drawTutor(ctx);

    // hạt + lời khen
    G.fx.draw(ctx);
    if (this.praiseT > 0) {
      const k = 1 - this.praiseT / 1.25;
      ctx.save();
      ctx.translate(FX_ + FW / 2, FY_ + FH * .40);
      const s = ease.outBack(clamp(k / .25, 0, 1)) * (1 + k * .1);
      ctx.scale(s, s); ctx.globalAlpha = clamp((1 - k) * 2.2, 0, 1);
      ctx.rotate(Math.sin(k * 18) * .04);
      ctx.font = FONT.disp(58);
      const tw = ctx.measureText(this.praise).width;
      const bg = ctx.createLinearGradient(-tw / 2 - 30, 0, tw / 2 + 30, 0);   // dải nền cho dễ đọc
      bg.addColorStop(0, 'rgba(24,10,40,0)'); bg.addColorStop(.5, 'rgba(24,10,40,.82)');
      bg.addColorStop(1, 'rgba(24,10,40,0)');
      ctx.fillStyle = bg; ctx.fillRect(-tw / 2 - 60, -42, tw + 120, 84);
      strokeText(ctx, this.praise, 0, 0, { font: FONT.disp(58), fill: '#ffe066', stroke: '#6b1a00', lw: 12, baseline: 'middle' });
      ctx.restore();
    }
    if (this.goalT > 0) {
      ctx.save();
      ctx.globalAlpha = clamp(this.goalT / 1.6, 0, 1);
      const k = 1 - this.goalT / 1.6;
      ctx.translate(FX_ + FW / 2, FY_ + 54);
      ctx.scale(1 + (1 - k) * .25, 1 + (1 - k) * .25);
      strokeText(ctx, t('goalHit'), 0, 0,
        { font: FONT.disp(40), fill: '#8ef08a', stroke: '#0d3a16', lw: 9, baseline: 'middle' });
      ctx.restore();
    }
    if (this.toastT > 0) {
      ctx.save(); ctx.globalAlpha = clamp(this.toastT, 0, 1);
      pill(ctx, FX_ + FW / 2, FY_ + FH - 36, this.toast, FONT.disp(22), '#ffd76b');
      ctx.restore();
    }

    // nút tạm dừng
    const p = this.hits.find(h => h.id === 'pause');
    if (p) roundBtn(ctx, p.x + 26, p.y + 26, 26, (c, s) => icon.pause(c, s), { press: p.press, hover: p.hover });
    const ex = this.hits.find(h => h.id === 'exit');
    if (ex) roundBtn(ctx, ex.x + 26, ex.y + 26, 26, (c, s) => icon.exit(c, s), { press: ex.press, hover: ex.hover });

    if (this.hitFlash > 0) {
      ctx.save();
      ctx.globalAlpha = clamp(this.hitFlash / .45, 0, 1) * .55;
      const vg = ctx.createRadialGradient(W / 2, H / 2, H * .28, W / 2, H / 2, H * .78);
      vg.addColorStop(0, 'rgba(255,20,50,0)'); vg.addColorStop(1, 'rgba(255,20,50,.95)');
      ctx.fillStyle = vg; ctx.fillRect(...bleed(G));
      ctx.restore();
    }
    if (this.bubble) this.drawBubble(G, ctx);
    if (this.paused) this.drawPause(G, ctx);
    if (this.over) this.drawOver(G, ctx);
  },

  // ── thẻ rồng bên trái (đúng bố cục Figma) ────────────────────────────────
  drawDragonCard(G, ctx) {
    const x = CARDX, y = 122, w = 250, h = 400;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 8;
    roundRect(ctx, x, y, w, h, 26); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.save(); roundRect(ctx, x + 6, y + 6, w - 12, h - 12, 20); ctx.clip();
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, '#bfe4ff'); g.addColorStop(.55, '#dff0ff'); g.addColorStop(1, '#f5e6c8');
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    // đồi nhỏ trong thẻ
    ctx.fillStyle = 'rgba(150,190,140,.55)';
    ctx.beginPath(); ctx.ellipse(x + w * .3, y + h * .92, w * .6, h * .18, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(120,170,110,.75)';
    ctx.beginPath(); ctx.ellipse(x + w * .75, y + h * .97, w * .55, h * .15, 0, 0, TAU); ctx.fill();
    G.hero.draw(ctx, x + w * .50, y + h * .76, 168, 1);
    ctx.restore();
    ctx.strokeStyle = 'rgba(120,160,200,.8)'; ctx.lineWidth = 3;
    roundRect(ctx, x + 6, y + 6, w - 12, h - 12, 20); ctx.stroke();
    ctx.restore();

    const breed = BREEDS.find(b => b.id === G.save.breed) || BREEDS[0];
    strokeText(ctx, tx(breed, 'name'), x + w / 2, y + 34,
      { font: FONT.disp(24), fill: '#fff', stroke: '#2b4a6b', lw: 6, baseline: 'middle' });
    strokeText(ctx, tx(stageFor(G.save.xp), 'name'), x + w / 2, y + 62,
      { font: FONT.disp(18), fill: '#ffe9b0', stroke: '#4a2a10', lw: 5, baseline: 'middle' });
  },

  // ── dải kỹ năng dọc ───────────────────────────────────────────────────────
  drawSkills(G, ctx) {
    const specs = [
      { id: 'sk0', ready: this.breath >= 1, fill: this.breath, ic: icon.flame, n: '' },
      { id: 'sk1', ready: this.hammer > 0, fill: this.hammer > 0 ? 1 : 0, ic: (c, s) => icon.hammer(c, s), n: this.hammer },
      { id: 'sk2', ready: this.shuffleUse > 0, fill: this.shuffleUse > 0 ? 1 : 0, ic: (c, s) => icon.restart(c, s), n: this.shuffleUse },
    ];
    glassPanel(ctx, STRIPX, 176, 78, 246, 20);
    for (const sp of specs) {
      const h = this.hits.find(x => x.id === sp.id); if (!h) continue;
      const cx = h.x + h.w / 2, cy = h.y + h.h / 2;
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, 28, 0, TAU);
      const g = ctx.createLinearGradient(0, cy - 28, 0, cy + 28);
      if (sp.ready) { g.addColorStop(0, C.iceLite); g.addColorStop(1, C.iceMid); }
      else { g.addColorStop(0, '#7d8296'); g.addColorStop(1, '#4a4f66'); }
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = sp.ready ? C.iceDark : '#2f3348'; ctx.lineWidth = 3; ctx.stroke();
      if (sp.ready) {                              // viền vàng cho nút đã sẵn sàng
        ctx.strokeStyle = 'rgba(255,214,110,.85)'; ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.arc(cx, cy, 25.5, 0, TAU); ctx.stroke();
      }
      ctx.save();                                  // chớp sáng mặt nút
      ctx.beginPath(); ctx.arc(cx, cy, 28, 0, TAU); ctx.clip();
      ctx.fillStyle = 'rgba(255,255,255,.5)';
      ctx.beginPath(); ctx.ellipse(cx - 6, cy - 15, 15, 6, 0, 0, TAU); ctx.fill();
      ctx.restore();
      if (sp.id === 'sk0' && !sp.ready) {          // rãnh nạp luôn hiện để thấy nút
        ctx.strokeStyle = 'rgba(255,255,255,.16)'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.arc(cx, cy, 32, 0, TAU); ctx.stroke();
      }
      if (sp.ready) {
        ctx.strokeStyle = `rgba(255,230,120,${.4 + .4 * Math.sin(this.t * 5)})`; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(cx, cy, 33, 0, TAU); ctx.stroke();
      }
      // vòng nạp
      if (sp.id === 'sk0' && !sp.ready) {
        ctx.strokeStyle = '#ff9a2b'; ctx.lineWidth = 5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(cx, cy, 32, -Math.PI / 2, -Math.PI / 2 + TAU * sp.fill); ctx.stroke();
      }
      ctx.save(); ctx.translate(cx, cy); ctx.globalAlpha = sp.ready ? 1 : .5; sp.ic(ctx, 56); ctx.restore();
      if (sp.n !== '') strokeText(ctx, '×' + sp.n, cx + 22, cy + 22,
        { font: FONT.disp(16), fill: '#fff', stroke: '#12263e', lw: 3, baseline: 'middle' });
      ctx.restore();
    }
  },

  // ── BẢNG SCORE (bám sát artboard HUD) ────────────────────────────────────
  drawHUD(G, ctx) {
    const L = G.level;
    const x = HUDX, y = 60, w = HUDW, h = 528;
    card(ctx, x, y, w, h, 24);

    strokeText(ctx, t('score'), x + w / 2, y + 52,
      { font: FONT.disp(44), fill: '#ffa63d', stroke: '#8c3d00', lw: 8, baseline: 'middle' });
    strokeText(ctx, Math.round(this.shownScore).toLocaleString(), x + w / 2, y + 100,
      { font: FONT.disp(38), fill: '#2b1740', stroke: null, lw: 0, baseline: 'middle', shadow: null });

    const bw = w - 44, bh = 52;
    // vương miện = tiến độ mục tiêu
    statBar(ctx, x + 22, y + 120, bw, bh, this.score / L.target, (c, s) => icon.crown(c, s),
      { label: `${Math.min(100, Math.round(this.score / L.target * 100))}%` });
    // đồng hồ = thời gian còn lại
    const frac = clamp(this.timeLeft / this.timeMax, 0, 1);
    const low = this.timeLeft <= 15;
    const mm = Math.floor(this.timeLeft / 60), ss = Math.floor(this.timeLeft % 60);
    statBar(ctx, x + 22, y + 182, bw, bh, frac, (c, s) => icon.clock(c, s), {
      fillA: low ? '#ff9a9a' : C.barA, fillB: low ? '#e01f3d' : C.barB,
      label: `${mm}:${String(ss).padStart(2, '0')}`,
    });
    // tim = máu của bạn
    const hpF = clamp(this.hp / this.maxHp, 0, 1), hpLow = hpF < .3;
    statBar(ctx, x + 22, y + 244, bw, bh, hpF, (c, s) => icon.heart(c, s), {
      fillA: hpLow ? '#ff9a9a' : '#ff7d8f', fillB: hpLow ? '#c00020' : '#e01f3d',
      label: `${Math.ceil(this.hp)}`,
    });
    if (this.hitFlash > 0) {
      ctx.save();
      ctx.globalAlpha = clamp(this.hitFlash / .45, 0, 1) * .5;
      ctx.fillStyle = '#ff2040';
      roundRect(ctx, x + 22, y + 244, bw, bh, bh / 2); ctx.fill();
      ctx.restore();
    }
    // túi = vàng kiếm được
    statBar(ctx, x + 22, y + 306, bw, bh, clamp(this.gold / 400, 0, 1), (c, s) => icon.pouch(c, s),
      { label: String(this.gold) });

    // lượt đi còn lại
    const mLow = this.movesLeft <= 3;
    strokeText(ctx, t('moves'), x + 34, y + 380,
      { font: FONT.ui(16, 800), fill: '#5b4a7a', stroke: null, lw: 0, align: 'left', baseline: 'middle', shadow: null });
    strokeText(ctx, String(this.movesLeft), x + w - 34, y + 380,
      { font: FONT.disp(mLow ? 44 + Math.sin(this.t * 8) * 4 : 40),
        fill: mLow ? '#e8384f' : '#2b1740', stroke: mLow ? '#5c0010' : null, lw: mLow ? 5 : 0,
        align: 'right', baseline: 'middle', shadow: null });
    // mục tiêu
    const noun = GOAL_NOUN[G.episodeOf(G.levelIndex).id];
    const nounTxt = noun ? ' ' + tx(noun, 'vi') : '';
    strokeText(ctx, `${t('goal')}: ${L.target.toLocaleString()}${nounTxt}`, x + w / 2, y + 414,
      { font: FONT.ui(15, 600), fill: '#6a5a86', stroke: null, lw: 0, baseline: 'middle', shadow: null });
    if (this.foesLeft)
      strokeText(ctx, t('foesAlive', { n: this.foesLeft }), x + w / 2, y + 438,
        { font: FONT.ui(13, 700), fill: '#c0405a', stroke: null, lw: 0, baseline: 'middle', shadow: null });

    // 2 nút tròn
    for (const id of ['restart', 'resume']) {
      const h2 = this.hits.find(k => k.id === id); if (!h2) continue;
      roundBtn(ctx, h2.x + 32, h2.y + 32, 32,
        (c, s) => id === 'restart' ? icon.restart(c, s) : (this.paused ? icon.play(c, s) : icon.pause(c, s)),
        { press: h2.press, hover: h2.hover });
    }
  },

  /** Khung thoại nhỏ dưới thẻ nhân vật — cốt truyện chạy ngay trong ván. */
  drawBubble(G, ctx) {
    const b = this.bubble;
    const k = clamp(b.t / .22, 0, 1);
    const fade = clamp((b.dur - b.t) / .4, 0, 1);
    const sp = SPEAKERS[b.beat.who] || SPEAKERS.rom;
    const text = tx(b.beat, 'vi') || b.beat.vi;
    const x = COMPACT ? FX_ + 6 : CARDX, w = COMPACT ? FW - 12 : 340, y = COMPACT ? FY_ + FH + 10 : 536;

    ctx.save();
    ctx.globalAlpha = fade;
    ctx.translate(x + w / 2, y);
    const e = ease.outBack(k);
    ctx.scale(e, e);
    ctx.translate(-(x + w / 2), -y);

    ctx.font = FONT.ui(15, 600);
    const lines = wrapLines(ctx, text, w - 34);
    const h = 44 + lines.length * 21;

    roundRect(ctx, x, y, w, h, 16);
    ctx.fillStyle = 'rgba(14,8,26,.93)'; ctx.fill();
    ctx.strokeStyle = sp.col; ctx.lineWidth = 2.5; ctx.stroke();
    // đuôi bong bóng chỉ lên thẻ nhân vật
    ctx.beginPath();
    ctx.moveTo(x + 46, y); ctx.lineTo(x + 62, y - 14); ctx.lineTo(x + 78, y);
    ctx.closePath(); ctx.fillStyle = 'rgba(14,8,26,.93)'; ctx.fill();
    ctx.strokeStyle = sp.col; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(x + 46, y); ctx.lineTo(x + 62, y - 14); ctx.lineTo(x + 78, y); ctx.stroke();

    strokeText(ctx, tx(sp, 'name'), x + 16, y + 20,
      { font: FONT.disp(17), fill: sp.col, stroke: sp.ink, lw: 4, align: 'left', baseline: 'middle' });
    ctx.font = FONT.ui(15, 600); ctx.fillStyle = '#efe8ff';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    lines.forEach((ln, i) => ctx.fillText(ln, x + 16, y + 44 + i * 21));
    ctx.restore();
  },

  /** Hàng thiên địch: hình + thanh máu + vòng đếm ngược tới đòn kế tiếp. */
  drawEnemies(G, ctx) {
    const n = this.enemies.length;
    if (!n) return;
    for (let i = 0; i < n; i++) {
      const e = this.enemies[i];
      const cx = FX_ + FW * ((i + .5) / n);
      if (e.dead && e.deadT > .9) {
        ctx.save(); ctx.globalAlpha = .3;
        strokeText(ctx, '✕', cx, ENEMY_Y, { font: FONT.disp(30), fill: '#7a6a8f', stroke: null, lw: 0, baseline: 'middle', shadow: null });
        ctx.restore();
        continue;
      }
      // hào quang đỏ khi sắp ra đòn
      if (e.wind && !e.dead) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const p = .4 + .4 * Math.sin(this.t * 20);
        const g = ctx.createRadialGradient(cx, ENEMY_Y, 4, cx, ENEMY_Y, 62);
        g.addColorStop(0, `rgba(255,70,90,${p * .55})`); g.addColorStop(1, 'rgba(255,70,90,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, ENEMY_Y, 62, 0, TAU); ctx.fill();
        ctx.restore();
      }
      e.draw(ctx, cx, ENEMY_Y - 4, 58);

      if (e.dead) continue;
      // thanh máu
      const bw = Math.min(120, FW / n - 34), bx = cx - bw / 2, by = ENEMY_Y + 30;
      roundRect(ctx, bx, by, bw, 11, 5.5);
      ctx.fillStyle = 'rgba(10,6,20,.85)'; ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.save();
      roundRect(ctx, bx + 1.5, by + 1.5, bw - 3, 8, 4); ctx.clip();
      const hg = ctx.createLinearGradient(bx, 0, bx + bw, 0);
      hg.addColorStop(0, '#ff5470'); hg.addColorStop(1, '#ff9a5c');
      ctx.fillStyle = hg; ctx.fillRect(bx + 1.5, by + 1.5, (bw - 3) * e.ratio, 8);
      ctx.restore();
      // vòng đếm ngược đòn kế tiếp
      const cd = 1 - clamp(e.cd / e.every, 0, 1);
      ctx.save();
      ctx.strokeStyle = e.wind ? '#ff5470' : 'rgba(255,255,255,.4)';
      ctx.lineWidth = 3.4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(cx + bw / 2 + 14, by + 5, 10, -Math.PI / 2, -Math.PI / 2 + TAU * cd); ctx.stroke();
      ctx.restore();
      strokeText(ctx, tx(e.def, 'name'), cx, ENEMY_Y - 40,
        { font: FONT.ui(12, 800), fill: '#ffd0d8', stroke: '#3a0010', lw: 3, baseline: 'middle' });
    }
  },

  /** Hiệu ứng kỹ năng — cố ý làm to, chói và rung để cảm giác "đã tay". */
  drawSkillFx(ctx) {
    const f = this.skillFx, k = clamp(f.t / f.dur, 0, 1);
    ctx.save();
    roundRect(ctx, FX_ + 6, FY_ + 6, FW - 12, FH - 12, 18); ctx.clip();

    if (f.kind === 'hammer') {
      const swing = clamp(f.t / .22, 0, 1);
      const impact = clamp((f.t - .22) / .56, 0, 1);
      if (f.t < .24) {                                   // búa lao xuống
        const e = ease.inCubic(swing);
        ctx.save();
        ctx.translate(f.x + lerp(190, 0, e), f.y + lerp(-260, -46, e));
        ctx.rotate(lerp(-1.35, 0.12, e));
        ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 24;
        icon.hammer(ctx, 190);
        ctx.restore();
      } else {                                           // búa bật lên rồi mờ
        ctx.save();
        ctx.globalAlpha = 1 - impact;
        ctx.translate(f.x, f.y - 46 - impact * 90);
        ctx.rotate(0.12 + impact * .7);
        icon.hammer(ctx, 190 * (1 - impact * .2));
        ctx.restore();
      }
      if (f.t >= .22) {
        const p = clamp((f.t - .22) / .3, 0, 1);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = (1 - p) * .9;
        const fg = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, 220 * (0.3 + p));
        fg.addColorStop(0, 'rgba(255,255,255,.95)'); fg.addColorStop(1, 'rgba(255,240,190,0)');
        ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(f.x, f.y, 220 * (0.3 + p), 0, TAU); ctx.fill();
        ctx.restore();
        // vết nứt toả ra
        ctx.save();
        ctx.globalAlpha = 1 - p;
        ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineCap = 'round';
        for (let i = 0; i < 9; i++) {
          const a = i / 9 * TAU + .3, L = lerp(20, 150, ease.outCubic(p));
          ctx.lineWidth = lerp(6, 1.5, p);
          ctx.beginPath();
          ctx.moveTo(f.x + Math.cos(a) * 12, f.y + Math.sin(a) * 12);
          ctx.lineTo(f.x + Math.cos(a + .12) * L * .6, f.y + Math.sin(a + .12) * L * .6);
          ctx.lineTo(f.x + Math.cos(a - .08) * L, f.y + Math.sin(a - .08) * L);
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    if (f.kind === 'fire') {
      const sweep = ease.outQuad(clamp(f.t / .55, 0, 1));
      const fade = clamp((f.t - .55) / .40, 0, 1);
      const x0 = FX_ + 8, x1 = x0 + (FW - 16) * sweep;
      const h = CELL * 1.5;
      // 1) vệt cháy nền — vẽ TRƯỚC để không làm xỉn ngọn lửa
      ctx.save();
      ctx.globalAlpha = (1 - fade) * .55;
      const scg = ctx.createLinearGradient(0, f.y - CELL * .55, 0, f.y + CELL * .55);
      scg.addColorStop(0, 'rgba(60,20,8,0)'); scg.addColorStop(.5, 'rgba(48,14,4,.95)');
      scg.addColorStop(1, 'rgba(60,20,8,0)');
      ctx.fillStyle = scg;
      ctx.fillRect(x0, f.y - CELL * .55, (FW - 16) * sweep, CELL * 1.1);
      ctx.restore();
      // 2) luồng lửa
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 1 - fade;
      const g = ctx.createLinearGradient(x0, 0, x1, 0);
      g.addColorStop(0, 'rgba(210,40,0,0)');
      g.addColorStop(.25, 'rgba(255,90,10,.85)');
      g.addColorStop(.62, 'rgba(255,168,40,.95)');
      g.addColorStop(.92, 'rgba(255,238,160,1)');
      g.addColorStop(1, 'rgba(255,255,240,1)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x0, f.y - h * .12);
      ctx.quadraticCurveTo((x0 + x1) / 2, f.y - h * .62, x1, f.y - h * .10);
      ctx.quadraticCurveTo((x0 + x1) / 2, f.y + h * .64, x0, f.y + h * .12);
      ctx.closePath(); ctx.fill();
      // 3) lưỡi lửa gợn sóng dọc luồng
      ctx.globalAlpha = (1 - fade) * .85;
      for (let i = 0; i < 12; i++) {
        const px = lerp(x0, x1, i / 12);
        const wob = Math.sin(f.t * 26 + i * 1.7);
        const fh = h * (.30 + .22 * Math.abs(wob)) * (i / 12 * .6 + .5);
        const fg2 = ctx.createLinearGradient(px, f.y, px, f.y - fh);
        fg2.addColorStop(0, 'rgba(255,200,80,.9)'); fg2.addColorStop(1, 'rgba(255,90,20,0)');
        ctx.fillStyle = fg2;
        ctx.beginPath();
        ctx.moveTo(px - CELL * .22, f.y);
        ctx.quadraticCurveTo(px + wob * 8, f.y - fh * .7, px + wob * 5, f.y - fh);
        ctx.quadraticCurveTo(px + CELL * .16, f.y - fh * .4, px + CELL * .22, f.y);
        ctx.closePath(); ctx.fill();
      }
      // 4) đầu ngọn chói
      const hg = ctx.createRadialGradient(x1, f.y, 0, x1, f.y, h * 1.15);
      hg.addColorStop(0, 'rgba(255,255,240,1)');
      hg.addColorStop(.4, 'rgba(255,190,70,.7)');
      hg.addColorStop(1, 'rgba(255,110,20,0)');
      ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(x1, f.y, h * 1.15, 0, TAU); ctx.fill();
      ctx.restore();
    }

    if (f.kind === 'shuffle') {
      const cx = BX + COLS * CELL / 2, cy = BY + ROWS * CELL / 2;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.sin(k * Math.PI) * .85;
      ctx.strokeStyle = '#bfe6ff'; ctx.lineCap = 'round';
      for (let i = 0; i < 7; i++) {
        ctx.lineWidth = 5 - i * .5;
        ctx.beginPath();
        for (let a = 0; a < 5.2; a += .2) {
          const rr = 30 + a * 52 * (1 - k * .45);
          const ang = a * 1.5 + i * .9 + f.t * 9;
          const px = cx + Math.cos(ang) * rr, py = cy + Math.sin(ang) * rr * .92;
          a ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
        }
        ctx.stroke();
      }
      const fg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 200);
      fg.addColorStop(0, `rgba(255,255,255,${Math.sin(k * Math.PI) * .5})`);
      fg.addColorStop(1, 'rgba(180,220,255,0)');
      ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(cx, cy, 200, 0, TAU); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  },

  /** Bàn tay chỉ đúng nước đi đầu tiên — chỉ hiện ở màn 1, tắt sau khi bạn tự đi. */
  drawTutor(ctx) {
    const [[c1, r1], [c2, r2]] = [this.tutMove.a, this.tutMove.b];
    const x1 = BX + c1 * CELL + CELL / 2, y1 = BY + r1 * CELL + CELL / 2;
    const x2 = BX + c2 * CELL + CELL / 2, y2 = BY + r2 * CELL + CELL / 2;
    const k = (this.tutT % 2.2) / 2.2;
    const p = ease.inOut(clamp((k - .18) / .5, 0, 1));

    ctx.save();
    // làm tối phần bàn ngoài 2 ô cần chú ý
    ctx.globalAlpha = .42; ctx.fillStyle = '#0a0618';
    ctx.beginPath();
    ctx.rect(FX_, FY_, FW, FH);
    ctx.rect(Math.min(x1, x2) - CELL / 2, Math.min(y1, y2) - CELL / 2,
             Math.abs(x2 - x1) + CELL, Math.abs(y2 - y1) + CELL);
    ctx.fill('evenodd');
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = `rgba(255,225,110,${.6 + .3 * Math.sin(this.tutT * 6)})`;
    ctx.lineWidth = 4; ctx.setLineDash([10, 8]); ctx.lineDashOffset = -this.tutT * 30;
    ctx.strokeRect(Math.min(x1, x2) - CELL / 2 + 3, Math.min(y1, y2) - CELL / 2 + 3,
                   Math.abs(x2 - x1) + CELL - 6, Math.abs(y2 - y1) + CELL - 6);
    ctx.setLineDash([]);
    // mũi tên hướng đi
    ctx.strokeStyle = '#ffe066'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    const dx = Math.sign(x2 - x1), dy = Math.sign(y2 - y1);
    ctx.beginPath();
    ctx.moveTo(x1 + dx * 12, y1 + dy * 12); ctx.lineTo(x2 - dx * 16, y2 - dy * 16); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x2 - dx * 22 - dy * 10, y2 - dy * 22 - dx * 10);
    ctx.lineTo(x2 - dx * 8, y2 - dy * 8);
    ctx.lineTo(x2 - dx * 22 + dy * 10, y2 - dy * 22 + dx * 10);
    ctx.stroke();
    hand(ctx, lerp(x1, x2, p) + 16, lerp(y1, y2, p) + 18, 32);
    ctx.restore();

    pill(ctx, FX_ + FW / 2, FY_ + FH - 36, t('tutDrag'), FONT.disp(22), '#ffe066');
  },

  drawPause(G, ctx) {
    const { W, H } = G;
    ctx.fillStyle = 'rgba(10,6,22,.7)'; ctx.fillRect(...bleed(G));
    glassPanel(ctx, W / 2 - 210, H / 2 - 150, 420, 300, 24);
    strokeText(ctx, t('paused'), W / 2, H / 2 - 92, { font: FONT.disp(44), fill: '#fff', stroke: '#3a1d6e', lw: 9, baseline: 'middle' });
    strokeText(ctx, 'Esc  /  P  ' + String.fromCharCode(0x2192) + '  ' + t('resume'), W / 2, H / 2 - 40,
      { font: FONT.ui(15, 600), fill: 'rgba(255,255,255,.6)', stroke: null, lw: 0, baseline: 'middle', shadow: null });
    const qb = this.hits.find(h => h.id === 'quit');
    if (qb) textBtn(ctx, qb.x, qb.y, qb.w, qb.h, t('quit'),
      { press: qb.press, hover: qb.hover, colour: '#e8384f', dark: '#8c0f22', lite: '#ff9aa8', font: FONT.disp(24) });
    const hw = this.hits.find(h => h.id === 'howto');
    if (hw) textBtn(ctx, hw.x, hw.y, hw.w, hw.h, t('howTo'),
      { press: hw.press, hover: hw.hover, colour: '#3f8fd0', dark: '#1c5f9e', lite: '#a8dcff', font: FONT.disp(24) });
  },

  drawOver(G, ctx) {
    const { W, H } = G;
    const k = clamp(this.overT / .5, 0, 1);
    ctx.fillStyle = `rgba(10,6,22,${.72 * k})`; ctx.fillRect(...bleed(G));
    const s = ease.outBack(k);
    ctx.save();
    ctx.translate(W / 2, H / 2 - 40); ctx.scale(s, s); ctx.translate(-W / 2, -(H / 2 - 40));
    glassPanel(ctx, W / 2 - 300, 140, 600, 300, 28,
      // Nền phải TỐI và trung tính thì tia sáng vàng mới ra vàng. Nền xanh lá
      // cũ cộng tia vàng ra màu ô liu, nhìn như sọc bẩn chứ không phải hào quang.
      this.over.win ? { top: 'rgba(28,32,62,.96)', bot: 'rgba(11,13,30,.97)', rim: 'rgba(120,240,150,.55)' }
                    : { top: 'rgba(52,20,28,.96)', bot: 'rgba(20,7,13,.97)', rim: 'rgba(255,120,80,.55)' });

    resultBanner(ctx, {
      cx: W / 2, top: 140, w: 600, h: 300,
      win: this.over.win, t: this.t,
      title: this.over.win ? t('cleared') : t('failed'),
      sub: `${t('level')} ${G.level?.index ?? ''}`.trim(),
      stars: this.starsEarned, anim: this.overT,
    });
    strokeText(ctx, `${t('finalScore')}: ${this.score.toLocaleString()}`, W / 2, 368,
      { font: FONT.disp(28), fill: '#fff', stroke: '#12060f', lw: 6, baseline: 'middle' });
    if (this.over.win)
    {
      const line = `+${this.gold} ${t('gold')}     +${this.xpGain} EXP`;
      strokeText(ctx, line, W / 2, 406,
        { font: FONT.disp(24), fill: '#ffe066', stroke: '#4a2d00', lw: 5, baseline: 'middle' });
    }
    else
    {
      strokeText(ctx, this.over.why, W / 2, 398,
        { font: FONT.ui(19, 600), fill: '#ffc0cf', stroke: null, lw: 0, baseline: 'middle', shadow: null });
      if (this.penaltyGold || this.penaltyXp)
        strokeText(ctx, t('penalty', { g: this.penaltyGold || 0, x: this.penaltyXp || 0 }), W / 2, 428,
          { font: FONT.disp(22), fill: '#ff7a90', stroke: '#3a0008', lw: 5, baseline: 'middle' });
    }
    ctx.restore();

    if (k >= 1) for (const h of this.hits) {
      if (h.id === 'next')  textBtn(ctx, h.x, h.y, h.w, h.h, t('next') + ' ›', { press: h.press, hover: h.hover, font: FONT.disp(24) });
      if (h.id === 'retry') textBtn(ctx, h.x, h.y, h.w, h.h, t('retry'), { press: h.press, hover: h.hover, colour: C.orange, dark: C.orangeDark, lite: C.orangeLite, font: FONT.disp(24) });
      if (h.id === 'map')   textBtn(ctx, h.x, h.y, h.w, h.h, t('toMap'), { press: h.press, hover: h.hover, colour: '#7a5fae', dark: '#3b2263', lite: '#c0a0ff', font: FONT.disp(24) });
    }
  },

  key(G, e) { if (e.key === 'Escape' || e.key === 'p') this.togglePause(G); },
};

/** Cắt chuỗi thành các dòng vừa bề ngang cho trước. */
function wrapLines(ctx, text, maxW) {
  const out = [];
  let line = '';
  for (const w of String(text).split(' ')) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) { out.push(line); line = w; }
    else line = test;
  }
  if (line) out.push(line);
  return out;
}

/** Chữ trên nền viên thuốc mờ — đọc được trên mọi nền bàn cờ. */
function pill(ctx, cx, cy, text, font, fill) {
  ctx.save();
  ctx.font = font;
  const w = ctx.measureText(text).width + 40;
  roundRect(ctx, cx - w / 2, cy - 21, w, 42, 21);
  ctx.fillStyle = 'rgba(12,6,26,.88)'; ctx.fill();
  ctx.strokeStyle = 'rgba(255,225,110,.45)'; ctx.lineWidth = 2; ctx.stroke();
  strokeText(ctx, text, cx, cy, { font, fill, stroke: '#3a1d00', lw: 4, baseline: 'middle', shadow: null });
  ctx.restore();
}


/** Hàng nguyên liệu vừa nhặt được, hiện ở bảng kết quả. */
function drawMatsRow(ctx, cx, y, got) {
  const list = Object.entries(got);
  if (!list.length) return;
  const w = list.length * 96;
  list.forEach(([id, n], i) => {
    const m = MATS[id]; if (!m) return;
    const x = cx - w / 2 + i * 96 + 48;
    ctx.save(); ctx.translate(x - 18, y); matIcon(ctx, id, 30, m.col); ctx.restore();
    strokeText(ctx, '+' + n, x + 6, y,
      { font: FONT.disp(20), fill: '#fff', stroke: '#1a0f30', lw: 4, baseline: 'middle' });
  });
}

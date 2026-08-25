// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  MÀN BẮN ĐÁ — chế độ chơi thứ hai, dùng chung HUD·đồng hồ·phần thưởng.   ║
// ╚══════════════════════════════════════════════════════════════════════════╝
import { TAU, clamp, lerp, ease, rand, randInt, rgba, strokeText, roundRect } from '../core/util.js';
import { t, tx } from '../core/i18n.js';
import { Hit, card, glassPanel, statBar, roundBtn, textBtn, starBar, icon, matIcon, C, FONT, resultBanner, frostCard , heroCardScene, heroFit } from '../ui/widgets.js';
import { BubbleBoard, ORB, drawOrb, buildOrbSprites } from '../game/bubble.js';
import { BREEDS, STAGES, stageFor } from '../data/characters.js';
import { pickBeat, GOAL_NOUN } from '../data/beats.js';
import { speaker, fill } from '../core/lore.js';
import { rollMats, addMats, MATS } from '../data/gear.js';
import { Enemy, ATK, drawEnemyRaid } from '../game/enemy.js';
import { playLayout, bleed } from '../core/layout.js';

let ENEMY_Y = 46;                         // tính lại theo mép trên khung bắn
const LAND_COLS = 10, MOBILE_COLS = 7;
// Chuỗi Fibonacci: một phát nổ mở chuỗi ở ×2, bắn nổ liên tục sẽ leo dần tới
// ×21. Sau ×21, chuỗi vẫn được giữ nhưng hệ số không tăng thêm để điểm không
// tràn số và bảng xếp hạng còn so sánh được.
const COMBO_MULT = [2, 3, 5, 8, 13, 21];
const comboMult = chain => COMBO_MULT[clamp(chain - 1, 0, COMBO_MULT.length - 1)];
const MAX_IN_FLIGHT = 3;
const FOOD_SHOTS = 5;
let COLS = LAND_COLS;
let R = 24, FW = 524, FH = 524, DEATH_Y = 418, BOARD_ROWS = 13;

// Mốc bố cục tính lại theo bề ngang thiết bị — xem core/layout.js.
let FX_ = 384, FY_ = 122, BX = 406, BY = 136, CARDX = 24, HUDX = 950, HUDW = 306, COMPACT = false;
let LAUNCH = { x: 646, y: 608 };
let PORTRAIT = false, HUDY = 78;
function relayout(W, H, hasFoes = false) {
  PORTRAIT = H > W;
  COLS = PORTRAIT ? MOBILE_COLS : LAND_COLS;
  if (PORTRAIT) {
    // Chỉ chừa 8–12 đơn vị logic ở hai mép. Khung cũ dùng 44px đệm trong +
    // 18px lề ngoài nên bóng bị nhỏ dù canvas đã phủ kín điện thoại.
    const frame = 16;
    R = clamp(Math.floor((W - 32) / (COLS * 2)), 20, 44);
    FW = COLS * R * 2 + frame;
    FX_ = Math.round((W - FW) / 2);
    // Bỏ ô Dế trang trí ở chế độ dọc và kéo vùng bắn lên sát thanh tiêu đề.
    FY_ = H < 1400 ? (hasFoes ? 140 : 74) : (hasFoes ? 162 : 88);
    ENEMY_Y = FY_ - 48;
    BX = FX_ + frame / 2; BY = FY_ + frame / 2;
    CARDX = -9999; HUDX = 12; HUDW = W - 24; COMPACT = true;
    // Khung bắn dọc ăn trọn khoảng giữa tiêu đề và HUD. Trước đây FH = FW nên
    // khung luôn vuông, bỏ phí gần 1/4 màn hình iPhone thành một bãi cỏ trống.
    HUDY = H - 34 - 16 - 154;
    FH = Math.max(FW, HUDY - FY_ - 8);
    // Giữ bệ phóng cách đáy khung 38px dù đệm trên giảm từ 14 xuống 8.
    DEATH_Y = FH - 100;
    // Lưới logic cũng phải cao theo khung mới; nếu chỉ kéo hình nền thì những
    // hàng ở nửa dưới không thể nhận bóng và phần mở rộng sẽ là diện tích giả.
    BOARD_ROWS = Math.max(13, Math.ceil((DEATH_Y - R) / (R * Math.sqrt(3))) + 1);
    LAUNCH = { x: BX + COLS * R, y: BY + DEATH_Y + 54 };
    return;
  }
  // Bán kính bóng tính theo chỗ trống thật (giống bàn Ghép Đá), không đóng đinh
  // 22/24 nữa — trên điện thoại ngang, khung bắn cũ chỉ ăn 2/3 chiều cao.
  const compact = W < 1240, frame = 28;
  const chrome = (compact ? 0 : 268) + 78 + 14 + 18 + (compact ? 286 : 306) + 40;
  const byW = Math.floor((W - chrome - frame) / (COLS * 2));
  const byH = Math.floor((684 - 78 - frame) / (COLS * 2));
  R = clamp(Math.min(byW, byH), 17, 30);
  FW = COLS * R * 2 + frame; FH = FW;
  DEATH_Y = FH - 98;
  BOARD_ROWS = 13;
  const L = playLayout(W, FW, FH);
  FX_ = L.boardX;
  FY_ = Math.round(78 + (684 - 78 - FH) / 2);
  ENEMY_Y = Math.max(42, FY_ - 48);
  BX = FX_ + frame / 2; BY = FY_ + frame / 2;
  CARDX = L.cardX; HUDX = L.hudX; HUDW = L.hudW; COMPACT = L.compact;
  HUDY = 78;
  LAUNCH = { x: BX + COLS * R, y: BY + DEATH_Y + 54 };
}


export default {
  name: 'shoot',

  enter(G) {
    const L = G.level;
    relayout(G.W, G.H, (L.enemies || []).length > 0);
    buildOrbSprites();
    this.t = 0;
    this.score = 0; this.gold = 0;
    this.shotsLeft = L.shots ?? 40;
    this.timeMax = L.time + (G.save.stats.spirit || 0) * 6 + (G.save.breed === 'frost' ? 12 : 0);
    this.timeLeft = this.timeMax;
    this.over = null; this.overT = 0; this.paused = false;
    this.bravo = null; this.bravoGold = 0;
    this.aim = -Math.PI / 2;
    this.praise = ''; this.praiseT = 0;
    this.shownScore = 0; this.warnT = 0;
    this.hitGoal = false; this.goalT = 0;
    this.chain = 0; this.comboMult = 0; this.comboT = 0; this.comboPeak = 0;
    this.bubble = null; this.saidOnce = new Set();

    // ── THIÊN ĐỊCH cũng xuất hiện ở chế độ Bắn Đá ──────────────────────
    this.enemies = (L.enemies || []).map(([kind, tier]) => new Enemy(kind, tier));
    this.maxHp = 300 + (G.save.stats.spirit || 0) * 20 + (G.save.breed === 'frost' ? 40 : 0);
    this.hp = this.maxHp;
    this.hitFlash = 0; this.raidFx = null;
    // cùng công thức ngân sách như màn Ghép Đá để hai chế độ khó ngang nhau
    const killFrac = 0.30 + Math.min(0.32, G.levelIndex * 0.0072);
    const hpBudget = Math.round(96 * (L.shots || 40) * 0.62 * killFrac / 0.30 * 0.30);
    const hpSum = this.enemies.reduce((a, e) => a + e.maxHp, 0) || 1;
    for (const e of this.enemies) {
      e.maxHp = Math.max(120, Math.round(e.maxHp / hpSum * Math.max(240, hpBudget)));
      e.hp = e.maxHp;
    }
    const dps = this.enemies.reduce((a, e) => a + e.dmg / e.every, 0);
    const frac = 0.60 + Math.min(0.85, G.levelIndex * 0.020);
    const budget = (this.maxHp * frac) / 110;
    if (dps > budget) { const k = budget / dps; for (const e of this.enemies) e.dmg = Math.max(3, Math.round(e.dmg * k)); }

    this.pushEvery = L.pushEvery ?? 10;
    this.board = new BubbleBoard({
      cols: COLS, rows: BOARD_ROWS, radius: R, colours: L.shootColours ?? 4,
      startRows: L.startRows ?? 3, deathY: DEATH_Y, maxInFlight: MAX_IN_FLIGHT,
    });
    this.wire(G);

    G.world.setTheme({ sky: L.sky, hill: L.hill, mount: L.mount, biome: L.biome });
    G.hero.onChirp = (x, y, dx, dy) => G.fx.chirp(x, y, dx, dy, 4);

    this.hits = [
      new Hit('pause', G.W - 78, 12, 52, 52, { circle: true, act: () => this.togglePause(G) }),
      new Hit('exit',  G.W - 142, 12, 52, 52, { circle: true, act: () => { G.sfx('button'); G.go('map'); } }),
      new Hit('restart', HUDX + HUDW * .25 - 28, HUDY + 366, 56, 56, { circle: true, act: () => G.startLevel(G.levelIndex) }),
      new Hit('resume', HUDX + HUDW * .68 - 28, HUDY + 366, 56, 56, { circle: true, act: () => this.togglePause(G) }),
      new Hit('swap', LAUNCH.x + 74, LAUNCH.y - 26, 52, 52, { circle: true, act: () => { this.board.swapNext(); G.sfx('select'); } }),
      new Hit('feedShots', HUDX + (PORTRAIT ? 16 : 18), HUDY + (PORTRAIT ? 106 : 318),
        PORTRAIT ? HUDW - 32 : HUDW - 36, PORTRAIT ? 40 : 44,
        { act: () => this.feedShots(G) }),
      new Hit('quit', G.W / 2 - 110, G.H / 2 + 6, 220, 54,
        { act: () => { G.sfx('button'); G.go('map'); }, hidden: true }),
      new Hit('quit', G.W / 2 - 110, G.H / 2 + 6, 220, 54, { act: () => { G.sfx('button'); G.go('map'); }, hidden: true }),
      new Hit('howto', G.W / 2 - 110, G.H / 2 + 78, 220, 54, { act: () => { G.sfx('button'); G.go('help', 'map'); }, hidden: true }),
    ];
    if (PORTRAIT) {
      for (const id of ['restart', 'resume']) this.hits.find(h => h.id === id).hidden = true;
    }
    this.music = G.levelTrack();
    G.music(this.music);
    this.say(G, 'start');
  },

  say(G, trigger, once = true) {
    if (this.over || (once && this.saidOnce.has(trigger))) return;
    const beat = pickBeat(G.act?.id || 'hatch', trigger);
    if (!beat) return;
    this.saidOnce.add(trigger);
    this.bubble = { beat, t: 0, dur: 4.2 };
  },

  wire(G) {
    const b = this.board;
    b.on.bounce = (x, y) => { G.sfx('tick'); G.fx.sparkle(BX + x, BY + y, '#ffffff', 4); };
    b.on.stick  = (x, y) => { G.sfx('swap'); G.fx.ring(BX + x, BY + y, '#ffffff', 6, 34, .22, 4); };
    b.on.pushed = () => { G.sfx('warn'); G.fx.shake(7); };
    b.on.settle = (e) => {
      if (!e.popped) {
        this.chain = 0; this.comboMult = 0; this.comboT = 0;
        this.checkEnd(G); return;
      }
      this.chain++;
      const tier = Math.min(this.chain, COMBO_MULT.length);
      const mult = comboMult(this.chain);
      // Hạ điểm nền gần một nửa: nếu bỏ hệ số combo thì không đủ sức chạm mục
      // tiêu. Phát nổ đầu ×2 xấp xỉ điểm cũ; từ phát liên tiếp thứ hai trở đi
      // người chơi mới thật sự bứt lên.
      const gained = Math.round((e.popped * 38 + e.dropped * 82) * mult);
      this.score += gained;
      // Combo ×21 chỉ nhân ĐIỂM. Vàng và sát thương giữ đường tăng cũ để không
      // phá kinh tế/chỉ số thiên địch của toàn bộ chiến dịch.
      const rewardMult = 1 + (tier - 1) * .35;
      this.gold += Math.round((e.popped * 1.1 + e.dropped * 2.8) * rewardMult);
      this.comboMult = mult; this.comboT = 1.05; this.comboPeak = Math.max(this.comboPeak, mult);
      G.sess.combo = Math.max(G.sess.combo || 0, this.chain);

      const px = BX + (e.x ?? 0), py = BY + (e.y ?? 0);
      const power = .78 + tier * .15;
      for (const p of b.popping)
        G.fx.burst(BX + p.x, BY + p.y, ORB[p.type], 8 + tier * 2, power);
      G.fx.float(px, py + R * .35, '+' + gained,
        { size: 26 + Math.min(e.popped, 8) * 2 + tier * 2, fill: '#fff6c4', stroke: '#6b3a00', max: 1.15 });
      G.fx.float(px, py - R * .35, `×${mult}`,
        { size: 28 + tier * 5, fill: tier >= 5 ? '#fff2a6' : '#ffc3ff', stroke: tier >= 5 ? '#a43100' : '#52106e', vy: -96, max: 1.2 });
      G.fx.ring(px, py, ORB[e.type].lite, 10, 76 + e.popped * 9 + tier * 12, .38 + tier * .035, 6 + tier);
      if (tier >= 2) G.fx.ring(px, py, '#ffffff', R * .4, 92 + tier * 26, .32 + tier * .045, 4 + tier);
      if (tier >= 3) {
        G.fx.beam(px, py, true, Math.min(FW * .48, 170 + tier * 30), ORB[e.type].lite);
        G.fx.beam(px, py, false, Math.min(FH * .34, 130 + tier * 24), '#ffffff');
      }
      if (tier >= 4) {
        G.fx.sparkle(px, py, tier >= 6 ? '#ffe066' : '#fff2ff', 18 + tier * 5);
        G.fx.smoke(px, py + R * .4, 3 + tier, tier >= 6 ? '#ff9a5c' : ORB[e.type].lite);
      }
      // ── đánh vào thiên địch ────────────────────────────────────────
      const foe = this.enemies.find(e => e.alive);
      if (foe) {
        const dealt = foe.damage(Math.round((e.popped * 18 + e.dropped * 30) * rewardMult));
        const fx0 = FX_ + FW * ((this.enemies.indexOf(foe) + .5) / this.enemies.length);
        G.fx.float(fx0, ENEMY_Y - 12, '-' + dealt, { size: 24, fill: '#ffd0d0', stroke: '#5c0010', vy: -60 });
        if (!foe.alive) {
          this.say(G, 'foeDown', false);
          G.sfx('bomb'); G.fx.shake(14);
          G.fx.ring(fx0, ENEMY_Y, '#ffe066', 12, 150, .6, 10);
          this.score += 900; this.gold += 60;
        } else this.say(G, 'foeHit');
      }
      G.sfx('match', tier - 1);
      if (tier >= 2) G.sfx('combo', tier);
      if (tier >= 5) G.sfx('bomb');
      G.fx.shake(4 + tier * 4 + e.popped * .65 + e.dropped * .9);
      if (tier >= 4) G.hero.chirpBurst(.32 + tier * .08);

      if (e.dropped >= 3 || e.popped >= 6) {
        const p = t('praise');
        this.praise = p[clamp((e.dropped >= 6 ? 4 : e.dropped >= 3 ? 3 : 2) - 1, 0, p.length - 1)];
        this.praiseT = 1.2;
        G.hero.react('happy', .9); this.say(G, 'combo');
      }
      if (!this.hitGoal && this.score >= G.level.target) {
        this.hitGoal = true; this.goalT = 1.6;
        this.showFinishNow(G);
        G.sfx('levelup'); G.hero.chirpBurst(.9); G.fx.shake(10); this.say(G, 'goalHit');
      }
      this.checkEnd(G);
    };
  },

  togglePause(G) {
    if (this.over) return;
    this.paused = !this.paused;
    for (const id of ['howto', 'quit']) { const b = this.hits.find(h => h.id === id); if (b) b.hidden = !this.paused; }
    G.sfx('button');
    G.audio.setMusicVol(this.paused ? G.musicVol * .3 : G.musicVol);
  },

  /** Bày nút QUA MÀN NGAY khi đã đủ điểm. */
  showFinishNow(G) {
    if (this.hits.some(h => h.id === 'finishNow')) return;
    const feed = this.hits.find(h => h.id === 'feedShots');
    if (PORTRAIT && feed) feed.w = (HUDW - 42) / 2;
    this.hits.push(new Hit('finishNow', PORTRAIT ? HUDX + 26 + (HUDW - 42) / 2 : HUDX + 16,
      HUDY + (PORTRAIT ? 106 : 518), PORTRAIT ? (HUDW - 42) / 2 : HUDW - 32, PORTRAIT ? 40 : 52,
      { act: () => this.startBravo(G, t('outOfShots')) }));
  },

  /** Đổi một phần thức ăn lấy thêm đá, ngay trong trận. */
  feedShots(G) {
    if (this.over || this.paused || this.bravo) return false;
    if ((G.save.food || 0) <= 0) {
      G.sfx('invalid');
      G.fx.float(HUDX + HUDW / 2, HUDY + 92, t('foodEmpty'),
        { size: 20, fill: '#ff9aa8', stroke: '#5c0010', max: 1.1 });
      return false;
    }
    G.save.food--;
    this.shotsLeft += FOOD_SHOTS;
    G.persist();
    G.sfx('levelup'); G.hero.react('eat', 1.2);
    G.fx.float(HUDX + HUDW / 2, HUDY + 92, t('shotsAdded', { n: FOOD_SHOTS }),
      { size: 24, fill: '#8ef08a', stroke: '#17451c', max: 1.25 });
    G.fx.sparkle(HUDX + HUDW / 2, HUDY + 116, '#8ef08a', 12);
    return true;
  },

  /**
   * MÀN BRAVO — lưới bắn không có đá đặc biệt nên chỉ hai nhịp: phát bắn thừa
   * và giờ thừa đổi ra vàng. Dùng chung nhãn với màn Ghép Đá cho nhất quán.
   */
  startBravo(G, why) {
    if (this.over || this.bravo) return;
    this.hits = this.hits.filter(h => h.id === 'pause');
    this.bravo = {
      why, t: 0, next: .35, stage: 1,
      shots: Math.max(0, this.shotsLeft), time: Math.max(0, Math.floor(this.timeLeft)),
      perShot: 9 + Math.round((G.level.index || 1) * .35), perSec: 2, gained: 0,
    };
    G.sfx('levelup');
  },

  tickBravo(G, dt) {
    const b = this.bravo;
    b.t += dt;
    this.board.update(dt, this);
    if (b.t < b.next) return;
    const pay = (n, col) => {
      this.gold += n; b.gained += n;
      G.fx.float(FX_ + FW / 2, FY_ + FH * .30, `+${n}`, { size: 30, fill: col, stroke: '#4a2d00' });
      G.sfx('coin');
    };
    if (b.stage === 1) {
      if (b.shots > 0) {
        const take = Math.max(1, Math.ceil(b.shots / 6));
        b.shots -= take; this.shotsLeft = b.shots;
        pay(take * b.perShot, '#ffe066'); b.next = b.t + .13;
      } else { b.stage = 2; b.next = b.t + .30; }
      return;
    }
    if (b.stage === 2) {
      if (b.time > 0) {
        const take = Math.max(1, Math.ceil(b.time / 8));
        b.time -= take; this.timeLeft = b.time;
        pay(take * b.perSec, '#8ef08a'); b.next = b.t + .10;
      } else { b.stage = 3; b.next = b.t + .55; }
      return;
    }
    this.bravoGold = b.gained;
    this.bravo = null;
    this.finish(G, true, b.why);
  },

  drawBravo(G, ctx) {
    const b = this.bravo;
    const lbl = b.stage === 1 ? t('bravoShots') : b.stage === 2 ? t('bravoTime') : t('bravoDone');
    const k = ease.outBack(clamp(b.t / .3, 0, 1));
    ctx.save();
    ctx.translate(FX_ + FW / 2, FY_ + 58); ctx.scale(k, k);
    ctx.font = FONT.disp(26);
    const w = ctx.measureText(lbl).width + 56;
    roundRect(ctx, -w / 2, -26, w, 52, 26);
    ctx.fillStyle = 'rgba(12,7,26,.88)'; ctx.fill();
    ctx.strokeStyle = 'rgba(255,214,110,.85)'; ctx.lineWidth = 2.5; ctx.stroke();
    strokeText(ctx, lbl, 0, 0, { font: FONT.disp(26), fill: '#ffe066', stroke: '#3a2000', lw: 5, baseline: 'middle' });
    if (b.gained > 0) strokeText(ctx, `+${b.gained} ${t('gold')}`, 0, 44,
      { font: FONT.disp(22), fill: '#fff', stroke: '#4a2d00', lw: 5, baseline: 'middle' });
    ctx.restore();
  },

  checkEnd(G) {
    if (this.over || this.bravo) return;
    if (this.hp <= 0) return this.finish(G, false, t('foeKilled'));
    if (this.board.isClear) return this.finish(G, true);                      // dọn sạch = thắng luôn
    if (this.board.lowestY >= DEATH_Y) return this.finish(G, false, t('breached'));
    const won = this.score >= G.level.target;
    if (this.timeLeft <= 0) return won ? this.startBravo(G, t('outOfTime')) : this.finish(G, false, t('outOfTime'));
    // Còn thức ăn thì giữ trận mở để người chơi chủ động đổi lấy thêm lượt.
    if (this.shotsLeft <= 0 && !this.board.shot && (G.save.food || 0) <= 0)
      return won ? this.startBravo(G, t('outOfShots')) : this.finish(G, false, t('outOfShots'));
  },

  finish(G, win, why = '') {
    this.over = { win, why }; this.overT = 0;
    const L = G.level, S = G.save;
    if (win) {
      if (this.board.isClear) this.score += 1500 + this.shotsLeft * 90;       // thưởng dọn sạch
      const ratio = this.score / L.target;
      this.starsEarned = ratio >= L.star[2] ? 3 : ratio >= L.star[1] ? 2 : 1;
      this.foesSurvived = this.foesLeft;
      if (this.foesSurvived > 0) { this.starsEarned = 1; this.gold = Math.round(this.gold * 0.75); }
      this.xpGain = 200 + this.starsEarned * 150;
      S.stars[L.id] = Math.max(S.stars[L.id] || 0, this.starsEarned);
      S.best[L.id] = Math.max(S.best[L.id] || 0, this.score);
      S.gold += this.gold; S.xp += this.xpGain;
      if (Math.random() < .35) S.food += 1;
      this.matsGot = addMats(S, rollMats(2 + this.starsEarned, G.levelIndex));   // nguyên liệu chế tạo
      if (G.levelIndex + 1 >= S.unlocked) S.unlocked = Math.min(G.levelIndex + 2, G.totalLevels);
      G.hero.xp = S.xp; G.persist();
      G.sfx('win'); G.hero.react('happy', 2.4); G.fx.shake(10); G.music('nest'); this.say(G, 'win');
    } else {
      this.starsEarned = 0;
      this.penaltyGold = Math.round(S.gold * 0.15);
      this.penaltyXp = Math.min(S.xp, 120);
      S.gold = Math.max(0, S.gold - this.penaltyGold);
      S.xp = Math.max(0, S.xp - this.penaltyXp);
      G.hero.xp = S.xp; G.persist();
      G.spendFed(G.FED_LOSE);            // thua cũng mất sức → thử lại có giá
      G.sfx('lose'); G.hero.react('hurt', 2); G.fx.shake(16); this.say(G, 'lose');
    }

    this.hits = this.hits.filter(h => h.id === 'pause');
    const y = G.portrait ? G.H / 2 + 210 : 470;
    if (win) {
      this.hits.push(new Hit('next',  G.W / 2 - 256, y, 160, 62, { act: () => G.goNextLevel(G.levelIndex) }));
      this.hits.push(new Hit('again', G.W / 2 -  80, y, 160, 62, { act: () => G.startLevel(G.levelIndex, true) }));
      this.hits.push(new Hit('map',   G.W / 2 +  96, y, 160, 62, { act: () => G.go('map') }));
    } else {
      this.hits.push(new Hit('retry', G.W / 2 - 210, y, 190, 62, { act: () => G.startLevel(G.levelIndex) }));
      this.hits.push(new Hit('map', G.W / 2 + 20, y, 190, 62, { act: () => G.go('map') }));
    }
  },

  update(G, dt) {
    this.t += dt;
    G.world.update(dt, Math.sin(this.t * .2) * 18);
    G.hero.update(dt);
    this.shownScore = lerp(this.shownScore, this.score, 1 - Math.pow(.001, dt));
    if (this.praiseT > 0) this.praiseT -= dt;
    if (this.comboT > 0) this.comboT -= dt;
    if (this.bubble) { this.bubble.t += dt; if (this.bubble.t >= this.bubble.dur) this.bubble = null; }
    if (this.goalT > 0) this.goalT -= dt;
    if (this.raidFx) { this.raidFx.t += dt; if (this.raidFx.t >= this.raidFx.dur) this.raidFx = null; }
    if (this.over) { this.overT += dt; this.board.update(dt); return; }
    if (this.bravo) { this.tickBravo(G, dt); return; }
    if (this.paused) return;

    this.board.update(dt);
    this.updateEnemies(G, dt);
    if (this.hitFlash > 0) this.hitFlash -= dt;

    this.timeLeft = Math.max(0, this.timeLeft - dt);
    this.updateMusic(G);
    if (this.timeLeft <= 25) this.say(G, 'lowTime');
    if (this.timeLeft <= 15) {
      this.warnT -= dt;
      if (this.warnT <= 0) { this.warnT = this.timeLeft <= 5 ? .45 : .9; G.sfx('tick'); }
    }
    if (this.timeLeft <= 0) { this.checkEnd(G); return; }
    if (this.board.lowestY >= DEATH_Y) this.checkEnd(G);
  },

  get foesLeft() { return this.enemies.filter(e => e.alive).length; },

  /** Đòn của địch — bản Bắn Đá: cắn · cướp vàng · đẩy trần xuống · hút giờ. */
  updateEnemies(G, dt) {
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      const ev = e.update(dt);
      if (ev === 'windup') G.sfx('warn');
      if (ev !== 'strike') continue;
      this.raidFx = { enemy: e, index: i, t: 0, dur: .92, kind: e.def.atk };
      let dmg = e.dmg, note = '';
      switch (e.def.atk) {
        case ATK.ROB: {
          dmg = Math.round(e.dmg * .55);
          const steal = Math.min(this.gold, 40 + e.dmg * 3);
          this.gold -= steal; this.score = Math.max(0, this.score - 300);
          note = t('foeRob', { n: steal }); this.say(G, 'robbed');
          break;
        }
        case ATK.WEB:                              // nhện đẩy thêm một hàng đá xuống
          dmg = Math.round(e.dmg * .45);
          // chỉ đẩy khi đá còn cách vạch tử thần một quãng an toàn
          if (this.board.lowestY < DEATH_Y - R * 5) { this.board.pushRow(); note = t('foePush'); }
          else note = t('foeBite');
          break;
        case ATK.DRAIN:
          dmg = Math.round(e.dmg * .45);
          this.timeLeft = Math.max(0, this.timeLeft - 4);
          note = t('foeDrain');
          break;
        case ATK.SWARM: note = t('foeSwarm'); break;
        default: note = t('foeBite');
      }
      this.hp = Math.max(0, this.hp - dmg);
      this.hitFlash = .45;
      G.sfx('invalid'); G.fx.shake(11); G.hero.react('hurt', .8);
      G.fx.float(FX_ + FW / 2, FY_ + FH * .5, note, { size: 26, fill: '#ff9aa8', stroke: '#5c0010', max: 1.3 });
      if (this.hp <= 0) { this.finish(G, false, t('foeKilled')); return; }
    }
  },

  /** Nhạc đổi theo tình huống: 25 giây → gấp rút · 10 giây cuối → sát giờ. */
  updateMusic(G) {
    if (this.over || this.paused) return;
    const want = this.timeLeft <= 10 ? 'panic' : this.timeLeft <= 25 ? 'chase' : this.music;
    if (want !== this._nowPlaying) { this._nowPlaying = want; G.music(want); }
  },

  // ── ngắm & bắn ────────────────────────────────────────────────────────────
  _aimAt(x, y) {
    const dx = x - LAUNCH.x, dy = y - LAUNCH.y;
    let a = Math.atan2(dy, dx);
    const LIM = 0.20;                                   // không cho bắn ngang/xuống
    if (a > -LIM) a = -LIM;
    if (a < -Math.PI + LIM) a = -Math.PI + LIM;
    this.aim = a;
  },
  /** Rê chuột/kéo tay là mũi tên ngắm bám theo ngay — không cần giữ nút. */
  hover(G, x, y) { if (!this.over && !this.paused && this.board.canFire) this._aimAt(x, y); },
  down(G, x, y) { if (!this.over && !this.paused) this._aimAt(x, y); },
  move(G, x, y) { if (!this.over && !this.paused) this._aimAt(x, y); },
  /**
   * Bắn theo GÓC cho trước. Tách riêng khỏi `up()` để công cụ đo cân bằng
   * (dev/balance-shoot.mjs) gọi trực tiếp được mà không phải giả lập toạ độ chuột.
   */
  fireAt(G, ang) {
    if (this.over || this.paused || !this.board.canFire || this.shotsLeft <= 0) return false;
    this.aim = ang;
    if (!this.board.fire(LAUNCH.x - BX, LAUNCH.y - BY, this.aim)) return false;
    this.shotsLeft--;
    G.sfx('blast');
    G.hero.react('happy', .35);
    // Trần chỉ tụt khi bàn còn đủ đá — bàn gần trống mà đẩy thêm là ức chế vô lý
    if (this.board.shots % this.pushEvery === 0 && this.board.lowestY < DEATH_Y - R * 3)
      this.board.pushRow();
    return true;
  },

  up(G, x, y) {
    if (this.over || this.paused) return;
    this._aimAt(x, y);
    this.fireAt(G, this.aim);
  },
  key(G, e) { if (e.key === 'Escape' || e.key === 'p') this.togglePause(G); if (e.key === ' ') this.board.swapNext(); },

  // ── vẽ ────────────────────────────────────────────────────────────────────
  draw(G, ctx) {
    const { W, H } = G, L = G.level, S = G.save;
    G.world.draw(ctx);
    ctx.fillStyle = 'rgba(16,9,34,.20)'; ctx.fillRect(...bleed(G));

    if (!COMPACT) this.drawHeroCard(G, ctx);
    else if (!PORTRAIT) this.drawCompactHero(G, ctx);

    this.drawEnemies(G, ctx);

    glassPanel(ctx, FX_, FY_, FW, FH, 22,
      { top: 'rgba(12,7,26,.94)', bot: 'rgba(6,3,16,.96)', rim: 'rgba(150,120,255,.5)' });

    ctx.save();
    roundRect(ctx, FX_ + 8, FY_ + 8, FW - 16, FH - 16, 16); ctx.clip();

    // ── LÒNG HANG ─────────────────────────────────────────────────────
    // Nền phẳng đen thui làm bàn cờ trông như cái hố. Thêm chuyển sáng từ
    // trần xuống, vệt sáng rọi từ trên, và tối dần bốn góc → ra chiều sâu.
    const cave = ctx.createLinearGradient(0, FY_, 0, FY_ + FH);
    cave.addColorStop(0, '#2a1d4e'); cave.addColorStop(.45, '#150c2c'); cave.addColorStop(1, '#0a0518');
    ctx.fillStyle = cave; ctx.fillRect(FX_, FY_, FW, FH);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const beam = ctx.createRadialGradient(FX_ + FW / 2, FY_ - FH * .1, FW * .06, FX_ + FW / 2, FY_ + FH * .3, FW * .78);
    beam.addColorStop(0, 'rgba(150,120,255,.20)'); beam.addColorStop(1, 'rgba(150,120,255,0)');
    ctx.fillStyle = beam; ctx.fillRect(FX_, FY_, FW, FH);
    ctx.restore();
    const vig = ctx.createRadialGradient(FX_ + FW / 2, FY_ + FH * .45, FH * .22,
                                         FX_ + FW / 2, FY_ + FH * .45, FH * .78);
    vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(0,0,0,.55)');
    ctx.fillStyle = vig; ctx.fillRect(FX_, FY_, FW, FH);

    // thanh trần — chỗ đá bám vào, cho biết trần ở đâu
    const rail = ctx.createLinearGradient(0, FY_ + 8, 0, FY_ + 26);
    rail.addColorStop(0, 'rgba(190,165,255,.55)'); rail.addColorStop(1, 'rgba(190,165,255,0)');
    ctx.fillStyle = rail; ctx.fillRect(FX_ + 8, FY_ + 8, FW - 16, 18);

    // ── DẢI TỬ THẦN ───────────────────────────────────────────────────
    // Càng gần vạch thì càng đỏ và càng đập nhanh — cảnh báo phải cảm được
    // trước khi đọc chữ.
    const dy = BY + DEATH_Y;
    const near = clamp((this.board.lowestY - (DEATH_Y - R * 6)) / (R * 6), 0, 1);
    const beat = .35 + .4 * Math.sin(this.t * (3 + near * 7)) + near * .25;
    ctx.save();
    const dg = ctx.createLinearGradient(0, dy - 46, 0, dy);
    dg.addColorStop(0, 'rgba(255,60,90,0)');
    dg.addColorStop(1, `rgba(255,60,90,${.12 + near * .26})`);
    ctx.fillStyle = dg; ctx.fillRect(FX_ + 8, dy - 46, FW - 16, 46);
    ctx.strokeStyle = `rgba(255,90,110,${clamp(beat, 0, 1)})`;
    ctx.lineWidth = 3; ctx.setLineDash([12, 9]); ctx.lineDashOffset = -this.t * 30;
    ctx.beginPath(); ctx.moveTo(FX_ + 12, dy); ctx.lineTo(FX_ + FW - 12, dy); ctx.stroke();
    ctx.setLineDash([]);
    // mũi nhọn cảnh báo hai đầu vạch
    ctx.fillStyle = `rgba(255,90,110,${clamp(beat, 0, 1)})`;
    for (const sx of [FX_ + 14, FX_ + FW - 14]) {
      ctx.beginPath();
      ctx.moveTo(sx, dy - 9); ctx.lineTo(sx + (sx < FX_ + FW / 2 ? 13 : -13), dy); ctx.lineTo(sx, dy + 9);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();

    this.board.draw(ctx, BX, BY);
    this.drawAim(ctx);
    ctx.restore();

    this.drawLauncher(G, ctx);
    this.drawCompactHUD(G, ctx);

    const st = stageFor(S.xp);
    const nx = STAGES.find(v => v.xp > S.xp);
    const prog = nx ? (S.xp - st.xp) / (nx.xp - st.xp) : 1;
    starBar(ctx, 24, H - 56, W - 48, 34, prog, { t: this.t, label: `${tx(st, 'name')}  ·  ${S.xp} EXP` });

    strokeText(ctx, `${t('level')} ${L.index} · ${t('modeShoot')}`, 30, 22,
      { font: FONT.disp(22), fill: '#fff', stroke: '#2b1740', lw: 5, align: 'left', baseline: 'middle' });

    if (this.bravo) this.drawBravo(G, ctx);
    G.fx.draw(ctx);
    this.drawComboBurst(ctx);
    if (this.raidFx) this.drawPredatorRaid(G, ctx);
    if (this.praiseT > 0 && this.comboT <= 0) {
      const k = 1 - this.praiseT / 1.2;
      ctx.save();
      ctx.translate(FX_ + FW / 2, FY_ + FH * .34);
      const s = ease.outBack(clamp(k / .25, 0, 1));
      ctx.scale(s, s); ctx.globalAlpha = clamp((1 - k) * 2.2, 0, 1);
      ctx.font = FONT.disp(52);
      const tw = ctx.measureText(this.praise).width;
      const bg = ctx.createLinearGradient(-tw / 2 - 30, 0, tw / 2 + 30, 0);
      bg.addColorStop(0, 'rgba(24,10,40,0)'); bg.addColorStop(.5, 'rgba(24,10,40,.82)'); bg.addColorStop(1, 'rgba(24,10,40,0)');
      ctx.fillStyle = bg; ctx.fillRect(-tw / 2 - 60, -38, tw + 120, 76);
      strokeText(ctx, this.praise, 0, 0, { font: FONT.disp(52), fill: '#ffe066', stroke: '#6b1a00', lw: 11, baseline: 'middle' });
      ctx.restore();
    }
    if (this.goalT > 0) {
      ctx.save(); ctx.globalAlpha = clamp(this.goalT / 1.6, 0, 1);
      strokeText(ctx, t('goalHit'), FX_ + FW / 2, FY_ + 46,
        { font: FONT.disp(38), fill: '#8ef08a', stroke: '#0d3a16', lw: 9, baseline: 'middle' });
      ctx.restore();
    }

    // Portrait đặt thoại lên HUD phụ trong vài giây. Khung bắn nay kéo sát HUD,
    // nên để thoại ở mép dưới bàn sẽ che đúng bệ phóng và nút đổi bóng.
    if (this.bubble) drawBubble(ctx, this.bubble,
      PORTRAIT ? HUDX + 8 : COMPACT ? FX_ + 20 : CARDX,
      PORTRAIT ? HUDW - 16 : COMPACT ? FW - 40 : 340,
      PORTRAIT ? HUDY + 8 : COMPACT ? FY_ + FH - 104 : 536);
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
    if (this.paused) this.drawPause(G, ctx);
    if (this.over) this.drawOver(G, ctx);
  },

  /**
   * Hệ số combo nổi giữa chiến trường trong đúng một nhịp. Cấp càng cao càng
   * to, sáng và nảy mạnh; HUD bên dưới vẫn giữ hệ số sau khi chữ lớn tan đi.
   */
  drawComboBurst(ctx) {
    if (this.comboT <= 0 || !this.comboMult) return;
    const tier = Math.min(this.chain, COMBO_MULT.length);
    const age = 1 - clamp(this.comboT / 1.05, 0, 1);
    const appear = ease.outBack(clamp(age / .18, 0, 1));
    const alpha = this.comboT < .28 ? this.comboT / .28 : 1;
    const cx = FX_ + FW / 2, cy = FY_ + Math.min(FH * .40, 340);
    const glowR = 82 + tier * 18;

    ctx.save(); ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = 'lighter';
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
    glow.addColorStop(0, tier >= 5 ? 'rgba(255,224,90,.34)' : 'rgba(255,140,255,.27)');
    glow.addColorStop(.55, tier >= 5 ? 'rgba(255,90,45,.13)' : 'rgba(150,90,255,.12)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(cx, cy, glowR, 0, TAU); ctx.fill();
    ctx.restore();

    ctx.save(); ctx.globalAlpha = alpha;
    ctx.translate(cx, cy);
    const pulse = 1 + Math.sin(age * Math.PI * 3) * .035 * tier;
    ctx.scale(appear * pulse, appear * pulse);
    const title = this.praiseT > 0 && this.praise ? this.praise : t('combo');
    strokeText(ctx, String(title).toUpperCase(), 0, -39 - tier,
      { font: FONT.disp(20 + tier * 1.4), fill: '#ffffff', stroke: '#391052', lw: 6, baseline: 'middle' });
    strokeText(ctx, `×${this.comboMult}`, 0, 10,
      { font: FONT.disp(58 + tier * 6), fill: tier >= 5 ? '#ffe066' : '#ffc8ff',
        stroke: tier >= 5 ? '#9c2600' : '#55106f', lw: 11 + tier, baseline: 'middle' });
    if (tier < COMBO_MULT.length)
      strokeText(ctx, `› ×${COMBO_MULT[tier]}`, 0, 62 + tier * 2,
        { font: FONT.ui(15, 800), fill: '#fff', stroke: '#391052', lw: 4, baseline: 'middle' });
    ctx.restore();
  },

  comboHudLabel() {
    return this.comboMult ? `${t('combo')}  ×${this.comboMult}` : '×2 › 3 › 5 › 8 › 13 › 21';
  },

  /** Đường ngắm chấm chấm, có tính một lần nảy tường. */
  drawAim(ctx) {
    if (!this.board.canFire || this.over) return;
    let x = LAUNCH.x, y = LAUNCH.y;
    let vx = Math.cos(this.aim), vy = Math.sin(this.aim);
    const L = BX, Rr = BX + this.board.W;
    // Đường ngắm ăn theo MÀU VIÊN ĐANG BẮN — liếc một cái là biết mình sắp
    // bắn màu gì mà không phải nhìn xuống ống phóng.
    const cur = ORB[this.board.next?.[0] ?? 0] || ORB[0];   // next = [đang bắn, kế tiếp]
    ctx.save();
    ctx.setLineDash([7, 9]); ctx.lineDashOffset = -this.t * 46;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y);
    let bounces = 0, guard = 0;
    while (guard++ < 400) {
      x += vx * 8; y += vy * 8;
      if (x < L + R) { x = L + R; vx = -vx; if (++bounces > 1) break; }
      if (x > Rr - R) { x = Rr - R; vx = -vx; if (++bounces > 1) break; }
      if (y < BY + R) break;
      let hit = false;
      for (let r = 0; r < this.board.rows && !hit; r++)
        for (let c = 0; c < this.board.rowCols(r); c++) {
          if (!this.board.get(r, c)) continue;
          const ddx = x - (BX + this.board.cx(r, c)), ddy = y - (BY + this.board.cy(r));
          if (ddx * ddx + ddy * ddy < (R * 1.9) ** 2) { hit = true; break; }
        }
      ctx.lineTo(x, y);
      if (hit) break;
    }
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = rgba(cur.base, .55); ctx.lineWidth = 9; ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = rgba(cur.lite, .85); ctx.lineWidth = 3; ctx.stroke();
    ctx.setLineDash([]);
    // đích ngắm: vòng nhịp + chữ thập nhỏ
    ctx.save();
    const pl = .5 + .5 * Math.sin(this.t * 6);
    ctx.strokeStyle = rgba(cur.lite, .5 + .4 * pl); ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(x, y, R * (.62 + .12 * pl), 0, TAU); ctx.stroke();
    ctx.lineWidth = 2;
    for (const [dx2, dy2] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      ctx.beginPath();
      ctx.moveTo(x + dx2 * R * .34, y + dy2 * R * .34);
      ctx.lineTo(x + dx2 * R * .52, y + dy2 * R * .52); ctx.stroke();
    }
    ctx.restore();
    ctx.globalAlpha = .8;
    ctx.beginPath(); ctx.arc(x, y, R * .5, 0, TAU);
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.restore();
  },

  drawLauncher(G, ctx) {
    const D = R * 2;
    ctx.save();
    // bệ phóng: gốc cây khắc
    ctx.translate(LAUNCH.x, LAUNCH.y);
    ctx.save();
    ctx.rotate(this.aim + Math.PI / 2);
    ctx.fillStyle = '#7a5230';
    roundRect(ctx, -14, -6, 28, 46, 8); ctx.fill();
    ctx.strokeStyle = '#3f2a15'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = 'rgba(255,225,180,.22)';
    roundRect(ctx, -9, -2, 8, 38, 4); ctx.fill();
    ctx.restore();
    ctx.beginPath(); ctx.arc(0, 0, 30, 0, TAU);
    const g = ctx.createLinearGradient(0, -30, 0, 30);
    g.addColorStop(0, '#a9762f'); g.addColorStop(1, '#5d3c14');
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = '#3f2a15'; ctx.lineWidth = 4; ctx.stroke();
    ctx.restore();

    drawOrb(ctx, this.board.next[0], LAUNCH.x, LAUNCH.y, D, 1, 1);
    // viên kế tiếp + nút đổi
    const sw = this.hits.find(h => h.id === 'swap');
    if (sw) {
      ctx.save(); ctx.globalAlpha = .9;
      drawOrb(ctx, this.board.next[1], sw.x + 26, sw.y + 26, D * .78, 1, 1);
      ctx.restore();
      ctx.save();
      ctx.strokeStyle = `rgba(255,235,140,${.5 + .3 * Math.sin(this.t * 4)})`;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(sw.x + 26, sw.y + 26, 27, 0, TAU); ctx.stroke();
      ctx.restore();
    }
  },

  /** Hàng thiên địch phía trên khung — dùng chung cách trình bày với màn Ghép Đá. */
  drawPredatorRaid(G, ctx) {
    const f = this.raidFx, n = this.enemies.length;
    if (!f || !n) return;
    const sx = FX_ + FW * ((f.index + .5) / n), sy = ENEMY_Y - 4;
    const compact = COMPACT && !PORTRAIT ? this.compactHeroBox(G) : null;
    const tx0 = PORTRAIT ? FX_ + FW / 2 : compact ? compact.x + compact.w / 2 : CARDX + 134;
    const ty0 = PORTRAIT ? FY_ + FH - 30 : compact ? compact.y + compact.h * .58 : 122 + 214;
    drawEnemyRaid(ctx, f, sx, sy, tx0, ty0);
  },

  /** Hàng thiên địch phía trên khung — dùng chung cách trình bày với màn Ghép Đá. */
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
      if (e.wind && !e.dead) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const pp = .4 + .4 * Math.sin(this.t * 20);
        const g = ctx.createRadialGradient(cx, ENEMY_Y, 4, cx, ENEMY_Y, 62);
        g.addColorStop(0, `rgba(255,70,90,${pp * .55})`); g.addColorStop(1, 'rgba(255,70,90,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, ENEMY_Y, 62, 0, TAU); ctx.fill();
        ctx.restore();
      }
      e.draw(ctx, cx, ENEMY_Y - 4, 58);
      if (e.dead) continue;
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

  // vẫn thấy được cảnh phía sau — thay cho khung trắng bo góc phẳng lì cũ.
  drawHeroCard(G, ctx) {
    const x = CARDX, y = 122, w = 250, h = 400, R = 26;
    const T = this.t;
    ctx.save();
    ctx.shadowColor = 'rgba(20,10,40,.55)'; ctx.shadowBlur = 26; ctx.shadowOffsetY = 10;
    roundRect(ctx, x, y, w, h, R); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.shadowColor = 'transparent';

    ctx.save(); roundRect(ctx, x + 5, y + 5, w - 10, h - 10, R - 6); ctx.clip();
    heroCardScene(ctx, x, y, w, h, this.t || 0);

// bóng đổ dưới chân cho con dế có chỗ đứng
    ctx.save(); ctx.globalAlpha = .22; ctx.fillStyle = '#2c3a1c';
    ctx.beginPath(); ctx.ellipse(x + w * .54, y + h * .66, w * .30, h * .033, 0, 0, TAU); ctx.fill();
    ctx.restore();
    // Nhích lên .52: để .60 thì chân dế thò xuống dưới tấm kính mờ, bị che mất.
    G.hero.draw(ctx, x + w * .54, y + h * .52, heroFit(w, stageFor(G.save.xp).scale), 1);

    // ── TẤM KÍNH MỜ ở đáy ───────────────────────────────────────────────
    const px = x + 12, pw = w - 24, ph = 92, py = y + h - ph - 12;
    frostCard(ctx, px, py, pw, ph, 18);
    ctx.restore();

    const breed = BREEDS.find(b => b.id === G.save.breed) || BREEDS[0];
    const st = stageFor(G.save.xp);
    strokeText(ctx, tx(breed, 'name'), x + w / 2, py + 24,
      { font: FONT.disp(25), fill: '#fff', stroke: '#2b4a6b', lw: 6, baseline: 'middle' });
    strokeText(ctx, tx(st, 'name'), x + w / 2, py + 48,
      { font: FONT.ui(13, 800), fill: '#12324e', stroke: null, lw: 0, baseline: 'middle', shadow: null });
    // thanh sinh lực nhỏ trên kính
    const bx = px + 16, bw = pw - 32, by = py + 64;
    roundRect(ctx, bx, by, bw, 12, 6);
    ctx.fillStyle = 'rgba(20,30,50,.35)'; ctx.fill();
    ctx.save(); roundRect(ctx, bx + 1.5, by + 1.5, bw - 3, 9, 4.5); ctx.clip();
    const hv = clamp(this.hp / this.maxHp, 0, 1);
    const hg = ctx.createLinearGradient(bx, 0, bx + bw, 0);
    hg.addColorStop(0, '#ff5f7a'); hg.addColorStop(1, '#ff9aa8');
    ctx.fillStyle = hg; ctx.fillRect(bx + 1.5, by + 1.5, (bw - 3) * hv, 9);
    ctx.restore();
    roundRect(ctx, bx, by, bw, 12, 6);
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.4; ctx.stroke();

    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 3;
    roundRect(ctx, x + 5, y + 5, w - 10, h - 10, R - 6); ctx.stroke();
    ctx.restore();
  },

  /** Thẻ dế co giãn lấp khoảng trống bên trái ở bố cục hẹp. */
  compactHeroBox(G) {
    if (PORTRAIT) return FY_ < 200 ? { x: 18, y: 72, w: 112, h: 76 } : { x: 18, y: 72, w: 126, h: 124 };
    const w = clamp(FX_ - 48, 88, 200), h = clamp(w * 1.62, 176, 324);
    return { x: Math.max(14, (FX_ - w) / 2), y: FY_ + (FH - h) / 2, w, h };
  },

  drawCompactHero(G, ctx) {
    const b = this.compactHeroBox(G), st = stageFor(G.save.xp);
    ctx.save();
    ctx.shadowColor = 'rgba(20,10,40,.45)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 8;
    glassPanel(ctx, b.x, b.y, b.w, b.h, 22,
      { top: 'rgba(207,241,193,.90)', bot: 'rgba(66,104,60,.94)', rim: 'rgba(255,255,255,.78)' });
    ctx.shadowColor = 'transparent';
    ctx.save(); roundRect(ctx, b.x + 5, b.y + 5, b.w - 10, b.h - 10, 17); ctx.clip();
    heroCardScene(ctx, b.x, b.y, b.w, b.h, this.t || 0);
    ctx.fillStyle = 'rgba(35,48,24,.23)'; ctx.beginPath(); ctx.ellipse(b.x + b.w / 2, b.y + b.h * .72, b.w * .30, 8, 0, 0, TAU); ctx.fill();
    G.hero.draw(ctx, b.x + b.w / 2, b.y + b.h * .60, heroFit(b.w, st.scale, 72), 1);
    const fade = ctx.createLinearGradient(0, b.y + b.h * .66, 0, b.y + b.h);
    fade.addColorStop(0, 'rgba(18,13,30,0)'); fade.addColorStop(1, 'rgba(18,13,30,.76)');
    ctx.fillStyle = fade; ctx.fillRect(b.x, b.y + b.h * .62, b.w, b.h * .38);
    ctx.restore();
    strokeText(ctx, tx(st, 'name'), b.x + b.w / 2, b.y + b.h - 34,
      { font: FONT.ui(Math.max(10, Math.min(13, b.w / 12)), 800), fill: '#fff', stroke: '#253a1d', lw: 3, baseline: 'middle' });
    const hp = clamp(this.hp / this.maxHp, 0, 1), bx = b.x + 14, by = b.y + b.h - 18, bw = b.w - 28;
    roundRect(ctx, bx, by, bw, 9, 4.5); ctx.fillStyle = 'rgba(15,8,24,.7)'; ctx.fill();
    ctx.save(); roundRect(ctx, bx + 1, by + 1, bw - 2, 7, 3.5); ctx.clip(); ctx.fillStyle = '#ff7188'; ctx.fillRect(bx + 1, by + 1, (bw - 2) * hp, 7); ctx.restore();
    ctx.restore();
  },

  drawCompactHUD(G, ctx) {
    if (PORTRAIT) { this.drawMobileHUD(G, ctx); return; }
    const L = G.level, x = HUDX, y = HUDY, w = HUDW;
    const short = PORTRAIT && G.H < 1250, h = short ? 300 : 438;
    card(ctx, x, y, w, h, 24);
    strokeText(ctx, t('score'), x + w / 2, y + 27,
      { font: FONT.disp(27), fill: '#ffa63d', stroke: '#8c3d00', lw: 6, baseline: 'middle' });
    strokeText(ctx, Math.round(this.shownScore).toLocaleString(), x + w / 2, y + 63,
      { font: FONT.disp(34), fill: '#2b1740', stroke: null, lw: 0, baseline: 'middle', shadow: null });

    const st3 = L.star[2], starsNow = this.score >= L.target * L.star[2] ? 3
      : this.score >= L.target * L.star[1] ? 2 : this.score >= L.target ? 1 : 0;
    const sbx = x + 18, sby = y + 89, sbw = w - 36, sbh = 42;
    statBar(ctx, sbx, sby, sbw, sbh, this.score / (L.target * st3), (c, s) => icon.crown(c, s),
      { label: this.comboHudLabel(), fillA: this.comboMult >= 13 ? '#ff7a55' : C.barA, fillB: this.comboMult >= 13 ? '#ff3157' : C.barB });
    const trackX = sbx + sbh - 4, trackW = sbw - sbh + 4;
    L.star.forEach((mul, i) => {
      const px = trackX + trackW * (mul / st3) - (i === 2 ? 10 : 0), on = starsNow > i;
      ctx.save(); ctx.translate(px, sby + sbh / 2); ctx.globalAlpha = on ? 1 : .42;
      on ? icon.star(ctx, 23 + Math.sin(this.t * 5 + i) * 1.2) : icon.starEmpty(ctx, 19); ctx.restore();
    });

    const gap = 8, mw = (w - 36 - gap) / 2, mh = 46;
    const metric = (mx, my, value, label, drawIcon, progress, colours, urgent = false) => {
      ctx.save();
      roundRect(ctx, mx, my + 3, mw, mh, 15); ctx.fillStyle = 'rgba(52,92,130,.24)'; ctx.fill();
      roundRect(ctx, mx, my, mw, mh, 15);
      const mg = ctx.createLinearGradient(0, my, 0, my + mh); mg.addColorStop(0, '#f8fcff'); mg.addColorStop(1, '#dceefe');
      ctx.fillStyle = mg; ctx.fill(); ctx.strokeStyle = urgent ? '#ff5470' : 'rgba(76,145,202,.62)'; ctx.lineWidth = urgent ? 2.8 : 2; ctx.stroke();
      ctx.save(); roundRect(ctx, mx + 2, my + 2, mw - 4, mh - 4, 13); ctx.clip();
      const pg = ctx.createLinearGradient(mx, 0, mx + mw, 0); pg.addColorStop(0, colours[0]); pg.addColorStop(1, colours[1]);
      ctx.globalAlpha = .20; ctx.fillStyle = pg; ctx.fillRect(mx + 2, my + mh - 7, (mw - 4) * clamp(progress, 0, 1), 5); ctx.restore();
      ctx.save(); ctx.translate(mx + 24, my + mh / 2); drawIcon(ctx, 31); ctx.restore();
      strokeText(ctx, label, mx + 46, my + 13,
        { font: FONT.ui(10, 800), fill: '#71829a', stroke: null, lw: 0, align: 'left', baseline: 'middle', shadow: null });
      strokeText(ctx, value, mx + 46, my + 31,
        { font: FONT.disp(18), fill: urgent ? '#d7193f' : '#293653', stroke: null, lw: 0, align: 'left', baseline: 'middle', shadow: null });
      ctx.restore();
    };
    const lowTime = this.timeLeft <= 15, mm = Math.floor(this.timeLeft / 60), ss = Math.floor(this.timeLeft % 60);
    metric(x + 18, y + 148, `${mm}:${String(ss).padStart(2, '0')}`, t('time'), icon.clock,
      this.timeLeft / this.timeMax, lowTime ? ['#ff3157', '#ff8a5c'] : ['#50c8ff', '#5b86e5'], lowTime);
    const hpF = clamp(this.hp / this.maxHp, 0, 1);
    metric(x + 18 + mw + gap, y + 148, String(Math.ceil(this.hp)), t('hp'), icon.heart,
      hpF, ['#ff3157', '#ff8a91'], hpF < .3);
    metric(x + 18, y + 202, String(this.gold), t('gold'), icon.pouch,
      this.gold / 400, ['#ffbd37', '#ff8a1f']);
    metric(x + 18 + mw + gap, y + 202, String(this.shotsLeft), t('shots'), (c, s) => {
      c.fillStyle = '#7450b8';
      for (let i = -1; i <= 1; i++) { c.beginPath(); c.arc(i * s * .22, 0, s * .105, 0, TAU); c.fill(); }
    }, this.shotsLeft / (L.shots || 1), ['#8e72d9', '#6341ad'], this.shotsLeft <= 5);

    const fin = this.hits.find(h2 => h2.id === 'finishNow');
    if (!(short && fin)) {
      const gy = y + (short ? 251 : 261), gh = short ? 42 : 58;
      roundRect(ctx, x + 18, gy, w - 36, gh, 15); ctx.fillStyle = 'rgba(238,245,255,.9)'; ctx.fill();
      ctx.strokeStyle = 'rgba(113,135,174,.30)'; ctx.lineWidth = 1.5; ctx.stroke();
      const noun = GOAL_NOUN[G.episodeOf(G.levelIndex).id];
      strokeText(ctx, `${t('goal')}: ${L.target.toLocaleString()}${noun ? ' ' + tx(noun, 'vi') : ''}`, x + w / 2, gy + (short ? 21 : 19),
        { font: FONT.ui(13, 800), fill: '#594b78', stroke: null, lw: 0, baseline: 'middle', shadow: null });
      if (!short) {
        const status = this.foesLeft ? t('foesShort', { n: this.foesLeft })
          : starsNow >= 3 ? t('starMax')
          : t('starNext', { n: starsNow + 1, d: Math.ceil([L.target, L.target * L.star[1], L.target * L.star[2]][starsNow] - this.score).toLocaleString() });
        strokeText(ctx, status, x + w / 2, gy + 42,
          { font: FONT.ui(11, 700), fill: this.foesLeft ? '#c0405a' : (starsNow >= 3 ? '#2f9f45' : '#81729c'),
            stroke: null, lw: 0, baseline: 'middle', shadow: null });
      }
    }

    for (const id of ['restart', 'resume']) {
      const h2 = this.hits.find(k => k.id === id); if (!h2 || h2.hidden) continue;
      roundBtn(ctx, h2.x + 28, h2.y + 28, 27,
        (c, s) => id === 'restart' ? icon.restart(c, s) : (this.paused ? icon.play(c, s) : icon.pause(c, s)),
        { press: h2.press, hover: h2.hover });
    }
    const feed = this.hits.find(h2 => h2.id === 'feedShots');
    if (feed && !feed.hidden) textBtn(ctx, feed.x, feed.y, feed.w, feed.h,
      t('foodShots', { n: FOOD_SHOTS, food: G.save.food || 0 }),
      { press: feed.press, hover: feed.hover,
        colour: (G.save.food || 0) > 0 ? '#3fbf4a' : '#6b6f80',
        dark: (G.save.food || 0) > 0 ? '#1d6b24' : '#363947',
        lite: (G.save.food || 0) > 0 ? '#8ef08a' : '#aeb3c2', font: FONT.disp(17) });
    if (fin) {
      const puls = .5 + .5 * Math.sin(this.t * 4);
      ctx.save(); ctx.globalAlpha = .28 + .30 * puls;
      roundRect(ctx, fin.x - 5, fin.y - 5, fin.w + 10, fin.h + 10, 19); ctx.fillStyle = '#8ef08a'; ctx.fill(); ctx.restore();
      textBtn(ctx, fin.x, fin.y, fin.w, fin.h, t('finishNow'),
        { press: fin.press, hover: fin.hover, colour: '#3fbf4a', dark: '#1d6b24', lite: '#8ef08a', font: FONT.disp(20) });
    }
  },

  drawMobileHUD(G, ctx) {
    const L = G.level, x = HUDX, y = HUDY, w = HUDW, h = 154;
    card(ctx, x, y, w, h, 22);
    const mm = Math.floor(this.timeLeft / 60), ss = Math.floor(this.timeLeft % 60);
    strokeText(ctx, `${t('score')}  ${Math.round(this.shownScore).toLocaleString()}`, x + 24, y + 24,
      { font: FONT.disp(22), fill: '#f4801f', stroke: '#8c3d00', lw: 4, align: 'left', baseline: 'middle' });
    strokeText(ctx, `◷ ${mm}:${String(ss).padStart(2, '0')}`, x + w * .63, y + 24,
      { font: FONT.disp(17), fill: this.timeLeft <= 15 ? '#d7193f' : '#33445f', stroke: null, lw: 0, baseline: 'middle', shadow: null });
    strokeText(ctx, `●●● ${this.shotsLeft}`, x + w - 24, y + 24,
      { font: FONT.disp(17), fill: this.shotsLeft <= 5 ? '#d7193f' : '#60459a', stroke: null, lw: 0, align: 'right', baseline: 'middle', shadow: null });
    statBar(ctx, x + 16, y + 42, w - 32, 30, this.score / (L.target * L.star[2]), (c, s) => icon.crown(c, s),
      { label: this.comboHudLabel(), fillA: this.comboMult >= 13 ? '#ff7a55' : C.barA, fillB: this.comboMult >= 13 ? '#ff3157' : C.barB });
    const noun = GOAL_NOUN[G.episodeOf(G.levelIndex).id];
    strokeText(ctx, `${t('hp')} ${Math.ceil(this.hp)}   ·   ${t('gold')} ${this.gold}   ·   ${t('goal')} ${L.target.toLocaleString()}${noun ? ' ' + tx(noun, 'vi') : ''}`,
      x + w / 2, y + 94,
      { font: FONT.ui(13, 800), fill: '#584b72', stroke: null, lw: 0, baseline: 'middle', shadow: null });
    const fin = this.hits.find(h2 => h2.id === 'finishNow');
    const feed = this.hits.find(h2 => h2.id === 'feedShots');
    if (feed && !feed.hidden) textBtn(ctx, feed.x, feed.y, feed.w, feed.h,
      t(fin ? 'foodShotsShort' : 'foodShots', { n: FOOD_SHOTS, food: G.save.food || 0 }),
      { press: feed.press, hover: feed.hover,
        colour: (G.save.food || 0) > 0 ? '#3fbf4a' : '#6b6f80',
        dark: (G.save.food || 0) > 0 ? '#1d6b24' : '#363947',
        lite: (G.save.food || 0) > 0 ? '#8ef08a' : '#aeb3c2',
        font: FONT.disp(fin ? 14 : 17) });
    if (fin) textBtn(ctx, fin.x, fin.y, fin.w, fin.h, t('finishNow'),
      { press: fin.press, hover: fin.hover, colour: '#3fbf4a', dark: '#1d6b24', lite: '#8ef08a', font: FONT.disp(20) });
  },

  // Bản cũ giữ lại để đối chiếu ảnh khi cân bằng giao diện.
  drawHUD(G, ctx) {
    const L = G.level;
    const x = HUDX, y = 60, w = HUDW, h = 528;
    card(ctx, x, y, w, h, 24);
    strokeText(ctx, t('score'), x + w / 2, y + 52,
      { font: FONT.disp(44), fill: '#ffa63d', stroke: '#8c3d00', lw: 8, baseline: 'middle' });
    strokeText(ctx, Math.round(this.shownScore).toLocaleString(), x + w / 2, y + 100,
      { font: FONT.disp(38), fill: '#2b1740', stroke: null, lw: 0, baseline: 'middle', shadow: null });

    const bw = w - 44, bh = 52;
    statBar(ctx, x + 22, y + 120, bw, bh, this.score / L.target, (c, s) => icon.crown(c, s),
      { label: `${Math.min(100, Math.round(this.score / L.target * 100))}%` });
    const frac = clamp(this.timeLeft / this.timeMax, 0, 1), low = this.timeLeft <= 15;
    const mm = Math.floor(this.timeLeft / 60), ss = Math.floor(this.timeLeft % 60);
    statBar(ctx, x + 22, y + 182, bw, bh, frac, (c, s) => icon.clock(c, s),
      { fillA: low ? '#ff9a9a' : C.barA, fillB: low ? '#e01f3d' : C.barB,
        label: `${mm}:${String(ss).padStart(2, '0')}` });
    const hpF = clamp(this.hp / this.maxHp, 0, 1), hpLow = hpF < .3;
    statBar(ctx, x + 22, y + 244, bw, bh, hpF, (c, s) => icon.heart(c, s), {
      fillA: hpLow ? '#ff9a9a' : '#ff7d8f', fillB: hpLow ? '#c00020' : '#e01f3d',
      label: `${Math.ceil(this.hp)}` });
    statBar(ctx, x + 22, y + 306, bw, bh, clamp(this.gold / 400, 0, 1), (c, s) => icon.pouch(c, s),
      { label: String(this.gold) });

    const low2 = this.shotsLeft <= 5;
    strokeText(ctx, t('shots'), x + 34, y + 380,
      { font: FONT.ui(16, 800), fill: '#5b4a7a', stroke: null, lw: 0, align: 'left', baseline: 'middle', shadow: null });
    strokeText(ctx, String(this.shotsLeft), x + w - 34, y + 380,
      { font: FONT.disp(low2 ? 44 + Math.sin(this.t * 8) * 4 : 40),
        fill: low2 ? '#e8384f' : '#2b1740', stroke: low2 ? '#5c0010' : null, lw: low2 ? 5 : 0,
        align: 'right', baseline: 'middle', shadow: null });
    const noun = GOAL_NOUN[G.episodeOf(G.levelIndex).id];
    strokeText(ctx, `${t('goal')}: ${L.target.toLocaleString()}${noun ? ' ' + tx(noun, 'vi') : ''}`, x + w / 2, y + 414,
      { font: FONT.ui(15, 600), fill: '#6a5a86', stroke: null, lw: 0, baseline: 'middle', shadow: null });
    if (this.foesLeft)
      strokeText(ctx, t('foesAlive', { n: this.foesLeft }), x + w / 2, y + 438,
        { font: FONT.ui(13, 700), fill: '#c0405a', stroke: null, lw: 0, baseline: 'middle', shadow: null });

    const fin = this.hits.find(h => h.id === 'finishNow');
    if (fin) {
      const puls = .5 + .5 * Math.sin(this.t * 4);
      ctx.save();
      ctx.globalAlpha = .30 + .35 * puls;
      roundRect(ctx, fin.x - 5, fin.y - 5, fin.w + 10, fin.h + 10, 19);
      ctx.fillStyle = '#8ef08a'; ctx.fill();
      ctx.restore();
      textBtn(ctx, fin.x, fin.y, fin.w, fin.h, t('finishNow'),
        { press: fin.press, hover: fin.hover, colour: '#3fbf4a', dark: '#1d6b24', lite: '#8ef08a', font: FONT.disp(20) });
    }

    for (const id of ['restart', 'resume']) {
      const h2 = this.hits.find(k => k.id === id); if (!h2) continue;
      roundBtn(ctx, h2.x + 32, h2.y + 32, 32,
        (c, s) => id === 'restart' ? icon.restart(c, s) : (this.paused ? icon.play(c, s) : icon.pause(c, s)),
        { press: h2.press, hover: h2.hover });
    }
  },

  drawPause(G, ctx) {
    const { W, H } = G;
    ctx.fillStyle = 'rgba(10,6,22,.7)'; ctx.fillRect(...bleed(G));
    glassPanel(ctx, W / 2 - 210, H / 2 - 150, 420, 300, 24);
    strokeText(ctx, t('paused'), W / 2, H / 2 - 92, { font: FONT.disp(44), fill: '#fff', stroke: '#3a1d6e', lw: 9, baseline: 'middle' });
    strokeText(ctx, 'Esc  /  P', W / 2, H / 2 - 40,
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
    const top = G.portrait ? H / 2 - 250 : 140;
    glassPanel(ctx, W / 2 - 300, top, 600, 300, 28,
      // Nền phải TỐI và trung tính thì tia sáng vàng mới ra vàng. Nền xanh lá
      // cũ cộng tia vàng ra màu ô liu, nhìn như sọc bẩn chứ không phải hào quang.
      this.over.win ? { top: 'rgba(28,32,62,.96)', bot: 'rgba(11,13,30,.97)', rim: 'rgba(120,240,150,.55)' }
                    : { top: 'rgba(52,20,28,.96)', bot: 'rgba(20,7,13,.97)', rim: 'rgba(255,120,80,.55)' });
    resultBanner(ctx, {
      cx: W / 2, top, w: 600, h: 300,
      win: this.over.win, t: this.t,
      title: this.over.win ? t('cleared') : t('failed'),
      sub: `${t('level')} ${G.level?.index ?? ''}`.trim(),
      stars: this.starsEarned, anim: this.overT,
    });
    strokeText(ctx, `${t('finalScore')}: ${this.score.toLocaleString()}`, W / 2, top + 228,
      { font: FONT.disp(28), fill: '#fff', stroke: '#12060f', lw: 6, baseline: 'middle' });
    if (this.over.win)
    {
      strokeText(ctx, `+${this.gold} ${t('gold')}     +${this.xpGain} EXP`, W / 2, top + 262,
        { font: FONT.disp(24), fill: '#ffe066', stroke: '#4a2d00', lw: 5, baseline: 'middle' });
      if (this.matsGot) drawMatsRow(ctx, W / 2, top + 284, this.matsGot);
    }
    else
      strokeText(ctx, this.over.why, W / 2, top + 260,
        { font: FONT.ui(19, 600), fill: '#ffc0cf', stroke: null, lw: 0, baseline: 'middle', shadow: null });
    ctx.restore();

    if (k >= 1) for (const h of this.hits) {
      if (h.id === 'next') textBtn(ctx, h.x, h.y, h.w, h.h, t('next') + ' ›', { press: h.press, hover: h.hover, font: FONT.disp(21) });
      if (h.id === 'again') textBtn(ctx, h.x, h.y, h.w, h.h, t('retry'), { press: h.press, hover: h.hover, colour: C.orange, dark: C.orangeDark, lite: C.orangeLite, font: FONT.disp(21) });
      if (h.id === 'retry') textBtn(ctx, h.x, h.y, h.w, h.h, t('retry'), { press: h.press, hover: h.hover, colour: C.orange, dark: C.orangeDark, lite: C.orangeLite, font: FONT.disp(22) });
      if (h.id === 'map') textBtn(ctx, h.x, h.y, h.w, h.h, t('toMap'), { press: h.press, hover: h.hover, colour: '#7a5fae', dark: '#3b2263', lite: '#c0a0ff', font: FONT.disp(21) });
    }
  },
};

/** Khung thoại — dùng chung kiểu với màn Ghép Đá. */
function drawBubble(ctx, b, x, w, y) {
  const k = clamp(b.t / .22, 0, 1), fade = clamp((b.dur - b.t) / .4, 0, 1);
  const sp = speaker(b.beat.who);
  const text = fill(tx(b.beat, 'vi') || b.beat.vi);

  ctx.save();
  ctx.globalAlpha = fade;
  ctx.translate(x + w / 2, y); const e = ease.outBack(k); ctx.scale(e, e); ctx.translate(-(x + w / 2), -y);
  ctx.font = FONT.ui(PORTRAIT ? 13 : 15, 600);
  const lines = [];
  let line = '';
  for (const word of String(text).split(' ')) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > w - 34 && line) { lines.push(line); line = word; } else line = test;
  }
  if (line) lines.push(line);
  if (PORTRAIT && lines.length > 2) lines.length = 2;
  const h = PORTRAIT ? 60 : 44 + lines.length * 21;
  roundRect(ctx, x, y, w, h, 16);
  ctx.fillStyle = 'rgba(14,8,26,.93)'; ctx.fill();
  ctx.strokeStyle = sp.col; ctx.lineWidth = 2.5; ctx.stroke();
  strokeText(ctx, tx(sp, 'name'), x + (PORTRAIT ? 14 : 16), y + (PORTRAIT ? 15 : 20),
    { font: FONT.disp(PORTRAIT ? 14 : 17), fill: sp.col, stroke: sp.ink, lw: PORTRAIT ? 3 : 4, align: 'left', baseline: 'middle' });
  ctx.font = FONT.ui(PORTRAIT ? 13 : 15, 600); ctx.fillStyle = '#efe8ff';
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  lines.forEach((ln, i) => ctx.fillText(ln, x + (PORTRAIT ? 14 : 16), y + (PORTRAIT ? 34 + i * 17 : 44 + i * 21)));
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

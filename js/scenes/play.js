// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  Màn chơi chính — bàn cờ match-3 + HUD dựng theo bảng SCORE trong Figma. ║
// ╚══════════════════════════════════════════════════════════════════════════╝
import { TAU, clamp, lerp, ease, rand, randInt, rgba, shade, strokeText, roundRect } from '../core/util.js';
import { t, tx } from '../core/i18n.js';
import { Hit, card, glassPanel, statBar, roundBtn, textBtn, starBar, icon, matIcon, C, FONT, resultBanner, frostCard , heroCardScene, heroFit } from '../ui/widgets.js';
import { Board } from '../game/board.js';
import { GEMS, SP, TOKEN, ensureGemSprites } from '../game/gems.js';
import { BREEDS, STAGES, stageFor } from '../data/characters.js';
import { Enemy, ENEMIES, ATK, drawEnemyRaid } from '../game/enemy.js';
import { playLayout, bleed } from '../core/layout.js';
import { pickBeat, GOAL_NOUN } from '../data/beats.js';
import { speaker, fill } from '../core/lore.js';
import { rollMats, addMats, MATS } from '../data/gear.js';
import { hand } from './help.js';

// ── HÌNH DẠNG BÀN CỜ ───────────────────────────────────────────────────────
// Game khoá NGANG, mà bàn 8×8 là hình VUÔNG → chiều cao khoá cỡ ô ở 72, bề
// ngang thừa ra cả mảng trống. Đổi sang 9×7 (nằm ngang như màn hình): cùng số ô
// (63 so với 64) nhưng ô to hơn 1/3 và bàn lấp được khoảng giữa.
const COLS = 9, ROWS = 7;
// Ô gem nhỏ lại trên màn hẹp → bàn cờ thấp hơn, chừa chỗ cho khung thoại
// mà không phải đè lên hàng gem cuối.
let CELL = 62;
let FW = COLS * CELL + 28, FH = ROWS * CELL + 28;
let ENEMY_Y = 60;                         // hàng thiên địch — tính lại theo bàn cờ
// Quỹ chiều cao dành cho bàn cờ. Dải giao diện luôn cao 720 nên đây MỚI là thứ
// quyết định bàn cờ to hay bé, chứ không phải bề ngang máy: bàn vuông 8×8.
const BOARD_TOP = 78, BOARD_BOT = 684;

// Các mốc bố cục được TÍNH LẠI theo bề ngang thật của thiết bị (xem core/layout.js):
// bàn cờ luôn ở giữa, thẻ nhân vật bám mép trái, bảng HUD bám mép phải.
let BX = 398, BY = 136, FX_ = 384, FY_ = 122;
let CARDX = 24, STRIPX = 292, HUDX = 950, HUDW = 306, COMPACT = false;
let PORTRAIT = false, SKILLY = 176, HUDY = 78;
function relayout(W, H, dpr = 1.5, hasFoes = false) {
  PORTRAIT = H > W;
  if (PORTRAIT) {
    // Một cột duy nhất theo nhịp đọc của ngón cái: nhân vật/địch → bàn cờ →
    // kỹ năng → điểm. Bàn gần kín ngang nhưng vẫn có lề 16px để không sát mép.
    const byW = Math.floor((W - 32 - 28) / COLS);
    const top = H < 1400 ? (hasFoes ? 154 : 128) : (hasFoes ? 238 : 188);
    const reserve = H < 1400 ? 350 : 680;
    const byH = Math.floor((H - top - reserve - 28) / ROWS);
    CELL = clamp(Math.min(byW, byH), 46, 82);
    ensureGemSprites(CELL * 1.02 * dpr);
    FW = COLS * CELL + 28; FH = ROWS * CELL + 28;
    FX_ = Math.round((W - FW) / 2); FY_ = top;
    BX = FX_ + 14; BY = FY_ + 14;
    ENEMY_Y = FY_ - 50;
    CARDX = -9999; COMPACT = true;
    SKILLY = FY_ + FH + 16;
    STRIPX = Math.round((W - 250) / 2);
    HUDX = 16; HUDW = W - 32; HUDY = SKILLY + 88;
    return;
  }
  // Cỡ ô = min(vừa chiều cao, vừa bề ngang). Trước đây đóng đinh 62 nên trên
  // điện thoại 19,5:9 bàn cờ chỉ chiếm 73% chiều cao và 34% bề ngang — chính
  // là cảm giác "phần chơi bé quá".
  // Máy hẹp thì BỎ thẻ nhân vật để nhường chỗ cho bàn cờ — chơi được vẫn hơn
  // là ngắm ảnh dế. Ngưỡng phải khớp với playLayout() trong core/layout.js.
  const compact = W < 1400;
  const chrome = (compact ? 0 : 250 + 18) + 78 + 14 + 18 + (compact ? 286 : 306) + 2 * 20;
  const byW = Math.floor((W - chrome - 28) / COLS);
  // Màn có thiên địch thì phải chừa hàng cho chúng đứng phía trên bàn cờ;
  // màn không có thì bàn ăn luôn khoảng đó.
  const top = hasFoes ? BOARD_TOP + 34 : BOARD_TOP;
  const byH = Math.floor((BOARD_BOT - top - 28) / ROWS);
  CELL = clamp(Math.min(byW, byH), 46, 96);
  // Dựng sprite đá quý đúng bằng số điểm ảnh THẬT một viên chiếm — vẽ 1:1 thì
  // mới sắc; để sprite cỡ cố định rồi co giãn là nhoè hết nét giác cắt.
  ensureGemSprites(CELL * 1.02 * dpr);
  FW = COLS * CELL + 28; FH = ROWS * CELL + 28;
  const L = playLayout(W, FW, FH);
  FX_ = L.boardX;
  FY_ = Math.round(top + (BOARD_BOT - top - FH) / 2);
  BX = FX_ + 14; BY = FY_ + 14;
  // Chừa đủ cho cả con địch (50px) LẪN thanh máu nằm dưới nó (+30) — kê sát quá
  // thì thanh máu chui xuống dưới mép khung bàn cờ.
  ENEMY_Y = Math.max(44, FY_ - 48);
  CARDX = L.cardX; STRIPX = L.stripX; HUDX = L.hudX; HUDW = L.hudW; COMPACT = L.compact;
  SKILLY = 176; HUDY = 78;
}

export default {
  name: 'play',

  enter(G) {
    const L = G.level;
    relayout(G.W, G.H, G.dpr, (L.enemies || []).length > 0);
    this.t = 0;
    this.score = 0; this.gold = 0; this.movesLeft = L.moves;
    this.over = null; this.overT = 0; this.paused = false;
    this.bravo = null; this.bravoGold = 0;
    // ── THANH NỘ ────────────────────────────────────────────────────────
    // Nạp từ CẢ HAI phía: ăn điểm và ăn đòn. Chỉ nạp khi ghép được thì người
    // chơi đang thắng lại càng thắng; cho ăn đòn cũng nạp thì lúc bị dồn vào
    // thế bí mới có đường lật ngược — đó mới là chỗ hồi hộp.
    this.rage = 0;      // 0..1
    this.hot = 0;       // số nước ghép trúng liên tiếp
    this.fury = 0;      // giây còn lại của trạng thái nổi nộ
    this.furyT = 0;
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
    this.hitFlash = 0; this.dmgText = 0; this.raidFx = null;

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

    G.world.setTheme({ sky: L.sky, hill: L.hill, mount: L.mount, biome: L.biome });
    G.hero.onChirp = (x, y, dx, dy) => G.fx.chirp(x, y, dx, dy, 4);

    this.hits = [
      new Hit('pause',   G.W - 78, 12, 52, 52, { circle: true, act: () => this.togglePause(G) }),
      new Hit('exit',    G.W - 142, 12, 52, 52, { circle: true, act: () => { G.sfx('button'); G.go('map'); } }),
      new Hit('restart', HUDX + HUDW * .25 - 28, HUDY + 391, 56, 56, { circle: true, act: () => G.startLevel(G.levelIndex) }),
      new Hit('resume',  HUDX + HUDW * .68 - 28, HUDY + 391, 56, 56, { circle: true, act: () => this.togglePause(G) }),
      new Hit('sk0', PORTRAIT ? STRIPX + 8 : STRIPX + 8, PORTRAIT ? SKILLY + 8 : 190, 62, 62, { act: () => this.useBreath(G) }),
      new Hit('sk1', PORTRAIT ? STRIPX + 94 : STRIPX + 8, PORTRAIT ? SKILLY + 8 : 268, 62, 62, { act: () => this.useHammer(G) }),
      new Hit('sk2', PORTRAIT ? STRIPX + 180 : STRIPX + 8, PORTRAIT ? SKILLY + 8 : 346, 62, 62, { act: () => this.useShuffle(G) }),
      new Hit('quit', G.W / 2 - 110, G.H / 2 + 6, 220, 54,
        { act: () => { G.sfx('button'); G.go('map'); }, hidden: true }),
      new Hit('howto', G.W / 2 - 110, G.H / 2 + 78, 220, 54,
        { act: () => { G.sfx('button'); G.go('help', 'map'); }, hidden: true }),
    ];
    if (PORTRAIT && G.H < 1250) {
      for (const id of ['restart', 'resume']) this.hits.find(h => h.id === id).hidden = true;
    }
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
      const mult = (1 + (cascade - 1) * .55) * (this.fury > 0 ? 2 : 1);
      if (cascade > (G.sess.combo || 0)) G.sess.combo = cascade;   // cho câu nói bám đúng lúc
      if (cascade === 1) {
        this.hot++;
        if (this.hot === 5) { G.sfx('levelup'); G.hero.react('proud', 1.4); this.say(G, 'combo'); }
      }
      this.addRage(G, .09 + (cascade - 1) * .05 + Math.min(count, 8) * .006);
      const gained = Math.round(count * 42 * mult);
      this.score += gained;
      const g = Math.round(count * 1.0 * mult);      // cắt ~45%: tiền cũ nhiều tới mức đồ xịn thành rẻ
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
          const g2 = 34 + Math.round(Math.random() * 34);
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
        G.sfx('levelup'); G.hero.chirpBurst(.9); G.fx.shake(10);
        this.say(G, 'goalHit');
        // Đủ điểm rồi thì cho quyền chốt ngay. Ai muốn cày thêm sao vẫn chơi
        // tiếp được — giờ và lượt còn thừa lát nữa đổi ra thưởng, không phí.
        this.showFinishNow(G);
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
        if (cascade >= 4) G.hero.chirpBurst(.55);
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
    // Rách tơ: bung mảnh trắng + tiếng xé, để người chơi thấy rõ "cú này chỉ phá
    // được tơ thôi, viên ngọc vẫn còn đó".
    b.on.unweb = (cell) => {
      const px = BX + cell.cx * CELL + CELL / 2, py = BY + cell.cy * CELL + CELL / 2;
      G.fx.burst(px, py, { lite: '#ffffff', base: '#dfe7ff', dark: '#8f9ac0', spark: '#fff' }, 8, 1.1);
      G.fx.ring(px, py, '#eaf0ff', 6, 70, .3, 6);
      G.sfx('crack');
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
    this.skillFx = { kind: 'chirp', t: 0, dur: .95, row: r, y: ry };
    G.hero.chirpBurst(1.1); G.sfx('chirp'); G.fx.shake(22);
    G.fx.beam(BX + FW / 2 - 14, ry, true, FW, '#ffd66e');
    for (let c = 0; c < COLS; c++) {
      const x = BX + c * CELL + CELL / 2;
      G.fx.chirp(x, ry, 1, -.1, 8);
      G.fx.smoke(x, ry, 3, '#ffe9a8');
    }
    G.fx.ring(BX + FW / 2 - 14, ry, '#ffd66e', 20, FW * .7, .55, 14);
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

  /** Bày nút QUA MÀN NGAY. Tách ra thành hàm riêng để công cụ dev dựng lại
   *  được đúng trạng thái này mà không phải chơi thật cho đủ điểm. */
  showFinishNow(G) {
    if (this.hits.some(h => h.id === 'finishNow')) return;
    this.hits.push(new Hit('finishNow', HUDX + 12, HUDY + (PORTRAIT && G.H < 1250 ? 322 : 494), HUDW - 24, 52,
      { act: () => this.startBravo(G, t('outOfMoves')) }));
  },

  /** Biểu ngữ lúc chốt màn — cho biết đang nổ gì và đổi được bao nhiêu. */
  drawBravo(G, ctx) {
    const b = this.bravo;
    const lbl = b.stage === 0 ? t('bravoBlast') : b.stage === 1 ? t('bravoMoves')
              : b.stage === 2 ? t('bravoTime') : t('bravoDone');
    const k = ease.outBack(clamp(b.t / .3, 0, 1));
    ctx.save();
    ctx.translate(FX_ + FW / 2, FY_ + 66);
    ctx.scale(k, k);
    ctx.font = FONT.disp(26);
    const w = ctx.measureText(lbl).width + 56;
    roundRect(ctx, -w / 2, -26, w, 52, 26);
    ctx.fillStyle = 'rgba(12,7,26,.88)'; ctx.fill();
    ctx.strokeStyle = 'rgba(255,214,110,.85)'; ctx.lineWidth = 2.5; ctx.stroke();
    strokeText(ctx, lbl, 0, 0,
      { font: FONT.disp(26), fill: '#ffe066', stroke: '#3a2000', lw: 5, baseline: 'middle' });
    if (b.gained > 0)
      strokeText(ctx, `+${b.gained} ${t('gold')}`, 0, 44,
        { font: FONT.disp(22), fill: '#fff', stroke: '#4a2d00', lw: 5, baseline: 'middle' });
    ctx.restore();
  },

  /** Nạp thanh nộ; đầy thì tự bùng. */
  addRage(G, n) {
    if (this.over || this.fury > 0) return;
    this.rage = clamp(this.rage + n, 0, 1);
    if (this.rage >= 1) this.burstFury(G);
  },

  /**
   * NỔI NỘ — nổ tung màn hình rồi giáng đòn.
   *
   * Phải có phần thưởng THẬT chứ không chỉ đẹp mắt: quét sạch một phần bàn cờ,
   * giáng đòn lên mọi thiên địch, và nhân đôi điểm trong mấy giây sau. Hiệu ứng
   * hoành tráng mà không đổi được cục diện thì lần thứ hai đã hết thiêng.
   */
  burstFury(G) {
    this.rage = 0; this.fury = 6; this.furyT = 0;
    G.sfx('bomb'); G.fx.shake(34);
    G.hero.react('proud', 2.2); G.hero.chirpBurst(1.4);
    // Tâm nổ đặt ở giữa toàn màn hình. Vòng xung kích phải đi xuyên HUD và
    // thẻ nhân vật thì người chơi mới cảm được đây là trạng thái toàn cục.
    const cx = G.W / 2, cy = G.H / 2;
    for (let i = 0; i < 3; i++)
      G.fx.ring(cx, cy, ['#fff6ae', '#ff9a36', '#ff3157'][i], 18, Math.max(G.W, G.H) * (.48 + i * .22), .55 + i * .12, 20);
    for (let k = 0; k < 34; k++)
      G.fx.burst(cx, cy, { lite: '#ffd0a0', base: '#ff5f3a', dark: '#7a1400', spark: '#fff' }, 8, 1.9);
    // giáng đòn lên toàn bộ thiên địch
    for (const e of this.enemies) if (e.alive) {
      const d = Math.round(40 + (G.save.stats?.might || 0) * 9);
      e.damage(d);
      G.fx.float(FX_ + FW * ((this.enemies.indexOf(e) + .5) / this.enemies.length), FY_ + 40,
        '-' + d, { size: 34, fill: '#fff', stroke: '#5c0010' });
    }
    // foesLeft là getter — nó tự đếm lại, không gán tay được.
    // nổ một dải ngang giữa bàn
    const row = (this.board.rows / 2) | 0;
    const out = new Set();
    for (let c = 0; c < this.board.cols; c++) out.add(this.board.idx(c, row));
    this.board._beginPop([...out], null);
  },

  /** Lớp Nộ phủ toàn màn: cú chớp mở màn, tia tốc độ, viền lửa và badge ×2. */
  drawFuryFx(G, ctx) {
    const age = this.furyT, left = clamp(this.fury / 6, 0, 1);
    const [sx, sy, sw, sh] = bleed(G);
    const cx = G.W / 2, cy = G.H / 2;
    ctx.save();

    // Cú chớp đầu tiên ngắn để tạo lực nhưng không giữ một mảng đỏ gây khó nhìn.
    const flash = clamp(1 - age / .34, 0, 1);
    if (flash > 0) {
      ctx.globalAlpha = flash * .72;
      const fg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(sw, sh) * .7);
      fg.addColorStop(0, '#fffce8'); fg.addColorStop(.25, '#ffd23f'); fg.addColorStop(1, '#ff3157');
      ctx.fillStyle = fg; ctx.fillRect(sx, sy, sw, sh);
    }

    // Viền nhiệt thở theo nhịp, giữ tín hiệu "đang ×2" trong suốt 6 giây.
    ctx.globalAlpha = 1;
    const heat = .72 + Math.sin(this.t * 11) * .12;
    const vg = ctx.createRadialGradient(cx, cy, sh * .25, cx, cy, sh * .77);
    vg.addColorStop(0, 'rgba(255,70,35,0)');
    vg.addColorStop(.72, `rgba(255,65,32,${.08 * left})`);
    vg.addColorStop(1, `rgba(150,0,35,${.48 * left * heat})`);
    ctx.fillStyle = vg; ctx.fillRect(sx, sy, sw, sh);

    // Tia tốc độ bung khỏi tâm. Góc cố định, chỉ đầu tia chuyển động nên không
    // bị nhiễu nhấp nháy như dùng Math.random() mỗi khung.
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(age * .06);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 22; i++) {
      const a = i / 22 * TAU + Math.sin(i * 12.7) * .035;
      const pulse = .55 + .45 * Math.sin(age * 8 + i * 1.9);
      const r0 = 150 + (i % 4) * 22, r1 = Math.max(G.W, G.H) * (.48 + .13 * pulse);
      ctx.strokeStyle = i % 3 ? `rgba(255,116,46,${.10 * left})` : `rgba(255,240,150,${.18 * left})`;
      ctx.lineWidth = i % 3 ? 3 : 6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
      ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); ctx.stroke();
    }
    ctx.restore();

    // Mép lửa cách điệu ở trên/dưới. Đây là phần cho cảm giác "toàn màn" rõ
    // nhất mà vẫn để vùng giữa trong trẻo cho thao tác.
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const edge of [0, 1]) {
      const y = edge ? sy + sh : sy;
      ctx.beginPath(); ctx.moveTo(sx, y);
      for (let i = 0; i <= 18; i++) {
        const x = sx + sw * i / 18;
        const flame = 16 + 22 * (.5 + .5 * Math.sin(age * 9 + i * 2.17));
        ctx.lineTo(x, y + (edge ? -flame : flame));
      }
      ctx.lineTo(sx + sw, y); ctx.closePath();
      const eg = ctx.createLinearGradient(0, y, 0, y + (edge ? -48 : 48));
      eg.addColorStop(0, `rgba(255,40,55,${.48 * left})`);
      eg.addColorStop(1, 'rgba(255,205,60,0)');
      ctx.fillStyle = eg; ctx.fill();
    }
    ctx.restore();

    // Đại tự chỉ chiếm khoảng một giây đầu; sau đó thu thành badge để người
    // chơi quay lại bàn ngay, không phải đợi animation kết thúc.
    if (age < 1.35) {
      const intro = ease.outBack(clamp(age / .28, 0, 1));
      const fade = clamp((1.35 - age) / .28, 0, 1);
      ctx.save(); ctx.globalAlpha = fade;
      ctx.translate(cx, cy - 18); ctx.scale(intro, intro);
      const band = ctx.createLinearGradient(-280, 0, 280, 0);
      band.addColorStop(0, 'rgba(70,0,30,0)'); band.addColorStop(.5, 'rgba(78,8,30,.88)'); band.addColorStop(1, 'rgba(70,0,30,0)');
      ctx.fillStyle = band; ctx.fillRect(-330, -74, 660, 148);
      strokeText(ctx, t('furyGo'), 0, -10,
        { font: FONT.disp(68), fill: '#ffe66d', stroke: '#7a1400', lw: 14, baseline: 'middle' });
      strokeText(ctx, t('furyBoost'), 0, 48,
        { font: FONT.ui(20, 800), fill: '#fff7da', stroke: '#5c0010', lw: 5, baseline: 'middle', shadow: null });
      ctx.restore();
    } else {
      const bw = 176, bh = 34, x = cx - bw / 2, y = 12;
      roundRect(ctx, x, y + 3, bw, bh, bh / 2); ctx.fillStyle = 'rgba(72,0,20,.65)'; ctx.fill();
      roundRect(ctx, x, y, bw, bh, bh / 2);
      const bg = ctx.createLinearGradient(x, 0, x + bw, 0);
      bg.addColorStop(0, '#ff3157'); bg.addColorStop(.55, '#ff8a2b'); bg.addColorStop(1, '#ffd84f');
      ctx.fillStyle = bg; ctx.fill(); ctx.strokeStyle = '#fff2a8'; ctx.lineWidth = 2; ctx.stroke();
      strokeText(ctx, `${t('furyBadge')}  ${this.fury.toFixed(1)}s`, cx, y + bh / 2,
        { font: FONT.ui(14, 800), fill: '#fff', stroke: '#6a1200', lw: 4, baseline: 'middle', shadow: null });
    }
    ctx.restore();
  },

  checkEnd(G) {
    if (this.over || this.bravo) return;
    if (this.hp <= 0) return this.finish(G, false, t('foeKilled'));
    const won = this.score >= G.level.target;
    if (this.timeLeft <= 0) return won ? this.startBravo(G, t('outOfTime')) : this.finish(G, false, t('outOfTime'));
    // Chơi trọn số lượt rồi mới kết toán — nhờ vậy mốc 1★/2★/3★ mới khác nhau.
    if (this.movesLeft <= 0) return won ? this.startBravo(G, t('outOfMoves')) : this.finish(G, false, t('outOfMoves'));
  },

  /**
   * MÀN BRAVO — chốt màn cho ra chốt màn.
   *
   * Ba nhịp: (1) mọi viên đá đặc biệt còn trên bàn tự nổ hết, (2) số LƯỢT còn
   * thừa đổi ra vàng, (3) số GIÂY còn thừa đổi ra vàng. Nhờ vậy chơi giỏi tới
   * mức thừa lượt/thừa giờ không còn là công cốc, và người chơi có lý do để
   * bấm "qua màn ngay" thay vì ngồi ghép cho hết lượt.
   */
  startBravo(G, why) {
    if (this.over || this.bravo) return;
    this.board.locked = true;
    this.hammerMode = false;
    this.hits = this.hits.filter(h => h.id === 'pause');
    const sp = [];
    this.board.grid.forEach((c, i) => { if (c && c.sp) sp.push(i); });
    this.bravo = {
      why, t: 0, next: .30, stage: sp.length ? 0 : 1, sp,
      moves: Math.max(0, this.movesLeft), time: Math.max(0, Math.floor(this.timeLeft)),
      perMove: 8 + Math.round((G.level.index || 1) * .35), perSec: 2, gained: 0,
    };
    G.sfx('levelup');
  },

  tickBravo(G, dt) {
    const b = this.bravo;
    b.t += dt;
    this.board.update(dt);
    if (b.t < b.next) return;

    const pay = (n, label, col) => {
      this.gold += n; b.gained += n;
      G.fx.float(FX_ + FW / 2, FY_ + FH * .34, label,
        { size: 30, fill: col, stroke: '#4a2d00' });
      G.sfx('coin');
    };

    if (b.stage === 0) {                       // ① nổ hết đá đặc biệt
      const i = b.sp.shift();
      const cell = i != null ? this.board.grid[i] : null;
      if (cell && cell.sp) {
        const px = BX + cell.px + CELL / 2, py = BY + cell.py + CELL / 2;
        G.fx.ring(px, py, '#ffe9a8', 8, 150, .42, 11);
        G.fx.shake(12);
        G.sfx('special');
        const out = new Set(); this.board.detonate(i, out);
        this.board._beginPop([...out], null);
      }
      b.next = b.t + .18;
      if (!b.sp.length) { b.stage = 1; b.next = b.t + .45; }
      return;
    }
    if (b.stage === 1) {                       // ② lượt thừa → vàng
      if (b.moves > 0) {
        const take = Math.max(1, Math.ceil(b.moves / 6));
        b.moves -= take; this.movesLeft = b.moves;
        pay(take * b.perMove, `+${take * b.perMove}`, '#ffe066');
        b.next = b.t + .13;
      } else { b.stage = 2; b.next = b.t + .30; }
      return;
    }
    if (b.stage === 2) {                       // ③ giây thừa → vàng
      if (b.time > 0) {
        const take = Math.max(1, Math.ceil(b.time / 8));
        b.time -= take; this.timeLeft = b.time;
        pay(take * b.perSec, `+${take * b.perSec}`, '#8ef08a');
        b.next = b.t + .10;
      } else { b.stage = 3; b.next = b.t + .55; }
      return;
    }
    this.bravoGold = b.gained;                 // ④ kết toán
    this.bravo = null;
    this.finish(G, true, b.why);
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
      if (Math.random() < .35) S.food += 1;
      this.matsGot = addMats(S, rollMats(2 + this.starsEarned, G.levelIndex));   // nguyên liệu chế tạo
      if (G.levelIndex + 1 >= S.unlocked) S.unlocked = Math.min(G.levelIndex + 2, G.totalLevels);
      G.hero.xp = S.xp;
      G.persist();
      G.sess.wins++; G.sess.streak++; G.sess.losses = 0;
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
      G.spendFed(G.FED_LOSE);            // thua cũng mất sức → thử lại có giá
      G.sess.losses++; G.sess.streak = 0;
      G.sfx('lose'); G.hero.react('hurt', 2); G.fx.shake(16);
      this.say(G, 'lose');
    }
    this.hits = this.hits.filter(h => h.id === 'pause');
    const y = G.portrait ? G.H / 2 + 210 : 470;
    if (win) {
      // Ba nút: qua màn kế · chơi lại màn này · về bản đồ. Thắng rồi mà muốn
      // cày thêm sao thì trước đây phải quay ra bản đồ rồi bấm lại vào.
      this.hits.push(new Hit('next',  G.W / 2 - 256, y, 160, 62, { act: () => G.goNextLevel(G.levelIndex) }));
      this.hits.push(new Hit('again', G.W / 2 -  80, y, 160, 62, { act: () => G.startLevel(G.levelIndex, true) }));
      this.hits.push(new Hit('map',   G.W / 2 +  96, y, 160, 62, { act: () => G.go('map') }));
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
    if (this.raidFx) { this.raidFx.t += dt; if (this.raidFx.t >= this.raidFx.dur) this.raidFx = null; }
    if (this.skillFx) { this.skillFx.t += dt; if (this.skillFx.t >= this.skillFx.dur) this.skillFx = null; }
    if (this.bubble) { this.bubble.t += dt; if (this.bubble.t >= this.bubble.dur) this.bubble = null; }
    if (this.over) { this.overT += dt; return; }
    if (this.bravo) { this.tickBravo(G, dt); return; }
    if (this.paused) return;

    this.board.update(dt);
    this.updateEnemies(G, dt);
    if (this.hitFlash > 0) this.hitFlash -= dt;
    if (this.fury > 0) { this.fury -= dt; this.furyT += dt; if (this.fury <= 0) this.hot = 0; }

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
      this.raidFx = { enemy: e, index: i, t: 0, dur: .92, kind: e.def.atk };
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
      this.hot = 0;
      this.addRage(G, .16);          // ăn đòn nạp mạnh hơn ghép trúng
      if (this.hp <= 0) { this.finish(G, false, t('foeKilled')); return; }
    }
  },

  /**
   * Nhạc đổi theo TÌNH HUỐNG, không chỉ theo màn:
   *   · dưới 25 giây  → "Lửa Đồng" (gấp rút)  ·  dưới 10 giây → "Cháy Tới Chân"
   *   · còn trùm sống → "Đầm Bọ Ngựa" (cao trào)
   *   · dọn sạch địch → quay về bài vui của màn
   */
  updateMusic(G) {
    if (this.over || this.paused) return;
    let want = this.music;
    const boss = (this.enemies || []).some(e => e.alive && e.def.boss);
    if (boss) want = 'climax';
    if (this.timeLeft <= 25) want = 'chase';
    if (this.timeLeft <= 10) want = 'panic';   // vạch cuối: nhạc phải rát hơn nữa
    if (want !== this._nowPlaying) { this._nowPlaying = want; G.music(want); }
  },

  // ── nhập liệu ─────────────────────────────────────────────────────────────
  inBoard(x, y) { return x >= BX && y >= BY && x < BX + COLS * CELL && y < BY + ROWS * CELL; },

  /** Thiên địch nào đang đứng ở điểm chạm này? (chỉ dùng cho búa) */
  enemyAt(x, y) {
    const n = (this.enemies || []).length;
    if (!n) return -1;
    for (let i = 0; i < n; i++) {
      const e = this.enemies[i];
      if (!e || !e.alive) continue;
      const cx = FX_ + FW * ((i + .5) / n);
      if (Math.abs(x - cx) < 58 && y > ENEMY_Y - 66 && y < ENEMY_Y + 52) return i;
    }
    return -1;
  },

  down(G, x, y) {
    if (this.over || this.paused) return;
    // ── BÚA GÕ ĐẦU THIÊN ĐỊCH ─────────────────────────────────────────────
    // Cầm búa mà chỉ đập được viên ngọc thì phí: bọn thiên địch đứng ngay trên
    // bàn cờ, gõ thẳng vào đầu chúng mới đã tay.
    if (this.hammerMode && this.board.phase === 'idle') {
      const ei = this.enemyAt(x, y);
      if (ei >= 0) {
        const foe = this.enemies[ei];
        this.hammerMode = false; this.hammer--;
        const n = this.enemies.length, cx = FX_ + FW * ((ei + .5) / n);
        const dealt = Math.max(40, Math.round(foe.maxHp * .34 + this.might * 12));
        foe.damage(dealt); foe.bonk();
        this.skillFx = { kind: 'hammer', t: 0, dur: .78, x: cx, y: ENEMY_Y, done: false };
        G.sfx('bomb'); G.fx.shake(24);
        G.fx.float(cx, ENEMY_Y - 30, '-' + dealt, { size: 30, fill: '#ffd0d0', stroke: '#5c0010', vy: -70 });
        G.fx.ring(cx, ENEMY_Y, '#ffd76b', 8, 150, .42, 10);
        G.fx.burst(cx, ENEMY_Y, { lite: '#ffd0d0', base: '#e8384f', dark: '#5c0010', spark: '#fff' }, 10, 1.2);
        G.fx.float(cx, ENEMY_Y + 42, t('bonk'), { size: 30, fill: '#ffe066', stroke: '#5c2a00', max: 1.1 });
        this.say(G, 'foeHit');
        if (!foe.alive) {
          this.say(G, 'foeDown', false);
          G.sfx('win'); G.fx.shake(14);
          this.score += 900; this.gold += 34;
          G.fx.float(cx, ENEMY_Y - 56, t('foeDown'), { size: 26, fill: '#8ef08a', stroke: '#0d3a16' });
        }
        return;
      }
    }
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
    ctx.fillStyle = 'rgba(16,9,34,.20)'; ctx.fillRect(...bleed(G));

    if (!COMPACT) this.drawHeroCard(G, ctx);
    else this.drawCompactHero(G, ctx);
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

    this.drawCompactHUD(G, ctx);

    // thanh EXP dưới cùng
    const st = stageFor(S.xp);
    const nx = STAGES.find(s => s.xp > S.xp);
    const prog = nx ? (S.xp - st.xp) / (nx.xp - st.xp) : 1;
    starBar(ctx, 24, H - 34, W - 48, 26, prog, { t: this.t, label: `${tx(st, 'name')}  ·  ${S.xp} EXP` });

    // tên màn
    // Tên màn nhích sang mép trái: chỗ giữa phía trên nay là hàng thiên địch.
    strokeText(ctx, `${t('level')} ${L.index} · ${tx(G.episodeOf(G.levelIndex), 'name')}`, 30, 22,
      { font: FONT.disp(20), fill: '#fff', stroke: '#2b1740', lw: 5, align: 'left', baseline: 'middle' });

    if (this.bravo) this.drawBravo(G, ctx);
    if (this.skillFx) this.drawSkillFx(ctx);
    if (this.tut && this.tutMove) this.drawTutor(ctx);

    // hạt + lời khen
    G.fx.draw(ctx);
    if (this.raidFx) this.drawPredatorRaid(G, ctx);
    if (this.fury > 0) this.drawFuryFx(G, ctx);
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

  // ── thẻ nhân vật bên trái ────────────────────────────────────────────────
  // Kiểu "ảnh cảnh + tấm kính mờ đè lên": cảnh chạy tràn hết thẻ, chữ nằm trên
  // tấm kính sáng ở đáy. Nhờ vậy chữ luôn đọc được dù cảnh sáng hay tối, mà
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

  /** Máy hẹp vẫn giữ chú dế trên sân, đặt dưới dải kỹ năng thay vì xoá hẳn. */
  compactHeroBox(G) {
    if (PORTRAIT) return FY_ < 200 ? { x: 18, y: 72, w: 112, h: 76 } : { x: 18, y: 72, w: 126, h: 124 };
    const w = clamp(FX_ - 40, 86, 132), h = 184;
    return { x: Math.max(14, (FX_ - w) / 2), y: FY_ + FH - h - 8, w, h };
  },

  drawCompactHero(G, ctx) {
    const b = this.compactHeroBox(G), st = stageFor(G.save.xp);
    glassPanel(ctx, b.x, b.y, b.w, b.h, 20,
      { top: 'rgba(202,238,188,.88)', bot: 'rgba(69,104,62,.92)', rim: 'rgba(255,255,255,.72)' });
    ctx.save(); roundRect(ctx, b.x + 5, b.y + 5, b.w - 10, b.h - 10, 15); ctx.clip();
    const glow = ctx.createRadialGradient(b.x + b.w * .5, b.y + b.h * .42, 4, b.x + b.w * .5, b.y + b.h * .42, b.w * .62);
    glow.addColorStop(0, 'rgba(255,246,170,.52)'); glow.addColorStop(1, 'rgba(255,246,170,0)');
    ctx.fillStyle = glow; ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = 'rgba(30,45,24,.24)'; ctx.beginPath(); ctx.ellipse(b.x + b.w / 2, b.y + b.h - 38, b.w * .32, 8, 0, 0, TAU); ctx.fill();
    G.hero.draw(ctx, b.x + b.w / 2, b.y + b.h - 62, heroFit(b.w, st.scale, 52), 1);
    ctx.restore();
    const hp = clamp(this.hp / this.maxHp, 0, 1), bx = b.x + 12, by = b.y + b.h - 18, bw = b.w - 24;
    roundRect(ctx, bx, by, bw, 9, 4.5); ctx.fillStyle = 'rgba(28,14,28,.55)'; ctx.fill();
    ctx.save(); roundRect(ctx, bx + 1, by + 1, bw - 2, 7, 3.5); ctx.clip(); ctx.fillStyle = '#ff7188'; ctx.fillRect(bx + 1, by + 1, (bw - 2) * hp, 7); ctx.restore();
  },

  // ── dải kỹ năng dọc ───────────────────────────────────────────────────────
  drawSkills(G, ctx) {
    const specs = [
      { id: 'sk0', ready: this.breath >= 1, fill: this.breath, ic: icon.chirp, n: '' },
      { id: 'sk1', ready: this.hammer > 0, fill: this.hammer > 0 ? 1 : 0, ic: (c, s) => icon.hammer(c, s), n: this.hammer },
      { id: 'sk2', ready: this.shuffleUse > 0, fill: this.shuffleUse > 0 ? 1 : 0, ic: (c, s) => icon.restart(c, s), n: this.shuffleUse },
    ];
    glassPanel(ctx, STRIPX, SKILLY, PORTRAIT ? 250 : 78, PORTRAIT ? 78 : 246, 20);
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
  drawCompactHUD(G, ctx) {
    const L = G.level, x = HUDX, y = HUDY, w = HUDW;
    const short = PORTRAIT && G.H < 1250, h = short ? 376 : 476;
    card(ctx, x, y, w, h, 24);

    // Điểm vẫn là thông tin chính, nhưng thu gọn phần tiêu đề để nhường chỗ
    // cho bốn chỉ số thành hai hàng chip — mắt không phải quét 4 thanh dài.
    strokeText(ctx, t('score'), x + w / 2, y + 27,
      { font: FONT.disp(27), fill: '#ffa63d', stroke: '#8c3d00', lw: 6, baseline: 'middle' });
    strokeText(ctx, Math.round(this.shownScore).toLocaleString(), x + w / 2, y + 63,
      { font: FONT.disp(34), fill: '#2b1740', stroke: null, lw: 0, baseline: 'middle', shadow: null });

    const st3 = L.star[2];
    const starsNow = this.score >= L.target * L.star[2] ? 3
                   : this.score >= L.target * L.star[1] ? 2
                   : this.score >= L.target ? 1 : 0;
    const sbx = x + 18, sby = y + 89, sbw = w - 36, sbh = 42;
    statBar(ctx, sbx, sby, sbw, sbh, this.score / (L.target * st3), (c, s) => icon.crown(c, s), { label: '' });
    const trackX = sbx + sbh - 4, trackW = sbw - sbh + 4;
    L.star.forEach((mul, i) => {
      const px = trackX + trackW * (mul / st3) - (i === 2 ? 10 : 0), on = starsNow > i;
      ctx.save(); ctx.translate(px, sby + sbh / 2); ctx.globalAlpha = on ? 1 : .42;
      on ? icon.star(ctx, 23 + Math.sin(this.t * 5 + i) * 1.2) : icon.starEmpty(ctx, 19);
      ctx.restore();
    });

    const gap = 8, mw = (w - 36 - gap) / 2, mh = 46;
    const metric = (mx, my, value, label, drawIcon, progress, colours, urgent = false) => {
      ctx.save();
      roundRect(ctx, mx, my + 3, mw, mh, 15); ctx.fillStyle = 'rgba(52,92,130,.24)'; ctx.fill();
      roundRect(ctx, mx, my, mw, mh, 15);
      const mg = ctx.createLinearGradient(0, my, 0, my + mh);
      mg.addColorStop(0, '#f8fcff'); mg.addColorStop(1, '#dceefe');
      ctx.fillStyle = mg; ctx.fill(); ctx.strokeStyle = urgent ? '#ff5470' : 'rgba(76,145,202,.62)';
      ctx.lineWidth = urgent ? 2.8 : 2; ctx.stroke();
      ctx.save(); roundRect(ctx, mx + 2, my + 2, mw - 4, mh - 4, 13); ctx.clip();
      const pg = ctx.createLinearGradient(mx, 0, mx + mw, 0);
      pg.addColorStop(0, colours[0]); pg.addColorStop(1, colours[1]);
      ctx.globalAlpha = .20; ctx.fillStyle = pg;
      ctx.fillRect(mx + 2, my + mh - 7, (mw - 4) * clamp(progress, 0, 1), 5);
      ctx.restore();
      ctx.save(); ctx.translate(mx + 24, my + mh / 2); drawIcon(ctx, 31); ctx.restore();
      strokeText(ctx, label, mx + 46, my + 13,
        { font: FONT.ui(10, 800), fill: '#71829a', stroke: null, lw: 0, align: 'left', baseline: 'middle', shadow: null });
      strokeText(ctx, value, mx + 46, my + 31,
        { font: FONT.disp(18), fill: urgent ? '#d7193f' : '#293653', stroke: null, lw: 0, align: 'left', baseline: 'middle', shadow: null });
      ctx.restore();
    };
    const lowTime = this.timeLeft <= 15;
    const mm = Math.floor(this.timeLeft / 60), ss = Math.floor(this.timeLeft % 60);
    metric(x + 18, y + 148, `${mm}:${String(ss).padStart(2, '0')}`, t('time'), icon.clock,
      this.timeLeft / this.timeMax, lowTime ? ['#ff3157', '#ff8a5c'] : ['#50c8ff', '#5b86e5'], lowTime);
    const hpF = clamp(this.hp / this.maxHp, 0, 1);
    metric(x + 18 + mw + gap, y + 148, String(Math.ceil(this.hp)), t('hp'), icon.heart,
      hpF, ['#ff3157', '#ff8a91'], hpF < .3);
    metric(x + 18, y + 202, String(this.gold), t('gold'), icon.pouch,
      this.gold / 400, ['#ffbd37', '#ff8a1f']);
    metric(x + 18 + mw + gap, y + 202, String(this.movesLeft), t('moves'), (c, s) => {
      c.fillStyle = '#7450b8';
      for (let i = -1; i <= 1; i++) { c.beginPath(); c.arc(i * s * .22, 0, s * .105, 0, TAU); c.fill(); }
    }, this.movesLeft / L.moves, ['#8e72d9', '#6341ad'], this.movesLeft <= 3);

    // Mục tiêu thành một thẻ tóm tắt hai dòng; không còn chữ rời chen giữa
    // thanh Nộ và cụm nút như bố cục cũ.
    const gy = y + 261, gh = 54;
    roundRect(ctx, x + 18, gy, w - 36, gh, 15);
    ctx.fillStyle = 'rgba(238,245,255,.9)'; ctx.fill();
    ctx.strokeStyle = 'rgba(113,135,174,.30)'; ctx.lineWidth = 1.5; ctx.stroke();
    const noun = GOAL_NOUN[G.episodeOf(G.levelIndex).id];
    const nounTxt = noun ? ' ' + tx(noun, 'vi') : '';
    strokeText(ctx, `${t('goal')}: ${L.target.toLocaleString()}${nounTxt}`, x + w / 2, gy + 17,
      { font: FONT.ui(13, 800), fill: '#594b78', stroke: null, lw: 0, baseline: 'middle', shadow: null });
    let status;
    if (this.foesLeft) status = t('foesShort', { n: this.foesLeft });
    else {
      const nxt = [L.target, L.target * L.star[1], L.target * L.star[2]][starsNow];
      status = starsNow >= 3 ? t('starMax') : t('starNext', { n: starsNow + 1, d: Math.ceil(nxt - this.score).toLocaleString() });
    }
    strokeText(ctx, status, x + w / 2, gy + 38,
      { font: FONT.ui(11, 700), fill: this.foesLeft ? '#c0405a' : (starsNow >= 3 ? '#2f9f45' : '#81729c'),
        stroke: null, lw: 0, baseline: 'middle', shadow: null });

    // Thanh Nộ to vừa ngón tay, có icon và phần trăm — nhìn là hiểu trạng thái,
    // không còn một thanh mảnh mang nhãn trơ trọi.
    const rx = x + 18, ry = y + 327, rw = w - 36, rh = 38, on = this.fury > 0;
    roundRect(ctx, rx, ry + 4, rw, rh, rh / 2); ctx.fillStyle = 'rgba(92,23,15,.58)'; ctx.fill();
    roundRect(ctx, rx, ry, rw, rh, rh / 2); ctx.fillStyle = '#311925'; ctx.fill();
    ctx.save(); roundRect(ctx, rx + 2, ry + 2, rw - 4, rh - 4, (rh - 4) / 2); ctx.clip();
    const v = on ? 1 : this.rage, rg = ctx.createLinearGradient(rx, 0, rx + rw, 0);
    rg.addColorStop(0, on ? '#fff0a0' : '#ff8a32'); rg.addColorStop(.52, '#ff5a32'); rg.addColorStop(1, '#e9164d');
    ctx.fillStyle = rg; ctx.fillRect(rx + 2, ry + 2, (rw - 4) * v, rh - 4);
    if (on) {
      ctx.globalAlpha = .25; ctx.fillStyle = '#fff';
      for (let i = -2; i < rw / 18 + 2; i++) ctx.fillRect(rx + i * 18 + ((this.t * 70) % 18), ry, 8, rh);
    }
    ctx.restore();
    ctx.save(); ctx.translate(rx + 23, ry + rh / 2); icon.flame(ctx, 34 + (on ? Math.sin(this.t * 12) * 3 : 0)); ctx.restore();
    strokeText(ctx, on ? t('furyOnShort') : `${t('rage')}  ${Math.round(this.rage * 100)}%`, rx + rw / 2 + 10, ry + rh / 2,
      { font: FONT.ui(13, 800), fill: '#fff', stroke: '#661000', lw: 4, baseline: 'middle', shadow: null });
    ctx.strokeStyle = on ? '#fff0a0' : 'rgba(255,142,70,.8)'; ctx.lineWidth = on ? 3 : 2;
    roundRect(ctx, rx, ry, rw, rh, rh / 2); ctx.stroke();

    for (const id of ['restart', 'resume']) {
      const h2 = this.hits.find(k => k.id === id); if (!h2 || h2.hidden) continue;
      roundBtn(ctx, h2.x + 28, h2.y + 28, 27,
        (c, s) => id === 'restart' ? icon.restart(c, s) : (this.paused ? icon.play(c, s) : icon.pause(c, s)),
        { press: h2.press, hover: h2.hover });
    }

    const fin = this.hits.find(h2 => h2.id === 'finishNow');
    if (fin) {
      const puls = .5 + .5 * Math.sin(this.t * 4);
      ctx.save(); ctx.globalAlpha = .28 + .30 * puls;
      roundRect(ctx, fin.x - 5, fin.y - 5, fin.w + 10, fin.h + 10, 19); ctx.fillStyle = '#8ef08a'; ctx.fill(); ctx.restore();
      textBtn(ctx, fin.x, fin.y, fin.w, fin.h, t('finishNow'),
        { press: fin.press, hover: fin.hover, colour: '#3fbf4a', dark: '#1d6b24', lite: '#8ef08a', font: FONT.disp(20) });
    }
  },

  // Bản HUD cũ giữ lại một thời gian để dễ đối chiếu ảnh/balance khi cần.
  drawHUD(G, ctx) {
    const L = G.level;
    const x = HUDX, y = 60, w = HUDW, h = 528;
    card(ctx, x, y, w, h, 24);

    strokeText(ctx, t('score'), x + w / 2, y + 52,
      { font: FONT.disp(44), fill: '#ffa63d', stroke: '#8c3d00', lw: 8, baseline: 'middle' });
    strokeText(ctx, Math.round(this.shownScore).toLocaleString(), x + w / 2, y + 100,
      { font: FONT.disp(38), fill: '#2b1740', stroke: null, lw: 0, baseline: 'middle', shadow: null });

    const bw = w - 44, bh = 52;
    // ── THANH SAO ────────────────────────────────────────────────────────
    // Trước đây thanh này chỉ chạy tới 100% mục tiêu rồi đứng im, nên chẳng ai
    // biết 2 sao hay 3 sao thì cần bao nhiêu điểm. Nay thanh chạy tới mốc 3 SAO,
    // ba ngôi sao nằm ngay trên thanh và sáng lên khi vượt qua.
    const st3 = L.star[2];
    const starsNow = this.score >= L.target * L.star[2] ? 3
                   : this.score >= L.target * L.star[1] ? 2
                   : this.score >= L.target ? 1 : 0;
    // Không in nhãn phần trăm nữa: nhãn nằm đúng chỗ ngôi sao thứ ba, đè lên nhau.
    statBar(ctx, x + 22, y + 120, bw, bh, this.score / (L.target * st3), (c, s) => icon.crown(c, s),
      { label: '' });
    {
      const bx0 = x + 22 + bh - 4, bw0 = bw - bh + 4, cy0 = y + 120 + bh * .5;
      L.star.forEach((mul, i) => {
        const px = bx0 + bw0 * (mul / st3) - (i === 2 ? 12 : 0);
        const on = starsNow > i;
        ctx.save();
        ctx.translate(px, cy0);
        if (on) {                                    // sao đã ăn: nảy nhẹ + quầng sáng
          ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .5;
          const gg = ctx.createRadialGradient(0, 0, 2, 0, 0, 22);
          gg.addColorStop(0, '#ffe9a8'); gg.addColorStop(1, 'rgba(255,214,110,0)');
          ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(0, 0, 22, 0, TAU); ctx.fill();
          ctx.restore();
          icon.star(ctx, 26 + Math.sin(this.t * 5 + i) * 1.5);
        } else {
          ctx.globalAlpha = .42;
          icon.star(ctx, 19);
        }
        ctx.restore();
      });
    }
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
    strokeText(ctx, `${t('goal')}: ${L.target.toLocaleString()}${nounTxt}`, x + w / 2, y + 402,
      { font: FONT.ui(15, 600), fill: '#6a5a86', stroke: null, lw: 0, baseline: 'middle', shadow: null });
    if (this.foesLeft)
      strokeText(ctx, t('foesAlive', { n: this.foesLeft }), x + w / 2, y + 422,
        { font: FONT.ui(13, 700), fill: '#c0405a', stroke: null, lw: 0, baseline: 'middle', shadow: null });
    else {
      // Không còn địch thì dùng chỗ này nói rõ còn bao nhiêu điểm nữa tới sao kế.
      const nxt = [L.target, L.target * L.star[1], L.target * L.star[2]][starsNow];
      // Dùng CHỮ "1 sao / 2 sao", không dùng ký tự ★ — font đóng gói không có
      // glyph đó nên trên máy khác nó ra ô vuông rỗng.
      const msg = starsNow >= 3 ? t('starMax')
        : t('starNext', { n: starsNow + 1, d: Math.ceil(nxt - this.score).toLocaleString() });
      strokeText(ctx, msg, x + w / 2, y + 422,
        { font: FONT.ui(13, 700), fill: starsNow >= 3 ? '#3fbf4a' : '#8a7aae', stroke: null, lw: 0, baseline: 'middle', shadow: null });
    }

    // 2 nút tròn
    // ── THANH NỘ ────────────────────────────────────────────────────────
    {
      // Thanh Nộ nằm DƯỚI hai dòng "Mục tiêu" và "Còn n thiên địch". Đặt ở 470
      // như trước là đè thẳng lên chữ, đúng chỗ người chơi cần đọc nhất.
      const rx = HUDX + 18, ry = 496, rw = HUDW - 36, rh = 22;
      const on = this.fury > 0;
      roundRect(ctx, rx, ry + 3, rw, rh, rh / 2);
      ctx.fillStyle = 'rgba(90,30,10,.55)'; ctx.fill();
      roundRect(ctx, rx, ry, rw, rh, rh / 2);
      ctx.fillStyle = 'rgba(40,20,30,.85)'; ctx.fill();
      ctx.save(); roundRect(ctx, rx + 2, ry + 2, rw - 4, rh - 4, (rh - 4) / 2); ctx.clip();
      const v = on ? 1 : this.rage;
      const rg = ctx.createLinearGradient(rx, 0, rx + rw, 0);
      if (on) { rg.addColorStop(0, '#fff2a8'); rg.addColorStop(.5, '#ff9a2b'); rg.addColorStop(1, '#ff2f4e'); }
      else { rg.addColorStop(0, '#ff7a3a'); rg.addColorStop(1, '#ff2f4e'); }
      ctx.fillStyle = rg; ctx.fillRect(rx + 2, ry + 2, (rw - 4) * v, rh - 4);
      if (on) {                                    // sọc chạy khi đang nộ
        ctx.globalAlpha = .35; ctx.fillStyle = '#fff';
        for (let i = -2; i < rw / 16 + 2; i++)
          ctx.fillRect(rx + i * 16 + ((this.t * 60) % 16), ry, 7, rh);
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = 'rgba(255,255,255,.45)';
      roundRect(ctx, rx + 5, ry + 4, Math.max(0, (rw - 10) * v), rh * .32, rh * .16); ctx.fill();
      ctx.restore();
      const puls = on ? 1 : this.rage >= .999 ? 1 : .55 + .45 * Math.sin(this.t * 6) * (this.rage > .7 ? 1 : 0);
      ctx.strokeStyle = `rgba(255,150,60,${.5 + .5 * puls})`; ctx.lineWidth = 2.4;
      roundRect(ctx, rx, ry, rw, rh, rh / 2); ctx.stroke();
      strokeText(ctx, on ? t('furyOn') : t('rage'), rx + rw / 2, ry + rh / 2 + 1,
        { font: FONT.ui(13, 800), fill: '#fff', stroke: '#5c1000', lw: 3, baseline: 'middle', shadow: null });
    }

    // nút QUA MÀN NGAY — chỉ hiện khi đã đủ điểm
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
      roundBtn(ctx, h2.x + 28, h2.y + 28, 28,
        (c, s) => id === 'restart' ? icon.restart(c, s) : (this.paused ? icon.play(c, s) : icon.pause(c, s)),
        { press: h2.press, hover: h2.hover });
    }
  },

  /** Khung thoại nhỏ dưới thẻ nhân vật — cốt truyện chạy ngay trong ván. */
  drawBubble(G, ctx) {
    const b = this.bubble;
    const k = clamp(b.t / .22, 0, 1);
    const fade = clamp((b.dur - b.t) / .4, 0, 1);
    const sp = speaker(b.beat.who);
    const text = fill(tx(b.beat, 'vi') || b.beat.vi);
    // Máy hẹp không có thẻ nhân vật, mà bàn cờ nay cao gần chạm đáy → không còn
    // chỗ dưới bàn. Đặt khung thoại NẰM ĐÈ đáy bàn cờ như phụ đề phim.
    const x = COMPACT ? FX_ + 20 : CARDX, w = COMPACT ? FW - 40 : 340;
    const y = COMPACT ? FY_ + FH - 104 : 536;

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
  drawPredatorRaid(G, ctx) {
    const f = this.raidFx, n = this.enemies.length;
    if (!f || !n) return;
    const sx = FX_ + FW * ((f.index + .5) / n), sy = ENEMY_Y - 2;
    // Bản rộng: chúng lao thẳng vào thẻ dế. Bản hẹp không có thẻ riêng nên cú
    // đột kích đáp vào mép bàn gần người chơi nhất, vẫn không che tâm bàn.
    const compact = COMPACT ? this.compactHeroBox(G) : null;
    const tx0 = compact ? compact.x + compact.w / 2 : CARDX + 134;
    const ty0 = compact ? compact.y + compact.h * .58 : 122 + 214;
    drawEnemyRaid(ctx, f, sx, sy, tx0, ty0);
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
      e.draw(ctx, cx, ENEMY_Y - 2, 50);

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

    // ── TIẾNG GÁY quét ngang: sóng âm chạy dọc hàng, không còn luồng lửa ──
    if (f.kind === 'chirp') {
      const sweep = ease.outQuad(clamp(f.t / .55, 0, 1));
      const fade = clamp((f.t - .55) / .40, 0, 1);
      const x0 = FX_ + 8, x1 = x0 + (FW - 16) * sweep;
      const h = CELL * 1.5;
      // 1) dải sáng nền — âm dội dọc hàng, vẽ TRƯỚC để không làm xỉn sóng
      ctx.save();
      ctx.globalAlpha = (1 - fade) * .5;
      const scg = ctx.createLinearGradient(0, f.y - CELL * .62, 0, f.y + CELL * .62);
      scg.addColorStop(0, 'rgba(255,233,168,0)');
      scg.addColorStop(.5, 'rgba(255,206,96,.6)');
      scg.addColorStop(1, 'rgba(255,233,168,0)');
      ctx.fillStyle = scg;
      ctx.fillRect(x0, f.y - CELL * .62, (FW - 16) * sweep, CELL * 1.24);
      ctx.restore();
      // 2) các vòng sóng ")" lan theo đầu sóng, càng lùi càng nhạt và càng rộng
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      for (let i = 0; i < 7; i++) {
        const rx = x1 - i * CELL * .46;
        if (rx <= x0) break;
        const wob = 1 + Math.sin(f.t * 22 - i * 1.1) * .06;
        const rr = (CELL * .95 + i * CELL * .16) * wob;
        ctx.globalAlpha = (1 - fade) * (1 - i / 7) * .95;
        ctx.strokeStyle = i < 2 ? 'rgba(255,255,238,1)' : 'rgba(255,206,96,1)';
        ctx.lineWidth = CELL * (.11 - i * .011);
        ctx.beginPath();
        ctx.ellipse(rx - rr * .82, f.y, rr, h * (.52 + i * .05), 0, -0.92, 0.92);
        ctx.stroke();
      }
      ctx.restore();
      // 3) đầu sóng chói + rung nhẹ dọc hàng
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 1 - fade;
      const hg = ctx.createRadialGradient(x1, f.y, 0, x1, f.y, h * 1.05);
      hg.addColorStop(0, 'rgba(255,255,242,1)');
      hg.addColorStop(.38, 'rgba(255,224,140,.72)');
      hg.addColorStop(1, 'rgba(255,196,80,0)');
      ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(x1, f.y, h * 1.05, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,235,.9)'; ctx.lineWidth = CELL * .05; ctx.lineCap = 'round';
      for (let i = 0; i < 5; i++) {
        const px = lerp(x0, x1, i / 5 + .05);
        const hh = h * (.24 + .20 * Math.abs(Math.sin(f.t * 24 + i * 1.9)));
        ctx.globalAlpha = (1 - fade) * .55;
        ctx.beginPath(); ctx.moveTo(px, f.y - hh); ctx.lineTo(px, f.y + hh); ctx.stroke();
      }
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
      const line = `+${this.gold} ${t('gold')}     +${this.xpGain} EXP`;
      strokeText(ctx, line, W / 2, top + 266,
        { font: FONT.disp(24), fill: '#ffe066', stroke: '#4a2d00', lw: 5, baseline: 'middle' });
    }
    else
    {
      strokeText(ctx, this.over.why, W / 2, top + 258,
        { font: FONT.ui(19, 600), fill: '#ffc0cf', stroke: null, lw: 0, baseline: 'middle', shadow: null });
      if (this.penaltyGold || this.penaltyXp)
        strokeText(ctx, t('penalty', { g: this.penaltyGold || 0, x: this.penaltyXp || 0 }), W / 2, top + 288,
          { font: FONT.disp(22), fill: '#ff7a90', stroke: '#3a0008', lw: 5, baseline: 'middle' });
    }
    ctx.restore();

    if (k >= 1) for (const h of this.hits) {
      if (h.id === 'next')  textBtn(ctx, h.x, h.y, h.w, h.h, t('next') + ' ›', { press: h.press, hover: h.hover, font: FONT.disp(21) });
      if (h.id === 'again') textBtn(ctx, h.x, h.y, h.w, h.h, t('retry'), { press: h.press, hover: h.hover, colour: C.orange, dark: C.orangeDark, lite: C.orangeLite, font: FONT.disp(21) });
      if (h.id === 'retry') textBtn(ctx, h.x, h.y, h.w, h.h, t('retry'), { press: h.press, hover: h.hover, colour: C.orange, dark: C.orangeDark, lite: C.orangeLite, font: FONT.disp(22) });
      if (h.id === 'map')   textBtn(ctx, h.x, h.y, h.w, h.h, t('toMap'), { press: h.press, hover: h.hover, colour: '#7a5fae', dark: '#3b2263', lite: '#c0a0ff', font: FONT.disp(21) });
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

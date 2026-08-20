// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  GHÉP ĐÔI — lật thẻ tìm cặp giống nhau.                                  ║
// ║                                                                          ║
// ║  Luật: cả bàn úp sấp. Lật hai thẻ; giống nhau thì cặp đó biến mất và ăn   ║
// ║  điểm, khác nhau thì úp lại. Lật liên tiếp trúng thì nhân điểm tăng dần,  ║
// ║  nên nhớ mặt thẻ có lợi thật chứ không phải may rủi.                      ║
// ║                                                                          ║
// ║  HÌNH TRÊN THẺ lấy từ chính bộ đá quý và nguyên liệu của game — tất cả    ║
// ║  đều vẽ bằng code trong repo này, nên không mượn hình của ai.             ║
// ║                                                                          ║
// ║  Thẻ dựng kiểu 2.5D: có BỆ dày phía dưới, mặt bóng, và lật bằng cách bóp  ║
// ║  ngang (scaleX) — qua giữa chừng thì đổi mặt, mắt đọc ra là thẻ đang xoay.║
// ╚══════════════════════════════════════════════════════════════════════════╝
import { TAU, clamp, lerp, ease, rgba, shade, strokeText, roundRect, mulberry32 } from '../core/util.js';
import { t, tx } from '../core/i18n.js';
import { Hit, textBtn, glassPanel, statBar, roundBtn, icon, matIcon, frostCard, starBar, resultBanner, C, FONT } from '../ui/widgets.js';
import { drawGem, GEMS, ensureGemSprites } from '../game/gems.js';
import { MAT_LIST } from '../data/gear.js';
import { BREEDS, STAGES, stageFor } from '../data/characters.js';
import { rollMats, addMats, gearBonus } from '../data/gear.js';
import { playLayout, bleed } from '../core/layout.js';
import { perf, Q } from '../core/perf.js';

let FX_ = 384, FY_ = 122, FW = 540, FH = 470, CARDX = 24, HUDX = 950, HUDW = 306, COMPACT = false;

/** 12 mặt thẻ: 6 họ đá quý + 6 nguyên liệu. Đều là hình có sẵn của game. */
const FACES = [
  ...GEMS.map((g, i) => ({ kind: 'gem', i })),
  ...MAT_LIST.map((m) => ({ kind: 'mat', id: m.id, col: m.col })),
];

export default {
  name: 'pair',

  enter(G) {
    const L = G.level;
    this.t = 0;
    this.score = 0; this.gold = 0;
    this.over = null; this.overT = 0; this.paused = false;
    this.bravo = null; this.bravoGold = 0;
    this.hitGoal = false; this.goalT = 0;
    this.streak = 0; this.best = 0;
    this.first = null; this.lock = 0;
    this.shake = 0; this.praise = null; this.praiseT = 0;

    // Cỡ bàn lớn dần theo màn, nhưng chặn trần để không thành bài tập trí nhớ
    // dài lê thê — vui nằm ở nhịp lật nhanh, không ở số lượng thẻ.
    const pairs = clamp(6 + Math.floor((L.index || 1) / 3), 6, 12);
    // Chọn số cột sao cho lưới ĐẦY, không lẻ hàng cuối — lấy cặp ước gần tỉ lệ
    // 4:3 nhất. Lưới lẻ một thẻ nhìn như bị lỗi chứ không ra thiết kế.
    const n = pairs * 2;
    let best = [n, 1], bestErr = 1e9;
    for (let c = 3; c <= 6; c++) {
      if (n % c) continue;
      const r = n / c, err = Math.abs(c / r - 4 / 3);
      if (err < bestErr) { bestErr = err; best = [c, r]; }
    }
    this.cols = best[0]; this.rows = best[1];
    this.flipsLeft = Math.round(pairs * 3.4);
    this.timeMax = (L.time || 110) + (G.save.stats?.spirit || 0) * 6;
    this.timeLeft = this.timeMax;
    this.left = pairs;

    const R = mulberry32((L.index || 1) * 7919 + 13);
    const pool = [];
    for (let i = 0; i < pairs; i++) { pool.push(i, i); }
    for (let i = pool.length - 1; i > 0; i--) {          // xáo Fisher–Yates
      const j = (R() * (i + 1)) | 0; const tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
    }
    this.cards = pool.map((face, i) => ({
      face, up: 0, gone: 0, wrong: 0, seed: R() * TAU,
      c: i % this.cols, r: (i / this.cols) | 0,
    }));

    this.relayout(G);
    G.music('battle');
  },

  relayout(G) {
    // Không dùng playLayout: nó chừa 78px cho DẢI KỸ NĂNG mà màn này không có,
    // nên bảng HUD bị đẩy lọt ra ngoài mép phải.
    const W = G.W;
    COMPACT = W < 1180;
    const CW2 = 250, HW2 = COMPACT ? 286 : 306, G1 = 18, G3 = 18;
    const room = W - (COMPACT ? 0 : CW2 + G1) - HW2 - G3 - 32;
    const bw = clamp(Math.min(this.cols * 116 + 40, room), 320, 660);
    const bh = Math.min(this.rows * 126 + 40, 476);
    const total = (COMPACT ? 0 : CW2 + G1) + bw + G3 + HW2;
    const margin = Math.max(16, Math.round((W - total) / 2));
    CARDX = COMPACT ? -9999 : margin;
    FX_ = margin + (COMPACT ? 0 : CW2 + G1);
    HUDX = FX_ + bw + G3; HUDW = HW2;
    FW = bw; FH = bh; FY_ = 132;
    this.cell = Math.min((FW - 40) / this.cols, (FH - 40) / this.rows);
    // hình trên thẻ là đá quý — dựng sprite đúng cỡ hiển thị cho sắc nét
    ensureGemSprites(this.cell * .70 * (G.dpr || 1.5));
    this.ox = FX_ + (FW - this.cell * this.cols) / 2;
    this.oy = FY_ + (FH - this.cell * this.rows) / 2;
    this.hits = [
      new Hit('pause', G.W - 78, 12, 52, 52, { circle: true, act: () => { this.paused = !this.paused; G.sfx('button'); } }),
      new Hit('quit',  G.W - 140, 12, 52, 52, { circle: true, act: () => G.go('map') }),
    ];
  },

  cardAt(x, y) {
    const c = Math.floor((x - this.ox) / this.cell), r = Math.floor((y - this.oy) / this.cell);
    if (c < 0 || r < 0 || c >= this.cols || r >= this.rows) return null;
    return this.cards.find(k => k.c === c && k.r === r) || null;
  },

  up(G, x, y) {
    if (this.over || this.paused || this.bravo || this.lock > 0) return;
    const k = this.cardAt(x, y);
    if (!k || k.gone || k.up > .5) return;
    k.up = 0.001;
    G.sfx('select');
    if (!this.first) { this.first = k; return; }

    const a = this.first, b = k;
    this.first = null;
    this.flipsLeft--;
    if (a.face === b.face) {
      this.lock = .28;
      a.matched = b.matched = true;
      this.streak++;
      this.best = Math.max(this.best, this.streak);
      const mult = 1 + (this.streak - 1) * .5;
      const gain = Math.round(320 * mult);
      this.score += gain; this.gold += Math.round(gain / 26);
      this.left--;
      const [px, py] = this.centre(a), [qx, qy] = this.centre(b);
      G.fx.float((px + qx) / 2, (py + qy) / 2 - 20, '+' + gain,
        { size: 26 + Math.min(this.streak, 5) * 4, fill: '#fff6c4', stroke: '#6b3a00' });
      for (const [cx, cy] of [[px, py], [qx, qy]]) {
        G.fx.burst(cx, cy, GEMS[a.face % GEMS.length], 10, 1.1);
        G.fx.ring(cx, cy, '#ffe9a8', 6, 110, .38, 9);
      }
      G.sfx('match', Math.min(this.streak - 1, 4));
      if (this.streak >= 2) { this.praise = t('pairStreak', { n: this.streak }); this.praiseT = 1.1; }
      G.hero.react('happy', .6);
      if (!this.hitGoal && this.score >= G.level.target) {
        this.hitGoal = true; this.goalT = 1.6;
        G.sfx('levelup'); G.hero.breatheFire(.9); G.fx.shake(10);
        this.showFinishNow(G);
      }
      if (this.left <= 0) this.startBravo(G, t('pairCleared'));
    } else {
      this.lock = .78;
      a.wrong = b.wrong = 1;
      this.streak = 0;
      this.shake = .35;
      G.sfx('invalid');
    }
  },

  centre(k) { return [this.ox + (k.c + .5) * this.cell, this.oy + (k.r + .5) * this.cell]; },

  showFinishNow(G) {
    if (this.hits.some(h => h.id === 'finishNow')) return;
    this.hits.push(new Hit('finishNow', HUDX + 16, 596, HUDW - 32, 52,
      { act: () => this.startBravo(G, t('outOfMoves')) }));
  },

  startBravo(G, why) {
    if (this.over || this.bravo) return;
    this.hits = this.hits.filter(h => h.id === 'pause' || h.id === 'quit');
    this.bravo = {
      why, t: 0, next: .35, stage: 1,
      flips: Math.max(0, this.flipsLeft), time: Math.max(0, Math.floor(this.timeLeft)),
      perFlip: 18, perSec: 4, gained: 0,
    };
    G.sfx('levelup');
  },

  tickBravo(G, dt) {
    const b = this.bravo;
    b.t += dt;
    if (b.t < b.next) return;
    const pay = (n, col) => {
      this.gold += n; b.gained += n;
      G.fx.float(FX_ + FW / 2, FY_ + FH * .34, `+${n}`, { size: 30, fill: col, stroke: '#4a2d00' });
      G.sfx('coin');
    };
    if (b.stage === 1) {
      if (b.flips > 0) {
        const take = Math.max(1, Math.ceil(b.flips / 6));
        b.flips -= take; this.flipsLeft = b.flips;
        pay(take * b.perFlip, '#ffe066'); b.next = b.t + .13;
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

  checkEnd(G) {
    if (this.over || this.bravo) return;
    const won = this.score >= G.level.target;
    if (this.timeLeft <= 0) return won ? this.startBravo(G, t('outOfTime')) : this.finish(G, false, t('outOfTime'));
    if (this.flipsLeft <= 0) return won ? this.startBravo(G, t('outOfMoves')) : this.finish(G, false, t('outOfMoves'));
  },

  finish(G, win, why = '') {
    this.over = { win, why }; this.overT = 0;
    const L = G.level, S = G.save;
    if (win) {
      const ratio = this.score / L.target;
      this.starsEarned = ratio >= L.star[2] ? 3 : ratio >= L.star[1] ? 2 : 1;
      this.xpGain = 180 + this.starsEarned * 140;
      S.stars[L.id] = Math.max(S.stars[L.id] || 0, this.starsEarned);
      S.best[L.id] = Math.max(S.best[L.id] || 0, this.score);
      S.gold += this.gold; S.xp += this.xpGain;
      this.matsGot = addMats(S, rollMats(2 + this.starsEarned, G.levelIndex));
      if (G.levelIndex + 1 >= S.unlocked) S.unlocked = Math.min(G.levelIndex + 2, G.totalLevels);
      G.hero.xp = S.xp; G.persist();
      G.sess.wins++; G.sess.streak++;
      G.sfx('win'); G.hero.react('happy', 2.4); G.music('nest');
    } else {
      this.starsEarned = 0;
      this.penaltyGold = Math.round(S.gold * 0.12);
      S.gold = Math.max(0, S.gold - this.penaltyGold);
      G.persist();
      G.sess.losses++; G.sess.streak = 0;
      G.sfx('lose'); G.hero.react('hurt', 2);
    }
    const y = 470;
    this.hits = [];
    if (win) {
      this.hits.push(new Hit('next', G.W / 2 - 210, y, 190, 62, { act: () => G.startLevel(Math.min(G.levelIndex + 1, G.totalLevels - 1)) }));
      this.hits.push(new Hit('map', G.W / 2 + 20, y, 190, 62, { act: () => G.go('map') }));
    } else {
      this.hits.push(new Hit('retry', G.W / 2 - 210, y, 190, 62, { act: () => G.startLevel(G.levelIndex) }));
      this.hits.push(new Hit('map', G.W / 2 + 20, y, 190, 62, { act: () => G.go('map') }));
    }
  },

  update(G, dt) {
    this.t += dt;
    G.hero.update(dt);
    G.world.update(dt, 0);
    if (this.praiseT > 0) this.praiseT -= dt;
    if (this.goalT > 0) this.goalT -= dt;
    if (this.shake > 0) this.shake -= dt;
    if (this.over) { this.overT += dt; return; }
    if (this.bravo) { this.tickBravo(G, dt); return; }
    if (this.paused) return;

    // lật mở / úp lại
    for (const k of this.cards) {
      const want = k.gone ? 0 : (k.matched || k.up > 0) ? 1 : 0;
      if (k.up > 0 && k.up < 1 && !k.gone) k.up = Math.min(1, k.up + dt * 5.5);
      if (k.matched && k.up >= 1) { k.gone = Math.min(1, (k.gone || 0.001) + dt * 2.4); }
      if (k.wrong) k.wrong = Math.max(0, k.wrong - dt * 1.6);
    }
    if (this.lock > 0) {
      this.lock -= dt;
      if (this.lock <= 0) for (const k of this.cards) if (!k.matched && k.up > 0) k.up = 0;
    }

    this.timeLeft = Math.max(0, this.timeLeft - dt);
    if (this.timeLeft <= 0) { this.checkEnd(G); return; }
    if (this.flipsLeft <= 0 && this.lock <= 0 && !this.first) this.checkEnd(G);
  },

  key(G, e) { if (e.key === 'Escape' || e.key === 'p') this.paused = !this.paused; },

  draw(G, ctx) {
    const { W, H } = G, S = G.save, L = G.level;
    G.world.draw(ctx);
    ctx.fillStyle = 'rgba(16,9,34,.34)'; ctx.fillRect(...bleed(G));

    strokeText(ctx, `${t('level')} ${L.index} · ${t('pairMode')}`, FX_ + FW / 2, 24,
      { font: FONT.disp(22), fill: '#fff', stroke: '#2b1740', lw: 5, baseline: 'middle' });

    glassPanel(ctx, FX_, FY_, FW, FH, 22,
      { top: 'rgba(12,7,26,.94)', bot: 'rgba(6,3,16,.96)', rim: 'rgba(150,120,255,.5)' });

    ctx.save();
    if (this.shake > 0) ctx.translate(Math.sin(this.t * 60) * this.shake * 10, 0);
    for (const k of this.cards) this.drawCard(ctx, k);
    ctx.restore();

    if (!COMPACT) this.drawHeroCard(G, ctx);
    this.drawHUD(G, ctx);

    const st = stageFor(S.xp), nx = STAGES.find(s2 => s2.xp > S.xp);
    starBar(ctx, 24, H - 56, W - 48, 34, nx ? (S.xp - st.xp) / (nx.xp - st.xp) : 1,
      { t: this.t, label: `${tx(st, 'name')}  ·  ${S.xp} EXP` });

    if (this.praiseT > 0 && this.praise) {
      ctx.save(); ctx.globalAlpha = clamp(this.praiseT, 0, 1);
      strokeText(ctx, this.praise, FX_ + FW / 2, FY_ + 40,
        { font: FONT.disp(30), fill: '#ffe066', stroke: '#3a2000', lw: 6, baseline: 'middle' });
      ctx.restore();
    }
    if (this.bravo) this.drawBravo(G, ctx);
    G.fx.draw(ctx);
    if (this.paused && !this.over) {
      ctx.fillStyle = 'rgba(10,6,22,.7)'; ctx.fillRect(...bleed(G));
      strokeText(ctx, t('paused'), W / 2, H / 2,
        { font: FONT.disp(46), fill: '#fff', stroke: '#2b1740', lw: 8, baseline: 'middle' });
    }
    if (this.over) this.drawOver(G, ctx);
  },

  /** Một tấm thẻ 2.5D: bệ dày · mặt bóng · lật bằng cách bóp ngang. */
  drawCard(ctx, k) {
    if (k.gone >= 1) return;
    const [cx, cy] = this.centre(k);
    const s = this.cell * .86;
    const flip = k.up;                       // 0 = úp sấp, 1 = ngửa
    const squash = Math.abs(Math.cos(flip * Math.PI));   // qua giữa thì mỏng dính
    const showFace = flip > .5;
    const pop = k.gone ? 1 + k.gone * .5 : 1;
    const fade = k.gone ? 1 - k.gone : 1;
    const wob = k.wrong ? Math.sin(this.t * 40) * k.wrong * 5 : 0;

    ctx.save();
    ctx.globalAlpha = fade;
    ctx.translate(cx + wob, cy - (k.gone ? k.gone * 26 : 0));
    ctx.scale(pop, pop);
    ctx.scale(Math.max(.04, squash), 1);
    const w = s, h = s * 1.14, r = s * .16;

    // bệ dày phía dưới — thứ làm thẻ ra khối chứ không phải hình dán
    roundRect(ctx, -w / 2, -h / 2 + 7, w, h, r);
    ctx.fillStyle = showFace ? '#6b4a9a' : '#2a2140'; ctx.fill();

    roundRect(ctx, -w / 2, -h / 2, w, h, r);
    const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    if (showFace) { g.addColorStop(0, '#fff6e2'); g.addColorStop(1, '#dcc8f0'); }
    else { g.addColorStop(0, '#5a4a86'); g.addColorStop(1, '#312452'); }
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = k.wrong ? '#ff5f7a' : showFace ? '#8a5fd0' : '#1d1633';
    ctx.lineWidth = k.wrong ? 4 : 3; ctx.stroke();

    ctx.save();
    roundRect(ctx, -w / 2, -h / 2, w, h, r); ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,.30)';
    roundRect(ctx, -w / 2 + w * .10, -h / 2 + h * .07, w * .80, h * .22, r * .7); ctx.fill();
    if (showFace) {
      ctx.save();
      const F = FACES[k.face % FACES.length];
      if (F.kind === 'gem') drawGem(ctx, F.i, 0, h * .04, s * .70, { t: this.t, seed: k.seed });
      else { ctx.translate(0, h * .04); matIcon(ctx, F.id, s * .62, F.col); }
      ctx.restore();
    } else {
      // hoa văn mặt lưng — chevron lá cỏ, hình riêng của game
      ctx.strokeStyle = 'rgba(190,165,255,.34)'; ctx.lineWidth = s * .045; ctx.lineCap = 'round';
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(-w * .26, i * s * .20 + s * .10);
        ctx.lineTo(0, i * s * .20 - s * .04);
        ctx.lineTo(w * .26, i * s * .20 + s * .10);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255,214,110,.5)';
      ctx.beginPath(); ctx.arc(0, 0, s * .10, 0, TAU); ctx.fill();
    }
    ctx.restore();
    ctx.restore();
  },

  drawHeroCard(G, ctx) {
    const x = CARDX, y = 122, w = 250, h = 400, R = 26;
    ctx.save();
    roundRect(ctx, x, y, w, h, R); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.save(); roundRect(ctx, x + 5, y + 5, w - 10, h - 10, R - 6); ctx.clip();
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, '#8fc6f5'); g.addColorStop(.5, '#cfe9ff'); g.addColorStop(1, '#f7d9a8');
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#79ae62';
    ctx.beginPath(); ctx.ellipse(x + w * .5, y + h * 1.0, w * .85, h * .27, 0, 0, TAU); ctx.fill();
    G.hero.draw(ctx, x + w * .58, y + h * .60, 100, 1);
    const px = x + 12, pw = w - 24, ph = 92, py = y + h - ph - 12;
    frostCard(ctx, px, py, pw, ph, 18);
    ctx.restore();
    strokeText(ctx, tx(BREEDS.find(b => b.id === G.save.breed) || BREEDS[0], 'name'), x + w / 2, py + 30,
      { font: FONT.disp(25), fill: '#fff', stroke: '#2b4a6b', lw: 6, baseline: 'middle' });
    strokeText(ctx, t('pairLeft', { n: this.left }), x + w / 2, py + 62,
      { font: FONT.ui(14, 800), fill: '#12324e', stroke: null, lw: 0, baseline: 'middle', shadow: null });
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 3;
    roundRect(ctx, x + 5, y + 5, w - 10, h - 10, R - 6); ctx.stroke();
    ctx.restore();
  },

  drawHUD(G, ctx) {
    const { H } = G, L = G.level, x = HUDX, w = HUDW, y = 122;
    ctx.save();
    roundRect(ctx, x, y, w, 470, 26);
    const g = ctx.createLinearGradient(0, y, 0, y + 470);
    g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#e6f2fb');
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = 'rgba(120,160,200,.55)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
    strokeText(ctx, t('score'), x + w / 2, y + 44,
      { font: FONT.disp(30), fill: '#f4801f', stroke: '#a34a05', lw: 6, baseline: 'middle' });
    strokeText(ctx, this.score.toLocaleString(), x + w / 2, y + 84,
      { font: FONT.disp(32), fill: '#2b1740', stroke: null, lw: 0, baseline: 'middle', shadow: null });
    statBar(ctx, x + 18, y + 112, w - 36, 44, clamp(this.score / L.target, 0, 1), icon.crown,
      { label: Math.round(clamp(this.score / L.target, 0, 1) * 100) + '%' });
    const mm = Math.floor(this.timeLeft / 60), ss = Math.floor(this.timeLeft % 60);
    statBar(ctx, x + 18, y + 174, w - 36, 44, clamp(this.timeLeft / this.timeMax, 0, 1), icon.clock,
      { label: `${mm}:${String(ss).padStart(2, '0')}` });
    strokeText(ctx, t('pairFlips'), x + 22, y + 250,
      { font: FONT.ui(15, 700), fill: '#6a5a86', stroke: null, lw: 0, align: 'left', baseline: 'middle', shadow: null });
    strokeText(ctx, String(this.flipsLeft), x + w - 22, y + 250,
      { font: FONT.disp(32), fill: this.flipsLeft <= 4 ? '#e8384f' : '#2b1740', stroke: null, lw: 0, align: 'right', baseline: 'middle', shadow: null });
    strokeText(ctx, `${t('goal')}: ${L.target.toLocaleString()}`, x + w / 2, y + 292,
      { font: FONT.ui(15, 600), fill: '#6a5a86', stroke: null, lw: 0, baseline: 'middle', shadow: null });
    if (this.best >= 2)
      strokeText(ctx, t('pairBest', { n: this.best }), x + w / 2, y + 322,
        { font: FONT.ui(14, 700), fill: '#3fbf4a', stroke: null, lw: 0, baseline: 'middle', shadow: null });

    const fin = this.hits.find(h => h.id === 'finishNow');
    if (fin) {
      const puls = .5 + .5 * Math.sin(this.t * 4);
      ctx.save(); ctx.globalAlpha = .30 + .35 * puls;
      roundRect(ctx, fin.x - 5, fin.y - 5, fin.w + 10, fin.h + 10, 19);
      ctx.fillStyle = '#8ef08a'; ctx.fill(); ctx.restore();
      textBtn(ctx, fin.x, fin.y, fin.w, fin.h, t('finishNow'),
        { press: fin.press, hover: fin.hover, colour: '#3fbf4a', dark: '#1d6b24', lite: '#8ef08a', font: FONT.disp(20) });
    }
    for (const id of ['pause', 'quit']) {
      const h = this.hits.find(k => k.id === id); if (!h) continue;
      roundBtn(ctx, h.x + 26, h.y + 26, 26,
        (c, s2) => id === 'quit' ? icon.exit(c, s2) : (this.paused ? icon.play(c, s2) : icon.pause(c, s2)),
        { press: h.press, hover: h.hover });
    }
  },

  drawBravo(G, ctx) {
    const b = this.bravo;
    const lbl = b.stage === 1 ? t('bravoFlips') : b.stage === 2 ? t('bravoTime') : t('bravoDone');
    const k = ease.outBack(clamp(b.t / .3, 0, 1));
    ctx.save();
    ctx.translate(FX_ + FW / 2, FY_ + 56); ctx.scale(k, k);
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

  drawOver(G, ctx) {
    const { W, H } = G;
    const k = clamp(this.overT / .5, 0, 1);
    ctx.fillStyle = `rgba(10,6,22,${.72 * k})`; ctx.fillRect(...bleed(G));
    const s = ease.outBack(k);
    ctx.save();
    ctx.translate(W / 2, H / 2 - 40); ctx.scale(s, s); ctx.translate(-W / 2, -(H / 2 - 40));
    glassPanel(ctx, W / 2 - 300, 140, 600, 300, 28,
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
      strokeText(ctx, `+${this.gold} ${t('gold')}     +${this.xpGain} EXP`, W / 2, 406,
        { font: FONT.disp(24), fill: '#ffe066', stroke: '#4a2d00', lw: 5, baseline: 'middle' });
    else
      strokeText(ctx, this.over.why, W / 2, 400,
        { font: FONT.ui(19, 600), fill: '#ffc0cf', stroke: null, lw: 0, baseline: 'middle', shadow: null });
    ctx.restore();
    if (k >= 1) for (const h of this.hits) {
      if (h.id === 'next') textBtn(ctx, h.x, h.y, h.w, h.h, t('next') + ' ›', { press: h.press, hover: h.hover, font: FONT.disp(24) });
      if (h.id === 'retry') textBtn(ctx, h.x, h.y, h.w, h.h, t('retry'), { press: h.press, hover: h.hover, colour: C.orange, dark: C.orangeDark, lite: C.orangeLite, font: FONT.disp(24) });
      if (h.id === 'map') textBtn(ctx, h.x, h.y, h.w, h.h, t('toMap'), { press: h.press, hover: h.hover, colour: '#7a5fae', dark: '#3b2263', lite: '#c0a0ff', font: FONT.disp(24) });
    }
  },
};

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  MÀN BẮN ĐÁ — chế độ chơi thứ hai, dùng chung HUD·đồng hồ·phần thưởng.   ║
// ╚══════════════════════════════════════════════════════════════════════════╝
import { TAU, clamp, lerp, ease, rand, randInt, rgba, strokeText, roundRect } from '../core/util.js';
import { t, tx } from '../core/i18n.js';
import { Hit, card, glassPanel, statBar, roundBtn, textBtn, starBar, icon, C, FONT } from '../ui/widgets.js';
import { BubbleBoard, ORB, drawOrb, buildOrbSprites } from '../game/bubble.js';
import { BREEDS, STAGES, stageFor } from '../data/characters.js';
import { pickBeat, SPEAKERS, GOAL_NOUN } from '../data/beats.js';
import { rollMats, addMats, MATS } from '../data/gear.js';
import { Enemy, ATK } from '../game/enemy.js';
import { playLayout } from '../core/layout.js';

const ENEMY_Y = 82;
const COLS = 10;
let R = 24, FW = 524, FH = 524, DEATH_Y = 418;

// Mốc bố cục tính lại theo bề ngang thiết bị — xem core/layout.js.
let FX_ = 384, FY_ = 122, BX = 406, BY = 136, CARDX = 24, HUDX = 950, HUDW = 306, COMPACT = false;
let LAUNCH = { x: 646, y: 608 };
function relayout(W) {
  R = W < 1240 ? 22 : 24;
  FW = COLS * R * 2 + 44; FH = FW;
  DEATH_Y = FH - 106;
  const L = playLayout(W, FW, FH);
  FX_ = L.boardX; FY_ = 122;
  BX = FX_ + 14 + 8; BY = FY_ + 14;
  CARDX = L.cardX; HUDX = L.hudX; HUDW = L.hudW; COMPACT = L.compact;
  LAUNCH = { x: BX + COLS * R, y: BY + DEATH_Y + 54 };
}


export default {
  name: 'shoot',

  enter(G) {
    relayout(G.W);
    const L = G.level;
    buildOrbSprites();
    this.t = 0;
    this.score = 0; this.gold = 0;
    this.shotsLeft = L.shots ?? 40;
    this.timeMax = L.time + (G.save.stats.spirit || 0) * 6 + (G.save.breed === 'frost' ? 12 : 0);
    this.timeLeft = this.timeMax;
    this.over = null; this.overT = 0; this.paused = false;
    this.aim = -Math.PI / 2;
    this.praise = ''; this.praiseT = 0;
    this.shownScore = 0; this.warnT = 0;
    this.hitGoal = false; this.goalT = 0;
    this.chain = 0;
    this.bubble = null; this.saidOnce = new Set();

    // ── THIÊN ĐỊCH cũng xuất hiện ở chế độ Bắn Đá ──────────────────────
    this.enemies = (L.enemies || []).map(([kind, tier]) => new Enemy(kind, tier));
    this.maxHp = 300 + (G.save.stats.spirit || 0) * 20 + (G.save.breed === 'frost' ? 40 : 0);
    this.hp = this.maxHp;
    this.hitFlash = 0;
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
      cols: COLS, rows: 13, radius: R, colours: L.shootColours ?? 4,
      startRows: L.startRows ?? 3, deathY: DEATH_Y,
    });
    this.wire(G);

    G.world.setTheme({ sky: L.sky, hill: L.hill, mount: L.mount });
    G.hero.onFire = (x, y, dx, dy) => G.fx.fire(x, y, dx, dy, 4);

    this.hits = [
      new Hit('pause', G.W - 78, 12, 52, 52, { circle: true, act: () => this.togglePause(G) }),
      new Hit('exit',  G.W - 142, 12, 52, 52, { circle: true, act: () => { G.sfx('button'); G.go('map'); } }),
      new Hit('restart', HUDX + HUDW * .23, 508, 64, 64, { circle: true, act: () => G.startLevel(G.levelIndex) }),
      new Hit('resume', HUDX + HUDW * .54, 508, 64, 64, { circle: true, act: () => this.togglePause(G) }),
      new Hit('swap', LAUNCH.x + 74, LAUNCH.y - 26, 52, 52, { circle: true, act: () => { this.board.swapNext(); G.sfx('select'); } }),
      new Hit('quit', G.W / 2 - 110, G.H / 2 + 6, 220, 54,
        { act: () => { G.sfx('button'); G.go('map'); }, hidden: true }),
      new Hit('quit', G.W / 2 - 110, G.H / 2 + 6, 220, 54, { act: () => { G.sfx('button'); G.go('map'); }, hidden: true }),
      new Hit('howto', G.W / 2 - 110, G.H / 2 + 78, 220, 54, { act: () => { G.sfx('button'); G.go('help', 'map'); }, hidden: true }),
    ];
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
      if (!e.popped) { this.chain = 0; this.checkEnd(G); return; }
      this.chain++;
      const mult = 1 + (this.chain - 1) * .35;
      const gained = Math.round((e.popped * 70 + e.dropped * 150) * mult);
      this.score += gained;
      this.gold += Math.round((e.popped * 2 + e.dropped * 5) * mult);

      const px = BX + (e.x ?? 0), py = BY + (e.y ?? 0);
      for (const p of b.popping) G.fx.burst(BX + p.x, BY + p.y, ORB[p.type], 9, .9);
      G.fx.float(px, py, '+' + gained, { size: 26 + Math.min(e.popped, 8) * 2, fill: '#fff6c4', stroke: '#6b3a00' });
      G.fx.ring(px, py, ORB[e.type].lite, 10, 70 + e.popped * 8, .4, 6);
      // ── đánh vào thiên địch ────────────────────────────────────────
      const foe = this.enemies.find(e => e.alive);
      if (foe) {
        const dealt = foe.damage(Math.round((e.popped * 18 + e.dropped * 30) * mult));
        const fx0 = FX_ + FW * ((this.enemies.indexOf(foe) + .5) / this.enemies.length);
        G.fx.float(fx0, ENEMY_Y - 12, '-' + dealt, { size: 24, fill: '#ffd0d0', stroke: '#5c0010', vy: -60 });
        if (!foe.alive) {
          this.say(G, 'foeDown', false);
          G.sfx('bomb'); G.fx.shake(14);
          G.fx.ring(fx0, ENEMY_Y, '#ffe066', 12, 150, .6, 10);
          this.score += 900; this.gold += 60;
        } else this.say(G, 'foeHit');
      }
      G.sfx('match', Math.min(this.chain - 1, 6));
      G.fx.shake(2 + e.popped * .6 + e.dropped * .8);

      if (e.dropped >= 3 || e.popped >= 6) {
        const p = t('praise');
        this.praise = p[clamp((e.dropped >= 6 ? 4 : e.dropped >= 3 ? 3 : 2) - 1, 0, p.length - 1)];
        this.praiseT = 1.2;
        G.sfx('combo', 3); G.hero.react('happy', .9); this.say(G, 'combo');
      }
      if (!this.hitGoal && this.score >= G.level.target) {
        this.hitGoal = true; this.goalT = 1.6;
        G.sfx('levelup'); G.hero.breatheFire(.9); G.fx.shake(10); this.say(G, 'goalHit');
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

  checkEnd(G) {
    if (this.over) return;
    if (this.hp <= 0) return this.finish(G, false, t('foeKilled'));
    if (this.board.isClear) return this.finish(G, true);                      // dọn sạch = thắng luôn
    if (this.board.lowestY >= DEATH_Y) return this.finish(G, false, t('breached'));
    if (this.timeLeft <= 0) return this.finish(G, this.score >= G.level.target, t('outOfTime'));
    if (this.shotsLeft <= 0 && !this.board.shot)
      return this.finish(G, this.score >= G.level.target, t('outOfShots'));
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
      if (Math.random() < .5) S.food += 1;
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
      G.sfx('lose'); G.hero.react('hurt', 2); G.fx.shake(16); this.say(G, 'lose');
    }

    this.hits = this.hits.filter(h => h.id === 'pause');
    const y = 470;
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
    G.world.update(dt, Math.sin(this.t * .2) * 18);
    G.hero.update(dt);
    this.shownScore = lerp(this.shownScore, this.score, 1 - Math.pow(.001, dt));
    if (this.praiseT > 0) this.praiseT -= dt;
    if (this.bubble) { this.bubble.t += dt; if (this.bubble.t >= this.bubble.dur) this.bubble = null; }
    if (this.goalT > 0) this.goalT -= dt;
    if (this.over) { this.overT += dt; this.board.update(dt); return; }
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

  /** Nhạc đổi theo tình huống: dưới 25 giây thì chuyển sang bài gấp rút. */
  updateMusic(G) {
    if (this.over || this.paused) return;
    const want = this.timeLeft <= 25 ? 'chase' : this.music;
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
  hover(G, x, y) { if (!this.over && !this.paused && !this.board.shot) this._aimAt(x, y); },
  down(G, x, y) { if (!this.over && !this.paused) this._aimAt(x, y); },
  move(G, x, y) { if (!this.over && !this.paused) this._aimAt(x, y); },
  /**
   * Bắn theo GÓC cho trước. Tách riêng khỏi `up()` để công cụ đo cân bằng
   * (dev/balance-shoot.mjs) gọi trực tiếp được mà không phải giả lập toạ độ chuột.
   */
  fireAt(G, ang) {
    if (this.over || this.paused || this.board.shot || this.shotsLeft <= 0) return false;
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
    ctx.fillStyle = 'rgba(16,9,34,.30)'; ctx.fillRect(0, 0, W, H);

    if (!COMPACT) this.drawHeroCard(G, ctx);

    this.drawEnemies(G, ctx);

    glassPanel(ctx, FX_, FY_, FW, FH, 22,
      { top: 'rgba(12,7,26,.94)', bot: 'rgba(6,3,16,.96)', rim: 'rgba(150,120,255,.5)' });

    ctx.save();
    roundRect(ctx, FX_ + 8, FY_ + 8, FW - 16, FH - 16, 16); ctx.clip();

    // vạch tử thần
    const dy = BY + DEATH_Y;
    ctx.save();
    ctx.strokeStyle = `rgba(255,90,110,${.45 + .3 * Math.sin(this.t * 4)})`;
    ctx.lineWidth = 3; ctx.setLineDash([12, 9]); ctx.lineDashOffset = -this.t * 30;
    ctx.beginPath(); ctx.moveTo(FX_ + 12, dy); ctx.lineTo(FX_ + FW - 12, dy); ctx.stroke();
    ctx.restore();

    this.board.draw(ctx, BX, BY);
    this.drawAim(ctx);
    ctx.restore();

    this.drawLauncher(G, ctx);
    this.drawHUD(G, ctx);

    const st = stageFor(S.xp);
    const nx = STAGES.find(v => v.xp > S.xp);
    const prog = nx ? (S.xp - st.xp) / (nx.xp - st.xp) : 1;
    starBar(ctx, 24, H - 56, W - 48, 34, prog, { t: this.t, label: `${tx(st, 'name')}  ·  ${S.xp} EXP` });

    strokeText(ctx, `${t('level')} ${L.index} · ${t('modeShoot')}`, FX_ + FW / 2, 24,
      { font: FONT.disp(22), fill: '#fff', stroke: '#2b1740', lw: 5, baseline: 'middle' });

    G.fx.draw(ctx);
    if (this.praiseT > 0) {
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

    if (this.bubble) drawBubble(ctx, this.bubble, COMPACT ? FX_ + 6 : CARDX, COMPACT ? FW - 12 : 340, COMPACT ? FY_ + FH + 10 : 536);
    const p = this.hits.find(h => h.id === 'pause');
    if (p) roundBtn(ctx, p.x + 26, p.y + 26, 26, (c, s) => icon.pause(c, s), { press: p.press, hover: p.hover });
    const ex = this.hits.find(h => h.id === 'exit');
    if (ex) roundBtn(ctx, ex.x + 26, ex.y + 26, 26, (c, s) => icon.exit(c, s), { press: ex.press, hover: ex.hover });
    if (this.hitFlash > 0) {
      ctx.save();
      ctx.globalAlpha = clamp(this.hitFlash / .45, 0, 1) * .55;
      const vg = ctx.createRadialGradient(W / 2, H / 2, H * .28, W / 2, H / 2, H * .78);
      vg.addColorStop(0, 'rgba(255,20,50,0)'); vg.addColorStop(1, 'rgba(255,20,50,.95)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    if (this.paused) this.drawPause(G, ctx);
    if (this.over) this.drawOver(G, ctx);
  },

  /** Đường ngắm chấm chấm, có tính một lần nảy tường. */
  drawAim(ctx) {
    if (this.board.shot || this.over) return;
    let x = LAUNCH.x, y = LAUNCH.y;
    let vx = Math.cos(this.aim), vy = Math.sin(this.aim);
    const L = BX, Rr = BX + this.board.W;
    ctx.save();
    ctx.setLineDash([7, 9]); ctx.lineDashOffset = -this.t * 46;
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
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
    ctx.stroke();
    ctx.setLineDash([]);
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

  drawHeroCard(G, ctx) {
    const x = CARDX, y = 122, w = 250, h = 400;
    ctx.save();
    roundRect(ctx, x, y, w, h, 26); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.save(); roundRect(ctx, x + 6, y + 6, w - 12, h - 12, 20); ctx.clip();
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, '#bfe4ff'); g.addColorStop(.55, '#dff0ff'); g.addColorStop(1, '#f5e6c8');
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(150,190,140,.55)';
    ctx.beginPath(); ctx.ellipse(x + w * .3, y + h * .92, w * .6, h * .18, 0, 0, TAU); ctx.fill();
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

    for (const id of ['restart', 'resume']) {
      const h2 = this.hits.find(k => k.id === id); if (!h2) continue;
      roundBtn(ctx, h2.x + 32, h2.y + 32, 32,
        (c, s) => id === 'restart' ? icon.restart(c, s) : (this.paused ? icon.play(c, s) : icon.pause(c, s)),
        { press: h2.press, hover: h2.hover });
    }
  },

  drawPause(G, ctx) {
    const { W, H } = G;
    ctx.fillStyle = 'rgba(10,6,22,.7)'; ctx.fillRect(0, 0, W, H);
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
    ctx.fillStyle = `rgba(10,6,22,${.72 * k})`; ctx.fillRect(0, 0, W, H);
    const s = ease.outBack(k);
    ctx.save();
    ctx.translate(W / 2, H / 2 - 40); ctx.scale(s, s); ctx.translate(-W / 2, -(H / 2 - 40));
    glassPanel(ctx, W / 2 - 300, 140, 600, 300, 28,
      this.over.win ? { top: 'rgba(30,60,44,.95)', bot: 'rgba(12,26,20,.97)', rim: 'rgba(120,240,150,.5)' }
                    : { top: 'rgba(60,20,36,.95)', bot: 'rgba(24,8,16,.97)', rim: 'rgba(240,90,120,.45)' });
    strokeText(ctx, this.over.win ? t('cleared') : t('failed'), W / 2, 200,
      { font: FONT.disp(48), fill: this.over.win ? '#8ef08a' : '#ff7a90', stroke: '#12060f', lw: 9, baseline: 'middle' });
    for (let i = 0; i < 3; i++) {
      const on = i < this.starsEarned;
      const pop = on ? ease.outBack(clamp((this.overT - .35 - i * .22) / .35, 0, 1)) : 1;
      ctx.save();
      ctx.translate(W / 2 + (i - 1) * 82, 268); ctx.scale(pop, pop);
      on ? icon.star(ctx, 74) : icon.starEmpty(ctx, 66);
      ctx.restore();
    }
    strokeText(ctx, `${t('finalScore')}: ${this.score.toLocaleString()}`, W / 2, 336,
      { font: FONT.disp(28), fill: '#fff', stroke: '#12060f', lw: 6, baseline: 'middle' });
    if (this.over.win)
    {
      strokeText(ctx, `+${this.gold} ${t('gold')}     +${this.xpGain} EXP`, W / 2, 376,
        { font: FONT.disp(24), fill: '#ffe066', stroke: '#4a2d00', lw: 5, baseline: 'middle' });
      if (this.matsGot) drawMatsRow(ctx, W / 2, 412, this.matsGot);
    }
    else
      strokeText(ctx, this.over.why, W / 2, 382,
        { font: FONT.ui(19, 600), fill: '#ffc0cf', stroke: null, lw: 0, baseline: 'middle', shadow: null });
    ctx.restore();

    if (k >= 1) for (const h of this.hits) {
      if (h.id === 'next') textBtn(ctx, h.x, h.y, h.w, h.h, t('next') + ' ›', { press: h.press, hover: h.hover, font: FONT.disp(24) });
      if (h.id === 'retry') textBtn(ctx, h.x, h.y, h.w, h.h, t('retry'), { press: h.press, hover: h.hover, colour: C.orange, dark: C.orangeDark, lite: C.orangeLite, font: FONT.disp(24) });
      if (h.id === 'map') textBtn(ctx, h.x, h.y, h.w, h.h, t('toMap'), { press: h.press, hover: h.hover, colour: '#7a5fae', dark: '#3b2263', lite: '#c0a0ff', font: FONT.disp(24) });
    }
  },
};

/** Khung thoại — dùng chung kiểu với màn Ghép Đá. */
function drawBubble(ctx, b, x, w, y) {
  const k = clamp(b.t / .22, 0, 1), fade = clamp((b.dur - b.t) / .4, 0, 1);
  const sp = SPEAKERS[b.beat.who] || SPEAKERS.rom;
  const text = tx(b.beat, 'vi') || b.beat.vi;

  ctx.save();
  ctx.globalAlpha = fade;
  ctx.translate(x + w / 2, y); const e = ease.outBack(k); ctx.scale(e, e); ctx.translate(-(x + w / 2), -y);
  ctx.font = FONT.ui(15, 600);
  const lines = [];
  let line = '';
  for (const word of String(text).split(' ')) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > w - 34 && line) { lines.push(line); line = word; } else line = test;
  }
  if (line) lines.push(line);
  const h = 44 + lines.length * 21;
  roundRect(ctx, x, y, w, h, 16);
  ctx.fillStyle = 'rgba(14,8,26,.93)'; ctx.fill();
  ctx.strokeStyle = sp.col; ctx.lineWidth = 2.5; ctx.stroke();
  strokeText(ctx, tx(sp, 'name'), x + 16, y + 20,
    { font: FONT.disp(17), fill: sp.col, stroke: sp.ink, lw: 4, align: 'left', baseline: 'middle' });
  ctx.font = FONT.ui(15, 600); ctx.fillStyle = '#efe8ff';
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  lines.forEach((ln, i) => ctx.fillText(ln, x + 16, y + 44 + i * 21));
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
    ctx.save();
    ctx.beginPath(); ctx.arc(x - 18, y, 13, 0, TAU);
    ctx.fillStyle = m.col; ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.restore();
    strokeText(ctx, '+' + n, x + 6, y,
      { font: FONT.disp(20), fill: '#fff', stroke: '#1a0f30', lw: 4, baseline: 'middle' });
  });
}

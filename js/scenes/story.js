// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  HOẠT CẢNH — mỗi hồi một bức tranh vẽ bằng code, chữ hiện dần theo nhịp. ║
// ║  Nhạc và bảng màu đổi theo cảm xúc của hồi (vui · buồn · cao trào · gấp). ║
// ╚══════════════════════════════════════════════════════════════════════════╝
import { TAU, clamp, lerp, ease, rand, rgba, shade, strokeText, mulberry32 } from '../core/util.js';
import { t, tx, getLang } from '../core/i18n.js';
import { Hit, textBtn, glassPanel, FONT, C } from '../ui/widgets.js';
import { Cricket, drawEgg } from '../game/cricket.js';
import { BREEDS } from '../data/characters.js';

const CPS = 42;                        // ký tự mỗi giây

export default {
  name: 'story',

  enter(G, arg) {
    this.act = arg?.act;
    this.after = arg?.after || (() => G.go('map'));
    this.t = 0; this.line = 0; this.chars = 0; this.done = false;
    this.picked = null;              // id lựa chọn người chơi đã chọn
    this._choices = G.save.choices || {};
    this.R = mulberry32(1234);
    this.motes = Array.from({ length: 26 }, () => ({ x: this.R(), y: this.R(), r: .6 + this.R() * 2.2, ph: this.R() * TAU, v: .02 + this.R() * .06 }));
    this.hero = new Cricket(BREEDS.find(b => b.id === (G.save.breed || 'ember')) || BREEDS[0], Math.max(600, G.save.xp));
    this.hits = [
      new Hit('skip', G.W - 172, G.H - 78, 148, 52, { act: () => this.finish(G) }),
      new Hit('next', G.W / 2 - 110, G.H - 82, 220, 58, { act: () => this.advance(G) }),
    ];
    const ch = this.act?.choice;
    if (ch) ch.opts.forEach((o, i) => this.hits.push(
      new Hit('opt' + i, G.W / 2 - 330 + i * 340, G.H - 96, 320, 66,
              { hidden: true, act: () => this.choose(G, o.id) })));
    if (this.act) {
      G.world.setTheme({ sky: this.act.sky, hill: this.act.hill, mount: this.act.mount });
      G.audio.play(G.songs[this.act.music] || G.songs.nest);
    }
  },

  get lines() {
    const A = this.act;
    // 1) vừa chọn xong → kể đoạn kết của lựa chọn đó
    // 2) hồi sau đó → nếu có bản thay thế theo lựa chọn cũ thì dùng bản ấy
    let src = A;
    if (this.picked) src = A.choice.outcome[this.picked];
    else if (A.byChoice) {
      for (const [key, map] of Object.entries(A.byChoice)) {
        const made = this._choices?.[key];
        if (made && map[made]) { src = map[made]; break; }
      }
    }
    return getLang() === 'en' ? (src.lines_en || src.lines) : src.lines;
  },
  /** Đang đứng ở câu cuối và hồi này có lựa chọn chưa quyết? */
  get awaitingChoice() {
    const A = this.act;
    return !!A.choice && !this.picked
        && this.line === this.lines.length - 1
        && this.chars >= (this.lines[this.line] || '').length;
  },

  choose(G, id) {
    const A = this.act, out = A.choice.outcome[id];
    this.picked = id;
    this.line = 0; this.chars = 0;
    G.save.choices = G.save.choices || {};
    G.save.choices[A.choice.key] = id;
    G.save.gold = Math.max(0, G.save.gold + (out.gold || 0));
    G.save.food += out.food || 0;
    G.persist();
    G.sfx(out.gold > 0 ? 'levelup' : 'warn');
    for (const h of this.hits) if (h.id.startsWith('opt')) h.hidden = true;
  },

  advance(G) {
    if (this.awaitingChoice) return;          // phải chọn xong mới đi tiếp
    const full = this.lines[this.line] || '';
    if (this.chars < full.length) { this.chars = full.length; return; }   // bấm lần 1: hiện hết câu
    if (this.line < this.lines.length - 1) { this.line++; this.chars = 0; G.sfx('select'); }
    else this.finish(G);
  },
  finish(G) {
    if (this.done) return;
    this.done = true;
    G.sfx('button');
    G.save.seenStory[this.act.id] = true;
    G.persist();
    this.after();
  },
  down() {}, up(G) { this.advance(G); },
  key(G, e) { if (e.key === ' ' || e.key === 'Enter') this.advance(G); if (e.key === 'Escape') this.finish(G); },

  update(G, dt) {
    this.t += dt;
    this.hero.update(dt);
    const full = this.lines[this.line] || '';
    if (this.chars < full.length) this.chars = Math.min(full.length, this.chars + CPS * dt);
    for (const m of this.motes) { m.y -= m.v * dt; if (m.y < -.05) { m.y = 1.05; m.x = Math.random(); } }
  },

  draw(G, ctx) {
    const { W, H } = G, A = this.act, T = this.t;

    // ── bầu trời theo cảm xúc ───────────────────────────────────────────────
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, A.sky[0]); sky.addColorStop(.5, A.sky[1]); sky.addColorStop(1, A.sky[2]);
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

    PAINT[A.scene]?.call(this, G, ctx, W, H, T);

    // bụi sáng lơ lửng — tông theo cảm xúc
    const moteCol = A.mood === 'urgent' ? '#ffd08a' : A.mood === 'sad' ? '#cfc4b0'
                  : A.mood === 'climax' ? '#c8b0ff' : '#fff8d0';
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = moteCol;
    for (const m of this.motes) {
      ctx.globalAlpha = .22 + .28 * Math.sin(T * 2 + m.ph);
      ctx.beginPath(); ctx.arc(m.x * W, m.y * H, m.r, 0, TAU); ctx.fill();
    }
    ctx.restore();

    // ── khung chữ ───────────────────────────────────────────────────────────
    const bx = 120, by = H - 236, bw = W - 240, bh = 150;
    glassPanel(ctx, bx, by, bw, bh, 20, { top: 'rgba(18,10,34,.90)', bot: 'rgba(8,4,20,.95)' });
    strokeText(ctx, tx(A, 'title'), bx + 26, by + 34,
      { font: FONT.disp(24), fill: '#ffe066', stroke: '#3a1d6e', lw: 5, align: 'left', baseline: 'middle' });

    const full = this.lines[this.line] || '';
    const shown = full.slice(0, Math.floor(this.chars));
    wrap(ctx, shown, bx + 26, by + 74, bw - 52, 27, FONT.ui(19, 600), '#f0e8ff');
    if (this.chars < full.length && Math.sin(T * 14) > 0) {
      ctx.fillStyle = '#ffe066';
      ctx.fillRect(bx + 26, by + 74 + 12, 9, 3);
    }

    // chấm tiến độ câu
    for (let i = 0; i < this.lines.length; i++) {
      ctx.fillStyle = i <= this.line ? '#ffe066' : 'rgba(255,255,255,.25)';
      ctx.beginPath(); ctx.arc(bx + bw - 24 - (this.lines.length - 1 - i) * 16, by + bh - 20, 4.5, 0, TAU); ctx.fill();
    }

    // ── nút lựa chọn ───────────────────────────────────────────────────────
    const wait = this.awaitingChoice;
    for (const h of this.hits) if (h.id.startsWith('opt')) h.hidden = !wait;
    if (wait) {
      const ch = A.choice;
      ctx.save();
      ctx.font = FONT.disp(25);
      const qw = ctx.measureText(tx(ch, 'ask')).width + 56;
      glassPanel(ctx, W / 2 - qw / 2, H - 306, qw, 52, 16,
        { top: 'rgba(58,30,10,.94)', bot: 'rgba(28,14,4,.96)', rim: 'rgba(255,214,110,.6)' });
      ctx.restore();
      strokeText(ctx, tx(ch, 'ask'), W / 2, H - 280,
        { font: FONT.disp(25), fill: '#ffe066', stroke: '#3a1d6e', lw: 6, baseline: 'middle' });
      ch.opts.forEach((o, i) => {
        const h = this.hits.find(x => x.id === 'opt' + i);
        textBtn(ctx, h.x, h.y, h.w, h.h, tx(o, 'vi'), {
          press: h.press, hover: h.hover, font: FONT.disp(21),
          colour: i === 0 ? '#3fbf4a' : '#e8384f',
          dark:   i === 0 ? '#1d6b24' : '#8c0f22',
          lite:   i === 0 ? '#8ef08a' : '#ff9aa8',
        });
      });
    } else {
      const nx = this.hits.find(h => h.id === 'next');
      const last = this.line === this.lines.length - 1 && this.chars >= full.length;
      textBtn(ctx, nx.x, nx.y, nx.w, nx.h, last ? t('storyGo') : t('storyNext'),
        { press: nx.press, hover: nx.hover, font: FONT.disp(24) });
    }
    const sk = this.hits.find(h => h.id === 'skip');
    textBtn(ctx, sk.x, sk.y, sk.w, sk.h, t('storySkip'),
      { press: sk.press, hover: sk.hover, colour: '#5b5f74', dark: '#33374a', lite: '#9aa0b6', font: FONT.disp(19) });
  },
};

// ── các bức tranh ───────────────────────────────────────────────────────────
const hillPath = (ctx, W, H, y, amp, seed) => {
  const R = mulberry32(seed);
  ctx.beginPath(); ctx.moveTo(-40, H);
  for (let x = -40; x <= W + 40; x += 60) ctx.lineTo(x, y + Math.sin(x * .006 + seed) * amp - R() * amp * .5);
  ctx.lineTo(W + 40, H); ctx.closePath();
};
/** Bóng côn trùng đơn giản — dùng cho các cảnh đám đông. */
const bug = (ctx, x, y, s, col, legs = true) => {
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.ellipse(x, y, s, s * .58, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(x + s * .9, y - s * .1, s * .46, 0, TAU); ctx.fill();
  if (legs) {
    ctx.strokeStyle = col; ctx.lineWidth = Math.max(1.2, s * .16); ctx.lineCap = 'round';
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath(); ctx.moveTo(x + i * s * .5, y + s * .3);
      ctx.lineTo(x + i * s * .8, y + s * 1.05); ctx.stroke();
    }
  }
  ctx.strokeStyle = col; ctx.lineWidth = Math.max(1, s * .12);
  ctx.beginPath(); ctx.moveTo(x + s * 1.1, y - s * .4);
  ctx.quadraticCurveTo(x + s * 1.9, y - s * 1.3, x + s * 2.3, y - s * 1.0); ctx.stroke();
};

const PAINT = {
  egg(G, ctx, W, H, T) {
    ctx.fillStyle = 'rgba(255,246,214,.35)';
    ctx.beginPath(); ctx.arc(W * .72, H * .22, 120 + Math.sin(T) * 6, 0, TAU); ctx.fill();
    hillPath(ctx, W, H * 1.05, H * .48, 26, 3); ctx.fillStyle = shade(this.act.hill, -.10); ctx.fill();
    hillPath(ctx, W, H * 1.05, H * .58, 18, 9); ctx.fillStyle = shade(this.act.hill, -.34); ctx.fill();
    const glow = ctx.createRadialGradient(W * .40, H * .40, 10, W * .40, H * .40, 220);
    glow.addColorStop(0, `rgba(255,236,170,${.35 + .18 * Math.sin(T * 2)})`);
    glow.addColorStop(1, 'rgba(255,220,150,0)');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(W * .40, H * .40, 220, 0, TAU); ctx.fill();
    drawEgg(ctx, this.hero.breed, W * .40, H * .40, 92, { t: T, wobble: .5, crack: clamp(T * .18, 0, .9), glow: .9 });
    for (let i = 0; i < 26; i++) {
      const x = W * .08 + i * 22, sw = Math.sin(T * 1.6 + i) * 5;
      ctx.strokeStyle = shade(this.act.hill, -.5); ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, H * .64);
      ctx.quadraticCurveTo(x + sw * .5, H * .58, x + sw, H * .52); ctx.stroke();
    }
  },
  raid(G, ctx, W, H, T) {
    hillPath(ctx, W, H * 1.05, H * .50, 20, 5); ctx.fillStyle = '#9c8d4e'; ctx.fill();
    hillPath(ctx, W, H * 1.05, H * .60, 14, 11); ctx.fillStyle = '#6f6438'; ctx.fill();
    // đàn kiến nối đuôi
    for (let i = 0; i < 12; i++) {
      const x = ((T * 26 + i * 96) % (W + 200)) - 100;
      bug(ctx, x, H * .58 + Math.sin(i * 1.7) * 8, 13, 'rgba(40,20,10,.85)');
    }
    // kho hạt trống
    ctx.fillStyle = 'rgba(50,34,16,.9)';
    ctx.beginPath(); ctx.ellipse(W * .74, H * .48, 78, 34, 0, Math.PI, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(30,18,8,.9)'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(W * .74, H * .48, 78, Math.PI, TAU); ctx.stroke();
    // Rơm đứng lặng
    ctx.save(); ctx.globalAlpha = .95;
    this.hero.draw(ctx, W * .26, H * .58, 122, 1); ctx.restore();
  },
  road(G, ctx, W, H, T) {
    for (let k = 0; k < 3; k++) {
      hillPath(ctx, W, H * 1.05, H * (.40 + k * .08), 22 - k * 4, 3 + k * 7);
      ctx.fillStyle = shade(this.act.hill, -.05 - k * .16); ctx.fill();
    }
    // lối mòn
    ctx.strokeStyle = 'rgba(216,195,154,.9)'; ctx.lineWidth = 16; ctx.lineCap = 'round';
    ctx.setLineDash([26, 18]); ctx.lineDashOffset = -T * 20;
    ctx.beginPath(); ctx.moveTo(W * .05, H * .64);
    ctx.quadraticCurveTo(W * .45, H * .54, W * .92, H * .44); ctx.stroke();
    ctx.setLineDash([]);
    const cols = ['#8a5a2c', '#3d6f8e', '#33693c', '#402a63'];
    for (let i = 0; i < 4; i++) {
      const p = (T * .06 + i * .07) % 1;
      const x = lerp(W * .10, W * .86, p), y = lerp(H * .62, H * .44, p);
      bug(ctx, x, y + Math.sin(T * 5 + i) * 3, 14 - p * 4, cols[i]);
    }
  },
  marsh(G, ctx, W, H, T) {
    hillPath(ctx, W, H * 1.05, H * .50, 24, 13); ctx.fillStyle = '#2c3a2a'; ctx.fill();
    ctx.fillStyle = 'rgba(20,30,26,.85)'; ctx.fillRect(0, H * .58, W, H * .42);
    if (Math.sin(T * 2.3) > .93) { ctx.fillStyle = 'rgba(220,215,255,.30)'; ctx.fillRect(0, 0, W, H); }
    // bóng bọ ngựa khổng lồ
    ctx.save();
    ctx.translate(W * .70, H * .42); ctx.scale(1.35, 1.35);
    ctx.fillStyle = 'rgba(12,20,12,.92)';
    ctx.beginPath(); ctx.ellipse(0, 20, 26, 60, .1, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, -52, 22, 17, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(12,20,12,.92)'; ctx.lineWidth = 13; ctx.lineCap = 'round';
    for (const sx of [-1, 1]) {
      const sw = Math.sin(T * 2 + sx) * .18;
      ctx.beginPath(); ctx.moveTo(sx * 18, -22);
      ctx.quadraticCurveTo(sx * (60 + sw * 20), -46, sx * 74, -92); ctx.stroke();
    }
    ctx.fillStyle = '#ffe066';
    for (const sx of [-1, 1]) { ctx.beginPath(); ctx.arc(sx * 9, -56, 5.5, 0, TAU); ctx.fill(); }
    ctx.restore();
    ctx.save(); ctx.globalAlpha = .9;
    this.hero.draw(ctx, W * .24, H * .60, 118, 1); ctx.restore();
    bug(ctx, W * .34, H * .62, 13, 'rgba(30,50,30,.9)');
    bug(ctx, W * .42, H * .65, 12, 'rgba(40,30,70,.9)');
  },
  fire(G, ctx, W, H, T) {
    hillPath(ctx, W, H * 1.05, H * .52, 18, 7); ctx.fillStyle = '#3b1b12'; ctx.fill();
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 34; i++) {
      const x = ((i * 71 + T * 40) % (W + 120)) - 60;
      const hgt = 60 + Math.sin(T * 6 + i) * 34 + (i % 3) * 26;
      const g = ctx.createLinearGradient(x, H * .54, x, H * .54 - hgt);
      g.addColorStop(0, 'rgba(255,160,40,.85)'); g.addColorStop(.6, 'rgba(255,90,20,.45)');
      g.addColorStop(1, 'rgba(255,60,10,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x - 20, H * .54);
      ctx.quadraticCurveTo(x, H * .54 - hgt * .7, x + Math.sin(T * 8 + i) * 10, H * .54 - hgt);
      ctx.quadraticCurveTo(x + 16, H * .54 - hgt * .5, x + 22, H * .54);
      ctx.closePath(); ctx.fill();
    }
    for (let i = 0; i < 30; i++) {
      const x = ((i * 131 + T * 150) % (W + 200)) - 100;
      const y = H * .54 - ((i * 53 + T * 190) % (H * .50));
      ctx.globalAlpha = .5; ctx.fillStyle = '#ffcf6b';
      ctx.beginPath(); ctx.arc(x, y, 2.4, 0, TAU); ctx.fill();
    }
    ctx.restore();
    ctx.save();
    ctx.translate(Math.sin(T * 22) * 3, 0);
    this.hero.draw(ctx, W * .30, H * .62, 126, 1);
    ctx.restore();
    bug(ctx, W * .43, H * .64, 13, 'rgba(20,10,6,.9)');
    bug(ctx, W * .52, H * .66, 12, 'rgba(20,10,6,.9)');
  },
  well(G, ctx, W, H, T) {
    const mx = W * .76, my = H * .20;
    const mg = ctx.createRadialGradient(mx, my, 0, mx, my, 190);
    mg.addColorStop(0, 'rgba(230,238,255,.55)'); mg.addColorStop(1, 'rgba(200,215,255,0)');
    ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(mx, my, 190, 0, TAU); ctx.fill();
    ctx.fillStyle = '#f2f6ff'; ctx.beginPath(); ctx.arc(mx, my, 44, 0, TAU); ctx.fill();
    hillPath(ctx, W, H * 1.05, H * .52, 16, 21); ctx.fillStyle = '#2e3a4a'; ctx.fill();
    // giếng đá
    ctx.fillStyle = '#4a5566';
    ctx.beginPath(); ctx.ellipse(W * .50, H * .56, 96, 34, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#5f6d82';
    ctx.beginPath(); ctx.ellipse(W * .50, H * .52, 96, 32, 0, 0, TAU); ctx.fill();
    const wg = ctx.createRadialGradient(W * .50, H * .52, 4, W * .50, H * .52, 74);
    wg.addColorStop(0, `rgba(190,235,255,${.6 + .2 * Math.sin(T * 1.6)})`);
    wg.addColorStop(1, 'rgba(120,180,220,.15)');
    ctx.fillStyle = wg; ctx.beginPath(); ctx.ellipse(W * .50, H * .52, 74, 22, 0, 0, TAU); ctx.fill();
    // cóc già
    ctx.save();
    ctx.translate(W * .74, H * .56); ctx.scale(1.1, 1.1);
    ctx.fillStyle = '#3f4a2c';
    ctx.beginPath(); ctx.ellipse(0, 0, 58, 40, 0, 0, TAU); ctx.fill();
    for (const sx of [-1, 1]) {
      ctx.beginPath(); ctx.ellipse(sx * 22, -30, 17, 15, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffcf5a'; ctx.beginPath(); ctx.arc(sx * 22, -30, 8, 0, TAU); ctx.fill();
      ctx.fillStyle = '#1a1a0c';
      ctx.beginPath(); ctx.ellipse(sx * 22, -30, 3, 8, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#3f4a2c';
    }
    ctx.restore();
    this.hero.draw(ctx, W * .26, H * .60, 116, 1);
  },
  newgrass(G, ctx, W, H, T) {
    for (let k = 0; k < 3; k++) {
      hillPath(ctx, W, H * 1.05, H * (.40 + k * .08), 24 - k * 5, 5 + k * 9);
      ctx.fillStyle = shade(this.act.hill, .04 - k * .18); ctx.fill();
    }
    // rãnh nước
    ctx.strokeStyle = 'rgba(140,215,255,.9)'; ctx.lineWidth = 13; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(W * .92, H * .42);
    ctx.quadraticCurveTo(W * .55, H * .52, W * .06, H * .64); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 4;
    ctx.setLineDash([18, 22]); ctx.lineDashOffset = T * 34;
    ctx.beginPath(); ctx.moveTo(W * .92, H * .42);
    ctx.quadraticCurveTo(W * .55, H * .52, W * .06, H * .64); ctx.stroke();
    ctx.setLineDash([]);
    for (let i = 0; i < 40; i++) {
      const x = W * .02 + i * 32, sw = Math.sin(T * 1.5 + i) * 6;
      ctx.strokeStyle = shade(this.act.hill, -.42); ctx.lineWidth = 3.4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, H * .68);
      ctx.quadraticCurveTo(x + sw * .5, H * .62, x + sw, H * .56); ctx.stroke();
    }
    this.hero.draw(ctx, W * .30, H * .62, 128, 1);
    bug(ctx, W * .46, H * .64, 13, '#3d6f8e');
    bug(ctx, W * .56, H * .66, 13, '#33693c');
  },
};

function wrap(ctx, text, x, y, maxW, lh, font, fill) {
  ctx.save();
  ctx.font = font; ctx.fillStyle = fill; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  let line = '', yy = y;
  for (const w of String(text).split(' ')) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, x, yy); line = w; yy += lh; }
    else line = test;
  }
  if (line) ctx.fillText(line, x, yy);
  ctx.restore();
}

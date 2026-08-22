// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  HOẠT CẢNH — mỗi hồi một bức tranh vẽ bằng code, chữ hiện dần theo nhịp. ║
// ║  Nhạc và bảng màu đổi theo cảm xúc của hồi (vui · buồn · cao trào · gấp). ║
// ╚══════════════════════════════════════════════════════════════════════════╝
import { TAU, clamp, lerp, ease, rand, rgba, shade, strokeText, mulberry32 } from '../core/util.js';
import { t, tx, getLang } from '../core/i18n.js';
import { fill, cast } from '../core/lore.js';
import { Hit, textBtn, glassPanel, FONT, C } from '../ui/widgets.js';
import { Cricket, drawEgg } from '../game/cricket.js';
import { BREEDS } from '../data/characters.js';
import { bleed } from '../core/layout.js';

const CPS = 42;                        // ký tự mỗi giây

export default {
  name: 'story',

  enter(G, arg) {
    this.act = arg?.act;
    this.after = arg?.after || (() => G.go('map'));
    this.t = 0; this.line = 0; this.chars = 0; this.done = false;
    setTimeout(() => this.emote(), 0);   // biểu cảm mở hồi, sau khi hero đã dựng
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
      G.world.setTheme({ sky: this.act.sky, hill: this.act.hill, mount: this.act.mount, biome: this.act.biome });
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
    // thay {hero}/{singer}/… bằng tên thật của dàn vai đang chơi
    return (getLang() === 'en' ? (src.lines_en || src.lines) : src.lines).map(fill);
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
    if (this.line < this.lines.length - 1) { this.line++; this.chars = 0; G.sfx('select'); this.emote(); }
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

  /**
   * Vẽ nhân vật kèm LÚC LẮC. Nhịp lắc đổi theo tông của hồi: vui thì nhún nảy,
   * buồn thì gục gặc chậm, gấp gáp thì run. Cùng một hình vẽ, chỉ khác nhịp —
   * mà nhìn ra ngay là nó đang có tâm trạng gì.
   */
  wob(ctx, x, y, s, face = 1) {
    const M = this.act.mood;
    const fast = M === 'urgent' || M === 'climax';
    const low  = M === 'sad' || M === 'solemn';
    const sp = fast ? 6.2 : low ? 1.1 : 2.4;
    const amp = fast ? .055 : low ? .022 : .040;
    const T = this.t;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(T * sp) * amp);
    ctx.translate(0, -Math.abs(Math.sin(T * sp * .5)) * s * (low ? .01 : .035));
    this.hero.draw(ctx, 0, 0, s, face);
    ctx.restore();
  },

  /** Biểu cảm khớp tông của hồi — gọi lại mỗi lần sang câu mới. */
  emote() {
    const M = this.act.mood;
    const m = M === 'joy' || M === 'warm' ? 'happy'
            : M === 'sad' ? 'hurt'
            : M === 'urgent' || M === 'climax' ? 'proud'
            : 'idle';
    if (m !== 'idle') this.hero.react(m, 1.4);
  },

  draw(G, ctx) {
    const { W, H } = G, A = this.act, T = this.t;

    // ── bầu trời theo cảm xúc ───────────────────────────────────────────────
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, A.sky[0]); sky.addColorStop(.5, A.sky[1]); sky.addColorStop(1, A.sky[2]);
    ctx.fillStyle = sky; ctx.fillRect(...bleed(G));

    // Nhân vật thời tiết — mặt trời / mây / trăng CÓ MẶT, lúc lắc và đổi biểu
    // cảm theo tông của hồi. Vẽ sau bầu trời và trước cảnh vật để nó ở trên
    // trời chứ không đè lên đồi núi.
    drawWeather(ctx, W, H, T, A.weather || A.mood);

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
    strokeText(ctx, fill(tx(A, 'title')), bx + 26, by + 34,
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
      const ask = fill(tx(ch, 'ask'));
      const qw = ctx.measureText(ask).width + 56;
      glassPanel(ctx, W / 2 - qw / 2, H - 306, qw, 52, 16,
        { top: 'rgba(58,30,10,.94)', bot: 'rgba(28,14,4,.96)', rim: 'rgba(255,214,110,.6)' });
      ctx.restore();
      strokeText(ctx, ask, W / 2, H - 280,
        { font: FONT.disp(25), fill: '#ffe066', stroke: '#3a1d6e', lw: 6, baseline: 'middle' });
      ch.opts.forEach((o, i) => {
        const h = this.hits.find(x => x.id === 'opt' + i);
        textBtn(ctx, h.x, h.y, h.w, h.h, fill(tx(o, 'vi')), {
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
    // nhân vật chính đứng lặng
    ctx.save(); ctx.globalAlpha = .95;
    this.wob(ctx, W * .26, H * .58, 122, 1); ctx.restore();
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
    // Đoàn đi đường: nhân vật chính đi ĐẦU, ba vai phụ nối đuôi phía sau. Trước
    // đây bốn màu đóng cứng nên trứng tím vẫn thấy con tím dẫn đoàn dù người
    // chơi nuôi giống khác — nhìn là biết truyện với hình không cùng một mạch.
    const C4 = cast();
    const cols = [C4.outsider, C4.bruiser, C4.singer, C4.hero].map(wingOf);
    for (let i = 0; i < 4; i++) {
      const p = (T * .06 + i * .07) % 1;
      const x = lerp(W * .10, W * .86, p), y = lerp(H * .62, H * .44, p);
      bug(ctx, x, y + Math.sin(T * 5 + i) * 3, 14 - p * 4, cols[i]);
    }
  },
  marsh(G, ctx, W, H, T) {
    hillPath(ctx, W, H * 1.05, H * .50, 24, 13); ctx.fillStyle = '#2c3a2a'; ctx.fill();
    ctx.fillStyle = 'rgba(20,30,26,.85)'; ctx.fillRect(0, H * .58, W, H * .42);
    if (Math.sin(T * 2.3) > .93) { ctx.fillStyle = 'rgba(220,215,255,.30)'; ctx.fillRect(...bleed(G)); }
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
    this.wob(ctx, W * .24, H * .60, 118, 1); ctx.restore();
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
    this.wob(ctx, W * .30, H * .62, 126, 1);
    ctx.restore();
    bug(ctx, W * .43, H * .64, 13, 'rgba(20,10,6,.9)');
    bug(ctx, W * .52, H * .66, 12, 'rgba(20,10,6,.9)');
  },
  well(G, ctx, W, H, T) {
    // Mặt trăng trơn ở đây đã bỏ — drawWeather() vẽ trăng CÓ MẶT ở gần đúng
    // chỗ này, để cả hai thì thành hai mặt trăng chồng lên nhau.
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
    this.wob(ctx, W * .26, H * .60, 116, 1);
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
    this.wob(ctx, W * .30, H * .62, 128, 1);
    bug(ctx, W * .46, H * .64, 13, wingOf(cast().singer));
    bug(ctx, W * .56, H * .66, 13, wingOf(cast().bruiser));
  },
};

/** Màu cánh của một giống — dùng cho bóng dế nhỏ trong hoạt cảnh. */
const wingOf = (breedId) => (BREEDS.find(b => b.id === breedId) || BREEDS[0]).wing;

/**
 * NHÂN VẬT THỜI TIẾT.
 *
 * Cùng một bộ khung — thân tròn, hai mắt, một miệng — nhưng đổi hình dáng và
 * nét mặt theo tông của hồi. Nhờ vậy bầu trời cũng "diễn" chứ không chỉ là
 * mảng gradient, mà chỉ tốn thêm một hàm.
 *
 *   joy/warm  mặt trời cười, tia sáng quay
 *   hope      mặt trời ló sau mây, mỉm cười
 *   sad       mây xám mắt rũ, mưa lất phất
 *   urgent    mây giông cau mày, chớp giật
 *   climax    mây tím mắt trợn
 *   solemn    trăng lim dim
 */
const WEATHER = {
  joy:    { kind: 'sun',   col: '#ffd23f', face: 'smile' },
  warm:   { kind: 'sun',   col: '#ffc46a', face: 'smile' },
  hope:   { kind: 'peek',  col: '#ffd88a', face: 'soft'  },
  sad:    { kind: 'rain',  col: '#9aa4bd', face: 'droop' },
  urgent: { kind: 'storm', col: '#8a7fb0', face: 'angry' },
  climax: { kind: 'storm', col: '#7a6aa8', face: 'wide'  },
  solemn: { kind: 'moon',  col: '#e8e2ff', face: 'calm'  },
  // Nắng cháy: mặt trời đỏ quạch, cau mày, tia sáng gắt.
  drought:{ kind: 'sun',   col: '#ff9a2b', face: 'angry' },
};

/** Nét mặt — mắt, chân mày, miệng, má hồng. */
function wface(ctx, r, kind, T, ink) {
  const open = Math.sin(T * .9) > .97 ? 0 : 1;        // chớp mắt thưa
  const ex = r * .34, ey = -r * .06;
  for (const d of [-1, 1]) {
    ctx.save();
    ctx.translate(d * ex, ey);
    ctx.fillStyle = ink;
    if (!open || kind === 'calm') {
      ctx.strokeStyle = ink; ctx.lineWidth = r * .07; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-r * .12, 0); ctx.quadraticCurveTo(0, -r * .10, r * .12, 0); ctx.stroke();
    } else if (kind === 'droop') {
      ctx.beginPath(); ctx.ellipse(0, 0, r * .085, r * .062, 0, 0, TAU); ctx.fill();
    } else if (kind === 'wide') {
      ctx.beginPath(); ctx.arc(0, 0, r * .13, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill();
      ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(0, 0, r * .065, 0, TAU); ctx.fill();
    } else {
      ctx.beginPath(); ctx.ellipse(0, 0, r * .085, r * .10, 0, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
  if (kind === 'angry' || kind === 'droop') {
    ctx.strokeStyle = ink; ctx.lineWidth = r * .075; ctx.lineCap = 'round';
    const up = kind === 'angry' ? -1 : 1;
    for (const d of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(d * (ex - r * .15), ey - r * .22 + up * r * .05);
      ctx.lineTo(d * (ex + r * .13), ey - r * .30 - up * r * .05);
      ctx.stroke();
    }
  }
  ctx.strokeStyle = ink; ctx.lineWidth = r * .075; ctx.lineCap = 'round';
  ctx.beginPath();
  const my = r * .30;
  if (kind === 'smile') ctx.arc(0, my - r * .10, r * .20, .25, Math.PI - .25);
  else if (kind === 'soft') ctx.arc(0, my - r * .06, r * .14, .35, Math.PI - .35);
  else if (kind === 'droop') ctx.arc(0, my + r * .12, r * .18, Math.PI + .3, -.3);
  else if (kind === 'angry') { ctx.moveTo(-r * .18, my); ctx.lineTo(r * .18, my - r * .06); }
  else if (kind === 'wide') { ctx.ellipse(0, my, r * .11, r * .14, 0, 0, TAU); }
  else { ctx.moveTo(-r * .12, my); ctx.lineTo(r * .12, my); }
  ctx.stroke();
  ctx.save(); ctx.globalAlpha = .30; ctx.fillStyle = '#ff7d9c';
  for (const d of [-1, 1]) { ctx.beginPath(); ctx.ellipse(d * r * .58, r * .18, r * .13, r * .08, 0, 0, TAU); ctx.fill(); }
  ctx.restore();
}

function drawWeather(ctx, W, H, T, mood) {
  const w = WEATHER[mood] || WEATHER.joy;
  const cx = W * .80, cy = H * .19, r = Math.min(W, H) * .085;
  const bob = Math.sin(T * 1.4) * r * .10;             // lúc lắc
  ctx.save();
  ctx.translate(cx, cy + bob);
  ctx.rotate(Math.sin(T * .9) * .07);

  if (w.kind === 'sun' || w.kind === 'peek' || w.kind === 'moon') {
    const glow = w.kind === 'moon' ? '#e8e2ff' : w.col;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const gl = ctx.createRadialGradient(0, 0, r * .6, 0, 0, r * 3.1);
    gl.addColorStop(0, rgba(glow, .38)); gl.addColorStop(1, rgba(glow, 0));
    ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(0, 0, r * 3.1, 0, TAU); ctx.fill();
    ctx.restore();
    if (w.kind !== 'moon') {
      ctx.save(); ctx.rotate(T * .25);
      ctx.strokeStyle = rgba(w.col, .8); ctx.lineWidth = r * .12; ctx.lineCap = 'round';
      for (let i = 0; i < 10; i++) {
        const a = i / 10 * TAU, k = 1 + .1 * Math.sin(T * 3 + i);
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r * 1.22, Math.sin(a) * r * 1.22);
        ctx.lineTo(Math.cos(a) * r * 1.55 * k, Math.sin(a) * r * 1.55 * k);
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU);
    const sg = ctx.createRadialGradient(-r * .3, -r * .35, r * .1, 0, 0, r);
    if (w.kind === 'moon') { sg.addColorStop(0, '#fffef8'); sg.addColorStop(1, '#e2d9c0'); }
    else { sg.addColorStop(0, '#fffdf0'); sg.addColorStop(1, w.col); }
    ctx.fillStyle = sg; ctx.fill();
    ctx.strokeStyle = shade(w.kind === 'moon' ? '#e2d9c0' : w.col, -.35);
    ctx.lineWidth = r * .07; ctx.stroke();
    if (w.kind === 'moon') {
      ctx.fillStyle = 'rgba(190,175,150,.40)';
      for (const [ox, oy, rr] of [[-.34, -.24, .17], [.30, .26, .12]]) {
        ctx.beginPath(); ctx.arc(ox * r, oy * r, rr * r, 0, TAU); ctx.fill();
      }
    }
    if (w.kind !== 'peek') wface(ctx, r, w.face, T, w.kind === 'moon' ? '#6b5a3a' : '#7a4a05');
  }

  if (w.kind !== 'sun' && w.kind !== 'moon') {
    const base = w.kind === 'peek' ? '#ffffff' : w.col;
    const PUFF = [[-.78, .18, .60], [0, -.20, .80], [.80, .16, .56], [0, .34, .70]];
    ctx.fillStyle = base;
    ctx.beginPath();
    for (const [ox, oy, rr] of PUFF) ctx.arc(ox * r, oy * r, rr * r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = shade(base, -.30); ctx.lineWidth = r * .06;
    for (const [ox, oy, rr] of PUFF.slice(0, 3)) {
      ctx.beginPath(); ctx.arc(ox * r, oy * r, rr * r, 0, TAU); ctx.stroke();
    }
    if (w.kind !== 'peek') wface(ctx, r * .9, w.face, T, shade(base, -.55));
  }
  ctx.restore();

  // mưa / chớp vẽ NGOÀI phép xoay để hạt rơi thẳng đứng
  if (w.kind === 'rain') {
    ctx.save();
    ctx.strokeStyle = 'rgba(170,200,240,.7)'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    for (let i = 0; i < 10; i++) {
      const k = (T * .8 + i / 10) % 1;
      const rx = cx + (i - 4.5) * r * .24, ry = cy + r * .9 + k * r * 2.6;
      ctx.globalAlpha = Math.sin(k * Math.PI);
      ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx - r * .05, ry + r * .22); ctx.stroke();
    }
    ctx.restore();
  } else if (w.kind === 'storm') {
    const flash = Math.pow(Math.max(0, Math.sin(T * 1.6)), 26);
    if (flash > .02) {
      ctx.save();
      ctx.globalAlpha = flash; ctx.fillStyle = '#fff6c4';
      ctx.beginPath();
      ctx.moveTo(cx + r * .10, cy + r * .9);
      ctx.lineTo(cx - r * .25, cy + r * 1.7);
      ctx.lineTo(cx + r * .02, cy + r * 1.7);
      ctx.lineTo(cx - r * .18, cy + r * 2.5);
      ctx.lineTo(cx + r * .40, cy + r * 1.5);
      ctx.lineTo(cx + r * .10, cy + r * 1.5);
      ctx.lineTo(cx + r * .38, cy + r * .9);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }
}

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

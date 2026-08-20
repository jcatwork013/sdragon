// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  MÀN MỞ ĐẦU — đêm đồng cỏ.                                               ║
// ║                                                                          ║
// ║  Dựng theo lớp, xa → gần: trời · quầng sáng · sao · sao băng · trăng ·    ║
// ║  dải mây mỏng · 3 tầng núi · dải sương · lùm tre · đá quý trôi · ĐOM ĐÓM ·║
// ║  mỏm đá + đèn lồng + nhân vật · bụi cỏ tiền cảnh · vignette · tiêu đề.    ║
// ║                                                                          ║
// ║  Mọi lớp NỀN tô theo bleed(G) chứ không phải (0,0,W,H): máy tỉ lệ lạ thì  ║
// ║  khung vẽ rộng hơn dải giao diện, tô theo dải sẽ hở viền đen ở mép.       ║
// ╚══════════════════════════════════════════════════════════════════════════╝
import { TAU, rand, lerp, clamp, ease, rgba, strokeText, mulberry32 } from '../core/util.js';
import { t, getLang, toggleLang, LANGS } from '../core/i18n.js';
import { Hit, textBtn, roundBtn, icon, C, FONT, glassPanel } from '../ui/widgets.js';
import { Cricket } from '../game/cricket.js';
import { BREEDS } from '../data/characters.js';
import { VERSION } from '../core/version.js';
import { drawGem, GEMS } from '../game/gems.js';
import { bleed } from '../core/layout.js';
import { perf, Q } from '../core/perf.js';

const R = mulberry32(1337);
// toạ độ chuẩn hoá 0..1, tới lúc vẽ mới trải ra theo khung vẽ thật
const stars = Array.from({ length: 110 }, () => {
  const k = R();
  return { x: R(), y: R() * .66, r: .5 + k * k * 2.4, ph: R() * TAU, big: k > .93 };
});
const motes = Array.from({ length: 16 }, () => ({ x: R(), y: R(), s: .35 + R() * .5, ph: R() * TAU, g: (R() * 6) | 0, v: .02 + R() * .05 }));
// Đom đóm — thứ khiến đêm đồng cỏ "sống". Bay theo quỹ đạo Lissajous nên
// đường bay lượn vòng tự nhiên, không cần mô phỏng gì nặng.
const flies = Array.from({ length: 22 }, () => ({
  x: R(), y: .32 + R() * .62, ax: .02 + R() * .05, ay: .015 + R() * .035,
  fx: .18 + R() * .5, fy: .24 + R() * .6, ph: R() * TAU, ph2: R() * TAU,
  r: 1.7 + R() * 2.2, hue: 52 + R() * 22, blink: .5 + R() * 1.6,
}));
const reeds = Array.from({ length: 34 }, () => ({ x: R(), h: .10 + R() * .20, lean: R() * .5 - .25, ph: R() * TAU, s: .6 + R() * .8 }));

export default {
  name: 'title',
  enter(G) {
    this.t = 0;
    this.hero = new Cricket(BREEDS.find(b => b.id === (G.save.breed || 'ember')) || BREEDS[0], 9800);
    this.hero.onFire = (x, y, dx, dy) => G.fx.fire(x, y, dx, dy, 3);
    this.fireAt = 2.4;
    this.shootAt = 3 + Math.random() * 5;      // sao băng
    this.shoot = null;
    const cx = G.W / 2, hasSave = !!G.save.breed;
    this.hits = [
      new Hit('play',  cx - 150, 470, 300, 66, { act: () => hasSave ? G.go('map') : G.go('egg') }),
      new Hit('new',   cx - 150, 552, 300, 52, { act: () => G.confirmNew(), hidden: !hasSave }),
      new Hit('help',  G.W - 218, 26, 52, 52, { circle: true, act: () => { G.sfx('button'); G.go('help', 'title'); } }),
      new Hit('lang',  G.W - 152, 26, 52, 52, { circle: true, act: () => { toggleLang(); G.sfx('button'); } }),
      new Hit('music', G.W -  86, 26, 52, 52, { circle: true, act: () => { G.toggleMute(); } }),
    ];
    G.audio.play(G.songs.title);
  },

  update(G, dt) {
    this.t += dt;
    this.hero.update(dt);
    this.fireAt -= dt;
    if (this.fireAt <= 0) { this.fireAt = 5.5 + Math.random() * 4; this.hero.breatheFire(1.0); G.sfx('roar'); }
    for (const m of motes) { m.y -= m.v * dt; if (m.y < -.08) { m.y = 1.08; m.x = Math.random(); } }

    // sao băng: thưa thớt, mỗi lần một vệt
    if (this.shoot) {
      this.shoot.k += dt / this.shoot.dur;
      if (this.shoot.k >= 1) this.shoot = null;
    } else {
      this.shootAt -= dt;
      if (this.shootAt <= 0) {
        this.shootAt = 6 + Math.random() * 9;
        this.shoot = { k: 0, dur: .8 + Math.random() * .4,
                       x: .15 + Math.random() * .5, y: .04 + Math.random() * .22,
                       len: .16 + Math.random() * .12, dx: .8, dy: .34 };
      }
    }
  },

  draw(G, ctx) {
    const { W, H } = G, T = this.t;
    const [BX, BY, BW, BH] = bleed(G);
    const BR = BX + BW, BB = BY + BH;
    const px = (u) => BX + u * BW;                    // 0..1 → toạ độ ngang thật
    const rich = perf.quality > Q.LOW;

    // ── TRỜI ĐÊM ─────────────────────────────────────────────────────────
    const sky = ctx.createLinearGradient(0, BY, 0, H);
    sky.addColorStop(0, '#0d0726');
    sky.addColorStop(.30, '#241452');
    sky.addColorStop(.55, '#4a2568');
    sky.addColorStop(.80, '#8d456b');
    sky.addColorStop(1, '#d8804f');
    ctx.fillStyle = sky; ctx.fillRect(BX, BY, BW, BH);

    // dải cực quang — hai vệt chéo rất nhạt, làm nền bớt "phẳng lì"
    if (rich) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const [cx0, cy0, rx, ry, rot, col, a] of [
        [.30, .22, .38, .095, -.20, '#4fd8c4', .20],
        [.60, .13, .32, .070,  .17, '#a184ff', .22],
      ]) {
        const g = ctx.createRadialGradient(px(cx0), H * cy0, 0, px(cx0), H * cy0, BW * rx);
        g.addColorStop(0, rgba(col, a)); g.addColorStop(1, rgba(col, 0));
        ctx.save();
        ctx.translate(px(cx0), H * cy0); ctx.rotate(rot); ctx.scale(1, ry / rx);
        ctx.translate(-px(cx0), -H * cy0);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(px(cx0), H * cy0, BW * rx, 0, TAU); ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }

    // ── SAO ──────────────────────────────────────────────────────────────
    for (const s of stars) {
      const tw = .28 + .72 * Math.abs(Math.sin(T * .9 + s.ph));
      const sx = px(s.x), sy = BY + s.y * (H - BY);
      ctx.globalAlpha = tw;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(sx, sy, s.r, 0, TAU); ctx.fill();
      // vài ngôi to có tia chữ thập — chi tiết nhỏ nhưng nâng hẳn độ "xịn"
      if (s.big) {
        ctx.globalAlpha = tw * .75;
        ctx.strokeStyle = '#dfe6ff'; ctx.lineWidth = 1; ctx.lineCap = 'round';
        const L = s.r * 4.2;
        ctx.beginPath();
        ctx.moveTo(sx - L, sy); ctx.lineTo(sx + L, sy);
        ctx.moveTo(sx, sy - L); ctx.lineTo(sx, sy + L);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;

    // ── SAO BĂNG ─────────────────────────────────────────────────────────
    if (this.shoot) {
      const S = this.shoot, k = S.k;
      const fade = Math.sin(clamp(k, 0, 1) * Math.PI);
      const hx = px(S.x + S.dx * k * .5), hy = BY + (S.y + S.dy * k * .5) * (H - BY);
      const tx = hx - S.len * BW * S.dx, ty = hy - S.len * BW * S.dy;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const tg = ctx.createLinearGradient(tx, ty, hx, hy);
      tg.addColorStop(0, 'rgba(255,255,255,0)');
      tg.addColorStop(1, `rgba(255,252,235,${.9 * fade})`);
      ctx.strokeStyle = tg; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx, hy); ctx.stroke();
      ctx.fillStyle = `rgba(255,255,255,${fade})`;
      ctx.beginPath(); ctx.arc(hx, hy, 2.6, 0, TAU); ctx.fill();
      ctx.restore();
    }

    // ── TRĂNG ────────────────────────────────────────────────────────────
    const mx = px(.815), my = BY + (H - BY) * .155, mr = 48;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const mg = ctx.createRadialGradient(mx, my, mr * .6, mx, my, mr * 4.2);
    mg.addColorStop(0, 'rgba(255,244,218,.62)');
    mg.addColorStop(.38, 'rgba(255,218,178,.22)');
    mg.addColorStop(1, 'rgba(255,210,170,0)');
    ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(mx, my, mr * 4.2, 0, TAU); ctx.fill();
    ctx.restore();
    // đĩa trăng có sáng lệch để ra khối cầu
    const md = ctx.createRadialGradient(mx - mr * .3, my - mr * .34, mr * .1, mx, my, mr);
    md.addColorStop(0, '#fffef8'); md.addColorStop(.62, '#fdf3d8'); md.addColorStop(1, '#ecd9b4');
    ctx.fillStyle = md; ctx.beginPath(); ctx.arc(mx, my, mr, 0, TAU); ctx.fill();
    ctx.save();
    ctx.beginPath(); ctx.arc(mx, my, mr, 0, TAU); ctx.clip();
    ctx.fillStyle = 'rgba(198,178,152,.45)';
    for (const [ox, oy, r] of [[-.28, -.20, .20], [.30, .22, .14], [.06, -.42, .10], [-.10, .34, .12], [.42, -.16, .08]]) {
      ctx.beginPath(); ctx.arc(mx + ox * mr, my + oy * mr, r * mr, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = 'rgba(160,140,118,.30)';
    for (const [ox, oy, r] of [[-.26, -.18, .11], [.32, .24, .07]]) {
      ctx.beginPath(); ctx.arc(mx + ox * mr, my + oy * mr, r * mr, 0, TAU); ctx.fill();
    }
    ctx.restore();
    // dải mây mỏng vắt ngang trăng — làm chiều sâu, và trăng bớt như miếng dán
    if (rich) {
      const cw = Math.sin(T * .05) * BW * .05;
      for (const [oy, w, a] of [[.10, 1.5, .20], [-.24, 1.1, .13]]) {
        ctx.fillStyle = `rgba(232,214,240,${a})`;
        ctx.beginPath();
        ctx.ellipse(mx - mr * .3 + cw, my + mr * oy, mr * w, mr * .10, -.05, 0, TAU);
        ctx.fill();
      }
    }

    // ── NÚI 3 TẦNG + SƯƠNG ───────────────────────────────────────────────
    const ridge = (yBase, amp, col, seed, step = 70) => {
      const r = mulberry32(seed);
      ctx.beginPath(); ctx.moveTo(BX - 40, BB);
      for (let x = BX - 40; x <= BR + 40; x += step)
        ctx.lineTo(x, yBase + Math.sin(x * .006 + seed) * amp - r() * amp * .6);
      ctx.lineTo(BR + 40, BB); ctx.closePath();
      ctx.fillStyle = col; ctx.fill();
    };
    ridge(H * .52, 46, '#3a2359', 17, 90);          // tầng xa nhất, nhạt
    // sương giữa hai tầng núi
    if (rich) {
      const fg = ctx.createLinearGradient(0, H * .50, 0, H * .68);
      fg.addColorStop(0, 'rgba(196,170,220,0)');
      fg.addColorStop(.5, 'rgba(196,170,220,.20)');
      fg.addColorStop(1, 'rgba(196,170,220,0)');
      ctx.fillStyle = fg; ctx.fillRect(BX, H * .50, BW, H * .18);
    }
    ridge(H * .60, 40, '#2b1a4a', 3);
    ridge(H * .70, 30, '#1d1136', 9);

    // lùm tre trên sườn đồi — bóng đen, chỉ để phá đường chân trời cho có nhịp
    if (rich) {
      // Bụi cỏ lau xoè nan quạt. Trước đây vẽ "tre có lá" với lá đâm ngang —
      // bóng đen ra thành hình con nhện khô, phản tác dụng.
      const rb = mulberry32(77);
      ctx.fillStyle = '#160c2c';
      for (let i = 0; i < 7; i++) {
        const bx = BX + (i + .25 + rb() * .5) / 7 * BW, by = H * (.705 + rb() * .025);
        const hh = 44 + rb() * 52, n = 5 + ((rb() * 3) | 0);
        ctx.save(); ctx.translate(bx, by);
        for (let k = 0; k < n; k++) {
          const u = n === 1 ? 0 : k / (n - 1) * 2 - 1;          // -1..1
          const kh = hh * (.55 + (1 - Math.abs(u)) * .55);
          const tip = u * hh * .62 + Math.sin(T * .9 + i + k) * 4;
          ctx.beginPath();
          ctx.moveTo(-2.4, 0);
          ctx.quadraticCurveTo(tip * .30, -kh * .62, tip, -kh);
          ctx.quadraticCurveTo(tip * .30 + 3.4, -kh * .60, 2.4, 0);
          ctx.closePath(); ctx.fill();
        }
        ctx.restore();
      }
    }

    // ── ĐÁ QUÝ TRÔI ──────────────────────────────────────────────────────
    for (const m of motes) {
      ctx.save();
      ctx.globalAlpha = .42;
      const gx = px(m.x), gy = BY + m.y * BH;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const gg = ctx.createRadialGradient(gx, gy, 0, gx, gy, 44 * m.s);
      gg.addColorStop(0, rgba(GEMS[m.g].lite, .30)); gg.addColorStop(1, rgba(GEMS[m.g].base, 0));
      ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(gx, gy, 44 * m.s, 0, TAU); ctx.fill();
      ctx.restore();
      drawGem(ctx, m.g, gx, gy, 54 * m.s, { t: T, seed: m.ph, rot: Math.sin(T * .5 + m.ph) * .3 });
      ctx.restore();
    }

    // ── ĐOM ĐÓM ──────────────────────────────────────────────────────────
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const f of flies) {
      const fx = px(f.x + f.ax * Math.sin(T * f.fx + f.ph));
      const fy = BY + (f.y + f.ay * Math.sin(T * f.fy + f.ph2)) * BH;
      // nhấp nháy: phần lớn thời gian mờ, thỉnh thoảng loé lên
      const b = Math.pow(clamp(.5 + .5 * Math.sin(T * f.blink + f.ph), 0, 1), 3);
      if (b < .02) continue;
      const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, f.r * 7);
      g.addColorStop(0, `hsla(${f.hue},100%,72%,${.55 * b})`);
      g.addColorStop(.4, `hsla(${f.hue},100%,60%,${.18 * b})`);
      g.addColorStop(1, `hsla(${f.hue},100%,55%,0)`);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(fx, fy, f.r * 7, 0, TAU); ctx.fill();
      ctx.fillStyle = `hsla(${f.hue},100%,88%,${.95 * b})`;
      ctx.beginPath(); ctx.arc(fx, fy, f.r * .75, 0, TAU); ctx.fill();
    }
    ctx.restore();

    // ── MỎM ĐÁ · ĐÈN LỒNG · NHÂN VẬT ────────────────────────────────────
    // Bề ngang nhân vật ≈ 1.9×S, lệch hẳn về sau (đuôi + càng). Đặt sát mép
    // trái là cụt mất cả cụm càng — thứ nhận diện chính. Nên chừa hẳn ra.
    const heroS = 168, heroX = Math.max(W * .245, 300), heroY = H * .785;
    // mỏm đá
    ctx.fillStyle = '#150c28';
    ctx.beginPath();
    ctx.moveTo(BX, BB);
    ctx.lineTo(heroX - W * .155, H * .80);
    ctx.quadraticCurveTo(heroX - W * .02, H * .755, heroX + W * .135, H * .775);
    ctx.lineTo(heroX + W * .175, BB);
    ctx.closePath(); ctx.fill();
    // gờ sáng mép trên mỏm đá
    ctx.strokeStyle = 'rgba(150,120,200,.30)'; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(heroX - W * .155, H * .80);
    ctx.quadraticCurveTo(heroX - W * .02, H * .755, heroX + W * .135, H * .775);
    ctx.stroke();

    // Đèn lồng cỏ treo trên cọng lau — nguồn sáng ấm duy nhất của cả màn,
    // nên phải đủ to để đọc ra là cái đèn, không thì chỉ là đốm vàng lơ lửng.
    const lx = heroX + W * .100, ly = H * .500 + Math.sin(T * 1.1) * 5, lr = 22;
    // cọng lau đỡ đèn — tô sáng hơn nền đồi một bậc mới thấy được
    ctx.strokeStyle = '#3a2456'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    const stalk = () => {
      ctx.beginPath();
      ctx.moveTo(lx - W * .105, BB);
      ctx.bezierCurveTo(lx - W * .085, H * .74, lx - W * .055, H * .50, lx, ly - lr - 12);
    };
    stalk(); ctx.stroke();
    ctx.strokeStyle = '#54366f'; ctx.lineWidth = 2;
    stalk(); ctx.stroke();

    const flick = .82 + .18 * Math.sin(T * 7.3) * Math.sin(T * 3.1);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const lg = ctx.createRadialGradient(lx, ly, 0, lx, ly, 250);
    lg.addColorStop(0, `rgba(255,214,138,${.72 * flick})`);
    lg.addColorStop(.32, `rgba(255,178,88,${.26 * flick})`);
    lg.addColorStop(1, 'rgba(255,160,70,0)');
    ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(lx, ly, 260, 0, TAU); ctx.fill();
    // vũng sáng đọng trên mặt đá — thứ khiến đèn "thuộc về" cảnh, không lơ lửng
    const pool = ctx.createRadialGradient(lx - 18, H * .80, 0, lx - 18, H * .80, 190);
    pool.addColorStop(0, `rgba(255,186,96,${.24 * flick})`);
    pool.addColorStop(1, 'rgba(255,170,70,0)');
    ctx.fillStyle = pool;
    ctx.save(); ctx.translate(lx - 18, H * .80); ctx.scale(1, .34); ctx.translate(-(lx - 18), -H * .80);
    ctx.beginPath(); ctx.arc(lx - 18, H * .80, 190, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.restore();

    // quai treo
    ctx.strokeStyle = '#5d3a12'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(lx, ly - lr - 6, 7, Math.PI * .12, Math.PI * .88, true); ctx.stroke();
    // thân đèn
    ctx.beginPath();
    ctx.moveTo(lx, ly - lr);
    ctx.bezierCurveTo(lx + lr, ly - lr * .78, lx + lr, ly + lr * .78, lx, ly + lr);
    ctx.bezierCurveTo(lx - lr, ly + lr * .78, lx - lr, ly - lr * .78, lx, ly - lr);
    ctx.closePath();
    const bg2 = ctx.createLinearGradient(lx - lr * .7, ly - lr, lx + lr * .6, ly + lr);
    bg2.addColorStop(0, `rgba(255,247,214,${flick})`);
    bg2.addColorStop(.55, 'rgba(255,201,104,.98)');
    bg2.addColorStop(1, 'rgba(226,140,44,.95)');
    ctx.fillStyle = bg2; ctx.fill();
    ctx.strokeStyle = '#5d3a12'; ctx.lineWidth = 2.8; ctx.lineJoin = 'round'; ctx.stroke();
    // nan đèn
    ctx.strokeStyle = 'rgba(93,58,18,.55)'; ctx.lineWidth = 1.6;
    for (const oy of [-.42, 0, .42]) {
      ctx.beginPath();
      ctx.moveTo(lx - lr * .92, ly + lr * oy);
      ctx.quadraticCurveTo(lx, ly + lr * oy * 1.25, lx + lr * .92, ly + lr * oy);
      ctx.stroke();
    }
    // lõi lửa + tua rua
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(255,252,235,${.85 * flick})`;
    ctx.beginPath(); ctx.ellipse(lx - lr * .12, ly, lr * .30, lr * .42, 0, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#7a4a12'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    for (const d of [-1, 0, 1]) {
      ctx.beginPath();
      ctx.moveTo(lx, ly + lr);
      ctx.quadraticCurveTo(lx + d * 4, ly + lr + 9, lx + d * 7 + Math.sin(T * 1.6) * 2, ly + lr + 17);
      ctx.stroke();
    }

    this.hero.draw(ctx, heroX, heroY, heroS, 1);

    // ── BỤI CỎ TIỀN CẢNH ────────────────────────────────────────────────
    // Lớp gần nhất, đen tuyền: mắt lập tức đọc ra chiều sâu 3 tầng.
    ctx.fillStyle = '#0e0722';
    for (const rd of reeds) {
      const x = px(rd.x), h0 = BH * rd.h * .55;
      const sway = Math.sin(T * 1.3 + rd.ph) * 12 * rd.s + rd.lean * 40;
      ctx.beginPath();
      ctx.moveTo(x - 4 * rd.s, BB);
      ctx.quadraticCurveTo(x + sway * .35, BB - h0 * .55, x + sway, BB - h0);
      ctx.lineTo(x + sway + 3 * rd.s, BB - h0 + 5);
      ctx.quadraticCurveTo(x + sway * .35 + 5, BB - h0 * .55, x + 4 * rd.s, BB);
      ctx.closePath(); ctx.fill();
    }

    // ── VIGNETTE ─────────────────────────────────────────────────────────
    const vg = ctx.createRadialGradient(BX + BW / 2, BY + BH * .46, BH * .30,
                                        BX + BW / 2, BY + BH * .46, BH * .82);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(6,3,16,.42)');
    ctx.fillStyle = vg; ctx.fillRect(BX, BY, BW, BH);

    // ── TIÊU ĐỀ ─────────────────────────────────────────────────────────
    const bob = Math.sin(T * 1.4) * 4;
    ctx.save();
    ctx.translate(W / 2, 190 + bob);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const gl = ctx.createRadialGradient(0, 0, 10, 0, 0, 340);
    gl.addColorStop(0, 'rgba(190,150,255,.42)');
    gl.addColorStop(.5, 'rgba(120,90,220,.16)');
    gl.addColorStop(1, 'rgba(180,140,255,0)');
    ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(0, 0, 340, 0, TAU); ctx.fill();
    ctx.restore();

    const TITLE = 'SDrakon';
    const tFont = '108px "Bungee","Baloo 2",sans-serif';
    strokeText(ctx, TITLE, 0, 0, { font: tFont, fill: '#fff', stroke: '#3a1d6e', lw: 14, baseline: 'middle' });
    // vệt sáng quét ngang chữ, 4,5 giây một lần — thủ pháp kinh điển của
    // logo game, gần như miễn phí mà nhìn "có tiền" hẳn.
    const sweep = (T % 4.5) / 1.1;
    if (sweep < 1) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.font = tFont; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const wgr = ctx.createLinearGradient(-340, 0, 340, 0);
      const k = sweep * 1.4 - .2;
      wgr.addColorStop(0, 'rgba(255,255,255,0)');
      wgr.addColorStop(clamp(k - .10, 0, 1), 'rgba(255,255,255,0)');
      wgr.addColorStop(clamp(k, .001, .999), 'rgba(255,255,255,.85)');
      wgr.addColorStop(clamp(k + .10, 0, 1), 'rgba(255,255,255,0)');
      wgr.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = wgr; ctx.fillText(TITLE, 0, 0);
      ctx.restore();
    }
    strokeText(ctx, t('tagline'), 0, 74, { font: FONT.disp(40), fill: '#ff5f7a', stroke: '#5c0b22', lw: 8, baseline: 'middle' });
    // hai viên đá nhỏ kèm hai bên khẩu hiệu
    for (const d of [-1, 1]) {
      drawGem(ctx, d < 0 ? 3 : 0, d * 250, 74, 30, { t: T, seed: d, rot: Math.sin(T * .9 + d) * .35 });
    }
    ctx.restore();

    // ── NÚT ─────────────────────────────────────────────────────────────
    const hasSave = !!G.save.breed;
    for (const h of this.hits) {
      if (h.hidden) continue;
      if (h.id === 'play')
        textBtn(ctx, h.x, h.y, h.w, h.h, hasSave ? t('continueGame') : t('newGame'),
          { press: h.press, hover: h.hover });
      else if (h.id === 'new')
        textBtn(ctx, h.x, h.y, h.w, h.h, G.confirmPending > 0 ? t('confirmReset') : t('newGame'),
          { press: h.press, hover: h.hover,
            colour: G.confirmPending > 0 ? '#e8384f' : '#7a5fae',
            dark:   G.confirmPending > 0 ? '#8c0f22' : '#3b2263',
            lite:   G.confirmPending > 0 ? '#ff9aa8' : '#c0a0ff',
            font: FONT.disp(G.confirmPending > 0 ? 17 : 22) });
      else if (h.id === 'help')
        roundBtn(ctx, h.x + 26, h.y + 26, 26, (c, s) => icon.help(c, s), { press: h.press, hover: h.hover });
      else if (h.id === 'lang')
        roundBtn(ctx, h.x + 26, h.y + 26, 26, (c, s) => icon.globe(c, s), { press: h.press, hover: h.hover });
      else
        roundBtn(ctx, h.x + 26, h.y + 26, 26, (c, s) => icon.note(c, s, !G.audio.muted), { press: h.press, hover: h.hover });
    }
    strokeText(ctx, getLang().toUpperCase(), G.W - 126, 92,
      { font: FONT.ui(14, 800), fill: '#fff', stroke: '#2b1740', lw: 3, baseline: 'middle' });

    strokeText(ctx, 'v' + VERSION + ' · ' + t('tapStart'), W / 2, H - 26,
      { font: FONT.ui(15, 600), fill: 'rgba(255,255,255,.62)', stroke: 'rgba(0,0,0,.4)', lw: 3, baseline: 'middle' });
  },
};

// ── Hiệu ứng: hạt, số điểm bay, sóng xung kích, rung màn ────────────────────
import { TAU, rand, randInt, clamp, lerp, ease, rgba, poly, strokeText } from '../core/util.js';
import { perf } from '../core/perf.js';

export class FX {
  constructor() { this.parts = []; this.texts = []; this.rings = []; this.beams = []; this.shakeAmt = 0; this.t = 0; }
  get shakeX() { return this.shakeAmt ? (Math.random() - .5) * this.shakeAmt : 0; }
  get shakeY() { return this.shakeAmt ? (Math.random() - .5) * this.shakeAmt : 0; }
  shake(a) { this.shakeAmt = Math.min(26, this.shakeAmt + a); }
  clear() { this.parts.length = this.texts.length = this.rings.length = this.beams.length = 0; this.shakeAmt = 0; }

  /** Mảnh vỡ đá quý — đa giác nhỏ xoay tít + tia sáng. */
  burst(x, y, gem, n = 12, power = 1) {
    // Chống lỗi khi gọi với bảng màu thiếu trường (viên đá của chế độ Bắn Đá
    // và đá quý của match-3 dùng chung hàm này).
    const g = { lite: '#ffffff', base: '#8899ff', dark: '#333355', spark: '#ffffff', ...(gem || {}) };
    gem = g;
    n = Math.max(3, Math.round(n * perf.particleScale));
    for (let i = 0; i < n; i++) {
      const a = rand(TAU), sp = rand(430, 130) * power;
      this.parts.push({
        k: 'shard', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - rand(120, 40),
        r: rand(9, 3.5) * power, rot: rand(TAU), vr: rand(11, -11),
        life: 0, max: rand(.85, .45), c: i % 3 === 0 ? gem.lite : i % 3 === 1 ? gem.base : gem.dark,
        g: 1500, sides: 3 + randInt(3),
      });
    }
    for (let i = 0; i < n * .6; i++) {
      const a = rand(TAU), sp = rand(300, 60);
      this.parts.push({
        k: 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        r: rand(4.5, 1.6), life: 0, max: rand(.55, .28), c: gem.spark, g: 180,
      });
    }
  }

  /** Bụi lấp lánh lơ lửng — dùng khi tạo gem đặc biệt. */
  sparkle(x, y, colour, n = 16) {
    n = Math.max(4, Math.round(n * perf.particleScale));
    for (let i = 0; i < n; i++) {
      const a = rand(TAU), d = rand(34, 6);
      this.parts.push({
        k: 'star', x: x + Math.cos(a) * d, y: y + Math.sin(a) * d,
        vx: Math.cos(a) * rand(90, 20), vy: Math.sin(a) * rand(90, 20) - 60,
        r: rand(7, 3), rot: rand(TAU), vr: rand(6, -6),
        life: 0, max: rand(.9, .5), c: colour, g: -60,
      });
    }
  }

  /** Luồng sóng gáy — cột hạt sáng bay theo hướng. */
  chirp(x, y, dx, dy, n = 22) {
    n = Math.max(3, Math.round(n * perf.particleScale));
    for (let i = 0; i < n; i++) {
      const spread = rand(.42, -.42);
      const ca = Math.cos(spread), sa = Math.sin(spread);
      const vx = (dx * ca - dy * sa), vy = (dx * sa + dy * ca);
      const sp = rand(620, 240);
      this.parts.push({
        k: 'chirp', x: x + rand(10, -10), y: y + rand(10, -10),
        vx: vx * sp, vy: vy * sp, r: rand(19, 8), life: 0, max: rand(.75, .35),
        g: -220, c: '#fff',
      });
    }
  }

  /** Khói / tro bay lên. */
  smoke(x, y, n = 6, colour = '#c9b8ff') {
    for (let i = 0; i < n; i++)
      this.parts.push({ k: 'smoke', x: x + rand(14, -14), y, vx: rand(40, -40), vy: rand(-30, -90),
                        r: rand(20, 9), life: 0, max: rand(1.4, .8), g: -30, c: colour });
  }

  /** Chữ / số bay lên rồi mờ dần. */
  float(x, y, text, o = {}) {
    this.texts.push({
      x, y, text, life: 0, max: o.max ?? 1.0, vy: o.vy ?? -78,
      size: o.size ?? 30, fill: o.fill ?? '#fff', stroke: o.stroke ?? '#2b1740',
      font: o.font, pop: o.pop ?? 1, drift: o.drift ?? 0,
    });
  }

  ring(x, y, colour, r0 = 10, r1 = 120, dur = .45, w = 8) {
    this.rings.push({ x, y, c: colour, r0, r1, life: 0, max: dur, w });
  }

  /** Tia nổ hàng/cột. */
  beam(x, y, horizontal, len, colour) {
    this.beams.push({ x, y, h: horizontal, len, c: colour, life: 0, max: .34 });
  }

  update(dt) {
    this.t += dt;
    this.shakeAmt = Math.max(0, this.shakeAmt - dt * 46);
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.life += dt;
      if (p.life >= p.max) { this.parts.splice(i, 1); continue; }
      p.vy += (p.g ?? 1200) * dt;
      p.vx *= 1 - 1.6 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.vr) p.rot += p.vr * dt;
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const f = this.texts[i]; f.life += dt;
      if (f.life >= f.max) { this.texts.splice(i, 1); continue; }
      f.y += f.vy * dt; f.vy *= 1 - 1.1 * dt; f.x += f.drift * dt;
    }
    for (let i = this.rings.length - 1; i >= 0; i--)
      if ((this.rings[i].life += dt) >= this.rings[i].max) this.rings.splice(i, 1);
    for (let i = this.beams.length - 1; i >= 0; i--)
      if ((this.beams[i].life += dt) >= this.beams[i].max) this.beams.splice(i, 1);
  }

  draw(ctx) {
    ctx.save();

    // tia nổ
    for (const b of this.beams) {
      const k = b.life / b.max, a = Math.sin((1 - k) * Math.PI * .5);
      const th = lerp(46, 4, k);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a;
      const g = b.h ? ctx.createLinearGradient(b.x - b.len, 0, b.x + b.len, 0)
                    : ctx.createLinearGradient(0, b.y - b.len, 0, b.y + b.len);
      g.addColorStop(0, rgba(b.c, 0)); g.addColorStop(.5, b.c); g.addColorStop(1, rgba(b.c, 0));
      ctx.fillStyle = g;
      if (b.h) ctx.fillRect(b.x - b.len, b.y - th / 2, b.len * 2, th);
      else     ctx.fillRect(b.x - th / 2, b.y - b.len, th, b.len * 2);
      ctx.restore();
    }

    // sóng xung kích
    for (const r of this.rings) {
      const k = r.life / r.max;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = (1 - k) * .9;
      ctx.strokeStyle = r.c; ctx.lineWidth = r.w * (1 - k) + 1;
      ctx.beginPath(); ctx.arc(r.x, r.y, lerp(r.r0, r.r1, ease.outCubic(k)), 0, TAU); ctx.stroke();
      ctx.restore();
    }

    // hạt
    for (const p of this.parts) {
      const k = p.life / p.max, a = 1 - k * k;
      ctx.save();
      ctx.globalAlpha = a;
      if (p.k === 'shard') {
        ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        const pts = Array.from({ length: p.sides }, (_, i) => {
          const ang = i / p.sides * TAU;
          return [Math.cos(ang) * p.r * (1 - k * .55), Math.sin(ang) * p.r * (1 - k * .55)];
        });
        poly(ctx, pts); ctx.fillStyle = p.c; ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1; ctx.stroke();
      } else if (p.k === 'star') {
        ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.globalCompositeOperation = 'lighter';
        const r = p.r * (1 - k * .4);
        ctx.fillStyle = p.c;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const ang = i / 8 * TAU, rr = i % 2 ? r * .34 : r;
          i ? ctx.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr)
            : ctx.moveTo(Math.cos(ang) * rr, Math.sin(ang) * rr);
        }
        ctx.closePath(); ctx.fill();
      } else if (p.k === 'chirp') {
        // hạt sóng âm: sáng vàng nhạt rồi tan, không ngả đỏ như lửa
        ctx.globalCompositeOperation = 'lighter';
        const r = p.r * (1 + k * 1.7);
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
        g.addColorStop(0, `rgba(255,255,244,${a})`);
        g.addColorStop(.45, `rgba(255,214,110,${a * .6})`);
        g.addColorStop(1, 'rgba(255,190,80,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill();
      } else if (p.k === 'smoke') {
        const r = p.r * (1 + k * 2.2);
        ctx.globalAlpha = a * .34;
        ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill();
      } else {                                        // spark
        ctx.globalCompositeOperation = 'lighter';
        const r = p.r * (1 - k);
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 3);
        g.addColorStop(0, p.c); g.addColorStop(1, rgba('#ffffff', 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, r * 3, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }

    // chữ bay
    for (const f of this.texts) {
      const k = f.life / f.max;
      const s = f.pop ? (k < .18 ? ease.outBack(k / .18) : 1) : 1;
      ctx.save();
      ctx.globalAlpha = k > .65 ? 1 - (k - .65) / .35 : 1;
      ctx.translate(f.x, f.y); ctx.scale(s, s);
      strokeText(ctx, f.text, 0, 0, {
        font: f.font || `800 ${f.size}px "Baloo 2","Be Vietnam Pro",sans-serif`,
        fill: f.fill, stroke: f.stroke, lw: Math.max(3, f.size * .16), baseline: 'middle',
      });
      ctx.restore();
    }
    ctx.restore();
  }
}

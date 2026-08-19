// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  BẮN ĐÁ — engine bắn viên vào lưới lục giác.                             ║
// ║                                                                          ║
// ║  Luật: bắn viên đá lên, nó dính vào lưới; 3 viên cùng màu chạm nhau thì   ║
// ║  vỡ; cụm nào mất liên kết với trần thì rơi tự do (ăn điểm gấp đôi).       ║
// ║  Trần tụt xuống sau mỗi N phát → càng chơi càng nghẹt thở.               ║
// ║                                                                          ║
// ║  Toàn bộ hình vẽ bằng code; viên đá có VÂN KHẮC riêng theo màu nên người  ║
// ║  mù màu vẫn phân biệt được.                                             ║
// ╚══════════════════════════════════════════════════════════════════════════╝
import { TAU, clamp, lerp, ease, rand, randInt, rgba, shade, makeCanvas } from '../core/util.js';
import { perf } from '../core/perf.js';

export const ORB = [
  { id: 'lam',  base: '#2f7ff0', lite: '#cfe6ff', dark: '#0d2f6b', spark: '#eaf5ff', rune: 'ring'   },
  { id: 'tia',  base: '#a34df0', lite: '#eccfff', dark: '#43126f', spark: '#f8e9ff', rune: 'bolt'   },
  { id: 'do',   base: '#f03560', lite: '#ffd0da', dark: '#750b28', spark: '#ffeaf0', rune: 'cross'  },
  { id: 'vang', base: '#f5a51e', lite: '#ffeec2', dark: '#7d4405', spark: '#fff6dd', rune: 'sun'    },
  { id: 'luc',  base: '#25c777', lite: '#c6ffe4', dark: '#075131', spark: '#e8fff4', rune: 'leaf'   },
  { id: 'lam2', base: '#1ed2d8', lite: '#c6ffff', dark: '#065a63', spark: '#e6ffff', rune: 'wave'   },
];

const SPRITE = 128;
const cache = [];

/** Vẽ sẵn từng loại viên đá ra ảnh — bắn nhiều viên vẫn không tốn thêm gì. */
export function buildOrbSprites() {
  if (cache.length) return cache;
  for (const o of ORB) {
    const c = makeCanvas(SPRITE, SPRITE);
    const x = c.getContext('2d');
    const R = SPRITE * .46, cx = SPRITE / 2, cy = SPRITE / 2;

    x.beginPath(); x.arc(cx, cy, R, 0, TAU);
    const g = x.createRadialGradient(cx - R * .34, cy - R * .40, R * .10, cx, cy, R);
    g.addColorStop(0, o.lite); g.addColorStop(.45, o.base); g.addColorStop(1, o.dark);
    x.fillStyle = g; x.fill();
    x.strokeStyle = rgba(o.dark, .9); x.lineWidth = R * .11; x.stroke();

    // vân khắc — mỗi màu một ký hiệu, phân biệt được cả khi mù màu
    x.save();
    x.translate(cx, cy);
    x.strokeStyle = rgba('#ffffff', .78); x.fillStyle = rgba('#ffffff', .78);
    x.lineWidth = R * .13; x.lineCap = 'round'; x.lineJoin = 'round';
    const r = R * .46;
    if (o.rune === 'ring') { x.beginPath(); x.arc(0, 0, r * .8, 0, TAU); x.stroke(); }
    if (o.rune === 'bolt') { x.beginPath(); x.moveTo(r * .3, -r); x.lineTo(-r * .4, r * .1);
                             x.lineTo(r * .2, r * .1); x.lineTo(-r * .3, r); x.stroke(); }
    if (o.rune === 'cross') { x.beginPath(); x.moveTo(-r, 0); x.lineTo(r, 0);
                              x.moveTo(0, -r); x.lineTo(0, r); x.stroke(); }
    if (o.rune === 'sun') { x.beginPath(); x.arc(0, 0, r * .42, 0, TAU); x.fill();
                            for (let i = 0; i < 8; i++) { const a = i / 8 * TAU;
                              x.beginPath(); x.moveTo(Math.cos(a) * r * .68, Math.sin(a) * r * .68);
                              x.lineTo(Math.cos(a) * r, Math.sin(a) * r); x.stroke(); } }
    if (o.rune === 'leaf') { x.beginPath(); x.moveTo(0, -r);
                             x.quadraticCurveTo(r, -r * .1, 0, r);
                             x.quadraticCurveTo(-r, -r * .1, 0, -r); x.stroke(); }
    if (o.rune === 'wave') { x.beginPath(); x.moveTo(-r, -r * .3);
                             x.quadraticCurveTo(-r * .3, -r, r * .3, -r * .3);
                             x.quadraticCurveTo(r * .7, r * .1, r, -r * .3);
                             x.moveTo(-r, r * .5); x.quadraticCurveTo(-r * .3, -r * .2, r * .3, r * .5);
                             x.stroke(); }
    x.restore();

    // chớp sáng
    x.save(); x.globalCompositeOperation = 'lighter';
    x.fillStyle = 'rgba(255,255,255,.55)';
    x.beginPath(); x.ellipse(cx - R * .32, cy - R * .40, R * .26, R * .16, -.7, 0, TAU); x.fill();
    x.restore();
    cache.push(c);
  }
  return cache;
}

export function drawOrb(ctx, type, x, y, d, alpha = 1, scale = 1) {
  const spr = cache[type] || buildOrbSprites()[type];
  if (alpha <= .01 || scale <= .01) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  const s = d * scale;
  ctx.drawImage(spr, x - s / 2, y - s / 2, s, s);
  ctx.restore();
}

export class BubbleBoard {
  /** @param o { cols, rows, radius, colours, w, h } */
  constructor(o = {}) {
    this.cols = o.cols ?? 10;
    this.rows = o.rows ?? 13;
    this.R = o.radius ?? 24;
    this.colours = clamp(o.colours ?? 5, 3, ORB.length);
    this.W = this.cols * this.R * 2;
    this.rowH = this.R * Math.sqrt(3);
    this.deathY = o.deathY ?? this.R * 2 * 8.6;
    this.on = {};
    this.reset(o.startRows ?? 5);
  }

  /** Số viên tối đa của một hàng (hàng lẻ thụt vào nên ít hơn 1). */
  rowCols(r) { return r % 2 === 0 ? this.cols : this.cols - 1; }
  cx(r, c) { return c * this.R * 2 + this.R + (r % 2 ? this.R : 0); }
  cy(r) { return r * this.rowH + this.R + this.drop; }
  get(r, c) { return (r < 0 || c < 0 || r >= this.rows || c >= this.rowCols(r)) ? null : this.grid[r][c]; }
  set(r, c, v) { if (r >= 0 && c >= 0 && r < this.rows && c < this.rowCols(r)) this.grid[r][c] = v; }

  reset(startRows = 5) {
    this.grid = Array.from({ length: this.rows }, (_, r) => new Array(this.rowCols(r)).fill(null));
    this.drop = 0;
    this.shots = 0;
    this.falling = [];
    this.popping = [];
    this.shot = null;
    this.t = 0;
    for (let r = 0; r < startRows; r++)
      for (let c = 0; c < this.rowCols(r); c++)
        this.set(r, c, { type: randInt(this.colours), scale: 1, born: 0 });
    this.next = [this.pickColour(), this.pickColour()];
  }

  /** Chỉ bốc màu ĐANG CÒN trên lưới → không bao giờ phát viên vô dụng. */
  pickColour() {
    const live = new Set();
    for (let r = 0; r < this.rows; r++)
      for (let c = 0; c < this.rowCols(r); c++) { const g = this.get(r, c); if (g) live.add(g.type); }
    const arr = [...live];
    return arr.length ? arr[randInt(arr.length)] : randInt(this.colours);
  }

  /** 6 ô kề trong lưới lục giác. */
  neighbours(r, c) {
    const odd = r % 2 === 1;
    const d = odd
      ? [[0, -1], [0, 1], [-1, 0], [-1, 1], [1, 0], [1, 1]]
      : [[0, -1], [0, 1], [-1, -1], [-1, 0], [1, -1], [1, 0]];
    const out = [];
    for (const [dr, dc] of d) {
      const rr = r + dr, cc = c + dc;
      if (rr >= 0 && rr < this.rows && cc >= 0 && cc < this.rowCols(rr)) out.push([rr, cc]);
    }
    return out;
  }

  /** Bắn: `ang` radian, 0 = sang phải, -PI/2 = thẳng lên. */
  fire(x, y, ang, speed = 900) {
    if (this.shot) return false;
    this.shot = { x, y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, type: this.next[0], trail: [] };
    this.next = [this.next[1], this.pickColour()];
    this.shots++;
    return true;
  }
  swapNext() { if (!this.shot) this.next = [this.next[1], this.next[0]]; }

  update(dt) {
    this.t += dt;
    for (let i = this.popping.length - 1; i >= 0; i--) {
      const p = this.popping[i];
      p.k += dt * 3.4;
      if (p.k >= 1) this.popping.splice(i, 1);
    }
    for (let i = this.falling.length - 1; i >= 0; i--) {
      const f = this.falling[i];
      f.vy += 2000 * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.rot += f.vr * dt;
      if (f.y > this.deathY + 300) this.falling.splice(i, 1);
    }
    for (let r = 0; r < this.rows; r++)
      for (let c = 0; c < this.rowCols(r); c++) {
        const g = this.get(r, c);
        if (g && g.born < 1) g.born = Math.min(1, g.born + dt * 5);
      }
    if (this.shot) this._stepShot(dt);
  }

  _stepShot(dt) {
    const s = this.shot, R = this.R;
    const steps = Math.max(1, Math.ceil(Math.hypot(s.vx, s.vy) * dt / (R * .5)));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      s.x += s.vx * h; s.y += s.vy * h;
      if (s.x < R) { s.x = R; s.vx = -s.vx; this.on.bounce?.(s.x, s.y); }
      if (s.x > this.W - R) { s.x = this.W - R; s.vx = -s.vx; this.on.bounce?.(s.x, s.y); }
      if (s.y <= R + this.drop) { this._land(s); return; }
      for (let r = 0; r < this.rows; r++)
        for (let c = 0; c < this.rowCols(r); c++) {
          if (!this.get(r, c)) continue;
          const dx = s.x - this.cx(r, c), dy = s.y - this.cy(r);
          if (dx * dx + dy * dy < (R * 1.86) ** 2) { this._land(s); return; }
        }
    }
    s.trail.push([s.x, s.y]);
    if (s.trail.length > 8) s.trail.shift();
  }

  /** Gắn viên vừa bay vào ô trống gần nhất rồi xét nổ. */
  _land(s) {
    let best = null, bestD = Infinity;
    for (let r = 0; r < this.rows; r++)
      for (let c = 0; c < this.rowCols(r); c++) {
        if (this.get(r, c)) continue;
        const d = (s.x - this.cx(r, c)) ** 2 + (s.y - this.cy(r)) ** 2;
        // chỉ nhận ô có hàng xóm (hoặc nằm sát trần) → không bị treo lơ lửng
        const anchored = r === 0 || this.neighbours(r, c).some(([rr, cc]) => this.get(rr, cc));
        if (anchored && d < bestD) { bestD = d; best = [r, c]; }
      }
    this.shot = null;
    if (!best) { this.on.settle?.({ popped: 0, dropped: 0 }); return; }

    const [r, c] = best;
    this.set(r, c, { type: s.type, scale: 1, born: .4 });
    this.on.stick?.(this.cx(r, c), this.cy(r));

    // ── gom cụm cùng màu ──────────────────────────────────────────────────
    const same = this._flood(r, c, (g) => g.type === s.type);
    let popped = 0, dropped = 0;
    if (same.length >= 3) {
      for (const [rr, cc] of same) {
        const g = this.get(rr, cc);
        this.popping.push({ x: this.cx(rr, cc), y: this.cy(rr), type: g.type, k: 0 });
        this.set(rr, cc, null);
      }
      popped = same.length;
      // ── cụm mất liên kết với trần thì rơi ───────────────────────────────
      const safe = new Set();
      for (let cc = 0; cc < this.rowCols(0); cc++)
        if (this.get(0, cc)) for (const [rr, c2] of this._flood(0, cc, () => true)) safe.add(rr * 100 + c2);
      for (let rr = 0; rr < this.rows; rr++)
        for (let cc = 0; cc < this.rowCols(rr); cc++) {
          if (!this.get(rr, cc) || safe.has(rr * 100 + cc)) continue;
          const g = this.get(rr, cc);
          this.falling.push({ x: this.cx(rr, cc), y: this.cy(rr), type: g.type,
                              vx: rand(140, -140), vy: rand(-160, -40), rot: 0, vr: rand(7, -7) });
          this.set(rr, cc, null);
          dropped++;
        }
    }
    this.on.settle?.({ popped, dropped, x: this.cx(r, c), y: this.cy(r), type: s.type });
  }

  /** Loang theo 6 hướng, dừng ở ô trống hoặc ô không thoả `ok`. */
  _flood(r0, c0, ok) {
    const start = this.get(r0, c0);
    if (!start || !ok(start)) return [];
    const seen = new Set([r0 * 100 + c0]);
    const out = [[r0, c0]], stack = [[r0, c0]];
    while (stack.length) {
      const [r, c] = stack.pop();
      for (const [rr, cc] of this.neighbours(r, c)) {
        const key = rr * 100 + cc;
        if (seen.has(key)) continue;
        const g = this.get(rr, cc);
        if (!g || !ok(g)) continue;
        seen.add(key); out.push([rr, cc]); stack.push([rr, cc]);
      }
    }
    return out;
  }

  /** Trần tụt xuống một hàng, đẩy thêm đá mới ở trên cùng. */
  pushRow() {
    for (let r = this.rows - 1; r > 0; r--)
      for (let c = 0; c < this.rowCols(r); c++)
        this.set(r, c, this.rowCols(r - 1) > c ? this.get(r - 1, c) : null);
    for (let c = 0; c < this.rowCols(0); c++)
      this.set(0, c, { type: randInt(this.colours), scale: 1, born: 0 });
    this.on.pushed?.();
  }

  get lowestY() {
    let y = 0;
    for (let r = 0; r < this.rows; r++)
      for (let c = 0; c < this.rowCols(r); c++)
        if (this.get(r, c)) y = Math.max(y, this.cy(r));
    return y;
  }
  get isClear() {
    for (let r = 0; r < this.rows; r++)
      for (let c = 0; c < this.rowCols(r); c++) if (this.get(r, c)) return false;
    return true;
  }

  draw(ctx, ox, oy) {
    const D = this.R * 2;
    ctx.save();
    ctx.translate(ox, oy);

    for (let r = 0; r < this.rows; r++)
      for (let c = 0; c < this.rowCols(r); c++) {
        const g = this.get(r, c);
        if (!g) continue;
        const y = this.cy(r);
        if (y < -D || y > this.deathY + D * 2) continue;
        drawOrb(ctx, g.type, this.cx(r, c), y, D, 1, ease.outBack(g.born));
      }

    for (const f of this.falling) {
      ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.rot);
      drawOrb(ctx, f.type, 0, 0, D, .9, 1);
      ctx.restore();
    }
    for (const p of this.popping) {
      drawOrb(ctx, p.type, p.x, p.y, D, 1 - p.k, 1 + p.k * .8);
    }
    if (this.shot) {
      if (perf.wantShimmer) for (let i = 0; i < this.shot.trail.length; i++) {
        const [tx, ty] = this.shot.trail[i];
        drawOrb(ctx, this.shot.type, tx, ty, D, (i / this.shot.trail.length) * .28, .8);
      }
      drawOrb(ctx, this.shot.type, this.shot.x, this.shot.y, D, 1, 1);
    }
    ctx.restore();
  }
}

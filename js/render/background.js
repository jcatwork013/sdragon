// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  Thế giới nền parallax.                                                  ║
// ║                                                                          ║
// ║  HIỆU NĂNG: trời · núi · đồi · cây · nền cỏ là TĨNH → nướng sẵn một lần   ║
// ║  ra canvas ngoài màn hình, mỗi khung hình chỉ tốn 1 lệnh drawImage thay   ║
// ║  cho ~200 lệnh vẽ + hàng chục gradient. Chỉ mây · chim · cỏ · phấn hoa    ║
// ║  được vẽ động. Nướng lại chỉ khi đổi chương.                             ║
// ╚══════════════════════════════════════════════════════════════════════════╝
import { TAU, lerp, mulberry32, rgba, shade, makeCanvas } from '../core/util.js';
import { perf, Q } from '../core/perf.js';

export class World {
  constructor(w, h) {
    this.w = w; this.h = h; this.t = 0; this.pan = 0;
    this.theme = null; this.dirty = true;
    this.baked = makeCanvas(w, h);

    const R = mulberry32(20260819);
    this.clouds = Array.from({ length: 7 }, () => ({
      x: R() * w * 1.4 - w * .2, y: 40 + R() * 200, s: .55 + R() * 1.1,
      v: 5 + R() * 12, a: .32 + R() * .38,
      puffs: Array.from({ length: 4 }, () => [R() * 2 - 1, R() * .7 - .35, .5 + R() * .6]),
    }));
    this.birds  = Array.from({ length: 5 }, () => ({ x: R() * w, y: 70 + R() * 150, v: 22 + R() * 26, ph: R() * TAU, s: .6 + R() * .5 }));
    this.grass  = Array.from({ length: 96 }, () => ({ x: R() * w, hh: 16 + R() * 30, ph: R() * TAU, s: .7 + R() * .8, tone: R() }));
    this.pollen = Array.from({ length: 30 }, () => ({ x: R() * w, y: R() * h, r: .8 + R() * 2.2, ph: R() * TAU, v: 6 + R() * 16 }));
    this.trees  = Array.from({ length: 11 }, () => ({ x: R() * w, s: .5 + R() * .8, ph: R() * TAU }));

    this.mount1 = this._ridge(mulberry32(7),  5, h * .30, h * .16);
    this.mount2 = this._ridge(mulberry32(31), 7, h * .40, h * .11);
    this.hill1  = this._ridge(mulberry32(99), 4, h * .60, h * .07);

    this.setTheme({ sky: ['#ffd7a8', '#b9d8f5', '#8fb8e8'], hill: '#7fb861', mount: '#9a94c8' });
  }

  setTheme(th) {
    if (this.theme && th.sky[0] === this.theme.sky[0] && th.hill === this.theme.hill) return;
    this.theme = th; this.dirty = true;
  }

  /** Điểm chẵn = đỉnh núi, điểm lẻ = yên ngựa → silhouette đọc rõ. */
  _ridge(R, peaks, baseY, amp) {
    const pts = [], n = peaks * 2;
    for (let i = 0; i <= n; i++) {
      const isPeak = i % 2 === 0;
      pts.push([i / n * this.w * 1.16 - this.w * .08,
                isPeak ? baseY - amp * (.55 + R() * .75) : baseY + amp * (.18 + R() * .30),
                isPeak]);
    }
    return pts;
  }

  _ridgePath(ctx, pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      const [x1, y1, isPeak] = pts[i];
      if (isPeak) ctx.lineTo(x1, y1);
      else { const [x0, y0] = pts[i - 1]; ctx.quadraticCurveTo((x0 + x1) / 2, y1, x1, y1); }
    }
    ctx.lineTo(this.w + 80, this.h + 80); ctx.lineTo(-80, this.h + 80); ctx.closePath();
  }

  // ── nướng các lớp tĩnh ────────────────────────────────────────────────────
  _bake() {
    const { w, h } = this, T = this.theme;
    const ctx = this.baked.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const sky = ctx.createLinearGradient(0, 0, 0, h * .78);
    sky.addColorStop(0, T.sky[0]); sky.addColorStop(.45, T.sky[1]); sky.addColorStop(1, T.sky[2]);
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);

    const sunX = w * .22, sunY = h * .17;
    const glow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, h * .5);
    glow.addColorStop(0, 'rgba(255,246,214,.75)');
    glow.addColorStop(.35, 'rgba(255,226,170,.24)');
    glow.addColorStop(1, 'rgba(255,220,160,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h * .7);
    ctx.fillStyle = 'rgba(255,252,235,.9)';
    ctx.beginPath(); ctx.arc(sunX, sunY, 30, 0, TAU); ctx.fill();

    this._ridgePath(ctx, this.mount1);
    ctx.fillStyle = rgba(T.mount, .55); ctx.fill();

    this._ridgePath(ctx, this.mount2);
    const mg = ctx.createLinearGradient(0, h * .3, 0, h * .72);
    mg.addColorStop(0, shade(T.mount, .12)); mg.addColorStop(1, shade(T.mount, -.28));
    ctx.fillStyle = mg; ctx.fill();
    ctx.save(); ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    for (const [px, py, isPeak] of this.mount2) {
      if (!isPeak) continue;
      ctx.beginPath();
      ctx.moveTo(px, py - 1); ctx.lineTo(px + 30, py + 30);
      ctx.quadraticCurveTo(px + 14, py + 20, px + 4, py + 27);
      ctx.quadraticCurveTo(px - 8, py + 17, px - 30, py + 30);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();

    this._ridgePath(ctx, this.hill1);
    const hg = ctx.createLinearGradient(0, h * .52, 0, h);
    hg.addColorStop(0, shade(T.hill, .18)); hg.addColorStop(.5, T.hill); hg.addColorStop(1, shade(T.hill, -.34));
    ctx.fillStyle = hg; ctx.fill();

    for (const tr of this.trees) {
      const tx = tr.x, ty = h * .70 + tr.s * 8, sc = tr.s;
      ctx.fillStyle = shade(T.hill, -.62);
      ctx.beginPath();
      ctx.moveTo(tx - 5 * sc, ty + 6 * sc); ctx.lineTo(tx - 2.5 * sc, ty - 34 * sc);
      ctx.lineTo(tx + 2.5 * sc, ty - 34 * sc); ctx.lineTo(tx + 5 * sc, ty + 6 * sc);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = shade(T.hill, -.22);
      ctx.beginPath(); ctx.ellipse(tx, ty - 40 * sc, 26 * sc, 22 * sc, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = shade(T.hill, -.06);
      ctx.beginPath(); ctx.ellipse(tx - 6 * sc, ty - 46 * sc, 16 * sc, 13 * sc, 0, 0, TAU); ctx.fill();
    }

    const gg = ctx.createLinearGradient(0, h * .76, 0, h);
    gg.addColorStop(0, shade(T.hill, .12)); gg.addColorStop(1, shade(T.hill, -.46));
    ctx.fillStyle = gg; ctx.fillRect(0, h * .76, w, h * .24);

    this.dirty = false;
    this._grassCol = this.grass.map(g => shade(T.hill, lerp(-.55, .1, g.tone)));
  }

  update(dt, pan = 0) {
    this.t += dt;
    this.pan = lerp(this.pan, pan, 1 - Math.pow(.002, dt));
    for (const c of this.clouds) { c.x += c.v * dt; if (c.x > this.w + 260) c.x = -260; }
    for (const b of this.birds)  { b.x += b.v * dt; if (b.x > this.w + 40) { b.x = -40; b.y = 70 + Math.random() * 150; } }
    if (perf.quality > Q.LOW) for (const p of this.pollen) {
      p.y -= p.v * dt * .35;
      p.x += Math.sin(this.t * .6 + p.ph) * 10 * dt;
      if (p.y < -10) { p.y = this.h + 10; p.x = Math.random() * this.w; }
    }
  }

  // ── vẽ: 1 ảnh nướng sẵn + vài lớp động ───────────────────────────────────
  draw(ctx) {
    const { w, h, t } = this, P = this.pan;
    if (this.dirty) this._bake();
    ctx.drawImage(this.baked, 0, 0);

    for (const c of this.clouds) {
      ctx.save();
      ctx.globalAlpha = c.a; ctx.fillStyle = '#fff';
      ctx.translate(c.x + P * .1, c.y);
      for (const [dx, dy, r] of c.puffs) {
        ctx.beginPath(); ctx.arc(dx * 46 * c.s, dy * 20 * c.s, r * 26 * c.s, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }

    ctx.strokeStyle = 'rgba(60,50,90,.55)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (const b of this.birds) {
      const f = Math.sin(t * 7 + b.ph) * 5, bx = b.x + P * .14;
      ctx.beginPath();
      ctx.moveTo(bx - 8 * b.s, b.y + f);
      ctx.quadraticCurveTo(bx, b.y - 3 * b.s, bx + 8 * b.s, b.y + f);
      ctx.stroke();
    }

    const step = perf.quality === Q.LOW ? 3 : perf.quality === Q.MED ? 2 : 1;
    ctx.save(); ctx.translate(P * .9, 0); ctx.lineCap = 'round';
    for (let i = 0; i < this.grass.length; i += step) {
      const g = this.grass[i];
      const bx = g.x, by = h * .78 + g.tone * 26;
      const sway = Math.sin(t * 1.7 + g.ph) * 7 * g.s;
      ctx.strokeStyle = this._grassCol[i];
      ctx.lineWidth = 2.6 * g.s * step;
      ctx.beginPath(); ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(bx + sway * .4, by - g.hh * .6, bx + sway, by - g.hh);
      ctx.stroke();
    }
    ctx.restore();

    if (perf.quality > Q.LOW) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = '#fff8d0';
      for (const p of this.pollen) {
        ctx.globalAlpha = .30 + .30 * Math.sin(t * 2 + p.ph);
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }
  }
}

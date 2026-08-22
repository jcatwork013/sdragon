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
  /**
   * @param w,h    DẢI GIAO DIỆN — mọi mốc dọc (chân núi, đường cỏ, mặt đất)
   *               neo theo đây, nên tranh nền không bị kéo méo khi khung vẽ cao.
   * @param ox,oy  vị trí dải trong khung vẽ
   * @param cw,ch  KHUNG VẼ — phần thừa ra ngoài dải vẫn được phủ kín.
   */
  constructor(w, h, ox = 0, oy = 0, cw = w, ch = h) {
    this.w = w; this.h = h; this.t = 0; this.pan = 0;
    this.ox = ox; this.oy = oy; this.cw = cw; this.ch = ch;
    // mép khung vẽ, quy về toạ độ của dải giao diện
    this.x0 = -ox; this.x1 = cw - ox;
    this.y0 = -oy; this.y1 = ch - oy;
    this.theme = null; this.dirty = true;
    this.baked = makeCanvas(cw, ch);

    const X0 = this.x0, SW = cw, Y0 = this.y0, SH = ch;
    const R = mulberry32(20260819);
    this.clouds = Array.from({ length: 7 }, () => ({
      x: X0 + R() * SW * 1.4 - SW * .2, y: Y0 + 40 + R() * Math.min(200, SH * .28), s: .55 + R() * 1.1,
      v: 5 + R() * 12, a: .32 + R() * .38,
      puffs: Array.from({ length: 4 }, () => [R() * 2 - 1, R() * .7 - .35, .5 + R() * .6]),
    }));
    this.birds  = Array.from({ length: 5 }, () => ({ x: X0 + R() * SW, y: Y0 + 70 + R() * Math.min(150, SH * .21), v: 22 + R() * 26, ph: R() * TAU, s: .6 + R() * .5 }));
    this.grass  = Array.from({ length: 96 }, () => ({ x: X0 + R() * SW, hh: 16 + R() * 30, ph: R() * TAU, s: .7 + R() * .8, tone: R() }));
    this.pollen = Array.from({ length: 30 }, () => ({ x: X0 + R() * SW, y: Y0 + R() * SH, r: .8 + R() * 2.2, ph: R() * TAU, v: 6 + R() * 16 }));
    this.trees  = Array.from({ length: 11 }, () => ({ x: X0 + R() * SW, s: .5 + R() * .8, ph: R() * TAU }));
    // Hoa được nướng vào nền, côn trùng mới chuyển động. Tách như vậy giúp cảnh
    // giàu chi tiết mà chi phí mỗi khung hình vẫn rất nhỏ trên Android cũ.
    this.flowers = Array.from({ length: 58 }, (_, i) => ({
      x: X0 + R() * SW, y: h * (.795 + R() * .17), s: .45 + R() * .9,
      hue: ['#ffe066', '#ff7ca8', '#f3e9ff', '#7ee8d1', '#ffad62'][i % 5], ph: R() * TAU,
    }));
    this.fauna = Array.from({ length: 12 }, (_, i) => ({
      x: X0 + R() * SW, y: h * (.56 + R() * .27), s: .55 + R() * .75,
      v: 12 + R() * 24, ph: R() * TAU, kind: i % 3 === 0 ? 'bee' : 'butterfly',
      col: ['#ff7fb5', '#8f7cff', '#ffd84e', '#54d9c1'][i % 4],
    }));

    this.mount1 = this._ridge(mulberry32(7),  5, h * .30, h * .16);
    this.mount2 = this._ridge(mulberry32(31), 7, h * .40, h * .11);
    this.hill1  = this._ridge(mulberry32(99), 4, h * .60, h * .07);

    this.setTheme({ sky: ['#ffd7a8', '#b9d8f5', '#8fb8e8'], hill: '#7fb861', mount: '#9a94c8' });
  }

  /**
   * `biome` quyết định CẢNH VẬT, không chỉ màu:
   *   grass — đồi cỏ, cây tròn, nắng vàng          (mảnh 1 · Bờ Cỏ Nhà)
   *   bog   — sương mù, vũng nước, bụi sậy         (mảnh 2 · Đầm Rêu)
   *   peak  — núi đá nhọn, biển mây, vệt gió       (mảnh 3 · Đỉnh Gió)
   *   mush  — trời đêm, nấm khổng lồ phát sáng     (mảnh 4 · Rừng Nấm)
   * Đổi mỗi bảng màu thì mảnh nào cũng ra đồi cỏ, chỉ khác tông — nhìn là biết
   * cùng một tấm nền tô lại.
   */
  setTheme(th) {
    if (this.theme && th.sky[0] === this.theme.sky[0] && th.hill === this.theme.hill
        && (th.biome || 'grass') === (this.theme.biome || 'grass')) return;
    this.theme = th; this.dirty = true;
  }

  /** Điểm chẵn = đỉnh núi, điểm lẻ = yên ngựa → silhouette đọc rõ. */
  _ridge(R, peaks, baseY, amp) {
    const pts = [], n = peaks * 2;
    const span = this.x1 - this.x0, x0 = this.x0 - span * .08;
    for (let i = 0; i <= n; i++) {
      const isPeak = i % 2 === 0;
      pts.push([x0 + i / n * span * 1.16,
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
    ctx.lineTo(this.x1 + 80, this.y1 + 80); ctx.lineTo(this.x0 - 80, this.y1 + 80); ctx.closePath();
  }

  // ── nướng các lớp tĩnh ────────────────────────────────────────────────────
  _bake() {
    const { w, h, x0, y0, x1, y1 } = this, T = this.theme;
    const SW = x1 - x0, SH = y1 - y0;
    const ctx = this.baked.getContext('2d');
    // Gốc toạ độ đặt tại góc DẢI GIAO DIỆN → toàn bộ phép dựng cảnh bên dưới
    // giữ nguyên như khi chưa có khung vẽ rộng hơn.
    ctx.setTransform(1, 0, 0, 1, this.ox, this.oy);
    ctx.clearRect(x0, y0, SW, SH);

    // Trời phủ kín khung vẽ; gradient neo theo dải nên hai đầu tự kéo phẳng ra.
    const sky = ctx.createLinearGradient(0, 0, 0, h * .78);
    sky.addColorStop(0, T.sky[0]); sky.addColorStop(.45, T.sky[1]); sky.addColorStop(1, T.sky[2]);
    ctx.fillStyle = sky; ctx.fillRect(x0, y0, SW, SH);

    // Hai lớp khí quyển mỏng làm chân trời tách lớp, tránh cảm giác các mảng
    // núi phẳng dính lên một gradient duy nhất.
    const haze = ctx.createLinearGradient(0, h * .18, 0, h * .66);
    haze.addColorStop(0, 'rgba(255,255,255,0)');
    haze.addColorStop(.58, 'rgba(255,245,226,.18)');
    haze.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = haze; ctx.fillRect(x0, h * .14, SW, h * .58);

    const B = T.biome || 'grass';
    const sunX = w * .22, sunY = h * .17;
    if (B === 'mush') {
      // TRỜI ĐÊM: sao thưa + trăng lưỡi liềm
      const R2 = mulberry32(4242);
      ctx.fillStyle = '#fff';
      for (let i = 0; i < 90; i++) {
        const sx = x0 + R2() * SW, sy = y0 + R2() * h * .55, r = .6 + R2() * 1.4;
        ctx.globalAlpha = .25 + R2() * .6;
        ctx.beginPath(); ctx.arc(sx, sy, r, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
      const mg2 = ctx.createRadialGradient(w * .78, h * .15, 0, w * .78, h * .15, h * .34);
      mg2.addColorStop(0, 'rgba(210,230,255,.5)'); mg2.addColorStop(1, 'rgba(180,210,255,0)');
      ctx.fillStyle = mg2; ctx.fillRect(x0, y0, SW, h * .6);
      ctx.fillStyle = '#eaf2ff';
      ctx.beginPath(); ctx.arc(w * .78, h * .15, 26, 0, TAU); ctx.fill();
      ctx.fillStyle = T.sky[0];
      ctx.beginPath(); ctx.arc(w * .78 + 11, h * .15 - 7, 24, 0, TAU); ctx.fill();
    } else {
      const glow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, h * .5);
      const warm = B === 'bog' ? ['rgba(226,240,224,.55)', 'rgba(200,225,205,.20)', 'rgba(200,225,205,0)']
                 : B === 'peak' ? ['rgba(255,250,235,.85)', 'rgba(255,236,200,.28)', 'rgba(255,236,200,0)']
                 : ['rgba(255,246,214,.75)', 'rgba(255,226,170,.24)', 'rgba(255,220,160,0)'];
      glow.addColorStop(0, warm[0]); glow.addColorStop(.35, warm[1]); glow.addColorStop(1, warm[2]);
      ctx.fillStyle = glow; ctx.fillRect(x0, y0, SW, h * .7 - y0);
      ctx.fillStyle = B === 'bog' ? 'rgba(240,248,238,.75)' : 'rgba(255,252,235,.9)';
      ctx.beginPath(); ctx.arc(sunX, sunY, B === 'bog' ? 26 : 30, 0, TAU); ctx.fill();
    }

    this._ridgePath(ctx, this.mount1);
    ctx.fillStyle = rgba(T.mount, .55); ctx.fill();
    ctx.save(); ctx.clip();
    const farLight = ctx.createLinearGradient(0, h * .24, 0, h * .54);
    farLight.addColorStop(0, 'rgba(255,255,255,.20)'); farLight.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = farLight; ctx.fillRect(x0, h * .18, SW, h * .42);
    ctx.restore();

    this._ridgePath(ctx, this.mount2);
    const mg = ctx.createLinearGradient(0, h * .3, 0, h * .72);
    mg.addColorStop(0, shade(T.mount, .12)); mg.addColorStop(1, shade(T.mount, -.28));
    ctx.fillStyle = mg; ctx.fill();
    ctx.save(); ctx.clip();
    ctx.fillStyle = B === 'peak' ? 'rgba(255,255,255,.85)' : 'rgba(255,255,255,.55)';
    for (const [px, py, isPeak] of this.mount2) {
      if (!isPeak || B === 'bog' || B === 'mush') continue;
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
      if (B === 'bog') {
        // BỤI SẬY: túm que cao, đầu bông nâu
        ctx.strokeStyle = shade(T.hill, -.52); ctx.lineWidth = 2.6 * sc; ctx.lineCap = 'round';
        for (let k = -2; k <= 2; k++) {
          const bx = tx + k * 6 * sc, top = ty - (48 + Math.abs(k) * -6) * sc;
          ctx.beginPath(); ctx.moveTo(bx, ty + 4 * sc);
          ctx.quadraticCurveTo(bx + k * 4 * sc, (ty + top) / 2, bx + k * 8 * sc, top); ctx.stroke();
          ctx.fillStyle = shade('#8a6a3a', -.1);
          ctx.beginPath(); ctx.ellipse(bx + k * 8 * sc, top, 3.2 * sc, 8 * sc, k * .12, 0, TAU); ctx.fill();
        }
      } else if (B === 'peak') {
        // CỘT ĐÁ: khối nhọn, hai sắc độ
        ctx.fillStyle = shade(T.mount, -.34);
        ctx.beginPath();
        ctx.moveTo(tx - 13 * sc, ty + 8 * sc); ctx.lineTo(tx - 4 * sc, ty - 52 * sc);
        ctx.lineTo(tx + 6 * sc, ty - 30 * sc); ctx.lineTo(tx + 14 * sc, ty + 8 * sc);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = shade(T.mount, -.06);
        ctx.beginPath();
        ctx.moveTo(tx - 4 * sc, ty - 52 * sc); ctx.lineTo(tx + 6 * sc, ty - 30 * sc);
        ctx.lineTo(tx + 2 * sc, ty + 8 * sc); ctx.lineTo(tx - 4 * sc, ty + 8 * sc);
        ctx.closePath(); ctx.fill();
      } else if (B === 'mush') {
        // NẤM KHỔNG LỒ: cuống cong, mũ phát sáng, chấm sáng trên mũ
        const cap = ty - 52 * sc;
        ctx.strokeStyle = '#d8cfe8'; ctx.lineWidth = 7 * sc; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(tx, ty + 6 * sc);
        ctx.quadraticCurveTo(tx - 5 * sc, ty - 26 * sc, tx, cap + 6 * sc); ctx.stroke();
        const cg = ctx.createLinearGradient(tx, cap - 20 * sc, tx, cap + 10 * sc);
        cg.addColorStop(0, '#b48aff'); cg.addColorStop(1, '#6a3fa8');
        ctx.fillStyle = cg;
        ctx.beginPath(); ctx.ellipse(tx, cap + 4 * sc, 30 * sc, 20 * sc, 0, Math.PI, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(220,255,240,.85)';
        for (let k = -1; k <= 1; k++) {
          ctx.beginPath(); ctx.arc(tx + k * 13 * sc, cap - 3 * sc - Math.abs(k) * 3 * sc, 3.4 * sc, 0, TAU); ctx.fill();
        }
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const gg2 = ctx.createRadialGradient(tx, cap, 2, tx, cap, 54 * sc);
        gg2.addColorStop(0, 'rgba(150,255,220,.30)'); gg2.addColorStop(1, 'rgba(150,255,220,0)');
        ctx.fillStyle = gg2; ctx.beginPath(); ctx.arc(tx, cap, 54 * sc, 0, TAU); ctx.fill();
        ctx.restore();
      } else {
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
    }

    const gg = ctx.createLinearGradient(0, h * .76, 0, h);
    gg.addColorStop(0, shade(T.hill, .12)); gg.addColorStop(1, shade(T.hill, -.46));
    ctx.fillStyle = gg; ctx.fillRect(x0, h * .76, SW, y1 - h * .76);

    // thảm hoa tiền cảnh: khác bảng màu theo sinh cảnh nhưng luôn đủ nhỏ để
    // không tranh mắt với bàn chơi. Trên đầm là bông sậy, trên đỉnh là hoa núi,
    // rừng nấm chuyển thành cụm lân tinh.
    for (let i = 0; i < this.flowers.length; i++) {
      if (B === 'bog' && i % 2) continue;
      if (B === 'peak' && i % 3) continue;
      const f = this.flowers[i], fs = f.s * (B === 'mush' ? 1.18 : 1);
      const stem = B === 'mush' ? '#6ad6a8' : shade(T.hill, -.48);
      ctx.strokeStyle = rgba(stem, .72); ctx.lineWidth = Math.max(1, 1.35 * fs); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(f.x, f.y + 7 * fs); ctx.quadraticCurveTo(f.x - 2, f.y + 1, f.x, f.y - 6 * fs); ctx.stroke();
      if (B === 'bog') {
        ctx.fillStyle = i % 4 ? '#b88558' : '#f4d7a1';
        ctx.beginPath(); ctx.ellipse(f.x, f.y - 8 * fs, 2.3 * fs, 6 * fs, -.12, 0, TAU); ctx.fill();
      } else if (B === 'mush') {
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = i % 2 ? '#8dffe0' : '#d99cff';
        ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 7 * fs;
        ctx.beginPath(); ctx.arc(f.x, f.y - 7 * fs, 2.8 * fs, 0, TAU); ctx.fill(); ctx.restore();
      } else {
        ctx.fillStyle = f.hue;
        for (let p = 0; p < 5; p++) {
          const a = p / 5 * TAU + f.ph;
          ctx.beginPath(); ctx.ellipse(f.x + Math.cos(a) * 3.1 * fs, f.y - 7 * fs + Math.sin(a) * 3.1 * fs,
                                      2.2 * fs, 1.35 * fs, a, 0, TAU); ctx.fill();
        }
        ctx.fillStyle = '#ffe66b'; ctx.beginPath(); ctx.arc(f.x, f.y - 7 * fs, 1.7 * fs, 0, TAU); ctx.fill();
      }
    }

    if (B === 'bog') {
      // vũng nước đọng + dải sương ngang
      const R3 = mulberry32(777);
      for (let i = 0; i < 7; i++) {
        const px2 = x0 + R3() * SW, py2 = h * (.80 + R3() * .16), rw = 40 + R3() * 90;
        ctx.fillStyle = 'rgba(180,215,215,.30)';
        ctx.beginPath(); ctx.ellipse(px2, py2, rw, rw * .16, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(230,245,245,.35)'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.ellipse(px2, py2, rw * .7, rw * .10, 0, 0, TAU); ctx.stroke();
      }
      for (let i = 0; i < 4; i++) {
        const my = h * (.58 + i * .07);
        const mgd = ctx.createLinearGradient(0, my - 18, 0, my + 18);
        mgd.addColorStop(0, 'rgba(226,240,236,0)');
        mgd.addColorStop(.5, `rgba(226,240,236,${.24 - i * .04})`);
        mgd.addColorStop(1, 'rgba(226,240,236,0)');
        ctx.fillStyle = mgd; ctx.fillRect(x0, my - 18, SW, 36);
      }
    }
    if (B === 'peak') {
      // BIỂN MÂY dưới chân: dải trắng dày phủ ngang lưng núi
      for (let i = 0; i < 3; i++) {
        const my = h * (.62 + i * .06);
        const cgd = ctx.createLinearGradient(0, my - 26, 0, my + 26);
        cgd.addColorStop(0, 'rgba(255,255,255,0)');
        cgd.addColorStop(.5, `rgba(255,255,255,${.55 - i * .14})`);
        cgd.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = cgd; ctx.fillRect(x0, my - 26, SW, 52);
      }
    }
    if (B === 'mush') {
      // đất phát lân quang mờ
      const lg = ctx.createLinearGradient(0, h * .74, 0, h);
      lg.addColorStop(0, 'rgba(120,255,210,.10)'); lg.addColorStop(1, 'rgba(120,255,210,0)');
      ctx.fillStyle = lg; ctx.fillRect(x0, h * .74, SW, y1 - h * .74);
    }

    this.dirty = false;
    this._grassCol = this.grass.map(g => shade(T.hill, lerp(-.55, .1, g.tone)));
  }

  update(dt, pan = 0) {
    this.t += dt;
    this.pan = lerp(this.pan, pan, 1 - Math.pow(.002, dt));
    const { x0, x1, y0, y1 } = this;
    for (const c of this.clouds) { c.x += c.v * dt; if (c.x > x1 + 260) c.x = x0 - 260; }
    for (const b of this.birds)  { b.x += b.v * dt; if (b.x > x1 + 40) { b.x = x0 - 40; b.y = y0 + 70 + Math.random() * Math.min(150, (y1 - y0) * .21); } }
    for (const f of this.fauna) {
      f.x += f.v * dt;
      f.y += Math.sin(this.t * 2.2 + f.ph) * 5 * dt;
      if (f.x > x1 + 30) { f.x = x0 - 30; f.y = this.h * (.56 + Math.random() * .27); }
    }
    if (perf.quality > Q.LOW) for (const p of this.pollen) {
      p.y -= p.v * dt * .35;
      p.x += Math.sin(this.t * .6 + p.ph) * 10 * dt;
      if (p.y < y0 - 10) { p.y = y1 + 10; p.x = x0 + Math.random() * (x1 - x0); }
    }
  }

  // ── vẽ: 1 ảnh nướng sẵn + vài lớp động ───────────────────────────────────
  draw(ctx) {
    const { w, h, t } = this, P = this.pan;
    if (this.dirty) this._bake();
    ctx.drawImage(this.baked, this.x0, this.y0);

    const BM = (this.theme && this.theme.biome) || 'grass';
    for (const c of this.clouds) {
      if (BM === 'mush') break;                       // đêm rừng nấm: không mây
      ctx.save();
      ctx.globalAlpha = BM === 'bog' ? c.a * .55 : c.a; ctx.fillStyle = BM === 'peak' ? '#fff' : '#fff';
      ctx.translate(c.x + P * .1, c.y);
      for (const [dx, dy, r] of c.puffs) {
        ctx.beginPath(); ctx.arc(dx * 46 * c.s, dy * 20 * c.s, r * 26 * c.s, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }

    ctx.strokeStyle = 'rgba(60,50,90,.55)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (const b of (BM === 'mush' ? [] : this.birds)) {
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

    // Bướm và ong lượn sát thảm cỏ. Màu được đổi nhẹ theo biome để chúng thuộc
    // về cảnh thay vì trông như icon UI bay ngang màn hình.
    const faunaStep = perf.quality === Q.LOW ? 3 : perf.quality === Q.MED ? 2 : 1;
    for (let i = 0; i < this.fauna.length; i += faunaStep) {
      const f = this.fauna[i], fy = f.y + Math.sin(t * 2.8 + f.ph) * 8, flap = .2 + .8 * Math.abs(Math.sin(t * 11 + f.ph));
      ctx.save(); ctx.translate(f.x + P * .72, fy); ctx.scale(f.s, f.s);
      if (f.kind === 'bee') {
        ctx.save(); ctx.globalAlpha = .48;
        ctx.fillStyle = '#e9f8ff';
        ctx.beginPath(); ctx.ellipse(-3, -4, 6, 3 * flap, -.45, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(4, -4, 6, 3 * flap, .45, 0, TAU); ctx.fill(); ctx.restore();
        ctx.fillStyle = '#ffc936'; ctx.strokeStyle = '#49340a'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.ellipse(0, 0, 7, 4.5, .08, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#49340a'; ctx.lineWidth = 2;
        for (const bx of [-2, 2]) { ctx.beginPath(); ctx.moveTo(bx, -3.5); ctx.lineTo(bx, 3.5); ctx.stroke(); }
      } else {
        const col = BM === 'bog' ? '#a8e8cf' : BM === 'mush' ? '#c997ff' : f.col;
        ctx.globalAlpha = .78; ctx.fillStyle = col; ctx.strokeStyle = rgba(shade(col, -.45), .72); ctx.lineWidth = 1.1;
        for (const sx of [-1, 1]) {
          ctx.beginPath(); ctx.ellipse(sx * 4.5, -1, 5.2, 5.8 * flap, sx * .34, 0, TAU); ctx.fill(); ctx.stroke();
        }
        ctx.fillStyle = '#34213c'; ctx.beginPath(); ctx.ellipse(0, 1, 1.4, 5, 0, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }

    if (perf.quality > Q.LOW) {
      // hạt bay: phấn hoa (cỏ) · đom đóm (đầm) · bụi tuyết (đỉnh) · bào tử (nấm)
      const dust = BM === 'bog' ? '#bdfff0' : BM === 'peak' ? '#ffffff' : BM === 'mush' ? '#9dffcf' : '#fff8d0';
      const big = BM === 'mush' || BM === 'bog' ? 1.7 : 1;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = dust;
      for (const p of this.pollen) {
        ctx.globalAlpha = (BM === 'mush' ? .45 : .30) + .30 * Math.sin(t * 2 + p.ph);
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * big, 0, TAU); ctx.fill();
      }
      ctx.restore();
      if (BM === 'peak') {                            // vệt gió ngang
        ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
        for (let i = 0; i < 7; i++) {
          const wy = this.y0 + 90 + i * 62, ph2 = i * 1.7;
          const wx = this.x0 + ((t * 150 + i * 340) % ((this.x1 - this.x0) + 300)) - 150;
          ctx.globalAlpha = .18 + .16 * Math.sin(t * 2 + ph2);
          ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx + 120, wy - 6); ctx.stroke();
        }
        ctx.restore();
      }
    }
  }
}

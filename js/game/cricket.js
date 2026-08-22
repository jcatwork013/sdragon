// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  CON DẾ — nhân vật chính, vẽ 100% bằng Canvas path, không dùng ảnh.      ║
// ║                                                                          ║
// ║  Dáng nghiêng hướng phải, tư thế lữ hành. Bóng dáng đặc trưng của dế:    ║
// ║  hai râu dài cong · tấm mai ngực (pronotum) như áo giáp · cánh cứng bóng  ║
// ║  · bụng nhiều đốt · và ĐÔI CÀNG SAU to khoẻ — thứ khiến ai cũng nhận ra   ║
// ║  ngay đó là con dế.                                                      ║
// ╚══════════════════════════════════════════════════════════════════════════╝
import { TAU, lerp, clamp, ease, rgba, shade, mix } from '../core/util.js';
import { STAGES, SPECIES } from '../data/characters.js';
import { recipeById, auraOf } from '../data/gear.js';
import { pickPoke } from '../data/beats.js';
import { perf, Q } from '../core/perf.js';

// ── tiện ích hình học ───────────────────────────────────────────────────────
const bez = (a, b, c, d, t) => {
  const u = 1 - t;
  return { x: u*u*u*a.x + 3*u*u*t*b.x + 3*u*t*t*c.x + t*t*t*d.x,
           y: u*u*u*a.y + 3*u*u*t*b.y + 3*u*t*t*c.y + t*t*t*d.y };
};
const bezD = (a, b, c, d, t) => {
  const u = 1 - t;
  return { x: 3*u*u*(b.x-a.x) + 6*u*t*(c.x-b.x) + 3*t*t*(d.x-c.x),
           y: 3*u*u*(b.y-a.y) + 6*u*t*(c.y-b.y) + 3*t*t*(d.y-c.y) };
};
/** Khối thon theo hàm bề rộng: đi dọc trục a→b, bề rộng lấy từ wAt(0..1). */
function taperShape(ctx, ax, ay, bx, by, wAt, n = 22) {
  const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1;
  const ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
  const top = [], bot = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, w = wAt(u), px = ax + ux * L * u, py = ay + uy * L * u;
    top.push([px + nx * w, py + ny * w]); bot.push([px - nx * w, py - ny * w]);
  }
  ctx.beginPath();
  ctx.moveTo(top[0][0], top[0][1]);
  for (const p of top) ctx.lineTo(p[0], p[1]);
  for (let i = bot.length - 1; i >= 0; i--) ctx.lineTo(bot[i][0], bot[i][1]);
  ctx.closePath();
}
/** Một đốt chân: hình thang thon từ p0 (dày w0) tới p1 (dày w1). */
function boneShape(ctx, p0, p1, w0, w1) {
  const dx = p1.x - p0.x, dy = p1.y - p0.y, L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L, ny = dx / L;
  ctx.beginPath();
  ctx.moveTo(p0.x + nx * w0, p0.y + ny * w0);
  ctx.lineTo(p1.x + nx * w1, p1.y + ny * w1);
  ctx.lineTo(p1.x - nx * w1, p1.y - ny * w1);
  ctx.lineTo(p0.x - nx * w0, p0.y - ny * w0);
  ctx.closePath();
}
/** Dải cong thon dần — dùng cho đuôi và cổ. */
function taper(ctx, a, b, c, d, w0, w1, n = 18) {
  const L = [], R = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, p = bez(a, b, c, d, t), v = bezD(a, b, c, d, t);
    const len = Math.hypot(v.x, v.y) || 1;
    const nx = -v.y / len, ny = v.x / len, w = lerp(w0, w1, t) / 2;
    L.push([p.x + nx * w, p.y + ny * w]); R.push([p.x - nx * w, p.y - ny * w]);
  }
  ctx.beginPath();
  ctx.moveTo(L[0][0], L[0][1]);
  for (const p of L) ctx.lineTo(p[0], p[1]);
  for (let i = R.length - 1; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]);
  ctx.closePath();
  const dv = bezD(a, b, c, d, 1), dl = Math.hypot(dv.x, dv.y) || 1;
  return { tip: bez(a, b, c, d, 1), mid: bez(a, b, c, d, .5),
           ang: Math.atan2(dv.y / dl, dv.x / dl) };
}

// ── TRỨNG DẾ ───────────────────────────────────────────────────────────────────
/** @param o { t, wobble 0..1, crack 0..1, selected, glow } */
export function drawEgg(ctx, breed, x, y, r, o = {}) {
  const t = o.t ?? 0;
  const wob = (o.wobble ?? 0) * Math.sin(t * 7) * .16;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(wob);

  // bóng
  ctx.save(); ctx.globalAlpha = .3; ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.ellipse(0, r * 1.12, r * .78, r * .18, 0, 0, TAU); ctx.fill();
  ctx.restore();

  if (o.glow) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(0, 0, r * .4, 0, 0, r * 2);
    g.addColorStop(0, rgba(breed.shellA, .55 * o.glow)); g.addColorStop(1, rgba(breed.shellA, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r * 2, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // thân trứng (hình giọt: trên hẹp, dưới tròn)
  const egg = () => {
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.06);
    ctx.bezierCurveTo( r * .60, -r * 1.02,  r * .92, -r * .16, r * .84, r * .30);
    ctx.bezierCurveTo( r * .78,  r * .86,   r * .38,  r * 1.10, 0, r * 1.10);
    ctx.bezierCurveTo(-r * .38,  r * 1.10, -r * .78,  r * .86, -r * .84, r * .30);
    ctx.bezierCurveTo(-r * .92, -r * .16,  -r * .60, -r * 1.02, 0, -r * 1.06);
    ctx.closePath();
  };
  egg();
  const g = ctx.createLinearGradient(-r * .7, -r, r * .7, r);
  g.addColorStop(0, shade(breed.shellA, .34));
  g.addColorStop(.5, breed.shellA);
  g.addColorStop(1, breed.shellB);
  ctx.fillStyle = g; ctx.fill();

  // hoa văn đốm — rải theo góc vàng nên phân bố đều mà không thành hàng lối
  ctx.save(); egg(); ctx.clip();
  for (let i = 0; i < 13; i++) {
    const a = i * 2.399, k = (i * 7 % 5) / 4;
    const rr = r * (.055 + k * .075);
    const px = Math.cos(a) * r * (.20 + (i % 3) * .17);
    const py = Math.sin(a) * r * (.24 + (i % 4) * .19);
    ctx.globalAlpha = .30 + k * .34;
    ctx.fillStyle = i % 4 === 3 ? shade(breed.shellB, .18) : breed.spot;
    ctx.beginPath(); ctx.ellipse(px, py, rr, rr * .74, a, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // khối tròn: đáy tối lại, đỉnh trên-trái ăn sáng
  const shd = ctx.createRadialGradient(r * .30, r * .62, r * .05, r * .10, r * .55, r * 1.25);
  shd.addColorStop(0, mix(breed.shellB, -.55, .45));
  shd.addColorStop(1, mix(breed.shellB, -.55, 0));
  ctx.fillStyle = shd; ctx.beginPath(); ctx.arc(r * .10, r * .55, r * 1.25, 0, TAU); ctx.fill();
  // vệt sáng chính + vệt phụ mảnh
  ctx.globalAlpha = .55; ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.ellipse(-r * .34, -r * .44, r * .16, r * .30, -.4, 0, TAU); ctx.fill();
  ctx.globalAlpha = .32;
  ctx.beginPath(); ctx.ellipse(-r * .52, -r * .18, r * .055, r * .16, -.32, 0, TAU); ctx.fill();
  ctx.restore();

  // vết nứt
  const cr = o.crack ?? 0;
  if (cr > 0) {
    ctx.save();
    ctx.strokeStyle = 'rgba(20,10,30,.85)'; ctx.lineWidth = r * .055; ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // nứt chính chạy dọc + 2 nhánh rẽ, lộ dần theo `crack`
    const spine = [[.02,-.86],[.20,-.52],[-.06,-.22],[.22,.10],[-.02,.44],[.14,.74]];
    const drawRun = (pts) => {
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < pts.length; i++) {
        if (i / (pts.length - 1) > cr) break;
        const [px, py] = pts[i];
        started ? ctx.lineTo(px * r, py * r) : (ctx.moveTo(px * r, py * r), started = true);
      }
      if (started) ctx.stroke();
    };
    drawRun(spine);
    if (cr > .45) drawRun([[-.06,-.22],[-.34,-.10],[-.46,.14]]);
    if (cr > .70) drawRun([[.22,.10],[.50,.06],[.62,.28]]);
    if (cr > .5) {                       // ánh sáng rò qua khe nứt
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = rgba(breed.eye, (cr - .5) * 1.4); ctx.lineWidth = r * .09;
      drawRun(spine);
    }
    ctx.restore();
  }

  // viền
  egg();
  ctx.strokeStyle = mix(breed.shellB, -.25, .95); ctx.lineWidth = r * .065; ctx.stroke();

  if (o.selected) {
    ctx.strokeStyle = `rgba(255,230,140,${.6 + .4 * Math.sin(t * 6)})`;
    ctx.lineWidth = r * .09; ctx.setLineDash([r * .22, r * .16]);
    ctx.lineDashOffset = -t * 40;
    ctx.beginPath(); ctx.ellipse(0, r * .02, r * 1.06, r * 1.24, 0, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
}



export class Cricket {
  constructor(breed, xp = 0) {
    this.breed = breed;
    this.xp = xp;
    this.t = 0;
    this.mood = 'idle';        // idle | happy | chirp | eat | hurt | proud
    this.moodT = 0;
    this.flap = 0;             // độ rung cánh (dế gáy bằng cánh)
    this.mouth = 0;
    this.blink = 0;
    this.blinkAt = 2 + Math.random() * 3;
    this.bounce = 0;
    this.chirpT = 0;
    this.onChirp = null;
    this.antic = null; this.anticT = 0;
    this.pokeShake = 0;
    this.pose = null;          // null | 'taunt' (ăn mừng đểu) | 'ko' (nằm băng bó)
    this.poseT = 0;
    this.anticAt = 4 + Math.random() * 5;
  }

  get stage() { let s = STAGES[0]; for (const st of STAGES) if (this.xp >= st.xp) s = st; return s; }

  react(mood, dur = 1.1) { this.mood = mood; this.moodT = dur; if (mood === 'happy') this.bounce = 1; }

  /**
   * Bị người chơi chạm vào → giãy nảy lên: nhảy, rung râu, gáy inh ỏi.
   * Trả về câu thoại để màn hình hiện bong bóng.
   */
  poke() {
    const p = pickPoke();
    this.react(p.mood === 'bop' ? 'happy' : p.mood, 1.3);
    if (p.mood === 'bop') { this.antic = 'bop'; this.anticT = 1.1; }
    if (p.mood === 'chirp') { this.mood = 'chirp'; this.moodT = 1.1; this.chirpT = 0; }
    this.bounce = 1;
    this.pokeShake = 1;
    return p;
  }
  /** Đòn GÁY: rung cánh phát ra sóng âm. */
  chirpBurst(dur = 0.9) { this.mood = 'chirp'; this.moodT = dur; this.chirpT = dur; }

  /** Tư thế kết trận. 'taunt' = vênh mặt trêu ngươi · 'ko' = chổng vó băng bó. */
  setPose(p) { this.pose = p; this.poseT = 0; if (p === 'taunt') this.bounce = 1; }

  update(dt) {
    this.t += dt;
    if (this.pose) this.poseT += dt;
    if (this.moodT > 0) { this.moodT -= dt; if (this.moodT <= 0) this.mood = 'idle'; }

    // ── trò vặt lúc rảnh: ngáp · chùi râu · nhún nhảy · vênh mặt ──────────
    if (this.mood === 'idle') {
      this.anticAt -= dt;
      if (this.anticAt <= 0) {
        this.antic = ['yawn', 'groom', 'bop', 'proud'][(Math.random() * 4) | 0];
        this.anticT = this.antic === 'bop' ? 1.6 : 1.2;
        this.anticAt = 5 + Math.random() * 6;
      }
    } else { this.antic = null; this.anticT = 0; }
    if (this.anticT > 0) { this.anticT -= dt; if (this.anticT <= 0) this.antic = null; }

    const want = this.mood === 'happy' ? 1 : this.mood === 'chirp' ? .95 : this.mood === 'hurt' ? .2 : 0;
    this.flap  = lerp(this.flap, want, 1 - Math.pow(.02, dt));
    this.mouth = lerp(this.mouth,
      this.mood === 'chirp' ? 1 : this.mood === 'eat' ? .8 : this.antic === 'yawn' ? 1 : 0,
      1 - Math.pow(.005, dt));
    this.bounce = Math.max(0, this.bounce - dt * 1.8);
    this.pokeShake = Math.max(0, this.pokeShake - dt * 3.2);

    this.blinkAt -= dt;
    if (this.blinkAt <= 0) { this.blink = 1; this.blinkAt = 2.2 + Math.random() * 3.4; }
    this.blink = Math.max(0, this.blink - dt * 7);

    if (this.chirpT > 0) {
      this.chirpT -= dt;
      if (this.onChirp && this.mouthPos) this.onChirp(this.mouthPos.x, this.mouthPos.y, 1, -0.12);
    }
  }

  draw(ctx, x, y, s, face = 1) {
    const B = this.breed, st = this.stage, t = this.t;
    const S = s * st.scale;
    const young  = 1 - st.id * 0.13;                  // non thì đầu to hơn
    const SPC    = SPECIES[B.species] || SPECIES.cricket;   // hình dáng theo loài
    const breath = 1 + Math.sin(t * 2.3) * .026;
    const bopA   = this.antic === 'bop' ? Math.abs(Math.sin(this.t * 9)) : 0;
    const air    = ease.outCubic(clamp(this.bounce, 0, 1));  // độ rời mặt đất
    const bob    = Math.sin(t * 2.3 + .7) * S * .020 - air * S * .13 - bopA * S * .10;
    const sway   = Math.sin(t * 1.4);
    const proud  = this.antic === 'proud' || this.mood === 'proud' ? 1 : 0;
    // Cánh lớn dần theo giai đoạn: dế con chỉ có mầm cánh, trưởng thành mới đủ bộ.
    const WING   = (0.34 + st.wing * 0.62) * SPC.wing;

    // ── AURA ─────────────────────────────────────────────────────────────
    // Mỗi món bậc 4 đang mặc góp một vầng sáng. Vẽ TRƯỚC và phía sau nhân vật
    // để nó hắt ra ngoài chứ không phủ lên mặt. Nhiều món thì nhiều lớp chồng
    // nhau, đậm dần — người chơi thấy ngay tiền mình bỏ ra đi đâu.
    const auras = this.gear ? auraOf({ equip: this.gear }) : [];
    if (auras.length && perf.quality > Q.LOW) {
      ctx.save();
      ctx.translate(x, y + bob * .4);
      ctx.globalCompositeOperation = 'lighter';
      auras.forEach((col, i) => {
        const ph = t * 1.5 + i * 2.1;
        const rr = S * (1.02 + .06 * Math.sin(ph));
        const a = (.16 + .08 * Math.sin(ph * .8)) * (1 + auras.length * .12);
        const g2 = ctx.createRadialGradient(0, 0, S * .32, 0, 0, rr);
        g2.addColorStop(0, rgba(col, a));
        g2.addColorStop(.55, rgba(col, a * .45));
        g2.addColorStop(1, rgba(col, 0));
        ctx.fillStyle = g2;
        ctx.beginPath(); ctx.ellipse(0, 0, rr, rr * .82, 0, 0, TAU); ctx.fill();
      });
      // hạt sáng bay lên quanh nhân vật
      for (let i = 0; i < auras.length * 4; i++) {
        const k = (t * .45 + i / (auras.length * 4)) % 1;
        const a2 = i * 2.399;
        const px2 = Math.cos(a2) * S * (.30 + k * .34);
        const py2 = S * .40 - k * S * 1.05;
        ctx.globalAlpha = Math.sin(k * Math.PI) * .8;
        ctx.fillStyle = auras[i % auras.length];
        ctx.beginPath(); ctx.arc(px2, py2, S * .022 * (1 - k * .5), 0, TAU); ctx.fill();
      }
      ctx.restore();
    }

    // ── BÓNG ĐỔ (vẽ trong hệ toạ độ gốc để không nhấp nhô theo thân) ───────
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = .30 * (1 - air * .55);
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(0, S * .60, S * .52 * (1 - air * .18), S * .095 * (1 - air * .3), 0, 0, TAU);
    ctx.fill();
    ctx.restore();

    // ── TƯ THẾ KẾT TRẬN ───────────────────────────────────────────────────
    // Ăn mừng thì nhún nhảy + ngửa mặt ra sau (kiểu "có gì đâu"); thua thì lật
    // ngửa, chổng càng lên trời. Cả hai chỉ là phép biến đổi toàn thân cộng vài
    // lớp phụ, không phải dựng lại bộ khung — nên rẻ mà đọc ra ngay.
    const KO = this.pose === 'ko', TA = this.pose === 'taunt';
    const koK = KO ? ease.outBack(clamp(this.poseT / .55, 0, 1)) : 0;
    const taK = TA ? clamp(this.poseT / .3, 0, 1) : 0;
    const taBob = TA ? Math.abs(Math.sin(this.t * 4.2)) : 0;

    ctx.save();
    const shk = this.pokeShake > 0 ? Math.sin(this.t * 44) * this.pokeShake * S * .035 : 0;
    // Lật gần trọn 180°: nằm ngửa, sáu chân chổng lên trời — đúng kiểu con bọ
    // hết hơi trong tranh biếm. Quay ít hơn thì chỉ ra "bị xô ngã", không buồn cười.
    ctx.translate(x + shk, y + bob - taBob * S * .16 + koK * S * .30);
    ctx.rotate(shk * 0.004 + koK * 2.78 + taK * Math.sin(this.t * 2.6) * .05);
    ctx.scale(face, 1);

    // MỨC CHI TIẾT theo sức máy. Máy yếu bỏ các lớp phụ (viền sáng, chớp
    // sáng, bóng tiếp giáp, gân, vân) — bóng dáng và màu giữ nguyên nên nhìn
    // vẫn ra đúng nhân vật, chỉ bớt lớp trang trí. Đây là chỗ tốn nhất vì
    // nhân vật được vẽ ở gần như mọi màn.
    const LOD = perf.quality;
    const FINE = LOD === Q.HIGH, MID = LOD >= Q.MED;

    const ink   = mix(B.body, -.66, 1);
    const lite  = shade(B.body, .30);
    const LW    = S * .026;
    // Phân cấp nét — mẹo làm hình vector trông "có nghề":
    //   silhouette() = viền ngoài DÀY (định hình bóng dáng)
    //   line()       = nét thường
    //   hair()       = nét trong MẢNH (chi tiết, không tranh chấp với viền)
    const line = (w = 1) => { ctx.strokeStyle = ink; ctx.lineWidth = LW * w; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); };
    const silhouette = () => line(1.55);
    const hair = (a = .38) => { ctx.strokeStyle = mix(B.body, -.66, a); ctx.lineWidth = LW * .6; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); };
    /** Bóng tiếp giáp: vệt tối mềm ở chỗ hai khối chồng nhau. */
    const occlude = (cx0, cy0, rx, ry, rot = 0, a = .22) => {
      if (!MID) return;
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      const g = ctx.createRadialGradient(cx0, cy0, 0, cx0, cy0, Math.max(rx, ry));
      g.addColorStop(0, mix(B.body, -.66, a)); g.addColorStop(1, mix(B.body, -.66, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(cx0, cy0, rx, ry, rot, 0, TAU); ctx.fill();
      ctx.restore();
    };
    /**
     * Viền sáng mép trên-trái. Mẹo: clip vào chính khối rồi stroke bản sao
     * ĐÃ DỜI xuống-phải → nét sáng chỉ còn dính ở rìa hướng về nguồn sáng.
     */
    const rim = (path, a = .55, w = 1.4) => {
      if (!FINE) return;
      ctx.save();
      path(); ctx.clip();
      ctx.translate(LW * 1.5, LW * 1.7); path();
      ctx.strokeStyle = mix(B.body, .78, a); ctx.lineWidth = LW * w;
      ctx.lineJoin = 'round'; ctx.stroke();
      ctx.restore();
    };
    const chitin = (x0, y0, x1, y1) => {              // vỏ kitin bóng
      const g = ctx.createLinearGradient(x0, y0, x1, y1);
      g.addColorStop(0, lite); g.addColorStop(.42, B.body); g.addColorStop(1, shade(B.body, -.34));
      return g;
    };
    /** Vệt chớp sáng hình thoi — dùng cho mọi mảng vỏ bóng. */
    const gloss = (cx0, cy0, rx, ry, rot, a = .55) => {
      if (!MID) return;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(cx0, cy0, 0, cx0, cy0, Math.max(rx, ry));
      g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(cx0, cy0, rx, ry, rot, 0, TAU); ctx.fill();
      ctx.restore();
    };

    const gr = (slot) => recipeById(this.gear?.[slot]);

    // ── CHÂN & CÀNG BÊN XA — vẽ trước, tông tối để lùi ra sau ──────────────
    this._walkLeg(ctx, S * .04, S * .21, S * .26, mix(B.body, -.74, 1), mix(B.body, -.34, 1), LW * 1.30, t * 1.7 + 1.9);
    this._walkLeg(ctx, S * .22, S * .19, S * .23, mix(B.body, -.74, 1), mix(B.body, -.34, 1), LW * 1.30, t * 1.7 + .7);
    this._hindLeg(ctx, -S * .24, S * .06, S * .60 * SPC.fem, B, LW, t, this.bounce, -1);

    // hốc háng — chỗ đùi cắm vào thân, vệt tối nhỏ cho ra khớp
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    const hs = ctx.createRadialGradient(-S * .28, S * .13, 0, -S * .28, S * .13, S * .16);
    hs.addColorStop(0, mix(B.body, -.70, .36)); hs.addColorStop(1, mix(B.body, -.70, 0));
    ctx.fillStyle = hs;
    ctx.beginPath(); ctx.arc(-S * .28, S * .13, S * .16, 0, TAU); ctx.fill();
    ctx.restore();

    // ── BỤNG nhiều đốt, thon dần ───────────────────────────────────────────
    const AB = SPC.abd, tailX = -S * .68 * AB;        // mút bụng
    const abdomen = () => {
      ctx.beginPath();
      ctx.moveTo(-S * .04, -S * .21);
      ctx.bezierCurveTo(-S * .34 * AB, -S * .28, tailX * .90, -S * .20, tailX, S * .04 + sway * S * .025);
      ctx.bezierCurveTo(tailX * .90, S * .30, -S * .30 * AB, S * .34, -S * .02, S * .29);
      ctx.closePath();
    };
    ctx.save();
    ctx.translate(0, S * .12); ctx.scale(1, breath); ctx.translate(0, -S * .12);
    abdomen();
    ctx.fillStyle = chitin(-S * .8, -S * .22, 0, S * .34); ctx.fill(); silhouette();
    ctx.save();
    abdomen(); ctx.clip();
    // ngấn đốt bụng — mỗi ngấn = 1 nét tối + 1 nét sáng kề bên → thấy được khối
    const SEG = FINE ? 6 : 3;
    for (let i = 1; i <= SEG; i++) {
      const k = i / (SEG + 1), bx = lerp(-S * .06, tailX * .92, k);
      const bow = S * .05 * (1 - k);
      ctx.beginPath();
      ctx.moveTo(bx + S * .05, -S * .26);
      ctx.quadraticCurveTo(bx - bow, S * .04, bx + S * .04, S * .36);
      hair(.34);
      if (FINE) {
        ctx.beginPath();
        ctx.moveTo(bx + S * .05 + LW, -S * .26);
        ctx.quadraticCurveTo(bx - bow + LW, S * .04, bx + S * .04 + LW, S * .36);
        ctx.strokeStyle = mix(B.body, .70, .22); ctx.lineWidth = LW * .55; ctx.stroke();
      }
    }
    occlude(-S * .34, S * .24, S * .44, S * .17, 0, .34);          // bụng dưới tối lại
    occlude(-S * .06, -S * .12, S * .26, S * .22, 0, .30);         // chỗ ngực đè lên
    ctx.restore();
    rim(abdomen, .40);
    ctx.restore();

    // hai lông đuôi (cerci) — thon dần từ gốc ra mũi, không phải hai sợi tóc
    for (const d of [-1, 1]) {
      const near2 = d > 0;
      const y0 = S * .16 + d * S * .035, y1 = S * .30 + d * S * .14 + sway * S * .035;
      const cerc = () => taperShape(ctx, tailX + S * .05, y0, tailX - S * .24, y1,
        (u) => S * lerp(.030, .006, u) * (near2 ? 1 : .82));
      cerc();
      ctx.fillStyle = near2 ? shade(B.body, .16) : shade(B.body, -.30); ctx.fill();
      ctx.strokeStyle = ink; ctx.lineWidth = LW * .7; ctx.lineJoin = 'round'; ctx.stroke();
    }

    // ── CÁNH ─────────────────────────────────────────────────────────────
    // Cánh màng bên dưới thò ra quá mút cánh cứng — nét nhận diện của bộ cánh
    // thẳng, và là thứ khiến bóng dáng không kết thúc cụt lủn ở mông.
    const buzz = this.flap * Math.sin(t * 34) * S * .035;
    ctx.save();
    ctx.translate(-S * .04, -S * .12 + buzz);
    ctx.rotate(-.06 + this.flap * .16);
    if (st.wing > 0.2) {
      ctx.save();
      ctx.globalAlpha = .42;
      ctx.beginPath();
      ctx.moveTo(-S * .32 * WING, -S * .01);
      ctx.quadraticCurveTo(-S * .62 * WING, S * .01, -S * .78 * WING, S * .12);
      ctx.quadraticCurveTo(-S * .58 * WING, S * .12, -S * .30 * WING, S * .09);
      ctx.closePath();
      ctx.fillStyle = mix(B.horn, .22, .8); ctx.fill();
      ctx.strokeStyle = mix(B.wing, -.30, .45); ctx.lineWidth = LW * .55; ctx.stroke();
      ctx.restore();
    }
    // cánh cứng (elytra) phủ lưng
    const elytra = () => {
      ctx.beginPath();
      ctx.moveTo(S * .14, -S * .08);
      ctx.bezierCurveTo(-S * .12 * WING, -S * .30, -S * .46 * WING, -S * .26, -S * .60 * WING, -S * .04);
      ctx.bezierCurveTo(-S * .48 * WING, S * .13, -S * .16 * WING, S * .16, S * .13, S * .11);
      ctx.closePath();
    };
    elytra();
    const wg = ctx.createLinearGradient(S * .1, -S * .3, -S * .6, S * .2);
    wg.addColorStop(0, shade(B.wing, .26)); wg.addColorStop(.44, shade(B.wing, -.06)); wg.addColorStop(1, shade(B.wing, -.44));
    ctx.fillStyle = wg; ctx.fill(); silhouette();
    ctx.save(); elytra(); ctx.clip();
    // gờ chia đôi hai cánh cứng
    ctx.beginPath();
    ctx.moveTo(S * .12, -S * .03);
    ctx.bezierCurveTo(-S * .16 * WING, -S * .09, -S * .40 * WING, -S * .07, -S * .58 * WING, -S * .02);
    ctx.strokeStyle = mix(B.wing, -.55, .6); ctx.lineWidth = LW * .95; ctx.stroke();
    // gân cánh
    ctx.strokeStyle = mix(B.wing, .55, .40); ctx.lineWidth = LW * .55;
    for (let i = 0; FINE && i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(S * .08, -S * (.01 - i * .035));
      ctx.bezierCurveTo(-S * .18 * WING, -S * (.12 - i * .045), -S * .40 * WING, -S * (.14 - i * .05), -S * .60 * WING, -S * (.02 - i * .02));
      ctx.stroke();
    }
    // "GƯƠNG" — màng mỏng tròn ở gốc cánh, chỗ con dế cọ để gáy. Sáng lên khi gáy.
    const mirror = .35 + this.flap * .65;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const mg = ctx.createRadialGradient(-S * .06, -S * .04, 0, -S * .06, -S * .04, S * .16);
    mg.addColorStop(0, `rgba(255,244,208,${.34 * mirror})`);
    mg.addColorStop(1, 'rgba(255,244,208,0)');
    ctx.fillStyle = mg;
    ctx.beginPath(); ctx.ellipse(-S * .06, -S * .04, S * .16, S * .105, -.15, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = mix(B.wing, .70, .40); ctx.lineWidth = LW * .5;
    ctx.beginPath(); ctx.ellipse(-S * .06, -S * .04, S * .14, S * .09, -.15, 0, TAU); ctx.stroke();
    gloss(-S * .24, -S * .15, S * .26, S * .06, -.18, .40);
    ctx.restore();
    rim(elytra, .45);
    ctx.restore();

    // ── NGỰC + TẤM MAI (pronotum) như áo giáp ─────────────────────────────
    const pronotum = () => {
      ctx.beginPath();
      ctx.moveTo(S * .30, -S * .26);
      ctx.bezierCurveTo(S * .36, S * .02, S * .30, S * .22, S * .12, S * .27);
      ctx.bezierCurveTo(-S * .08, S * .30, -S * .18, S * .12, -S * .17, -S * .08);
      ctx.bezierCurveTo(-S * .16, -S * .28, -S * .02, -S * .35, S * .13, -S * .34);
      ctx.closePath();
    };
    pronotum();
    ctx.fillStyle = chitin(-S * .2, -S * .32, S * .32, S * .26); ctx.fill(); silhouette();
    ctx.save(); pronotum(); ctx.clip();
    occlude(-S * .13, S * .06, S * .24, S * .20, 0, .30);          // bóng chỗ giáp bụng
    // gờ vai — một nét cong duy nhất đủ để tấm mai ra khối
    ctx.beginPath();
    ctx.moveTo(S * .27, -S * .19);
    ctx.bezierCurveTo(S * .30, S * .02, S * .25, S * .16, S * .10, S * .21);
    ctx.strokeStyle = mix(B.body, -.66, .34); ctx.lineWidth = LW * .7; ctx.stroke();
    gloss(S * .04, -S * .19, S * .21, S * .065, -.22, .55);
    ctx.restore();
    rim(pronotum, .55);

    // ── GIÁP (nếu đang mặc) — ốp lên tấm mai ngực ─────────────────────────
    const armor = gr('armor');
    if (armor) {
      ctx.save();
      const plate = () => {
        ctx.beginPath();
        ctx.moveTo(S * .28, -S * .19);
        ctx.bezierCurveTo(S * .33, S * .03, S * .27, S * .17, S * .11, S * .22);
        ctx.bezierCurveTo(-S * .05, S * .24, -S * .13, S * .10, -S * .12, -S * .05);
        ctx.bezierCurveTo(-S * .11, -S * .21, 0, -S * .27, S * .11, -S * .26);
        ctx.closePath();
      };
      plate();
      const ag = ctx.createLinearGradient(-S * .2, -S * .3, S * .3, S * .25);
      ag.addColorStop(0, shade(armor.col, .40)); ag.addColorStop(.46, armor.col);
      ag.addColorStop(1, shade(armor.col, -.36));
      ctx.fillStyle = ag; ctx.fill();
      ctx.strokeStyle = shade(armor.col, -.58); ctx.lineWidth = LW * 1.25; ctx.lineJoin = 'round'; ctx.stroke();
      ctx.save(); plate(); ctx.clip();
      ctx.strokeStyle = 'rgba(255,255,255,.40)'; ctx.lineWidth = LW * .8;
      ctx.beginPath(); ctx.moveTo(S * .09, -S * .23); ctx.bezierCurveTo(S * .05, -S * .05, S * .04, S * .08, S * .03, S * .19); ctx.stroke();
      gloss(S * .04, -S * .17, S * .19, S * .06, -.24, .5);
      ctx.restore();
      // đinh tán có khối
      for (const [ox, oy] of [[.22, -.10], [.20, .08], [-.02, -.16], [-.04, .12]]) {
        ctx.beginPath(); ctx.arc(S * ox, S * oy, S * .019, 0, TAU);
        ctx.fillStyle = '#e6ecf8'; ctx.fill();
        ctx.strokeStyle = shade(armor.col, -.5); ctx.lineWidth = LW * .4; ctx.stroke();
        ctx.beginPath(); ctx.arc(S * ox - S * .006, S * oy - S * .006, S * .007, 0, TAU);
        ctx.fillStyle = '#fff'; ctx.fill();
      }
      ctx.restore();
    }

    // ── ĐAI CÓI ĐAN vắt chéo ngực (từ giai đoạn 2) ────────────────────────
    // Cố ý khác hẳn kiểu khăn len quấn cổ hay gặp: dải cói đan chéo thân, tông
    // xanh ngọc, có hạt gỗ và tua rua. Ôm theo tấm mai chứ không cắt ngang mặt.
    const scarf = gr('scarf');
    if (scarf) this._scarf(ctx, S, LW, scarf, t, sway);
    else if (st.id >= 2) {
      const fly = Math.sin(t * 2.6) * S * .04;
      const strap = (off = 0) => {
        ctx.beginPath();
        ctx.moveTo(S * .27 + off, -S * .26 + off);
        ctx.bezierCurveTo(S * .16 + off, -S * .06 + off, S * .04 + off, S * .08 + off, -S * .09 + off, S * .23 + off);
      };
      ctx.save();
      strap(S * .018); ctx.lineWidth = S * .075; ctx.strokeStyle = 'rgba(0,0,0,.30)'; ctx.lineCap = 'butt'; ctx.stroke();
      strap();       ctx.lineWidth = S * .072; ctx.strokeStyle = '#1c8078'; ctx.stroke();
      strap(-S * .012); ctx.lineWidth = S * .026; ctx.strokeStyle = 'rgba(190,255,246,.30)'; ctx.stroke();
      // mắt đan chéo, thưa dần về hai đầu
      ctx.strokeStyle = 'rgba(238,228,196,.85)'; ctx.lineWidth = S * .012; ctx.lineCap = 'round';
      for (let i = 0; i < 8; i++) {
        const k = (i + .5) / 8;
        const bx = lerp(S * .27, -S * .09, k) + Math.sin(k * 3.1) * S * .012;
        const by = lerp(-S * .26, S * .23, k) + Math.sin(k * 2.2) * S * .012;
        ctx.beginPath();
        ctx.moveTo(bx - S * .030, by - S * .022); ctx.lineTo(bx + S * .026, by + S * .026);
        ctx.moveTo(bx + S * .026, by - S * .026); ctx.lineTo(bx - S * .030, by + S * .022);
        ctx.stroke();
      }
      // hạt gỗ
      ctx.beginPath(); ctx.arc(S * .09, S * .02, S * .046, 0, TAU);
      const bg2 = ctx.createLinearGradient(S * .05, -S * .02, S * .13, S * .06);
      bg2.addColorStop(0, '#c98d46'); bg2.addColorStop(1, '#8e5a1f');
      ctx.fillStyle = bg2; ctx.fill();
      ctx.strokeStyle = '#4e3010'; ctx.lineWidth = S * .013; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.5)';
      ctx.beginPath(); ctx.ellipse(S * .075, S * .002, S * .017, S * .009, -.5, 0, TAU); ctx.fill();
      // tua rua
      ctx.strokeStyle = '#1c8078'; ctx.lineWidth = S * .020; ctx.lineCap = 'round';
      for (const d of [-1, 0, 1]) {
        ctx.beginPath();
        ctx.moveTo(-S * .09, S * .23);
        ctx.quadraticCurveTo(-S * .15 + d * S * .03, S * .33 + fly, -S * .19 + d * S * .06, S * .41 + fly);
        ctx.stroke();
      }
      ctx.restore();
    }

    // ── CỔ — khớp nối đầu với ngực, để đầu không bị "dán" lên thân ────────
    ctx.beginPath();
    ctx.ellipse(S * .30, -S * .18, S * .105, S * .125, -.3, 0, TAU);
    ctx.fillStyle = shade(B.body, -.40); ctx.fill();
    ctx.strokeStyle = mix(B.body, -.66, .8); ctx.lineWidth = LW * .8; ctx.stroke();

    // ── CHÂN GIỮA + CHÂN TRƯỚC (bên gần) ──────────────────────────────────
    this._walkLeg(ctx, S * .07, S * .23, S * .27, ink, lite, LW * 1.45, t * 1.7 + 1.2);
    this._walkLeg(ctx, S * .25, S * .21, S * .24, ink, lite, LW * 1.45, t * 1.7);
    const weapon = gr('weapon');
    if (weapon) {
      ctx.save();
      // Nghiêng RA TRƯỚC: xoay ngược lại thì lưỡi dựng đứng, nhìn như cái cột
      // cắm cạnh chân chứ không ra dáng đang cầm.
      ctx.translate(S * .31, S * .43);
      ctx.rotate(.34 + Math.sin(t * 1.7) * .07);
      ctx.scale(.78, .78);
      // cán gỗ + dây quấn
      ctx.strokeStyle = '#6d4820'; ctx.lineWidth = S * .055; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, S * .06); ctx.lineTo(S * .05, -S * .20); ctx.stroke();
      ctx.strokeStyle = '#a3703a'; ctx.lineWidth = S * .028;
      ctx.beginPath(); ctx.moveTo(0, S * .06); ctx.lineTo(S * .05, -S * .20); ctx.stroke();
      ctx.strokeStyle = 'rgba(45,26,8,.65)'; ctx.lineWidth = S * .014;
      for (let i = 0; i < 3; i++) {
        const u = .18 + i * .28;
        ctx.beginPath();
        ctx.moveTo(-S * .02 + u * S * .05, S * .06 - u * S * .26);
        ctx.lineTo(S * .03 + u * S * .05, S * .09 - u * S * .26);
        ctx.stroke();
      }
      // chắn tay
      ctx.beginPath(); ctx.ellipse(S * .05, -S * .20, S * .055, S * .022, -.35, 0, TAU);
      ctx.fillStyle = shade(weapon.col, -.30); ctx.fill();
      ctx.strokeStyle = shade(weapon.col, -.62); ctx.lineWidth = LW * .8; ctx.stroke();
      // lưỡi cong hình vuốt — sống ngoài cong, lưỡi trong lõm
      const blade = () => {
        ctx.beginPath();
        ctx.moveTo(S * .01, -S * .22);
        ctx.quadraticCurveTo(S * .15, -S * .35, S * .30, -S * .55);
        ctx.quadraticCurveTo(S * .25, -S * .29, S * .12, -S * .19);
        ctx.closePath();
      };
      blade();
      const hg2 = ctx.createLinearGradient(S * .02, -S * .24, S * .26, -S * .46);
      hg2.addColorStop(0, shade(weapon.col, -.18));
      hg2.addColorStop(.55, shade(weapon.col, .28));
      hg2.addColorStop(1, shade(weapon.col, .60));
      ctx.fillStyle = hg2; ctx.fill();
      ctx.strokeStyle = shade(weapon.col, -.62); ctx.lineWidth = LW * 1.1; ctx.lineJoin = 'round'; ctx.stroke();
      // ánh sáng chạy dọc sống lưỡi
      ctx.beginPath();
      ctx.moveTo(S * .05, -S * .25); ctx.quadraticCurveTo(S * .17, -S * .36, S * .27, -S * .51);
      ctx.strokeStyle = 'rgba(255,255,255,.62)'; ctx.lineWidth = LW * .7; ctx.stroke();
      ctx.restore();
    }

    // ── ĐẦU ────────────────────────────────────────────────────────────────
    const HR = S * .315 * (1 + young * .12) * SPC.head;
    const hx = S * .44, hy = -S * .25 - proud * S * .05 + Math.sin(t * 2.3 + 1.2) * S * .012;
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(-.10 - proud * .22 + this.mouth * .10 + Math.sin(t * 1.1) * .03);

    // RÂU: hai sợi dài cong về sau, uốn theo nhịp. Sợi xa mảnh & tối hơn.
    const A = SPC.ant;                                 // dế râu dài, châu chấu râu ngắn
    for (const [d, ph, far] of [[1.16, 1.1, 1], [1, 0, 0]]) {
      const w = Math.sin(t * 1.9 + ph) * .22 + (this.antic === 'groom' ? Math.sin(t * 9) * .3 : 0);
      ctx.beginPath();
      ctx.moveTo(HR * .42, -HR * .62);
      ctx.bezierCurveTo(HR * 1.7 * d * A, -HR * (1.5 + w) * d * A,
                        HR * 0.6 * d * A, -HR * (2.9 + w) * d * A,
                       -HR * 1.1 * d * A, -HR * (2.6 - w * .6) * d * A);
      ctx.strokeStyle = far ? mix(B.body, -.80, .75) : ink;
      ctx.lineWidth = LW * (far ? .78 : 1.05); ctx.lineCap = 'round'; ctx.stroke();
      if (A < .7) {                                    // râu ngắn thì có núm đầu râu
        ctx.fillStyle = far ? mix(B.body, -.80, .75) : ink;
        ctx.beginPath();
        ctx.arc(-HR * 1.1 * d * A, -HR * 2.6 * d * A, HR * .09, 0, TAU); ctx.fill();
      }
    }

    // sọ dế: hơi vuông, mặt nghiêng về trước
    const skull = () => {
      ctx.beginPath();
      ctx.moveTo(-HR * .78, -HR * .30);
      ctx.bezierCurveTo(-HR * .62, -HR * .96, -HR * .18, -HR * 1.02, HR * .36, -HR * .96);
      ctx.bezierCurveTo(HR * .92, -HR * .90, HR * 1.12, -HR * .52, HR * 1.10, -HR * .10);
      ctx.bezierCurveTo(HR * 1.08, HR * .46, HR * .82, HR * .72, HR * .40, HR * .76);
      ctx.bezierCurveTo(-HR * .12, HR * .82, -HR * .60, HR * .64, -HR * .78, HR * .30);
      ctx.closePath();
    };
    skull();
    ctx.fillStyle = chitin(-HR, -HR, HR, HR); ctx.fill(); silhouette();
    ctx.save(); skull(); ctx.clip();
    occlude(-HR * .62, HR * .34, HR * .58, HR * .40, 0, .30);      // bóng gáy
    // đường khớp hình chữ Y trên đỉnh đầu — chi tiết thật của côn trùng
    ctx.strokeStyle = mix(B.body, -.66, .30); ctx.lineWidth = LW * .55; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(HR * .30, -HR * .18);
    ctx.lineTo(-HR * .10, -HR * .52);
    ctx.moveTo(-HR * .10, -HR * .52); ctx.lineTo(-HR * .46, -HR * .30);
    ctx.moveTo(-HR * .10, -HR * .52); ctx.lineTo(-HR * .30, -HR * .78);
    ctx.stroke();
    gloss(-HR * .10, -HR * .60, HR * .48, HR * .16, -.28, .40);
    ctx.restore();
    rim(skull, .50);

    // 3 mắt đơn (ocelli) trên trán — chấm sáng nhỏ, thêm phần "có nghiên cứu"
    ctx.fillStyle = mix(B.eye, .45, .85);
    for (const [ox, oy] of (FINE ? [[.52, -.62], [.20, -.74], [.78, -.40]] : [])) {
      ctx.beginPath(); ctx.arc(HR * ox, HR * oy, HR * .055, 0, TAU); ctx.fill();
    }

    // hàm (mandible) nhỏ, mở khi gáy/ngáp
    ctx.save();
    ctx.translate(HR * .78, HR * .40); ctx.rotate(this.mouth * .5);
    for (const d of [0, 1]) {
      ctx.beginPath();
      ctx.moveTo(0, -HR * .07 + d * HR * .10);
      ctx.quadraticCurveTo(HR * .21, -HR * .01 + d * HR * .11, HR * .27, HR * .10 + d * HR * .09);
      ctx.quadraticCurveTo(HR * .12, HR * .11 + d * HR * .09, 0, HR * .07 + d * HR * .09);
      ctx.closePath();
      ctx.fillStyle = shade(B.horn, -d * .18); ctx.fill(); line(.65);
    }
    // xúc biện (palps) — hai sợi ngắn ngoáy ngoáy dưới miệng, rất "sống"
    ctx.strokeStyle = mix(B.horn, -.45, .9); ctx.lineWidth = LW * .6; ctx.lineCap = 'round';
    for (const [d, ph] of (MID ? [[1, 0], [1, 1.7]] : [])) {
      const w = Math.sin(t * 3.1 + ph) * .18;
      ctx.beginPath();
      ctx.moveTo(HR * .06, HR * .24);
      ctx.quadraticCurveTo(HR * .20, HR * (.34 + w) * d, HR * .28, HR * (.44 + w * .6) * d);
      ctx.stroke();
    }
    ctx.restore();

    // ── MŨ (nếu đang mặc) ─────────────────────────────────────────────────
    const helm = gr('helm');
    if (helm) {
      ctx.save();
      const cap = () => {
        ctx.beginPath();
        ctx.moveTo(-HR * .82, -HR * .44);
        ctx.bezierCurveTo(-HR * .66, -HR * 1.02, -HR * .14, -HR * 1.08, HR * .38, -HR * 1.02);
        ctx.bezierCurveTo(HR * .90, -HR * .96, HR * 1.02, -HR * .74, HR * .96, -HR * .48);
        ctx.bezierCurveTo(HR * .30, -HR * .68, -HR * .42, -HR * .62, -HR * .82, -HR * .44);
        ctx.closePath();
      };
      cap();
      const hg = ctx.createLinearGradient(-HR, -HR, HR, HR * .2);
      hg.addColorStop(0, shade(helm.col, .44)); hg.addColorStop(.52, helm.col);
      hg.addColorStop(1, shade(helm.col, -.36));
      ctx.fillStyle = hg; ctx.fill();
      ctx.strokeStyle = shade(helm.col, -.60); ctx.lineWidth = LW * 1.25; ctx.lineJoin = 'round'; ctx.stroke();
      // hai chấu mũ
      for (const d of [-1, 1]) {
        ctx.save(); ctx.translate(HR * .12 + d * HR * .46, -HR * .96); ctx.rotate(d * .5);
        ctx.beginPath();
        ctx.moveTo(-HR * .09, HR * .10);
        ctx.quadraticCurveTo(0, -HR * .52, HR * .10, HR * .10);
        ctx.closePath();
        const sg3 = ctx.createLinearGradient(-HR * .09, HR * .10, HR * .10, -HR * .4);
        sg3.addColorStop(0, shade(helm.col, -.16)); sg3.addColorStop(1, shade(helm.col, .48));
        ctx.fillStyle = sg3; ctx.fill();
        ctx.strokeStyle = shade(helm.col, -.60); ctx.lineWidth = LW; ctx.stroke();
        ctx.restore();
      }
      ctx.save(); cap(); ctx.clip();
      gloss(-HR * .18, -HR * .78, HR * .36, HR * .10, -.20, .55);
      ctx.restore();
      ctx.restore();
    }

    // MẮT KÉP to, bóng
    const open = 1 - this.blink;
    const ex = HR * .38, ey = -HR * .30, er = HR * .46;
    // mắt bên xa — chỉ ló một mảnh tối, đủ để đầu có bề dày
    ctx.save();
    ctx.globalAlpha = .5;
    ctx.beginPath(); ctx.ellipse(ex - er * 1.12, ey + er * .10, er * .52, er * .58 * (.5 + .5 * open), -.18, 0, TAU);
    ctx.fillStyle = mix(B.body, -.60, 1); ctx.fill();
    ctx.restore();
    if (KO) {
      // mắt xoáy tít — dấu hiệu "đo ván" ai cũng đọc được ngay
      ctx.beginPath(); ctx.ellipse(ex, ey, er, er * .9, -.18, 0, TAU);
      ctx.fillStyle = '#fff'; ctx.fill(); line(.85);
      ctx.strokeStyle = ink; ctx.lineWidth = LW * .9; ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i <= 26; i++) {
        const u = i / 26, a = u * TAU * 1.9 + this.t * 2, rr = er * .78 * (1 - u * .86);
        const px = ex + Math.cos(a) * rr, py = ey + Math.sin(a) * rr;
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.stroke();
    } else if (open < .12) {
      ctx.strokeStyle = ink; ctx.lineWidth = LW;
      ctx.beginPath(); ctx.moveTo(ex - er * .8, ey); ctx.quadraticCurveTo(ex, ey - er * .8, ex + er * .8, ey); ctx.stroke();
    } else {
      const eye = () => { ctx.beginPath(); ctx.ellipse(ex, ey, er, er * (.62 + .38 * open), -.18, 0, TAU); };
      eye(); ctx.fillStyle = '#fff'; ctx.fill(); line(.85);
      ctx.save();
      eye(); ctx.clip();
      ctx.fillStyle = B.eye;
      ctx.beginPath(); ctx.arc(ex + er * .20, ey + er * .06, er * .70, 0, TAU); ctx.fill();
      // vành mống mắt tối — làm con ngươi sâu hơn
      ctx.strokeStyle = mix(B.eye, -.55, .55); ctx.lineWidth = er * .14;
      ctx.beginPath(); ctx.arc(ex + er * .20, ey + er * .06, er * .64, 0, TAU); ctx.stroke();
      ctx.fillStyle = '#160a1e';
      ctx.beginPath(); ctx.arc(ex + er * .24, ey + er * .06, er * .42, 0, TAU); ctx.fill();
      // bóng mí hắt xuống tròng mắt
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      const sg = ctx.createLinearGradient(0, ey - er, 0, ey + er * .3);
      sg.addColorStop(0, 'rgba(60,30,90,.55)'); sg.addColorStop(1, 'rgba(60,30,90,0)');
      ctx.fillStyle = sg; ctx.fillRect(ex - er * 1.2, ey - er * 1.2, er * 2.4, er * 1.6);
      ctx.restore();
      ctx.fillStyle = 'rgba(255,255,255,.95)';
      ctx.beginPath(); ctx.arc(ex - er * .16, ey - er * .34, er * .26, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(ex + er * .44, ey + er * .30, er * .12, 0, TAU); ctx.fill();
      ctx.restore();
      // mí mắt trên — nét mảnh ôm theo mắt, làm ánh nhìn có hồn
      ctx.strokeStyle = mix(B.body, -.66, .6); ctx.lineWidth = LW * .75;
      ctx.beginPath(); ctx.arc(ex, ey, er * 1.02, Math.PI * 1.06, Math.PI * 1.92); ctx.stroke();
      // ăn mừng: sụp mí xuống nửa mắt → ánh nhìn lim dim đắc ý
      if (TA) {
        ctx.save();
        ctx.beginPath(); ctx.ellipse(ex, ey, er, er * (.62 + .38 * open), -.18, 0, TAU); ctx.clip();
        ctx.fillStyle = shade(B.body, -.10);
        ctx.fillRect(ex - er * 1.2, ey - er * 1.4, er * 2.4, er * 1.34);
        ctx.strokeStyle = ink; ctx.lineWidth = LW * 1.1;
        ctx.beginPath(); ctx.moveTo(ex - er * 1.2, ey - er * .06); ctx.lineTo(ex + er * 1.2, ey - er * .06); ctx.stroke();
        ctx.restore();
      }
    }
    // chân mày → nét "ngang tàng" của nhân vật chính
    ctx.strokeStyle = ink; ctx.lineWidth = LW * 1.2; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(ex - er * 1.0, ey - er * (.86 + proud * .22));
    ctx.quadraticCurveTo(ex + er * .10, ey - er * (1.5 + proud * .3), ex + er * 1.05, ey - er * .92);
    ctx.stroke();
    // mảng mặt sáng — làm gương mặt ấm và dễ đọc biểu cảm hơn
    ctx.save(); ctx.globalAlpha = .30; ctx.fillStyle = shade(B.body, .45);
    ctx.beginPath(); ctx.ellipse(HR * .34, HR * .06, HR * .66, HR * .50, -.16, 0, TAU); ctx.fill();
    ctx.restore();
    // má hồng nhẹ
    ctx.save(); ctx.globalAlpha = .32; ctx.fillStyle = '#ff7d9c';
    ctx.beginPath(); ctx.ellipse(HR * .05, HR * .26, HR * .28, HR * .14, -.1, 0, TAU); ctx.fill();
    ctx.restore();

    // ── BĂNG GẠC (khi thua) ───────────────────────────────────────────────
    if (KO) {
      ctx.save();
      ctx.rotate(-.30);
      ctx.fillStyle = '#f4efe4';
      ctx.beginPath();
      ctx.moveTo(-HR * .95, -HR * .30);
      ctx.lineTo(HR * 1.02, -HR * .62);
      ctx.lineTo(HR * 1.02, -HR * .16);
      ctx.lineTo(-HR * .95, HR * .16);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#c9bfab'; ctx.lineWidth = LW * .7; ctx.stroke();
      ctx.strokeStyle = '#d9cfba'; ctx.lineWidth = LW * .6;
      for (let i = 0; i < 4; i++) {
        const u = -.7 + i * .45;
        ctx.beginPath();
        ctx.moveTo(HR * u, -HR * .52); ctx.lineTo(HR * (u - .18), HR * .10); ctx.stroke();
      }
      // nút thắt
      ctx.fillStyle = '#f4efe4';
      ctx.beginPath(); ctx.arc(-HR * .92, -HR * .08, HR * .17, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#c9bfab'; ctx.lineWidth = LW * .7; ctx.stroke();
      ctx.restore();
    }

    const m = ctx.getTransform();
    const mlx = HR * 1.15, mly = HR * .40;
    this.mouthPos = { x: m.e + m.a * mlx + m.c * mly, y: m.f + m.b * mlx + m.d * mly };
    ctx.restore();   // hết đầu

    // ── CÀNG SAU bên gần — vẽ sau cùng, luôn nhìn thấy ────────────────────
    this._hindLeg(ctx, -S * .28, S * .15, S * .62 * SPC.fem, B, LW, t, this.bounce, 1);

    // ── SÓNG ÂM khi gáy — thấy được tiếng kêu ────────────────────────────
    if (this.mood === 'chirp' && this.moodT > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const k = 1 - clamp(this.moodT / 1.1, 0, 1);
      for (let i = 0; i < 3; i++) {
        const r = S * (.42 + i * .22) + k * S * .5;
        ctx.globalAlpha = clamp((1 - k) * (1 - i * .28), 0, 1) * .55;
        ctx.strokeStyle = '#ffe9a8'; ctx.lineWidth = S * .022;
        ctx.beginPath();
        ctx.arc(-S * .22, -S * .18, r, -0.95, 0.45);
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.restore();

    // ── HIỆU ỨNG KẾT TRẬN (vẽ NGOÀI phép xoay thân, nếu không sao cũng nằm ngửa theo) ──
    if (KO) {
      const cxk = x, cyk = y - S * .52;
      for (let i = 0; i < 5; i++) {
        const a = this.t * 2.1 + i / 5 * TAU;
        const rx = S * .40, ry = S * .13;
        const px = cxk + Math.cos(a) * rx, py = cyk + Math.sin(a) * ry;
        const near = Math.sin(a) > 0 ? 1 : .55;
        ctx.save();
        ctx.translate(px, py); ctx.rotate(a * .6); ctx.globalAlpha = near;
        ctx.beginPath();
        for (let k = 0; k < 10; k++) {
          const aa = -Math.PI / 2 + k * Math.PI / 5, rr = (k % 2 ? S * .022 : S * .052) * near;
          k ? ctx.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr) : ctx.moveTo(Math.cos(aa) * rr, Math.sin(aa) * rr);
        }
        ctx.closePath();
        ctx.fillStyle = '#ffd23f'; ctx.fill();
        ctx.strokeStyle = '#8a5c00'; ctx.lineWidth = S * .012; ctx.lineJoin = 'round'; ctx.stroke();
        ctx.restore();
      }
    } else if (TA) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 7; i++) {
        const ph = i * 1.7, k = (this.t * .9 + i / 7) % 1;
        const px = x + Math.cos(ph * 3.1) * S * (.35 + k * .35);
        const py = y - S * .25 - k * S * .75;
        const a2 = Math.sin(k * Math.PI);
        ctx.globalAlpha = a2 * .85;
        ctx.fillStyle = ['#fff3b0', '#ffd23f', '#8ef08a', '#a8dcff'][i % 4];
        ctx.beginPath();
        for (let q = 0; q < 8; q++) {
          const aa = q / 8 * TAU, rr = q % 2 ? S * .010 : S * .034;
          q ? ctx.lineTo(px + Math.cos(aa) * rr, py + Math.sin(aa) * rr)
            : ctx.moveTo(px + Math.cos(aa) * rr, py + Math.sin(aa) * rr);
        }
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
  }

  /**
   * Càng nhảy — bộ phận nhận diện số 1 của con dế.
   * Hình chữ "Λ": ĐÙI to như đùi gà, ĐẦU GỐI NHÔ CAO HƠN LƯNG, rồi ống chân
   * mảnh có gai đổ chéo xuống-ra sau tới bàn chân.
   *
   * Hai lỗi làm mất chất dế, cả hai đều từng có ở đây:
   *   1. gối thấp ngang lưng  → con vật thành con kiến;
   *   2. đùi cùng tông với bụng → hai khối dính làm một, mất hẳn bóng dáng.
   * Nên gối luôn đặt trên đường lưng, và đùi luôn lệch sáng/tối so với thân.
   */
  _hindLeg(ctx, x, y, L, B, lw, t, bounce, side) {
    const near = side > 0;
    const crouch = ease.outCubic(clamp(bounce, 0, 1));
    const idle = Math.sin(t * 1.6) * .02;

    // Càng co lại khi bật nhảy: gối hạ xuống, bàn chân thu vào.
    const hip  = { x: 0, y: 0 };
    // Thân chibi ngắn nên bàn chân phải thu vào, để thò ra xa là thành cái que
    // chìa khỏi bóng dáng.
    const knee = { x: -L * .38, y: -L * (.72 - crouch * .24) + idle * L };
    const foot = { x: -L * (.58 - crouch * .08), y: L * (.62 - crouch * .14) };

    // Bên xa: tối lại + lùi vào, KHÔNG dùng alpha thấp (trong suốt trông như lỗi,
    // tối màu mới đọc ra là "đang ở trong bóng").
    const k = near ? 0 : -.34;
    const ink  = mix(B.body, near ? -.68 : -.80, 1);
    const c0   = mix(B.horn, .10 + k * .6, 1);
    const c1   = mix(B.body, .30 + k, 1);
    const c2   = mix(B.body, -.24 + k, 1);
    const W    = lw * (near ? 1 : .85);

    ctx.save();
    ctx.translate(x, y);
    if (!near) ctx.scale(.94, .94);

    // ── ĐÙI: khối thon một đầu, phình ở 1/3 phía hông ────────────────────
    const wHip = L * .21, wKnee = L * .085, bulge = L * .085;
    const wAt = (u) => lerp(wHip, wKnee, u) + bulge * Math.sin(Math.PI * Math.pow(clamp(u, 0, 1), .7));
    const femur = () => taperShape(ctx, hip.x, hip.y, knee.x, knee.y, wAt);
    const ang = Math.atan2(knee.y - hip.y, knee.x - hip.x);
    const len = Math.hypot(knee.x - hip.x, knee.y - hip.y);

    // bóng tiếp giáp: bản sao lệch xuống-phải, tô tối → đùi bong hẳn khỏi thân
    if (near) {
      ctx.save();
      ctx.translate(L * .05, L * .07);
      femur();
      ctx.fillStyle = 'rgba(24,12,6,.30)'; ctx.fill();
      ctx.restore();
    }
    femur();
    const fg = ctx.createLinearGradient(
      hip.x + Math.cos(ang - Math.PI / 2) * L * .3, hip.y + Math.sin(ang - Math.PI / 2) * L * .3,
      hip.x + Math.cos(ang + Math.PI / 2) * L * .3, hip.y + Math.sin(ang + Math.PI / 2) * L * .3);
    fg.addColorStop(0, c0); fg.addColorStop(.45, c1); fg.addColorStop(1, c2);
    ctx.fillStyle = fg; ctx.fill();
    ctx.strokeStyle = ink; ctx.lineWidth = W * 1.9; ctx.lineJoin = 'round'; ctx.stroke();

    ctx.save();
    femur(); ctx.clip();
    ctx.translate((hip.x + knee.x) / 2, (hip.y + knee.y) / 2); ctx.rotate(ang);
    // vân xương cá — dấu vân thật trên đùi dế, chạy chéo theo trục đùi
    ctx.strokeStyle = mix(B.body, -.70, near ? .30 : .20); ctx.lineWidth = W * .75; ctx.lineCap = 'round';
    for (let i = -1; perf.quality > Q.LOW && i <= 2; i++) {
      const px = i * len * .24 - len * .10;
      ctx.beginPath();
      ctx.moveTo(px - len * .09, -L * .30); ctx.lineTo(px + len * .05, 0); ctx.lineTo(px - len * .09, L * .30);
      ctx.stroke();
    }
    // chớp sáng dọc mép trên đùi
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const hl = ctx.createLinearGradient(0, -L * .22, 0, L * .05);
    hl.addColorStop(0, `rgba(255,255,255,${near ? .40 : .18})`); hl.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hl;
    ctx.beginPath(); ctx.ellipse(-len * .06, -L * .13, len * .40, L * .10, 0, 0, TAU); ctx.fill();
    ctx.restore();
    // bóng chỗ đùi cắm vào hông
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    const og = ctx.createRadialGradient(-len * .5, 0, 0, -len * .5, 0, L * .34);
    og.addColorStop(0, mix(B.body, -.70, .45)); og.addColorStop(1, mix(B.body, -.70, 0));
    ctx.fillStyle = og; ctx.fillRect(-len, -L * .4, len * .8, L * .8);
    ctx.restore();
    ctx.restore();

    // ── ỐNG CHÂN: mảnh, có gai, từ gối đổ xuống-ra sau ───────────────────
    const ta = Math.atan2(foot.y - knee.y, foot.x - knee.x);
    const tl = Math.hypot(foot.x - knee.x, foot.y - knee.y);
    ctx.save();
    ctx.translate(knee.x, knee.y); ctx.rotate(ta);
    // gai trước (vẽ dưới ống chân để chỉ ló mũi ra ngoài)
    ctx.strokeStyle = ink; ctx.lineWidth = W * .8; ctx.lineCap = 'round';
    for (let i = 1; i <= 6; i++) {
      const px = tl * (i / 7), sp = L * .075 * (1 - i / 9);
      ctx.beginPath();
      ctx.moveTo(px, -L * .02); ctx.lineTo(px - sp * .35, -L * .03 - sp); ctx.stroke();
    }
    taperShape(ctx, 0, 0, tl, 0, (u) => lerp(L * .072, L * .036, u));
    const tg = ctx.createLinearGradient(0, -L * .07, 0, L * .07);
    tg.addColorStop(0, mix(B.body, .16 + k, 1)); tg.addColorStop(1, mix(B.body, -.44 + k, 1));
    ctx.fillStyle = tg; ctx.fill();
    ctx.strokeStyle = ink; ctx.lineWidth = W * 1.15; ctx.lineJoin = 'round'; ctx.stroke();
    // bàn chân 3 đốt — chạm đất bằng cả bàn, không phải bằng một cái que
    ctx.strokeStyle = ink; ctx.lineWidth = W * 1.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(tl, 0);
    ctx.quadraticCurveTo(tl + L * .10, L * .07, tl + L * .20, L * .12);
    ctx.stroke();
    ctx.strokeStyle = c1; ctx.lineWidth = W * .7; ctx.stroke();
    ctx.strokeStyle = ink; ctx.lineWidth = W * 1.15;
    ctx.beginPath(); ctx.moveTo(tl + L * .09, L * .06); ctx.lineTo(tl + L * .13, L * .16); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(tl + L * .20, L * .12); ctx.lineTo(tl + L * .29, L * .10); ctx.stroke();
    ctx.restore();

    // khớp gối — chỏm tròn nối đùi với ống chân
    ctx.beginPath(); ctx.arc(knee.x, knee.y, L * .062, 0, TAU);
    const kg = ctx.createRadialGradient(knee.x - L * .02, knee.y - L * .02, 0, knee.x, knee.y, L * .062);
    kg.addColorStop(0, c0); kg.addColorStop(1, c2);
    ctx.fillStyle = kg; ctx.fill();
    ctx.strokeStyle = ink; ctx.lineWidth = W * 1.2; ctx.stroke();
    ctx.restore();
  }

  /**
   * KHĂN quàng cổ — món đồ dễ thấy nhất, nên bậc càng cao thì càng nhiều lớp:
   *   bậc 1  dải trơn
   *   bậc 2  thêm sọc
   *   bậc 3  thêm viền kim loại + hoa văn quả trám
   *   bậc 4  thêm đuôi bay dài và ánh lấp lánh
   * Cùng một hình gốc, chỉ chồng thêm lớp — nhờ vậy nhìn là biết món nào đắt.
   */
  _scarf(ctx, S, LW, g, t, sway) {
    const col = g.col, tier = g.tier || 1;
    const ink = mix(col, -.62, 1);
    const fly = Math.sin(t * 2.4) * S * .05;
    const fly2 = Math.sin(t * 2.4 + .8) * S * .06;
    ctx.save();

    // đuôi khăn bay về sau — bậc 4 dài gấp rưỡi
    // Đuôi khăn RỦ XUỐNG sau lưng, không chĩa ngang. Kéo thẳng ra sau thì
    // vạt khăn thành cái mũi tên xuyên qua người — sai hẳn dáng vải.
    const L = tier >= 4 ? 1.30 : 1.0;
    const flap = (k, o, w, col2) => {
      const ex = -S * (.30 + .16 * k) * L, ey = S * (.16 + .14 * k) + (k ? fly2 : fly);
      ctx.beginPath();
      ctx.moveTo(S * .20, -S * .02);
      ctx.bezierCurveTo(S * .02, S * (.06 + o), -S * .14 * L, S * (.20 + o), ex, ey);
      ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = col2; ctx.stroke();
      return [ex, ey];
    };
    for (const k of [1, 0]) {                    // vạt xa vẽ trước
      const dim = k ? -.22 : 0;
      flap(k, .03, S * .105, 'rgba(0,0,0,.30)');
      flap(k, 0,   S * .092, shade(col, dim - .16));
      flap(k, -.012, S * .066, shade(col, dim));
      const [ex, ey] = flap(k, -.030, S * .020, mix(col, .60, .55));
      // mút vạt xẻ đôi — dấu hiệu "đây là vải" chứ không phải cái que
      ctx.beginPath();
      ctx.moveTo(ex + S * .05, ey - S * .05);
      ctx.lineTo(ex - S * .05, ey + S * .02);
      ctx.lineTo(ex - S * .01, ey + S * .07);
      ctx.lineTo(ex - S * .09, ey + S * .12);
      ctx.lineTo(ex + S * .02, ey + S * .13);
      ctx.closePath();
      ctx.fillStyle = shade(col, dim); ctx.fill();
      ctx.strokeStyle = ink; ctx.lineWidth = LW * .7; ctx.stroke();
    }

    // vòng quàng quanh cổ
    const band = () => {
      ctx.beginPath();
      ctx.ellipse(S * .29, -S * .12, S * .205, S * .140, -.34, 0, TAU);
    };
    band();
    const bg = ctx.createLinearGradient(S * .10, -S * .28, S * .46, S * .02);
    bg.addColorStop(0, shade(col, .40)); bg.addColorStop(.55, col); bg.addColorStop(1, shade(col, -.30));
    ctx.fillStyle = bg; ctx.fill();
    ctx.strokeStyle = ink; ctx.lineWidth = LW * 1.15; ctx.stroke();

    ctx.save(); band(); ctx.clip();
    if (tier >= 2) {                                  // sọc
      ctx.strokeStyle = mix(col, -.42, .55); ctx.lineWidth = LW * .8;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(S * (.29 + i * .062) - S * .08, -S * .32);
        ctx.lineTo(S * (.29 + i * .062) + S * .07, S * .06);
        ctx.stroke();
      }
    }
    if (tier >= 3) {                                  // hoa văn quả trám
      ctx.fillStyle = mix(col, .70, .70);
      for (const [ox, oy] of [[-.07, -.02], [.01, .02], [.09, -.03]]) {
        ctx.save(); ctx.translate(S * (.29 + ox), -S * (.12 + oy)); ctx.rotate(.5);
        ctx.fillRect(-S * .026, -S * .026, S * .052, S * .052);
        ctx.restore();
      }
    }
    ctx.restore();

    if (tier >= 3) {                                  // viền kim loại
      band();
      ctx.strokeStyle = 'rgba(255,214,110,.9)'; ctx.lineWidth = LW * .55; ctx.stroke();
    }
    if (tier >= 4 && perf.quality > Q.LOW) {          // ánh lấp lánh
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 3; i++) {
        const k = (t * .8 + i / 3) % 1;
        const px = S * (.20 - k * .55), py = -S * .10 + Math.sin(k * 6 + i) * S * .07;
        ctx.globalAlpha = Math.sin(k * Math.PI) * .85;
        ctx.fillStyle = mix(col, .75, 1);
        ctx.beginPath();
        for (let q = 0; q < 8; q++) {
          const aa = q / 8 * TAU, rr = q % 2 ? S * .008 : S * .028;
          q ? ctx.lineTo(px + Math.cos(aa) * rr, py + Math.sin(aa) * rr)
            : ctx.moveTo(px + Math.cos(aa) * rr, py + Math.sin(aa) * rr);
        }
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
    // nút thắt
    ctx.beginPath(); ctx.arc(S * .21, -S * .02, S * .050, 0, TAU);
    ctx.fillStyle = shade(col, .18); ctx.fill();
    ctx.strokeStyle = ink; ctx.lineWidth = LW * .8; ctx.stroke();
    ctx.restore();
  }

  /** Chân đi bộ: đùi + ống chân + bàn, mỗi đốt có bề dày riêng. */
  _walkLeg(ctx, x, y, s, ink, fill, lw, phase) {
    const k = Math.sin(phase) * .16;
    const p0 = { x: 0, y: 0 };
    const p1 = { x: s * (.30 + k * .18), y: s * .46 };   // gối
    const p2 = { x: s * (.08 + k * .46), y: s * .96 };   // cổ chân
    const p3 = { x: s * (.30 + k * .46), y: s * 1.03 };  // mũi bàn
    ctx.save();
    ctx.translate(x, y);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    // viền ngoài chung — nét dày ôm cả chân, cho ra bóng dáng liền mạch
    ctx.strokeStyle = ink; ctx.lineWidth = lw * 2.4;
    ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
    // đùi & ống chân thon dần
    boneShape(ctx, p0, p1, lw * .95, lw * .62); ctx.fillStyle = fill; ctx.fill();
    boneShape(ctx, p1, p2, lw * .60, lw * .38); ctx.fillStyle = fill; ctx.fill();
    // bàn chân
    ctx.strokeStyle = ink; ctx.lineWidth = lw * 1.5;
    ctx.beginPath(); ctx.moveTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y); ctx.stroke();
    // khớp gối
    ctx.beginPath(); ctx.arc(p1.x, p1.y, lw * .78, 0, TAU);
    ctx.fillStyle = fill; ctx.fill();
    ctx.strokeStyle = ink; ctx.lineWidth = lw * .7; ctx.stroke();
    ctx.restore();
  }
}

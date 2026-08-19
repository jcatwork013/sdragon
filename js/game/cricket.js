// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  DẾ MÈN — nhân vật chính, vẽ 100% bằng Canvas path, không dùng ảnh.      ║
// ║                                                                          ║
// ║  Dáng nghiêng hướng phải, tư thế lữ hành. Bóng dáng đặc trưng của dế:    ║
// ║  hai râu dài cong · tấm mai ngực (pronotum) như áo giáp · cánh cứng bóng  ║
// ║  · bụng nhiều đốt · và ĐÔI CÀNG SAU to khoẻ — thứ khiến ai cũng nhận ra   ║
// ║  ngay đó là con dế.                                                      ║
// ╚══════════════════════════════════════════════════════════════════════════╝
import { TAU, lerp, clamp, ease, rgba, shade, poly } from '../core/util.js';
import { STAGES, SPECIES } from '../data/characters.js';
import { recipeById } from '../data/gear.js';
import { pickPoke } from '../data/beats.js';

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

  // hoa văn đốm
  ctx.save(); egg(); ctx.clip();
  ctx.globalAlpha = .55; ctx.fillStyle = breed.spot;
  for (let i = 0; i < 9; i++) {
    const a = i * 2.399, rr = r * (.2 + (i % 4) * .18);
    ctx.beginPath();
    ctx.ellipse(Math.cos(a) * r * .5, Math.sin(a) * r * .62, rr * .3, rr * .21, a, 0, TAU);
    ctx.fill();
  }
  // vệt sáng
  ctx.globalAlpha = .5; ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.ellipse(-r * .34, -r * .42, r * .17, r * .32, -.4, 0, TAU); ctx.fill();
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
  ctx.strokeStyle = rgba(shade(breed.shellB, -.25), .95); ctx.lineWidth = r * .065; ctx.stroke();

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
    this.fireT = 0;
    this.onFire = null;
    this.antic = null; this.anticT = 0;
    this.pokeShake = 0;
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
    if (p.mood === 'chirp') { this.mood = 'chirp'; this.moodT = 1.1; this.fireT = 0; }
    this.bounce = 1;
    this.pokeShake = 1;
    return p;
  }
  /** "Phun lửa" của rồng → với dế là GÁY: rung cánh phát ra sóng âm. */
  breatheFire(dur = 0.9) { this.mood = 'chirp'; this.moodT = dur; this.fireT = dur; }

  update(dt) {
    this.t += dt;
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

    if (this.fireT > 0) {
      this.fireT -= dt;
      if (this.onFire && this.mouthPos) this.onFire(this.mouthPos.x, this.mouthPos.y, 1, -0.12);
    }
  }

  draw(ctx, x, y, s, face = 1) {
    const B = this.breed, st = this.stage, t = this.t;
    const S = s * st.scale;
    const young  = 1 - st.id * 0.13;                  // non thì đầu to hơn
    const SPC    = SPECIES[B.species] || SPECIES.cricket;   // hình dáng theo loài
    const breath = 1 + Math.sin(t * 2.3) * .026;
    const bopA   = this.antic === 'bop' ? Math.abs(Math.sin(this.t * 9)) : 0;
    const bob    = Math.sin(t * 2.3 + .7) * S * .020
                 - ease.outCubic(clamp(this.bounce, 0, 1)) * S * .13
                 - bopA * S * .10;
    const sway   = Math.sin(t * 1.4);
    const proud  = this.antic === 'proud' || this.mood === 'proud' ? 1 : 0;

    ctx.save();
    const shk = this.pokeShake > 0 ? Math.sin(this.t * 44) * this.pokeShake * S * .035 : 0;
    ctx.translate(x + shk, y + bob);
    ctx.rotate(shk * 0.004);
    ctx.scale(face, 1);

    const ink   = shade(B.body, -.62);
    const lite  = shade(B.body, .30);
    const LW    = S * .026;
    // Phân cấp nét — mẹo làm hình vector trông "có nghề":
    //   silhouette() = viền ngoài DÀY (định hình bóng dáng)
    //   line()       = nét thường
    //   hair()       = nét trong MẢNH (chi tiết, không tranh chấp với viền)
    const line = (w = 1) => { ctx.strokeStyle = ink; ctx.lineWidth = LW * w; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); };
    const silhouette = () => line(1.55);
    const hair = (a = .38) => { ctx.strokeStyle = rgba(ink, a); ctx.lineWidth = LW * .6; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); };
    /** Bóng tiếp giáp: vệt tối mềm ở chỗ hai khối chồng nhau. */
    const occlude = (cx0, cy0, rx, ry, rot = 0, a = .22) => {
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      const g = ctx.createRadialGradient(cx0, cy0, 0, cx0, cy0, Math.max(rx, ry));
      g.addColorStop(0, rgba(ink, a)); g.addColorStop(1, rgba(ink, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(cx0, cy0, rx, ry, rot, 0, TAU); ctx.fill();
      ctx.restore();
    };
    /** Viền sáng mép trên-trái — gợi khối. */
    const rim = (path) => {
      ctx.save();
      path();
      ctx.strokeStyle = rgba(shade(B.body, .62), .5); ctx.lineWidth = LW * .55;
      ctx.setLineDash([]); ctx.stroke();
      ctx.restore();
    };
    const chitin = (x0, y0, x1, y1) => {              // vỏ kitin bóng
      const g = ctx.createLinearGradient(x0, y0, x1, y1);
      g.addColorStop(0, lite); g.addColorStop(.42, B.body); g.addColorStop(1, shade(B.body, -.34));
      return g;
    };

    // đùi tô sáng hơn thân một bậc để không bị lẫn vào bụng
    const femurFill = (() => {
      const g = ctx.createLinearGradient(-S * .5, -S * .35, S * .1, S * .35);
      g.addColorStop(0, shade(B.body, .40)); g.addColorStop(.5, shade(B.body, .12));
      g.addColorStop(1, shade(B.body, -.20));
      return g;
    })();

    ctx.save(); ctx.globalAlpha = .26; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(0, S * .60, S * .50, S * .09, 0, 0, TAU); ctx.fill();
    ctx.restore();

    // ── CÀNG SAU (đùi to) — vẽ trước để nằm sau thân ──────────────────────
    this._hindLeg(ctx, -S * .20, S * .02, S * SPC.fem, ink, femurFill, LW, t, this.bounce, -1);

    // ── BỤNG nhiều đốt, thon dần ───────────────────────────────────────────
    ctx.save();
    ctx.translate(0, S * .16); ctx.scale(1, breath); ctx.translate(0, -S * .16);
    ctx.beginPath();
    ctx.moveTo(-S * .06, -S * .16);
    ctx.quadraticCurveTo(-S * .62 * SPC.abd, -S * .12, -S * .86 * SPC.abd, S * .12 + sway * S * .03);
    ctx.quadraticCurveTo(-S * .60 * SPC.abd,  S * .40, -S * .04, S * .34);
    ctx.closePath();
    ctx.fillStyle = chitin(-S * .8, -S * .1, 0, S * .4); ctx.fill(); silhouette();
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-S * .06, -S * .16);
    ctx.quadraticCurveTo(-S * .62, -S * .12, -S * .86, S * .12);
    ctx.quadraticCurveTo(-S * .60 * SPC.abd,  S * .40, -S * .04, S * .34);
    ctx.closePath(); ctx.clip();
    for (let i = 1; i <= 5; i++) {                    // ngấn đốt bụng
      const k = i / 6, bx = lerp(-S * .10, -S * .78 * SPC.abd, k);
      ctx.beginPath();
      ctx.moveTo(bx + S * .06, -S * .20); ctx.quadraticCurveTo(bx, S * .08, bx + S * .05, S * .40);
      hair(.30);
    }
    // bóng dưới bụng cho khối tròn hơn
    occlude(-S * .40, S * .26, S * .40, S * .16, 0, .28);
    ctx.restore();
    ctx.restore();
    // hai lông đuôi (cerci)
    ctx.strokeStyle = ink; ctx.lineWidth = LW * .9; ctx.lineCap = 'round';
    for (const d of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(-S * .82 * SPC.abd, S * .14 + d * S * .05);
      ctx.quadraticCurveTo(-S * 1.02 * SPC.abd, S * .10 + d * S * .13 + sway * S * .03,
                           -S * 1.16 * SPC.abd, S * .04 + d * S * .20 + sway * S * .05);
      ctx.stroke();
    }

    // ── CÁNH CỨNG (elytra) phủ lưng, rung khi gáy ─────────────────────────
    const buzz = this.flap * Math.sin(t * 34) * S * .035;
    ctx.save();
    ctx.translate(-S * .04, -S * .10 + buzz);
    ctx.rotate(-.06 + this.flap * .16);
    ctx.beginPath();
    ctx.moveTo(S * .12, -S * .06);
    ctx.quadraticCurveTo(-S * .26 * SPC.wing, -S * .28, -S * .56 * SPC.wing, -S * .04);
    ctx.quadraticCurveTo(-S * .28 * SPC.wing,  S * .14, S * .12, S * .12);
    ctx.closePath();
    const wg = ctx.createLinearGradient(S * .1, -S * .3, -S * .6, S * .2);
    wg.addColorStop(0, shade(B.wing, .40)); wg.addColorStop(.5, B.wing); wg.addColorStop(1, shade(B.wing, -.28));
    ctx.fillStyle = wg; ctx.fill(); silhouette();
    // gờ chia đôi hai cánh cứng — chi tiết nhận diện của bộ cánh thẳng
    ctx.beginPath();
    ctx.moveTo(S * .10, -S * .02);
    ctx.quadraticCurveTo(-S * .24, -S * .06, -S * .54, -S * .02);
    ctx.strokeStyle = rgba(ink, .55); ctx.lineWidth = LW * .9; ctx.stroke();
    ctx.strokeStyle = rgba(lite, .5); ctx.lineWidth = LW * .7;
    for (let i = 0; i < 3; i++) {                     // gân cánh
      ctx.beginPath();
      ctx.moveTo(S * .06, -S * (.02 - i * .04));
      ctx.quadraticCurveTo(-S * .28, -S * (.14 - i * .06), -S * .60, -S * (.02 - i * .03));
      ctx.stroke();
    }
    ctx.save(); ctx.globalCompositeOperation = 'lighter';         // vệt bóng kitin
    const gl = ctx.createLinearGradient(-S * .4, -S * .2, -S * .05, S * .04);
    gl.addColorStop(0, 'rgba(255,255,255,0)'); gl.addColorStop(.5, 'rgba(255,255,255,.55)');
    gl.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gl;
    ctx.beginPath(); ctx.ellipse(-S * .22, -S * .13, S * .24, S * .055, -.16, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.restore();

    // ── NGỰC + TẤM MAI (pronotum) như áo giáp ─────────────────────────────
    ctx.beginPath();
    ctx.moveTo(S * .30, -S * .20);
    ctx.quadraticCurveTo(S * .34, S * .16, S * .14, S * .24);
    ctx.quadraticCurveTo(-S * .12, S * .26, -S * .14, -S * .04);
    ctx.quadraticCurveTo(-S * .10, -S * .26, S * .12, -S * .28);
    ctx.closePath();
    ctx.fillStyle = chitin(-S * .2, -S * .3, S * .3, S * .25); ctx.fill(); silhouette();
    occlude(-S * .10, S * .06, S * .22, S * .16, 0, .26);         // bóng chỗ giáp bụng
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const pg = ctx.createLinearGradient(-S * .1, -S * .28, S * .2, -S * .04);
    pg.addColorStop(0, 'rgba(255,255,255,0)'); pg.addColorStop(.45, 'rgba(255,255,255,.6)');
    pg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = pg;
    ctx.beginPath(); ctx.ellipse(S * .04, -S * .17, S * .19, S * .06, -.25, 0, TAU); ctx.fill();
    ctx.restore();

    // ── GIÁP (nếu đang mặc) — ốp lên tấm mai ngực ─────────────────────────
    const gr = (slot) => recipeById(this.gear?.[slot]);
    const armor = gr('armor');
    if (armor) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(S * .28, -S * .18);
      ctx.quadraticCurveTo(S * .32, S * .14, S * .13, S * .22);
      ctx.quadraticCurveTo(-S * .10, S * .24, -S * .12, -S * .03);
      ctx.quadraticCurveTo(-S * .08, -S * .24, S * .11, -S * .26);
      ctx.closePath();
      const ag = ctx.createLinearGradient(-S * .2, -S * .3, S * .3, S * .25);
      ag.addColorStop(0, shade(armor.col, .34)); ag.addColorStop(.5, armor.col);
      ag.addColorStop(1, shade(armor.col, -.32));
      ctx.fillStyle = ag; ctx.fill();
      ctx.strokeStyle = shade(armor.col, -.55); ctx.lineWidth = LW * 1.2; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = LW * .7;
      ctx.beginPath(); ctx.moveTo(S * .08, -S * .22); ctx.lineTo(S * .04, S * .18); ctx.stroke();
      // đinh tán
      ctx.fillStyle = '#d8dfef';
      for (const [ox, oy] of [[.22, -.10], [.20, .08], [-.02, -.16], [-.04, .12]]) {
        ctx.beginPath(); ctx.arc(S * ox, S * oy, S * .017, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }

    // ── CHÂN GIỮA + CHÂN TRƯỚC ─────────────────────────────────────────────
    this._walkLeg(ctx, S * .06, S * .20, S * .34, ink, lite, LW * 1.25, t * 1.7 + 1.2);
    this._walkLeg(ctx, S * .26, S * .18, S * .30, ink, lite, LW * 1.25, t * 1.7);
    const weapon = gr('weapon');
    if (weapon) {
      ctx.save();
      ctx.translate(S * .34, S * .46);
      ctx.rotate(-.5 + Math.sin(t * 1.7) * .07);
      ctx.strokeStyle = '#7a5230'; ctx.lineWidth = S * .05; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(S * .04, -S * .22); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(S * .04, -S * .22);
      ctx.lineTo(S * .16, -S * .40); ctx.lineTo(S * .21, -S * .30);
      ctx.lineTo(S * .09, -S * .16);
      ctx.closePath();
      ctx.fillStyle = weapon.col; ctx.fill();
      ctx.strokeStyle = shade(weapon.col, -.55); ctx.lineWidth = LW; ctx.lineJoin = 'round'; ctx.stroke();
      ctx.restore();
    }

    // ── ĐẦU ────────────────────────────────────────────────────────────────
    const HR = S * .24 * (1 + young * .16) * SPC.head;
    const hx = S * .42, hy = -S * .18 - proud * S * .05 + Math.sin(t * 2.3 + 1.2) * S * .012;
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(-.10 - proud * .22 + this.mouth * .10 + Math.sin(t * 1.1) * .03);

    // RÂU: hai sợi dài cong về sau, uốn theo nhịp
    ctx.strokeStyle = ink; ctx.lineWidth = LW * 1.05; ctx.lineCap = 'round';
    const A = SPC.ant;                                 // dế râu dài, châu chấu râu ngắn
    for (const [d, ph] of [[1, 0], [1.16, 1.1]]) {
      const w = Math.sin(t * 1.9 + ph) * .22 + (this.antic === 'groom' ? Math.sin(t * 9) * .3 : 0);
      ctx.beginPath();
      ctx.moveTo(HR * .55, -HR * .42);
      ctx.bezierCurveTo(HR * 1.7 * d * A, -HR * (1.5 + w) * d * A,
                        HR * 0.6 * d * A, -HR * (2.9 + w) * d * A,
                       -HR * 1.1 * d * A, -HR * (2.6 - w * .6) * d * A);
      ctx.stroke();
    }
    if (A < .7) {                                      // râu ngắn thì có núm đầu râu
      ctx.fillStyle = ink;
      for (const d of [1, 1.16]) {
        ctx.beginPath();
        ctx.arc(-HR * 1.1 * d * A, -HR * 2.6 * d * A, HR * .09, 0, TAU); ctx.fill();
      }
    }

    // sọ dế: hơi vuông, mặt nghiêng về trước
    ctx.beginPath();
    ctx.moveTo(-HR * .78, -HR * .30);
    ctx.quadraticCurveTo(-HR * .50, -HR * 1.02, HR * .34, -HR * .96);
    ctx.quadraticCurveTo(HR * 1.06, -HR * .82, HR * 1.10, -HR * .10);
    ctx.quadraticCurveTo(HR * 1.06, HR * .58, HR * .40, HR * .74);
    ctx.quadraticCurveTo(-HR * .40, HR * .82, -HR * .78, HR * .30);
    ctx.closePath();
    ctx.fillStyle = chitin(-HR, -HR, HR, HR); ctx.fill(); silhouette();
    occlude(-HR * .55, HR * .30, HR * .55, HR * .34, 0, .24);      // bóng gáy

    // hàm (mandible) nhỏ, mở khi gáy/ngáp
    ctx.save();
    ctx.translate(HR * .78, HR * .40); ctx.rotate(this.mouth * .5);
    for (const d of [0, 1]) {
      ctx.beginPath();
      ctx.moveTo(0, -HR * .10 + d * HR * .14);
      ctx.quadraticCurveTo(HR * .34, -HR * .02 + d * HR * .16, HR * .44, HR * .14 + d * HR * .12);
      ctx.quadraticCurveTo(HR * .18, HR * .16 + d * HR * .12, 0, HR * .10 + d * HR * .12);
      ctx.closePath();
      ctx.fillStyle = shade(B.horn, -d * .18); ctx.fill(); line(.65);
    }
    ctx.restore();

    // ── MŨ (nếu đang mặc) ─────────────────────────────────────────────────
    const helm = gr('helm');
    if (helm) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(-HR * .80, -HR * .44);
      ctx.quadraticCurveTo(-HR * .60, -HR * 1.05, HR * .36, -HR * 1.00);
      ctx.quadraticCurveTo(HR * 1.02, -HR * .90, HR * .96, -HR * .50);
      ctx.quadraticCurveTo(HR * .26, -HR * .66, -HR * .80, -HR * .44);
      ctx.closePath();
      const hg = ctx.createLinearGradient(-HR, -HR, HR, HR * .2);
      hg.addColorStop(0, shade(helm.col, .40)); hg.addColorStop(.55, helm.col);
      hg.addColorStop(1, shade(helm.col, -.34));
      ctx.fillStyle = hg; ctx.fill();
      ctx.strokeStyle = shade(helm.col, -.58); ctx.lineWidth = LW * 1.2; ctx.lineJoin = 'round'; ctx.stroke();
      // hai chấu mũ
      ctx.fillStyle = shade(helm.col, .12);
      for (const d of [-1, 1]) {
        ctx.save(); ctx.translate(HR * .12 + d * HR * .46, -HR * .92); ctx.rotate(d * .5);
        ctx.beginPath();
        ctx.moveTo(-HR * .09, HR * .10);
        ctx.quadraticCurveTo(0, -HR * .48, HR * .10, HR * .10);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = shade(helm.col, -.58); ctx.lineWidth = LW; ctx.stroke();
        ctx.restore();
      }
      ctx.fillStyle = 'rgba(255,255,255,.45)';
      ctx.beginPath(); ctx.ellipse(-HR * .18, -HR * .68, HR * .30, HR * .09, -.2, 0, TAU); ctx.fill();
      ctx.restore();
    }

    // MẮT KÉP to, bóng
    const open = 1 - this.blink;
    const ex = HR * .40, ey = -HR * .34, er = HR * .40;
    if (open < .12) {
      ctx.strokeStyle = ink; ctx.lineWidth = LW;
      ctx.beginPath(); ctx.moveTo(ex - er * .8, ey); ctx.quadraticCurveTo(ex, ey - er * .8, ex + er * .8, ey); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.ellipse(ex, ey, er, er * (.62 + .38 * open), -.18, 0, TAU);
      ctx.fillStyle = '#fff'; ctx.fill(); line(.85);
      ctx.save();
      ctx.beginPath(); ctx.ellipse(ex, ey, er, er * (.62 + .38 * open), -.18, 0, TAU); ctx.clip();
      ctx.fillStyle = B.eye;
      ctx.beginPath(); ctx.arc(ex + er * .20, ey + er * .06, er * .70, 0, TAU); ctx.fill();
      ctx.fillStyle = '#160a1e';
      ctx.beginPath(); ctx.arc(ex + er * .24, ey + er * .06, er * .42, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.95)';
      ctx.beginPath(); ctx.arc(ex - er * .16, ey - er * .34, er * .26, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(ex + er * .44, ey + er * .30, er * .12, 0, TAU); ctx.fill();
      ctx.restore();
      // mí mắt trên — nét mảnh ôm theo mắt, làm ánh nhìn có hồn
      ctx.strokeStyle = rgba(ink, .55); ctx.lineWidth = LW * .7;
      ctx.beginPath(); ctx.arc(ex, ey, er * 1.02, Math.PI * 1.06, Math.PI * 1.92); ctx.stroke();
    }
    // chân mày → nét "ngang tàng" của Dế Mèn
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

    const m = ctx.getTransform();
    const mlx = HR * 1.15, mly = HR * .40;
    this.mouthPos = { x: m.e + m.a * mlx + m.c * mly, y: m.f + m.b * mlx + m.d * mly };
    ctx.restore();   // hết đầu

    // ── ĐAI CÓI ĐAN vắt chéo ngực (từ giai đoạn 2) ────────────────────────
    // Cố ý khác hẳn kiểu khăn len quấn cổ hay gặp: đây là dải cói đan chéo
    // thân, tông xanh ngọc, có hạt gỗ và tua rua — nhận diện riêng của game.
    if (st.id >= 2) {
      const fly = Math.sin(t * 2.6) * S * .04;
      ctx.save();
      // dải chính vắt từ vai xuống hông đối diện
      ctx.beginPath();
      ctx.moveTo(S * .30, -S * .18);
      ctx.quadraticCurveTo(S * .06, S * .06, -S * .10, S * .26);
      ctx.lineWidth = S * .085; ctx.strokeStyle = '#1f8f86'; ctx.lineCap = 'butt'; ctx.stroke();
      ctx.lineWidth = S * .085; ctx.strokeStyle = 'rgba(255,255,255,.10)'; ctx.stroke();
      // mắt đan chéo
      ctx.save();
      ctx.strokeStyle = '#eadfc0'; ctx.lineWidth = S * .014; ctx.lineCap = 'round';
      for (let i = 0; i < 9; i++) {
        const k = i / 8;
        const bx = S * (.30 - k * .40) + Math.sin(k * 3) * S * .01;
        const by = -S * .18 + k * S * .44;
        ctx.beginPath();
        ctx.moveTo(bx - S * .035, by - S * .028); ctx.lineTo(bx + S * .035, by + S * .028);
        ctx.moveTo(bx + S * .035, by - S * .028); ctx.lineTo(bx - S * .035, by + S * .028);
        ctx.stroke();
      }
      ctx.restore();
      // hạt gỗ + tua rua
      ctx.beginPath(); ctx.arc(S * .12, S * .00, S * .045, 0, TAU);
      ctx.fillStyle = '#a9702f'; ctx.fill();
      ctx.strokeStyle = '#5d3c14'; ctx.lineWidth = S * .014; ctx.stroke();
      ctx.strokeStyle = '#1f8f86'; ctx.lineWidth = S * .022; ctx.lineCap = 'round';
      for (const d of [-1, 0, 1]) {
        ctx.beginPath();
        ctx.moveTo(-S * .10, S * .26);
        ctx.quadraticCurveTo(-S * .18 + d * S * .03, S * .36 + fly, -S * .22 + d * S * .06, S * .44 + fly);
        ctx.stroke();
      }
      ctx.restore();
    }

    // ── CÀNG SAU bên gần — vẽ sau cùng, luôn nhìn thấy ────────────────────
    this._hindLeg(ctx, -S * .12, S * .06, S * SPC.fem, ink, femurFill, LW, t, this.bounce, 1);

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
  }

  /**
   * Càng nhảy — bộ phận nhận diện số 1 của con dế.
   * Hình chữ "Λ": ĐÙI to như quả trám, đầu gối vươn CAO HƠN LƯNG, rồi ống chân
   * mảnh có gai đổ chéo xuống trước tới bàn chân. Sai chỗ đầu gối là mất chất dế.
   */
  _hindLeg(ctx, x, y, S, ink, fill, lw, t, bounce, side) {
    const crouch = ease.outCubic(clamp(bounce, 0, 1));
    const idle = Math.sin(t * 1.6) * .02;
    // hông → đầu gối → bàn chân
    // Cụm càng nằm HẲN VỀ PHÍA SAU thân: gối hất lên trên bụng, ống chân đổ
    // xuống-ra sau. Nếu bàn chân đặt về phía trước, ống chân sẽ cắt chéo qua
    // người và trông như một cái que — đó là lỗi hay gặp nhất khi vẽ côn trùng.
    const hip  = { x: 0,        y: 0 };
    // Gối lùi hẳn ra sau-trên để khối đùi nằm NGOÀI rìa bụng, không chồng lên
    // thân (chồng lên là mất khối vì cùng tông màu).
    const knee = { x: -S * .50, y: -S * (.26 - crouch * .12) + idle * S };
    // Bàn chân đặt RA SAU chứ không xuống dưới bụng — nhờ vậy ống chân men theo
    // rìa sau của bụng thay vì cắt ngang qua người.
    const foot = { x: -S * (.62 - crouch * .06), y: S * (.48 - crouch * .08) };

    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = side < 0 ? .62 : 1;

    // ── ĐÙI: quả trám mập, trục hông→gối ─────────────────────────────────
    const ang = Math.atan2(knee.y - hip.y, knee.x - hip.x);
    const len = Math.hypot(knee.x - hip.x, knee.y - hip.y);
    ctx.save();
    ctx.translate((hip.x + knee.x) / 2, (hip.y + knee.y) / 2); ctx.rotate(ang);
    // Đùi = ellipse xoay theo trục hông→gối. Dùng ellipse thay vì bezier để
    // khối lúc nào cũng dày dặn, không bị "xẹp" khi hai đầu xích lại gần nhau.
    ctx.beginPath(); ctx.ellipse(0, 0, len * .62, S * .26, 0, 0, TAU);
    ctx.fillStyle = fill; ctx.fill();
    ctx.strokeStyle = ink; ctx.lineWidth = lw * 2.0; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.save();
    ctx.beginPath(); ctx.ellipse(0, 0, len * .62, S * .26, 0, 0, TAU); ctx.clip();
    ctx.strokeStyle = rgba(ink, .42); ctx.lineWidth = lw * .9;
    for (let i = -2; i <= 2; i++) {                                  // vân xương cá
      const px = i * len * .26;
      ctx.beginPath();
      ctx.moveTo(px - len * .10, -S * .30); ctx.lineTo(px + len * .06, 0); ctx.lineTo(px - len * .10, S * .30);
      ctx.stroke();
    }
    ctx.globalAlpha = .40; ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(-len * .10, -S * .10, len * .40, S * .055, 0, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.restore();

    // ── ỐNG CHÂN: mảnh, có gai, từ gối đổ xuống trước ───────────────────
    const ta = Math.atan2(foot.y - knee.y, foot.x - knee.x);
    const tl = Math.hypot(foot.x - knee.x, foot.y - knee.y);
    ctx.save();
    ctx.translate(knee.x, knee.y); ctx.rotate(ta);
    ctx.beginPath();
    ctx.moveTo(0, -S * .050); ctx.lineTo(tl, -S * .022);
    ctx.lineTo(tl, S * .022);  ctx.lineTo(0, S * .050);
    ctx.closePath();
    ctx.fillStyle = fill; ctx.fill();
    ctx.strokeStyle = ink; ctx.lineWidth = lw; ctx.stroke();
    ctx.lineWidth = lw * .75;
    for (let i = 1; i <= 5; i++) {
      const px = tl * (i / 6);
      ctx.beginPath(); ctx.moveTo(px, -S * .04); ctx.lineTo(px + S * .012, -S * .10); ctx.stroke();
    }
    // bàn chân
    ctx.beginPath();
    ctx.moveTo(tl, 0);
    ctx.quadraticCurveTo(tl + S * .13, S * .05, tl + S * .21, S * .13);
    ctx.lineWidth = lw * 1.5; ctx.lineCap = 'round'; ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(tl + S * .10, S * .03); ctx.lineTo(tl + S * .16, S * .13);
    ctx.lineWidth = lw * 1.1; ctx.stroke();
    ctx.restore();

    // khớp gối
    ctx.beginPath(); ctx.arc(knee.x, knee.y, S * .055, 0, TAU);
    ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = lw; ctx.stroke();
    ctx.restore();
  }

  /** Chân đi bộ: đùi ngắn + ống chân, đung đưa nhẹ. */
  _walkLeg(ctx, x, y, s, ink, fill, lw, phase) {
    const k = Math.sin(phase) * .16;
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = ink; ctx.lineWidth = lw * 1.9; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(s * (.26 + k * .2), s * .42);
    ctx.lineTo(s * (.10 + k * .5), s * .96);
    ctx.stroke();
    ctx.strokeStyle = fill; ctx.lineWidth = lw * 1.0;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(s * (.26 + k * .2), s * .42);
    ctx.lineTo(s * (.10 + k * .5), s * .96);
    ctx.stroke();
    ctx.strokeStyle = ink; ctx.lineWidth = lw * 1.5;
    ctx.beginPath();
    ctx.moveTo(s * (.10 + k * .5), s * .96); ctx.lineTo(s * (.30 + k * .5), s * 1.02);
    ctx.stroke();
    ctx.restore();
  }
}

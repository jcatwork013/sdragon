// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THIÊN ĐỊCH — lớp chiến đấu chồng lên match-3 / bắn đá.                  ║
// ║                                                                          ║
// ║  Vòng lặp mới: bạn ghép đá → gây sát thương lên địch.  Địch có đồng hồ    ║
// ║  riêng, tới hạn là RA ĐÒN: trừ điểm, cướp vàng, giăng tơ khoá ô, hút giờ. ║
// ║  Máu bạn về 0 → THUA và bị PHẠT (mất vàng + mất điểm).                    ║
// ║  Muốn qua màn phải diệt sạch địch VÀ đủ điểm mục tiêu.                    ║
// ╚══════════════════════════════════════════════════════════════════════════╝
import { TAU, clamp, lerp, ease, rgba, shade, poly, strokeText } from '../core/util.js';

/** Đòn của địch — mỗi loài một kiểu gây ức chế khác nhau. */
export const ATK = {
  BITE:  'bite',    // cắn: trừ máu nhiều
  ROB:   'rob',     // cướp vàng + trừ điểm
  WEB:   'web',     // giăng tơ khoá ô, phải ghép sát mới gỡ được
  DRAIN: 'drain',   // hút thời gian
  SWARM: 'swarm',   // đánh liên tiếp 2 lần, ít sát thương mỗi lần
};

export const ENEMIES = {
  ant: {
    id: 'ant', name: 'Kiến Lính', name_en: 'Soldier Ant',
    hp: 260, dmg: 9, every: 11.0, atk: ATK.ROB,
    body: '#8c4a22', dark: '#4a230d', lite: '#c98a4e', eye: '#2a1408',
  },
  spider: {
    id: 'spider', name: 'Nhện Cỏ', name_en: 'Grass Spider',
    hp: 330, dmg: 8, every: 12.0, atk: ATK.WEB,
    body: '#4a3a63', dark: '#221732', lite: '#8a76ad', eye: '#ff5470',
  },
  wasp: {
    id: 'wasp', name: 'Ong Vò Vẽ', name_en: 'Hornet',
    hp: 290, dmg: 7, every: 8.0, atk: ATK.SWARM,
    body: '#e0a41c', dark: '#5c3d00', lite: '#ffe08a', eye: '#2a1408',
  },
  mantis: {
    id: 'mantis', name: 'Bọ Ngựa', name_en: 'Mantis',
    hp: 460, dmg: 14, every: 13.0, atk: ATK.BITE,
    body: '#4f9c4a', dark: '#1e4a1c', lite: '#9fe08a', eye: '#ffe066',
  },
  // Chim cốc — thiên địch thật của dế ngoài đồng: mỏ móc, cổ dài, mổ một phát
  // là xong. Tên "Cốc Mỏ Sắt" tự đặt; "cốc" ở đây là TÊN LOÀI chim, không phải
  // nhân vật của tác phẩm nào.
  bird: {
    id: 'bird', name: 'Cốc Mỏ Sắt', name_en: 'Ironbeak Cormorant',
    hp: 1050, dmg: 17, every: 9.0, atk: ATK.BITE, boss: true,
    body: '#2f3742', dark: '#0e1319', lite: '#7d8894', eye: '#ffcf5a', beak: '#f5b027',
  },
  toad: {
    id: 'toad', name: 'Cóc Già', name_en: 'Old Toad',
    hp: 880, dmg: 13, every: 10.0, atk: ATK.DRAIN, boss: true,
    body: '#6f7a3a', dark: '#2f3516', lite: '#b7c47a', eye: '#ffcf5a',
  },
};

/**
 * Cú lao quấy phá nối thiên địch với nhân vật. Logic sát thương vẫn nằm ở
 * scene; hàm này chỉ làm đòn đánh có đường đi và có điểm va chạm rõ ràng.
 */
export function drawEnemyRaid(ctx, fx, sx, sy, tx, ty) {
  if (!fx?.enemy) return;
  const p = clamp(fx.t / fx.dur, 0, 1);
  const go = p < .54 ? ease.outCubic(p / .54) : ease.inCubic((1 - p) / .46);
  const x = lerp(sx, tx, go), y = lerp(sy, ty, go) - Math.sin(go * Math.PI) * 76;
  const hit = clamp(1 - Math.abs(p - .54) / .18, 0, 1);

  ctx.save();
  // vệt truy đuổi cong, đứt nét ở đầu để không che giao diện quá lâu
  ctx.globalAlpha = .18 + go * .52;
  ctx.strokeStyle = fx.kind === ATK.DRAIN ? '#b98cff' : fx.kind === ATK.WEB ? '#e6f3ff' : '#ff6b76';
  ctx.lineWidth = 3 + go * 3; ctx.lineCap = 'round'; ctx.setLineDash([10, 9]); ctx.lineDashOffset = -p * 70;
  ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo((sx + tx) / 2, Math.min(sy, ty) - 110, x, y); ctx.stroke();
  ctx.setLineDash([]);

  if (fx.kind === ATK.WEB) {
    ctx.globalAlpha = .2 + hit * .65; ctx.strokeStyle = '#eef8ff'; ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const a = i / 4 * TAU + p; ctx.beginPath(); ctx.moveTo(x, y);
      ctx.lineTo(tx + Math.cos(a) * (24 + i * 7), ty + Math.sin(a) * (18 + i * 5)); ctx.stroke();
    }
  } else if (fx.kind === ATK.DRAIN) {
    ctx.globalAlpha = hit * .72; ctx.strokeStyle = '#d9b8ff'; ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(tx, ty, 18 + i * 13 + p * 8, 0, TAU); ctx.stroke(); }
  } else if (fx.kind === ATK.ROB) {
    ctx.globalAlpha = hit * .9; ctx.fillStyle = '#ffd24f'; ctx.strokeStyle = '#7a4510'; ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + p * 3; ctx.beginPath(); ctx.arc(tx + Math.cos(a) * 28, ty + Math.sin(a) * 20, 6, 0, TAU); ctx.fill(); ctx.stroke(); }
  }

  // bản sao lao tới; nguồn thật vẫn đứng trên mép bàn nên người chơi không mất
  // dấu đồng hồ ra đòn và thanh máu trong lúc hiệu ứng chạy.
  ctx.globalAlpha = .52 + go * .48;
  if (fx.kind === ATK.SWARM) {
    for (const [dx, dy, al] of [[-18, 8, .20], [16, -9, .28]]) {
      ctx.save(); ctx.globalAlpha = al * go; fx.enemy.draw(ctx, x + dx, y + dy, 48); ctx.restore();
    }
  }
  fx.enemy.draw(ctx, x, y, 54 + hit * 18);

  if (hit > 0) {
    ctx.globalAlpha = hit; ctx.strokeStyle = '#fff4b0'; ctx.lineWidth = 4;
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * TAU + .2, r0 = 24 + (1 - hit) * 18, r1 = r0 + 18;
      ctx.beginPath(); ctx.moveTo(tx + Math.cos(a) * r0, ty + Math.sin(a) * r0);
      ctx.lineTo(tx + Math.cos(a) * r1, ty + Math.sin(a) * r1); ctx.stroke();
    }
  }
  ctx.restore();
}

// ── bộ dụng cụ vẽ chung cho mọi thiên địch ─────────────────────────────────
// Ba thứ quyết định "dễ thương": MẮT TO có tròng và chấm sáng, KHỐI TRÒN có
// chuyển sáng-tối, và VIỀN DÀY. Trước đây cả ba đều thiếu — thân là mảng màu
// phẳng, mắt là chấm đặc, chân là nét thẳng — nên con nào cũng ra bóng đen.

/** Mắt to kiểu hoạt hình: lòng trắng · tròng · con ngươi · chấm sáng. */
function eye(ctx, x, y, r, o = {}) {
  const look = o.look ?? .25, sq = o.squash ?? 1, ink = o.ink || '#1a1024';
  const lid = clamp(o.open ?? 1, 0, 1);
  if (lid < .12) {                                    // nheo/nhắm
    ctx.strokeStyle = ink; ctx.lineWidth = r * .30; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - r * .8, y); ctx.quadraticCurveTo(x, y - r * .7, x + r * .8, y); ctx.stroke();
    return;
  }
  const ry = r * sq * (.35 + .65 * lid);
  ctx.save();
  ctx.beginPath(); ctx.ellipse(x, y, r, ry, o.rot || 0, 0, TAU);
  ctx.fillStyle = '#fff'; ctx.fill();
  ctx.strokeStyle = ink; ctx.lineWidth = r * .20; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(x, y, r, ry, o.rot || 0, 0, TAU); ctx.clip();
  ctx.fillStyle = o.iris || '#ffcf5a';
  ctx.beginPath(); ctx.arc(x + look * r * .30, y + ry * .08, r * .64, 0, TAU); ctx.fill();
  ctx.fillStyle = rgba(o.irisDark || '#7a4a00', .55);
  ctx.beginPath(); ctx.arc(x + look * r * .30, y + ry * .08, r * .64, 0, TAU);
  ctx.lineWidth = r * .16; ctx.strokeStyle = rgba(o.irisDark || '#7a4a00', .55); ctx.stroke();
  ctx.fillStyle = '#150a1c';
  ctx.beginPath(); ctx.arc(x + look * r * .36, y + ry * .08, r * .36, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.95)';
  ctx.beginPath(); ctx.arc(x - r * .26, y - ry * .38, r * .24, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * .34, y + ry * .34, r * .11, 0, TAU); ctx.fill();
  ctx.restore();
}

/** Chân mày gườm gườm — giữ chất "thiên địch" cho cặp mắt to khỏi thành thú cưng. */
function brow(ctx, x, y, r, dir, ink, k = 1) {
  ctx.save();
  ctx.strokeStyle = ink; ctx.lineWidth = r * .34; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - dir * r * 1.05, y - r * (.95 + .25 * k));
  ctx.lineTo(x + dir * r * .85, y - r * (1.45 + .35 * k));
  ctx.stroke();
  ctx.restore();
}

/** Khối vỏ có chuyển sáng-tối + viền dày + chớp sáng. */
function shell(ctx, path, s, col, ink, o = {}) {
  path();
  const g = ctx.createLinearGradient(-s * .4, -s * .45, s * .35, s * .45);
  g.addColorStop(0, shade(col, o.hi ?? .34));
  g.addColorStop(.5, col);
  g.addColorStop(1, shade(col, o.lo ?? -.34));
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = ink; ctx.lineWidth = s * (o.lw ?? .042); ctx.lineJoin = 'round'; ctx.stroke();
  if (o.gloss !== false) {
    ctx.save(); path(); ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,.34)';
    ctx.beginPath();
    ctx.ellipse(o.gx ?? -s * .10, o.gy ?? -s * .16, o.gw ?? s * .18, o.gh ?? s * .07, o.ga ?? -.3, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}

/** Chân ba đốt có khớp — thay cho nét thẳng một mạch. */
function limb(ctx, p0, p1, p2, w, ink, fill) {
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]);
  ctx.strokeStyle = ink; ctx.lineWidth = w * 1.9; ctx.stroke();
  ctx.strokeStyle = fill; ctx.lineWidth = w * .85; ctx.stroke();
  ctx.beginPath(); ctx.arc(p1[0], p1[1], w * .72, 0, TAU);
  ctx.fillStyle = fill; ctx.fill();
  ctx.strokeStyle = ink; ctx.lineWidth = w * .5; ctx.stroke();
}

/** Má hồng — rẻ nhất mà hiệu quả nhất trong việc làm con vật bớt dữ. */
function blush(ctx, x, y, r, a = .34) {
  ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#ff7d9c';
  ctx.beginPath(); ctx.ellipse(x, y, r, r * .55, -.1, 0, TAU); ctx.fill();
  ctx.restore();
}

export class Enemy {
  constructor(kind, tier = 1) {
    const d = ENEMIES[kind] || ENEMIES.ant;
    this.def = d;
    this.maxHp = Math.round(d.hp * (1 + (tier - 1) * 0.34));
    this.hp = this.maxHp;
    this.dmg = Math.round(d.dmg * (1 + (tier - 1) * 0.26));
    this.every = Math.max(5.8, d.every - (tier - 1) * 0.55);
    this.cd = this.every * (0.55 + Math.random() * 0.35);   // lệch nhịp cho khỏi đánh cùng lúc
    this.t = Math.random() * 6;
    this.hurt = 0; this.wind = 0; this.dead = false; this.deadT = 0;
    this.bump = 0;                                        // bị gõ búa → nổi u trên đầu
    this.shake = 0;
  }
  get alive() { return this.hp > 0; }
  get ratio() { return clamp(this.hp / this.maxHp, 0, 1); }

  damage(n) {
    if (this.dead) return 0;
    const real = Math.min(this.hp, n);
    this.hp -= real;
    this.hurt = 1; this.shake = 1;
    if (this.hp <= 0) { this.dead = true; this.deadT = 0; }
    return real;
  }

  /** @returns 'windup' | 'strike' | null */
  /** Ăn một búa vào đầu: sưng u, choáng váng một lúc. */
  bonk() { this.bump = 1.6; this.hurt = 1; this.shake = 1; }

  update(dt) {
    this.t += dt;
    this.bump = Math.max(0, this.bump - dt);
    this.hurt = Math.max(0, this.hurt - dt * 3);
    this.shake = Math.max(0, this.shake - dt * 4);
    if (this.dead) { this.deadT += dt; return null; }
    this.cd -= dt;
    if (this.cd <= 1.1 && this.wind === 0) { this.wind = 1; return 'windup'; }
    if (this.cd <= 0) { this.cd = this.every; this.wind = 0; return 'strike'; }
    return null;
  }

  // ── vẽ ────────────────────────────────────────────────────────────────────
  draw(ctx, x, y, s) {
    const d = this.def, t = this.t;
    if (this.dead && this.deadT > .9) return;
    const die = this.dead ? clamp(this.deadT / .9, 0, 1) : 0;
    const wind = this.wind ? .5 + .5 * Math.sin(t * 22) : 0;

    ctx.save();
    ctx.translate(x + (this.shake ? (Math.random() - .5) * s * .12 : 0), y);
    ctx.globalAlpha = 1 - die;
    ctx.rotate(die * 1.5);
    ctx.scale(1 + die * .2, 1 - die * .5);

    const ink = d.dark;
    const body = this.hurt > .4 ? '#ff9a9a' : d.body;
    const lite = this.hurt > .4 ? '#ffd6d6' : d.lite;
    const bob = Math.sin(t * 2.4) * s * .03 + wind * s * .06;
    const E = s * .10;                                  // bán kính mắt chuẩn
    const open = die > 0 ? 0 : 1;
    const look = .3 + wind * .3;
    const legW = s * .028;
    // bóng tiếp đất
    ctx.save(); ctx.globalAlpha = (1 - die) * .26; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(0, s * .52, s * .40, s * .08, 0, 0, TAU); ctx.fill();
    ctx.restore();

    if (d.id === 'spider') {
      // ── NHỆN CỎ: bụng tròn xù, 8 chân gối cao, 4 mắt ────────────────────
      const SPREAD = [[-.30, -.34, -.52, .30], [-.10, -.42, -.30, .40],
                      [ .10, -.40, .18, .42], [ .28, -.30, .46, .30]];
      for (let i = 0; i < 4; i++) for (const sx of [-1, 1]) {
        const [hx0, ky0, fx0, fy0] = SPREAD[i];
        const sw = Math.sin(t * 3 + i * .9 + (sx > 0 ? 0 : 1.6)) * s * .045;
        limb(ctx, [s * hx0 * .4, bob + s * .04],
                  [s * (hx0 * .9 + sx * .16), bob + s * ky0 + sw],
                  [s * (fx0 + sx * .18), bob + s * fy0], legW * 1.35, ink, shade(d.body, -.06));
      }
      const abd = () => { ctx.beginPath(); ctx.ellipse(-s * .04, bob + s * .10, s * .32, s * .28, -.08, 0, TAU); };
      shell(ctx, abd, s, body, ink, { gx: -s * .16, gy: bob - s * .02, gw: s * .16, gh: s * .07 });
      // lông tơ quanh bụng
      ctx.strokeStyle = rgba(d.dark, .55); ctx.lineWidth = s * .016; ctx.lineCap = 'round';
      for (let i = 0; i < 14; i++) {
        const a = i / 14 * TAU;
        const px = -s * .04 + Math.cos(a) * s * .32, py = bob + s * .10 + Math.sin(a) * s * .28;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(a) * s * .05, py + Math.sin(a) * s * .05); ctx.stroke();
      }
      const head = () => { ctx.beginPath(); ctx.ellipse(s * .20, bob - s * .12, s * .21, s * .18, 0, 0, TAU); };
      shell(ctx, head, s, lite, ink, { gx: s * .13, gy: bob - s * .20, gw: s * .11, gh: s * .05 });
      eye(ctx, s * .26, bob - s * .17, E * 1.05, { iris: d.eye, irisDark: '#5c0018', ink, open, look });
      eye(ctx, s * .10, bob - s * .15, E * .80, { iris: d.eye, irisDark: '#5c0018', ink, open, look });
      ctx.fillStyle = ink;
      for (const ox of [.30, .16]) { ctx.beginPath(); ctx.arc(s * ox, bob - s * .27, s * .022, 0, TAU); ctx.fill(); }
      brow(ctx, s * .26, bob - s * .17, E * 1.05, 1, ink, wind);
      blush(ctx, s * .30, bob - s * .04, s * .06);
      // kìm nhỏ
      ctx.strokeStyle = ink; ctx.lineWidth = s * .034; ctx.lineCap = 'round';
      for (const dd of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(s * .36, bob - s * .06);
        ctx.quadraticCurveTo(s * .44, bob + dd * s * .03, s * .40, bob + s * (.08 + dd * .03)); ctx.stroke();
      }

    } else if (d.id === 'wasp') {
      // ── ONG VÒ VẼ: bụng vằn, ngực xù, cánh rung ─────────────────────────
      ctx.save(); ctx.globalAlpha = (1 - die) * .42;
      const fl = Math.sin(t * 26) * .45;
      for (const sx of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(sx * s * .10 - s * .02, bob - s * .26, s * .30, s * .11, sx * (.55 + fl), 0, TAU);
        ctx.fillStyle = '#eaf2ff'; ctx.fill();
        ctx.strokeStyle = 'rgba(120,140,190,.6)'; ctx.lineWidth = s * .012; ctx.stroke();
      }
      ctx.restore();
      // ngòi
      ctx.beginPath();
      ctx.moveTo(-s * .30, bob + s * .14); ctx.lineTo(-s * .52, bob + s * .24); ctx.lineTo(-s * .28, bob + s * .24);
      ctx.closePath(); ctx.fillStyle = ink; ctx.fill();
      const abd2 = () => { ctx.beginPath(); ctx.ellipse(-s * .10, bob + s * .10, s * .28, s * .21, -.12, 0, TAU); };
      shell(ctx, abd2, s, body, ink, { gx: -s * .18, gy: bob + s * .00, gw: s * .13, gh: s * .06 });
      ctx.save(); abd2(); ctx.clip();
      ctx.fillStyle = rgba(d.dark, .92);
      for (let i = -1; i <= 2; i++) {
        ctx.save(); ctx.translate(-s * .10 + i * s * .13, bob + s * .10); ctx.rotate(-.12);
        ctx.fillRect(-s * .035, -s * .24, s * .07, s * .48); ctx.restore();
      }
      ctx.restore();
      // ngực xù
      const thx = () => { ctx.beginPath(); ctx.ellipse(s * .13, bob + s * .02, s * .17, s * .16, 0, 0, TAU); };
      shell(ctx, thx, s, shade(d.body, -.14), ink, { gloss: false });
      ctx.strokeStyle = rgba(d.lite, .8); ctx.lineWidth = s * .015; ctx.lineCap = 'round';
      for (let i = 0; i < 10; i++) {
        const a = i / 10 * TAU;
        const px = s * .13 + Math.cos(a) * s * .17, py = bob + s * .02 + Math.sin(a) * s * .16;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(a) * s * .045, py + Math.sin(a) * s * .045); ctx.stroke();
      }
      const hd2 = () => { ctx.beginPath(); ctx.ellipse(s * .34, bob - s * .06, s * .17, s * .16, 0, 0, TAU); };
      shell(ctx, hd2, s, lite, ink, { gx: s * .28, gy: bob - s * .14, gw: s * .09, gh: s * .04 });
      // râu
      ctx.strokeStyle = ink; ctx.lineWidth = s * .026; ctx.lineCap = 'round';
      for (const dd of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(s * .40, bob - s * .16);
        ctx.quadraticCurveTo(s * .54, bob - s * (.30 + dd * .06), s * .48, bob - s * (.38 + dd * .08)); ctx.stroke();
      }
      eye(ctx, s * .40, bob - s * .09, E * 1.05, { iris: d.eye, irisDark: '#3a2000', ink, open, look });
      eye(ctx, s * .24, bob - s * .08, E * .78, { iris: d.eye, irisDark: '#3a2000', ink, open, look });
      brow(ctx, s * .40, bob - s * .09, E * 1.05, 1, ink, wind);
      blush(ctx, s * .42, bob + s * .04, s * .055);

    } else if (d.id === 'mantis') {
      // ── BỌ NGỰA: đầu tam giác, mắt to, hai càng bổ ──────────────────────
      for (const sx of [-1, 1]) {
        limb(ctx, [sx * s * .06, bob + s * .16], [sx * s * .28, bob + s * .30],
             [sx * s * .16, bob + s * .52], legW, ink, shade(d.body, -.10));
      }
      const thorax = () => {
        ctx.beginPath();
        ctx.moveTo(0, bob - s * .16);
        ctx.bezierCurveTo(s * .17, bob - s * .02, s * .15, bob + s * .30, 0, bob + s * .46);
        ctx.bezierCurveTo(-s * .15, bob + s * .30, -s * .17, bob - s * .02, 0, bob - s * .16);
        ctx.closePath();
      };
      shell(ctx, thorax, s, body, ink, { gx: -s * .05, gy: bob + s * .06, gw: s * .05, gh: s * .16, ga: 0 });
      // hai càng bổ — giơ cao khi sắp ra đòn
      for (const sx of [-1, 1]) {
        ctx.save();
        ctx.translate(sx * s * .12, bob - s * .10);
        ctx.rotate(sx * (-.45 - wind * .85));
        limb(ctx, [0, 0], [sx * s * .30, -s * .12], [sx * s * .40, -s * .34], s * .036, ink, lite);
        ctx.strokeStyle = ink; ctx.lineWidth = s * .018; ctx.lineCap = 'round';
        for (let i = 1; i <= 3; i++) {                    // gai trên càng
          const u = i / 4;
          ctx.beginPath();
          ctx.moveTo(sx * s * .30 * u * 1.05, -s * .12 * u);
          ctx.lineTo(sx * s * .30 * u * 1.05 + sx * s * .04, -s * .12 * u - s * .06);
          ctx.stroke();
        }
        ctx.restore();
      }
      ctx.save();
      ctx.translate(0, bob - s * .30); ctx.rotate(Math.sin(t * 1.6) * .12);
      const hd3 = () => {
        ctx.beginPath();
        ctx.moveTo(0, s * .16);
        ctx.bezierCurveTo(-s * .21, s * .04, -s * .19, -s * .14, 0, -s * .19);
        ctx.bezierCurveTo(s * .19, -s * .14, s * .21, s * .04, 0, s * .16);
        ctx.closePath();
      };
      shell(ctx, hd3, s, lite, ink, { gx: -s * .07, gy: -s * .10, gw: s * .07, gh: s * .035 });
      // râu
      ctx.strokeStyle = ink; ctx.lineWidth = s * .022; ctx.lineCap = 'round';
      for (const dd of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(dd * s * .07, -s * .16);
        ctx.quadraticCurveTo(dd * s * .22, -s * .34, dd * s * .14, -s * .46); ctx.stroke();
      }
      for (const dd of [-1, 1]) eye(ctx, dd * s * .105, -s * .04, E * .98, { iris: d.eye, irisDark: '#6b5200', ink, open, look: dd * .3 });
      for (const dd of [-1, 1]) brow(ctx, dd * s * .105, -s * .04, E * .98, dd, ink, wind);
      // miệng nhỏ
      ctx.strokeStyle = ink; ctx.lineWidth = s * .022; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-s * .04, s * .07); ctx.quadraticCurveTo(0, s * .11 + wind * s * .03, s * .04, s * .07); ctx.stroke();
      ctx.restore();

    } else if (d.id === 'bird') {
      // ── CỐC MỎ SẮT (trùm): chim nước, cổ chữ S, mỏ móc, chân màng ──────
      for (const sx of [-1, 1]) {
        limb(ctx, [sx * s * .09, bob + s * .28], [sx * s * .13, bob + s * .40],
             [sx * s * .15, bob + s * .50], s * .040, ink, shade(d.lite, -.10));
        ctx.beginPath();
        ctx.moveTo(sx * s * .15, bob + s * .50);
        ctx.lineTo(sx * s * .30, bob + s * .55);
        ctx.lineTo(sx * s * .02, bob + s * .55);
        ctx.closePath();
        ctx.fillStyle = d.beak || d.lite; ctx.fill();
        ctx.strokeStyle = ink; ctx.lineWidth = s * .028; ctx.lineJoin = 'round'; ctx.stroke();
      }
      const bd = () => { ctx.beginPath(); ctx.ellipse(-s * .06, bob + s * .14, s * .34, s * .27, -.16, 0, TAU); };
      shell(ctx, bd, s, body, ink, { lw: .05, gx: -s * .18, gy: bob, gw: s * .16, gh: s * .07 });
      ctx.save(); bd(); ctx.clip();
      // cánh xếp sát thân + mấy nét lông
      ctx.fillStyle = rgba(d.dark, .55);
      ctx.beginPath(); ctx.ellipse(-s * .02, bob + s * .19, s * .27, s * .15, -.28, 0, TAU); ctx.fill();
      ctx.strokeStyle = rgba(d.lite, .35); ctx.lineWidth = s * .018;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(-s * .22, bob + s * (.10 + i * .07));
        ctx.quadraticCurveTo(-s * .02, bob + s * (.16 + i * .07), s * .16, bob + s * (.12 + i * .07));
        ctx.stroke();
      }
      ctx.restore();
      // cổ chữ S — viền dày rồi phủ màu thân lên giữa
      ctx.lineCap = 'round';
      ctx.strokeStyle = ink; ctx.lineWidth = s * .17;
      ctx.beginPath();
      ctx.moveTo(s * .02, bob + s * .02);
      ctx.quadraticCurveTo(s * .30, bob - s * .10, s * .19, bob - s * (.34 + wind * .04));
      ctx.stroke();
      ctx.strokeStyle = body; ctx.lineWidth = s * .12; ctx.stroke();
      // đầu + mỏ móc
      const hd = () => { ctx.beginPath(); ctx.ellipse(s * .19, bob - s * (.42 + wind * .04), s * .15, s * .13, -.12, 0, TAU); };
      shell(ctx, hd, s, body, ink, { gloss: false });
      const by = bob - s * (.44 + wind * .04);
      ctx.fillStyle = d.beak || '#f5b027'; ctx.strokeStyle = ink; ctx.lineWidth = s * .03; ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(s * .30, by - s * .04);
      ctx.lineTo(s * .62, by + s * .01);
      ctx.quadraticCurveTo(s * .55, by + s * .11, s * .47, by + s * .09);
      ctx.lineTo(s * .30, by + s * .07);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = rgba(ink, .5); ctx.lineWidth = s * .02;
      ctx.beginPath(); ctx.moveTo(s * .32, by + s * .02); ctx.lineTo(s * .58, by + s * .04); ctx.stroke();
      eye(ctx, s * .21, by - s * .02, E * .82, { iris: d.eye, irisDark: '#5c1500', ink, open, look });
      brow(ctx, s * .21, by - s * .02, E * .82, 1, ink, wind);

    } else if (d.id === 'toad') {
      // ── CÓC GIÀ (trùm): thân bè, mắt lồi trên đỉnh, miệng rộng ──────────
      for (const sx of [-1, 1]) {
        limb(ctx, [sx * s * .30, bob + s * .22], [sx * s * .46, bob + s * .30],
             [sx * s * .40, bob + s * .46], s * .034, ink, shade(d.body, -.06));
      }
      const bd = () => { ctx.beginPath(); ctx.ellipse(0, bob + s * .16, s * .46, s * .33, 0, 0, TAU); };
      shell(ctx, bd, s, body, ink, { lw: .05, gx: -s * .16, gy: bob - s * .02, gw: s * .18, gh: s * .08 });
      ctx.save(); bd(); ctx.clip();
      // bụng sáng
      ctx.fillStyle = rgba(d.lite, .85);
      ctx.beginPath(); ctx.ellipse(0, bob + s * .34, s * .30, s * .17, 0, 0, TAU); ctx.fill();
      // mụn cóc có khối
      for (let i = 0; i < 9; i++) {
        const a = i * 2.1, px = Math.cos(a) * s * .30, py = bob + s * .06 + Math.sin(a) * s * .18;
        ctx.beginPath(); ctx.arc(px, py, s * .050, 0, TAU);
        ctx.fillStyle = rgba(d.dark, .34); ctx.fill();
        ctx.beginPath(); ctx.arc(px - s * .012, py - s * .012, s * .024, 0, TAU);
        ctx.fillStyle = rgba(d.lite, .40); ctx.fill();
      }
      ctx.restore();
      // miệng rộng
      ctx.strokeStyle = ink; ctx.lineWidth = s * .045; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-s * .28, bob + s * .10);
      ctx.quadraticCurveTo(0, bob + s * (.22 + wind * .14), s * .28, bob + s * .10); ctx.stroke();
      // hai mắt lồi trên đỉnh đầu
      for (const sx of [-1, 1]) {
        const bulge = () => { ctx.beginPath(); ctx.ellipse(sx * s * .19, bob - s * .20, s * .155, s * .145, 0, 0, TAU); };
        shell(ctx, bulge, s, lite, ink, { lw: .04, gloss: false });
        eye(ctx, sx * s * .19, bob - s * .21, E * 1.15, { iris: d.eye, irisDark: '#7a4a05', ink, open, look: sx * .2, squash: 1 });
      }
      for (const sx of [-1, 1]) brow(ctx, sx * s * .19, bob - s * .21, E * 1.15, sx, ink, wind);
      blush(ctx, -s * .34, bob + s * .06, s * .08, .28);
      blush(ctx,  s * .34, bob + s * .06, s * .08, .28);

    } else {
      // ── KIẾN LÍNH: ba đốt, đầu to, hàm kìm ──────────────────────────────
      for (let i = 0; i < 3; i++) for (const sx of [-1, 1]) {
        const sw = Math.sin(t * 4 + i * 1.3 + (sx > 0 ? 0 : 1.4)) * s * .03;
        limb(ctx, [s * (.02 - i * .10), bob + s * .06],
                  [s * (.16 - i * .12) + sx * 0, bob + s * (.22 + i * .03) + sw],
                  [s * (.26 - i * .16), bob + s * (.44 + i * .03)], legW, ink, shade(d.body, -.05));
      }
      const gaster = () => { ctx.beginPath(); ctx.ellipse(-s * .26, bob + s * .04, s * .22, s * .18, -.12, 0, TAU); };
      shell(ctx, gaster, s, body, ink, { gx: -s * .32, gy: bob - s * .04, gw: s * .10, gh: s * .05 });
      const mid = () => { ctx.beginPath(); ctx.ellipse(-s * .02, bob + s * .02, s * .14, s * .13, 0, 0, TAU); };
      shell(ctx, mid, s, shade(d.body, -.12), ink, { gloss: false });
      const hd = () => { ctx.beginPath(); ctx.ellipse(s * .22, bob - s * .04, s * .19, s * .17, 0, 0, TAU); };
      shell(ctx, hd, s, lite, ink, { gx: s * .15, gy: bob - s * .13, gw: s * .09, gh: s * .045 });
      // râu gấp khúc có núm
      ctx.strokeStyle = ink; ctx.lineWidth = s * .026; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (const dd of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(s * .28, bob - s * .12);
        ctx.lineTo(s * .44, bob - s * (.26 + dd * .05));
        ctx.lineTo(s * .56, bob - s * (.22 + dd * .12));
        ctx.stroke();
        ctx.beginPath(); ctx.arc(s * .56, bob - s * (.22 + dd * .12), s * .028, 0, TAU);
        ctx.fillStyle = ink; ctx.fill();
      }
      eye(ctx, s * .28, bob - s * .07, E * 1.05, { iris: d.eye, irisDark: '#2a1408', ink, open, look });
      eye(ctx, s * .12, bob - s * .06, E * .74, { iris: d.eye, irisDark: '#2a1408', ink, open, look });
      brow(ctx, s * .28, bob - s * .07, E * 1.05, 1, ink, wind);
      blush(ctx, s * .30, bob + s * .06, s * .055);
      // hàm kìm mở ra khi lấy đà
      ctx.strokeStyle = ink; ctx.lineWidth = s * .042; ctx.lineCap = 'round';
      for (const dd of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(s * .38, bob + dd * s * .04 + s * .04);
        ctx.quadraticCurveTo(s * .52, bob + dd * s * (.08 + wind * .08) + s * .05, s * .45, bob + dd * s * (.16 + wind * .05) + s * .05);
        ctx.stroke();
      }
    }

    // ── CỤC U + SAO BAY: dấu hiệu vừa ăn một búa vào đầu ────────────────
    if (this.bump > 0 && !this.dead) {
      const k = Math.min(1, this.bump / 1.6);
      const uy = bob - s * .40;
      ctx.save();
      // cục u đỏ, phồng lên rồi xẹp dần
      const ur = s * (.15 + .07 * k);          // to hẳn lên: trong màn con địch chỉ ~46px
      ctx.beginPath(); ctx.ellipse(s * .06, uy, ur, ur * .82, -.2, 0, TAU);
      ctx.fillStyle = '#e8384f'; ctx.fill();
      ctx.strokeStyle = '#5c0010'; ctx.lineWidth = s * .022; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(s * .03, uy - ur * .32, ur * .34, ur * .22, -.4, 0, TAU);
      ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fill();
      // sao bay vòng quanh
      for (let i = 0; i < 3; i++) {
        const a = this.t * 5 + i * (TAU / 3);
        const px = Math.cos(a) * s * .34, py = uy - s * .16 + Math.sin(a) * s * .10;
        ctx.save(); ctx.translate(px, py); ctx.rotate(a * .7); ctx.globalAlpha = k;
        ctx.beginPath();
        for (let q = 0; q < 10; q++) {
          const aa = -Math.PI / 2 + q * Math.PI / 5, rr = q % 2 ? s * .032 : s * .075;
          q ? ctx.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr) : ctx.moveTo(Math.cos(aa) * rr, Math.sin(aa) * rr);
        }
        ctx.closePath();
        ctx.fillStyle = '#ffd23f'; ctx.fill();
        ctx.strokeStyle = '#8a5c00'; ctx.lineWidth = s * .012; ctx.lineJoin = 'round'; ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    }

    // loé trắng khi ăn đòn
    if (this.hurt > .05) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = this.hurt * .35;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.ellipse(0, bob + s * .06, s * .52, s * .48, 0, 0, TAU); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }
}

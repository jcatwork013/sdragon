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
  toad: {
    id: 'toad', name: 'Cóc Già', name_en: 'Old Toad',
    hp: 880, dmg: 13, every: 10.0, atk: ATK.DRAIN, boss: true,
    body: '#6f7a3a', dark: '#2f3516', lite: '#b7c47a', eye: '#ffcf5a',
  },
};

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
  update(dt) {
    this.t += dt;
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
    if (this.hurt > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; }

    const ink = d.dark, body = this.hurt > .4 ? '#ff9a9a' : d.body;
    const line = (w = 1) => { ctx.strokeStyle = ink; ctx.lineWidth = s * .035 * w; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); };
    const bob = Math.sin(t * 2.4) * s * .03 + wind * s * .06;

    if (d.id === 'spider') {
      ctx.strokeStyle = ink; ctx.lineWidth = s * .045; ctx.lineCap = 'round';
      for (let i = 0; i < 4; i++) for (const sx of [-1, 1]) {
        const a = -.5 + i * .38, sw = Math.sin(t * 3 + i) * .12;
        ctx.beginPath();
        ctx.moveTo(sx * s * .12, bob);
        ctx.quadraticCurveTo(sx * s * (.42 + i * .04), bob - s * (.30 - i * .07) + sw * s,
                             sx * s * (.52 + i * .06), bob + s * (.20 + i * .08));
        ctx.stroke();
      }
      ctx.beginPath(); ctx.ellipse(0, bob + s * .06, s * .30, s * .26, 0, 0, TAU);
      ctx.fillStyle = body; ctx.fill(); line();
      ctx.beginPath(); ctx.ellipse(0, bob - s * .18, s * .17, s * .14, 0, 0, TAU);
      ctx.fillStyle = d.lite; ctx.fill(); line(.8);
      ctx.fillStyle = d.eye;
      for (const sx of [-1, 1]) for (const yy of [0, 1]) {
        ctx.beginPath();
        ctx.arc(sx * s * (.06 + yy * .04), bob - s * (.22 - yy * .05), s * .033, 0, TAU); ctx.fill();
      }
    } else if (d.id === 'wasp') {
      ctx.save(); ctx.globalAlpha = (1 - die) * .5;
      const fl = Math.sin(t * 26) * .5;
      for (const sx of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(sx * s * .22, bob - s * .22, s * .28, s * .12, sx * (.5 + fl), 0, TAU);
        ctx.fillStyle = '#dfe9ff'; ctx.fill();
      }
      ctx.restore();
      ctx.beginPath(); ctx.ellipse(0, bob + s * .08, s * .30, s * .22, -.15, 0, TAU);
      ctx.fillStyle = body; ctx.fill(); line();
      ctx.save();
      ctx.beginPath(); ctx.ellipse(0, bob + s * .08, s * .30, s * .22, -.15, 0, TAU); ctx.clip();
      ctx.fillStyle = ink;
      for (let i = -1; i <= 2; i++) ctx.fillRect(i * s * .14 - s * .04, bob - s * .2, s * .07, s * .6);
      ctx.restore();
      ctx.beginPath();
      ctx.moveTo(-s * .28, bob + s * .16); ctx.lineTo(-s * .50, bob + s * .30); ctx.lineTo(-s * .26, bob + s * .26);
      ctx.closePath(); ctx.fillStyle = ink; ctx.fill();
      ctx.beginPath(); ctx.arc(s * .26, bob - s * .06, s * .15, 0, TAU);
      ctx.fillStyle = d.lite; ctx.fill(); line(.8);
      ctx.fillStyle = d.eye;
      ctx.beginPath(); ctx.arc(s * .31, bob - s * .09, s * .05, 0, TAU); ctx.fill();
    } else if (d.id === 'mantis') {
      ctx.strokeStyle = ink; ctx.lineWidth = s * .05; ctx.lineCap = 'round';
      for (const sx of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(sx * s * .10, bob + s * .10);
        ctx.lineTo(sx * s * .30, bob + s * .34); ctx.lineTo(sx * s * .18, bob + s * .52); ctx.stroke();
      }
      ctx.beginPath();
      ctx.ellipse(0, bob + s * .16, s * .18, s * .34, 0, 0, TAU);
      ctx.fillStyle = body; ctx.fill(); line();
      // hai càng bổ — giơ cao khi sắp ra đòn
      for (const sx of [-1, 1]) {
        ctx.save();
        ctx.translate(sx * s * .16, bob - s * .10);
        ctx.rotate(sx * (-.5 - wind * .8));
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.quadraticCurveTo(sx * s * .30, -s * .10, sx * s * .40, -s * .30);
        ctx.lineWidth = s * .085; ctx.strokeStyle = d.lite; ctx.stroke();
        ctx.lineWidth = s * .03; ctx.strokeStyle = ink; ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(sx * s * .40, -s * .30); ctx.lineTo(sx * s * .30, -s * .48);
        ctx.lineWidth = s * .05; ctx.strokeStyle = d.lite; ctx.stroke();
        ctx.restore();
      }
      ctx.save();
      ctx.translate(0, bob - s * .28); ctx.rotate(Math.sin(t * 1.6) * .12);
      ctx.beginPath(); ctx.moveTo(0, s * .12);
      ctx.quadraticCurveTo(-s * .18, -s * .02, 0, -s * .16);
      ctx.quadraticCurveTo(s * .18, -s * .02, 0, s * .12);
      ctx.closePath(); ctx.fillStyle = d.lite; ctx.fill(); line(.8);
      ctx.fillStyle = d.eye;
      for (const sx of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sx * s * .085, -s * .05, s * .045, s * .06, 0, 0, TAU); ctx.fill(); }
      ctx.restore();
    } else if (d.id === 'toad') {
      ctx.beginPath(); ctx.ellipse(0, bob + s * .16, s * .46, s * .32, 0, 0, TAU);
      ctx.fillStyle = body; ctx.fill(); line();
      ctx.beginPath(); ctx.ellipse(0, bob + s * .28, s * .30, s * .16, 0, 0, TAU);
      ctx.fillStyle = d.lite; ctx.fill();
      ctx.fillStyle = rgba(d.dark, .35);
      for (let i = 0; i < 7; i++) {
        const a = i * 2.1;
        ctx.beginPath(); ctx.arc(Math.cos(a) * s * .30, bob + s * .04 + Math.sin(a) * s * .16, s * .05, 0, TAU); ctx.fill();
      }
      for (const sx of [-1, 1]) {
        ctx.beginPath(); ctx.ellipse(sx * s * .18, bob - s * .16, s * .14, s * .13, 0, 0, TAU);
        ctx.fillStyle = d.lite; ctx.fill(); line(.8);
        ctx.fillStyle = d.eye;
        ctx.beginPath(); ctx.arc(sx * s * .18, bob - s * .16, s * .075, 0, TAU); ctx.fill();
        ctx.fillStyle = '#1a0f04';
        ctx.beginPath(); ctx.ellipse(sx * s * .18, bob - s * .16, s * .026, s * .07, 0, 0, TAU); ctx.fill();
      }
      ctx.strokeStyle = ink; ctx.lineWidth = s * .04;
      ctx.beginPath(); ctx.moveTo(-s * .26, bob + s * .10);
      ctx.quadraticCurveTo(0, bob + s * (.20 + wind * .12), s * .26, bob + s * .10); ctx.stroke();
    } else {                                   // kiến lính
      ctx.strokeStyle = ink; ctx.lineWidth = s * .04; ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) for (const sx of [-1, 1]) {
        const sw = Math.sin(t * 4 + i * 1.3) * .1;
        ctx.beginPath();
        ctx.moveTo(sx * s * .06, bob + s * .04);
        ctx.quadraticCurveTo(sx * s * .30, bob + s * (.02 + i * .06) + sw * s, sx * s * .34, bob + s * (.34 + i * .05));
        ctx.stroke();
      }
      ctx.beginPath(); ctx.ellipse(-s * .22, bob + s * .06, s * .20, s * .16, 0, 0, TAU);
      ctx.fillStyle = body; ctx.fill(); line();
      ctx.beginPath(); ctx.ellipse(0, bob, s * .13, s * .12, 0, 0, TAU);
      ctx.fillStyle = shade(d.body, -.1); ctx.fill(); line(.8);
      ctx.beginPath(); ctx.ellipse(s * .22, bob - s * .04, s * .16, s * .14, 0, 0, TAU);
      ctx.fillStyle = d.lite; ctx.fill(); line(.8);
      ctx.strokeStyle = ink; ctx.lineWidth = s * .032;
      for (const dd of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(s * .28, bob - s * .12);
        ctx.quadraticCurveTo(s * .46, bob - s * (.26 + dd * .08), s * .54, bob - s * (.30 + dd * .14));
        ctx.stroke();
      }
      ctx.fillStyle = d.eye;
      ctx.beginPath(); ctx.arc(s * .28, bob - s * .06, s * .045, 0, TAU); ctx.fill();
      // hàm kìm
      ctx.strokeStyle = ink; ctx.lineWidth = s * .045;
      for (const dd of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(s * .36, bob + dd * s * .02);
        ctx.quadraticCurveTo(s * .48, bob + dd * s * (.06 + wind * .06), s * .44, bob + dd * s * .12);
        ctx.stroke();
      }
    }

    if (this.hurt > 0) ctx.restore();
    ctx.restore();
  }
}

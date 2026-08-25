// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  BẢN ĐỒ THẾ GIỚI — 10 mảnh trải trên một tấm bản đồ vẽ tay.              ║
// ║  Mảnh 1 đang mở (3 chương · 45 màn); 9 mảnh còn lại là bóng mờ dấu "?".   ║
// ╚══════════════════════════════════════════════════════════════════════════╝
import { TAU, clamp, lerp, ease, rgba, shade, strokeText, roundRect, mulberry32 } from '../core/util.js';
import { t, tx } from '../core/i18n.js';
import { Hit, textBtn, glassPanel, icon, pillLabel, C, FONT } from '../ui/widgets.js';
import { REGIONS, EPISODES, ALL_LEVELS } from '../data/levels.js';
import { bleed } from '../core/layout.js';

/** Vị trí 10 mảnh trên tấm bản đồ, theo tỉ lệ 0..1 — xếp thành đường vòng cung. */
const SPOTS = [
  [.12, .70], [.24, .50], [.36, .66], [.47, .42],
  [.57, .62], [.66, .38], [.75, .58], [.83, .36],
  [.90, .58], [.95, .34],
];

const REGION_ART = {
  r1:  { sky: ['#ffd69a', '#8fc6e8'], land: '#6fa454', glow: '#ffe66b' },
  r2:  { sky: ['#b9d4bd', '#527477'], land: '#476b51', glow: '#8fffd8' },
  r3:  { sky: ['#eef7ff', '#7898c9'], land: '#657486', glow: '#ffffff' },
  r4:  { sky: ['#41306c', '#171027'], land: '#274c45', glow: '#a9ffd9' },
  r5:  { sky: ['#ef9a54', '#4b2430'], land: '#542d24', glow: '#ffdc69' },
  r6:  { sky: ['#d9bd75', '#78935a'], land: '#75552e', glow: '#b9ed72' },
  r7:  { sky: ['#efc98c', '#a46058'], land: '#875d3e', glow: '#79d8e6' },
  r8:  { sky: ['#e9fbff', '#739dc8'], land: '#a8d5df', glow: '#ffffff' },
  r9:  { sky: ['#a78ac8', '#312641'], land: '#443d51', glow: '#d8b8ff' },
  r10: { sky: ['#fff1ad', '#76c9b0'], land: '#72b85d', glow: '#fff8c7' },
};

function wrap(ctx, text, maxW) {
  const lines = [], words = String(text || '').split(' '); let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(test).width > maxW) { lines.push(line); line = word; }
    else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

/** Bưu hoạ riêng của từng vùng — vẽ bằng code để cùng nét với toàn bộ game. */
function drawRegionArt(ctx, r, x, y, w, h, time) {
  const a = REGION_ART[r.id] || REGION_ART.r1;
  ctx.save(); roundRect(ctx, x, y, w, h, 22); ctx.clip();
  const sky = ctx.createLinearGradient(0, y, 0, y + h);
  sky.addColorStop(0, a.sky[0]); sky.addColorStop(1, a.sky[1]);
  ctx.fillStyle = sky; ctx.fillRect(x, y, w, h);
  const sunX = x + w * .78, sunY = y + h * .24;
  const sg = ctx.createRadialGradient(sunX, sunY, 2, sunX, sunY, h * .46);
  sg.addColorStop(0, rgba(a.glow, .66)); sg.addColorStop(1, rgba(a.glow, 0));
  ctx.fillStyle = sg; ctx.fillRect(x, y, w, h);

  // đồi xa và nền đất chung
  ctx.fillStyle = rgba(shade(a.land, .16), .72);
  ctx.beginPath(); ctx.moveTo(x, y + h * .70);
  ctx.quadraticCurveTo(x + w * .20, y + h * .43, x + w * .42, y + h * .67);
  ctx.quadraticCurveTo(x + w * .66, y + h * .39, x + w, y + h * .64);
  ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.closePath(); ctx.fill();
  ctx.fillStyle = a.land; ctx.fillRect(x, y + h * .72, w, h * .28);

  const cx = x + w * .5, ground = y + h * .78;
  ctx.strokeStyle = rgba(a.glow, .78); ctx.fillStyle = rgba(a.glow, .82); ctx.lineCap = 'round';
  if (r.id === 'r1') {
    // mái tổ cỏ và quả trứng nứt
    ctx.fillStyle = '#8a5b2e'; roundRect(ctx, cx - 64, ground - 48, 128, 54, 14); ctx.fill();
    ctx.fillStyle = '#d7a652'; ctx.beginPath(); ctx.moveTo(cx - 78, ground - 42); ctx.lineTo(cx, ground - 92); ctx.lineTo(cx + 78, ground - 42); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff1c6'; ctx.beginPath(); ctx.ellipse(cx + 92, ground - 16, 20, 27, -.15, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#7b5730'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx + 86, ground - 39); ctx.lineTo(cx + 95, ground - 29); ctx.lineTo(cx + 88, ground - 20); ctx.stroke();
  } else if (r.id === 'r2') {
    ctx.fillStyle = '#78aeb2'; ctx.beginPath(); ctx.ellipse(cx, ground - 2, 122, 24, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#334f3e'; ctx.lineWidth = 5;
    for (let i = -5; i <= 5; i++) { const px = cx + i * 21; ctx.beginPath(); ctx.moveTo(px, ground); ctx.quadraticCurveTo(px + i, ground - 48, px + Math.sin(i) * 7, ground - 88 + Math.abs(i) * 4); ctx.stroke(); }
    for (let i = 0; i < 8; i++) { const px = cx - 95 + i * 27, py = ground - 34 - (i % 3) * 12; ctx.fillStyle = i % 2 ? '#a9ffd9' : '#ffe36d'; ctx.globalAlpha = .45 + .4 * Math.sin(time * 2 + i); ctx.beginPath(); ctx.arc(px, py, 3, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
  } else if (r.id === 'r3') {
    ctx.fillStyle = '#536579';
    for (const [dx, hh] of [[-100, 72], [-25, 116], [62, 86]]) { ctx.beginPath(); ctx.moveTo(cx + dx - 64, ground); ctx.lineTo(cx + dx, ground - hh); ctx.lineTo(cx + dx + 70, ground); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = '#f4fbff'; ctx.beginPath(); ctx.moveTo(cx - 52, ground - 86); ctx.lineTo(cx - 25, ground - 116); ctx.lineTo(cx + 2, ground - 80); ctx.lineTo(cx - 23, ground - 92); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.78)'; ctx.lineWidth = 3;
    for (let i = 0; i < 4; i++) { const wy = y + 38 + i * 24; ctx.beginPath(); ctx.moveTo(x + 44 + ((time * 48 + i * 91) % (w - 130)), wy); ctx.lineTo(x + 118 + ((time * 48 + i * 91) % (w - 130)), wy - 5); ctx.stroke(); }
  } else if (r.id === 'r4') {
    for (let i = -3; i <= 3; i++) { const px = cx + i * 45, sc = 1 - Math.abs(i) * .08; ctx.strokeStyle = '#d9d1e8'; ctx.lineWidth = 9 * sc; ctx.beginPath(); ctx.moveTo(px, ground); ctx.lineTo(px, ground - 64 * sc); ctx.stroke(); ctx.fillStyle = i % 2 ? '#9c70ef' : '#58d2aa'; ctx.beginPath(); ctx.ellipse(px, ground - 65 * sc, 31 * sc, 17 * sc, 0, Math.PI, TAU); ctx.fill(); }
  } else if (r.id === 'r5') {
    ctx.fillStyle = '#2b2023'; roundRect(ctx, cx - 70, ground - 94, 140, 98, 18); ctx.fill();
    ctx.fillStyle = '#160f12'; ctx.beginPath(); ctx.arc(cx, ground - 20, 36, Math.PI, 0); ctx.fill();
    const fg = ctx.createRadialGradient(cx, ground - 17, 2, cx, ground - 17, 46); fg.addColorStop(0, '#fff1a0'); fg.addColorStop(.4, '#ff7a26'); fg.addColorStop(1, 'rgba(255,50,20,0)'); ctx.fillStyle = fg; ctx.fillRect(cx - 55, ground - 72, 110, 70);
    ctx.fillStyle = '#ffb33b'; for (let i = 0; i < 10; i++) { const px = cx - 86 + i * 19, py = ground - 38 - ((i * 17) % 55); ctx.globalAlpha = .35 + .4 * Math.sin(time * 4 + i); ctx.beginPath(); ctx.arc(px, py, 2.4, 0, TAU); ctx.fill(); } ctx.globalAlpha = 1;
  } else if (r.id === 'r6') {
    const mg = ctx.createLinearGradient(cx, ground - 130, cx, ground); mg.addColorStop(0, '#bd8a49'); mg.addColorStop(1, '#684522'); ctx.fillStyle = mg;
    ctx.beginPath(); ctx.moveTo(cx - 102, ground); ctx.quadraticCurveTo(cx - 64, ground - 45, cx - 42, ground - 112); ctx.quadraticCurveTo(cx, ground - 152, cx + 42, ground - 112); ctx.quadraticCurveTo(cx + 70, ground - 42, cx + 104, ground); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#291b12'; for (const [dx, dy] of [[0,-26],[-34,-64],[36,-83]]) { ctx.beginPath(); ctx.ellipse(cx + dx, ground + dy, 10, 15, 0, 0, TAU); ctx.fill(); }
  } else if (r.id === 'r7') {
    ctx.fillStyle = '#6f432f'; ctx.fillRect(x, ground - 6, w, h - (ground - y) + 6);
    ctx.strokeStyle = rgba(a.glow, .66); ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(x - 10, ground - 6); ctx.bezierCurveTo(cx - 90, ground - 62, cx + 44, ground + 18, x + w + 10, ground - 34); ctx.stroke();
    for (let i = 0; i < 9; i++) { ctx.fillStyle = i % 2 ? '#b98a62' : '#d2a779'; ctx.beginPath(); ctx.ellipse(x + 36 + i * (w - 72) / 8, ground - 3 + (i % 3) * 7, 13, 7, -.2, 0, TAU); ctx.fill(); }
  } else if (r.id === 'r8') {
    ctx.fillStyle = '#d9f6ff'; ctx.fillRect(x, ground - 5, w, h);
    for (let i = -3; i <= 3; i++) { const px = cx + i * 43, hh = 36 + ((i * i + 3) % 5) * 14; ctx.fillStyle = i % 2 ? '#9bd8eb' : '#c9f4ff'; ctx.beginPath(); ctx.moveTo(px - 18, ground); ctx.lineTo(px, ground - hh); ctx.lineTo(px + 22, ground); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#f7ffff'; ctx.lineWidth = 2; ctx.stroke(); }
  } else if (r.id === 'r9') {
    ctx.strokeStyle = '#2b2430'; ctx.lineWidth = 13; ctx.lineCap = 'round';
    for (let i = -3; i <= 3; i++) { const px = cx + i * 45, hh = 58 + (3 - Math.abs(i)) * 16; ctx.beginPath(); ctx.moveTo(px, ground); ctx.lineTo(px + Math.sin(i) * 8, ground - hh); ctx.stroke(); }
    ctx.strokeStyle = rgba(a.glow, .45); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, ground - 18, 92, Math.PI, TAU); ctx.stroke();
  } else {
    ctx.fillStyle = '#fff4ae'; ctx.beginPath(); ctx.arc(cx, ground - 70, 34, 0, TAU); ctx.fill();
    ctx.fillStyle = '#67b95c'; ctx.beginPath(); ctx.moveTo(x, ground); ctx.quadraticCurveTo(cx, ground - 58, x + w, ground); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.closePath(); ctx.fill();
    for (let i = 0; i < 28; i++) { const px = x + 18 + (i * 67 % Math.max(40, w - 36)), py = ground + (i * 23 % Math.max(20, h * .2)); ctx.fillStyle = ['#fff','#ff83b1','#ffe067'][i % 3]; ctx.beginPath(); ctx.arc(px, py, 2.4, 0, TAU); ctx.fill(); }
  }

  // bóng chú dế hướng về phía trước — sợi chỉ xuyên suốt 10 bưu hoạ.
  ctx.save(); ctx.translate(x + w * .18, ground - 12); ctx.strokeStyle = '#201725'; ctx.fillStyle = '#302339'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(0, 0, 12, 22, -.2, 0, TAU); ctx.fill();
  for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sx * 5, -14); ctx.quadraticCurveTo(sx * 17, -36, sx * 24, -42); ctx.stroke(); ctx.beginPath(); ctx.moveTo(sx * 7, 7); ctx.lineTo(sx * 28, 20); ctx.stroke(); }
  ctx.restore();
  ctx.restore();
  roundRect(ctx, x, y, w, h, 22); ctx.strokeStyle = rgba(a.glow, .72); ctx.lineWidth = 2.5; ctx.stroke();
}

export default {
  name: 'world',

  enter(G, arg = {}) {
    this.t = 0;
    this.after = arg.after || (() => G.go('map'));
    const hereLevel = ALL_LEVELS[clamp((G.save.unlocked || 1) - 1, 0, ALL_LEVELS.length - 1)];
    this.here = Math.max(0, REGIONS.findIndex(r => r.episodes?.includes(hereLevel?.ep)));
    this.sel = this.here;
    this.storyOpen = false;
    const R = mulberry32(4242);
    this.deco = Array.from({ length: 54 }, () => ({
      x: R(), y: .22 + R() * .72, s: .5 + R() * .9, k: (R() * 3) | 0, ph: R() * TAU,
    }));
    this.clouds = Array.from({ length: 6 }, () => ({ x: R(), y: .10 + R() * .22, s: .6 + R() * .8, v: .004 + R() * .01 }));
    this.flora = Array.from({ length: 82 }, (_, i) => ({
      x: R(), y: .28 + R() * .61, s: .45 + R() * .85, ph: R() * TAU,
      col: ['#dc5d77', '#e9b83c', '#7d72bd', '#f3eee0'][i % 4],
    }));
    this.wildlife = Array.from({ length: 15 }, (_, i) => ({
      x: R(), y: .22 + R() * .56, s: .55 + R() * .8, ph: R() * TAU,
      v: .010 + R() * .018, kind: i % 4 === 0 ? 'bee' : 'butterfly',
      col: ['#e85284', '#7964cf', '#2cae91', '#e89d24'][i % 4],
    }));
    const closeStory = () => this.setStory(false);
    const sw = Math.min(760, G.W - 80), sh = Math.min(500, G.H - 100);
    const sx = (G.W - sw) / 2, sy = (G.H - sh) / 2;
    this.hits = [
      new Hit('close', G.W / 2 - 120, G.H - 84, 240, 60, { act: () => { G.sfx('button'); this.after(); } }),
      new Hit('storyClose', sx + sw / 2 - 92, sy + sh - 62, 184, 46,
        { act: () => { G.sfx('button'); closeStory(); }, hidden: true }),
      ...REGIONS.map((r, i) => new Hit('rg' + i, 0, 0, 84, 84, { circle: true, act: () => this.pick(G, i) })),
    ];
    G.music('trail');
  },

  setStory(open) {
    this.storyOpen = open;
    for (const h of this.hits) {
      if (h.id === 'storyClose') h.hidden = !open;
      else h.hidden = open;
    }
  },

  pick(G, i) {
    this.sel = i;
    this.setStory(true);
    G.sfx(REGIONS[i].open ? 'select' : 'button');
  },

  update(G, dt) {
    this.t += dt;
    for (const c of this.clouds) { c.x += c.v * dt; if (c.x > 1.2) c.x = -.2; }
    for (const f of this.wildlife) {
      f.x += f.v * dt;
      f.y += Math.sin(this.t * 2 + f.ph) * .0018 * dt;
      if (f.x > 1.08) { f.x = -.08; f.y = .22 + Math.random() * .56; }
    }
    // cập nhật vùng bấm theo cỡ màn hiện tại
    REGIONS.forEach((r, i) => {
      const h = this.hits.find(x => x.id === 'rg' + i); if (!h) return;
      const [fx, fy] = SPOTS[i];
      h.x = fx * G.W - 42; h.y = fy * G.H - 42;
    });
  },
  up() {},
  key(G, e) {
    if (e.key !== 'Escape') return;
    if (this.storyOpen) { G.sfx('button'); this.setStory(false); }
    else this.after();
  },

  draw(G, ctx) {
    const { W, H } = G, T = this.t;

    // ── nền: tấm bản đồ da thuộc ──────────────────────────────────────────
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#1a1230'); bg.addColorStop(1, '#0c0819');
    ctx.fillStyle = bg; ctx.fillRect(...bleed(G));

    const M = 26;
    ctx.save();
    roundRect(ctx, M, 76, W - M * 2, H - 176, 22); ctx.clip();
    const pg = ctx.createLinearGradient(0, 76, W, H - 100);
    pg.addColorStop(0, '#e8d5aa'); pg.addColorStop(.5, '#dcc596'); pg.addColorStop(1, '#c9ac78');
    ctx.fillStyle = pg; ctx.fillRect(M, 76, W - M * 2, H - 176);

    // biển ở dưới, đất ở trên — hai mảng lớn cho ra dáng bản đồ
    ctx.fillStyle = '#9fc4c9';
    ctx.beginPath();
    ctx.moveTo(M, H - 100);
    for (let x = M; x <= W - M; x += 40)
      ctx.lineTo(x, H - 150 + Math.sin(x * .011 + 1.2) * 16);
    ctx.lineTo(W - M, H - 100); ctx.closePath(); ctx.fill();
    // sóng biển kiểu bản đồ cổ
    ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (let r0 = 0; r0 < 3; r0++)
      for (let x = M + 30 + (r0 % 2) * 34; x < W - M - 30; x += 68) {
        const y = H - 132 + r0 * 17;
        ctx.beginPath();
        ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 9, y - 6, x + 18, y);
        ctx.quadraticCurveTo(x + 27, y + 6, x + 36, y);
        ctx.stroke();
      }

    // ── NƯỚC TRONG ĐẤT LIỀN ───────────────────────────────────────────
    // Có đất thì phải có nước. Bản đồ chỉ toàn đồi núi nhìn khô khốc, mà thêm
    // hồ với sông vào là mắt tự đọc ra "đây là một vùng có người ở".
    const LX = M, LY = 76, LW = W - M * 2, LH = H - 176;
    const wx = (u) => LX + u * LW, wy = (v) => LY + v * LH;

    // sông: chảy từ góc trên-phải xuống hoà vào biển
    const river = (wd, col) => {
      ctx.beginPath();
      ctx.moveTo(wx(.88), wy(-.02));
      ctx.bezierCurveTo(wx(.80), wy(.24), wx(.72), wy(.34), wx(.62), wy(.52));
      ctx.bezierCurveTo(wx(.55), wy(.66), wx(.52), wy(.78), wx(.50), wy(1.02));
      ctx.strokeStyle = col; ctx.lineWidth = wd; ctx.lineCap = 'round'; ctx.stroke();
    };
    river(19, 'rgba(120,150,150,.35)');            // bờ sông
    river(13, '#9fc4c9');
    river(5,  'rgba(255,255,255,.35)');

    // hồ và ao — vị trí cố định, kèm bãi cạn sáng quanh mép
    const LAKES = [[.17, .34, .085, .052], [.40, .22, .055, .034],
                   [.74, .66, .070, .044], [.30, .70, .048, .030]];
    for (const [u, v, rw, rh] of LAKES) {
      const cx0 = wx(u), cy0 = wy(v), a0 = LW * rw, b0 = LH * rh;
      ctx.beginPath(); ctx.ellipse(cx0, cy0, a0 * 1.12, b0 * 1.16, 0, 0, TAU);
      ctx.fillStyle = 'rgba(198,214,180,.55)'; ctx.fill();          // bãi cạn
      ctx.beginPath(); ctx.ellipse(cx0, cy0, a0, b0, 0, 0, TAU);
      const wg = ctx.createRadialGradient(cx0 - a0 * .3, cy0 - b0 * .3, b0 * .1, cx0, cy0, a0);
      wg.addColorStop(0, '#bfe0e2'); wg.addColorStop(1, '#7fb0b6');
      ctx.fillStyle = wg; ctx.fill();
      ctx.strokeStyle = 'rgba(90,120,120,.5)'; ctx.lineWidth = 1.6; ctx.stroke();
      // gợn nước lăn tăn — chạy chậm cho khỏi rối mắt
      ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const yy = cy0 + (i - 1) * b0 * .42 + Math.sin(T * .8 + i) * 1.5;
        const ww = a0 * (.52 - Math.abs(i - 1) * .16);
        ctx.beginPath();
        ctx.moveTo(cx0 - ww, yy);
        ctx.quadraticCurveTo(cx0 - ww * .5, yy - 3, cx0, yy);
        ctx.quadraticCurveTo(cx0 + ww * .5, yy + 3, cx0 + ww, yy);
        ctx.stroke();
      }
    }

    // dãy núi vẽ nét kiểu bản đồ cổ
    ctx.strokeStyle = 'rgba(90,70,40,.55)'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    for (let i = 0; i < 22; i++) {
      const x = M + 40 + i * ((W - M * 2 - 80) / 21), y = 150 + (i % 3) * 26 + Math.sin(i) * 14;
      const w = 26 + (i % 4) * 6;
      ctx.beginPath();
      ctx.moveTo(x - w, y + 14); ctx.lineTo(x, y - 16); ctx.lineTo(x + w, y + 14);
      ctx.stroke();
    }
    // rừng cây
    for (const d of this.deco) {
      const x = M + d.x * (W - M * 2), y = 76 + d.y * (H - 176);
      if (y > H - 165) continue;
      ctx.save(); ctx.globalAlpha = .5;
      ctx.strokeStyle = 'rgba(70,90,50,.85)'; ctx.lineWidth = 2;
      if (d.k === 0) {
        ctx.beginPath(); ctx.arc(x, y, 6 * d.s, 0, TAU); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x, y + 6 * d.s); ctx.lineTo(x, y + 11 * d.s); ctx.stroke();
      } else if (d.k === 1) {
        ctx.beginPath();
        ctx.moveTo(x - 6 * d.s, y + 7 * d.s); ctx.lineTo(x, y - 8 * d.s); ctx.lineTo(x + 6 * d.s, y + 7 * d.s);
        ctx.closePath(); ctx.stroke();
      } else {
        ctx.beginPath(); ctx.moveTo(x - 7 * d.s, y); ctx.quadraticCurveTo(x, y - 5 * d.s, x + 7 * d.s, y); ctx.stroke();
      }
      ctx.restore();
    }

    // hoa dại tô điểm tấm bản đồ: nét nhỏ như mực màu, dày ở vùng đồng cỏ và
    // thưa gần biển để đường đi vẫn đọc rõ.
    for (let i = 0; i < this.flora.length; i++) {
      const f = this.flora[i], x = M + f.x * (W - M * 2), y = 76 + f.y * (H - 176);
      if (y > H - 158) continue;
      ctx.save(); ctx.globalAlpha = .46;
      ctx.strokeStyle = '#66805a'; ctx.lineWidth = 1.2 * f.s;
      ctx.beginPath(); ctx.moveTo(x, y + 5 * f.s); ctx.lineTo(x, y - 3 * f.s); ctx.stroke();
      ctx.fillStyle = f.col;
      for (let p = 0; p < 4; p++) {
        const a = p / 4 * TAU + f.ph;
        ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * 2.8 * f.s, y - 5 * f.s + Math.sin(a) * 2.8 * f.s,
                                    2.1 * f.s, 1.15 * f.s, a, 0, TAU); ctx.fill();
      }
      ctx.fillStyle = '#7a5525'; ctx.beginPath(); ctx.arc(x, y - 5 * f.s, 1.1 * f.s, 0, TAU); ctx.fill();
      ctx.restore();
    }
    // mây trôi
    for (const c of this.clouds) {
      const x = M + c.x * (W - M * 2), y = 76 + c.y * (H - 176);
      ctx.save(); ctx.globalAlpha = .35; ctx.fillStyle = '#fff';
      for (const [dx, dy, r] of [[-1, 0, .9], [0, -.4, 1.2], [1, 0, .8]]) {
        ctx.beginPath(); ctx.arc(x + dx * 26 * c.s, y + dy * 14 * c.s, r * 18 * c.s, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }

    // ong và bướm bay xuyên các vùng: chuyển động rất chậm như hình vẽ trên
    // bản đồ sống dậy, không giống vật thể gameplay.
    for (const f of this.wildlife) {
      const x = M + f.x * (W - M * 2), y = 76 + f.y * (H - 176) + Math.sin(T * 2.5 + f.ph) * 7;
      const flap = .25 + .75 * Math.abs(Math.sin(T * 10 + f.ph));
      ctx.save(); ctx.translate(x, y); ctx.scale(f.s, f.s); ctx.globalAlpha = .76;
      if (f.kind === 'bee') {
        ctx.fillStyle = 'rgba(238,251,255,.72)';
        ctx.beginPath(); ctx.ellipse(-3, -4, 5.5, 2.8 * flap, -.5, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(4, -4, 5.5, 2.8 * flap, .5, 0, TAU); ctx.fill();
        ctx.fillStyle = '#eeb62e'; ctx.strokeStyle = '#5d4218'; ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.ellipse(0, 0, 7, 4, 0, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#5d4218'; ctx.lineWidth = 1.6;
        for (const bx of [-2, 2]) { ctx.beginPath(); ctx.moveTo(bx, -3); ctx.lineTo(bx, 3); ctx.stroke(); }
      } else {
        ctx.fillStyle = f.col; ctx.strokeStyle = shade(f.col, -.42); ctx.lineWidth = 1;
        for (const sx of [-1, 1]) {
          ctx.beginPath(); ctx.ellipse(sx * 4.5, -1, 5.2, 6 * flap, sx * .38, 0, TAU); ctx.fill(); ctx.stroke();
        }
        ctx.fillStyle = '#4b3725'; ctx.beginPath(); ctx.ellipse(0, 1, 1.3, 5, 0, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }

    // ── lộ trình nối 10 mảnh ─────────────────────────────────────────────
    ctx.save();
    ctx.strokeStyle = 'rgba(110,80,40,.55)'; ctx.lineWidth = 5;
    ctx.setLineDash([11, 10]); ctx.lineDashOffset = -T * 18; ctx.lineCap = 'round';
    // đường mòn mượt: nối qua TRUNG ĐIỂM nên không bị gãy khúc hay vồng lên
    const P = SPOTS.map(([fx, fy]) => [fx * W, fy * H]);
    ctx.beginPath();
    ctx.moveTo(P[0][0], P[0][1]);
    for (let i = 1; i < P.length - 1; i++) {
      const mx = (P[i][0] + P[i + 1][0]) / 2, my = (P[i][1] + P[i + 1][1]) / 2;
      ctx.quadraticCurveTo(P[i][0], P[i][1], mx, my);
    }
    ctx.lineTo(P[P.length - 1][0], P[P.length - 1][1]);
    ctx.strokeStyle = 'rgba(120,88,44,.30)'; ctx.lineWidth = 11; ctx.setLineDash([]);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(96,68,32,.75)'; ctx.lineWidth = 4.5;
    ctx.setLineDash([11, 10]); ctx.lineDashOffset = -T * 18;
    ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
    ctx.restore();

    // ── các mảnh ─────────────────────────────────────────────────────────
    REGIONS.forEach((r, i) => {
      const [fx, fy] = SPOTS[i];
      const x = fx * W, y = fy * H;
      const on = this.sel === i;
      const pulse = r.open ? 1 + Math.sin(T * 3) * .04 : 1;
      ctx.save();
      ctx.translate(x, y); ctx.scale(pulse, pulse);

      ctx.fillStyle = 'rgba(60,44,20,.34)';
      ctx.beginPath(); ctx.ellipse(0, 34, 34, 10, 0, 0, TAU); ctx.fill();

      ctx.beginPath(); ctx.arc(0, 0, 34, 0, TAU);
      if (r.open) {
        const g = ctx.createLinearGradient(0, -34, 0, 34);
        g.addColorStop(0, shade(r.hue, .34)); g.addColorStop(1, shade(r.hue, -.24));
        ctx.fillStyle = g; ctx.fill();
        ctx.strokeStyle = '#5d4218'; ctx.lineWidth = 5; ctx.stroke();
        ctx.strokeStyle = '#ffe066'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(0, 0, 29, 0, TAU); ctx.stroke();
        strokeText(ctx, String(i + 1), 0, 2,
          { font: FONT.disp(28), fill: '#fff', stroke: '#3d2a08', lw: 5, baseline: 'middle' });
      } else {
        const g = ctx.createLinearGradient(0, -34, 0, 34);
        g.addColorStop(0, '#6b5a3e'); g.addColorStop(1, '#3f3526');
        ctx.fillStyle = g; ctx.fill();
        ctx.strokeStyle = '#2f2718'; ctx.lineWidth = 5; ctx.stroke();
        // bóng địa danh mờ bên trong — gợi "có gì đó ở đây"
        ctx.save();
        ctx.beginPath(); ctx.arc(0, 0, 29, 0, TAU); ctx.clip();
        ctx.globalAlpha = .30; ctx.fillStyle = shade(r.hue, -.1);
        ctx.beginPath();
        ctx.moveTo(-24, 20); ctx.lineTo(-8, -8); ctx.lineTo(4, 8);
        ctx.lineTo(16, -14); ctx.lineTo(28, 20); ctx.closePath(); ctx.fill();
        ctx.restore();
        ctx.save(); ctx.translate(0, -2); ctx.globalAlpha = .9; icon.lock(ctx, 34); ctx.restore();
        strokeText(ctx, '?', 0, 21,
          { font: FONT.disp(15), fill: '#d8c8a4', stroke: '#2f2718', lw: 3, baseline: 'middle' });
      }
      if (r.open) {                                   // biển tên nhỏ dưới chân
        ctx.save();
        ctx.font = FONT.disp(15);
        const nw = ctx.measureText(tx(r, 'name')).width + 22;
        roundRect(ctx, -nw / 2, 40, nw, 24, 12);
        ctx.fillStyle = 'rgba(48,34,14,.9)'; ctx.fill();
        ctx.strokeStyle = 'rgba(255,224,102,.6)'; ctx.lineWidth = 1.6; ctx.stroke();
        strokeText(ctx, tx(r, 'name'), 0, 52,
          { font: FONT.disp(15), fill: '#ffe066', stroke: null, lw: 0, baseline: 'middle', shadow: null });
        ctx.restore();
      }
      if (on) {
        ctx.strokeStyle = `rgba(255,224,102,${.55 + .35 * Math.sin(T * 6)})`;
        ctx.lineWidth = 3.5; ctx.setLineDash([9, 7]); ctx.lineDashOffset = -T * 32;
        ctx.beginPath(); ctx.arc(0, 0, 44, 0, TAU); ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.restore();
    });

    // Chỉ dẫn tiến độ thật: lấy vùng chứa màn cao nhất đã mở, không mặc định
    // mảnh 1. Mũi ghim nảy nhẹ để nhìn thấy ngay cả trên vùng màu vàng.
    {
      const [fx, fy] = SPOTS[this.here] || SPOTS[0];
      const label = t('youAreHere');
      ctx.save();
      ctx.font = FONT.ui(12, 800);
      const labelW = clamp(ctx.measureText(label).width + 28, 122, W - M * 2 - 16);
      ctx.restore();
      const x = clamp(fx * W, M + labelW / 2 + 6, W - M - labelW / 2 - 6);
      const y = fy * H - 58 - Math.abs(Math.sin(T * 3.4)) * 5;
      ctx.save(); ctx.translate(x, y);
      ctx.shadowColor = 'rgba(50,25,0,.38)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
      roundRect(ctx, -labelW / 2, -31, labelW, 27, 13.5); ctx.fillStyle = '#fff7d0'; ctx.fill();
      ctx.shadowColor = 'transparent'; ctx.strokeStyle = '#7a4d16'; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-9, -4); ctx.lineTo(0, 11); ctx.lineTo(9, -4); ctx.closePath();
      ctx.fillStyle = '#fff7d0'; ctx.fill(); ctx.stroke();
      strokeText(ctx, label, 0, -17,
        { font: FONT.ui(12, 800), fill: '#7a3e12', stroke: null, lw: 0, baseline: 'middle', shadow: null });
      ctx.restore();
    }

    // ── la bàn hoa gió ở góc bản đồ ──────────────────────────────────────
    ctx.save();
    ctx.translate(W - 92, 152);
    ctx.globalAlpha = .8;
    ctx.strokeStyle = 'rgba(96,68,32,.8)'; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.arc(0, 0, 30, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 24, 0, TAU); ctx.stroke();
    for (let i = 0; i < 4; i++) {
      ctx.save(); ctx.rotate(i * Math.PI / 2 + T * .12);
      ctx.beginPath();
      ctx.moveTo(0, -28); ctx.lineTo(6, 0); ctx.lineTo(0, 6); ctx.lineTo(-6, 0);
      ctx.closePath();
      ctx.fillStyle = i === 0 ? '#c8442f' : '#8a6a3a'; ctx.fill();
      ctx.strokeStyle = 'rgba(60,40,16,.9)'; ctx.lineWidth = 1.6; ctx.stroke();
      ctx.restore();
    }
    strokeText(ctx, 'B', 0, -40,
      { font: FONT.disp(14), fill: '#7a5a2a', stroke: null, lw: 0, baseline: 'middle', shadow: null });
    ctx.restore();

    // viền tối quanh mép cho ra chất giấy cũ
    ctx.save();
    roundRect(ctx, M, 76, W - M * 2, H - 176, 22); ctx.clip();
    const vg = ctx.createRadialGradient(W / 2, (H - 100) / 2 + 40, H * .16, W / 2, (H - 100) / 2 + 40, W * .62);
    vg.addColorStop(0, 'rgba(60,40,14,0)'); vg.addColorStop(1, 'rgba(60,40,14,.42)');
    ctx.fillStyle = vg; ctx.fillRect(M, 76, W - M * 2, H - 176);
    ctx.restore();
    roundRect(ctx, M, 76, W - M * 2, H - 176, 22);
    ctx.strokeStyle = '#5d4218'; ctx.lineWidth = 5; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,236,190,.45)'; ctx.lineWidth = 2;
    roundRect(ctx, M + 5, 81, W - M * 2 - 10, H - 186, 18); ctx.stroke();

    // ── cartouche tiêu đề ────────────────────────────────────────────────
    ctx.save();
    ctx.font = FONT.disp(34);
    const tw = ctx.measureText(t('world')).width + 96;
    roundRect(ctx, W / 2 - tw / 2, 18, tw, 52, 14);
    const cg = ctx.createLinearGradient(0, 18, 0, 70);
    cg.addColorStop(0, '#e8d5aa'); cg.addColorStop(1, '#c9a86e');
    ctx.fillStyle = cg; ctx.fill();
    ctx.strokeStyle = '#5d4218'; ctx.lineWidth = 4; ctx.stroke();
    for (const sx of [-1, 1]) {                       // hai đầu cuộn giấy
      ctx.beginPath();
      ctx.ellipse(W / 2 + sx * (tw / 2 + 8), 44, 10, 26, 0, 0, TAU);
      ctx.fillStyle = '#b8934f'; ctx.fill();
      ctx.strokeStyle = '#5d4218'; ctx.lineWidth = 3; ctx.stroke();
    }
    ctx.restore();
    strokeText(ctx, t('world'), W / 2, 45,
      { font: FONT.disp(30), fill: '#4a3210', stroke: null, lw: 0, baseline: 'middle', shadow: null });

    const r = REGIONS[this.sel];
    // Mảnh khoá cần chỗ cho hai dòng đồn thổi, nên khung cao hơn mảnh đã mở.
    const pw = 560, px = W / 2 - pw / 2, ph = r.open ? 72 : 104, py = H - 168 - (r.open ? 0 : 32);
    glassPanel(ctx, px, py, pw, ph, 18);
    if (r.open) {
      const eps = EPISODES.filter(e => r.episodes?.includes(e.id));
      const lv = ALL_LEVELS.filter(l => r.episodes?.includes(l.ep));
      const stars = lv.reduce((a, l) => a + (G.save.stars[l.id] || 0), 0);
      strokeText(ctx, `${t('region', { n: this.sel + 1 })} · ${tx(r, 'name')}`, W / 2, py + 26,
        { font: FONT.disp(22), fill: '#ffe066', stroke: '#3a1d6e', lw: 5, baseline: 'middle' });
      strokeText(ctx, `${eps.length} ${t('episode').toLowerCase()} · ${lv.length} ${t('level').toLowerCase()} · ${stars}/${lv.length * 3} ★`,
        W / 2, py + 52,
        { font: FONT.ui(14, 700), fill: '#e6dcff', stroke: null, lw: 0, baseline: 'middle', shadow: null });
    } else {
      // Có tên và có chuyện — người chơi biết mình đang chờ cái gì.
      strokeText(ctx, `${t('region', { n: this.sel + 1 })} · ${tx(r, 'name')}`, W / 2, py + 26,
        { font: FONT.disp(22), fill: '#ffd8a8', stroke: '#3a1d00', lw: 5, baseline: 'middle' });
      // mảnh ngay sau mảnh đang mở thì gắn nhãn "sắp tới" cho có cái mà ngóng
      const nextIdx = REGIONS.findIndex(x => !x.open);
      if (this.sel === nextIdx)
        pillLabel(ctx, W / 2, py - 10, t('regionNext'), '#ffb648', '#4a2c00');
      const words = tx(r, 'teaser').split(' ');
      const lines = [];
      ctx.font = FONT.ui(14, 600);
      let line = '';
      for (const wd of words) {
        const test = line ? line + ' ' + wd : wd;
        if (ctx.measureText(test).width > pw - 44 && line) { lines.push(line); line = wd; } else line = test;
      }
      if (line) lines.push(line);
      lines.slice(0, 3).forEach((ln, i) =>
        strokeText(ctx, ln, W / 2, py + 54 + i * 20,
          { font: FONT.ui(14, 600), fill: '#e6dcff', stroke: null, lw: 0, baseline: 'middle', shadow: null }));
    }

    const cl = this.hits.find(h => h.id === 'close');
    textBtn(ctx, cl.x, cl.y, cl.w, cl.h, t('back'),
      { press: cl.press, hover: cl.hover, font: FONT.disp(24) });

    if (this.storyOpen) this.drawStoryPanel(G, ctx);
  },

  /** Nhật ký vùng: bưu hoạ + một đoạn truyện nguyên bản, mở được cả vùng khoá. */
  drawStoryPanel(G, ctx) {
    const r = REGIONS[this.sel], W = G.W, H = G.H;
    const w = Math.min(760, W - 80), h = Math.min(500, H - 100);
    const x = (W - w) / 2, y = (H - h) / 2;
    ctx.save();
    ctx.fillStyle = 'rgba(8,4,18,.74)'; ctx.fillRect(...bleed(G));
    ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 34; ctx.shadowOffsetY = 12;
    glassPanel(ctx, x, y, w, h, 28, { top: 'rgba(35,22,58,.98)', bot: 'rgba(13,8,27,.99)', rim: rgba(r.hue, .82) });
    ctx.shadowColor = 'transparent';

    pillLabel(ctx, x + 82, y + 30, t('regionJournal'), r.open ? '#73d58a' : '#d69b55', '#311722');
    if (!r.open) pillLabel(ctx, x + w - 78, y + 30, t('regionPreview'), '#8a769f', '#24182e');
    strokeText(ctx, `${this.sel + 1} · ${tx(r, 'name')}`, x + w / 2, y + 51,
      { font: FONT.disp(28), fill: '#ffe37a', stroke: '#3a1c00', lw: 6, baseline: 'middle' });

    drawRegionArt(ctx, r, x + 22, y + 76, w - 44, 210, this.t);

    ctx.font = FONT.ui(14, 800);
    const hook = wrap(ctx, tx(r, 'teaser'), w - 70).slice(0, 2);
    hook.forEach((ln, i) => strokeText(ctx, ln, x + w / 2, y + 310 + i * 19,
      { font: FONT.ui(14, 800), fill: rgba(r.hue, 1), stroke: '#180d25', lw: 3, baseline: 'middle' }));

    ctx.font = FONT.ui(15, 600);
    const lines = wrap(ctx, tx(r, 'story'), w - 68).slice(0, 4);
    lines.forEach((ln, i) => strokeText(ctx, ln, x + w / 2, y + 351 + i * 22,
      { font: FONT.ui(15, 600), fill: '#eee7ff', stroke: null, lw: 0, baseline: 'middle', shadow: null }));

    const close = this.hits.find(h2 => h2.id === 'storyClose');
    if (close) textBtn(ctx, close.x, close.y, close.w, close.h, t('close'),
      { press: close.press, hover: close.hover, font: FONT.disp(20), colour: '#665385', dark: '#352549', lite: '#a58bc9' });
    ctx.restore();
  },
};

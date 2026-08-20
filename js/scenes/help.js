// ── Cách chơi — demo động chạy bằng CHÍNH engine match-3 thật ───────────────
import { TAU, clamp, lerp, ease, rgba, strokeText, roundRect } from '../core/util.js';
import { t, tx } from '../core/i18n.js';
import { Hit, textBtn, roundBtn, card, glassPanel, statBar, icon, C, FONT } from '../ui/widgets.js';
import { Board } from '../game/board.js';
import { GEMS, SP, drawGem } from '../game/gems.js';
import { ORB, drawOrb, buildOrbSprites } from '../game/bubble.js';
import { FX } from '../game/fx.js';
import { bleed } from '../core/layout.js';

const PAGES = 3;
const DCELL = 58, DCOLS = 5, DROWS = 3;
const DX = 96, DY = 214;
// Bố cục có chủ đích: kéo viên ở (cột 2, hàng 0) xuống → hàng 1 thành ba viên
// Lam Ngọc thẳng hàng. Người xem thấy ngay "đổi chỗ để tạo bộ 3".
const LAYOUT = [
  [1, 2, 0, 4, 5],
  [0, 0, 3, 1, 2],
  [4, 5, 1, 3, 0],
];

const HELP_EXTRA = {};

export default {
  name: 'help',
  enter(G, from = 'title') {
    this.t = 0; this.page = 0; this.back = from;
    this.fx = new FX();
    buildOrbSprites();
    this.demo = new Board({ cols: DCOLS, rows: DROWS, size: DCELL, colours: 6 });
    this.demo.on.match = ({ cells }) => {
      for (const i of cells) {
        const c = this.demo.grid[i]; if (!c) continue;
        this.fx.burst(DX + c.px + DCELL / 2, DY + c.py + DCELL / 2, GEMS[c.type], 10, .8);
      }
      this.fx.float(DX + DCOLS * DCELL / 2, DY + DCELL, '+120', { size: 26, fill: '#fff6c4', stroke: '#6b3a00' });
    };
    this.resetDemo();
    this.hits = [
      new Hit('prev', 40, 640, 56, 54, { act: () => { this.page = (this.page + PAGES - 1) % PAGES; G.sfx('button'); } }),
      new Hit('next', G.W - 96, 640, 56, 54, { act: () => { this.page = (this.page + 1) % PAGES; G.sfx('button'); } }),
      new Hit('ok', G.W / 2 - 110, 638, 220, 58, { act: () => { G.sfx('button'); G.go(this.back); } }),
    ];
  },

  resetDemo() {
    for (let r = 0; r < DROWS; r++)
      for (let c = 0; c < DCOLS; c++) {
        const cell = this.demo.get(c, r);
        cell.type = LAYOUT[r][c]; cell.sp = SP.NONE;
        cell.px = c * DCELL; cell.py = r * DCELL;
        cell.tx = cell.px; cell.ty = cell.py;
        cell.scale = 1; cell.alpha = 1; cell.rot = 0; cell.pop = -1; cell.vy = 0; cell.squash = 0;
      }
    this.demo.phase = 'idle'; this.demo.sel = null; this.demo.hint = null;
    this.stage = 'wait'; this.stageT = 0;
  },

  update(G, dt) {
    this.t += dt;
    this.stageT += dt;
    this.fx.update(dt);
    this.demo.update(dt);

    if (this.stage === 'wait' && this.stageT > 1.5) {
      this.demo.trySwap(2, 0, 2, 1);          // engine thật xử lý phần còn lại
      this.stage = 'run'; this.stageT = 0;
    } else if (this.stage === 'run' && this.demo.phase === 'idle' && this.stageT > 2.4) {
      this.stage = 'hold'; this.stageT = 0;
    } else if (this.stage === 'hold' && this.stageT > 1.4) {
      this.resetDemo();
    }
  },

  draw(G, ctx) {
    const { W, H } = G;
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#221545'); sky.addColorStop(1, '#0e0822');
    ctx.fillStyle = sky; ctx.fillRect(...bleed(G));

    strokeText(ctx, t('howTo'), W / 2, 54,
      { font: FONT.disp(40), fill: '#fff', stroke: '#3a1d6e', lw: 8, baseline: 'middle' });

    if (this.page === 0) this.drawPage1(G, ctx);
    else if (this.page === 1) this.drawPage2(G, ctx);
    else this.drawPage3(G, ctx);

    // chấm trang
    for (let i = 0; i < PAGES; i++) {
      ctx.fillStyle = i === this.page ? '#ffe066' : 'rgba(255,255,255,.28)';
      ctx.beginPath(); ctx.arc(W / 2 - (PAGES - 1) * 14 + i * 28, 604, 6, 0, TAU); ctx.fill();
    }
    for (const h of this.hits) {
      if (h.id === 'ok') textBtn(ctx, h.x, h.y, h.w, h.h, t('gotIt'), { press: h.press, hover: h.hover, font: FONT.disp(26) });
      else roundBtn(ctx, h.x + 28, h.y + 27, 27, (c, s) => {
        ctx.save(); if (h.id === 'prev') ctx.scale(-1, 1); icon.play(c, s); ctx.restore();
      }, { press: h.press, hover: h.hover });
    }
  },

  // ── Trang 1: demo động + hai luật cơ bản ─────────────────────────────────
  drawPage1(G, ctx) {
    const bw = DCOLS * DCELL, bh = DROWS * DCELL;
    glassPanel(ctx, DX - 16, DY - 16, bw + 32, bh + 32, 18,
      { top: 'rgba(12,7,26,.94)', bot: 'rgba(6,3,16,.96)', rim: 'rgba(150,120,255,.5)' });
    this.demo.draw(ctx, DX, DY);

    // mũi tên + con trỏ tay chỉ nước đi
    if (this.stage === 'wait') {
      const k = clamp((this.stageT - .3) / 1.2, 0, 1);
      const cx = DX + 2 * DCELL + DCELL / 2, cy0 = DY + DCELL / 2, cy1 = cy0 + DCELL;
      const p = ease.inOut(Math.min(1, k * 1.6));
      ctx.save();
      ctx.strokeStyle = `rgba(255,225,110,${.55 + .35 * Math.sin(this.t * 6)})`;
      ctx.lineWidth = 4; ctx.setLineDash([9, 7]); ctx.lineDashOffset = -this.t * 26;
      ctx.strokeRect(DX + 2 * DCELL + 3, DY + 3, DCELL - 6, DCELL * 2 - 6);
      ctx.setLineDash([]);
      // mũi tên xuống
      ctx.strokeStyle = '#ffe066'; ctx.lineWidth = 6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(cx, cy0 + 6); ctx.lineTo(cx, cy1 - 12); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - 11, cy1 - 20); ctx.lineTo(cx, cy1 - 6); ctx.lineTo(cx + 11, cy1 - 20);
      ctx.stroke();
      // con trỏ tay
      hand(ctx, cx + 16, lerp(cy0, cy1, p) + 14, 30);
      ctx.restore();
      strokeText(ctx, t('tutDrag'), DX + bw / 2, DY + bh + 44,
        { font: FONT.disp(21), fill: '#ffe066', stroke: '#4a2a00', lw: 5, baseline: 'middle' });
    } else {
      strokeText(ctx, t('tutGoal'), DX + bw / 2, DY + bh + 44,
        { font: FONT.disp(21), fill: '#8ef08a', stroke: '#0d3a16', lw: 5, baseline: 'middle' });
    }
    this.fx.draw(ctx);

    // hai luật
    const px = 470, pw = G.W - px - 56;
    rule(ctx, px, 150, pw, t('htSwapT'), t('htSwapD'));
    rule(ctx, px, 300, pw, t('htMatchT'), t('htMatchD'));

    // minh hoạ bộ 3
    ctx.save();
    for (let i = 0; i < 3; i++) drawGem(ctx, 4, px + 44 + i * 62, 470, 54, { t: this.t, seed: i });
    ctx.restore();
    strokeText(ctx, '→', px + 230, 470, { font: FONT.disp(38), fill: '#fff', stroke: '#3a1d6e', lw: 6, baseline: 'middle' });
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(px + 320, 470, 4, px + 320, 470, 56);
    g.addColorStop(0, 'rgba(255,240,180,.9)'); g.addColorStop(1, 'rgba(255,220,120,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px + 320, 470, 56, 0, TAU); ctx.fill();
    ctx.restore();
    strokeText(ctx, '+120', px + 320, 470, { font: FONT.disp(30), fill: '#fff6c4', stroke: '#6b3a00', lw: 6, baseline: 'middle' });
  },

  drawPage3(G, ctx) { HELP_EXTRA.drawPage3.call(this, G, ctx); },

  // ── Trang 2: đá đặc biệt · bảng chỉ số · kỹ năng ─────────────────────────
  drawPage2(G, ctx) {
    const L = 70, R = 690, colW = 520;

    strokeText(ctx, t('htSpecialT'), L, 118,
      { font: FONT.disp(26), fill: '#ffe066', stroke: '#3a1d6e', lw: 5, align: 'left', baseline: 'middle' });
    const specs = [
      [SP.LINE_H, 0, t('htSpec4')], [SP.CROSS, 2, t('htSpecL')],
      [SP.BOMB, 4, t('htSpec5')],   [null, 1, t('htSquare')],
    ];
    specs.forEach(([sp, gem, txt], i) => {
      const y = 168 + i * 74;
      glassPanel(ctx, L, y - 30, colW, 62, 14);
      if (sp === null) {
        drawGem(ctx, 1, L + 30, y, 44, { t: this.t, seed: 1, special: SP.LINE_V, glow: .5 });
        drawGem(ctx, 3, L + 68, y, 44, { t: this.t, seed: 2, special: SP.BOMB, glow: .5 });
      } else {
        drawGem(ctx, gem, L + 40, y, 50, { t: this.t, seed: i, special: sp, glow: .6 });
      }
      wrapText(ctx, txt, L + 104, y - 8, colW - 124, 19, FONT.ui(14, 600), '#e6dcff');
    });

    strokeText(ctx, t('htHudT'), R, 118,
      { font: FONT.disp(26), fill: '#ffe066', stroke: '#3a1d6e', lw: 5, align: 'left', baseline: 'middle' });
    const hud = [
      [icon.crown, t('htCrown')], [icon.heart, t('htHeart')],
      [icon.flame, t('htRage')],  [null, t('htMovesD')],
    ];
    hud.forEach(([ic, txt], i) => {
      const y = 168 + i * 74;
      glassPanel(ctx, R, y - 30, colW, 62, 14);
      if (ic) { ctx.save(); ctx.translate(R + 36, y); ic(ctx, 38); ctx.restore(); }
      else strokeText(ctx, '24', R + 36, y, { font: FONT.disp(24), fill: '#fff', stroke: '#1a0f30', lw: 4, baseline: 'middle' });
      wrapText(ctx, txt, R + 74, y - 8, colW - 94, 19, FONT.ui(14, 600), '#e6dcff');
    });

    strokeText(ctx, t('htSkillT'), L, 486,
      { font: FONT.disp(26), fill: '#ffe066', stroke: '#3a1d6e', lw: 5, align: 'left', baseline: 'middle' });
    const skills = [[icon.flame, t('htSkFire')], [null, t('htSkHammer')], [icon.restart, t('htSkShuffle')]];
    skills.forEach(([ic, txt], i) => {
      const x = L + i * 380;
      glassPanel(ctx, x, 512, 356, 62, 14);
      ctx.save(); ctx.translate(x + 34, 543);
      ctx.beginPath(); ctx.arc(0, 0, 22, 0, TAU);
      const g = ctx.createLinearGradient(0, -22, 0, 22);
      g.addColorStop(0, C.iceLite); g.addColorStop(1, C.iceMid);
      ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = C.iceDark; ctx.lineWidth = 3; ctx.stroke();
      if (ic) ic(ctx, 40); else { ctx.fillStyle = '#c0c8d8'; roundRect(ctx, -13, -8, 26, 10, 3); ctx.fill();
        ctx.fillStyle = '#8a5a2c'; roundRect(ctx, -3, 0, 6, 14, 2); ctx.fill(); }
      ctx.restore();
      wrapText(ctx, txt, x + 66, 535, 280, 18, FONT.ui(13, 600), '#e6dcff');
    });
  },
};

// ── Trang 3: chế độ Bắn Đá ──────────────────────────────────────────────
Object.assign(HELP_EXTRA, {
  drawPage3(G, ctx) {
    const { W } = G;
    strokeText(ctx, t('htShootT'), W / 2, 116,
      { font: FONT.disp(30), fill: '#ffe066', stroke: '#3a1d6e', lw: 6, baseline: 'middle' });

    // minh hoạ: lưới lục giác nhỏ + đường ngắm + bệ phóng
    const ox = 250, oy = 168, R2 = 22, D = R2 * 2;
    glassPanel(ctx, ox - 30, oy - 26, R2 * 2 * 7 + 60, 300, 18,
      { top: 'rgba(12,7,26,.94)', bot: 'rgba(6,3,16,.96)' });
    const LAY = [
      [0, 0, 0, 3, 3, 1, 1],
      [4, 4, 2, 2, 0, 3],
      [1, 0, 4, 4, 2, 2, 1],
    ];
    LAY.forEach((row, r) => row.forEach((tp, c) => {
      drawOrb(ctx, tp, ox + c * D + R2 + (r % 2 ? R2 : 0), oy + r * R2 * 1.732 + R2, D);
    }));
    const lx = ox + R2 * 7, ly = oy + 250;
    ctx.save();
    ctx.setLineDash([7, 9]); ctx.lineDashOffset = -this.t * 46;
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(ox + R2 * 3.2, oy + R2 * 4.6); ctx.stroke();
    ctx.restore();
    ctx.beginPath(); ctx.arc(lx, ly, 26, 0, TAU);
    ctx.fillStyle = '#7a5230'; ctx.fill();
    ctx.strokeStyle = '#3f2a15'; ctx.lineWidth = 4; ctx.stroke();
    drawOrb(ctx, 2, lx, ly, D);

    const px = 690, pw = W - px - 60;
    glassPanel(ctx, px, 168, pw, 170, 18);
    wrapText(ctx, t('htShootD'), px + 22, 202, pw - 44, 24, FONT.ui(16, 600), '#e6dcff');

    glassPanel(ctx, px, 360, pw, 92, 18);
    wrapText(ctx, t('htTokenD'), px + 22, 392, pw - 44, 22, FONT.ui(15, 600), '#e6dcff');

    glassPanel(ctx, 250, 470, W - 310, 92, 18);
    wrapText(ctx, t('htTimeD'), 272, 502, W - 354, 22, FONT.ui(15, 600), '#ffd9a0');
  },
});

function rule(ctx, x, y, w, title, body) {
  glassPanel(ctx, x, y, w, 122, 18);
  strokeText(ctx, title, x + 22, y + 32,
    { font: FONT.disp(24), fill: '#ffe066', stroke: '#3a1d6e', lw: 5, align: 'left', baseline: 'middle' });
  wrapText(ctx, body, x + 22, y + 62, w - 44, 22, FONT.ui(15, 600), '#e6dcff');
}

function wrapText(ctx, text, x, y, maxW, lh, font, fill) {
  ctx.save();
  ctx.font = font; ctx.fillStyle = fill; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  let line = '', yy = y;
  for (const word of String(text).split(' ')) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, x, yy); line = word; yy += lh; }
    else line = test;
  }
  if (line) ctx.fillText(line, x, yy);
  ctx.restore();
}

/** Con trỏ hình bàn tay — dùng trong demo và trong hướng dẫn màn 1. */
export function hand(ctx, x, y, s) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(-.18);
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#2b1740'; ctx.lineWidth = s * .07; ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(0, -s * .52);
  ctx.quadraticCurveTo(s * .13, -s * .54, s * .13, -s * .30);
  ctx.lineTo(s * .13, -s * .06);
  ctx.quadraticCurveTo(s * .34, -s * .12, s * .40, s * .04);
  ctx.quadraticCurveTo(s * .46, s * .34, s * .28, s * .52);
  ctx.quadraticCurveTo(s * .10, s * .62, -s * .10, s * .52);
  ctx.quadraticCurveTo(-s * .30, s * .34, -s * .30, s * .06);
  ctx.quadraticCurveTo(-s * .26, -s * .08, -s * .13, -s * .04);
  ctx.lineTo(-s * .13, -s * .30);
  ctx.quadraticCurveTo(-s * .13, -s * .54, 0, -s * .52);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.restore();
}

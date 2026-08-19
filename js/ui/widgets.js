// ── Bộ widget dựng theo đúng bảng HUD trong file Figma ──────────────────────
// Panel băng bóng · thanh chỉ số cam · nút tròn bóng · thanh sao EXP.
import { TAU, roundRect, poly, rgba, shade, clamp, lerp, strokeText, ease, makeCanvas } from '../core/util.js';

// ── Cache panel ────────────────────────────────────────────────────────────
// shadowBlur là lệnh đắt nhất của Canvas 2D. Panel có kích thước cố định nên
// ta vẽ MỘT LẦN ra ảnh ngoài màn hình rồi mỗi khung hình chỉ drawImage.
const PAD = 34;
const _panelCache = new Map();
function cached(key, w, h, paint) {
  let c = _panelCache.get(key);
  if (!c) {
    c = makeCanvas(Math.ceil(w + PAD * 2), Math.ceil(h + PAD * 2));
    const cx = c.getContext('2d');
    cx.translate(PAD, PAD);
    paint(cx);
    if (_panelCache.size > 80) _panelCache.clear();   // chặn phình bộ nhớ
    _panelCache.set(key, c);
  }
  return c;
}

export const C = {
  iceLite:'#e8f6ff', ice:'#a8dcff', iceMid:'#6fbdf0', iceDark:'#2f7fc4', iceRim:'#1c5f9e',
  barBg:'#9fd6f7', barA:'#ffcf68', barB:'#f5921e', barRim:'#c96f0d',
  orange:'#f4801f', orangeLite:'#ffc36b', orangeDark:'#a34a05',
  green:'#3fbf4a', greenLite:'#8ef08a', greenDark:'#1d6b24',
  red:'#e8384f', redDark:'#8c0f22',
  gold:'#ffd23f', goldDark:'#b57f05',
  ink:'#22143a', panel:'#ffffff',
};

export const FONT = {
  disp: (n, w = 800) => `${w} ${n}px "Baloo 2","Be Vietnam Pro",sans-serif`,
  ui:   (n, w = 600) => `${w} ${n}px "Be Vietnam Pro","Baloo 2",sans-serif`,
  arc:  (n)          => `${n}px "Bungee","Baloo 2",sans-serif`,
};

/** Thẻ nền trắng bo góc — khung của bảng SCORE. */
export function card(ctx, x, y, w, h, r = 18, o = {}) {
  const img = cached(`card|${w}|${h}|${r}|${o.top}|${o.bot}|${o.rim}|${o.lw}`, w, h, (c) => {
    c.shadowColor = 'rgba(20,10,40,.35)'; c.shadowBlur = 22; c.shadowOffsetY = 8;
    roundRect(c, 0, 0, w, h, r);
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, o.top || '#ffffff'); g.addColorStop(1, o.bot || '#e6f2fb');
    c.fillStyle = g; c.fill();
    c.shadowColor = 'transparent';
    c.strokeStyle = o.rim || 'rgba(120,160,200,.55)'; c.lineWidth = o.lw ?? 2; c.stroke();
  });
  ctx.drawImage(img, x - PAD, y - PAD);
}

/** Panel kính mờ tối — dùng cho khung bàn cờ và các bảng overlay. */
export function glassPanel(ctx, x, y, w, h, r = 20, o = {}) {
  const img = cached(`glass|${w}|${h}|${r}|${o.top}|${o.bot}|${o.rim}|${o.lw}`, w, h, (c) => {
    c.shadowColor = 'rgba(0,0,0,.5)'; c.shadowBlur = 26; c.shadowOffsetY = 10;
    roundRect(c, 0, 0, w, h, r);
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, o.top || 'rgba(30,18,58,.90)');
    g.addColorStop(1, o.bot || 'rgba(14,8,30,.94)');
    c.fillStyle = g; c.fill();
    c.shadowColor = 'transparent';
    c.strokeStyle = o.rim || 'rgba(160,140,255,.42)'; c.lineWidth = o.lw ?? 2.5; c.stroke();
    c.save(); roundRect(c, 0, 0, w, h, r); c.clip();
    const hi = c.createLinearGradient(0, 0, 0, h * .34);
    hi.addColorStop(0, 'rgba(255,255,255,.16)'); hi.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = hi; c.fillRect(0, 0, w, h * .34);
    c.restore();
  });
  ctx.drawImage(img, x - PAD, y - PAD);
}

/** Ô vuông băng bóng — hộp đựng icon trong thanh chỉ số. */
export function iceTile(ctx, x, y, w, h, r = 12) {
  roundRect(ctx, x, y, w, h, r);
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, C.iceLite); g.addColorStop(.45, C.ice); g.addColorStop(1, C.iceMid);
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = C.iceDark; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.save(); roundRect(ctx, x, y, w, h, r); ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  ctx.beginPath(); ctx.ellipse(x + w * .34, y + h * .2, w * .3, h * .14, 0, 0, TAU); ctx.fill();
  ctx.globalAlpha = .5;
  ctx.beginPath(); ctx.arc(x + w * .8, y + h * .78, w * .09, 0, TAU); ctx.fill();
  ctx.restore();
}

/** Thanh chỉ số: hộp icon + thanh viên nang có phần đổ cam. */
export function statBar(ctx, x, y, w, h, value, iconFn, o = {}) {
  const box = h;
  iceTile(ctx, x, y, box, box, box * .26);
  ctx.save(); ctx.translate(x + box / 2, y + box / 2); iconFn(ctx, box * .58); ctx.restore();

  const bx = x + box - 4, bw = w - box + 4, r = h / 2;
  roundRect(ctx, bx, y + h * .12, bw, h * .76, r);
  ctx.fillStyle = C.barBg; ctx.fill();
  ctx.strokeStyle = C.iceDark; ctx.lineWidth = 2.5; ctx.stroke();

  const v = clamp(value, 0, 1);
  if (v > 0.002) {
    ctx.save();
    roundRect(ctx, bx, y + h * .12, bw, h * .76, r); ctx.clip();
    const fw = Math.max(h * .5, bw * v);
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, o.fillA || C.barA); g.addColorStop(.55, o.fillB || C.barB); g.addColorStop(1, o.fillB || C.barB);
    roundRect(ctx, bx, y + h * .12, fw, h * .76, r);
    ctx.fillStyle = g; ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.45)';
    roundRect(ctx, bx + 4, y + h * .2, fw - 8, h * .22, h * .11); ctx.fill();
    ctx.restore();
  }
  if (o.label) {
    strokeText(ctx, o.label, bx + bw - 10, y + h * .5 + 1, {
      font: FONT.disp(Math.round(h * .46)), fill: '#fff', stroke: C.orangeDark,
      lw: 4, align: 'right', baseline: 'middle', shadow: null,
    });
  }
}

/** Nút tròn bóng (cam = chơi lại, xanh = tiếp tục). */
export function roundBtn(ctx, cx, cy, r, iconFn, o = {}) {
  const press = o.press ?? 0, hov = o.hover ?? 0;
  const R = r * (1 - press * .07 + hov * .04);
  ctx.save();
  ctx.fillStyle = 'rgba(15,8,35,.35)';           // bóng vẽ tay, rẻ hơn shadowBlur nhiều
  ctx.beginPath(); ctx.ellipse(cx, cy + (5 - press * 4), R * .96, R * .9, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU);
  const g = ctx.createLinearGradient(0, cy - R, 0, cy + R);
  g.addColorStop(0, C.iceLite); g.addColorStop(.5, C.ice); g.addColorStop(1, C.iceMid);
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = C.iceDark; ctx.lineWidth = R * .11; ctx.stroke();
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,.6)';
  ctx.beginPath(); ctx.ellipse(cx - R * .2, cy - R * .48, R * .5, R * .22, 0, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.translate(cx, cy); iconFn(ctx, R * 1.05);
  ctx.restore();
}

/** Nút chữ nhật có chữ — dùng trong menu. */
export function textBtn(ctx, x, y, w, h, label, o = {}) {
  const press = o.press ?? 0, hov = o.hover ?? 0;
  const dy = press * 4;
  const base = o.colour || C.green, dark = o.dark || C.greenDark, lite = o.lite || C.greenLite;
  ctx.save();
  roundRect(ctx, x, y + 6, w, h, h * .3);            // mặt đế 3D
  ctx.fillStyle = dark; ctx.fill();
  roundRect(ctx, x, y + dy, w, h, h * .3);
  const g = ctx.createLinearGradient(0, y + dy, 0, y + dy + h);
  g.addColorStop(0, lite); g.addColorStop(.5, base); g.addColorStop(1, shade(base, -.18));
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = dark; ctx.lineWidth = 3; ctx.stroke();
  ctx.save(); roundRect(ctx, x, y + dy, w, h, h * .3); ctx.clip();
  ctx.fillStyle = `rgba(255,255,255,${.34 + hov * .2})`;
  roundRect(ctx, x + 6, y + dy + 5, w - 12, h * .34, h * .17); ctx.fill();
  ctx.restore();
  strokeText(ctx, label, x + w / 2, y + dy + h * .58, {
    font: o.font || FONT.disp(Math.round(h * .44)), fill: '#fff', stroke: dark,
    lw: 5, baseline: 'middle', shadow: null,
  });
  ctx.restore();
}

/** Thanh EXP dưới cùng: viền đậm, ruột xanh lá → xanh dương, ngôi sao vàng ở đầu. */
export function starBar(ctx, x, y, w, h, value, o = {}) {
  ctx.save();
  roundRect(ctx, x, y, w, h, h * .5);
  ctx.fillStyle = '#1b1330'; ctx.fill();
  ctx.strokeStyle = '#0a0618'; ctx.lineWidth = 4; ctx.stroke();
  ctx.save();
  roundRect(ctx, x + 5, y + 5, w - 10, h - 10, (h - 10) * .5); ctx.clip();
  ctx.fillStyle = '#123a5c'; ctx.fillRect(x, y, w, h);
  const v = clamp(value, 0, 1);
  const fw = (w - 10) * v;
  if (fw > 2) {
    const g = ctx.createLinearGradient(x + 5, 0, x + 5 + (w - 10), 0);
    g.addColorStop(0, '#49e07a'); g.addColorStop(.5, '#2fd0a8'); g.addColorStop(1, '#3aa0ff');
    ctx.fillStyle = g; ctx.fillRect(x + 5, y + 5, fw, h - 10);
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.fillRect(x + 5, y + 6, fw, (h - 10) * .34);
  }
  // vệt sáng chạy
  const t = o.t ?? 0, sx = x + 5 + ((t * 220) % (w + 200)) - 100;
  const sg = ctx.createLinearGradient(sx - 50, 0, sx + 50, 0);
  sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(.5, 'rgba(255,255,255,.30)');
  sg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sg; ctx.fillRect(x, y, w, h);
  ctx.restore();
  ctx.restore();
  // ngôi sao
  ctx.save(); ctx.translate(x + h * .5, y + h * .5); ctx.rotate(Math.sin((o.t ?? 0) * 2) * .12);
  icon.star(ctx, h * 1.25); ctx.restore();
  if (o.label) strokeText(ctx, o.label, x + w - 12, y + h * .5 + 1,
    { font: FONT.disp(Math.round(h * .58)), fill: '#fff', stroke: '#0a2340', lw: 4, align: 'right', baseline: 'middle', shadow: null });
}

// ── ICON (vẽ tại gốc toạ độ, kích thước s) ──────────────────────────────────
const fillStroke = (ctx, f, s, lw = 0.09) => {
  ctx.fillStyle = f; ctx.fill();
  ctx.strokeStyle = 'rgba(40,20,10,.65)'; ctx.lineWidth = s * lw; ctx.lineJoin = 'round'; ctx.stroke();
};

export const icon = {
  crown(ctx, s) {
    const h = s * .5, w = s * .62;
    poly(ctx, [[-w, h * .5], [-w, -h * .35], [-w * .45, h * .12], [0, -h * .75],
               [w * .45, h * .12], [w, -h * .35], [w, h * .5]]);
    fillStroke(ctx, C.gold, s);
    ctx.fillStyle = '#8e2fd0';
    ctx.beginPath(); ctx.arc(0, h * .02, s * .09, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    ctx.fillRect(-w, h * .18, w * 2, h * .12);
  },
  heart(ctx, s) {
    const r = s * .5;
    ctx.beginPath();
    ctx.moveTo(0, r * .82);
    ctx.bezierCurveTo(-r * 1.4, -r * .2, -r * .55, -r * 1.15, 0, -r * .38);
    ctx.bezierCurveTo(r * .55, -r * 1.15, r * 1.4, -r * .2, 0, r * .82);
    ctx.closePath();
    fillStroke(ctx, '#d4183a', s);
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    ctx.beginPath(); ctx.ellipse(-r * .38, -r * .32, r * .22, r * .13, -.6, 0, TAU); ctx.fill();
  },
  pouch(ctx, s) {
    const r = s * .42;
    ctx.beginPath(); ctx.ellipse(0, r * .34, r, r * .92, 0, 0, TAU);
    fillStroke(ctx, '#9a5a2c', s);
    ctx.beginPath();
    ctx.moveTo(-r * .5, -r * .5); ctx.quadraticCurveTo(0, -r * .95, r * .5, -r * .5);
    ctx.quadraticCurveTo(0, -r * .3, -r * .5, -r * .5);
    fillStroke(ctx, '#c98a4b', s);
    ctx.strokeStyle = '#5c3312'; ctx.lineWidth = s * .07;
    ctx.beginPath(); ctx.moveTo(-r * .62, -r * .3); ctx.lineTo(r * .62, -r * .3); ctx.stroke();
    ctx.fillStyle = C.gold;
    ctx.beginPath(); ctx.arc(r * .16, r * .3, r * .26, 0, TAU); ctx.fill();
  },
  star(ctx, s) {
    const R = s * .5, r = R * .45;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r : R;
      i ? ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
    const g = ctx.createLinearGradient(0, -R, 0, R);
    g.addColorStop(0, '#fff2a8'); g.addColorStop(.5, C.gold); g.addColorStop(1, '#f09a10');
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = '#7a4f00'; ctx.lineWidth = s * .07; ctx.lineJoin = 'round'; ctx.stroke();
  },
  starEmpty(ctx, s) {
    const R = s * .5, r = R * .45;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r : R;
      i ? ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(20,12,36,.55)'; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = s * .07; ctx.lineJoin = 'round'; ctx.stroke();
  },
  hammer(ctx, s) {
    ctx.save();
    ctx.rotate(-.42);
    // cán gỗ
    const hg = ctx.createLinearGradient(-s * .05, 0, s * .05, 0);
    hg.addColorStop(0, '#8a5a2c'); hg.addColorStop(.4, '#c08a4a'); hg.addColorStop(1, '#6d4420');
    ctx.fillStyle = hg;
    roundRect(ctx, -s * .052, -s * .04, s * .104, s * .46, s * .045); ctx.fill();
    ctx.strokeStyle = '#4a2c10'; ctx.lineWidth = s * .035; ctx.stroke();
    ctx.strokeStyle = 'rgba(70,44,16,.5)'; ctx.lineWidth = s * .012;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(-s * .02, s * (.02 + i * .13)); ctx.lineTo(s * .02, s * (.10 + i * .13)); ctx.stroke();
    }
    // đầu búa
    const mg = ctx.createLinearGradient(0, -s * .28, 0, -s * .04);
    mg.addColorStop(0, '#f2f6ff'); mg.addColorStop(.45, '#b9c3d6'); mg.addColorStop(1, '#6f7b90');
    ctx.fillStyle = mg;
    roundRect(ctx, -s * .27, -s * .28, s * .54, s * .24, s * .06); ctx.fill();
    ctx.strokeStyle = '#414b5e'; ctx.lineWidth = s * .045; ctx.lineJoin = 'round'; ctx.stroke();
    // gờ và chớp sáng
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    roundRect(ctx, -s * .22, -s * .25, s * .44, s * .06, s * .03); ctx.fill();
    ctx.fillStyle = 'rgba(40,50,66,.35)';
    roundRect(ctx, -s * .22, -s * .11, s * .44, s * .05, s * .025); ctx.fill();
    ctx.strokeStyle = '#414b5e'; ctx.lineWidth = s * .028;
    ctx.beginPath(); ctx.moveTo(-s * .09, -s * .28); ctx.lineTo(-s * .09, -s * .04); ctx.stroke();
    ctx.restore();
  },
  restart(ctx, s) {
    const r = s * .30;
    const arm = (a0, a1, headA) => {
      ctx.beginPath(); ctx.arc(0, 0, r, a0, a1);
      ctx.strokeStyle = C.orangeDark; ctx.lineWidth = s * .20; ctx.lineCap = 'round'; ctx.stroke();
      const gr = ctx.createLinearGradient(0, -r, 0, r);
      gr.addColorStop(0, '#ffc36b'); gr.addColorStop(1, C.orange);
      ctx.strokeStyle = gr; ctx.lineWidth = s * .125; ctx.stroke();
      ctx.save();
      ctx.translate(Math.cos(headA) * r, Math.sin(headA) * r);
      ctx.rotate(headA + Math.PI / 2);
      poly(ctx, [[-s * .135, -s * .045], [s * .135, -s * .045], [0, s * .17]]);
      ctx.fillStyle = '#ffb44a'; ctx.fill();
      ctx.strokeStyle = C.orangeDark; ctx.lineWidth = s * .05; ctx.lineJoin = 'round'; ctx.stroke();
      ctx.restore();
    };
    arm(Math.PI * .18, Math.PI * .96, Math.PI * .18);
    arm(Math.PI * 1.18, Math.PI * 1.96, Math.PI * 1.18);
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.beginPath(); ctx.ellipse(-r * .45, -r * .62, s * .085, s * .035, -.5, 0, TAU); ctx.fill();
  },
  play(ctx, s) {
    ctx.save(); ctx.translate(s * .05, 0);
    poly(ctx, [[-s * .22, -s * .3], [s * .28, 0], [-s * .22, s * .3]]);
    const g = ctx.createLinearGradient(0, -s * .3, 0, s * .3);
    g.addColorStop(0, C.greenLite); g.addColorStop(1, C.green);
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = C.greenDark; ctx.lineWidth = s * .1; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.restore();
  },
  pause(ctx, s) {
    ctx.fillStyle = C.iceRim;
    roundRect(ctx, -s * .22, -s * .28, s * .16, s * .56, s * .05); ctx.fill();
    roundRect(ctx,  s * .06, -s * .28, s * .16, s * .56, s * .05); ctx.fill();
  },
  home(ctx, s) {
    poly(ctx, [[0, -s * .32], [s * .34, -s * .02], [s * .22, -s * .02],
               [s * .22, s * .3], [-s * .22, s * .3], [-s * .22, -s * .02], [-s * .34, -s * .02]]);
    fillStroke(ctx, C.orange, s, .1);
  },
  note(ctx, s, on = true) {
    ctx.fillStyle = on ? C.iceRim : 'rgba(80,80,100,.6)';
    ctx.beginPath(); ctx.ellipse(-s * .1, s * .2, s * .13, s * .1, -.3, 0, TAU); ctx.fill();
    ctx.fillRect(s * .0, -s * .3, s * .06, s * .5);
    ctx.beginPath(); ctx.moveTo(s * .06, -s * .3); ctx.lineTo(s * .26, -s * .22);
    ctx.lineTo(s * .26, -s * .08); ctx.lineTo(s * .06, -s * .16); ctx.closePath(); ctx.fill();
    if (!on) {
      ctx.strokeStyle = C.red; ctx.lineWidth = s * .09; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-s * .3, -s * .3); ctx.lineTo(s * .32, s * .3); ctx.stroke();
    }
  },
  globe(ctx, s) {
    const r = s * .3;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU);
    ctx.fillStyle = '#4aa3e8'; ctx.fill();
    ctx.strokeStyle = C.iceRim; ctx.lineWidth = s * .08; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = s * .05;
    ctx.beginPath(); ctx.ellipse(0, 0, r * .48, r, 0, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(r, 0); ctx.stroke();
  },
  flame(ctx, s) {
    // lớp ngoài
    ctx.beginPath();
    ctx.moveTo(0, -s * .40);
    ctx.bezierCurveTo(s * .10, -s * .22, s * .32, -s * .10, s * .30, s * .08);
    ctx.bezierCurveTo(s * .28, s * .30, s * .14, s * .38, 0, s * .38);
    ctx.bezierCurveTo(-s * .14, s * .38, -s * .28, s * .30, -s * .30, s * .08);
    ctx.bezierCurveTo(-s * .32, -s * .10, -s * .10, -s * .22, 0, -s * .40);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, -s * .40, 0, s * .38);
    g.addColorStop(0, '#ffd45c'); g.addColorStop(.42, '#ff8a1e'); g.addColorStop(1, '#d62b1f');
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = '#7a1e06'; ctx.lineWidth = s * .055; ctx.lineJoin = 'round'; ctx.stroke();
    // lưỡi lửa trong
    ctx.beginPath();
    ctx.moveTo(0, -s * .16);
    ctx.bezierCurveTo(s * .16, -s * .02, s * .15, s * .16, 0, s * .24);
    ctx.bezierCurveTo(-s * .15, s * .16, -s * .16, -s * .02, 0, -s * .16);
    ctx.closePath();
    const g2 = ctx.createLinearGradient(0, -s * .16, 0, s * .24);
    g2.addColorStop(0, '#fffdf0'); g2.addColorStop(.6, '#ffe27a'); g2.addColorStop(1, '#ffb43c');
    ctx.fillStyle = g2; ctx.fill();
    // chớp sáng
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.beginPath(); ctx.ellipse(-s * .09, -s * .12, s * .05, s * .10, -.35, 0, TAU); ctx.fill();
  },
  clock(ctx, s) {
    const r = s * .34;
    ctx.beginPath(); ctx.arc(0, s * .03, r, 0, TAU);
    const g = ctx.createLinearGradient(0, -r, 0, r);
    g.addColorStop(0, '#fff4d0'); g.addColorStop(1, '#f0b63c');
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = '#7a4a05'; ctx.lineWidth = s * .085; ctx.stroke();
    ctx.strokeStyle = '#7a4a05'; ctx.lineWidth = s * .07; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, s * .03); ctx.lineTo(0, -s * .14); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, s * .03); ctx.lineTo(s * .13, s * .08); ctx.stroke();
    ctx.fillStyle = '#7a4a05';
    ctx.fillRect(-s * .07, -s * .40, s * .14, s * .07);
  },
  map(ctx, s) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-s * .32, -s * .22); ctx.lineTo(-s * .10, -s * .30);
    ctx.lineTo(s * .12, -s * .20); ctx.lineTo(s * .32, -s * .28);
    ctx.lineTo(s * .32, s * .24); ctx.lineTo(s * .12, s * .32);
    ctx.lineTo(-s * .10, s * .22); ctx.lineTo(-s * .32, s * .30);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, -s * .3, 0, s * .3);
    g.addColorStop(0, '#f0dcae'); g.addColorStop(1, '#c9a86e');
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = '#6b4a1c'; ctx.lineWidth = s * .07; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-s * .10, -s * .30); ctx.lineTo(-s * .10, s * .22);
    ctx.moveTo(s * .12, -s * .20); ctx.lineTo(s * .12, s * .32);
    ctx.lineWidth = s * .045; ctx.strokeStyle = 'rgba(107,74,28,.55)'; ctx.stroke();
    ctx.strokeStyle = '#c8442f'; ctx.lineWidth = s * .05; ctx.setLineDash([s * .05, s * .05]);
    ctx.beginPath();
    ctx.moveTo(-s * .20, s * .10); ctx.quadraticCurveTo(0, -s * .10, s * .20, s * .02);
    ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#c8442f';
    ctx.beginPath(); ctx.arc(s * .20, s * .02, s * .05, 0, TAU); ctx.fill();
    ctx.restore();
  },
  exit(ctx, s) {
    ctx.save();
    ctx.strokeStyle = C.redDark; ctx.lineWidth = s * .11; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(s * .06, -s * .26); ctx.lineTo(-s * .20, -s * .26);
    ctx.lineTo(-s * .20, s * .26); ctx.lineTo(s * .06, s * .26);
    ctx.stroke();
    ctx.strokeStyle = C.red; ctx.lineWidth = s * .075; ctx.stroke();
    ctx.strokeStyle = C.redDark; ctx.lineWidth = s * .12;
    ctx.beginPath(); ctx.moveTo(-s * .02, 0); ctx.lineTo(s * .28, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s * .15, -s * .13); ctx.lineTo(s * .30, 0); ctx.lineTo(s * .15, s * .13); ctx.stroke();
    ctx.strokeStyle = C.red; ctx.lineWidth = s * .075;
    ctx.beginPath(); ctx.moveTo(-s * .02, 0); ctx.lineTo(s * .28, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s * .15, -s * .13); ctx.lineTo(s * .30, 0); ctx.lineTo(s * .15, s * .13); ctx.stroke();
    ctx.restore();
  },
  help(ctx, s) {
    strokeText(ctx, '?', 0, s * .03, { font: `800 ${s * .82}px "Baloo 2",sans-serif`,
      fill: C.orange, stroke: C.orangeDark, lw: s * .1, baseline: 'middle', shadow: null });
  },
  sword(ctx, s) {
    ctx.save(); ctx.rotate(-.7);
    ctx.fillStyle = '#dfe6f2'; ctx.strokeStyle = '#6a7290'; ctx.lineWidth = s * .05;
    poly(ctx, [[-s*.05,-s*.34],[s*.05,-s*.34],[s*.06,s*.08],[0,s*.16],[-s*.06,s*.08]]);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#8a5a2c';
    roundRect(ctx, -s*.16, s*.08, s*.32, s*.07, s*.03); ctx.fill();
    roundRect(ctx, -s*.04, s*.15, s*.08, s*.18, s*.03); ctx.fill();
    ctx.fillStyle = C.gold;
    ctx.beginPath(); ctx.arc(0, s*.36, s*.06, 0, TAU); ctx.fill();
    ctx.restore();
  },
  coin(ctx, s) {
    ctx.beginPath(); ctx.arc(0, 0, s * .30, 0, TAU);
    const g = ctx.createLinearGradient(0, -s * .3, 0, s * .3);
    g.addColorStop(0, '#ffe98a'); g.addColorStop(1, '#e09a10');
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = '#8a5c00'; ctx.lineWidth = s * .07; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = s * .05;
    ctx.beginPath(); ctx.arc(0, 0, s * .17, 0, TAU); ctx.stroke();
  },
  lock(ctx, s) {
    ctx.strokeStyle = '#8e93b5'; ctx.lineWidth = s * .11;
    ctx.beginPath(); ctx.arc(0, -s * .1, s * .17, Math.PI, 0); ctx.stroke();
    roundRect(ctx, -s * .25, -s * .1, s * .5, s * .38, s * .07);
    ctx.fillStyle = '#b9bed8'; ctx.fill();
    ctx.strokeStyle = '#6b7096'; ctx.lineWidth = s * .06; ctx.stroke();
  },
};

// ── nút có vùng bấm ─────────────────────────────────────────────────────────
export class Hit {
  constructor(id, x, y, w, h, o = {}) { Object.assign(this, { id, x, y, w, h, ...o }); this.press = 0; this.hover = 0; }
  contains(px, py) {
    if (this.circle) return Math.hypot(px - (this.x + this.w / 2), py - (this.y + this.h / 2)) <= this.w / 2;
    return px >= this.x && px <= this.x + this.w && py >= this.y && py <= this.y + this.h;
  }
  tick(dt, hovering, pressing) {
    this.hover = lerp(this.hover, hovering ? 1 : 0, 1 - Math.pow(.001, dt));
    this.press = lerp(this.press, pressing ? 1 : 0, 1 - Math.pow(.0001, dt));
  }
}

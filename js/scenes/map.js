// ── Bản đồ hành trình — các màn nối thành đường mòn, mở dần theo tuần ───────
import { TAU, clamp, lerp, ease, rgba, shade, strokeText, roundRect, mulberry32 } from '../core/util.js';
import { t, tx } from '../core/i18n.js';
import { Hit, textBtn, roundBtn, card, glassPanel, icon, C, FONT } from '../ui/widgets.js';
import { EPISODES, ALL_LEVELS, REGIONS } from '../data/levels.js';
import { bleed } from '../core/layout.js';
import { perf, Q } from '../core/perf.js';

const NODE_DX = 148, NODE_R = 36;
const nodeX = (i) => 170 + i * NODE_DX;
const nodeY = (i) => 400 + Math.sin(i * .78) * 118 + Math.sin(i * .31) * 34;

/**
 * Lấy mẫu điểm + hướng tiếp tuyến dọc đường mòn.
 *
 * Vẽ đường bằng vài lệnh stroke chồng nhau thì chỉ ra được một sợi dây. Muốn
 * nó thành CON ĐƯỜNG LÁT ĐÁ thì phải biết hướng đi tại từng điểm để xoay từng
 * phiến đá theo — nên cần bộ mẫu này. Vị trí nút cố định nên tính một lần.
 */
function trailSamples(count, per = 7) {
  const out = [];
  for (let i = 1; i < count; i++) {
    const x0 = nodeX(i - 1), y0 = nodeY(i - 1);
    const x1 = nodeX(i), y1 = nodeY(i);
    const cx = (x0 + x1) / 2, cy = y0;                 // khớp với quadraticCurveTo bên dưới
    for (let k = 0; k < per; k++) {
      const u = k / per, iu = 1 - u;
      out.push({
        x: iu * iu * x0 + 2 * iu * u * cx + u * u * x1,
        y: iu * iu * y0 + 2 * iu * u * cy + u * u * y1,
        a: Math.atan2(2 * iu * (cy - y0) + 2 * u * (y1 - cy),
                      2 * iu * (cx - x0) + 2 * u * (x1 - cx)),
      });
    }
  }
  out.push({ x: nodeX(count - 1), y: nodeY(count - 1), a: 0 });
  return out;
}

export default {
  name: 'map',
  enter(G) {
    this.t = 0;
    this.scroll = 0; this.scrollV = 0; this.drag = null; this.moved = 0;
    this.maxScroll = Math.max(0, nodeX(ALL_LEVELS.length - 1) + 220 - G.W);
    this.bubble = null; this.toast = null; this.toastT = 0;
    // hoa · nấm · đá · gốc cây rải dọc lối đi — sinh cố định theo hạt nên
    // không nhấp nháy mỗi khung hình
    const R = mulberry32(90210);
    this.deco = Array.from({ length: 120 }, (_, i) => ({
      x: i * 78 + R() * 60, dy: (R() - .5) * 150, k: (R() * 4) | 0, s: .7 + R() * .7, ph: R() * TAU,
    }));
    this.flies = Array.from({ length: 14 }, () => ({ x: R() * 3000, y: R() * 300 + 200, ph: R() * TAU, s: .6 + R() * .6 }));
    // bướm bay dọc lối đi — chuyển động lớn, bắt mắt hơn đom đóm ban ngày
    this.flutters = Array.from({ length: 9 }, () => ({
      x: R() * 6600, y: R() * 260 + 180, ph: R() * TAU, s: .7 + R() * .6,
      col: ['#ffd76b', '#ff9ec4', '#a8e0ff', '#c9a8ff'][(R() * 4) | 0],
    }));
    this.samples = trailSamples(ALL_LEVELS.length);
    // cỏ tiền cảnh: dải sát mép dưới, trôi nhanh hơn nền → có chiều sâu
    this.fg = Array.from({ length: 90 }, () => ({ x: R() * 7200, h: 26 + R() * 46, ph: R() * TAU, s: .6 + R() * .8 }));
    this.scroll = clamp(nodeX(G.save.unlocked - 1) - G.W * .45, 0, this.maxScroll);
    this.hits = [
      new Hit('nest', 24, G.H - 92, 190, 60, { act: () => G.go('nest') }),
      new Hit('arena', 228, G.H - 92, 172, 60, { act: () => { G.sfx('button'); G.go('duel', { after: () => G.go('map') }); } }),
      new Hit('shop', 414, G.H - 92, 150, 60, { act: () => { G.sfx('button'); G.go('shop', { after: () => G.go('map') }); } }),
      new Hit('world', G.W - 284, 26, 52, 52, { circle: true, act: () => { G.sfx('button'); G.go('world', { after: () => G.go('map') }); } }),
      new Hit('help', G.W - 218, 26, 52, 52, { circle: true, act: () => { G.sfx('button'); G.go('help', 'map'); } }),
      new Hit('lang', G.W - 152, 26, 52, 52, { circle: true, act: () => G.askLang() }),
      new Hit('music', G.W - 86, 26, 52, 52, { circle: true, act: () => G.toggleMute() }),
    ];
    const ep0 = EPISODES[0];
    G.world.setTheme({ sky: ep0.sky, hill: ep0.hill, mount: ep0.mount });
    G.music('trail');
  },

  epAt(i) { return EPISODES[Math.floor(i / 15)] || EPISODES[EPISODES.length - 1]; },

  update(G, dt) {
    this.t += dt;
    G.hero.update(dt);
    if (this.bubble) { this.bubble.t += dt; if (this.bubble.t > 3.2) this.bubble = null; }
    if (this.toastT > 0) this.toastT -= dt;
    if (!this.drag) {
      this.scroll = clamp(this.scroll + this.scrollV * dt, 0, this.maxScroll);
      this.scrollV *= Math.pow(.02, dt);
    }
    // đổi chủ đề nền theo chương đang xem
    const centreIdx = clamp(Math.round((this.scroll + G.W / 2 - 170) / NODE_DX), 0, ALL_LEVELS.length - 1);
    const ep = this.epAt(centreIdx);
    if (this._ep !== ep.id) { this._ep = ep.id; G.world.setTheme({ sky: ep.sky, hill: ep.hill, mount: ep.mount }); }
    G.world.update(dt, -this.scroll * .06);
  },

  down(G, x, y) { this.drag = { x, s: this.scroll, t: this.t }; this.moved = 0; },
  move(G, x, y) {
    if (!this.drag) return;
    const d = this.drag.x - x;
    this.moved = Math.max(this.moved, Math.abs(d));
    const ns = clamp(this.drag.s + d, 0, this.maxScroll);
    this.scrollV = (ns - this.scroll) / Math.max(1 / 60, this.t - this.drag.t) * .35;
    this.scroll = ns;
    this.drag.t = this.t; this.drag.x = x; this.drag.s = ns;
  },
  up(G, x, y) {
    const wasDragging = this.moved > 8;
    this.drag = null;
    if (wasDragging) return;

    // ── chạm vào con dế → nó la làng ──────────────────────────────────
    const cur = G.save.unlocked - 1;
    const hx = nodeX(cur) - 88 - this.scroll, hy = nodeY(cur) + 58;
    if (Math.hypot(x - hx, y - hy - 20) < 74) {
      const p = G.hero.poke();
      this.bubble = { p, t: 0, x: hx, y: hy - 96 };
      G.sfx(p.mood === 'chirp' ? 'roar' : 'select');
      G.fx.sparkle(hx, hy - 20, '#ffe9a8', 10);
      return;
    }
    // bấm vào một nút màn
    const wx = x + this.scroll;
    for (let i = 0; i < ALL_LEVELS.length; i++) {
      if (Math.hypot(wx - nodeX(i), y - nodeY(i)) <= NODE_R + 8) {
        if (i < G.save.unlocked) { G.sfx('button'); G.startLevel(i); }
        else G.sfx('invalid');
        return;
      }
    }
  },
  wheel(G, d) { this.scroll = clamp(this.scroll + d, 0, this.maxScroll); },

  draw(G, ctx) {
    const { W, H } = G;
    G.world.draw(ctx);
    ctx.fillStyle = 'rgba(18,10,38,.28)'; ctx.fillRect(...bleed(G));

    ctx.save();
    ctx.translate(-this.scroll, 0);

    // ── cảnh vật hai bên đường ────────────────────────────────────────
    for (const d of this.deco) {
      if (d.x < this.scroll - 80 || d.x > this.scroll + W + 80) continue;
      const idx = clamp(Math.round((d.x - 170) / NODE_DX), 0, ALL_LEVELS.length - 1);
      const y = nodeY(idx) + d.dy;
      const sw = Math.sin(this.t * 1.3 + d.ph) * 2.4 * d.s;
      ctx.save(); ctx.translate(d.x + sw, y); ctx.scale(d.s, d.s);
      if (d.k === 0) {                                   // hoa cỏ
        ctx.strokeStyle = '#4f7a3a'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(0, 10); ctx.lineTo(0, -6); ctx.stroke();
        ctx.fillStyle = ['#ffd76b', '#ff9ec4', '#cfa8ff'][(d.ph * 3 | 0) % 3];
        for (let k = 0; k < 5; k++) {
          const a = k / 5 * TAU;
          ctx.beginPath(); ctx.arc(Math.cos(a) * 4.5, -6 + Math.sin(a) * 4.5, 3.2, 0, TAU); ctx.fill();
        }
        ctx.fillStyle = '#fff3b0'; ctx.beginPath(); ctx.arc(0, -6, 2.4, 0, TAU); ctx.fill();
      } else if (d.k === 1) {                            // nấm
        ctx.fillStyle = '#f2e4cf';
        roundRect(ctx, -2.6, -2, 5.2, 11, 2.4); ctx.fill();
        ctx.fillStyle = '#d4564f';
        ctx.beginPath(); ctx.ellipse(0, -3, 9, 6.5, 0, Math.PI, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.85)';
        ctx.beginPath(); ctx.arc(-3, -5, 1.6, 0, TAU); ctx.arc(3, -6, 1.3, 0, TAU); ctx.fill();
      } else if (d.k === 2) {                            // hòn đá
        ctx.fillStyle = '#8a8fa6';
        ctx.beginPath();
        ctx.moveTo(-9, 6); ctx.lineTo(-5, -5); ctx.lineTo(4, -7); ctx.lineTo(10, 2); ctx.lineTo(6, 6);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.28)';
        ctx.beginPath(); ctx.moveTo(-5, -5); ctx.lineTo(4, -7); ctx.lineTo(2, -2); ctx.closePath(); ctx.fill();
      } else {                                           // bụi cỏ
        ctx.strokeStyle = '#3f6b34'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
        for (let k = -2; k <= 2; k++) {
          ctx.beginPath(); ctx.moveTo(k * 3.4, 8);
          ctx.quadraticCurveTo(k * 5, 0, k * 7 + sw, -9); ctx.stroke();
        }
      }
      ctx.restore();
    }

    // ── DẢI ĐẤT + ĐƯỜNG MÒN LÁT ĐÁ ────────────────────────────────────
    // Trước đây chỉ là 5 lệnh stroke chồng nhau → ra một sợi dây thừng vắt
    // ngang nền. Giờ dựng ba tầng: dải đất sáng ôm lấy đường (tách đường khỏi
    // nền), thân đường có mép tối và mặt sáng, rồi PHIẾN ĐÁ LÁT xoay theo
    // đúng hướng đi — cái cuối mới là thứ khiến mắt đọc ra "con đường".
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // Đường mòn: dựng đường MỘT lần rồi stroke lại nhiều lần với nét khác nhau
    // — canvas giữ nguyên đường cho tới lần beginPath kế tiếp, nên không phải
    // dựng lại. Và chỉ dựng phần ĐANG NHÌN THẤY. Trước đây gọi lại hàm dựng
    // đường cho từng lớp: 7 lớp × 45 đoạn cong = 315 lệnh mỗi khung, chỉ để vẽ
    // một con đường đứng yên.
    const i0 = Math.max(1, Math.floor((this.scroll - 200 - 170) / NODE_DX));
    const i1 = Math.min(ALL_LEVELS.length - 1, Math.ceil((this.scroll + W + 200 - 170) / NODE_DX));
    const road = () => {
      ctx.beginPath();
      ctx.moveTo(nodeX(i0 - 1), nodeY(i0 - 1));
      for (let i = i0; i <= i1; i++) {
        const px = nodeX(i - 1), py = nodeY(i - 1), cx = nodeX(i), cy = nodeY(i);
        ctx.quadraticCurveTo((px + cx) / 2, py, cx, cy);
      }
    };
    const lay = (col, wd) => { ctx.strokeStyle = col; ctx.lineWidth = wd; ctx.stroke(); };

    road();                                      // ① lớp nền, không lệch
    lay('rgba(126,178,92,.34)', 128);            // dải đất cỏ hai bên đường
    lay('rgba(150,196,110,.40)', 92);

    ctx.save(); ctx.translate(0, 7); road();     // ② bóng đổ của đường
    lay('rgba(24,14,40,.34)', 46);
    ctx.restore();

    road();                                      // ③ thân đường
    lay('#6d5330', 44);
    lay('#a8895a', 36);
    lay('#c8ab7c', 30);

    if (perf.quality > Q.LOW) {                  // ④ vệt sáng mép trên
      ctx.save(); ctx.translate(0, -6); road();
      lay('rgba(255,240,205,.30)', 13);
      ctx.restore();
    }
    ctx.restore();

    // phiến đá lát — xoay theo tiếp tuyến, cỡ so le cho khỏi đều tăm tắp
    ctx.save();
    for (let i = 0; i < this.samples.length; i += 2) {
      const sp = this.samples[i];
      if (sp.x < this.scroll - 60 || sp.x > this.scroll + W + 60) continue;
      const k = i % 4 === 0 ? 1 : .84;
      ctx.save();
      ctx.translate(sp.x, sp.y); ctx.rotate(sp.a);
      roundRect(ctx, -11 * k, -12 * k, 22 * k, 24 * k, 7 * k);
      ctx.fillStyle = 'rgba(90,68,38,.30)'; ctx.fill();
      roundRect(ctx, -11 * k, -14 * k, 22 * k, 24 * k, 7 * k);
      const pg = ctx.createLinearGradient(0, -14 * k, 0, 10 * k);
      pg.addColorStop(0, '#f0dfbc'); pg.addColorStop(1, '#cdb082');
      ctx.fillStyle = pg; ctx.fill();
      ctx.strokeStyle = 'rgba(96,72,40,.45)'; ctx.lineWidth = 1.6; ctx.stroke();
      ctx.restore();
    }
    ctx.restore();

    // ── cột mốc chương: biển gỗ cắm bên đường ─────────────────────────
    EPISODES.forEach((ep, ei) => {
      const i = ei * 15;
      const bx = nodeX(i) - 70, gy = nodeY(i) + 40;
      const label = `${tx(ep, 'name')}`;
      const sub = `${t('episode')} ${ep.week}`;
      ctx.save();
      ctx.font = FONT.disp(21);
      const w = Math.max(150, ctx.measureText(label).width + 34), h = 54;
      const by = gy - 132;
      // cọc
      ctx.fillStyle = '#6b4a22';
      roundRect(ctx, bx - 7, by + h - 6, 14, 74, 4); ctx.fill();
      ctx.strokeStyle = '#3f2a10'; ctx.lineWidth = 2.5; ctx.stroke();
      // biển gỗ
      roundRect(ctx, bx - w / 2, by, w, h, 10);
      const wg = ctx.createLinearGradient(0, by, 0, by + h);
      wg.addColorStop(0, '#c39355'); wg.addColorStop(1, '#8a6329');
      ctx.fillStyle = wg; ctx.fill();
      ctx.strokeStyle = '#3f2a10'; ctx.lineWidth = 3.5; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,232,190,.35)'; ctx.lineWidth = 1.6;
      roundRect(ctx, bx - w / 2 + 5, by + 5, w - 10, h - 10, 7); ctx.stroke();
      for (const sx of [-1, 1]) {                        // đinh tán
        ctx.beginPath(); ctx.arc(bx + sx * (w / 2 - 12), by + 11, 3, 0, TAU);
        ctx.fillStyle = '#d8dfef'; ctx.fill();
      }
      strokeText(ctx, sub, bx, by + 16,
        { font: FONT.ui(11, 800), fill: '#f2ddb8', stroke: null, lw: 0, baseline: 'middle', shadow: null });
      strokeText(ctx, label, bx, by + 36,
        { font: FONT.disp(21), fill: '#fff6e0', stroke: '#3f2a10', lw: 4, baseline: 'middle' });
      ctx.restore();
    });

    // ── các nút màn ───────────────────────────────────────────────────
    for (let i = 0; i < ALL_LEVELS.length; i++) {
      const x = nodeX(i), y = nodeY(i);
      if (x < this.scroll - 110 || x > this.scroll + W + 110) continue;
      const lv = ALL_LEVELS[i];
      const open = i < G.save.unlocked;
      const cur = i === G.save.unlocked - 1;
      const st = G.save.stars[lv.id] || 0;
      const pop = cur ? 1 + Math.sin(this.t * 3) * .05 : 1;

      ctx.save();
      ctx.translate(x, y);
      ctx.scale(pop, pop);

      // bóng đổ trên mặt đường
      ctx.fillStyle = 'rgba(20,12,40,.34)';
      ctx.beginPath(); ctx.ellipse(0, NODE_R * .98, NODE_R * .88, NODE_R * .26, 0, 0, TAU); ctx.fill();

      // quầng sáng đập nhịp quanh màn đang mở
      if (cur) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const hk = .55 + .45 * Math.sin(this.t * 3);
        const hg2 = ctx.createRadialGradient(0, 0, NODE_R * .8, 0, 0, NODE_R * 2.1);
        hg2.addColorStop(0, `rgba(255,226,130,${.34 * hk})`);
        hg2.addColorStop(1, 'rgba(255,210,90,0)');
        ctx.fillStyle = hg2;
        ctx.beginPath(); ctx.arc(0, 0, NODE_R * 2.1, 0, TAU); ctx.fill();
        ctx.restore();
      }

      // Bảng màu theo trạng thái. Khoá thì xám đá, chưa sao thì xanh lá (mời
      // chơi), có sao thì xanh dương, đủ 3 sao thì vàng kim.
      const PAL = !open ? ['#8f93aa', '#5a5f79', '#2b2e40']
                : st >= 3 ? ['#ffe98a', '#f0a41c', '#8a4c02']
                : st > 0  ? ['#bfe6ff', '#3080c8', '#123f6b']
                          : ['#a9f79f', '#2f9c36', '#0f4a17'];

      // BỆ: bản sao tối lệch xuống — chính chỗ này làm huy hiệu ra khối dày,
      // thay vì một cái đĩa dán phẳng lên đường.
      ctx.beginPath(); ctx.arc(0, 9, NODE_R + 5, 0, TAU);
      ctx.fillStyle = PAL[2]; ctx.fill();

      // vành ngoài
      ctx.beginPath(); ctx.arc(0, 0, NODE_R + 5, 0, TAU);
      ctx.fillStyle = open ? '#2a1c46' : '#232636'; ctx.fill();

      // mặt huy hiệu
      ctx.beginPath(); ctx.arc(0, 0, NODE_R, 0, TAU);
      const g = ctx.createLinearGradient(0, -NODE_R, 0, NODE_R);
      g.addColorStop(0, PAL[0]); g.addColorStop(.55, PAL[1]); g.addColorStop(1, PAL[2]);
      ctx.fillStyle = g; ctx.fill();

      ctx.save();
      ctx.beginPath(); ctx.arc(0, 0, NODE_R, 0, TAU); ctx.clip();
      // vành vát sáng ôm mép trên
      ctx.strokeStyle = 'rgba(255,255,255,.42)'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(0, 2, NODE_R - 3, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
      // chớp sáng
      ctx.fillStyle = 'rgba(255,255,255,.52)';
      ctx.beginPath(); ctx.ellipse(-NODE_R * .20, -NODE_R * .52, NODE_R * .50, NODE_R * .21, -.12, 0, TAU); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = open ? '#17203a' : '#1b1d2c'; ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.arc(0, 0, NODE_R, 0, TAU); ctx.stroke();

      if (open) {
        strokeText(ctx, String(lv.index), 0, 3,
          { font: FONT.disp(30), fill: '#fff', stroke: PAL[2], lw: 6, baseline: 'middle', shadow: 'rgba(0,0,0,.35)', sy: 3 });
      } else {
        icon.lock(ctx, 42);
      }

      // huy hiệu chế độ Bắn Đá
      if (open && lv.mode === 'shoot') {
        ctx.save();
        ctx.translate(NODE_R * .74, NODE_R * .74);
        ctx.beginPath(); ctx.arc(0, 2, 13, 0, TAU);
        ctx.fillStyle = '#120a20'; ctx.fill();
        ctx.beginPath(); ctx.arc(0, 0, 13, 0, TAU);
        ctx.fillStyle = '#2b1740'; ctx.fill();
        ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 2.5; ctx.stroke();
        ctx.fillStyle = '#ffd23f';
        ctx.beginPath(); ctx.arc(0, 2, 4.2, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(0, -8); ctx.stroke();
        ctx.restore();
      }

      // sao — vòng cung trên đỉnh, sao ăn được thì to và nhún theo nhịp
      if (open) for (let k = 0; k < 3; k++) {
        const a2 = -Math.PI / 2 + (k - 1) * .42;
        const got = k < st;
        const lift = got ? Math.sin(this.t * 2.4 + k * .7) * 2 : 0;
        ctx.save();
        ctx.translate(Math.cos(a2) * (NODE_R + 17), Math.sin(a2) * (NODE_R + 17) + lift);
        ctx.rotate((k - 1) * .30);
        if (got) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          const sg = ctx.createRadialGradient(0, 0, 0, 0, 0, 20);
          sg.addColorStop(0, 'rgba(255,220,120,.55)'); sg.addColorStop(1, 'rgba(255,200,80,0)');
          ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(0, 0, 20, 0, TAU); ctx.fill();
          ctx.restore();
          icon.star(ctx, 27);
        } else icon.starEmpty(ctx, 22);
        ctx.restore();
      }

      // mũi tên nhún nhảy chỉ vào màn đang mở
      if (cur) {
        ctx.save();
        ctx.translate(0, -NODE_R - 52 - Math.abs(Math.sin(this.t * 3.4)) * 9);
        ctx.beginPath();
        ctx.moveTo(0, 14); ctx.lineTo(-11, -2); ctx.lineTo(-5, -2);
        ctx.lineTo(-5, -14); ctx.lineTo(5, -14); ctx.lineTo(5, -2); ctx.lineTo(11, -2);
        ctx.closePath();
        const ag = ctx.createLinearGradient(0, -14, 0, 14);
        ag.addColorStop(0, '#9ff59a'); ag.addColorStop(1, '#28902f');
        ctx.fillStyle = ag; ctx.fill();
        ctx.strokeStyle = '#12401a'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.stroke();
        ctx.restore();
      }

      ctx.restore();

      // dế đứng cạnh màn đang mở (vẽ ngoài phép biến đổi của nút)
      if (cur) G.hero.draw(ctx, x + 6, y + NODE_R + 52, 72, 1);
    }

    // ── đom đóm bay lượn ────────────────────────────────────────────────
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const f of this.flies) {
      const fx2 = f.x + Math.sin(this.t * .5 + f.ph) * 40;
      if (fx2 < this.scroll - 40 || fx2 > this.scroll + W + 40) continue;
      const fy2 = f.y + Math.sin(this.t * 1.3 + f.ph * 2) * 26;
      ctx.globalAlpha = .35 + .35 * Math.sin(this.t * 3 + f.ph);
      const g2 = ctx.createRadialGradient(fx2, fy2, 0, fx2, fy2, 9 * f.s);
      g2.addColorStop(0, '#fff6b0'); g2.addColorStop(1, 'rgba(255,240,150,0)');
      ctx.fillStyle = g2;
      ctx.beginPath(); ctx.arc(fx2, fy2, 9 * f.s, 0, TAU); ctx.fill();
    }
    ctx.restore();
    ctx.restore();

    // thanh trên: tài nguyên
    const res = (x, ic, val) => {
      ctx.save(); glassPanel(ctx, x, 22, 148, 56, 16); ctx.restore();
      ctx.save(); ctx.translate(x + 32, 50); ic(ctx, 36); ctx.restore();
      strokeText(ctx, String(val), x + 132, 51, { font: FONT.disp(24), fill: '#fff', stroke: '#1a0f30', lw: 5, align: 'right', baseline: 'middle' });
    };
    res(24, icon.pouch, G.save.gold);
    res(186, icon.flame, G.save.food);
    strokeText(ctx, t('mapTitle'), W / 2, 50, { font: FONT.disp(34), fill: '#fff', stroke: '#3a1d6e', lw: 7, baseline: 'middle' });

    for (const h of this.hits) {
      if (h.id === 'nest') textBtn(ctx, h.x, h.y, h.w, h.h, t('nest'),
        { press: h.press, hover: h.hover, colour: '#8b5fd6', dark: '#3b2263', lite: '#cfa8ff', font: FONT.disp(24) });
      else if (h.id === 'arena') textBtn(ctx, h.x, h.y, h.w, h.h, t('duelArena'),
        { press: h.press, hover: h.hover, colour: '#e8384f', dark: '#8c0f22', lite: '#ff9aa8', font: FONT.disp(22) });
      else if (h.id === 'shop') textBtn(ctx, h.x, h.y, h.w, h.h, t('shop'),
        { press: h.press, hover: h.hover, colour: '#f5a51e', dark: '#a34a05', lite: '#ffe08a', font: FONT.disp(22) });
      else if (h.id === 'world') roundBtn(ctx, h.x + 26, h.y + 26, 26, (c, s) => icon.map(c, s), { press: h.press, hover: h.hover });
      else if (h.id === 'help') roundBtn(ctx, h.x + 26, h.y + 26, 26, (c, s) => icon.help(c, s), { press: h.press, hover: h.hover });
      else if (h.id === 'lang') roundBtn(ctx, h.x + 26, h.y + 26, 26, (c, s) => icon.globe(c, s), { press: h.press, hover: h.hover });
      else roundBtn(ctx, h.x + 26, h.y + 26, 26, (c, s) => icon.note(c, s, !G.audio.muted), { press: h.press, hover: h.hover });
    }

    // bong bóng khi chọc dế
    if (this.bubble) {
      const b = this.bubble;
      ctx.save();
      ctx.globalAlpha = clamp((3.2 - b.t) / .5, 0, 1);
      const e = ease.outBack(clamp(b.t / .22, 0, 1));
      const txt = tx(b.p, 'vi');
      ctx.font = FONT.disp(20);
      const bw = ctx.measureText(txt).width + 44;
      ctx.translate(b.x, b.y); ctx.scale(e, e); ctx.translate(-b.x, -b.y);
      glassPanel(ctx, b.x - bw / 2, b.y - 26, bw, 50, 16,
        { top: 'rgba(60,40,16,.95)', bot: 'rgba(30,18,6,.96)', rim: 'rgba(255,214,110,.7)' });
      ctx.beginPath();
      ctx.moveTo(b.x - 12, b.y + 24); ctx.lineTo(b.x, b.y + 40); ctx.lineTo(b.x + 12, b.y + 24);
      ctx.closePath(); ctx.fillStyle = 'rgba(30,18,6,.96)'; ctx.fill();
      strokeText(ctx, txt, b.x, b.y - 1,
        { font: FONT.disp(20), fill: '#ffe066', stroke: '#3a2000', lw: 5, baseline: 'middle' });
      ctx.restore();
    }
    if (this.toastT > 0) {
      ctx.save(); ctx.globalAlpha = clamp(this.toastT, 0, 1);
      ctx.font = FONT.disp(20);
      const tw = ctx.measureText(this.toast).width + 52;
      glassPanel(ctx, W / 2 - tw / 2, 150, tw, 48, 14);
      strokeText(ctx, this.toast, W / 2, 174,
        { font: FONT.disp(20), fill: '#ffd0d8', stroke: '#3a0010', lw: 4, baseline: 'middle' });
      ctx.restore();
    }

    // gợi ý nội dung tuần sau
    strokeText(ctx, t('comingSoon'), W - 26, H - 34,
      { font: FONT.ui(15, 600), fill: 'rgba(255,255,255,.7)', stroke: 'rgba(0,0,0,.5)', lw: 3, align: 'right', baseline: 'middle' });
  },
};

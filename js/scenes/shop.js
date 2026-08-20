// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  CỬA HÀNG — đổi VÀNG lấy đồ mặc.                                         ║
// ║                                                                          ║
// ║  Khác bàn Chế Tạo ở Tổ dế (đổi bằng nguyên liệu nhặt được): ở đây tiêu    ║
// ║  vàng, và giá tiền gắn liền với BỘ MẶT — bậc càng cao thì món đồ vẽ càng  ║
// ║  nhiều lớp, bậc 4 còn phát aura. Nhờ vậy người chơi nhìn nhân vật là biết ║
// ║  mình đã tiêu vào đâu, không phải mở bảng chỉ số ra dò.                   ║
// ║                                                                          ║
// ║  Bên trái là nhân vật thật, mặc đúng đồ đang chọn — bấm thử là thấy ngay. ║
// ╚══════════════════════════════════════════════════════════════════════════╝
import { TAU, clamp, lerp, ease, rgba, shade, strokeText, roundRect } from '../core/util.js';
import { t, tx } from '../core/i18n.js';
import { Hit, textBtn, card, glassPanel, roundBtn, icon, frostCard, pillTag, C, FONT } from '../ui/widgets.js';
import { SLOTS, SHOP, shopStock, eventNow, recipeById, gearBonus } from '../data/gear.js';
import { BREEDS, stageFor } from '../data/characters.js';
import { bleed } from '../core/layout.js';

const TIER_COL = ['#8d94a8', '#7fb861', '#4aa3e8', '#c08bff', '#ffb648'];
const TIER_NAME = ['', 'Thường', 'Khá', 'Quý', 'Xa xỉ'];
const TIER_NAME_EN = ['', 'Common', 'Fine', 'Rare', 'Lavish'];

export default {
  name: 'shop',

  enter(G, arg = {}) {
    this.after = arg.after || (() => G.go('nest'));
    this.t = 0;
    this.slot = 'helm';
    this.toast = null; this.toastT = 0;
    this.preview = { ...(G.save.equip || {}) };
    this.build(G);
    G.music('nest');
  },

  build(G) {
    const W = G.W, H = G.H;
    this.PX = Math.max(300, W * .30);                 // mép trái bảng hàng
    this.PW = Math.min(W - this.PX - 24, 640);
    this.hits = [
      new Hit('back', 24, H - 82, 150, 56, { act: () => { G.sfx('button'); this.after(); } }),
      ...SLOTS.map((sl, i) => new Hit('tab_' + sl.id, this.PX + i * 116, 92, 108, 46,
        { act: () => { this.slot = sl.id; G.sfx('select'); this.build(G); } })),
    ];
    const list = this.stock();
    list.forEach((g, i) => {
      const col = i % 2, row = (i / 2) | 0;
      const x = this.PX + col * (this.PW / 2), y = 156 + row * 104;
      this.hits.push(new Hit('it_' + g.id, x, y, this.PW / 2 - 12, 94, { act: () => this.tap(G, g) }));
    });
  },

  stock() { return shopStock().filter(g => g.slot === this.slot); },

  /** Chưa mua → mua. Đã mua → mặc vào (bấm lại thì cởi ra). */
  tap(G, g) {
    const S = G.save;
    S.owned = S.owned || {};
    if (!S.owned[g.id]) {
      if (S.gold < g.price) { this.say(G, t('shopPoor'), '#ff9aa8'); G.sfx('invalid'); return; }
      S.gold -= g.price; S.owned[g.id] = true;
      G.persist(); G.sfx('levelup');
      G.fx.sparkle(G.W * .16, G.H * .52, '#ffd23f', 22);
      this.say(G, t('shopBought', { n: tx(g, 'name') }), '#8ef08a');
      return;
    }
    S.equip = S.equip || {};
    S.equip[g.slot] = S.equip[g.slot] === g.id ? null : g.id;
    this.preview = { ...S.equip };
    G.persist(); G.sfx('button'); G.sess.gearAt = performance.now();
    if (g.aura && S.equip[g.slot] === g.id) G.fx.ring(G.W * .16, G.H * .52, g.aura, 10, 220, .5, 14);
  },

  say(G, msg, col) { this.toast = { msg, col }; this.toastT = 2.2; },

  update(G, dt) {
    this.t += dt;
    G.hero.update(dt);
    G.world.update(dt, 0);
    if (this.toastT > 0) this.toastT -= dt;
  },

  up(G, x, y) {},
  key(G, e) { if (e.key === 'Escape') this.after(); },

  draw(G, ctx) {
    const { W, H } = G, S = G.save;
    G.world.draw(ctx);
    ctx.fillStyle = 'rgba(20,12,42,.52)'; ctx.fillRect(...bleed(G));

    strokeText(ctx, t('shop'), W / 2, 44,
      { font: FONT.disp(34), fill: '#ffe066', stroke: '#3a1d6e', lw: 7, baseline: 'middle' });

    // ── túi vàng ────────────────────────────────────────────────────────
    glassPanel(ctx, 24, 22, 200, 56, 16);
    ctx.save(); ctx.translate(56, 50); icon.pouch(ctx, 36); ctx.restore();
    strokeText(ctx, String(S.gold), 204, 51,
      { font: FONT.disp(24), fill: '#fff', stroke: '#1a0f30', lw: 5, align: 'right', baseline: 'middle' });

    // ── nhân vật mặc thử ────────────────────────────────────────────────
    const cx = W * .16, cy = H * .56;
    glassPanel(ctx, 24, 96, this.PX - 56, H - 200, 22,
      { top: 'rgba(58,44,96,.92)', bot: 'rgba(26,18,52,.94)', rim: 'rgba(190,160,255,.5)' });
    G.hero.gear = { ...this.preview };
    G.hero.draw(ctx, cx + 26, cy + 20, 120, 1);
    const bon = gearBonus(S);
    frostCard(ctx, 40, H - 236, this.PX - 88, 118, 16);
    strokeText(ctx, tx(BREEDS.find(b => b.id === S.breed) || BREEDS[0], 'name'), cx, H - 212,
      { font: FONT.disp(24), fill: '#fff', stroke: '#2b4a6b', lw: 6, baseline: 'middle' });
    const rows = [[t('st_hp'), bon.hp], [t('st_atk'), bon.atk], [t('st_crit'), bon.crit + '%']];
    rows.forEach(([k, v], i) => {
      const yy = H - 184 + i * 22;
      strokeText(ctx, k, 60, yy, { font: FONT.ui(13, 700), fill: '#12324e', stroke: null, lw: 0, align: 'left', baseline: 'middle', shadow: null });
      strokeText(ctx, '+' + v, this.PX - 72, yy, { font: FONT.disp(16), fill: '#1d6b24', stroke: null, lw: 0, align: 'right', baseline: 'middle', shadow: null });
    });

    // ── thẻ ô trang bị ──────────────────────────────────────────────────
    SLOTS.forEach((sl, i) => {
      const h = this.hits.find(x => x.id === 'tab_' + sl.id); if (!h) return;
      const on = this.slot === sl.id;
      roundRect(ctx, h.x, h.y, h.w, h.h, 12);
      ctx.fillStyle = on ? 'rgba(255,214,110,.92)' : 'rgba(18,11,36,.72)'; ctx.fill();
      ctx.strokeStyle = on ? '#7a4a05' : 'rgba(255,255,255,.24)'; ctx.lineWidth = 2.4; ctx.stroke();
      strokeText(ctx, tx(sl, 'name'), h.x + h.w / 2, h.y + h.h / 2,
        { font: FONT.disp(18), fill: on ? '#2b1740' : '#cfc4ea', stroke: null, lw: 0, baseline: 'middle', shadow: null });
    });

    // ── bảng hàng ───────────────────────────────────────────────────────
    const ev = eventNow();
    for (const g of this.stock()) {
      const h = this.hits.find(x => x.id === 'it_' + g.id); if (!h) continue;
      const owned = !!S.owned?.[g.id], worn = S.equip?.[g.slot] === g.id;
      const afford = S.gold >= g.price;
      const tc = TIER_COL[g.tier] || TIER_COL[0];
      const y = h.y + h.press * 3;

      roundRect(ctx, h.x, y, h.w, h.h, 16);
      const bg = ctx.createLinearGradient(0, y, 0, y + h.h);
      bg.addColorStop(0, worn ? 'rgba(40,90,50,.92)' : owned ? 'rgba(40,28,66,.92)' : 'rgba(22,14,42,.90)');
      bg.addColorStop(1, worn ? 'rgba(18,44,26,.95)' : 'rgba(12,7,26,.95)');
      ctx.fillStyle = bg; ctx.fill();
      ctx.strokeStyle = worn ? '#8ef08a' : rgba(tc, .75); ctx.lineWidth = worn ? 3 : 2; ctx.stroke();

      // ô hình món đồ, viền theo bậc
      ctx.save();
      roundRect(ctx, h.x + 10, y + 12, 70, 70, 14);
      ctx.fillStyle = rgba(tc, .18); ctx.fill();
      ctx.strokeStyle = rgba(tc, .8); ctx.lineWidth = 2; ctx.stroke();
      if (g.aura) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const ag = ctx.createRadialGradient(h.x + 45, y + 47, 4, h.x + 45, y + 47, 42);
        ag.addColorStop(0, rgba(g.aura, .5 + .2 * Math.sin(this.t * 3)));
        ag.addColorStop(1, rgba(g.aura, 0));
        ctx.fillStyle = ag; ctx.beginPath(); ctx.arc(h.x + 45, y + 47, 42, 0, TAU); ctx.fill();
        ctx.restore();
      }
      ctx.translate(h.x + 45, y + 47);
      gearIcon(ctx, g.slot, 52, g.col);
      ctx.restore();

      // Tên phải CẮT BỚT nếu dài — không thì tên chồng lên giá, đọc ra chữ
      // lẫn số ("Vương Miện Sương4400").
      // Chừa đủ chỗ cho cả đồng xu lẫn con số (giá 4 chữ số + icon ≈ 104px).
      const nameMax = h.w - 92 - 112;
      let nm = tx(g, 'name');
      ctx.font = FONT.disp(19);
      if (ctx.measureText(nm).width > nameMax) {
        while (nm.length > 3 && ctx.measureText(nm + '…').width > nameMax) nm = nm.slice(0, -1);
        nm += '…';
      }
      strokeText(ctx, nm, h.x + 92, y + 28,
        { font: FONT.disp(19), fill: '#fff', stroke: '#12060f', lw: 4, align: 'left', baseline: 'middle' });
      strokeText(ctx, tx({ name: TIER_NAME[g.tier], name_en: TIER_NAME_EN[g.tier] }, 'name'), h.x + 92, y + 50,
        { font: FONT.ui(12, 800), fill: tc, stroke: null, lw: 0, align: 'left', baseline: 'middle', shadow: null });
      const bonus = Object.entries(g.add).map(([k, v]) => `${t('st_' + k)}+${v}`).join('  ');
      strokeText(ctx, bonus, h.x + 92, y + 72,
        { font: FONT.ui(12, 700), fill: '#cfe6ff', stroke: null, lw: 0, align: 'left', baseline: 'middle', shadow: null });

      if (g.event) {
        ctx.font = FONT.ui(11, 800);
        const w2 = ctx.measureText(t('ev_' + g.event)).width + 26;
        pillTag(ctx, h.x + h.w - w2 - 12, y + 10, w2, 24, { lite: '#ffd6a8', base: '#ff7a3a' });
        strokeText(ctx, t('ev_' + g.event), h.x + h.w - w2 / 2 - 12, y + 22,
          { font: FONT.ui(11, 800), fill: '#3a1000', stroke: null, lw: 0, baseline: 'middle', shadow: null });
      }

      // giá / trạng thái
      const lbl = worn ? t('worn') : owned ? t('wear') : String(g.price);
      const col2 = worn ? '#8ef08a' : owned ? '#cfa8ff' : afford ? '#ffe066' : '#ff9aa8';
      // Giá nằm GÓC TRÊN PHẢI, chỉ số nằm dưới — để chung một dòng thì món
      // nhiều chỉ số sẽ đè lên số tiền, đọc ra chữ lẫn số.
      const py2 = y + (g.event ? 44 : 26);
      if (!owned) { ctx.save(); ctx.translate(h.x + h.w - 78, py2); icon.coin(ctx, 22); ctx.restore(); }
      strokeText(ctx, lbl, h.x + h.w - (owned ? 14 : 62), py2,
        { font: FONT.disp(19), fill: col2, stroke: '#12060f', lw: 4, align: 'right', baseline: 'middle' });
    }

    if (!this.stock().length)
      strokeText(ctx, t('shopEmpty'), this.PX + this.PW / 2, 260,
        { font: FONT.ui(16, 600), fill: '#b0a4d0', stroke: null, lw: 0, baseline: 'middle', shadow: null });

    const b = this.hits.find(h => h.id === 'back');
    if (b) textBtn(ctx, b.x, b.y, b.w, b.h, t('back'),
      { press: b.press, hover: b.hover, colour: '#5b5f74', dark: '#33374a', lite: '#9aa0b6', font: FONT.disp(20) });

    if (this.toastT > 0 && this.toast) {
      ctx.save(); ctx.globalAlpha = clamp(this.toastT, 0, 1);
      ctx.font = FONT.disp(20);
      const tw = ctx.measureText(this.toast.msg).width + 52;
      glassPanel(ctx, W / 2 - tw / 2, H - 150, tw, 48, 14);
      strokeText(ctx, this.toast.msg, W / 2, H - 126,
        { font: FONT.disp(20), fill: this.toast.col, stroke: '#1a0f30', lw: 4, baseline: 'middle' });
      ctx.restore();
    }
  },

  exit(G) { G.hero.gear = { ...(G.save.equip || {}) }; },
};

/** Biểu tượng món đồ trong bảng hàng — cùng hình với ô trang bị ở Tổ dế. */
function gearIcon(ctx, slot, s, col) {
  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const ink = 'rgba(18,10,26,.75)';
  const body = () => {
    const g = ctx.createLinearGradient(-s * .34, -s * .40, s * .30, s * .40);
    g.addColorStop(0, shade(col, .46)); g.addColorStop(.48, col); g.addColorStop(1, shade(col, -.38));
    return g;
  };
  const paint = (lw = .085) => {
    ctx.fillStyle = body(); ctx.fill();
    ctx.strokeStyle = ink; ctx.lineWidth = s * lw; ctx.stroke();
  };
  if (slot === 'scarf') {
    ctx.beginPath();
    ctx.moveTo(-s * .36, -s * .18);
    ctx.quadraticCurveTo(0, -s * .34, s * .36, -s * .18);
    ctx.quadraticCurveTo(s * .16, s * .02, s * .10, s * .34);
    ctx.lineTo(-s * .04, s * .16);
    ctx.lineTo(-s * .16, s * .34);
    ctx.quadraticCurveTo(-s * .20, s * .00, -s * .36, -s * .18);
    ctx.closePath(); paint();
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = s * .05;
    ctx.beginPath(); ctx.moveTo(-s * .22, -s * .14); ctx.quadraticCurveTo(0, -s * .26, s * .22, -s * .14); ctx.stroke();
  } else if (slot === 'helm') {
    for (const d of [-1, 1]) {
      ctx.save(); ctx.translate(d * s * .27, -s * .26); ctx.rotate(d * .55);
      ctx.beginPath();
      ctx.moveTo(-s * .07, s * .12); ctx.quadraticCurveTo(0, -s * .34, s * .07, s * .12);
      ctx.closePath(); paint(.07); ctx.restore();
    }
    ctx.beginPath();
    ctx.moveTo(-s * .34, s * .14);
    ctx.bezierCurveTo(-s * .36, -s * .32, s * .36, -s * .32, s * .34, s * .14);
    ctx.quadraticCurveTo(0, s * .02, -s * .34, s * .14);
    ctx.closePath(); paint();
    ctx.fillStyle = 'rgba(255,255,255,.50)';
    ctx.beginPath(); ctx.ellipse(-s * .12, -s * .16, s * .16, s * .055, -.22, 0, TAU); ctx.fill();
  } else if (slot === 'armor') {
    ctx.beginPath();
    ctx.moveTo(0, -s * .40); ctx.lineTo(s * .30, -s * .30);
    ctx.bezierCurveTo(s * .36, -s * .04, s * .28, s * .24, 0, s * .42);
    ctx.bezierCurveTo(-s * .28, s * .24, -s * .36, -s * .04, -s * .30, -s * .30);
    ctx.closePath(); paint();
    ctx.beginPath(); ctx.moveTo(0, -s * .32); ctx.lineTo(0, s * .32);
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = s * .05; ctx.stroke();
  } else {
    ctx.save(); ctx.rotate(-.22);
    ctx.beginPath();
    ctx.moveTo(-s * .30, s * .34); ctx.lineTo(s * .12, -s * .12);
    ctx.strokeStyle = '#5f3c18'; ctx.lineWidth = s * .13; ctx.stroke();
    ctx.strokeStyle = '#9a6a34'; ctx.lineWidth = s * .075; ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s * .04, -s * .04);
    ctx.quadraticCurveTo(s * .30, -s * .40, s * .40, -s * .34);
    ctx.quadraticCurveTo(s * .40, -s * .10, s * .18, s * .10);
    ctx.closePath(); paint(.075);
    ctx.restore();
  }
  ctx.restore();
}

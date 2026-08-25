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
import { Hit, textBtn, card, glassPanel, roundBtn, icon, frostCard, pillLabel, C, FONT } from '../ui/widgets.js';
import { SLOTS, shopStock, eventNow, recipeById, gearBonus, sellPrice, canEquip } from '../data/gear.js';
import { STAGES } from '../data/characters.js';
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
    this.mode = arg.mode === 'bag' ? 'bag' : 'shop';   // cửa hàng | tủ đồ
    this.ask = null;                                   // hộp xác nhận mua/bán
    this.toast = null; this.toastT = 0;
    this.preview = { ...(G.save.equip || {}) };
    this.G = G;
    this.build(G);
    G.music('nest');
  },

  build(G) {
    const W = G.W, H = G.H;
    this.portrait = H > W;
    this.PX = this.portrait ? 18 : Math.max(300, W * .30);
    this.PW = this.portrait ? W - 36 : Math.min(W - this.PX - 24, 640);
    const modeY = this.portrait ? 500 : 34;
    const tabsY = this.portrait ? 558 : 92;
    const itemY = this.portrait ? 622 : 156;
    const tabGap = this.portrait ? 8 : 8;
    const tabW = this.portrait ? (this.PW - tabGap * (SLOTS.length - 1)) / SLOTS.length : 108;
    this.hits = [
      new Hit('back', 24, H - (this.portrait ? 88 : 82), this.portrait ? 180 : 150, this.portrait ? 64 : 56, { act: () => { G.sfx('button'); this.after(); } }),
      new Hit('m_shop', this.PX, modeY, 150, 44,
        { act: () => { this.mode = 'shop'; G.sfx('select'); this.build(G); } }),
      new Hit('m_bag', this.PX + 158, modeY, 150, 44,
        { act: () => { this.mode = 'bag'; G.sfx('select'); this.build(G); } }),
      ...SLOTS.map((sl, i) => new Hit('tab_' + sl.id, this.PX + i * (tabW + tabGap), tabsY, tabW, 46,
        { act: () => { this.slot = sl.id; G.sfx('select'); this.build(G); } })),
    ];
    const list = this.stock();
    list.forEach((g, i) => {
      const col = this.portrait ? 0 : i % 2, row = this.portrait ? i : (i / 2) | 0;
      const x = this.portrait ? this.PX + 8 : this.PX + col * (this.PW / 2);
      const y = itemY + row * (this.portrait ? 106 : 104);
      const w = this.portrait ? this.PW - 16 : this.PW / 2 - 12;
      this.hits.push(new Hit('it_' + g.id, x, y, w, this.portrait ? 98 : 94, { act: () => this.tap(G, g) }));
      // Trong tủ đồ mỗi món có nút BÁN riêng — gộp bán vào cùng chỗ bấm để
      // mặc thì sớm muộn cũng có người lỡ tay bán mất món đang dùng.
      if (this.mode === 'bag' && g.price)
        this.hits.push(new Hit('sell_' + g.id, x + w - 84, y + 58, 72, 28,
          { act: () => this.askSell(G, g) }));
    });
  },

  stock() {
    if (this.mode === 'bag') {
      // Đồ cửa hàng nay sinh theo ngày nên không còn danh sách cứng để lọc:
      // đi từ chính id người chơi đang sở hữu rồi dựng lại từng món.
      const own = this.G?.save?.owned || {};
      return Object.keys(own).filter(id => own[id]).map(recipeById)
        .filter(g => g && g.slot === this.slot)
        .sort((a, b) => (a.tier || 0) - (b.tier || 0));
    }
    return shopStock().filter(g => g.slot === this.slot);
  },

  /** Chưa mua → HỎI trước khi trừ tiền. Đã mua → mặc vào (bấm lại thì cởi). */
  tap(G, g) {
    const S = G.save;
    S.owned = S.owned || {};
    if (!S.owned[g.id]) {
      if (S.gold < g.price) { this.say(G, t('shopPoor'), '#ff9aa8'); G.sfx('invalid'); return; }
      this.askBuy(G, g);
      return;
    }
    // Chưa đủ lớn thì không mặc được — nói thẳng bằng chữ đỏ, đừng để người
    // chơi bấm hoài không hiểu vì sao món đồ vừa mua lại không lên người.
    const rq = canEquip(S, g);
    if (!rq.ok && S.equip?.[g.slot] !== g.id) {
      G.sfx('invalid');
      this.say(G, t('needStage', { s: tx(STAGES[rq.need], 'name') }), '#ff9aa8');
      return;
    }
    S.equip = S.equip || {};
    S.equip[g.slot] = S.equip[g.slot] === g.id ? null : g.id;
    this.preview = { ...S.equip };
    G.persist(); G.sfx('button'); G.sess.gearAt = performance.now();
    if (g.aura && S.equip[g.slot] === g.id) G.fx.ring(G.W * .16, G.H * .52, g.aura, 10, 220, .5, 14);
  },

  /**
   * Hộp xác nhận. Tiền là thứ khó lấy lại nhất trong game, nên mọi thao tác
   * đụng tới hầu bao đều phải hỏi một câu — kể cả bán, vì bán xong mua lại
   * còn lỗ hơn (bán 40%, mua 100%).
   */
  openAsk(G, kind, g, amount) {
    const W = G.W, H = G.H, bw = 460, bh = 250;
    const x = (W - bw) / 2, y = (H - bh) / 2;
    this.ask = {
      kind, g, amount, x, y, w: bw, h: bh, t: 0,
      // THỨ TỰ QUAN TRỌNG: lớp nhập liệu lấy Hit ĐẦU TIÊN phủ điểm chạm
      // (main.js: hitsOf().find(...)). Để tấm 'shade' phủ toàn màn ở đầu mảng
      // thì chính nó nuốt luôn nút Mua và Huỷ — bấm mãi không mua được. Nút
      // phải đứng TRƯỚC, tấm chắn đứng cuối.
      hits: [
        new Hit('ok', x + 36, y + bh - 78, 176, 54, { act: () => this.confirm(G) }),
        new Hit('no', x + bw - 212, y + bh - 78, 176, 54,
          { act: () => { G.sfx('button'); this.ask = null; this.build(G); } }),
        new Hit('shade', 0, 0, W, H, { act: () => {} }),   // nuốt cú bấm ra ngoài hộp
      ],
    };
    this.hits = this.ask.hits;
  },
  askBuy(G, g)  { G.sfx('select'); this.openAsk(G, 'buy', g, g.price); },
  askSell(G, g) { G.sfx('select'); this.openAsk(G, 'sell', g, sellPrice(g)); },

  confirm(G) {
    const A = this.ask; if (!A) return;
    const S = G.save, g = A.g;
    if (A.kind === 'buy') {
      if (S.gold < g.price) { this.say(G, t('shopPoor'), '#ff9aa8'); G.sfx('invalid'); this.ask = null; return; }
      S.gold -= g.price; S.owned[g.id] = true;
      G.persist(); G.sfx('levelup');
      G.fx.sparkle(G.W * .16, G.H * .52, '#ffd23f', 22);
      this.say(G, t('shopBought', { n: tx(g, 'name') }), '#8ef08a');
    } else {
      // Đang mặc thì cởi ra trước, kẻo bán rồi mà ô trang bị vẫn trỏ vào món
      // không còn trong tủ.
      if (S.equip?.[g.slot] === g.id) S.equip[g.slot] = null;
      delete S.owned[g.id];
      S.gold += A.amount;
      this.preview = { ...S.equip };
      G.persist(); G.sfx('coin');
      this.say(G, t('shopSold', { n: tx(g, 'name'), g: A.amount }), '#ffe066');
    }
    this.ask = null;
    this.build(G);
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

    // ── túi vàng ────────────────────────────────────────────────────────
    glassPanel(ctx, 24, 22, 200, 56, 16);
    ctx.save(); ctx.translate(56, 50); icon.pouch(ctx, 36); ctx.restore();
    strokeText(ctx, String(S.gold), 204, 51,
      { font: FONT.disp(24), fill: '#fff', stroke: '#1a0f30', lw: 5, align: 'right', baseline: 'middle' });

    // ── nhân vật mặc thử, đứng trên SÂN KHẤU ────────────────────────────
    // Khung phẳng một màu tím làm con dế chìm nghỉm, chữ chỉ số lại xanh nhạt
    // trên nền sáng nên đọc rất mệt. Nay có nền chuyển sắc + vệt sáng sau lưng,
    // và bảng chỉ số nền tối chữ sáng. Màu sân khấu ĐỔI THEO CHUỖI THẮNG đấu
    // trường: thắng càng nhiều, sân càng rực.
    const cx = this.portrait ? W / 2 : W * .16, cy = this.portrait ? 282 : H * .56;
    const px0 = this.portrait ? 18 : 24, py0 = this.portrait ? 88 : 96;
    const pw0 = this.portrait ? W - 36 : this.PX - 56, ph0 = this.portrait ? 392 : H - 200;
    const heroCx = this.portrait ? cx : cx + 26, heroCy = this.portrait ? cy : cy + 20;
    const streak = S.duelStreak || 0;
    const sk = streak >= 6 ? 3 : streak >= 4 ? 2 : streak >= 2 ? 1 : 0;
    const SKY = [
      { a: '#4b3a7e', b: '#1b1136', rim: 'rgba(190,160,255,.55)', glow: '#8f7ad8', name: '#cfa8ff' },
      { a: '#2f6b62', b: '#102a2a', rim: 'rgba(120,240,200,.6)',  glow: '#5fd8b0', name: '#8ef0c8' },
      { a: '#7a5a1e', b: '#2a1c08', rim: 'rgba(255,210,110,.75)', glow: '#ffc65a', name: '#ffd45c' },
      { a: '#8a2f1e', b: '#2c0c08', rim: 'rgba(255,140,80,.85)',  glow: '#ff8a3a', name: '#ff9a5c' },
    ][sk];
    glassPanel(ctx, px0, py0, pw0, ph0, 22, { top: SKY.a, bot: SKY.b, rim: SKY.rim });
    ctx.save();
    roundRect(ctx, px0, py0, pw0, ph0, 22); ctx.clip();
    // vệt sáng sau lưng
    const gl = ctx.createRadialGradient(heroCx, heroCy - 30, 8, heroCx, heroCy - 30, pw0 * .78);
    gl.addColorStop(0, rgba(SKY.glow, .55)); gl.addColorStop(1, rgba(SKY.glow, 0));
    ctx.fillStyle = gl; ctx.fillRect(px0, py0, pw0, ph0);
    // tia sáng quay chậm — càng thắng nhiều tia càng dày
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = .05 + sk * .04;
    for (let i = 0; i < 8 + sk * 4; i++) {
      const a = this.t * .12 + i * (TAU / (8 + sk * 4));
      ctx.save(); ctx.translate(heroCx, heroCy - 30); ctx.rotate(a);
      ctx.fillStyle = SKY.glow;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(pw0, -26); ctx.lineTo(pw0, 26); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    // bệ đứng
    ctx.beginPath(); ctx.ellipse(heroCx, heroCy + 76, Math.min(150, pw0 * .34), 18, 0, 0, TAU);
    ctx.fillStyle = 'rgba(0,0,0,.32)'; ctx.fill();
    ctx.restore();

    G.hero.gear = { ...this.preview };
    G.hero.draw(ctx, heroCx, heroCy, this.portrait ? 138 : 120, 1);

    // chuỗi thắng đấu trường
    if (streak >= 2)
      pillLabel(ctx, heroCx, py0 + 26, t('duelStreak', { n: streak }), SKY.glow, '#1a0f30');

    const bon = gearBonus(S);
    const cardY = this.portrait ? 348 : H - 236, cardH = 118;
    const cardX = this.portrait ? 40 : 40, cardW = this.portrait ? W - 80 : this.PX - 88;
    roundRect(ctx, cardX, cardY, cardW, cardH, 16);
    ctx.fillStyle = 'rgba(10,6,20,.82)'; ctx.fill();
    ctx.strokeStyle = SKY.rim; ctx.lineWidth = 2; ctx.stroke();
    strokeText(ctx, tx(BREEDS.find(b => b.id === S.breed) || BREEDS[0], 'name'), cardX + cardW / 2, cardY + 26,
      { font: FONT.disp(24), fill: SKY.name, stroke: '#12081f', lw: 6, baseline: 'middle' });
    const rows = [[t('st_hp'), bon.hp], [t('st_atk'), bon.atk], [t('st_crit'), bon.crit + '%']];
    rows.forEach(([k, v], i) => {
      const yy = cardY + 54 + i * 22;
      strokeText(ctx, k, cardX + 20, yy, { font: FONT.ui(13, 700), fill: '#cfc0f0', stroke: null, lw: 0, align: 'left', baseline: 'middle', shadow: null });
      strokeText(ctx, '+' + v, cardX + cardW - 20, yy, { font: FONT.disp(16), fill: '#8ef08a', stroke: '#0d2a12', lw: 3, align: 'right', baseline: 'middle' });
    });

    if (this.portrait)
      glassPanel(ctx, this.PX, 488, this.PW, H - 584, 22,
        { top: 'rgba(25,15,48,.90)', bot: 'rgba(10,6,24,.95)', rim: 'rgba(190,160,255,.40)' });

    // ── thẻ chế độ: Cửa hàng / Tủ đồ ────────────────────────────────────
    for (const [id, lbl] of [['m_shop', t('shop')], ['m_bag', t('bag')]]) {
      const h = this.hits.find(x2 => x2.id === id); if (!h) continue;
      const on = (id === 'm_shop') === (this.mode === 'shop');
      roundRect(ctx, h.x, h.y, h.w, h.h, 14);
      ctx.fillStyle = on ? 'rgba(140,95,214,.95)' : 'rgba(18,11,36,.72)'; ctx.fill();
      ctx.strokeStyle = on ? '#cfa8ff' : 'rgba(255,255,255,.22)'; ctx.lineWidth = 2.4; ctx.stroke();
      strokeText(ctx, lbl, h.x + h.w / 2, h.y + h.h / 2,
        { font: FONT.disp(19), fill: on ? '#fff' : '#b0a4d0', stroke: on ? '#3b2263' : null, lw: on ? 4 : 0, baseline: 'middle', shadow: null });
    }

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
      const tierTxt = tx({ name: TIER_NAME[g.tier], name_en: TIER_NAME_EN[g.tier] }, 'name');
      strokeText(ctx, tierTxt, h.x + 92, y + 50,
        { font: FONT.ui(12, 800), fill: tc, stroke: null, lw: 0, align: 'left', baseline: 'middle', shadow: null });
      // Chưa đủ lớn để mặc → báo ĐỎ ngay trên thẻ món, đừng để bấm rồi mới biết.
      const rqRow = canEquip(S, g);
      if (!rqRow.ok) {
        ctx.font = FONT.ui(12, 800);
        const tw2 = ctx.measureText(tierTxt).width;
        strokeText(ctx, '· ' + t('reqStage', { s: tx(STAGES[rqRow.need], 'name') }), h.x + 100 + tw2, y + 50,
          { font: FONT.ui(12, 800), fill: '#ff8a9c', stroke: '#3a0010', lw: 3, align: 'left', baseline: 'middle' });
      }
      // nút BÁN — chỉ có trong tủ đồ
      const sh = this.hits.find(x2 => x2.id === 'sell_' + g.id);
      if (sh) {
        roundRect(ctx, sh.x, sh.y + sh.press * 2, sh.w, sh.h, 15);
        ctx.fillStyle = 'rgba(200,70,50,.92)'; ctx.fill();
        ctx.strokeStyle = '#ff9a7a'; ctx.lineWidth = 2; ctx.stroke();
        strokeText(ctx, `${t('sell')} ${sellPrice(g)}`, sh.x + sh.w / 2, sh.y + sh.h / 2 + sh.press * 2,
          { font: FONT.ui(12, 800), fill: '#fff', stroke: '#4a0f00', lw: 3, baseline: 'middle', shadow: null });
      }

      // Trong tủ đồ có nút Bán chiếm góc phải → cắt bớt dòng chỉ số cho khỏi đè.
      let bonus = Object.entries(g.add).map(([k, v]) => `${t('st_' + k)}+${v}`).join('  ');
      if (sh) {
        ctx.font = FONT.ui(12, 700);
        const room = sh.x - (h.x + 92) - 10;
        while (bonus.length > 4 && ctx.measureText(bonus + '…').width > room) bonus = bonus.slice(0, -1);
        if (ctx.measureText(Object.entries(g.add).map(([k, v]) => `${t('st_' + k)}+${v}`).join('  ')).width > room) bonus += '…';
      }
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
      strokeText(ctx, t('shopEmpty'), this.PX + this.PW / 2, this.portrait ? 720 : 260,
        { font: FONT.ui(16, 600), fill: '#b0a4d0', stroke: null, lw: 0, baseline: 'middle', shadow: null });

    const b = this.hits.find(h => h.id === 'back');
    if (b) textBtn(ctx, b.x, b.y, b.w, b.h, t('back'),
      { press: b.press, hover: b.hover, colour: '#5b5f74', dark: '#33374a', lite: '#9aa0b6', font: FONT.disp(20) });

    // ── HỘP XÁC NHẬN ────────────────────────────────────────────────────
    if (this.ask) {
      const A = this.ask, buy = A.kind === 'buy';
      A.t = Math.min(1, A.t + 1 / 30);
      const k = ease.outBack(clamp(A.t, 0, 1));
      ctx.fillStyle = `rgba(8,4,18,${.62 * clamp(A.t * 2, 0, 1)})`; ctx.fillRect(...bleed(G));
      ctx.save();
      ctx.translate(A.x + A.w / 2, A.y + A.h / 2); ctx.scale(.88 + .12 * k, .88 + .12 * k);
      ctx.translate(-(A.x + A.w / 2), -(A.y + A.h / 2));
      glassPanel(ctx, A.x, A.y, A.w, A.h, 24);
      strokeText(ctx, buy ? t('askBuy') : t('askSell'), A.x + A.w / 2, A.y + 40,
        { font: FONT.disp(24), fill: buy ? '#ffe066' : '#ff9a7a', stroke: '#2b1740', lw: 5, baseline: 'middle' });
      ctx.save(); ctx.translate(A.x + 74, A.y + 108); gearIcon(ctx, A.g.slot, 60, A.g.col); ctx.restore();
      strokeText(ctx, tx(A.g, 'name'), A.x + 122, A.y + 92,
        { font: FONT.disp(22), fill: '#fff', stroke: '#12060f', lw: 4, align: 'left', baseline: 'middle' });
      ctx.save(); ctx.translate(A.x + 136, A.y + 124); icon.coin(ctx, 26); ctx.restore();
      strokeText(ctx, String(A.amount), A.x + 156, A.y + 124,
        { font: FONT.disp(26), fill: buy ? '#ffe066' : '#8ef08a', stroke: '#4a2d00', lw: 5, align: 'left', baseline: 'middle' });
      strokeText(ctx, buy ? t('askAfter', { g: S.gold - A.amount }) : t('askAfter', { g: S.gold + A.amount }),
        A.x + A.w / 2, A.y + 158,
        { font: FONT.ui(14, 700), fill: '#b0a4d0', stroke: null, lw: 0, baseline: 'middle', shadow: null });
      for (const h of A.hits) {
        if (h.id === 'ok') textBtn(ctx, h.x, h.y, h.w, h.h, buy ? t('askYesBuy') : t('askYesSell'),
          { press: h.press, hover: h.hover, colour: buy ? '#3fbf4a' : '#e8384f',
            dark: buy ? '#1d6b24' : '#8c0f22', lite: buy ? '#8ef08a' : '#ff9aa8', font: FONT.disp(20) });
        if (h.id === 'no') textBtn(ctx, h.x, h.y, h.w, h.h, t('cancel'),
          { press: h.press, hover: h.hover, colour: '#5b5f74', dark: '#33374a', lite: '#9aa0b6', font: FONT.disp(20) });
      }
      ctx.restore();
    }

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

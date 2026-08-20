// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  NGUYÊN LIỆU · CHẾ TẠO · TRANG BỊ                                        ║
// ║                                                                          ║
// ║  Vòng lặp: chơi màn / thắng tỉ thí  →  rơi nguyên liệu  →  chế tạo đồ     ║
// ║  →  mặc vào người  →  mạnh hơn ở TRẬN TỈ THÍ (và cả trong màn ghép đá).   ║
// ║  Chỉ số cộng thẳng vào heroPower() nên tác dụng thấy ngay, không mơ hồ.   ║
// ╚══════════════════════════════════════════════════════════════════════════╝

/** Nguyên liệu nhặt được. `w` = trọng số rơi (càng lớn càng hay gặp). */
export const MATS = {
  vo:   { id: 'vo',   name: 'Vỏ Hạt',    name_en: 'Seed Husk',   col: '#d8a860', w: 30 },
  to:   { id: 'to',   name: 'Tơ Nhện',   name_en: 'Spider Silk', col: '#e8eefc', w: 24 },
  nhua: { id: 'nhua', name: 'Nhựa Cây',  name_en: 'Tree Resin',  col: '#e0902c', w: 20 },
  da:   { id: 'da',   name: 'Đá Suối',   name_en: 'River Stone', col: '#8fa3bd', w: 16 },
  sung: { id: 'sung', name: 'Mảnh Sừng', name_en: 'Horn Shard',  col: '#f2e2a8', w: 12 },
  canh: { id: 'canh', name: 'Cánh Khô',  name_en: 'Dried Wing',  col: '#b98ad8', w: 8  },
};
export const MAT_LIST = Object.values(MATS);

export const SLOTS = [
  { id: 'helm',   name: 'Mũ',     name_en: 'Helm' },
  { id: 'scarf',  name: 'Khăn',   name_en: 'Scarf' },
  { id: 'armor',  name: 'Giáp',   name_en: 'Armour' },
  { id: 'weapon', name: 'Vũ khí', name_en: 'Weapon' },
];

/**
 * Công thức chế tạo. `add` cộng thẳng vào chỉ số chiến đấu:
 *   hp · atk · crit (%) · charge (tốc độ nạp đòn Gồng)
 */
export const RECIPES = [
  { id: 'helm1', slot: 'helm',   tier: 1, name: 'Mũ Vỏ Hạt',    name_en: 'Husk Cap',
    cost: { vo: 4 },                     add: { hp: 12 },              col: '#c98a4e' },
  { id: 'helm2', slot: 'helm',   tier: 2, name: 'Mũ Sừng Đôi',  name_en: 'Twin-Horn Helm',
    cost: { sung: 4, vo: 4, nhua: 2 },   add: { hp: 26, atk: 2 },      col: '#f2e2a8' },
  { id: 'helm3', slot: 'helm',   tier: 3, name: 'Mũ Đá Suối',   name_en: 'Riverstone Helm',
    cost: { da: 8, sung: 5, nhua: 4 },   add: { hp: 46, atk: 3, crit: 3 }, col: '#8fa3bd' },

  { id: 'arm1',  slot: 'armor',  tier: 1, name: 'Áo Tơ',        name_en: 'Silk Vest',
    cost: { to: 5 },                     add: { hp: 18 },              col: '#e8eefc' },
  { id: 'arm2',  slot: 'armor',  tier: 2, name: 'Giáp Nhựa',    name_en: 'Resin Plate',
    cost: { nhua: 6, vo: 5 },            add: { hp: 38, crit: 2 },     col: '#e0902c' },
  { id: 'arm3',  slot: 'armor',  tier: 3, name: 'Giáp Đá',      name_en: 'Stone Plate',
    cost: { da: 10, nhua: 6, to: 5 },    add: { hp: 68, atk: 2 },      col: '#8fa3bd' },

  { id: 'wep1',  slot: 'weapon', tier: 1, name: 'Vuốt Sừng',    name_en: 'Horn Claw',
    cost: { sung: 3, vo: 3 },            add: { atk: 5 },              col: '#f2e2a8' },
  { id: 'wep2',  slot: 'weapon', tier: 2, name: 'Roi Cánh',     name_en: 'Wing Whip',
    cost: { canh: 4, to: 5 },            add: { atk: 8, crit: 6 },     col: '#b98ad8' },
  { id: 'wep3',  slot: 'weapon', tier: 3, name: 'Chuỳ Đá',      name_en: 'Stone Maul',
    cost: { da: 9, sung: 6, canh: 3 },   add: { atk: 15, charge: 0.3 }, col: '#8fa3bd' },
];

/**
 * ╔════════════════════════════════════════════════════════════════════════╗
 * ║  CỬA HÀNG — mua bằng VÀNG, khác bàn chế tạo (đổi bằng nguyên liệu).     ║
 * ╚════════════════════════════════════════════════════════════════════════╝
 *
 * BẬC quyết định CẢ hai mặt, cố ý gắn liền nhau để giá tiền có nghĩa:
 *   bậc 1  rẻ    · chỉ số nhẹ      · vẽ trơn, một màu
 *   bậc 2  vừa   · chỉ số khá      · thêm hoa văn
 *   bậc 3  đắt   · chỉ số mạnh     · thêm viền kim loại + đá quý
 *   bậc 4  xa xỉ · chỉ số rất mạnh · CÓ AURA — vầng sáng bao quanh nhân vật
 *
 * Mặc nhiều món bậc 4 thì aura chồng lên nhau, đậm dần — người chơi thấy ngay
 * tiền mình bỏ ra đi đâu.
 *
 * `event` = đồ theo mùa, chỉ bày bán đúng dịp (xem eventNow()).
 * Toàn bộ TỰ VẼ bằng code, không mượn hình của ai — bản quyền thuộc 9bricks.
 */
export const SHOP = [
  // ── MŨ ────────────────────────────────────────────────────────────────
  { id: 'sh_helm1', slot: 'helm', tier: 1, price: 180,  col: '#cbb98a', art: 'nonla',
    name: 'Nón Lá Con',       name_en: 'Little Palm Hat',   add: { hp: 10 } },
  { id: 'sh_helm2', slot: 'helm', tier: 2, price: 640,  col: '#d8a35c', art: 'shell',
    name: 'Mũ Vỏ Ốc',         name_en: 'Snail-Shell Cap',   add: { hp: 24, atk: 2 } },
  { id: 'sh_helm3', slot: 'helm', tier: 3, price: 1900, col: '#9fb4d8', art: 'horned',
    name: 'Mũ Giáp Sừng',     name_en: 'Horned Warhelm',    add: { hp: 44, atk: 4, crit: 3 } },
  { id: 'sh_helm4', slot: 'helm', tier: 4, price: 4400, col: '#bfe6ff', art: 'crown', aura: '#8fd8ff',
    name: 'Vương Miện Sương', name_en: 'Dewlight Crown',    add: { hp: 70, atk: 6, crit: 5 } },

  // ── KHĂN ──────────────────────────────────────────────────────────────
  { id: 'sh_scf1', slot: 'scarf', tier: 1, price: 150,  col: '#c9a86e', art: 'plain',
    name: 'Khăn Rơm',         name_en: 'Straw Wrap',         add: { hp: 8 } },
  { id: 'sh_scf2', slot: 'scarf', tier: 2, price: 590,  col: '#3f6fb0', art: 'stripe',
    name: 'Khăn Lụa Chàm',    name_en: 'Indigo Silk Scarf',  add: { hp: 20, crit: 2 } },
  { id: 'sh_scf3', slot: 'scarf', tier: 3, price: 1750, col: '#e0b23c', art: 'broc',
    name: 'Khăn Gấm Vàng',    name_en: 'Gold Brocade Scarf', add: { hp: 36, atk: 3, crit: 4 } },
  { id: 'sh_scf4', slot: 'scarf', tier: 4, price: 4100, col: '#e8d8ff', art: 'cloud', aura: '#c9a8ff',
    name: 'Khăn Mây Bay',     name_en: 'Driftcloud Scarf',   add: { hp: 58, atk: 4, charge: .2 } },

  // ── GIÁP ──────────────────────────────────────────────────────────────
  { id: 'sh_arm1', slot: 'armor', tier: 1, price: 200,  col: '#c2a06a', art: 'plain',
    name: 'Áo Vỏ Trấu',       name_en: 'Chaff Jerkin',       add: { hp: 16 } },
  { id: 'sh_arm2', slot: 'armor', tier: 2, price: 700,  col: '#d3703a', art: 'stripe',
    name: 'Giáp Cánh Cam',    name_en: 'Amber Wing Plate',   add: { hp: 40, crit: 2 } },
  { id: 'sh_arm3', slot: 'armor', tier: 3, price: 2050, col: '#5fbfa8', art: 'broc',
    name: 'Giáp Vảy Ngọc',    name_en: 'Jade Scale Plate',   add: { hp: 76, atk: 3 } },
  { id: 'sh_arm4', slot: 'armor', tier: 4, price: 4700, col: '#ffb648', art: 'cloud', aura: '#ffb44a',
    name: 'Giáp Hổ Phách',    name_en: 'Amberheart Plate',   add: { hp: 120, atk: 5, crit: 3 } },

  // ── VŨ KHÍ ────────────────────────────────────────────────────────────
  { id: 'sh_wep1', slot: 'weapon', tier: 1, price: 190,  col: '#a8c46a', art: 'plain',
    name: 'Gậy Trúc',         name_en: 'Bamboo Stick',       add: { atk: 4 } },
  { id: 'sh_wep2', slot: 'weapon', tier: 2, price: 720,  col: '#8ed86a', art: 'stripe',
    name: 'Kiếm Lá Sắc',      name_en: 'Keen Leaf Blade',    add: { atk: 9, crit: 4 } },
  { id: 'sh_wep3', slot: 'weapon', tier: 3, price: 2150, col: '#b98a4e', art: 'broc',
    name: 'Búa Hạt Dẻ',       name_en: 'Chestnut Maul',      add: { atk: 17, charge: .25 } },
  { id: 'sh_wep4', slot: 'weapon', tier: 4, price: 4900, col: '#eaf4ff', art: 'cloud', aura: '#eaf4ff',
    name: 'Đao Ánh Trăng',    name_en: 'Moonedge Glaive',    add: { atk: 26, crit: 8, charge: .3 } },

  // ── ĐỒ THEO MÙA ───────────────────────────────────────────────────────
  { id: 'ev_lan', slot: 'helm',  tier: 4, price: 3200, col: '#e83a3a', art: 'lion',
    aura: '#ff5a3a', event: 'tet',
    name: 'Mũ Lân Tết',       name_en: 'New-Year Lion Cap',  add: { hp: 60, atk: 6, crit: 4 } },
  { id: 'ev_sao', slot: 'scarf', tier: 4, price: 3200, col: '#ffd23f', art: 'star',
    aura: '#ffd23f', event: 'trungthu',
    name: 'Khăn Đèn Sao',     name_en: 'Star-Lantern Sash',  add: { hp: 48, atk: 5, charge: .25 } },
  { id: 'ev_ma',  slot: 'scarf', tier: 4, price: 3200, col: '#8ef08a', art: 'ghost',
    aura: '#8ef08a', event: 'halloween',
    name: 'Khăn Lân Tinh',    name_en: 'Wisplight Sash',     add: { hp: 48, crit: 8 } },
];

/** Dịp nào đang tới → chỉ dịp đó mới bày đồ mùa. Theo lịch của máy. */
export function eventNow(now = new Date()) {
  const m = now.getMonth() + 1, d = now.getDate();
  if (m === 1 || (m === 2 && d <= 20)) return 'tet';
  if (m === 8 || (m === 9 && d <= 20)) return 'trungthu';
  if (m === 10) return 'halloween';
  return null;
}

/** Món đang bày bán: hàng thường + đúng một dòng đồ mùa. */
export const shopStock = (ev = eventNow()) => SHOP.filter(g => !g.event || g.event === ev);

/** Mọi món đồ, dù chế ra hay mua về — cùng dùng chung ô trang bị. */
export const ALL_GEAR = [...RECIPES, ...SHOP];
export const recipeById = (id) => ALL_GEAR.find(r => r.id === id) || null;

/** Tổng aura: mỗi món bậc 4 đang mặc góp một vầng sáng. */
export function auraOf(save) {
  const cols = [];
  for (const sl of SLOTS) {
    const g = recipeById(save.equip?.[sl.id]);
    if (g?.aura) cols.push(g.aura);
  }
  return cols;
}

/** Có đủ nguyên liệu chưa? */
export const canCraft = (save, r) =>
  Object.entries(r.cost).every(([m, n]) => (save.mats?.[m] || 0) >= n);

/** Tổng chỉ số cộng thêm từ đồ ĐANG MẶC. */
export function gearBonus(save) {
  const out = { hp: 0, atk: 0, crit: 0, charge: 0 };
  for (const slot of SLOTS) {
    const r = recipeById(save.equip?.[slot.id]);
    if (!r) continue;
    for (const [k, v] of Object.entries(r.add)) out[k] += v;
  }
  return out;
}

/** Bốc `n` nguyên liệu theo trọng số; càng sâu màn càng dễ ra đồ hiếm. */
export function rollMats(n, depth = 0) {
  const pool = MAT_LIST.map(m => ({ id: m.id, w: m.w + depth * (m.w < 18 ? 0.55 : 0) }));
  const total = pool.reduce((a, p) => a + p.w, 0);
  const out = {};
  for (let i = 0; i < n; i++) {
    let r = Math.random() * total;
    for (const p of pool) { r -= p.w; if (r <= 0) { out[p.id] = (out[p.id] || 0) + 1; break; } }
  }
  return out;
}

/** Cộng nguyên liệu vào kho, trả lại chính bảng vừa cộng để hiện thông báo. */
export function addMats(save, got) {
  save.mats = save.mats || {};
  for (const [k, v] of Object.entries(got)) save.mats[k] = (save.mats[k] || 0) + v;
  return got;
}

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

export const recipeById = (id) => RECIPES.find(r => r.id === id) || null;

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

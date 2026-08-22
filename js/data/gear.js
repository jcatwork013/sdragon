// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  NGUYÊN LIỆU · CHẾ TẠO · TRANG BỊ                                        ║
// ║                                                                          ║
// ║  Vòng lặp: chơi màn / thắng tỉ thí  →  rơi nguyên liệu  →  chế tạo đồ     ║
// ║  →  mặc vào người  →  mạnh hơn ở TRẬN TỈ THÍ (và cả trong màn ghép đá).   ║
// ║  Chỉ số cộng thẳng vào heroPower() nên tác dụng thấy ngay, không mơ hồ.   ║
// ╚══════════════════════════════════════════════════════════════════════════╝

import { mulberry32 } from '../core/util.js';
import { STAGES } from './characters.js';

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
/**
 * ── CỬA HÀNG TỰ SINH ĐỒ ────────────────────────────────────────────────────
 *
 * Trước đây cửa hàng là 16 món cố định: mua hết một lượt là hết chuyện, mà giá
 * lại rẻ so với tiền kiếm được nên chẳng phải cân nhắc gì. Nay mỗi NGÀY sinh
 * một lô hàng mới từ bảng chất liệu + ngân sách chỉ số theo bậc.
 *
 * Id mã hoá đủ dữ liệu để dựng lại đúng món đó ("g-<seed36>-<ô>-<bậc>"), nên đồ
 * đã mua vẫn còn nguyên trong tủ khi cửa hàng đã đổi hàng khác.
 */
const G_MAT = [
  { vi: 'Vỏ Ốc',     en: 'Snail-Shell', col: '#d8a35c' },
  { vi: 'Tơ Chàm',   en: 'Indigo Silk', col: '#3f6fb0' },
  { vi: 'Gấm Vàng',  en: 'Gold Brocade', col: '#e0b23c' },
  { vi: 'Đá Suối',   en: 'Riverstone',  col: '#9fb4d8' },
  { vi: 'Hổ Phách',  en: 'Amber',       col: '#ffb648' },
  { vi: 'Cánh Sương', en: 'Dewwing',    col: '#bfe6ff' },
  { vi: 'Vỏ Trấu',   en: 'Chaff',       col: '#c2a06a' },
  { vi: 'Rễ Cỏ',     en: 'Grassroot',   col: '#7fb861' },
  { vi: 'Mảnh Sừng', en: 'Hornshard',   col: '#f2e2a8' },
  { vi: 'Ngọc Rêu',  en: 'Mossjade',    col: '#5fbfa8' },
  { vi: 'Lá Khô',    en: 'Dryleaf',     col: '#b98a4e' },
  { vi: 'Trăng Non', en: 'New-Moon',    col: '#eaf4ff' },
];
const G_EPI = [
  { vi: 'Đêm Mưa',   en: 'of Rainy Night' },
  { vi: 'Gió Đồng',  en: 'of Field Wind' },
  { vi: 'Cỏ Cháy',   en: 'of Burnt Grass' },
  { vi: 'Sương Sớm', en: 'of Dawn Mist' },
  { vi: 'Bờ Ruộng',  en: 'of the Paddy Bank' },
  { vi: 'Tiếng Gáy', en: 'of the Chirp' },
];
const G_NOUN = {
  helm:   [null, { vi: 'Nón',  en: 'Cap' },   { vi: 'Mũ',   en: 'Helm' },  { vi: 'Mũ Giáp',  en: 'Warhelm' },     { vi: 'Vương Miện', en: 'Crown' }],
  scarf:  [null, { vi: 'Khăn', en: 'Wrap' },  { vi: 'Khăn', en: 'Scarf' }, { vi: 'Khăn Gấm', en: 'Brocade Sash' }, { vi: 'Khăn Mây',   en: 'Cloudsash' }],
  armor:  [null, { vi: 'Áo',   en: 'Jerkin' },{ vi: 'Giáp', en: 'Plate' }, { vi: 'Giáp Vỏ',  en: 'Shell Plate' },  { vi: 'Giáp Ngọc',  en: 'Jade Aegis' }],
  weapon: [null, { vi: 'Gậy',  en: 'Stick' }, { vi: 'Kiếm', en: 'Blade' }, { vi: 'Búa',      en: 'Maul' },         { vi: 'Đao',        en: 'Glaive' }],
};
// Ngân sách chỉ số: mỗi ô một kiểu người, không phải cùng một cục điểm chia đều.
const G_BUILD = {
  helm:   [null, { hp: [10, 20] },  { hp: [24, 40], atk: [1, 3] },  { hp: [44, 80], atk: [3, 6], crit: [2, 4] },   { hp: [80, 140], atk: [5, 9], crit: [3, 6] }],
  scarf:  [null, { hp: [8, 16] },   { hp: [18, 34], crit: [1, 3] }, { hp: [32, 58], atk: [2, 4], crit: [3, 6] },   { hp: [52, 96], atk: [3, 6], charge: [.15, .30] }],
  armor:  [null, { hp: [14, 26] },  { hp: [34, 56], crit: [1, 3] }, { hp: [66, 110], atk: [2, 5] },                { hp: [110, 180], atk: [4, 8], crit: [2, 5] }],
  weapon: [null, { atk: [3, 6] },   { atk: [8, 13], crit: [2, 5] }, { atk: [15, 22], charge: [.15, .30] },         { atk: [24, 34], crit: [6, 11], charge: [.20, .40] }],
};
// Giá theo bậc — cố ý dốc: bậc 4 là mục tiêu của cả chương, không phải món mua
// cho vui sau vài màn.
const G_PRICE = [null, [280, 380], [1200, 1600], [3800, 5200], [11000, 16000]];
const G_ART = {
  helm:  [null, 'nonla', 'shell', 'horned', 'crown'],
  other: [null, 'plain', 'stripe', 'broc', 'cloud'],
};

const _pick = (R, arr) => arr[Math.floor(R() * arr.length) % arr.length];

/** Dựng lại chính xác một món từ id "g-<seed36>-<ô>-<bậc>". */
export function genGear(id) {
  const m = /^g-([0-9a-z]+)-(helm|scarf|armor|weapon)-([1-4])$/.exec(id);
  if (!m) return null;
  const seed = parseInt(m[1], 36), slot = m[2], tier = Number(m[3]);
  const R = mulberry32(seed >>> 0);
  const mat = _pick(R, G_MAT), noun = G_NOUN[slot][tier];
  const epi = tier >= 3 && R() < .62 ? _pick(R, G_EPI) : null;
  const build = G_BUILD[slot][tier];
  const add = {};
  let sum = 0, n = 0;
  for (const [k, range] of Object.entries(build)) {
    const raw = range[0] + R() * (range[1] - range[0]);
    add[k] = k === 'charge' ? Math.round(raw * 20) / 20 : Math.round(raw);
    sum += (raw - range[0]) / Math.max(1e-6, range[1] - range[0]); n++;
  }
  const quality = n ? sum / n : .5;                     // 0 = đáy khung, 1 = kịch khung
  const [p0, p1] = G_PRICE[tier];
  const price = Math.round((p0 + (p1 - p0) * quality) / 10) * 10;
  const art = (slot === 'helm' ? G_ART.helm : G_ART.other)[tier];
  return {
    id, slot, tier, price, add, col: mat.col, art,
    aura: tier >= 4 ? mat.col : undefined,
    name:    `${noun.vi} ${mat.vi}${epi ? ' ' + epi.vi : ''}`,
    name_en: `${mat.en} ${noun.en}${epi ? ' ' + epi.en : ''}`,
  };
}

/** Ngày thứ mấy kể từ mốc Unix — lô hàng đổi theo ngày. */
export const shopDay = (now = Date.now()) => Math.floor(now / 86400000);

/** Lô hàng của một ngày: mỗi ô 4 bậc. */
export function rollStock(day = shopDay()) {
  const out = [];
  ['helm', 'scarf', 'armor', 'weapon'].forEach((slot, si) => {
    for (let tier = 1; tier <= 4; tier++) {
      const seed = ((day * 9176 + si * 733 + tier * 97) >>> 0) % 2176782336;   // 36^6
      out.push(genGear(`g-${seed.toString(36)}-${slot}-${tier}`));
    }
  });
  return out.filter(Boolean);
}

/** Đồ theo mùa — vẫn làm tay vì mỗi món có hình riêng. */
export const EVENT_GEAR = [
  { id: 'ev_lan', slot: 'helm',  tier: 4, price: 9800, col: '#e83a3a', art: 'lion',
    aura: '#ff5a3a', event: 'tet',
    name: 'Mũ Lân Tết',       name_en: 'New-Year Lion Cap',  add: { hp: 60, atk: 6, crit: 4 } },
  { id: 'ev_sao', slot: 'scarf', tier: 4, price: 9800, col: '#ffd23f', art: 'star',
    aura: '#ffd23f', event: 'trungthu',
    name: 'Khăn Đèn Sao',     name_en: 'Star-Lantern Sash',  add: { hp: 48, atk: 5, charge: .25 } },
  { id: 'ev_ma',  slot: 'scarf', tier: 4, price: 9800, col: '#8ef08a', art: 'ghost',
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
/** Món đang bày bán: lô sinh trong ngày + đúng một dòng đồ mùa (nếu đang dịp). */
export const shopStock = (ev = eventNow(), day = shopDay()) =>
  [...rollStock(day), ...EVENT_GEAR.filter(g => g.event === ev)];

/** Mọi món LÀM TAY (chế tạo + đồ mùa). Đồ cửa hàng nay sinh theo id. */
export const ALL_GEAR = [...RECIPES, ...EVENT_GEAR];
export const recipeById = (id) =>
  (typeof id === 'string' && id.startsWith('g-') ? genGear(id) : null)
  || ALL_GEAR.find(r => r.id === id) || null;

/**
 * ĐIỀU KIỆN MẶC: đồ bậc cao đòi con dế phải lớn tới đâu.
 * Mua được mà mặc luôn thì bậc 4 chỉ còn là chuyện tiền; buộc theo giai đoạn
 * tiến hoá khiến người chơi phải nuôi thật rồi mới khoác đồ xịn lên người.
 */
export const REQ_STAGE = [0, 0, 1, 2, 3];       // theo tier 0..4
export const reqStageOf = (g) => REQ_STAGE[g?.tier || 1] || 0;
/** Được mặc chưa? → { ok, need } · need = id giai đoạn còn thiếu. */
export function canEquip(save, g) {
  const need = reqStageOf(g);
  const st = STAGES.reduce((a, s) => ((save?.xp || 0) >= s.xp ? s : a), STAGES[0]);
  return { ok: st.id >= need, need, stage: st.id };
}

/**
 * Giá bán lại — 40% giá mua. Cố ý lỗ nặng: mua nhầm thì phải xót, nếu không
 * người chơi cứ mua bừa rồi bán, tiền mất giá và mọi lựa chọn thành vô nghĩa.
 */
export const SELL_RATE = 0.40;
export const sellPrice = (g) => Math.max(1, Math.round((g.price || 0) * SELL_RATE));

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

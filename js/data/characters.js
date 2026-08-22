// ── Nhân vật & tiến hoá ─────────────────────────────────────────────────────
//
// AN TOÀN BẢN QUYỀN: tên và bảng màu ở đây là NGUYÊN GỐC — không trùng nhân vật
// của truyện "Dế Mèn phiêu lưu ký" (Tô Hoài) lẫn phim hoạt hình 2025. Nếu sau
// này muốn đổi tên, chỉ cần sửa trong đúng file này, engine không phụ thuộc tên.
// Mỗi giống = 1 quả trứng người chơi chọn ở đầu game. Bảng màu điều khiển
// toàn bộ phần vẽ dế (js/game/cricket.js) nên thêm giống mới = thêm 1 object.

export const BREEDS = [
  {
    id: 'ember', species: 'cricket', kind: 'Dế', kind_en: 'Field cricket', name_en: 'Reed', epithet_en: 'Duskglow Egg', trait_en: 'Grit', traitDesc_en: 'Special-gem blasts reach 1 tile further.',
    name: 'Rơm', epithet: 'Trứng Nắng Chiều',
    body: '#c98a4e', belly: '#f6dcae', wing: '#8a5a2c', horn: '#ffe0a0', eye: '#ffcf5a',
    shellA: '#e0a45c', shellB: '#8f5a25', spot: '#ffe6b8',
    trait: 'Khí phách', traitDesc: 'Nổ đá đặc biệt lan thêm 1 ô.',
    stats: { might: 3, spirit: 1, fortune: 1, breath: 2 },
  },
  {
    id: 'frost', species: 'katydid', kind: 'Muỗm', kind_en: 'Katydid', name_en: 'Dewlin', epithet_en: 'Dawnmist Egg', trait_en: 'Calm', traitDesc_en: 'Stamina drains 15% slower.',
    name: 'Sương', epithet: 'Trứng Sương Sớm',
    body: '#6fa8c8', belly: '#dcf1ff', wing: '#3d6f8e', horn: '#eaf6ff', eye: '#9fe8ff',
    shellA: '#8ec6e6', shellB: '#2f6680', spot: '#e8f7ff',
    trait: 'Điềm tĩnh', traitDesc: 'Sức bền tụt chậm hơn 15%.',
    stats: { might: 1, spirit: 3, fortune: 1, breath: 2 },
  },
  {
    id: 'verd', species: 'grasshopper', kind: 'Châu chấu', kind_en: 'Grasshopper', name_en: 'Fernwing', epithet_en: 'Young-Leaf Egg', trait_en: 'Verdance', traitDesc_en: 'Every combo restores extra stamina.',
    name: 'Lá', epithet: 'Trứng Lá Non',
    body: '#6aa85f', belly: '#e4f3c4', wing: '#33693c', horn: '#f2f0a0', eye: '#c6ff7a',
    shellA: '#84bf5a', shellB: '#2f5d33', spot: '#e6ffb0',
    trait: 'Sinh khí', traitDesc: 'Mỗi chuỗi liên hoàn hồi thêm sức bền.',
    stats: { might: 1, spirit: 2, fortune: 3, breath: 1 },
  },
  {
    id: 'void', species: 'locust', kind: 'Cào cào', kind_en: 'Locust', name_en: 'Inkspur', epithet_en: 'Rainy-Night Egg', trait_en: 'Cunning', traitDesc_en: 'Special-gem drop rate +20%.',
    name: 'Mực', epithet: 'Trứng Đêm Mưa',
    body: '#7a5fae', belly: '#dcc8ff', wing: '#402a63', horn: '#ffd6f5', eye: '#ff8ae0',
    shellA: '#9b6fd4', shellB: '#3b2260', spot: '#f0c8ff',
    trait: 'Tinh ranh', traitDesc: 'Tỉ lệ ra đá đặc biệt +20%.',
    stats: { might: 2, spirit: 1, fortune: 3, breath: 1 },
  },
];

/** Hình dáng riêng theo loài — lái trực tiếp hàm vẽ trong js/game/cricket.js.
 *  ant  = độ dài râu · abd = độ dài bụng · fem = cỡ càng sau · head = độ thuôn của đầu */
export const SPECIES = {
  cricket:     { ant: 1.00, abd: 1.00, fem: 1.00, head: 1.00, wing: 1.00 },
  katydid:     { ant: 1.45, abd: 1.02, fem: 1.06, head: 0.94, wing: 1.18 },
  grasshopper: { ant: 0.42, abd: 1.16, fem: 1.26, head: 1.12, wing: 0.88 },
  locust:      { ant: 0.50, abd: 1.10, fem: 1.20, head: 1.06, wing: 1.05 },
};

/** 5 giai đoạn — `scale` & `wing` lái trực tiếp hàm vẽ nhân vật. */
export const STAGES = [
  { id: 0, name_en: 'Egg', name: 'Trứng',           xp:    0, scale: 0.55, wing: 0.00, horns: 0 },
  { id: 1, name_en: 'Nymph', name: 'Dế con',        xp:  600, scale: 0.72, wing: 0.45, horns: 2 },
  { id: 2, name_en: 'Youngling', name: 'Dế choai',        xp: 2200, scale: 0.88, wing: 0.75, horns: 3 },
  { id: 3, name_en: 'Adult', name: 'Dế trưởng thành',xp: 5200, scale: 1.05, wing: 1.00, horns: 4 },
  { id: 4, name_en: 'Wayfarer', name: 'Dế Lữ Khách',         xp: 9800, scale: 1.22, wing: 1.25, horns: 6 },
];

export const stageFor = (xp) => {
  let s = STAGES[0];
  for (const st of STAGES) if (xp >= st.xp) s = st;
  return s;
};
export const nextStage = (xp) => STAGES.find(s => s.xp > xp) || null;

// ── Huấn luyện ───────────────────────────────────────────────────────────────
export const TRAININGS = [
  { id: 'might',   name_en: 'Might', desc_en: 'Blast radius +', name: 'Sức mạnh', glyph: 'sword', cost: g => 120 + g * 90,  desc: 'Bán kính nổ +' },
  { id: 'spirit',  name_en: 'Spirit', desc_en: 'Vitality endurance +', name: 'Ý chí',    glyph: 'heart', cost: g => 100 + g * 80,  desc: 'Sinh lực bền +' },
  { id: 'fortune', name_en: 'Fortune', desc_en: 'Special gems +', name: 'May mắn',  glyph: 'star', cost: g => 150 + g * 110, desc: 'Gem đặc biệt +' },
  { id: 'breath',  name_en: 'Chirp', desc_en: 'Skill recharge +', name: 'Tiếng gáy',  glyph: 'chirp', cost: g => 180 + g * 130, desc: 'Hồi kỹ năng +' },
];

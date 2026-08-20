// ── Tiến trình người chơi (localStorage, có đánh phiên bản) ─────────────────
const KEY = 'sdrakon.save.v2';

export const blank = () => ({
  v: 2,
  breed: null,                                   // id giống rồng đã chọn
  xp: 0, gold: 250, food: 3,
  stats: { might: 0, spirit: 0, fortune: 0, breath: 0 },
  stars: {},                                     // levelId → 0..3
  best:  {},                                     // levelId → điểm cao nhất
  unlocked: 1,                                   // số màn đã mở khoá
  music: true, sfx: true,
  seenStory: {},
  seenHelp: false, seenTut: false,
  choices: {},                                   // lựa chọn cốt truyện
  mats: {},                                      // kho nguyên liệu
  crafted: {},                                   // id món đã chế → true
  equip: { helm: null, armor: null, weapon: null },
  lore: {},                                      // id đối thủ → đã rút được bài học
});

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return blank();
    const s = JSON.parse(raw);
    if (s.v !== 2) return blank();               // nâng phiên bản → chơi lại từ đầu
    const base = blank();
    return { ...base, ...s,
      stats: { ...base.stats, ...(s.stats || {}) },
      equip: { ...base.equip, ...(s.equip || {}) },
      mats:  { ...(s.mats || {}) }, crafted: { ...(s.crafted || {}) }, choices: { ...(s.choices || {}) },
      lore:  { ...(s.lore || {}) } };
  } catch { return blank(); }
}

export function save(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* riêng tư / hết dung lượng */ }
  return s;
}
export function wipe() { try { localStorage.removeItem(KEY); } catch {} return blank(); }

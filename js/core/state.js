// ── Tiến trình người chơi (localStorage, có đánh phiên bản) ─────────────────
const KEY = 'cricko.save.v2';
// Khoá cũ thời game còn tên SDrakon — đọc nốt một lần rồi chuyển sang khoá mới,
// để người đang chơi dở không mất tiến trình khi cập nhật bản đổi tên.
const KEY_OLD = 'sdrakon.save.v2';

export const blank = () => ({
  v: 2,
  breed: null,                                   // id giống dế đã chọn
  xp: 0, gold: 250, food: 3,
  fed: 100,                                      // độ no 0..100; hết là dế không chơi nổi
  fedAt: 0,                                      // mốc (ms) để tính sức hồi theo thời gian thật
  stats: { might: 0, spirit: 0, fortune: 0, breath: 0 },
  stars: {},                                     // levelId → 0..3
  best:  {},                                     // levelId → điểm cao nhất
  unlocked: 1,                                   // số màn đã mở khoá
  music: true, sfx: true,
  seenStory: {},
  seenEp: {},                                    // id chương → đã xem màn mở chương
  seenHelp: false, seenTut: false,
  choices: {},                                   // lựa chọn cốt truyện
  mats: {},                                      // kho nguyên liệu
  crafted: {},                                   // id món đã chế → true
  equip: { helm: null, scarf: null, armor: null, weapon: null },
  lore: {},                                      // id đối thủ → đã rút được bài học
  owned: {},                                     // id món đồ đã mua ở cửa hàng
  duelStreak: 0,                                 // chuỗi thắng đấu trường đang giữ
  mapEp: null,                                   // vùng bản đồ đã xem lần trước — để biết khi nào có vùng MỚI
});

export function load() {
  try {
    let raw = localStorage.getItem(KEY);
    if (!raw) {                                  // chuyển tiến trình từ khoá cũ sang
      raw = localStorage.getItem(KEY_OLD);
      if (raw) { try { localStorage.setItem(KEY, raw); localStorage.removeItem(KEY_OLD); } catch { /* bỏ qua */ } }
    }
    if (!raw) return blank();
    const s = JSON.parse(raw);
    if (s.v !== 2) return blank();               // nâng phiên bản → chơi lại từ đầu
    const base = blank();
    return { ...base, ...s,
      stats: { ...base.stats, ...(s.stats || {}) },
      equip: { ...base.equip, ...(s.equip || {}) },
      mats:  { ...(s.mats || {}) }, crafted: { ...(s.crafted || {}) }, choices: { ...(s.choices || {}) },
      lore:  { ...(s.lore || {}) }, owned: { ...(s.owned || {}) },
      seenEp: { ...(s.seenEp || {}) } };
  } catch { return blank(); }
}

export function save(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* riêng tư / hết dung lượng */ }
  return s;
}
export function wipe() { try { localStorage.removeItem(KEY); localStorage.removeItem(KEY_OLD); } catch {} return blank(); }

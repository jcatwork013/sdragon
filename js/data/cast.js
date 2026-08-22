// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  DÀN NHÂN VẬT — ai đóng vai nào trong truyện.                            ║
// ║                                                                          ║
// ║  Truyện "Mùa Cỏ Cháy" có ĐÚNG 4 nhân vật (Rơm · Sương · Lá · Mực) và 4   ║
// ║  VAI: hero · singer · bruiser · outsider. Trước đây lời kể đóng đinh Rơm  ║
// ║  làm nhân vật chính, nên chọn trứng tím xong truyện vẫn gọi tên Rơm —     ║
// ║  người chơi thấy ngay là sai.                                            ║
// ║                                                                          ║
// ║  Cách chữa: giống người chơi chọn LUÔN là hero; ba vai còn lại rơi vào ba ║
// ║  đứa còn lại theo thứ tự HỢP TÍNH CÁCH ở FIT. Vai nào cũng có người đóng, ║
// ║  không ai đóng hai vai, nên mọi hồi vẫn đủ bốn cái tên và không đứa nào   ║
// ║  tự nói chuyện với chính mình.                                           ║
// ╚══════════════════════════════════════════════════════════════════════════╝

/** Nhân vật, khoá theo id giống trong characters.js. Màu lấy từ thân con dế. */
export const CHARS = {
  ember: { key: 'rom',   name: 'Rơm',   name_en: 'Reed',     col: '#c98a4e', ink: '#4a2c10' },
  frost: { key: 'suong', name: 'Sương', name_en: 'Dewlin',   col: '#6fa8c8', ink: '#12384a' },
  verd:  { key: 'la',    name: 'Lá',    name_en: 'Fernwing', col: '#6aa85f', ink: '#173d17' },
  void:  { key: 'muc',   name: 'Mực',   name_en: 'Inkspur',  col: '#7a5fae', ink: '#2b1b46' },
};

/** Người ngoài dàn 4 đứa — không bao giờ đổi vai. */
export const EXTRAS = {
  gia:  { name: 'Bà Cỏ',       name_en: 'Old Sedge', col: '#b09a6a', ink: '#3d3418' },
  // Người hàng xóm bé nhỏ ở Hồi I–II. Nhân vật gốc, đặt theo tên một loài cỏ.
  may:  { name: 'Cỏ May',      name_en: 'Bentgrass', col: '#cfd8a8', ink: '#3d4418' },
  dich: { name: 'Thiên địch',  name_en: 'Predator',  col: '#e8384f', ink: '#4a0010' },
};

/** Ba vai phụ, xếp theo thứ tự chia vai. */
export const ROLES = ['singer', 'bruiser', 'outsider'];

// Ai hợp vai nào — đứng trước là hợp hơn. Người chơi cướp mất một đứa thì vai
// đó tụt xuống đứa kế tiếp trong danh sách, nên tính cách lệch ít nhất có thể.
const FIT = {
  singer:   ['frost', 'void',  'ember', 'verd'],   // hát hay mà nhát
  bruiser:  ['verd',  'ember', 'void',  'frost'],  // khoẻ mà nóng tính
  outsider: ['void',  'verd',  'frost', 'ember'],  // lang thang, bị chê "khác loài"
};

/**
 * Giọng riêng của nhân vật chính, đổi theo thiên phú của giống được chọn:
 *   praise / short — lời bà con khen lúc mới nở (hồi I)
 *   trait          — tính từ gọn cho mấy câu đúc kết cuối hồi
 * Cùng một mạch truyện, nhưng nuôi giống nào thì bài học nghe ra giống ấy.
 */
export const HERO_VOICE = {
  ember: { praise: 'Càng con khoẻ đấy!',    short: 'khoẻ đấy',  trait: 'khoẻ',
           praise_en: 'Strong legs, that one!', short_en: 'strong legs', trait_en: 'strong' },
  frost: { praise: 'Con này điềm đạm gớm!', short: 'điềm đạm',  trait: 'điềm đạm',
           praise_en: 'A steady one, that!',    short_en: 'steady one',  trait_en: 'steady' },
  verd:  { praise: 'Con này dai sức đấy!',  short: 'dai sức',   trait: 'dai sức',
           praise_en: 'A tireless one, that!',  short_en: 'tireless one', trait_en: 'tireless' },
  void:  { praise: 'Con này lanh lắm đấy!', short: 'lanh lắm',  trait: 'lanh lợi',
           praise_en: 'A sharp one, that!',     short_en: 'sharp one',   trait_en: 'sharp' },
};

/** Chia vai cho một giống làm nhân vật chính → { hero, singer, bruiser, outsider }. */
export function castFor(heroId) {
  const hero = CHARS[heroId] ? heroId : 'ember';
  const cast = { hero };
  const taken = new Set([hero]);
  for (const role of ROLES) {
    const pick = FIT[role].find(id => !taken.has(id));
    cast[role] = pick;
    taken.add(pick);
  }
  return cast;
}

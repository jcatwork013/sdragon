// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  ĐẤU TAY ĐÔI — thế lực hắc ám.                                          ║
// ║                                                                          ║
// ║  Luật: kéo–búa–bao. Mỗi hiệp hai bên cùng ra một đòn, ai thắng thế thì    ║
// ║  đánh trúng, ai hết máu trước thì thua.                                   ║
// ║  HUẤN LUYỆN CÓ Ý NGHĨA THẬT: Sức mạnh → sát thương, Ý chí → máu,          ║
// ║  May mắn → tỉ lệ chí mạng, Tiếng gáy → nạp đòn Gồng nhanh hơn.           ║
// ║  GHÉP CẶP CÂN SỨC: lực đối thủ chỉ dao động ±12% quanh lực của bạn, nên   ║
// ║  không bao giờ gặp phải kẻ mạnh áp đảo — thắng thua do đọc bài, không do  ║
// ║  xui rủi chỉ số.                                                         ║
// ╚══════════════════════════════════════════════════════════════════════════╝
import { STAGES } from './characters.js';
import { gearBonus } from './gear.js';

/** Ba thế đòn — vòng khắc chế kiểu kéo–búa–bao. */
export const MOVES = [
  { id: 'huc', vi: 'Húc',  en: 'Ram',   beats: 'vut', icon: 'ram'   },  // húc thắng vụt
  { id: 'do',  vi: 'Đỡ',   en: 'Guard', beats: 'huc', icon: 'guard' },  // đỡ thắng húc
  { id: 'vut', vi: 'Vụt',  en: 'Whip',  beats: 'do',  icon: 'whip'  },  // vụt thắng đỡ
];
export const beats = (a, b) => MOVES.find(m => m.id === a)?.beats === b;

/**
 * Đối thủ hắc ám — hình vẽ mượn bộ thiên địch nhưng tông tối hơn.
 *
 * `lean` là THÓI QUEN RA ĐÒN có thật, foeChoice() đọc đúng trường này. Nhờ vậy
 * "bài học" hiện ra sau khi thua không phải câu văn suông: nắm được thói quen
 * là trận sau đánh khác hẳn.
 *    lean = id đòn hay ra   ·   'read' = chuyên bắt bài bạn   ·   null = ngẫu nhiên
 */
export const DARK = [
  { id: 'beetle',  art: 'ant',    name: 'Bọ Hung Đen',  name_en: 'Black Chafer',
    body: '#3a2a1e', dark: '#160e08', lite: '#6b5340', eye: '#ff6a3d',
    taunt: 'Càng to mà đầu rỗng thì cũng thế thôi.', taunt_en: 'Big legs, empty head. Same thing.',
    lean: 'huc', leanW: .55,
    trait: 'Cắm đầu húc', trait_en: 'Headlong charger',
    tell: 'Hơn nửa số hiệp nó chọn HÚC. Cứ ĐỠ là ăn.',
    tell_en: 'It picks RAM more than half the time. GUARD beats it.' },
  { id: 'scorp',   art: 'wasp',   name: 'Bò Cạp Nhỏ',   name_en: 'Little Scorpion',
    body: '#4a2340', dark: '#1c0a18', lite: '#8a5a7a', eye: '#ffd23f',
    taunt: 'Ta chích một cái là ngươi ngủ ba ngày.', taunt_en: 'One sting and you sleep for three days.',
    lean: 'vut', leanW: .52,
    trait: 'Quen quật đuôi', trait_en: 'Tail-lasher',
    tell: 'Nó nghiêng hẳn về VỤT. HÚC là chặn được.',
    tell_en: 'It leans hard on WHIP. RAM stops it.' },
  { id: 'widow',   art: 'spider', name: 'Nhện Goá Phụ', name_en: 'Widow Spider',
    body: '#241a30', dark: '#0d0814', lite: '#5a4a72', eye: '#ff2f5e',
    taunt: 'Ngồi yên đi. Đằng nào cũng dính lưới.', taunt_en: 'Sit still. You are in the web either way.',
    lean: 'do', leanW: .50,
    trait: 'Thủ rồi mới cắn', trait_en: 'Waits behind a guard',
    tell: 'Nó thích ĐỠ và chờ bạn sốt ruột. VỤT xuyên qua thế thủ.',
    tell_en: 'It favours GUARD and waits you out. WHIP cuts through.' },
  { id: 'reaper',  art: 'mantis', name: 'Bọ Ngựa Xám',  name_en: 'Grey Reaper',
    body: '#38423a', dark: '#141a15', lite: '#6d7a6e', eye: '#c8ff5a',
    taunt: 'Ngươi run tay rồi kìa.', taunt_en: 'Your legs are shaking already.',
    lean: 'read', leanW: .60,
    trait: 'Đọc bài', trait_en: 'Reads you',
    tell: 'Nó đếm đòn bạn hay dùng rồi khắc chế. Đừng lặp một đòn quá hai hiệp.',
    tell_en: 'It counts your favourite move and counters it. Never repeat one twice.' },
  { id: 'coc',     art: 'bird',   name: 'Cốc Mỏ Sắt',   name_en: 'Ironbeak', boss: true,
    body: '#2f3742', dark: '#0e1319', lite: '#6f7a86', eye: '#ffcf5a', beak: '#f5b027',
    taunt: 'Ta chỉ cần mổ đúng một cái.', taunt_en: 'One peck is all I need.',
    lean: 'huc', leanW: .48,
    trait: 'Mổ thẳng mặt', trait_en: 'Straight peck',
    tell: 'Nó lao thẳng mỏ tới. ĐỠ đúng nhịp là mỏ nó dội vào cánh.',
    tell_en: 'It lunges beak-first. GUARD on time and the beak bounces off your wing.' },
  { id: 'lord',    art: 'toad',   name: 'Chúa Bóng',    name_en: 'Shadow Lord', boss: true,
    body: '#2a2438', dark: '#0c0a14', lite: '#5c5478', eye: '#ff9a2b',
    taunt: 'Bờ cỏ của ngươi, ta lấy lúc nào cũng được.', taunt_en: 'Your grass bank is mine whenever I choose.',
    lean: null, leanW: 0,
    trait: 'Không theo lối nào', trait_en: 'No pattern at all',
    tell: 'Không có thói quen nào để bắt. Nạp đầy thanh Gồng rồi dứt điểm.',
    tell_en: 'No pattern to read. Fill the Charge bar and end it fast.' },
];

/**
 * ĐỐI THỦ LÀ DẾ — không phải lúc nào cũng đánh với thiên địch. Ra đấu trường
 * thì gặp cả những con dế/muỗm/cào cào khác đến tỉ thí, vẽ bằng chính hàm vẽ
 * nhân vật (js/game/cricket.js) với bảng màu riêng.
 *
 * Tên và tính cách đều TỰ ĐẶT — không mượn nhân vật của tác phẩm nào.
 */
export const RIVALS = [
  { id: 'daban', cricket: true, name: 'Dế Đá Bàn', name_en: 'Flagstone',
    breed: { species: 'cricket', body: '#8a8f9c', belly: '#dfe4ee', wing: '#4f5563', horn: '#eef2f8', eye: '#ffd45c',
             shellA: '#9aa0ad', shellB: '#3d434f', spot: '#e8edf5' },
    taunt: 'Càng ngươi mềm như cọng cỏ úa.', taunt_en: 'Your legs are soft as wilted grass.',
    lean: 'huc', leanW: .52,
    trait: 'Quen húc trước', trait_en: 'Rams first',
    tell: 'Nó mở màn bằng HÚC gần như mọi hiệp. ĐỠ là chặn được.',
    tell_en: 'It opens with RAM nearly every round. GUARD stops it.' },
  { id: 'muomto', cricket: true, name: 'Muỗm Càng To', name_en: 'Bigshank',
    breed: { species: 'katydid', body: '#5f8f4a', belly: '#dff3c4', wing: '#33693c', horn: '#f2f0a0', eye: '#c6ff7a',
             shellA: '#7fbf5a', shellB: '#2f5d33', spot: '#e6ffb0' },
    taunt: 'Đứng im cho ta quật một cái thôi.', taunt_en: 'Hold still. Just one swing.',
    lean: 'vut', leanW: .54,
    trait: 'Thích quật càng', trait_en: 'Loves a good swing',
    tell: 'Càng sau nó dài nên nó mê VỤT. HÚC vào trước là nó hụt.',
    tell_en: 'Long hind legs, so it loves WHIP. RAM beats it to the punch.' },
  { id: 'caocaoli', cricket: true, name: 'Cào Cào Lì', name_en: 'Stubborn Hopper',
    breed: { species: 'locust', body: '#b8823a', belly: '#f6dcae', wing: '#7a5320', horn: '#ffe0a0', eye: '#ffcf5a',
             shellA: '#d19a4c', shellB: '#5c3c16', spot: '#ffe6b8' },
    taunt: 'Ta đứng đây cả ngày cũng được.', taunt_en: 'I can stand here all day.',
    lean: 'do', leanW: .55,
    trait: 'Thủ tới cùng', trait_en: 'Guards to the end',
    tell: 'Nó lì, cứ ĐỠ chờ mình sốt ruột. VỤT xuyên qua thế thủ.',
    tell_en: 'It just guards and waits you out. WHIP cuts through.' },
  { id: 'suongbac', cricket: true, name: 'Dế Sương Bạc', name_en: 'Silvermist',
    breed: { species: 'katydid', body: '#6f9fc8', belly: '#dcf1ff', wing: '#3d6f8e', horn: '#eaf6ff', eye: '#9fe8ff',
             shellA: '#8ec6e6', shellB: '#2f6680', spot: '#e8f7ff' },
    taunt: 'Ngươi đọc được ta thì hẵng nói.', taunt_en: 'Read me first, then talk.',
    lean: 'read', leanW: .58,
    trait: 'Đọc bài giỏi', trait_en: 'Reads you well',
    tell: 'Nó đếm đòn bạn hay ra rồi khắc chế. Đừng lặp một đòn hai hiệp liền.',
    tell_en: 'It counts your favourite move and counters. Never repeat twice.' },
];

/**
 * BẬC đối thủ — ghép cặp có rủi ro. Phần lớn là cân sức, nhưng thỉnh thoảng
 * vọt lên một con mạnh hơn hẳn: đánh đau hơn NHƯNG rơi đồ cũng nặng tay hơn,
 * nên gặp nó là cơ hội chứ không phải xui.
 */
export const RANKS = [
  { id: 'norm',  w: 68, k: [0.88, 1.12], reward: 1.0, mats: 0,
    name: '',            name_en: '',        col: '#cfe6ff' },
  { id: 'elite', w: 24, k: [1.16, 1.34], reward: 1.6, mats: 1,
    name: 'TINH NHUỆ',   name_en: 'ELITE',   col: '#8ef08a' },
  { id: 'dread', w:  8, k: [1.40, 1.68], reward: 2.4, mats: 2,
    name: 'HUNG THẦN',   name_en: 'DREAD',   col: '#ff9a2b' },
];
export const rankById = (id) => RANKS.find(r => r.id === id) || RANKS[0];

/** Sức mạnh tổng của người chơi — dùng để ghép cặp cân sức. */
export function heroPower(save) {
  const st = STAGES.reduce((a, s) => (save.xp >= s.xp ? s : a), STAGES[0]);
  const S = save.stats || {};
  const g = gearBonus(save);                  // đồ đang mặc cộng thẳng vào đây
  const hp   = 70 + (S.spirit || 0) * 12 + st.id * 16 + g.hp;
  // Sát thương cũ chỉ bằng ~1/9 máu nên một trận kéo hai chục hiệp, hoà lên hoà
  // xuống, người chơi phát chán. Nâng lên ~1/6 máu: trận gọn còn 6–9 hiệp mà
  // vẫn đủ chỗ để đọc bài và lật kèo.
  const atk  = 14 + (S.might  || 0) * 4.2 + st.id * 3.4 + g.atk;
  const crit =  4 + (S.fortune || 0) * 3 + g.crit;
  return {
    stage: st.id, hp, atk, crit,
    charge: 1 + (S.breath || 0) * 0.22 + g.charge,
    gear: g,
    power: Math.round(hp * 0.35 + atk * 2.2 + crit * 1.2 + st.id * 6),
  };
}

/**
 * Sinh đối thủ CÂN SỨC với người chơi.
 * `bias` > 1 làm đối thủ nhỉnh hơn (dùng cho trận trùm), < 1 thì nhẹ hơn.
 */
let _lastFoe = null;                                 // id đối thủ trận trước
export function makeFoe(save, bias = 1) {
  const me = heroPower(save);
  // bốc bậc theo trọng số
  const total = RANKS.reduce((a, r) => a + r.w, 0);
  let roll = Math.random() * total, rank = RANKS[0];
  for (const r of RANKS) { roll -= r.w; if (roll <= 0) { rank = r; break; } }
  const k = (rank.k[0] + Math.random() * (rank.k[1] - rank.k[0])) * bias;
  // Không bốc lại đúng con vừa đánh: chỉ có 5 gương mặt nên gặp lại liên tiếp
  // là thấy ngay "sao toàn gặp nó" — mất hẳn cảm giác mỗi trận một đối thủ.
  // Nửa thiên địch, nửa dế tỉ thí — ra đấu trường không phải lúc nào cũng
  // đánh với sâu bọ hung dữ, gặp đồng loại mới ra không khí "đấu trường".
  const base = me.stage >= 3 ? [...DARK, ...RIVALS] : [...DARK.filter(d => !d.boss), ...RIVALS];
  let pool = base;
  if (pool.length > 1 && _lastFoe) {
    const fresh = pool.filter(d => d.id !== _lastFoe);
    if (fresh.length) pool = fresh;
  }
  const def = pool[(Math.random() * pool.length) | 0];
  _lastFoe = def.id;
  return {
    def, rank,
    hp:  Math.round(me.hp * k),
    max: Math.round(me.hp * k),
    atk: Math.max(6, Math.round(me.atk * k)),
    crit: Math.round(me.crit * 0.8),
    power: Math.round(me.power * k),
    ratio: k,                                          // để hiện "cân sức / hơi mạnh"
  };
}


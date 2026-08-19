// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  ĐẤU TAY ĐÔI — thế lực hắc ám.                                          ║
// ║                                                                          ║
// ║  Luật: kéo–búa–bao. Mỗi hiệp hai bên cùng ra một đòn, ai thắng thế thì    ║
// ║  đánh trúng, ai hết máu trước thì thua.                                   ║
// ║  HUẤN LUYỆN CÓ Ý NGHĨA THẬT: Sức mạnh → sát thương, Ý chí → máu,          ║
// ║  May mắn → tỉ lệ chí mạng, Hơi lửa → nạp đòn Gồng nhanh hơn.             ║
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

/** Đối thủ hắc ám — hình vẽ mượn bộ thiên địch nhưng tông tối hơn. */
export const DARK = [
  { id: 'beetle',  art: 'ant',    name: 'Bọ Hung Đen',  name_en: 'Black Chafer',
    body: '#3a2a1e', dark: '#160e08', lite: '#6b5340', eye: '#ff6a3d',
    taunt: 'Càng to mà đầu rỗng thì cũng thế thôi.', taunt_en: 'Big legs, empty head. Same thing.' },
  { id: 'scorp',   art: 'wasp',   name: 'Bò Cạp Nhỏ',   name_en: 'Little Scorpion',
    body: '#4a2340', dark: '#1c0a18', lite: '#8a5a7a', eye: '#ffd23f',
    taunt: 'Ta chích một cái là ngươi ngủ ba ngày.', taunt_en: 'One sting and you sleep for three days.' },
  { id: 'widow',   art: 'spider', name: 'Nhện Goá Phụ', name_en: 'Widow Spider',
    body: '#241a30', dark: '#0d0814', lite: '#5a4a72', eye: '#ff2f5e',
    taunt: 'Ngồi yên đi. Đằng nào cũng dính lưới.', taunt_en: 'Sit still. You are in the web either way.' },
  { id: 'reaper',  art: 'mantis', name: 'Bọ Ngựa Xám',  name_en: 'Grey Reaper',
    body: '#38423a', dark: '#141a15', lite: '#6d7a6e', eye: '#c8ff5a',
    taunt: 'Ngươi run tay rồi kìa.', taunt_en: 'Your legs are shaking already.' },
  { id: 'lord',    art: 'toad',   name: 'Chúa Bóng',    name_en: 'Shadow Lord', boss: true,
    body: '#2a2438', dark: '#0c0a14', lite: '#5c5478', eye: '#ff9a2b',
    taunt: 'Bờ cỏ của ngươi, ta lấy lúc nào cũng được.', taunt_en: 'Your grass bank is mine whenever I choose.' },
];

/** Sức mạnh tổng của người chơi — dùng để ghép cặp cân sức. */
export function heroPower(save) {
  const st = STAGES.reduce((a, s) => (save.xp >= s.xp ? s : a), STAGES[0]);
  const S = save.stats || {};
  const g = gearBonus(save);                  // đồ đang mặc cộng thẳng vào đây
  const hp   = 70 + (S.spirit || 0) * 12 + st.id * 16 + g.hp;
  const atk  =  9 + (S.might  || 0) * 3.2 + st.id * 2.2 + g.atk;
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
export function makeFoe(save, bias = 1) {
  const me = heroPower(save);
  const k = (0.88 + Math.random() * 0.24) * bias;      // ±12% quanh lực của bạn
  const pool = me.stage >= 3 ? DARK : DARK.filter(d => !d.boss);
  const def = pool[(Math.random() * pool.length) | 0];
  return {
    def,
    hp:  Math.round(me.hp * k),
    max: Math.round(me.hp * k),
    atk: Math.max(6, Math.round(me.atk * k)),
    crit: Math.round(me.crit * 0.8),
    power: Math.round(me.power * k),
    ratio: k,                                          // để hiện "cân sức / hơi mạnh"
  };
}

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  LỜI THOẠI TRONG MÀN — cốt truyện chạy NGAY LÚC ĐANG CHƠI.               ║
// ║                                                                          ║
// ║  Mỗi câu gắn với một SỰ KIỆN có thật của ván đấu (ăn combo, hạ địch,      ║
// ║  sắp hết giờ, bị cướp vàng…). Nhờ vậy chuyện và luật chơi khớp nhau:      ║
// ║  người chơi hiểu VÌ SAO mình đang ghép đá, chứ không phải ghép cho vui.   ║
// ╚══════════════════════════════════════════════════════════════════════════╝

/** Nhân vật nói — màu dùng cho khung thoại. */
export const SPEAKERS = {
  rom:    { name: 'Rơm',   name_en: 'Reed',     col: '#c98a4e', ink: '#4a2c10' },
  suong:  { name: 'Sương', name_en: 'Dewlin',   col: '#6fa8c8', ink: '#12384a' },
  la:     { name: 'Lá',    name_en: 'Fernwing', col: '#6aa85f', ink: '#173d17' },
  muc:    { name: 'Mực',   name_en: 'Inkspur',  col: '#7a5fae', ink: '#2b1b46' },
  gia:    { name: 'Bà Cỏ', name_en: 'Old Sedge',col: '#b09a6a', ink: '#3d3418' },
  dich:   { name: 'Thiên địch', name_en: 'Predator', col: '#e8384f', ink: '#4a0010' },
};

const L = (who, vi, en) => ({ who, vi, en });

/**
 * BEATS[actId][trigger] = danh sách câu.
 * Trigger có thật trong engine: start · combo · foeDown · foeHit · lowTime ·
 * goalHit · webbed · robbed · win · lose
 */
export const BEATS = {
  hatch: {
    start:  [L('gia', 'Nhặt hạt về kho đi con. Ba mùa nắng rồi, kho cạn lắm.',
                      'Gather the seeds home, child. Three dry seasons — the store is nearly empty.')],
    combo:  [L('rom', 'Ơ! Ghép ba viên là nó vỡ ra cả chùm!', 'Oh! Three in a row and the whole lot bursts!'),
             L('rom', 'Càng dài càng nhiều hạt — dễ ăn quá!', 'Longer chains, more seeds — this is easy!')],
    goalHit:[L('gia', 'Đủ rồi đấy! Còn lượt thì cứ nhặt thêm.', 'That is enough! Any moves left, keep gathering.')],
    win:    [L('rom', 'Kho đầy lại rồi! Con giỏi chưa?', 'The store is full again! Not bad, eh?')],
    lose:   [L('rom', 'Hụt mất… để con làm lại.', 'Came up short… let me try again.')],
  },
  raid: {
    start:  [L('rom', 'Đám kiến ấy vẫn quanh đây. Lần này mình không quay lưng nữa.',
                      'Those ants are still about. This time I am not turning my back.')],
    foeHit: [L('la',  'Đánh nữa đi! Nó sắp buông kho hạt rồi!', 'Hit it again! It is about to drop the seeds!')],
    robbed: [L('rom', 'Nó cướp mất vàng! Đừng để nó chạy!', 'It stole our gold! Do not let it run!')],
    foeDown:[L('rom', 'Một con xuống. Còn mấy con nữa?', 'One down. How many left?')],
    lowTime:[L('suong','Nắng gắt quá… nhanh lên Rơm ơi!', 'The sun is fierce… hurry, Reed!')],
    lose:   [L('suong','Không sao đâu mà. Mai mình làm lại.', 'It is nothing, really. We try again tomorrow.')],
  },
  road: {
    start:  [L('suong','Đường còn xa. Nhặt được giọt sương nào thì nhặt nhé.',
                      'The road is long. Pick up any dew you can.'),
             L('la',  'Đi nhanh lên! Tui đói rồi.', 'Walk faster! I am hungry.')],
    combo:  [L('muc', 'Ờ… đứa này ghép cũng khá đấy chứ.', 'Hm… this one is not bad at matching.')],
    foeDown:[L('la',  'Thấy chưa! Tui đấm là nó rụng!', 'See that! One punch and down it goes!')],
    webbed: [L('suong','Tơ nhện kìa! Phá mấy viên bên cạnh cho rách ra!',
                      'Spider silk! Break the stones beside it to tear it!')],
    lowTime:[L('muc', 'Trời sắp tối. Tối là lũ săn đêm ra đấy.', 'Dusk is coming. Night hunters come with it.')],
    win:    [L('suong','Được thêm một quãng rồi! Nghỉ chút nhé?', 'Another stretch done! Shall we rest?')],
  },
  marsh: {
    start:  [L('muc', 'Bọ Ngựa đấy. Đừng nhìn vào càng nó — nhìn vào chân.',
                      'That is a Mantis. Do not watch the arms — watch the feet.')],
    foeHit: [L('la',  'Trúng rồi! Đừng dừng!', 'Got it! Do not stop!')],
    foeDown:[L('muc', 'Hạ được rồi. Đi tiếp, đừng nấn ná.', 'It is down. Move on, do not linger.')],
    lowTime:[L('la',  'Bùn hút chân quá… nhanh lên!', 'The mud is pulling me down… faster!')],
    lose:   [L('muc', 'Rút đi! Còn sống là còn quay lại được.', 'Fall back! Alive means we can come back.')],
  },
  fire: {
    start:  [L('rom', 'Lửa tới rồi. Ghép nhanh — mỗi giọt sương là thêm một hơi thở!',
                      'The fire is here. Match fast — every dew drop is one more breath!')],
    lowTime:[L('suong','Khói dày quá! Rơm ơi!', 'The smoke is too thick! Reed!')],
    combo:  [L('rom', 'Được! Cứ đà này là qua được!', 'Yes! Keep this up and we make it!')],
    win:    [L('la',  'Qua được rồi… cháy hết râu tui rồi.', 'We made it… and I lost my antennae.')],
    lose:   [L('rom', 'Không kịp… lùi lại, thử đường khác!', 'Too slow… back up, try another way!')],
  },
  well: {
    start:  [L('gia', 'Cóc Già canh giếng mấy chục năm. Đừng vội động thủ.',
                      'The Old Toad has guarded this well for decades. Do not rush to fight.')],
    foeHit: [L('rom', 'Tôi không muốn đánh ông… nhưng cả xóm đang khát.',
                      'I do not want to fight you… but my whole hamlet is thirsty.')],
    lowTime:[L('gia', 'Nước không chảy nhanh hơn vì con sốt ruột đâu.',
                      'Water does not run faster because you are impatient.')],
    win:    [L('rom', 'Cảm ơn ông. Tôi sẽ nhớ.', 'Thank you. I will remember.')],
  },
  newgrass: {
    start:  [L('suong','Nước về rồi! Giờ mình trồng lại thôi.', 'The water is back! Now we replant.')],
    combo:  [L('la',  'Cỏ mọc nhanh ghê!', 'The grass grows fast!')],
    win:    [L('rom', 'Mùa này khác hẳn mùa trước rồi.', 'This season is nothing like the last.')],
  },
};

/**
 * Câu Dế Mèn hét lên khi bị CHẠM VÀO. Cố ý viết kiểu hờn dỗi/giỡn lại cho vui.
 * `mood` là phản ứng hình ảnh đi kèm.
 */
export const POKES = [
  { mood: 'chirp',  vi: 'Ê! Đụng gì đó!',            en: 'Hey! Watch it!' },
  { mood: 'chirp',  vi: 'Cri-cri-cri! Nhức đầu!',    en: 'Cri-cri-cri! My head!' },
  { mood: 'bop',    vi: 'Nhột! Nhột quá!',           en: 'That tickles! Stop!' },
  { mood: 'proud',  vi: 'Thích gây sự hả? Ra đây!',  en: 'Looking for trouble? Come on then!' },
  { mood: 'bop',    vi: 'Bấm nữa đi, tui khoẻ mà!',  en: 'Poke away, I am tough!' },
  { mood: 'chirp',  vi: 'Gừ… lại nữa hả trời.',      en: 'Ugh… again, seriously?' },
  { mood: 'happy',  vi: 'Hì hì, thôi được rồi.',     en: 'Heh, alright, alright.' },
  { mood: 'proud',  vi: 'Càng này đá bay hòn sỏi đó nha!', en: 'These legs can kick a pebble, you know!' },
  { mood: 'bop',    vi: 'Chọc hoài! Đi chơi màn đi!',en: 'Quit poking! Go play a level!' },
];
export const pickPoke = () => POKES[(Math.random() * POKES.length) | 0];

/**
 * Câu kêu khi ăn một đòn NẶNG. Chỉ bật khi mất nhiều máu trong một nhịp — bật
 * mọi lần trúng đòn thì thành ồn ào và mất luôn tác dụng cảnh báo.
 */
export const OUCH = [
  { vi: 'Ui da! Đau quá đau quá!',      en: 'Owww! That really hurt!' },
  { vi: 'Á! Nó chơi thật rồi!',         en: 'Agh! It is playing for keeps!' },
  { vi: 'Oái! Gãy càng mất thôi!',      en: 'Yeow! My leg, my leg!' },
  { vi: 'Hự… hoa hết cả mắt.',          en: 'Ungh… seeing stars here.' },
  { vi: 'Trời ơi cú đó nặng quá!',      en: 'Blimey, that one landed hard!' },
  { vi: 'Ui! Chờ tí, chờ tí đã!',       en: 'Ow! Hang on, hang on!' },
];
export const pickOuch = () => OUCH[(Math.random() * OUCH.length) | 0];

/**
 * CÂU XÀ LƠ — thỉnh thoảng bật lên giữa lúc chơi cho vui.
 *
 * NGUYÊN TẮC VIẾT: bâng quơ, tự giễu, KHÔNG đụng chạm ai — không chính trị,
 * không giới tính, không vùng miền, không tục. Câu nào đọc lên mà một người
 * lạ có thể thấy bị nhắm vào thì bỏ. Vui kiểu bạn bè nói xàm, thế thôi.
 *
 * CÓ ĐỌC TÌNH HUỐNG: mỗi câu có thể kèm `when(c)`. Câu khớp hoàn cảnh được ưu
 * tiên hơn câu chung chung, nên người chơi thấy con dế "biết mình đang làm gì"
 * chứ không phải cái máy phát ngẫu nhiên — đó mới là thứ giữ chân được người.
 *
 * `c` gồm: { scene, sessMin, hour, gold, lowTime, retries, wins, losses,
 *            streak, combo, stage, gearNew, near }
 */
const Q = (vi, en, when = null) => ({ vi, en, when });

export const QUIPS = [
  // ── chung chung ─────────────────────────────────────────────────────────
  Q('Ghép đẹp đó nha. Nhưng đừng tự tin quá.',   'Nice one. Don’t let it go to your head.'),
  Q('Dế này chạy bằng cơm, không phải bằng pin.', 'This cricket runs on rice, not batteries.'),
  Q('Chậm mà chắc. Chắc là chậm.',               'Slow but steady. Mostly slow.'),
  Q('Cỏ vẫn xanh, dế vẫn gáy, đời vẫn ổn.',      'Grass is green, cricket’s chirping, all good.'),
  Q('Một nước đi hay hơn mười lời than.',        'One good move beats ten complaints.'),
  Q('Bình tĩnh. Viên đá không chạy đi đâu mất.', 'Relax. The gems aren’t going anywhere.'),
  Q('Giữ tay vào đây thì tui chưa đi đâu hết nha.', 'Hold your finger here and I’ll stick around.'),
  Q('Tui đứng đây cổ vũ thôi, không ghép giùm được.', 'I’m just here cheering. Can’t play for you.'),
  Q('Đừng hỏi tui luật, tui chỉ là con dế.',     'Don’t ask me the rules. I’m just a cricket.'),

  // ── theo hoàn cảnh ──────────────────────────────────────────────────────
  Q('Ngồi lâu rồi đó. Đứng dậy vươn vai cái coi.', 'You’ve been sat a while. Go stretch.',
    c => c.sessMin >= 25),
  Q('Khuya rồi. Ghép nốt màn này rồi ngủ nha.',  'It’s late. Finish this one and sleep.',
    c => c.hour >= 23 || c.hour < 5),
  Q('Sáng sớm mà đã ghép đá. Nể.',               'Matching gems this early? Respect.',
    c => c.hour >= 5 && c.hour < 8),
  Q('Đá quý nhiều vậy mà vẫn nghèo. Lạ thật.',   'So many gems, still broke. Curious.',
    c => c.gold < 300),
  Q('Giàu vậy mà chưa chịu đi sắm đồ hả?',       'That rich and still not shopping?',
    c => c.gold >= 3000),
  Q('Đồng hồ nó không chờ ai đâu nha.',          'That clock waits for nobody.',
    c => c.lowTime),
  Q('Màn này khó thiệt. Không phải tại bạn đâu.', 'This one’s genuinely hard. Not your fault.',
    c => c.retries >= 2),
  Q('Thua vài lần là chuyện thường. Tui thua suốt.', 'Losing a few is normal. I lose constantly.',
    c => c.losses >= 2),
  Q('Thắng liên tiếp luôn hả? Hôm nay có gì vui à?', 'On a winning run? Good day, huh?',
    c => c.streak >= 3),
  Q('Combo đó tui xem mà nổi da gà.',            'That combo gave me goosebumps.',
    c => c.combo >= 4),
  Q('Đồ mới đẹp ghê. Xoay một vòng coi.',        'Sharp new gear. Give us a twirl.',
    c => c.gearNew),
  Q('Sắp tới đích rồi. Đừng run tay.',           'Almost there. Steady hands.',
    c => c.near),
  Q('Đi bản đồ mà cũng lạc hả trời.',            'Lost? On a map? Really?',
    c => c.scene === 'map' && c.sessMin >= 10),
];

/**
 * Chọn câu hợp hoàn cảnh. Ưu tiên câu có `when` khớp (70%), và không lặp lại
 * câu vừa nói — lặp là lộ ngay ra máy móc, mất hết vẻ tự nhiên.
 */
let _lastQuip = null;
export function pickQuip(c = {}) {
  const fit = QUIPS.filter(q => q.when && q.when(c) && q !== _lastQuip);
  const any = QUIPS.filter(q => !q.when && q !== _lastQuip);
  const pool = (fit.length && Math.random() < .7) ? fit : (any.length ? any : QUIPS);
  const pick = pool[(Math.random() * pool.length) | 0];
  _lastQuip = pick;
  return pick;
}
/** Danh từ mục tiêu theo chương — để "điểm" có nghĩa trong truyện. */
export const GOAL_NOUN = {
  shellbreak: { vi: 'hạt',  en: 'seeds' },
  ashmeadow:  { vi: 'sương', en: 'dew' },
  quartz:     { vi: 'mạch nước', en: 'water' },
};

/** Lấy một câu cho sự kiện; trả null nếu hồi đó không có câu nào. */
export function pickBeat(actId, trigger) {
  const list = BEATS[actId]?.[trigger];
  if (!list || !list.length) return null;
  return list[(Math.random() * list.length) | 0];
}

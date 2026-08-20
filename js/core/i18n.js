// ── Đa ngôn ngữ VI / EN ──────────────────────────────────────────────────────
// Mọi chuỗi hiển thị đi qua t(). Dữ liệu (tên rồng, tên chương) dùng tx().

export const LANGS = { vi: 'Tiếng Việt', en: 'English' };

const DICT = {
  vi: {
    tagline: 'Proto-Cricket Realm',
    tapStart: 'Chạm để bắt đầu',
    newGame: 'Chơi mới', continueGame: 'Chơi tiếp', settings: 'Cài đặt',
    confirmReset: 'Bấm lần nữa để xoá tiến trình',
    language: 'Ngôn ngữ', music: 'Nhạc', sound: 'Âm thanh', back: 'Quay lại',
    on: 'Bật', off: 'Tắt',

    // hướng dẫn
    howTo: 'Cách chơi', gotIt: 'Đã hiểu',
    htSwapT: '1 · Đổi chỗ',
    htSwapD: 'Kéo một viên sang ô kề bên (hoặc chạm lần lượt 2 viên). Đổi mà KHÔNG tạo được bộ trùng thì viên bật về chỗ cũ và bạn VẪN MẤT 1 LƯỢT — hãy tính trước khi đi.',
    htMatchT: '2 · Xếp 3 viên trở lên',
    htMatchD: 'Ba viên cùng loại thẳng hàng sẽ vỡ. Vỡ xong đá rơi xuống, có thể nổ dây chuyền — càng dài càng nhiều điểm.',
    htSpecialT: '3 · Đá đặc biệt',
    htSpec4: 'Xếp 4 viên → Thương Lửa: quét đúng MỘT hàng (nếu xếp ngang) hoặc MỘT cột (nếu xếp dọc).',
    htSpecL: 'Xếp hình L hoặc T → Thập Long: nổ cả hàng lẫn cột.',
    htSpec5: 'Xếp 5 viên → Trứng Lăng Kính: xoá toàn bộ đá cùng màu.',
    htSpecCombo: 'Đổi chỗ hai viên đặc biệt với nhau để tạo vụ nổ lớn hơn.',
    htHudT: '4 · Bảng chỉ số',
    htCrown: 'Tiến độ tới mục tiêu điểm của màn.',
    htHeart: 'Sinh lực — chỉ tụt KHI BÀN ĐANG CHỜ BẠN. Cạn là thua, nên đừng chần chừ quá lâu.',
    htPouch: 'Vàng kiếm được trong màn, dùng để huấn luyện rồng.',
    htMovesD: 'Số lượt còn lại. Hết lượt mà đủ điểm là qua màn.',
    htSkillT: '5 · Kỹ năng',
    htSkFire: 'Hơi lửa — nạp đầy bằng combo, xoá sạch một hàng ngang.',
    htSkHammer: 'Búa — chạm rồi chọn một viên bất kỳ để đập vỡ.',
    htSkShuffle: 'Xáo bài — trộn lại cả bàn khi bí nước.',
    tutDrag: 'Kéo viên đá theo mũi tên',
    tutGoal: 'Xếp 3 viên cùng loại để phá!',

    // chọn trứng
    eggTitle: 'Chọn quả trứng của bạn',
    eggHint: 'Mỗi giống rồng mang một thiên phú riêng — chọn xong không đổi được.',
    trait: 'Thiên phú', hatch: 'Ấp trứng',
    might: 'Sức mạnh', spirit: 'Ý chí', fortune: 'May mắn', breath: 'Hơi lửa',

    // bản đồ
    mapTitle: 'Hành trình', world: 'Bản đồ lớn', region: 'Mảnh {n}/10',
    langPick: 'Chọn ngôn ngữ', close: 'Đóng',
    regionLocked: 'Mảnh này sẽ mở ở bản sau — theo dõi ROADMAP nhé!',
    pokeHint: 'Chạm vào dế xem nó nói gì', episode: 'Chương', level: 'Màn',
    locked: 'Chưa mở', play: 'Chơi', nest: 'Tổ rồng', comingSoon: 'Ra mắt tuần sau',

    // tổ rồng
    nestTitle: 'Tổ Dế', mats: 'Nguyên liệu', crafted: 'Đã chế {n}!',
    needMats: 'Thiếu nguyên liệu', noGear: 'Chưa chế món nào cho ô này',
    unequipped: 'Đã tháo hết trang bị', worn: 'ĐANG MẶC', ownedTap: 'Đã có — chạm để mặc',
    empty: '(trống)', ownCount: 'đã chế: {n}', gearTotal: 'Tổng cộng',
    duelPower: 'Lực chiến',
    st_hp: 'Máu', st_atk: 'Đòn', st_crit: 'Chí mạng', st_charge: 'Gồng', stage: 'Giai đoạn', train: 'Huấn luyện',
    feed: 'Cho ăn', evolve: 'Tiến hóa', gold: 'Vàng', food: 'Thức ăn',
    toNext: 'Còn {n} EXP đến {s}', maxStage: 'Đã đạt hình thái tối thượng',
    notEnough: 'Không đủ vàng', trained: 'Rèn luyện thành công!',

    // trong màn
    score: 'ĐIỂM', goal: 'Mục tiêu', moves: 'Lượt', vitality: 'Sinh lực',
    goalHit: 'ĐẠT MỤC TIÊU!',
    duelTitle: 'ĐẤU TAY ĐÔI', duelRound: 'Hiệp {n}',
    duelEven: 'CÂN SỨC', duelWeaker: 'Bạn nhỉnh hơn', duelStronger: 'Nó nhỉnh hơn',
    duelTie: 'Hoà — cả hai sượt nhẹ', duelCrit: 'CHÍ MẠNG!', duelCharged: 'GỒNG!',
    duelCharge: 'Gồng — thắng liên tiếp để nạp', duelChargeReady: 'GỒNG ĐẦY — đòn sau nhân đôi!',
    duelFlee: 'Bỏ chạy (−10% vàng)', duelFled: 'Bạn đã bỏ chạy',
    duelWin: 'THẮNG!', duelLose: 'THUA…',
    duelTipWin: 'Càng luyện Sức mạnh và Ý chí, đòn càng nặng và càng lì đòn.',
    duelTipLose: 'Về Tổ Rồng luyện thêm rồi quay lại — đối thủ luôn được ghép cân sức với bạn.',
    duelAmbush: 'BỊ CHẶN ĐƯỜNG!', duelArena: 'Đấu trường',
    hp: 'Máu', foes: 'Thiên địch', foeDown: 'HẠ GỤC!',
    foeKilled: 'Bạn gục ngã trước thiên địch',
    foeBite: 'Bị cắn!', foeRob: 'Kiến cướp {n} vàng!', foeWeb: 'Bị giăng tơ!', foePush: 'Nhện đẩy đá xuống!',
    foeDrain: 'Bị hút mất 4 giây!', foeSwarm: 'Ong vây!',
    foesAlive: 'Còn {n} thiên địch — diệt hết mới được 3 sao',
    foesEscaped: 'Bỏ sót {n} thiên địch → chỉ 1 sao, mất 25% vàng',
    penalty: 'Phạt: −{g} vàng · −{x} EXP',
    wasted: '−1 lượt!',
    storyNext: 'Tiếp', storyGo: 'Vào màn', storySkip: 'Bỏ qua',
    time: 'Thời gian', outOfTime: 'Hết giờ!', hurry: 'NHANH LÊN!',
    shots: 'Lượt bắn', outOfShots: 'Hết đá để bắn', breached: 'Đá tràn xuống vạch!',
    modeShoot: 'Bắn Đá', modeMatch: 'Ghép Đá',
    htShootT: '6 · Bắn Đá',
    htTokenD: 'Thỉnh thoảng một viên đá mang huy hiệu: ĐỒNG HỒ cộng 5 giây, TÚI VÀNG cộng vàng, NGÔI SAO cộng điểm. Phá viên đó để nhận.',
    htTimeD: 'Đồng hồ chạy liên tục — hết giờ là thua, phải chơi lại màn. Hãy nhặt đồng hồ để kéo dài thời gian!',
    htShootD: 'Kéo để ngắm rồi thả để bắn. Ba viên cùng màu chạm nhau là vỡ. Cụm nào đứt khỏi trần sẽ rơi — rơi được nhiều điểm gấp đôi. Chạm viên kế bên để đổi.',
    plusTime: '+{n} giây', plusGold: '+{n} vàng', plusScore: 'Thưởng!',
    combo: 'Liên hoàn', shuffling: 'Hết nước đi — xáo lại bàn!',
    paused: 'Tạm dừng', resume: 'Tiếp tục', restart: 'Chơi lại', quit: 'Rời màn',
    quitAsk: 'Rời màn? Tiến trình màn này sẽ mất.',
    lowVitality: 'Sinh lực cạn!',

    // kết quả
    shop: 'Cửa hàng', shopPoor: 'Không đủ vàng!', shopBought: 'Đã mua {n}!',
    shopEmpty: 'Chưa có món nào ở ô này.', wear: 'Mặc vào',
    ev_tet: 'TẾT', ev_trungthu: 'TRUNG THU', ev_halloween: 'HALLOWEEN',
    cleared: 'Qua màn!', failed: 'Thất bại', finalScore: 'Tổng điểm',
    finishNow: 'QUA MÀN NGAY', bravoBlast: 'Nổ hết đá đặc biệt!',
    bravoMoves: 'Lượt thừa → vàng', bravoShots: 'Phát thừa → vàng', bravoTime: 'Giờ thừa → vàng', bravoDone: 'Tuyệt vời!',
    loreNew: 'BÀI HỌC MỚI', loreKnown: 'ĐÃ BIẾT', duelRankHint: 'Mạnh hơn — nhưng rơi đồ nặng tay hơn',
    reward: 'Phần thưởng', next: 'Màn kế', retry: 'Thử lại', toMap: 'Về bản đồ',
    outOfMoves: 'Hết lượt đi', vitalityGone: 'Rồng kiệt sức',
    newStage: 'Rồng của bạn tiến hóa!',

    // lời khen combo
    praise: ['Tốt!', 'Hay lắm!', 'Tuyệt vời!', 'Xuất sắc!', 'Bùng nổ!', 'CUỒNG LONG!'],
  },
  en: {
    tagline: 'Proto-Cricket Realm',
    tapStart: 'Tap to begin',
    newGame: 'New Game', continueGame: 'Continue', settings: 'Settings',
    confirmReset: 'Tap again to erase progress',
    language: 'Language', music: 'Music', sound: 'Sound', back: 'Back',
    on: 'On', off: 'Off',

    howTo: 'How to play', gotIt: 'Got it',
    htSwapT: '1 · Swap',
    htSwapD: 'Drag a gem onto a neighbour (or tap the two in turn). If the swap makes no match the gems snap back and you STILL LOSE A MOVE — think before you act.',
    htMatchT: '2 · Line up three or more',
    htMatchD: 'Three of a kind in a line breaks. Gems fall in to refill, which can chain — longer chains score far more.',
    htSpecialT: '3 · Special gems',
    htSpec4: 'Match 4 → Flame Lance: clears exactly ONE row (horizontal match) or ONE column (vertical match).',
    htSpecL: 'Match an L or T → Cricket Cross: blasts the row AND the column.',
    htSpec5: 'Match 5 → Prismatic Egg: removes every gem of one colour.',
    htSpecCombo: 'Swap two special gems together for a much bigger blast.',
    htHudT: '4 · The panel',
    htCrown: 'Progress toward the level score goal.',
    htHeart: 'Vitality — it only drains WHILE THE BOARD WAITS FOR YOU. Hit zero and you lose, so keep moving.',
    htPouch: 'Gold earned this level, spent on training your hero.',
    htMovesD: 'Moves left. Run out with enough score and you clear the level.',
    htSkillT: '5 · Skills',
    htSkFire: 'Firebreath — charges on combos, wipes one row.',
    htSkHammer: 'Hammer — tap it, then tap any gem to smash it.',
    htSkShuffle: 'Shuffle — reshuffle the whole board when you are stuck.',
    tutDrag: 'Drag the gem along the arrow',
    tutGoal: 'Line up three of a kind to break them!',

    eggTitle: 'Choose your egg',
    eggHint: 'Every breed carries its own gift — this choice is permanent.',
    trait: 'Trait', hatch: 'Hatch',
    might: 'Might', spirit: 'Spirit', fortune: 'Fortune', breath: 'Breath',

    mapTitle: 'Journey', world: 'World map', region: 'Region {n}/10',
    langPick: 'Choose language', close: 'Close',
    regionLocked: 'This region opens in a later release — watch the ROADMAP!',
    pokeHint: 'Tap the cricket and see what it says', episode: 'Episode', level: 'Level',
    locked: 'Locked', play: 'Play', nest: 'Nest', comingSoon: 'Next week',

    nestTitle: 'Cricket Nest', mats: 'Materials', crafted: 'Crafted {n}!',
    needMats: 'Not enough materials', noGear: 'Nothing crafted for this slot',
    unequipped: 'All gear removed', worn: 'EQUIPPED', ownedTap: 'Owned — tap to equip',
    empty: '(empty)', ownCount: 'owned: {n}', gearTotal: 'Total',
    duelPower: 'Power',
    st_hp: 'HP', st_atk: 'ATK', st_crit: 'Crit', st_charge: 'Charge',
    stage: 'Stage', train: 'Train',
    feed: 'Feed', evolve: 'Evolve', gold: 'Gold', food: 'Food',
    toNext: '{n} EXP to {s}', maxStage: 'Final form reached',
    notEnough: 'Not enough gold', trained: 'Training complete!',

    score: 'SCORE', goal: 'Goal', moves: 'Moves', vitality: 'Vitality',
    goalHit: 'GOAL REACHED!',
    duelTitle: 'DUEL', duelRound: 'Round {n}',
    duelEven: 'EVEN MATCH', duelWeaker: 'You are stronger', duelStronger: 'It is stronger',
    duelTie: 'Tie — both graze', duelCrit: 'CRITICAL!', duelCharged: 'CHARGED!',
    duelCharge: 'Charge — win in a row to fill', duelChargeReady: 'CHARGED — next hit is doubled!',
    duelFlee: 'Flee (−10% gold)', duelFled: 'You fled',
    duelWin: 'VICTORY!', duelLose: 'DEFEAT…',
    duelTipWin: 'Train Might and Spirit — heavier hits, tougher hide.',
    duelTipLose: 'Train at the Nest and come back — foes are always matched to your power.',
    duelAmbush: 'AMBUSHED!', duelArena: 'Arena',
    hp: 'HP', foes: 'Foes', foeDown: 'DOWN!',
    foeKilled: 'You fell to the predators',
    foeBite: 'Bitten!', foeRob: 'Ants stole {n} gold!', foeWeb: 'Webbed!', foePush: 'Spider pushed the stones down!',
    foeDrain: 'Drained 4 seconds!', foeSwarm: 'Swarmed!',
    foesAlive: '{n} predators left — clear them for 3 stars',
    foesEscaped: '{n} predators left alive → 1 star only, −25% gold',
    penalty: 'Penalty: −{g} gold · −{x} EXP',
    wasted: '−1 move!',
    storyNext: 'Next', storyGo: 'Begin', storySkip: 'Skip',
    time: 'Time', outOfTime: 'Time up!', hurry: 'HURRY!',
    shots: 'Shots', outOfShots: 'Out of stones', breached: 'Stones crossed the line!',
    modeShoot: 'Stone Shot', modeMatch: 'Match',
    htShootT: '6 · Stone Shot',
    htTokenD: 'Now and then a stone carries a badge: CLOCK adds 5 seconds, POUCH adds gold, STAR adds score. Break it to collect.',
    htTimeD: 'The clock never stops — run out and you lose the level and must replay it. Grab clocks to buy more time!',
    htShootD: 'Drag to aim, release to fire. Three of a colour touching will break. Any cluster cut off from the ceiling drops — drops score double. Tap the spare stone to swap.',
    plusTime: '+{n}s', plusGold: '+{n} gold', plusScore: 'Bonus!',
    combo: 'Combo', shuffling: 'No moves left — reshuffling!',
    paused: 'Paused', resume: 'Resume', restart: 'Restart', quit: 'Quit',
    quitAsk: 'Leave the level? This run will be lost.',
    lowVitality: 'Vitality low!',

    shop: 'Shop', shopPoor: 'Not enough gold!', shopBought: 'Bought {n}!',
    shopEmpty: 'Nothing in this slot yet.', wear: 'Wear',
    ev_tet: 'NEW YEAR', ev_trungthu: 'MID-AUTUMN', ev_halloween: 'HALLOWEEN',
    cleared: 'Level clear!', failed: 'Defeat', finalScore: 'Final score',
    finishNow: 'FINISH NOW', bravoBlast: 'Blasting every special!',
    bravoMoves: 'Spare moves → gold', bravoShots: 'Spare shots → gold', bravoTime: 'Spare time → gold', bravoDone: 'Bravo!',
    loreNew: 'NEW LESSON', loreKnown: 'KNOWN', duelRankHint: 'Stronger — but the loot is heavier too',
    reward: 'Reward', next: 'Next', retry: 'Retry', toMap: 'Map',
    outOfMoves: 'Out of moves', vitalityGone: 'Your hero collapsed',
    newStage: 'Your hero evolved!',

    praise: ['Good!', 'Nice!', 'Great!', 'Excellent!', 'Blazing!', 'DRAGONFURY!'],
  },
};

const KEY = 'sdrakon.lang';
let lang = 'vi';
try {
  const saved = localStorage.getItem(KEY);
  if (saved && DICT[saved]) lang = saved;
  else if (!navigator.language?.toLowerCase().startsWith('vi')) lang = 'en';
} catch { /* localStorage bị chặn — dùng mặc định */ }

const listeners = new Set();
export const onLangChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
export const getLang = () => lang;
export function setLang(l) {
  if (!DICT[l] || l === lang) return;
  lang = l;
  try { localStorage.setItem(KEY, l); } catch { /* bỏ qua */ }
  listeners.forEach(fn => fn(l));
}
export const toggleLang = () => setLang(lang === 'vi' ? 'en' : 'vi');

/** t('toNext', {n: 120, s: 'Rồng con'}) */
export function t(key, vars) {
  let s = DICT[lang][key] ?? DICT.vi[key] ?? key;
  if (vars && typeof s === 'string')
    s = s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
  return s;
}

/** Lấy trường đã bản địa hoá từ object dữ liệu: tx(breed,'name') → name | name_en */
/**
 * Lấy chuỗi song ngữ từ một object dữ liệu.
 *
 * Repo có HAI quy ước cùng tồn tại:
 *    { name: 'Rơm',  name_en: 'Reed' }      → hậu tố _en
 *    { vi:   'hạt',  en:      'seeds' }     → cặp vi/en
 * Bản cũ chỉ hiểu quy ước thứ nhất, nên `tx(obj,'vi')` khi chơi tiếng Anh đi
 * tìm `vi_en`, không thấy, rồi rơi về `vi` — tức là trả nguyên tiếng Việt.
 * Mọi câu thoại, tên đòn và đơn vị mục tiêu đều dính lỗi này.
 */
export const tx = (obj, field) => {
  if (!obj) return '';
  if (lang !== 'en') return obj[field] ?? '';
  const en = obj[field + '_en'] ?? (field === 'vi' ? obj.en : undefined);
  return en ?? obj[field] ?? '';
};

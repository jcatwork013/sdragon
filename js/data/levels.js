// ── Episode & màn chơi ───────────────────────────────────────────────────────
// Mỗi tuần ra 1 episode: chỉ cần thêm 1 object vào EPISODES rồi tăng `unlockedWeek`.
// Engine không cần đổi dòng nào — xem ROADMAP.md §2.

/**
 * Sinh 15 màn cho 1 episode.
 *
 * Các hằng số dưới đây KHÔNG phải đoán mò — chúng lấy từ mô phỏng bằng
 * `dev/balance.mjs` (người chơi trung bình, nghĩ 2 giây mỗi nước), đo lại ngày
 * 20/08/2026 sau khi game có combo dây chuyền, đá đặc biệt và thanh Nộ:
 *   · bàn 5 màu: ≈ 748 điểm/lượt   ·   bàn 6 màu: ≈ 583 điểm/lượt (hệ số 0,78)
 *   (đo lại 20/08 sau khi bàn đổi sang 9 cột × 7 hàng — rộng hơn nên ăn điểm hơn)
 * Bảng cũ ghi 250 điểm/lượt — sai gần 4 lần, nên mục tiêu điểm hoá ra chỉ bằng
 * một phần tư sức người chơi: mô phỏng cho 100% qua màn, 3,0 sao đều tăm tắp.
 * Vì PER_MOVE nay ĐÚNG bằng điểm trung vị, `ratio` đọc thẳng ra được:
 *   ratio = phần điểm trung vị mà màn đòi hỏi → 0,84 ≈ 75% qua màn · 0,95 ≈ 55%.
 *
 * `vitScale` leo thang theo chương: chương 1 thanh Sinh lực gần như không giết ai
 * (chỉ dạy cơ chế), tới chương 3 nó mới thành mối đe doạ thật với người chơi chậm.
 */
const PER_MOVE = 748;
/** Bắn Đá kiếm ít điểm hơn hẳn mỗi lần bấm — đo bằng dev/balance-shoot.mjs. */
const PER_SHOT = 252;
/** Bắn Đá dễ về đích hơn Ghép Đá ở cùng độ sâu → cộng thêm chừng này vào ratio. */
const SHOOT_BUMP = 0.09;
/** Số cặp của một màn Ghép Đôi — PHẢI khớp với js/scenes/pair.js. */
const pairsFor = (n) => Math.max(6, Math.min(12, 6 + Math.floor(n / 3)));

/**
 * Đội hình thiên địch. 4 màn đầu KHÔNG có địch để người chơi làm quen luật,
 * sau đó tăng dần; cứ 15 màn có một con trùm.
 */
function enemiesFor(globalIndex) {
  if (globalIndex < 4) return [];
  // Trùm cuối chương: chương 1–2 là Cóc Già, từ chương 3 trở đi là Cốc Mỏ Sắt —
  // đổi mặt trùm cho hành trình có nấc, chứ không phải gặp mãi một con.
  if ((globalIndex + 1) % 15 === 0)
    return [[globalIndex >= 30 ? 'bird' : 'toad', 1 + Math.floor(globalIndex / 15)]];
  const tier = 1 + Math.floor(globalIndex / 12);
  const pool = ['ant', 'wasp', 'spider', 'mantis'];
  const n = globalIndex < 14 ? 1 : globalIndex < 30 ? 2 : 3;
  return Array.from({ length: n }, (_, k) => [pool[(globalIndex + k * 3) % pool.length], tier]);
}

function makeLevels(ep, baseMoves, colours, epBump = 0, vitScale = 1, epOffset = 0) {
  return Array.from({ length: 15 }, (_, i) => {
    const n = i + 1;
    const moves = baseMoves - Math.round(i * 2 / 14);        // bớt nhẹ, để mục tiêu vẫn tăng dần
    const ratio = 0.76 + i * 0.0075 + epBump;                // càng sâu càng sát trần
    const colourScale = colours >= 6 ? 0.78 : 1;             // đo từ mô phỏng, không phải ước lượng
    const wave = 1 + 0.025 * Math.sin(n * 1.1);              // gợn dễ/khó cho đỡ đều đều
    // Cứ 4 màn có 1 màn Bắn Đá → nhịp chơi luôn đổi vị, không bị chán.
    // Ba chế độ xen kẽ cho hành trình đỡ đơn điệu. Ghép Đôi thưa nhất (7 màn
    // một lần) vì nó là màn đổi nhịp — dày quá thì mất tác dụng nghỉ tay.
    const mode = n % 7 === 0 ? 'pair' : n % 4 === 0 ? 'shoot' : 'match3';
    const shots = Math.round(moves * 1.5);
    return {
      id: `${ep}-${n}`,
      index: n,
      mode,
      shots,
      // ── Tham số RIÊNG cho chế độ Bắn Đá ─────────────────────────────
      // Bắn bóng khó hơn ghép đá ở cùng số màu: ghép 3 phải TRÚNG ĐÍCH chứ
      // không chỉ cần nhìn thấy. Vì vậy dùng ÍT MÀU HƠN và trần tụt CHẬM HƠN,
      // rồi mới siết dần theo độ sâu.
      // GIỮ NGUYÊN 4 MÀU suốt game. Đo được: nhảy lên 5 màu làm tỉ lệ qua màn
      // của người chơi trung bình tụt từ ~70% xuống ~10% — bước nhảy quá lớn.
      // Độ khó về sau đến từ mục tiêu điểm, số lần tụt trần và thiên địch.
      shootColours: 4,
      // SỐ LẦN tụt trần được cố định theo độ sâu (3→5 lần cả ván), rồi mới suy
      // ra khoảng cách. Nếu cố định khoảng cách thì màn dài (chương 3 có 57
      // phát) sẽ ăn tới 6–7 lần tụt và thua chắc — đo được bằng dev/balance-shoot.mjs.
      pushEvery: Math.max(8, Math.ceil(shots / (3 + Math.floor((epOffset + i) / 22) + 1))),
      startRows: 3 + Math.min(2, Math.floor((epOffset + i) / 18)),
      // ── MỤC TIÊU ĐIỂM: mỗi chế độ một thang, KHÔNG dùng chung ─────────
      // Trước đây cả ba chế độ xài chung công thức của Ghép Đá rồi nhân 0,86
      // cho Bắn Đá, còn Ghép Đôi thì bê nguyên. Đo bằng dev/balance-shoot.mjs:
      // Bắn Đá chỉ kiếm ~240 điểm/phát nên mục tiêu chung làm tỉ lệ qua màn tụt
      // còn 14%; Ghép Đôi thì mục tiêu còn CAO HƠN điểm tối đa lý thuyết của
      // bàn — tức là không cách nào thắng. Nay tách hẳn ba thang:
      //   · Ghép Đá  — 700 điểm/lượt (5 màu), 6 màu nhân 0,78
      //   · Bắn Đá   — 240 điểm/phát, tính theo SỐ PHÁT chứ không theo lượt
      //   · Ghép Đôi — suy từ chính luật tính điểm của nó: mỗi cặp 320 điểm,
      //     nhân chuỗi tăng dần; lấy mốc "lật hết bàn, chuỗi vừa phải".
      target: mode === 'shoot' ? Math.round(PER_SHOT * shots * (ratio + SHOOT_BUMP) * wave / 50) * 50
            : mode === 'pair'  ? Math.round(320 * pairsFor(n) * 1.05 * (1 + i * 0.015) / 50) * 50
            : Math.round(PER_MOVE * moves * ratio * colourScale * wave / 50) * 50,
      moves,
      colours,
      vitality: vitScale * (0.7 + i * 0.03),               // (giữ lại cho tương thích)
      // Quỹ thời gian: người chơi trung bình tốn ~2 giây/lượt cộng thời gian đá
      // rơi. Hệ số 4,7 cũ cho dư gần gấp đôi nên đồng hồ chỉ để trang trí —
      // siết còn 3,6 và giảm nhanh hơn theo màn để cuối chương phải rát tay,
      // nhưng vẫn dư ~40% so với thời gian bấm tối thiểu (đo bằng dev/balance.mjs).
      time: Math.round(moves * (3.9 - i * 0.035)),
      tokenRate: 0.034 - i * 0.0009,                       // đá mang vật phẩm thưa dần
      enemies: enemiesFor(epOffset + i),
      star: [1.0, 1.34, 1.78],                             // 1★ = đạt target · 2★ · 3★
    };
  });
}

export const EPISODES = [
  {
    hook: 'Bờ cỏ nhà. Nắng đẹp, hàng xóm lắm chuyện, và một cái kho trống trơn.',
    hook_en: 'Home grass bank. Nice sun, nosy neighbours, and a completely empty pantry.',
    tag: 'Dễ thở — cứ ghép rồi tính', tag_en: 'Easy going — just match and see',
    id: 'shellbreak', biome: 'grass', name_en: 'Shellbreak', story_en: 'The egg you chose just trembled. The shell splits — a tiny creature looks at you, hungry.', week: 1, name: 'Nứt Vỏ', latin: 'Shellbreak',
    sky: ['#ffd7a8', '#b9d8f5', '#8fb8e8'], hill: '#7fb861', mount: '#9a94c8',
    story: 'Quả trứng bạn chọn vừa rung lên. Vỏ nứt — một sinh vật bé xíu nhìn bạn, đói.',
    levels: makeLevels('shellbreak', 26, 5, 0,     1.00, 0),
  },
  {
    hook: 'Cỏ cháy hết rồi. Tro bay đầy trời, mà đám kiến vẫn đòi thu thuế.',
    hook_en: 'The grass all burned. Ash everywhere, and the ants still want their cut.',
    tag: 'Nóng hơn — địch bắt đầu hỗn', tag_en: 'Hotter — the locals get pushy',
    id: 'ashmeadow', biome: 'grass', name_en: 'Ashmeadow', story_en: 'Here the grass grows on ash. Your hatchling smells something still burning past the horizon.', week: 2, name: 'Đồng Cỏ Tro', latin: 'Ashmeadow',
    sky: ['#f7c6a0', '#cfa9c9', '#7f7fb0'], hill: '#8a9a5b', mount: '#7d6f9c',
    story: 'Cỏ ở đây mọc trên tro. Dế con ngửi thấy thứ gì đó cháy dở phía chân trời.',
    levels: makeLevels('ashmeadow',  34, 6, 0.110, 1.35, 15),
  },
  {
    hook: 'Hang đá lạnh ngắt. Có tiếng nhỏ giọt, và có thứ gì đó đang nhìn.',
    hook_en: 'A cold quartz cave. Something drips. Something watches.',
    tag: 'Căng — nhìn kỹ rồi hãy đi', tag_en: 'Tense — look before you move',
    id: 'quartz', biome: 'grass', name_en: 'Quartz Hollow', story_en: 'The cavern walls hold a thousand crickets. It chirps — a thousand chirps answer back.', week: 3, name: 'Hang Thạch Anh', latin: 'Quartz Hollow',
    sky: ['#c9d6ff', '#a5b4f0', '#6f7fd4'], hill: '#6a7fa8', mount: '#5a5f96',
    story: 'Vách hang phản chiếu ngàn con dế. Nó gáy — ngàn tiếng gáy đáp lại.',
    levels: makeLevels('quartz',     38, 6, 0.120, 1.75, 30),
  },

  // ── MẢNH 2 · ĐẦM RÊU ─────────────────────────────────────────────────────
  // Hết 45 màn của Bờ Cỏ Nhà là phải có đường đi tiếp, chứ không phải cụt ngang
  // với dòng chữ "ra mắt tuần sau". Ba chương dưới đây nối thẳng vào mảnh 2.
  // Khó hơn hẳn mảnh 1: đều 6 màu, trần điểm cao hơn, thiên địch dày hơn.
  {
    hook: 'Qua con suối là đầm. Bùn tới bụng, mà tiếng gì đó cứ lụp bụp dưới đáy.',
    hook_en: 'Past the stream lies the bog. Mud to your belly, and something keeps plopping below.',
    tag: 'Lún chân — đi chậm mà chắc', tag_en: 'Sinking mud — slow and careful',
    id: 'mire', biome: 'bog', name_en: 'Reedshore', story_en: 'The reeds close overhead. Every step makes a wet sucking sound that something down there can hear.', week: 4, name: 'Bờ Sình', latin: 'Reedshore',
    sky: ['#a8c8a0', '#7fa892', '#4f6f70'], hill: '#5f7f5a', mount: '#4a6560',
    story: 'Sậy khép kín trên đầu. Mỗi bước chân kêu oàm oạp — và dưới kia có thứ nghe được tiếng đó.',
    levels: makeLevels('mire',       38, 6, 0.100, 1.70, 45),
  },
  {
    hook: 'Rừng sậy cao gấp mười lần bạn. Gió đi qua nghe như ai đó thì thầm.',
    hook_en: 'Reeds ten times your height. The wind through them sounds like whispering.',
    tag: 'Rối rắm — dễ lạc đường', tag_en: 'Tangled — easy to get lost',
    id: 'reedmaze', biome: 'bog', name_en: 'Whisperreed', story_en: 'A maze of reeds where the wind speaks. Follow the wrong whisper and you walk in circles till dark.', week: 5, name: 'Rừng Sậy', latin: 'Whisperreed',
    sky: ['#cfd9a8', '#9fb87f', '#6f7f5f'], hill: '#7f9a5a', mount: '#5f7050',
    story: 'Mê cung sậy, gió nói thay người. Nghe nhầm một tiếng là đi vòng tới tối.',
    levels: makeLevels('reedmaze',   40, 6, 0.110, 1.78, 60),
  },
  {
    hook: 'Chỗ sâu nhất của đầm. Nước đen, không thấy đáy, và im lặng đến rợn.',
    hook_en: 'The deepest part of the bog. Black water, no bottom in sight, and a silence that hums.',
    tag: 'Nặng đô — trùm đợi ở cuối', tag_en: 'Heavy going — a boss waits at the end',
    id: 'deepmire', biome: 'bog', name_en: 'Blackwater', story_en: 'Black water that shows no bottom. Whatever guards this place has been here longer than the reeds.', week: 6, name: 'Đầm Sâu', latin: 'Blackwater',
    sky: ['#6f7f9a', '#4a5570', '#2f3550'], hill: '#3f5550', mount: '#2f4048',
    story: 'Nước đen không thấy đáy. Thứ canh chỗ này có mặt ở đây từ trước cả đám sậy.',
    levels: makeLevels('deepmire',   42, 6, 0.120, 1.86, 75),
  },

  // ── MẢNH 3 · ĐỈNH GIÓ ────────────────────────────────────────────────────
  // Nền 'peak': núi đá nhọn, biển mây dưới chân, vệt gió chạy ngang.
  {
    hook: 'Đường lên dốc đứng. Gió tát vào mặt, hạt đang rơi cũng bị thổi lệch.',
    hook_en: 'A steep climb. The wind slaps your face and knocks falling seeds off course.',
    tag: 'Gió mạnh — bám cho chắc', tag_en: 'Hard wind — hold on tight',
    id: 'cliff', biome: 'peak', name_en: 'Stonestep', story_en: 'Stone steps cut by rain, not by hands. Wind takes anything you do not hold.', week: 7, name: 'Bậc Đá', latin: 'Stonestep',
    sky: ['#dbe8ff', '#a8c0e8', '#6a7fb0'], hill: '#8a9aa8', mount: '#6f7f96',
    story: 'Bậc đá do mưa xẻ ra chứ không phải ai đục. Gió cuốn đi mọi thứ mình không giữ chặt.',
    levels: makeLevels('cliff',      40, 6, 0.105, 1.85, 90),
  },
  {
    hook: 'Trên này mây nằm dưới chân. Bước hụt một cái là rơi vào mây.',
    hook_en: 'Up here the clouds are below you. One wrong step and you fall into them.',
    tag: 'Chóng mặt — sai một nhịp là rơi', tag_en: 'Dizzying — one bad beat and you drop',
    id: 'cloudsea', biome: 'peak', name_en: 'Cloudsea', story_en: 'A white sea rolls beneath the ridge. Nobody knows what is under it, and nobody volunteers.', week: 8, name: 'Biển Mây', latin: 'Cloudsea',
    sky: ['#f0f6ff', '#c8d8f5', '#8a9fd0'], hill: '#9aa8b8', mount: '#7f8fa8',
    story: 'Biển trắng cuộn dưới sống núi. Chẳng ai biết dưới đó có gì, và chẳng ai xung phong xuống xem.',
    levels: makeLevels('cloudsea',   40, 6, 0.115, 1.88, 105),
  },
  {
    hook: 'Chóp cao nhất. Không khí loãng, tiếng gáy bay đi xa hơn thường lệ.',
    hook_en: 'The highest crown. Thin air, and a chirp that carries further than it should.',
    tag: 'Đỉnh điểm — trùm ngồi trên chóp', tag_en: 'The summit — a boss sits on top',
    id: 'windcrown', biome: 'peak', name_en: 'Windcrown', story_en: 'The last crag. Whatever nests up here has never had to share the sky.', week: 9, name: 'Chóp Gió', latin: 'Windcrown',
    sky: ['#cfe0ff', '#9fb4e0', '#5f6f9a'], hill: '#7f8ea0', mount: '#5f7089',
    story: 'Mỏm đá cuối cùng. Thứ làm tổ trên này chưa từng phải chia bầu trời với ai.',
    levels: makeLevels('windcrown',  42, 6, 0.125, 1.92, 120),
  },

  // ── MẢNH 4 · RỪNG NẤM ────────────────────────────────────────────────────
  // Nền 'mush': trời đêm đầy sao, trăng lưỡi liềm, nấm khổng lồ phát sáng.
  {
    hook: 'Xuống thung lũng thì trời tối hẳn. Nhưng dưới này có thứ tự phát sáng.',
    hook_en: 'Down in the valley it goes dark. But something down here glows on its own.',
    tag: 'Tối om — nhìn ánh nấm mà đi', tag_en: 'Pitch dark — follow the mushroom light',
    id: 'glowvale', biome: 'mush', name_en: 'Glowvale', story_en: 'Mushrooms taller than you, breathing light. The old ones say never eat the ones that blink.', week: 10, name: 'Thung Lân Tinh', latin: 'Glowvale',
    sky: ['#2f2450', '#3d2f6a', '#171029'], hill: '#3f5f52', mount: '#4a3f72',
    story: 'Nấm cao hơn đầu người, thở ra ánh sáng. Người già dặn: đừng ăn cái nào tự nhấp nháy.',
    levels: makeLevels('glowvale',   40, 6, 0.115, 1.90, 135),
  },
  {
    hook: 'Bào tử bay đầy trời như tuyết. Hít nhiều thì thấy cái không có thật.',
    hook_en: 'Spores drift like snow. Breathe too much and you see things that are not there.',
    tag: 'Mờ ảo — đừng tin hết mắt mình', tag_en: 'Hazy — do not trust everything you see',
    id: 'sporefall', biome: 'mush', name_en: 'Sporefall', story_en: 'A snowfall that is not snow. It settles on your back and makes the path look longer than it is.', week: 11, name: 'Mưa Bào Tử', latin: 'Sporefall',
    sky: ['#3a2c5e', '#4a3a7a', '#1c1433'], hill: '#4a6f5a', mount: '#55487f',
    story: 'Một trận tuyết không phải tuyết. Nó đậu lên lưng và làm con đường trông dài hơn thật.',
    levels: makeLevels('sporefall',  42, 6, 0.125, 1.95, 150),
  },
  {
    hook: 'Giữa rừng có một cái nấm to bằng cả xóm. Bên dưới nó, thứ gì đó thở.',
    hook_en: 'At the heart stands a mushroom the size of a hamlet. Under it, something breathes.',
    tag: 'Sâu nhất — nín thở mà đi', tag_en: 'Deepest — hold your breath',
    id: 'deepglow', biome: 'mush', name_en: 'Deepglow', story_en: 'The heart of the wood, lit from below. Every creature here has learned to move without sound.', week: 12, name: 'Lõi Sáng', latin: 'Deepglow',
    sky: ['#241a44', '#382a63', '#120c22'], hill: '#3f6a58', mount: '#463a6f',
    story: 'Lõi rừng, sáng từ dưới lên. Con gì sống ở đây cũng học được cách đi không gây tiếng động.',
    levels: makeLevels('deepglow',   42, 6, 0.135, 2.00, 165),
  },
];

/**
 * BẢN ĐỒ LỚN — 10 mảnh. Bản hiện tại mới mở MẢNH 1 (gồm 3 chương / 45 màn);
 * 9 mảnh còn lại để "???" và sẽ mở dần theo lịch phát hành ở ROADMAP.md.
 * Thêm mảnh mới = điền tên + danh sách episode vào đây, engine không phải sửa.
 */
/**
 * Mảnh đất nào chứa màn thứ i, và i có phải màn CUỐI của mảnh đó không.
 * Mảnh 1 hiện ôm cả ba chương (45 màn); các mảnh sau chưa có màn nào, nên
 * hàm này trả về mảnh cuối cùng có nội dung.
 */
export function regionOf(i) {
  let n = 0;
  for (const r of REGIONS) {
    const cnt = (r.episodes || []).reduce(
      (a2, id) => a2 + (EPISODES.find(e => e.id === id)?.levels.length || 0), 0);
    if (cnt && i < n + cnt) return { region: r, from: n, to: n + cnt - 1 };
    n += cnt;
  }
  return null;
}
export const isRegionEnd = (i) => { const r = regionOf(i); return !!r && i === r.to; };
export const nextRegion = (i) => {
  const r = regionOf(i); if (!r) return null;
  const k = REGIONS.indexOf(r.region);
  return REGIONS[k + 1] || null;
};

/**
 * MƯỜI MẢNH ĐẤT của hành trình.
 *
 * Mảnh chưa mở KHÔNG còn là dấu "?" trơ trọi kèm câu "theo dõi ROADMAP nhé":
 * mỗi mảnh có tên và một mẩu chuyện người trong xóm đồn về nó. Chạm vào là
 * nghe được đồn thổi — mở khoá mới thành thứ đáng chờ, chứ không phải ô xám.
 */
export const REGIONS = [
  { id: 'r1',  open: true,  name: 'Bờ Cỏ Nhà',  name_en: 'Home Grass Bank',
    episodes: ['shellbreak', 'ashmeadow', 'quartz'], hue: '#7fb861',
    teaser: 'Nơi cái trứng nứt ra. Cỏ cháy rồi cỏ mọc lại, và ai cũng biết tên nhau.',
    teaser_en: 'Where the egg cracked open. The grass burns and grows back, and everyone knows your name.',
    story: 'Từ một quả trứng bé xíu, chú dế học cách tự kiếm ăn, giữ lời hứa và rời bờ cỏ thân quen. Chuyến đi bắt đầu khi một vệt tro lạ dẫn về phía đầm.',
    story_en: 'From a tiny egg, the young cricket learns to forage, keep a promise, and leave the familiar bank. A strange trail of ash points toward the bog.' },
  { id: 'r2',  open: true,  hue: '#6fa8c8', name: 'Đầm Rêu', name_en: 'Mirebog',
    episodes: ['mire', 'reedmaze', 'deepmire'],
    teaser: 'Qua con suối là vùng đầm phủ rêu. Đi một bước lún nửa chân, mà dây leo ở đó biết bò theo người.',
    teaser_en: 'Past the stream lies a moss-covered bog. Every step sinks, and the vines there follow you home.',
    story: 'Trong mê cung sậy, chú dế kết bạn với đàn đom đóm và giải cứu xóm bọ nước khỏi Cóc Già. Đổi lại, họ trao chiếc la bàn chỉ đường lên Đỉnh Gió.',
    story_en: 'In the reed maze, the cricket befriends fireflies and frees a water-bug hamlet from Old Toad. They offer a compass that points toward Windspire.' },
  { id: 'r3',  open: true,  episodes: ['cliff', 'cloudsea', 'windcrown'], hue: '#c98a4e', name: 'Đỉnh Gió', name_en: 'Windspire',
    teaser: 'Gió trên đỉnh thổi lệch cả hạt đang rơi. Dế nào lên tới nơi cũng phải học cách bám.',
    teaser_en: 'Wind up there knocks falling seeds off course. Whoever climbs it learns to hold on.',
    story: 'Gió dữ buộc chú dế phải biết nhờ bạn bè thay vì chỉ cậy đôi càng. Trên chóp núi, Cốc Mỏ Sắt để lộ bí mật về ngọn lửa đang âm ỉ dưới đồng cỏ.',
    story_en: 'The gale teaches the cricket to trust friends instead of relying on strong claws. At the summit, Ironbeak reveals what smoulders beneath the grasslands.' },
  { id: 'r4',  open: true,  episodes: ['glowvale', 'sporefall', 'deepglow'], hue: '#8b5fd6', name: 'Rừng Nấm', name_en: 'Mushroom Wood',
    teaser: 'Nấm cao hơn đầu người, ban đêm phát sáng. Người ta bảo đừng ăn cái nào tự nhấp nháy.',
    teaser_en: 'Mushrooms taller than you, glowing at night. They say never eat the ones that blink.',
    story: 'Bào tử làm ký ức lẫn lộn, khiến bạn bè nghi ngờ nhau. Chú dế phải nhận lỗi cũ và tìm Lõi Sáng trước khi cả khu rừng chìm vào giấc ngủ.',
    story_en: 'Spores tangle memories and turn friends against one another. The cricket must face an old mistake and find the Deepglow before the forest falls asleep.' },
  { id: 'r5',  open: false, hue: '#e0902c', name: 'Lò Than', name_en: 'Emberforge',
    teaser: 'Đất còn ấm dưới chân. Dưới lớp tro có thứ gì đó mấy mùa rồi vẫn chưa chịu tắt.',
    teaser_en: 'The ground is still warm. Under the ash something has refused to go out for seasons.',
    story: 'Lò Than giữ mảnh than sống có thể cứu đồng cỏ hoặc thiêu rụi nó. Muốn mang than đi, chú dế phải hoà giải hai xóm bọ đã tranh nhau ngọn lửa suốt nhiều mùa.',
    story_en: 'Emberforge guards a living coal that could save the meadows or burn them. To carry it onward, the cricket must reconcile two beetle clans divided for seasons.' },
  { id: 'r6',  open: false, hue: '#4f9c4a', name: 'Đồi Mối', name_en: 'Termite Hill',
    teaser: 'Một cái đồi do lũ mối đắp lên, cao như núi nhỏ. Bên trong là mê cung, bên ngoài là lính gác.',
    teaser_en: 'A hill the termites built, high as a small mountain. A maze inside, guards outside.',
    story: 'Dưới Đồi Mối là mạng đường hầm nối khắp miền. Khi lương thực biến mất, chú dế điều tra và phát hiện một kẻ đang cố buộc các loài quay lưng với nhau.',
    story_en: 'Beneath Termite Hill, tunnels link the whole realm. When stores vanish, the cricket uncovers a plot designed to turn every species against the others.' },
  { id: 'r7',  open: false, hue: '#e8384f', name: 'Suối Cạn', name_en: 'Dry Creek',
    teaser: 'Lòng suối trơ đá cuội. Ai cũng nói nước sẽ về, nhưng chưa ai nói bao giờ.',
    teaser_en: 'A creek bed of bare pebbles. Everyone says the water will return; nobody says when.',
    story: 'Nguồn nước bị chặn sau một bức tường rễ khổng lồ. Chú dế phải chọn phá đập thật nhanh hay dẫn cả đoàn đào một dòng chảy mới an toàn cho mọi tổ.',
    story_en: 'A wall of giant roots blocks the spring. The cricket must choose between breaking it quickly or leading every nest in digging a safer new channel.' },
  { id: 'r8',  open: false, hue: '#3f8fd0', name: 'Băng Nguyên', name_en: 'Frostreach',
    teaser: 'Sương ở đó đóng thành đá. Gáy to một tiếng là cả vùng nứt răng rắc theo.',
    teaser_en: 'The dew freezes solid there. Chirp too loud and the whole plain cracks along with you.',
    story: 'Giữa mùa băng, cả đoàn phải chia nhau hơi ấm và thức ăn. Tiếng gáy từng dùng để khoe sức giờ trở thành tín hiệu dẫn những kẻ lạc đường về trại.',
    story_en: 'Across the ice, the travellers must share warmth and food. A chirp once used to boast becomes a beacon guiding the lost back to camp.' },
  { id: 'r9',  open: false, hue: '#b98ad8', name: 'Vương Miện Cổ', name_en: 'Elder Crown',
    teaser: 'Vòng đá cũ trên đồi, nơi lũ thiên địch xưng vương từ trước khi có xóm cỏ.',
    teaser_en: 'An old ring of stones on the hill, where the predators crowned themselves before the hamlet existed.',
    story: 'Kẻ gieo chia rẽ chờ ở vòng đá cổ với một đội thiên địch. Trận cuối không chỉ cần sức mạnh: chú dế phải chứng minh các xóm vẫn đứng cạnh nhau sau mọi mất mát.',
    story_en: 'The architect of the conflict waits at the old stones with an army of predators. Victory depends on whether the divided hamlets still stand together.' },
  { id: 'r10', open: false, hue: '#f2e2a8', name: 'Miền Cỏ Mới', name_en: 'New Grass Realm',
    teaser: 'Cuối đường, nghe nói có một miền cỏ chưa từng cháy. Chưa ai đi tới để kể lại.',
    teaser_en: 'At the end of the road, they say, is grass that has never burned. Nobody has come back to confirm it.',
    story: 'Miền Cỏ Mới không phải phần thưởng dành riêng cho người mạnh nhất, mà là nơi cả đoàn cùng dựng lại mái nhà. Chú dế trở về Bờ Cỏ Nhà để kể rằng trưởng thành là biết sống có ích cho nhau.',
    story_en: 'The New Grass Realm is no private prize for the strongest; it is a home rebuilt together. The cricket returns to tell how growing up means becoming useful to others.' },
];

/** Danh sách phẳng, dùng cho bản đồ màn. */
export const ALL_LEVELS = EPISODES.flatMap(ep =>
  ep.levels.map(l => ({ ...l, ep: ep.id, epName: ep.name, epName_en: ep.name_en,
                        sky: ep.sky, hill: ep.hill, mount: ep.mount, biome: ep.biome }))
);

export const levelAt = (i) => ALL_LEVELS[Math.min(i, ALL_LEVELS.length - 1)];
export const TOTAL_LEVELS = ALL_LEVELS.length;

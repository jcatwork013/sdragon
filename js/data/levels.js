// ── Episode & màn chơi ───────────────────────────────────────────────────────
// Mỗi tuần ra 1 episode: chỉ cần thêm 1 object vào EPISODES rồi tăng `unlockedWeek`.
// Engine không cần đổi dòng nào — xem ROADMAP.md §2.

/**
 * Sinh 15 màn cho 1 episode.
 *
 * Các hằng số dưới đây KHÔNG phải đoán mò — chúng lấy từ mô phỏng 30 ván/màn
 * bằng `dev/balance.mjs` (người chơi trung bình, nghĩ 1,1 giây mỗi nước):
 *   · bàn 5 màu: ≈ 250 điểm/lượt   ·   bàn 6 màu: ≈ 200 điểm/lượt (đo được, không đoán)
 *   · tỉ lệ target/điểm-trung-vị 0,75 → ~90% qua màn;  0,86 → ~68%
 * Nhờ vậy đường cong khó đi từ "dễ làm quen" tới "phải cố" một cách có kiểm soát.
 *
 * `vitScale` leo thang theo chương: chương 1 thanh Sinh lực gần như không giết ai
 * (chỉ dạy cơ chế), tới chương 3 nó mới thành mối đe doạ thật với người chơi chậm.
 */
const PER_MOVE = 252;

/**
 * Đội hình thiên địch. 4 màn đầu KHÔNG có địch để người chơi làm quen luật,
 * sau đó tăng dần; cứ 15 màn có một con trùm.
 */
function enemiesFor(globalIndex) {
  if (globalIndex < 4) return [];
  if ((globalIndex + 1) % 15 === 0) return [['toad', 1 + Math.floor(globalIndex / 15)]];
  const tier = 1 + Math.floor(globalIndex / 12);
  const pool = ['ant', 'wasp', 'spider', 'mantis'];
  const n = globalIndex < 14 ? 1 : globalIndex < 30 ? 2 : 3;
  return Array.from({ length: n }, (_, k) => [pool[(globalIndex + k * 3) % pool.length], tier]);
}

function makeLevels(ep, baseMoves, colours, epBump = 0, vitScale = 1, epOffset = 0) {
  return Array.from({ length: 15 }, (_, i) => {
    const n = i + 1;
    const moves = baseMoves - Math.round(i * 2 / 14);        // bớt nhẹ, để mục tiêu vẫn tăng dần
    const ratio = 0.81 + i * 0.0086 + epBump;                // càng sâu càng sát trần
    const colourScale = colours >= 6 ? 0.80 : 1;             // đo từ mô phỏng, không phải ước lượng
    const wave = 1 + 0.025 * Math.sin(n * 1.1);              // gợn dễ/khó cho đỡ đều đều
    // Cứ 4 màn có 1 màn Bắn Đá → nhịp chơi luôn đổi vị, không bị chán.
    // Ba chế độ xen kẽ cho hành trình đỡ đơn điệu. Ghép Đôi thưa nhất (7 màn
    // một lần) vì nó là màn đổi nhịp — dày quá thì mất tác dụng nghỉ tay.
    const mode = n % 7 === 0 ? 'pair' : n % 4 === 0 ? 'shoot' : 'match3';
    return {
      id: `${ep}-${n}`,
      index: n,
      mode,
      shots: Math.round(moves * 1.5),
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
      pushEvery: Math.max(8, Math.ceil(Math.round(moves * 1.5) / (3 + Math.floor((epOffset + i) / 22) + 1))),
      startRows: 3 + Math.min(2, Math.floor((epOffset + i) / 18)),
      target: Math.round(PER_MOVE * moves * ratio * colourScale * wave * (mode === 'shoot' ? 0.86 : 1) / 50) * 50,
      moves,
      colours,
      vitality: vitScale * (0.7 + i * 0.03),               // (giữ lại cho tương thích)
      // Quỹ thời gian: đo từ mô phỏng, một ván trung bình tốn ~2,5 giây/lượt.
      // Hệ số giảm dần theo màn → càng sâu càng phải chơi nhanh tay.
      time: Math.round(moves * (4.7 - i * 0.075)),
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
    id: 'shellbreak', name_en: 'Shellbreak', story_en: 'The egg you chose just trembled. The shell splits — a tiny creature looks at you, hungry.', week: 1, name: 'Nứt Vỏ', latin: 'Shellbreak',
    sky: ['#ffd7a8', '#b9d8f5', '#8fb8e8'], hill: '#7fb861', mount: '#9a94c8',
    story: 'Quả trứng bạn chọn vừa rung lên. Vỏ nứt — một sinh vật bé xíu nhìn bạn, đói.',
    levels: makeLevels('shellbreak', 26, 5, 0,     1.00, 0),
  },
  {
    hook: 'Cỏ cháy hết rồi. Tro bay đầy trời, mà đám kiến vẫn đòi thu thuế.',
    hook_en: 'The grass all burned. Ash everywhere, and the ants still want their cut.',
    tag: 'Nóng hơn — địch bắt đầu hỗn', tag_en: 'Hotter — the locals get pushy',
    id: 'ashmeadow', name_en: 'Ashmeadow', story_en: 'Here the grass grows on ash. Your hatchling smells something still burning past the horizon.', week: 2, name: 'Đồng Cỏ Tro', latin: 'Ashmeadow',
    sky: ['#f7c6a0', '#cfa9c9', '#7f7fb0'], hill: '#8a9a5b', mount: '#7d6f9c',
    story: 'Cỏ ở đây mọc trên tro. Rồng con ngửi thấy thứ gì đó cháy dở phía chân trời.',
    levels: makeLevels('ashmeadow',  34, 6, 0.090, 1.35, 15),
  },
  {
    hook: 'Hang đá lạnh ngắt. Có tiếng nhỏ giọt, và có thứ gì đó đang nhìn.',
    hook_en: 'A cold quartz cave. Something drips. Something watches.',
    tag: 'Căng — nhìn kỹ rồi hãy đi', tag_en: 'Tense — look before you move',
    id: 'quartz', name_en: 'Quartz Hollow', story_en: 'The cavern walls hold a thousand dragons. It roars — a thousand roars answer back.', week: 3, name: 'Hang Thạch Anh', latin: 'Quartz Hollow',
    sky: ['#c9d6ff', '#a5b4f0', '#6f7fd4'], hill: '#6a7fa8', mount: '#5a5f96',
    story: 'Vách hang phản chiếu ngàn con rồng. Nó gầm — ngàn tiếng gầm đáp lại.',
    levels: makeLevels('quartz',     38, 6, 0.050, 1.75, 30),
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

export const REGIONS = [
  { id: 'r1',  open: true,  name: 'Bờ Cỏ Nhà',  name_en: 'Home Grass Bank',
    episodes: ['shellbreak', 'ashmeadow', 'quartz'], hue: '#7fb861' },
  { id: 'r2',  open: false, hue: '#6fa8c8' },
  { id: 'r3',  open: false, hue: '#c98a4e' },
  { id: 'r4',  open: false, hue: '#8b5fd6' },
  { id: 'r5',  open: false, hue: '#e0902c' },
  { id: 'r6',  open: false, hue: '#4f9c4a' },
  { id: 'r7',  open: false, hue: '#e8384f' },
  { id: 'r8',  open: false, hue: '#3f8fd0' },
  { id: 'r9',  open: false, hue: '#b98ad8' },
  { id: 'r10', open: false, hue: '#f2e2a8' },
];

/** Danh sách phẳng, dùng cho bản đồ màn. */
export const ALL_LEVELS = EPISODES.flatMap(ep =>
  ep.levels.map(l => ({ ...l, ep: ep.id, epName: ep.name, epName_en: ep.name_en,
                        sky: ep.sky, hill: ep.hill, mount: ep.mount }))
);

export const levelAt = (i) => ALL_LEVELS[Math.min(i, ALL_LEVELS.length - 1)];
export const TOTAL_LEVELS = ALL_LEVELS.length;

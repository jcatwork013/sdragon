// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  "MÙA CỎ CHÁY" — cốt truyện gốc, 7 hồi.                                  ║
// ║                                                                          ║
// ║  Đây là truyện tự viết cho game: KHÔNG lấy nhân vật, tình tiết hay tên    ║
// ║  của bất kỳ tác phẩm nào đang được bảo hộ.                                ║
// ║                                                                          ║
// ║  Mạch cảm xúc: hồn nhiên → mất mát → hy vọng → cao trào → gấp rút →      ║
// ║  lắng đọng → ấm áp.  Mỗi hồi tự đổi NHẠC và BẢNG MÀU của cả thế giới.     ║
// ╚══════════════════════════════════════════════════════════════════════════╝

export const ACTS = [
  {
    id: 'hatch', at: 0, scene: 'egg', mood: 'joy', music: 'nest',
    sky: ['#ffe3b0', '#bfe0f5', '#8fc4e8'], hill: '#7fb861', mount: '#a79ed0',
    title: 'Hồi I — Nứt Vỏ', title_en: 'Act I — The Shell Cracks',
    lines: [
      'Bờ cỏ ven ruộng có một quả trứng nằm im suốt mùa mưa. Bà con đi ngang ai cũng ghé tai nghe thử.',
      'Sáng ấy vỏ nứt đánh “tách”. Rơm chui ra, ngã dúi một cái, rồi đứng dậy làm như không có chuyện gì.',
      'Bà con cười ồ: “Càng con khoẻ đấy! Nhớ dùng cho phải nhé.”',
      'Rơm gật lia lịa. Thật ra nó chỉ nghe đúng hai chữ đầu — “khoẻ đấy”.',
    ],
    lines_en: [
      'On a grass bank by the paddy, an egg sat still all rainy season. Every neighbour who passed leaned in for a listen.',
      'That morning the shell went “tock”. Reed tumbled out, fell flat on his face, then stood up as if nothing had happened.',
      'The neighbours laughed: “Strong legs, that one! Remember to use them well.”',
      'Reed nodded and nodded. In truth he only heard the first two words — “strong legs”.',
    ],
  },
  {
    id: 'raid', at: 4, scene: 'raid', mood: 'sad', music: 'sad',
    sky: ['#e8b78a', '#c9a08e', '#8a7f92'], hill: '#a89a52', mount: '#8b7f8f',
    title: 'Hồi II — Cơn Nắng Lớn', title_en: 'Act II — The Long Drought',
    lines: [
      'Ba mùa không mưa. Cỏ vàng như rơm — trùng tên nó, nghe mà tủi.',
      'Đàn Kiến Lính kéo tới. Rơm thấy từ xa, nhưng đang bận biểu diễn cú nhảy ba vòng cho đám trẻ xem.',
      'Lúc quay lại, kho hạt trống trơn. Sương bị xước chân, vẫn cười: “Không sao đâu mà.”',
      'Chính cái “không sao đâu” ấy mới làm Rơm nằm mãi không ngủ được.',
      'Té ra khoẻ mà vô tâm thì cũng chỉ là cỏ khô.',
    ],
    lines_en: [
      'Three seasons without rain. The grass went straw-yellow — the same word as his name, which stung a little.',
      'The Soldier Ants came. Reed saw them coming, but he was busy performing a triple-spin jump for the little ones.',
      'When he turned back the seed store was empty. Dewlin had a scratched leg and still smiled: “It is nothing, really.”',
      'It was that “nothing, really” that kept him awake all night.',
      'Turns out strong-but-careless is just dry grass.',
    ],
  },
  {
    id: 'road', at: 9, scene: 'road', mood: 'hope', music: 'trail',
    sky: ['#ffd7a8', '#b9d8f5', '#8fb8e8'], hill: '#7fb861', mount: '#9a94c8',
    title: 'Hồi III — Đường Xa', title_en: 'Act III — The Long Road',
    lines: [
      'Người già kể: qua ba cánh đồng có Giếng Trời, nước không bao giờ cạn.',
      'Rơm khoác đai cói lên đường. Không phải để làm anh hùng — để chuộc lại một buổi sáng.',
      'Dọc đường nó nhặt thêm: Sương hát hay mà nhát, Lá khoẻ mà nóng, Mực lang thang bị cả xóm chê là “khác loài”.',
      'Bốn đứa cãi nhau suốt dọc đường. Nhưng bữa tối nào cũng ngồi chung một lá sen.',
    ],
    lines_en: [
      'The elders spoke of a Skywell three fields away, whose water never ran dry.',
      'Reed slung on his woven sash and left. Not to be a hero — to buy back one morning.',
      'Along the way he picked up: Dewlin, lovely singer and terrible coward; Fernwing, strong and short-fused; Inkspur, a wanderer the hamlet called “not our kind”.',
      'The four argued the whole way. And every single supper, they shared one lotus leaf.',
    ],
  },
  {
    id: 'marsh', at: 19, scene: 'marsh', mood: 'climax', music: 'climax',
    sky: ['#8f7fa8', '#6a5f86', '#3f3a58'], hill: '#4f6a4a', mount: '#4a4468',
    title: 'Hồi IV — Đầm Bọ Ngựa', title_en: 'Act IV — Mantis Marsh',
    lines: [
      'Đầm lầy. Bọ Ngựa chắn ngang lối, hai càng giơ lên như hai lưỡi hái.',
      'Lá xông lên trước và… trượt chân ngã oạch. Bọ Ngựa sững lại vì buồn cười.',
      'Sương chớp thời cơ hát inh ỏi. Mực lăn một hòn sỏi cho nó vấp.',
      'Ba đứa qua được bờ bên kia. Mực kẹt lại, hét với sang: “Cứ đi đi! Tui biết đường vòng mà!”',
    ],
    lines_en: [
      'The marsh. A Mantis blocked the path, forelegs raised like two scythes.',
      'Fernwing charged first and… slipped and landed flat. The Mantis froze, trying not to laugh.',
      'Dewlin seized the moment and sang at the top of her lungs. Inkspur rolled a pebble under its feet.',
      'Three of them made the far bank. Inkspur was cut off, and shouted across: “Go on! I know a way around!”',
    ],
  },
  {
    id: 'fire', at: 29, scene: 'fire', mood: 'urgent', music: 'chase',
    sky: ['#ffb36a', '#e8663a', '#7a2f28'], hill: '#8a5a2c', mount: '#6b3a2a',
    title: 'Hồi V — Lửa Đồng', title_en: 'Act V — The Field Burns',
    lines: [
      'Gió đổi chiều. Đồng cỏ bắt lửa.',
      'Không còn thời gian bàn bạc, cũng chẳng còn đường lui.',
      'Chạy! — Rơm hét. Cả bọn chạy. Và từ hướng ngược lại, một cái bóng quen quen cũng đang chạy tới.',
    ],
    lines_en: [
      'The wind turned. The field caught fire.',
      'No time to discuss it, and no way back.',
      'Run! — Reed shouted. They ran. And from the opposite direction, a very familiar shadow was running too.',
    ],
  },
  {
    id: 'well', at: 39, scene: 'well', mood: 'solemn', music: 'title',
    sky: ['#b9c8f0', '#8f9ed0', '#5a5f96'], hill: '#5f7a68', mount: '#5a5f96',
    title: 'Hồi VI — Giếng Trời', title_en: 'Act VI — The Skywell',
    // Phần dẫn chỉ kể tới lúc đối mặt — phần kết do NGƯỜI CHƠI quyết định.
    lines: [
      'Giếng Trời có thật. Và có một con Cóc Già ngồi canh, mấy chục năm không cho ai lấy một giọt.',
      '“Bọn bay cũng như lũ trước thôi,” nó ngáp dài. “Xin xong là quên.”',
    ],
    lines_en: [
      'The Skywell was real. And an Old Toad sat guarding it, who for decades had let no one take a drop.',
      '“You are like the ones before,” he yawned. “You ask, you drink, you forget.”',
    ],
    // ── LỰA CHỌN THẬT: đổi phần thưởng, đổi độ khó màn trùm, đổi cả câu kết.
    choice: {
      key: 'well',
      ask: 'Ông ấy chắn ngang giếng. Rơm làm gì?',
      ask_en: 'He blocks the well. What does Reed do?',
      opts: [
        { id: 'tell',  vi: 'Ngồi xuống, kể thật',      en: 'Sit down and tell the truth' },
        { id: 'fight', vi: 'Rút càng, giành lấy nước', en: 'Fight and take the water' },
      ],
      outcome: {
        tell: {
          gold: 300, food: 1, bossScale: 0.75,
          lines: [
            'Rơm ngồi bệt xuống bùn, kể hết — kể cả cú nhảy ba vòng ngớ ngẩn hôm ấy.',
            'Cóc Già im rất lâu. Rồi nhích sang một bên, càu nhàu: “Đứa đầu tiên chịu kể thật.”',
            'Có những cánh cửa chỉ mở bằng lòng thành, không mở bằng sức mạnh.',
          ],
          lines_en: [
            'Reed sat down in the mud and told everything — including the silly triple-spin jump.',
            'The Old Toad was quiet a long while, then shuffled aside: “First one ever to tell me the truth.”',
            'Some doors open only to honesty, never to force.',
          ],
        },
        fight: {
          gold: -150, food: 0, bossScale: 1.35,
          lines: [
            'Rơm gồng càng lao tới. Cóc Già thở dài — kiểu thở dài của kẻ đã thấy cảnh này nhiều lần.',
            'Nước thì lấy được. Nhưng chẳng ai chào nhau lấy một câu.',
            'Có những cánh cửa phá được. Chỉ là phá xong thì không còn cửa nữa.',
          ],
          lines_en: [
            'Reed braced his legs and charged. The Old Toad sighed — the sigh of one who has seen this before.',
            'They got the water. Nobody said goodbye.',
            'Some doors can be forced. Only then there is no door left.',
          ],
        },
      },
    },
  },
  {
    id: 'newgrass', at: 44, scene: 'newgrass', mood: 'warm', music: 'nest',
    sky: ['#ffe8bf', '#c8e8f5', '#93cbe8'], hill: '#6fbf5f', mount: '#9fb0d8',
    title: 'Hồi VII — Mùa Cỏ Mới', title_en: 'Act VII — New Grass',
    // Kết đổi theo việc người chơi đã chọn ĐÁNH hay KỂ THẬT ở Giếng Trời.
    byChoice: {
      well: {
        fight: {
          lines: [
            'Nước theo rãnh về tới bờ cỏ vào một chiều tháng bảy. Cỏ xanh lại thật.',
            'Sương lại hát. Lá khoe vết sẹo. Mực được mời ăn cơm.',
            'Chỉ có Rơm là thỉnh thoảng nhìn về phía Giếng Trời, rồi thôi.',
            'Càng nó vẫn khoẻ. Nhưng có một cánh cửa nó không mở lại được nữa.',
          ],
          lines_en: [
            'The water reached the grass bank one July afternoon. The grass really did come back.',
            'Dewlin sang again. Fernwing showed off his scar. Inkspur got dinner invitations.',
            'Only Reed sometimes looked back toward the Skywell, then looked away.',
            'His legs are still strong. But there is one door he can never open again.',
          ],
        },
      },
    },
    lines: [
      'Nước theo rãnh về tới bờ cỏ vào một chiều tháng bảy. Cả xóm ra đứng xem, chẳng ai nói gì, chỉ cười.',
      'Sương lại hát. Lá khoe vết sẹo như khoe huân chương. Mực được mời ăn cơm — mỗi ngày một nhà.',
      'Rơm không kể ai nghe chuyện nó đã làm. Nhưng tối nào cũng có đứa lén để phần nó miếng ngon nhất.',
      'Càng nó vẫn khoẻ. Chỉ là bây giờ nó biết dùng để làm gì.',
    ],
    lines_en: [
      'The water reached the grass bank one July afternoon. The whole hamlet came out to watch, said nothing, and just grinned.',
      'Dewlin sang again. Fernwing showed off his scar like a medal. Inkspur got dinner invitations — a different house every night.',
      'Reed never told anyone what he had done. But every evening somebody quietly saved him the best piece.',
      'His legs are still strong. He simply knows, now, what they are for.',
    ],
  },
];

export const actAt = (levelIndex) => ACTS.find(a => a.at === levelIndex) || null;
/** Hồi đang diễn ra ở màn này — dùng để chọn nhạc và bảng màu khi CHƠI. */
export const currentAct = (levelIndex) => {
  let cur = ACTS[0];
  for (const a of ACTS) if (levelIndex >= a.at) cur = a;
  return cur;
};

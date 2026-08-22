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
      'Sáng ấy vỏ nứt đánh “tách”. {hero} chui ra, ngã dúi một cái, rồi đứng dậy làm như không có chuyện gì.',
      'Bà con cười ồ: “{praise} Nhớ dùng cho phải nhé.”',
      '{hero} gật lia lịa. Thật ra nó chỉ nghe đúng hai chữ đầu — “{praiseShort}”.',
      'Hang bên cạnh có {may} — nhỏ con, chân yếu, gáy ba tiếng là hụt hơi. Nó đứng xem {hero} nhảy, mắt sáng rỡ: “Mai mốt em nhảy được vậy không?”',
      '“Ai rảnh mà dạy.” {hero} phủi càng, nhảy đi. Câu đó, sau này nó nhớ hoài.',
    ],
    lines_en: [
      'On a grass bank by the paddy, an egg sat still all rainy season. Every neighbour who passed leaned in for a listen.',
      'That morning the shell went “tock”. {hero} tumbled out, fell flat, then stood up as if nothing had happened.',
      'The neighbours laughed: “{praise} Remember to use that well.”',
      '{hero} nodded and nodded. In truth they only heard the first two words — “{praiseShort}”.',
      'Next burrow over lived {may} — small, weak-legged, out of breath after three chirps. They watched {hero} jump, eyes shining: “Think I could do that one day?”',
      '“Who has time to teach you.” {hero} dusted off a leg and hopped away. That line stayed with them for years.',
    ],
  },
  {
    // Hạn hán thì phải là MẶT TRỜI GAY GẮT, không phải mây mưa — tông 'sad'
    // nói đúng cảm xúc nhưng sai hiện tượng, nên hồi này ghi đè.
    id: 'raid', at: 4, scene: 'raid', mood: 'sad', weather: 'drought', music: 'sad',
    sky: ['#e8b78a', '#c9a08e', '#8a7f92'], hill: '#a89a52', mount: '#8b7f8f',
    title: 'Hồi II — Cơn Nắng Lớn', title_en: 'Act II — The Long Drought',
    lines: [
      'Ba mùa rồi trời không mưa. Cả cánh đồng vàng khô, cỏ giòn tan dưới chân.',
      'Đàn Kiến Lính kéo tới cướp kho hạt. {hero} thấy từ xa — nhưng đang bận khoe cú nhảy ba vòng cho đám trẻ.',
      'Chỉ có {may} chạy ra chắn cửa kho. Nhỏ con, chân yếu, vẫn dang càng ra.',
      'Lúc {hero} quay lại thì kho trống trơn, {may} nằm bên vệt cỏ đổ, thở rất khẽ: “Em… giữ được một hạt.”',
      'Đêm ấy bà con đắp cho {may} một nắm cỏ. {hero} ngồi ngoài cửa hang, không dám bước vào.',
      'Hoá ra {heroTrait} mà vô tâm thì còn tệ hơn là yếu.',
    ],
    lines_en: [
      'Three seasons and no rain. The whole field turned straw-yellow, the grass crackling underfoot.',
      'The Soldier Ants came for the seed store. {hero} saw them coming — and kept showing the little ones that triple-spin jump.',
      'Only {may} ran out to block the storehouse door. Small, weak-legged, forelegs spread wide anyway.',
      'By the time {hero} turned round the store was bare, and {may} lay in the flattened grass, breathing very softly: “I… saved one seed.”',
      'That night the neighbours covered {may} with a handful of grass. {hero} sat outside the burrow and could not go in.',
      'Turns out being {heroTrait} and careless is worse than being weak.',
    ],
  },
  {
    id: 'road', at: 9, scene: 'road', mood: 'hope', music: 'trail',
    sky: ['#ffd7a8', '#b9d8f5', '#8fb8e8'], hill: '#7fb861', mount: '#9a94c8',
    title: 'Hồi III — Đường Xa', title_en: 'Act III — The Long Road',
    lines: [
      'Người già kể: qua ba cánh đồng có Giếng Trời, nước không bao giờ cạn.',
      '{hero} thắt lại cái đai cói, để lại trước cửa hang đúng một hạt — hạt {may} giữ được.',
      'Nó đi không phải để làm anh hùng. Đi để đừng bao giờ có thêm một đêm như đêm ấy nữa.',
      'Dọc đường nó nhặt thêm: {singer} hát hay mà nhát, {bruiser} khoẻ mà nóng, {outsider} lang thang bị cả xóm chê là “khác loài”.',
      'Bốn đứa cãi nhau suốt dọc đường. Nhưng bữa tối nào cũng ngồi chung một lá sen.',
    ],
    lines_en: [
      'The elders spoke of a Skywell three fields away, whose water never ran dry.',
      '{hero} tightened a woven sash and left one single seed at the burrow door — the seed {may} saved.',
      'They did not leave to become a hero. They left so there would never be another night like that one.',
      'Along the way they picked up: {singer}, lovely singer and terrible coward; {bruiser}, strong and short-fused; {outsider}, a wanderer the hamlet called “not our kind”.',
      'The four argued the whole way. And every single supper, they shared one lotus leaf.',
    ],
  },
  {
    id: 'marsh', at: 19, scene: 'marsh', mood: 'climax', music: 'climax',
    sky: ['#8f7fa8', '#6a5f86', '#3f3a58'], hill: '#4f6a4a', mount: '#4a4468',
    title: 'Hồi IV — Đầm Bọ Ngựa', title_en: 'Act IV — Mantis Marsh',
    lines: [
      'Đầm lầy. Bọ Ngựa chắn ngang lối, hai càng giơ lên như hai lưỡi hái.',
      '{bruiser} xông lên trước và… trượt chân ngã oạch. Bọ Ngựa sững lại vì buồn cười.',
      '{singer} chớp thời cơ hát inh ỏi. {outsider} lăn một hòn sỏi cho nó vấp.',
      'Ba đứa qua được bờ bên kia. {outsider} kẹt lại, hét với sang: “Cứ đi đi! Tui biết đường vòng mà!”',
      '{hero} đứng bên này bờ, lần đầu trong đời thấy sợ — mà không phải sợ cho mình.',
    ],
    lines_en: [
      'The marsh. A Mantis blocked the path, forelegs raised like two scythes.',
      '{bruiser} charged first and… slipped and landed flat. The Mantis froze, trying not to laugh.',
      '{singer} seized the moment and sang at the top of their lungs. {outsider} rolled a pebble under its feet.',
      'Three of them made the far bank. {outsider} was cut off, and shouted across: “Go on! I know a way around!”',
      '{hero} stood on the near bank, afraid for the first time in their life — and not for themselves.',
    ],
  },
  {
    id: 'fire', at: 29, scene: 'fire', mood: 'urgent', weather: 'drought', music: 'chase',
    sky: ['#ffb36a', '#e8663a', '#7a2f28'], hill: '#8a5a2c', mount: '#6b3a2a',
    title: 'Hồi V — Lửa Đồng', title_en: 'Act V — The Field Burns',
    lines: [
      'Gió đổi chiều. Đồng cỏ bắt lửa.',
      'Không còn thời gian bàn bạc, cũng chẳng còn đường lui.',
      'Chạy! — {hero} hét. Cả bọn chạy. Và từ hướng ngược lại, một cái bóng quen quen cũng đang chạy tới.',
      '{outsider} lấm lem, cụt mất một râu, cười nhăn nhở: “Đã bảo tui biết đường vòng mà.”',
    ],
    lines_en: [
      'The wind turned. The field caught fire.',
      'No time to discuss it, and no way back.',
      'Run! — {hero} shouted. They ran. And from the opposite direction, a very familiar shadow was running too.',
      '{outsider}, filthy and one antenna short, grinned: “Told you I knew a way around.”',
    ],
  },
  {
    id: 'well', at: 39, scene: 'well', mood: 'solemn', music: 'solemn',
    sky: ['#b9c8f0', '#8f9ed0', '#5a5f96'], hill: '#5f7a68', mount: '#5a5f96',
    title: 'Hồi VI — Giếng Trời', title_en: 'Act VI — The Skywell',
    // Phần dẫn chỉ kể tới lúc đối mặt — phần kết do NGƯỜI CHƠI quyết định.
    lines: [
      'Giếng Trời có thật. Và có một con Cóc Già ngồi canh, mấy chục năm không cho ai lấy một giọt.',
      '“Bọn bay cũng như lũ trước thôi,” nó ngáp dài. “Xin xong là quên.”',
      'Sau lưng {hero} là ba đứa bạn, xa hơn nữa là cả xóm đang khát. Trước mặt là một ông già cứng đầu.',
    ],
    lines_en: [
      'The Skywell was real. And an Old Toad sat guarding it, who for decades had let no one take a drop.',
      '“You are like the ones before,” he yawned. “You ask, you drink, you forget.”',
      'Behind {hero} stood three friends, and beyond them a whole thirsty hamlet. In front stood one stubborn old toad.',
    ],
    // ── LỰA CHỌN THẬT: đổi phần thưởng, đổi độ khó màn trùm, đổi cả câu kết.
    choice: {
      key: 'well',
      ask: 'Ông ấy chắn ngang giếng. {hero} làm gì?',
      ask_en: 'He blocks the well. What does {hero} do?',
      opts: [
        { id: 'tell',  vi: 'Ngồi xuống, kể thật',      en: 'Sit down and tell the truth' },
        { id: 'fight', vi: 'Rút càng, giành lấy nước', en: 'Fight and take the water' },
      ],
      outcome: {
        tell: {
          gold: 300, food: 1, bossScale: 0.75,
          lines: [
            '{hero} ngồi bệt xuống bùn, kể hết — kể cả cú nhảy ba vòng ngớ ngẩn hôm ấy, kể cả {may}.',
            'Cóc Già im rất lâu. Rồi nhích sang một bên, càu nhàu: “Đứa đầu tiên chịu kể thật.”',
            'Có những cánh cửa chỉ mở khi mình chịu nói thật.',
          ],
          lines_en: [
            '{hero} sat down in the mud and told everything — the silly triple-spin jump, and {may} too.',
            'The Old Toad was quiet a long while, then shuffled aside: “First one ever to tell me the truth.”',
            'Some doors only open when you tell the truth.',
          ],
        },
        fight: {
          gold: -150, food: 0, bossScale: 1.35,
          lines: [
            '{hero} gồng càng lao tới. Cóc Già thở dài — kiểu thở dài của kẻ đã thấy cảnh này nhiều lần.',
            'Nước thì lấy được. Nhưng chẳng ai chào nhau lấy một câu.',
            'Cửa thì phá được. Chỉ là phá xong thì hết cửa để mở lại.',
          ],
          lines_en: [
            '{hero} braced their legs and charged. The Old Toad sighed — the sigh of one who has seen this before.',
            'They got the water. Nobody said goodbye.',
            'You can force a door. You just will not have a door any more.',
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
            '{singer} lại hát. {bruiser} khoe vết sẹo. {outsider} được mời ăn cơm.',
            'Đàn Kiến Lính có mò tới xin nước. {hero} đứng chắn đầu rãnh, không tránh ra.',
            'Chỉ có {hero} là thỉnh thoảng nhìn về phía Giếng Trời, rồi thôi.',
            'Nó vẫn {heroTrait} như thế. Nhưng có một cánh cửa nó không mở lại được nữa.',
          ],
          lines_en: [
            'The water reached the grass bank one July afternoon. The grass really did come back.',
            '{singer} sang again. {bruiser} showed off the scar. {outsider} got dinner invitations.',
            'The Soldier Ants came asking for water. {hero} stood at the head of the channel and did not step aside.',
            'Only {hero} sometimes looked back toward the Skywell, then looked away.',
            'They are as {heroTrait} as ever. But there is one door they can never open again.',
          ],
        },
      },
    },
    lines: [
      'Nước theo rãnh về tới bờ cỏ vào một chiều tháng bảy. Cả xóm ra đứng xem, chẳng ai nói gì, chỉ cười.',
      'Rồi đàn Kiến Lính mò tới. Lần này không phải để cướp — bên chúng cũng cạn nước.',
      '{hero} đứng chắn ở đầu rãnh. Cả xóm nín thở. Rồi nó tránh sang một bên: “Cỏ cháy thì ai cũng khát. Uống đi.”',
      '{singer} lại hát. {bruiser} khoe vết sẹo như khoe huân chương. {outsider} được mời ăn cơm — mỗi ngày một nhà.',
      '{hero} không kể ai nghe chuyện nó đã làm. Nhưng tối nào cũng có đứa lén để phần nó miếng ngon nhất.',
      'Trên bờ cỏ có một nấm đất nhỏ. Sáng nào {hero} cũng để lại đó một hạt.',
      'Nó vẫn {heroTrait} như thế. Chỉ là bây giờ nó biết dùng cái đó để làm gì — và để che cho ai.',
    ],
    lines_en: [
      'The water reached the grass bank one July afternoon. The whole hamlet came out to watch, said nothing, and just grinned.',
      'Then the Soldier Ants turned up. Not to raid this time — their side had run dry too.',
      '{hero} planted themselves at the head of the channel. The hamlet held its breath. Then they stepped aside: “When the grass burns, everyone is thirsty. Drink.”',
      '{singer} sang again. {bruiser} showed off the scar like a medal. {outsider} got dinner invitations — a different house every night.',
      '{hero} never told anyone what they had done. But every evening somebody quietly saved them the best piece.',
      'On the grass bank there is a small mound of earth. Every morning {hero} leaves a seed on it.',
      'They are as {heroTrait} as ever. They simply know, now, what it is for — and who it is for.',
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

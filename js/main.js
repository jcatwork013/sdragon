// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  CRICKO — Miền Cỏ Cháy                                                   ║
// ║  Điểm khởi động: quản lý màn, vòng lặp, nhập liệu, co giãn theo màn hình ║
// ╚══════════════════════════════════════════════════════════════════════════╝
import { clamp } from './core/util.js';
import { perf, Q } from './core/perf.js';
import { computeLogical } from './core/layout.js';
import * as Store from './core/state.js';
import { getLang, setLang, toggleLang, onLangChange, t, tx } from './core/i18n.js';
import { Chiptune } from './audio/chiptune.js';
import { SONGS, trackForLevel } from './audio/songs.js';
import { FX } from './game/fx.js';
import { Hit, glassPanel, textBtn, flagVN, flagEN, FONT } from './ui/widgets.js';
import { strokeText, roundRect } from './core/util.js';
import { World } from './render/background.js';
import { buildGemSprites } from './game/gems.js';
import { buildOrbSprites } from './game/bubble.js';
import { Cricket } from './game/cricket.js';
import { BREEDS } from './data/characters.js';
import { EPISODES, ALL_LEVELS, TOTAL_LEVELS, isRegionEnd, regionOf, nextRegion } from './data/levels.js';
import { pickQuip } from './data/beats.js';
import { actAt, currentAct } from './data/story.js';
import { setHero } from './core/lore.js';

import titleScene from './scenes/title.js';
import eggScene   from './scenes/egg.js';
import mapScene   from './scenes/map.js';
import nestScene  from './scenes/nest.js';
import playScene  from './scenes/play.js';
import helpScene  from './scenes/help.js';
import shootScene from './scenes/shoot.js';
import storyScene from './scenes/story.js';
import duelScene  from './scenes/duel.js';
import worldScene from './scenes/world.js';
import shopScene  from './scenes/shop.js';
import pairScene  from './scenes/pair.js';
import chapterScene from './scenes/chapter.js';
import regionScene  from './scenes/region.js';

// Khung logic tính từ tỉ lệ màn hình thật (xem js/core/layout.js).
//   W,H      = DẢI GIAO DIỆN, mọi scene dựng bố cục trên đây (cao luôn 720)
//   CW,CH    = KHUNG VẼ, đúng tỉ lệ máy → canvas phủ kín màn hình, hết viền đen
//   OX,OY    = vị trí dải trong khung vẽ
let { W, H, CW, CH, ox: OX, oy: OY } = computeLogical(window.innerWidth, window.innerHeight);
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d', { alpha: false });

// ── lề an toàn (tai thỏ · lỗ camera · thanh vuốt) ──────────────────────────
// Đọc bằng một thẻ dò ẩn thay vì đệm thẳng vào <body>: đệm body sẽ thu nhỏ cả
// canvas và để lộ nền trang ở mép; còn ở đây ta chỉ đẩy DẢI GIAO DIỆN vào
// trong, tranh nền vẫn tràn ra tận mép máy.
let safePad = { t: 0, r: 0, b: 0, l: 0 };
let safeProbe = null;
function readSafeArea() {
  try {
    if (typeof document === 'undefined' || !document.body || typeof getComputedStyle !== 'function') return;
    if (!safeProbe) {
      safeProbe = document.createElement('div');
      if (!safeProbe || !safeProbe.style) { safeProbe = null; return; }
      safeProbe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;visibility:hidden;pointer-events:none;' +
        'padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
      document.body.appendChild(safeProbe);
    }
    const cs = getComputedStyle(safeProbe);
    const n = (v) => Math.max(0, parseFloat(v) || 0);
    safePad = { t: n(cs.paddingTop), r: n(cs.paddingRight), b: n(cs.paddingBottom), l: n(cs.paddingLeft) };
  } catch { safePad = { t: 0, r: 0, b: 0, l: 0 }; }
}

const G = {
  W, H, CW, CH, OX, OY, canvas, ctx,
  // Sổ theo dõi phiên chơi — chỉ sống trong bộ nhớ, không lưu xuống máy.
  // Dùng để câu nói bám đúng hoàn cảnh chứ không bắn ngẫu nhiên.
  sess: { start: performance.now(), wins: 0, losses: 0, retries: 0, streak: 0, combo: 0, gearAt: -1e9 },
  audio: new Chiptune(),
  songs: SONGS,
  fx: new FX(),
  world: new World(W, H, OX, OY, CW, CH),
  save: Store.load(),
  scenes: { title: titleScene, egg: eggScene, map: mapScene, nest: nestScene, play: playScene, help: helpScene, shoot: shootScene, story: storyScene, duel: duelScene, world: worldScene, shop: shopScene, pair: pairScene, chapter: chapterScene, region: regionScene },
  scene: null,
  level: null, levelIndex: 0,
  totalLevels: TOTAL_LEVELS,
  musicVol: 0.34,
  confirmPending: 0,

  // ── điều hướng ────────────────────────────────────────────────────────────
  go(name, arg) {
    setHero(G.save.breed);                      // dàn vai luôn khớp giống đang nuôi
    G.modal = null; G.quipBox = null;           // đổi màn thì bỏ hộp và câu đang hiện
    if (G.scene?.exit) G.scene.exit(G);
    G.fx.clear();
    G.scene = G.scenes[name];
    G._sceneArg = arg;                          // giữ lại để dựng lại khi đổi cỡ
    G.scene.hits = [];
    G.scene.enter(G, arg);
  },
  // ── THỂ LỰC ───────────────────────────────────────────────────────────────
  // Độ no là thứ duy nhất chặn người chơi cày liên tục, nên nó phải có giá:
  // đi màn tốn, ra đấu trường tốn, thua còn tốn thêm. Hết sức mà không còn
  // thức ăn thì phải NGHỈ — sức tự hồi theo đồng hồ thật, mỗi phút 1 điểm.
  FED_MAX: 100,
  FED_COST: 18,          // vào một màn
  FED_COST_ARENA: 12,    // tự đi đấu trường
  FED_COST_AMBUSH: 6,    // bị chặn đường giữa hành trình — không phải mình chọn nên nhẹ hơn
  FED_LOSE: 6,           // thua thì mất thêm, để không ai thử lại vô tội vạ
  FED_FEED: 60,          // một phần thức ăn hồi bấy nhiêu, KHÔNG no căng luôn
  FED_REGEN_MS: 60000,   // nghỉ 1 phút = 1 điểm sức

  /**
   * Cộng phần sức đã hồi kể từ mốc `fedAt`. Gọi mỗi lần đổi màn nên người chơi
   * mở game lại là thấy số đúng, không cần bộ đếm chạy nền.
   */
  tickFed() {
    const S = G.save, now = Date.now();
    if (!S.fedAt || S.fedAt > now) S.fedAt = now;      // save cũ hoặc đồng hồ máy bị chỉnh lùi
    if ((S.fed ?? 100) >= G.FED_MAX) { S.fedAt = now; return; }
    const gained = Math.floor((now - S.fedAt) / G.FED_REGEN_MS);
    if (gained <= 0) return;
    S.fed = Math.min(G.FED_MAX, (S.fed ?? 0) + gained);
    S.fedAt = S.fed >= G.FED_MAX ? now : S.fedAt + gained * G.FED_REGEN_MS;
    G.persist();
  },
  /** Còn bao nhiêu mili giây nữa thì đủ `cost` sức. 0 = đủ rồi. */
  fedWaitMs(cost) {
    const S = G.save, need = cost - (S.fed ?? 0);
    if (need <= 0) return 0;
    const intoTick = Date.now() - (S.fedAt || Date.now());
    return Math.max(0, need * G.FED_REGEN_MS - intoTick);
  },
  /** "12:07" hoặc "1:23:04" — đồng hồ đếm ngược hồi sức. */
  fedClock(ms) {
    const s = Math.max(0, Math.ceil(ms / 1000));
    const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, ss = s % 60;
    return h ? `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
             : `${m}:${String(ss).padStart(2, '0')}`;
  },
  /** Đủ sức làm việc này không? Không đủ thì báo còn phải chờ bao lâu. */
  fedEnough(cost, { quiet = false } = {}) {
    G.tickFed();
    if ((G.save.fed ?? 0) >= cost) return true;
    if (!quiet) {
      G.sfx('invalid');
      G.quipBox = null;
      G.quip((G.save.food || 0) > 0 ? t('hungryBlock')
                                    : t('restWait', { t: G.fedClock(G.fedWaitMs(cost)) }));
    }
    return false;
  },
  spendFed(cost) {
    const S = G.save;
    G.tickFed();
    if ((S.fed ?? 100) >= G.FED_MAX) S.fedAt = Date.now();   // rời mốc đầy → bắt đầu đếm hồi
    S.fed = Math.max(0, (S.fed ?? 100) - cost);
    G.persist();
  },
  get hungry() { G.tickFed(); return (G.save.fed ?? 100) < G.FED_COST; },

  /**
   * Cho ăn: đổi một phần thức ăn lấy đầy bụng.
   * @returns true nếu ăn được
   */
  feedHero() {
    if ((G.save.food || 0) <= 0) { G.sfx('invalid'); return false; }
    G.save.food--;
    if ((G.save.fed ?? 0) >= G.FED_MAX) G.save.fedAt = Date.now();
    G.save.fed = Math.min(G.FED_MAX, (G.save.fed ?? 0) + G.FED_FEED);
    G.persist();
    G.sfx('levelup');
    G.hero.react('eat', 1.8);
    return true;
  },

  startLevel(i, skipStory = false) {
    // ĐÓI thì không đi được. Chặn ngay ở cửa vào chứ không để vào màn rồi mới
    // báo — vào rồi mới đuổi ra thì bực hơn nhiều.
    if ((G.save.fed ?? 0) < G.FED_COST) { G.askRest(); return; }
    G.sess.retries = (i === G.sess.lastLv) ? G.sess.retries + 1 : 0;
    G.sess.lastLv = i;
    G.levelIndex = clamp(i, 0, TOTAL_LEVELS - 1);
    G.level = ALL_LEVELS[G.levelIndex];
    // Hoạt cảnh chỉ chạy lần đầu tới hồi đó; xem rồi thì vào thẳng màn.
    const act = actAt(G.levelIndex);
    if (act && !skipStory && !G.save.seenStory[act.id]) {
      G.go('story', { act, after: () => G.startLevel(G.levelIndex, true) });
      return;
    }
    // ── MỞ CHƯƠNG: lần đầu bước sang một vùng đất mới thì dừng lại một nhịp
    // để đánh dấu cột mốc, rồi mới vào màn.
    const ep = G.episodeOf(G.levelIndex);
    if (ep && !skipStory && !G.save.seenEp[ep.id]) {
      G.save.seenEp[ep.id] = true; G.persist();
      G.go('chapter', { ep, after: () => G.startLevel(G.levelIndex, true) });
      return;
    }
    G.act = currentAct(G.levelIndex);
    // ── TÌNH TIẾT NGẪU NHIÊN: thỉnh thoảng bị thế lực hắc ám chặn đường ──
    // Chỉ từ màn 5 trở đi, và không chặn hai lần liên tiếp.
    if (!skipStory && G.levelIndex >= 4 && !G._justDueled && Math.random() < 0.22
        && (G.save.fed ?? 0) >= G.FED_COST + G.FED_COST_AMBUSH) {
      G._justDueled = true;
      G.spendFed(G.FED_COST_AMBUSH);           // đánh nhau giữa đường cũng mất sức
      G.go('duel', { after: () => { G._justDueled = false; G.startLevel(G.levelIndex, true); } });
      return;
    }
    G._justDueled = false;
    // Trừ độ no đúng lúc VÀO màn, không trừ lúc thắng — thua cũng phải tốn
    // sức, nếu không thì thua vô hạn mà chẳng mất gì.
    G.spendFed(G.FED_COST);
    G.go(G.level.mode === 'shoot' ? 'shoot' : G.level.mode === 'pair' ? 'pair' : 'play');
  },
  /**
   * Qua màn CUỐI của một mảnh đất → chạy hoạt cảnh chuyển vùng thay vì vào
   * thẳng màn kế. Chinh phục cả một vùng là chuyện lớn, bảng kết quả màn
   * thường quá ngắn để đánh dấu.
   */
  goNextLevel(i) {
    if (isRegionEnd(i)) {
      G.go('region', {
        done: regionOf(i)?.region, next: nextRegion(i),
        after: () => G.go('map'),
      });
      return;
    }
    G.startLevel(Math.min(i + 1, TOTAL_LEVELS - 1));
  },

  /** Xem lại một hồi bất kỳ (dùng ở bản đồ). */
  replayAct(act) { G.go('story', { act, after: () => G.go('map') }); },
  episodeOf(i) { return EPISODES[Math.min(Math.floor(i / 15), EPISODES.length - 1)]; },

  // ── tiện ích dùng chung ───────────────────────────────────────────────────
  // Lưu là đồng bộ luôn đồ đang mặc sang nhân vật. Trước đây chỉ màn Tổ dế
  // gán, nên mua đồ xong ra bản đồ hay vào trận là nhân vật lại cởi trần.
  persist() { Store.save(G.save); G.hero.gear = { ...(G.save.equip || {}) }; },
  sfx(n, p) { if (G.save.sfx) G.audio.sfx(n, p); },
  /** Đổi nhạc theo KHOÁ ('battle', 'chase'…). Trùng bài thì giữ nguyên. */
  music(key) { G.audio.switchTo(SONGS[key] || SONGS.battle); },
  /** Nhạc mặc định của màn đang chơi — mỗi màn một bài. */
  levelTrack() { return trackForLevel(G.levelIndex, G.level?.mode); },
  toggleMute() {
    const m = G.audio.toggleMute();
    G.save.music = G.save.sfx = !m;
    G.persist();
    if (!m) G.audio.sfx('button');
  },
  toggleLang() { toggleLang(); G.audio.sfx('button'); },

  /**
   * CÂU XÀ LƠ — hiện ở đáy màn hình, 5 giây rồi mờ dần đi.
   *
   * GIỮ NGÓN TAY vào là đồng hồ dừng, thả ra mới chạy tiếp — ai đọc chậm, hay
   * đang bận nước cờ, thì không bị hụt mất câu. Đặt ở tầng toàn cục để màn nào
   * cũng dùng được và không màn nào phải tự đếm giờ.
   */
  quip(text) {
    if (G.quipBox) return;
    const line = text || tx(pickQuip(G.quipCtx()), 'vi');
    G.quipBox = { text: line, t: 0, held: false, box: null };
  },

  /** Ảnh chụp hoàn cảnh lúc này — đầu vào cho việc chọn câu. */
  quipCtx() {
    const sc = G.scene, s = G.sess;
    const L = G.level;
    return {
      scene: sc?.name,
      sessMin: (performance.now() - s.start) / 60000,
      hour: new Date().getHours(),
      gold: G.save.gold,
      lowTime: (sc?.timeLeft ?? 999) < 25,
      retries: s.retries, wins: s.wins, losses: s.losses, streak: s.streak,
      combo: s.combo, stage: G.hero?.stage?.id ?? 0,
      gearNew: performance.now() - s.gearAt < 90000,
      near: !!(L && sc?.score >= L.target * .8 && sc?.score < L.target),
    };
  },

  /**
   * Hộp chọn ngôn ngữ có cờ. Đặt ở tầng TOÀN CỤC chứ không nằm trong scene:
   * nút đổi ngôn ngữ có mặt ở nhiều màn, nhét hộp vào từng scene là chép tay
   * ba bốn bản rồi lệch nhau.
   */
  /**
   * Hết sức mà vẫn bấm đi màn → dế nhảy dựng lên phản đối và hiện hộp thoại.
   * Bản cũ chỉ nhá một câu rồi ĐÁ THẲNG người chơi về Tổ Dế: đang xem bản đồ tự
   * dưng bị chuyển màn, chẳng ai hiểu vừa xảy ra chuyện gì.
   */
  askRest() {
    G.tickFed();
    const bw = 560, bh = 268, x = (G.W - bw) / 2, y = (G.H - bh) / 2;
    G.sfx('invalid');
    G.hero.react('hurt', 1.4); G.hero.bounce = 1;    // giãy nảy lên một cái
    const close = () => { G.sfx('button'); G.modal = null; };
    const hits = [];
    if ((G.save.food || 0) > 0)
      hits.push(new Hit('feed', x + 40, y + bh - 82, 230, 56,
        { label: () => `${t('feed')} (${G.save.food})`, colour: '#3fbf4a', dark: '#1d6b24', lite: '#8ef08a',
          act: () => { if (G.feedHero()) { G.modal = null; } } }));
    hits.push(new Hit('close', x + bw - (hits.length ? 270 : 150), y + bh - 82, hits.length ? 230 : 110, 56,
      { label: () => t('close'), act: close }));
    G.modal = {
      kind: 'rest', x, y, w: bw, h: bh, t: 0,
      title: t('restTitle'),
      lines: () => [t('restBody'), t('restIn', { t: G.fedClock(G.fedWaitMs(G.FED_COST)) })],
      hits,
    };
  },

  askLang() {
    G.audio.sfx('button');
    const bw = 460, bh = 286, x = (G.W - bw) / 2, y = (G.H - bh) / 2;
    const pick = (code) => { setLang(code); G.audio.sfx('button'); G.modal = null; };
    G.modal = {
      x, y, w: bw, h: bh, t: 0,
      hits: [
        new Hit('vi', x + 34, y + 84, 180, 108, { act: () => pick('vi') }),
        new Hit('en', x + bw - 214, y + 84, 180, 108, { act: () => pick('en') }),
        new Hit('close', x + bw / 2 - 70, y + bh - 62, 140, 46, { act: () => { G.audio.sfx('button'); G.modal = null; } }),
      ],
    };
  },
  confirmNew() {
    if (G.confirmPending > 0) {
      G.confirmPending = 0;
      G.save = Store.wipe(); Store.save(G.save);
      G.hero = new Cricket(BREEDS[0], 0);
      G.audio.sfx('crack');
      G.go('egg');
    } else {
      G.confirmPending = 2.6;
      G.audio.sfx('warn');
    }
  },
};

G.hero = new Cricket(BREEDS.find(b => b.id === G.save.breed) || BREEDS[0], G.save.xp);
G.hero.onChirp = (x, y, dx, dy) => G.fx.chirp(x, y, dx, dy, 4);
G.hero.gear = { ...(G.save.equip || {}) };
onLangChange(() => { /* mọi chuỗi đọc qua t() nên khung hình sau tự cập nhật */ });

// ── co giãn khung hình theo cửa sổ + DPR ────────────────────────────────────
function resize() {
  // Đổi tỉ lệ thiết bị (xoay máy, mở/gập màn hình, chia đôi màn, đổi cỡ cửa
  // sổ) → tính lại khung rồi dựng lại màn đang chơi để bố cục bám mép mới.
  readSafeArea();
  const winW = window.innerWidth || 1280, winH = window.innerHeight || 720;

  // Lề an toàn tính bằng điểm ảnh CSS, còn khung vẽ tính bằng đơn vị logic.
  // Cần biết 1 đơn vị logic bằng bao nhiêu điểm ảnh CSS mới quy đổi được — mà
  // muốn biết thì lại phải có khung vẽ trước. Nên đo hai lượt: lượt đầu bỏ qua
  // lề, lấy tỉ lệ; lượt sau tính lại có lề. Sai số lượt đầu không đáng kể.
  const probe = computeLogical(winW, winH);
  const probeScale = Math.min(winW / probe.CW, winH / probe.CH);
  const next = computeLogical(winW, winH, safePad, probeScale);

  const changed = Math.abs(next.W - W) > 12 || Math.abs(next.CW - CW) > 12 || Math.abs(next.CH - CH) > 12;
  W = next.W; H = next.H; CW = next.CW; CH = next.CH; OX = next.ox; OY = next.oy;
  G.W = W; G.H = H; G.CW = CW; G.CH = CH; G.OX = OX; G.OY = OY;

  // ── SỐ ĐIỂM ẢNH PHẢI TÔ — nút thắt lớn nhất trên máy yếu ────────────────
  // Mỗi khung hình có vài lượt tô kín màn hình (tranh nền, lớp phủ, vignette).
  // Ở DPR 1.5 trên màn 2340×1080 là 2,5 triệu điểm ảnh MỖI LƯỢT. Hạ DPR là
  // cách rẻ nhất để máy yếu thở được: 1.5 → 1.0 cắt luôn 56% khối lượng, mà
  // game vẽ vector nên nhìn gần như không khác.
  const cap = perf.quality === Q.HIGH ? 1.5 : perf.quality === Q.MED ? 1.25 : 1.0;
  const dpr = Math.min(window.devicePixelRatio || 1, cap);
  // Cảm ứng thì dán sát mép (yêu cầu: luôn toàn màn hình). Chuột thì chừa 8px
  // cho thấy viền đổ bóng của khung, trông gọn hơn trong cửa sổ.
  const coarse = typeof matchMedia === 'function' && matchMedia('(pointer:coarse)').matches;
  const pad = coarse ? 0 : 8;
  const s = Math.min((winW - pad) / CW, (winH - pad) / CH);
  canvas.style.width = Math.round(CW * s) + 'px';
  canvas.style.height = Math.round(CH * s) + 'px';
  canvas.width = Math.round(CW * dpr);
  canvas.height = Math.round(CH * dpr);
  G.dpr = dpr;                       // scene cần biết để dựng sprite đúng cỡ thật
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingQuality = 'high';
  G.scale = s;

  if (changed && G.scene) {
    G.world = new World(W, H, OX, OY, CW, CH);   // nền phải phủ đúng khung mới
    const sc = G.scene, arg = G._sceneArg;
    sc.hits = [];
    sc.enter(G, arg);
  }
}
window.addEventListener('resize', resize);

// ── nhập liệu ───────────────────────────────────────────────────────────────
const pt = (e) => {
  const r = canvas.getBoundingClientRect();
  // Trừ OX/OY vì scene sống trong DẢI, không phải trong khung vẽ.
  return [(e.clientX - r.left) / r.width * CW - OX,
          (e.clientY - r.top) / r.height * CH - OY];
};
let activeHit = null, captured = null;
// Có hộp thì chỉ hộp nhận chạm — không thì bấm xuyên qua trúng nút của scene.
const hitsOf = () => (G.modal ? G.modal.hits : (G.scene?.hits || [])).filter(h => !h.hidden && !h.disabled);
const hitAt = (x, y) => hitsOf().find(h => h.contains(x, y));

function firstGesture() {
  if (G.audio.ready) return;
  G.audio.init();
  if (!G.save.music) G.audio.toggleMute();
}

canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  firstGesture();
  canvas.setPointerCapture?.(e.pointerId);
  canvas.classList.add('grabbing');
  const [x, y] = pt(e);
  const qb = G.quipBox?.box;
  if (qb && x >= qb.x && x <= qb.x + qb.w && y >= qb.y && y <= qb.y + qb.h) {
    G.quipBox.held = true;
    captured = 'quip';
    return;                                   // đè lên câu thì không lọt xuống màn
  }
  activeHit = hitAt(x, y);
  if (activeHit) { captured = 'hit'; activeHit.down = true; }
  else if (G.modal) { captured = 'modal'; }
  else { captured = 'scene'; G.scene?.down?.(G, x, y); }
});
canvas.addEventListener('pointermove', (e) => {
  const [x, y] = pt(e);
  G.mouse = [x, y];
  // hover: gọi ở MỌI lần di chuột, kể cả khi không giữ nút — dùng cho việc
  // ngắm ở màn Bắn Đá (rê chuột là mũi tên đi theo, không phải giữ chuột).
  if (!G.modal) G.scene?.hover?.(G, x, y);
  if (captured === 'scene') G.scene?.move?.(G, x, y);
});
const endPointer = (e) => {
  const [x, y] = pt(e);
  canvas.classList.remove('grabbing');
  if (captured === 'quip') {
    // Thả tay ra thì cho nó mờ đi nốt, không bắt đọc lại từ đầu.
    if (G.quipBox) { G.quipBox.held = false; G.quipBox.t = Math.max(G.quipBox.t, QUIP_LIFE - 1.2); }
    captured = null; return;
  }
  if (captured === 'hit' && activeHit) {
    activeHit.down = false;
    if (activeHit.contains(x, y)) activeHit.act?.();
  } else if (captured === 'scene') G.scene?.up?.(G, x, y);
  activeHit = null; captured = null;
};
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', () => { if (activeHit) activeHit.down = false; if (G.quipBox) G.quipBox.held = false; activeHit = null; captured = null; });
canvas.addEventListener('wheel', (e) => { e.preventDefault(); G.scene?.wheel?.(G, e.deltaY + e.deltaX); }, { passive: false });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
window.addEventListener('keydown', (e) => {
  firstGesture();
  if (G.modal) { if (e.key === 'Escape') G.modal = null; return; }
  if (e.key === 'm') G.toggleMute();
  if (e.key === 'l') G.askLang();
  if (e.key === 'f') showFps = !showFps;   // F = bật/tắt đồng hồ FPS
  G.scene?.key?.(G, e);
});

// ── vòng lặp ────────────────────────────────────────────────────────────────
// Giới hạn 60 khung/giây: trên màn 120Hz (MacBook ProMotion, điện thoại đời mới)
// requestAnimationFrame chạy 120 lần/giây → gấp đôi việc phải làm, máy nóng lên
// mà mắt gần như không thấy khác. Khi cửa sổ bị ẩn thì ngừng vẽ hẳn.
const FPS_CAP = 60;
const STEP = 1 / FPS_CAP;
let last = performance.now();
let acc = 0;
let showFps = false;
let lastQ = perf.quality;
let quipAt = 40 + Math.random() * 40;
const QUIP_LIFE = 5, QUIP_FADE = .7;
let voiceAt = 40 + Math.random() * 60;      // đếm ngược tới tiếng kêu tiếp theo

function frame(now) {
  requestAnimationFrame(frame);

  const raw = Math.min(0.05, (now - last) / 1000);   // chặn dt khi tab bị treo
  last = now;

  if (document.hidden) { acc = 0; return; }          // ẩn cửa sổ → không vẽ, không tốn pin
  acc += raw;
  if (acc < STEP * 0.92) return;                     // bỏ khung thừa của màn tần số cao
  const dt = Math.min(acc, 0.05);
  acc = 0;

  // Thỉnh thoảng bật một câu cho vui — chỉ ở màn có người chơi thật sự ngồi
  // lâu, không chen vào lúc chuyển cảnh hay đang xem kết quả.
  const chatty = ['play', 'shoot', 'pair', 'map'].includes(G.scene?.name);
  if (chatty && !G.quipBox && !G.modal && !G.scene?.over) {
    quipAt -= dt;
    if (quipAt <= 0) { quipAt = 55 + Math.random() * 70; G.quip(); }
  }
  // Vài phút một lần con dế lên tiếng: gáy một tràng hoặc cười khúc khích.
  // Không bật trong màn chơi — ở đó đã đủ tiếng động rồi.
  if (['map', 'nest', 'shop', 'title'].includes(G.scene?.name) && !G.modal) {
    voiceAt -= dt;
    if (voiceAt <= 0) {
      voiceAt = 180 + Math.random() * 120;             // 3–5 phút
      const laugh = Math.random() < .5;
      G.sfx(laugh ? 'giggle' : 'chirp');
      G.hero?.react(laugh ? 'happy' : 'chirp', 1.1);
      if (!laugh) G.hero?.chirpBurst(.8);
    }
  }
  if (G.quipBox) {
    const q = G.quipBox;
    if (!q.held) q.t += dt;
    if (q.t > QUIP_LIFE + QUIP_FADE) G.quipBox = null;
  }

  perf.tick(dt);
  // Đổi mức chất lượng thì phải dựng lại canvas cho khớp DPR mới.
  if (perf.quality !== lastQ) { lastQ = perf.quality; resize(); }
  if (G.confirmPending > 0) G.confirmPending -= dt;

  // trạng thái nút
  const [mx, my] = G.mouse || [-1, -1];
  for (const h of hitsOf()) h.tick(dt, h.contains(mx, my), !!h.down);

  G.scene?.update?.(G, dt);
  G.fx.update(dt);

  ctx.save();
  ctx.translate(G.fx.shakeX, G.fx.shakeY);
  ctx.fillStyle = '#0b0716'; ctx.fillRect(-40, -40, CW + 80, CH + 80);
  ctx.translate(OX, OY);                              // vào hệ toạ độ của dải
  G.scene?.draw?.(G, ctx);
  if (G.scene?.name !== 'play') G.fx.draw(ctx);      // màn chơi tự vẽ hạt đúng lớp
  ctx.restore();

  if (G.quipBox) drawQuip();
  if (G.modal) drawModal();

  if (showFps) {
    ctx.save();
    ctx.font = '700 15px "Be Vietnam Pro",monospace';
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(8, 8, 168, 26);
    ctx.fillStyle = perf.fps > 50 ? '#8ef08a' : perf.fps > 35 ? '#ffd76b' : '#ff7a90';
    ctx.fillText(`${perf.fps.toFixed(0)} fps · ${perf.ms.toFixed(1)}ms · ${perf.label}`, 14, 26);
    ctx.restore();
  }
}

/** Vẽ hộp thoại: 'lang' là hộp chọn ngôn ngữ, còn lại là hộp chữ + nút chung. */
function drawModal() {
  const M = G.modal;
  M.t = Math.min(1, M.t + STEP * 4);
  const k = M.t < 1 ? 1 - Math.pow(1 - M.t, 3) : 1;
  ctx.save();
  ctx.fillStyle = `rgba(8,4,18,${.66 * k})`;
  ctx.fillRect(-OX - 40, -OY - 40, CW + 80, CH + 80);
  ctx.translate(M.x + M.w / 2, M.y + M.h / 2);
  ctx.scale(.86 + .14 * k, .86 + .14 * k);
  ctx.translate(-(M.x + M.w / 2), -(M.y + M.h / 2));
  glassPanel(ctx, M.x, M.y, M.w, M.h, 26);

  if (M.kind && M.kind !== 'lang') {                 // ── hộp chữ + nút ──
    strokeText(ctx, M.title, M.x + M.w / 2, M.y + 52,
      { font: FONT.disp(28), fill: '#ffd45c', stroke: '#3a1d00', lw: 6, baseline: 'middle' });
    const lines = typeof M.lines === 'function' ? M.lines() : (M.lines || []);
    lines.forEach((ln, i) =>
      strokeText(ctx, ln, M.x + M.w / 2, M.y + 100 + i * 26,
        { font: FONT.ui(16, 600), fill: '#efe8ff', stroke: null, lw: 0, baseline: 'middle', shadow: null }));
    for (const h of M.hits)
      textBtn(ctx, h.x, h.y, h.w, h.h, typeof h.label === 'function' ? h.label() : h.label,
        { press: h.press, hover: h.hover, font: FONT.disp(20),
          colour: h.colour || '#5b5f74', dark: h.dark || '#33374a', lite: h.lite || '#9aa0b6' });
    ctx.restore();
    return;
  }

  strokeText(ctx, t('langPick'), M.x + M.w / 2, M.y + 44,
    { font: FONT.disp(26), fill: '#fff', stroke: '#2b1740', lw: 6, baseline: 'middle' });

  const cur = getLang();
  for (const h of M.hits) {
    if (h.id === 'close') {
      textBtn(ctx, h.x, h.y, h.w, h.h, t('close'),
        { press: h.press, hover: h.hover, colour: '#5b5f74', dark: '#33374a', lite: '#9aa0b6', font: FONT.disp(19) });
      continue;
    }
    const on = cur === h.id;
    roundRect(ctx, h.x, h.y, h.w, h.h, 16);
    ctx.fillStyle = on ? 'rgba(70,150,90,.35)' : 'rgba(255,255,255,.07)'; ctx.fill();
    ctx.strokeStyle = on ? '#8ef08a' : 'rgba(255,255,255,.30)';
    ctx.lineWidth = on ? 3.5 : 2; ctx.stroke();
    ctx.save();
    ctx.translate(h.x + h.w / 2, h.y + 40 + h.press * 3);
    (h.id === 'vi' ? flagVN : flagEN)(ctx, 96, 62);
    ctx.restore();
    strokeText(ctx, h.id === 'vi' ? 'Tiếng Việt' : 'English', h.x + h.w / 2, h.y + 88,
      { font: FONT.disp(20), fill: on ? '#8ef08a' : '#efe8ff', stroke: '#1a0f30', lw: 4, baseline: 'middle' });
  }
  ctx.restore();
}

/**
 * Vẽ câu xà lơ. Ghi lại vùng chạm vào q.box để lớp nhập liệu biết ngón tay có
 * đang đè lên nó không.
 */
function drawQuip() {
  const q = G.quipBox;
  const fade = q.t <= QUIP_LIFE ? 1 : 1 - (q.t - QUIP_LIFE) / QUIP_FADE;
  const rise = 1 - Math.pow(1 - Math.min(1, q.t / .3), 3);
  ctx.save();
  ctx.globalAlpha = clamp(fade, 0, 1);
  ctx.font = FONT.ui(15, 800);
  // Toast neo vào chrome phía trên thay vì nằm giữa/bên dưới bàn chơi. Người
  // chơi vẫn đọc được câu vui nhưng không mất dấu viên đá đang định chạm.
  const w = Math.min(W - 150, ctx.measureText(q.text).width + 88);
  const h = 46, x = 18 - (1 - rise) * 34, y = 10;
  q.box = { x, y, w, h };
  ctx.shadowColor = 'rgba(15,7,35,.42)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 5;
  roundRect(ctx, x, y + 4, w, h, 23);
  ctx.fillStyle = 'rgba(8,4,18,.42)'; ctx.fill();
  roundRect(ctx, x, y, w, h, 23);
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, 'rgba(102,72,176,.98)');
  g.addColorStop(.62, 'rgba(60,39,112,.98)');
  g.addColorStop(1, 'rgba(35,23,72,.98)');
  ctx.fillStyle = g; ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = q.held ? '#ffe98a' : 'rgba(218,200,255,.78)';
  ctx.lineWidth = q.held ? 3 : 2; ctx.stroke();

  // Huy hiệu biểu cảm khiến lời bình giống một sticker bạn đồng hành, không
  // còn là hộp thông báo hệ thống khô khan.
  const bx = x + 24, by = y + h / 2;
  ctx.save(); ctx.translate(bx, by); ctx.rotate(Math.sin(q.t * 7) * .035);
  const bg = ctx.createRadialGradient(-6, -8, 2, 0, 0, 20);
  bg.addColorStop(0, '#fff5ad'); bg.addColorStop(1, '#ffb52e');
  ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#7a3d08'; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.fillStyle = '#40204f';
  ctx.beginPath(); ctx.arc(-6, -3, 2.1, 0, Math.PI * 2); ctx.arc(6, -3, 2.1, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#40204f'; ctx.lineWidth = 2.3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(0, 2, 7, .20, Math.PI - .20); ctx.stroke();
  ctx.restore();

  const sparkle = (sx, sy, r) => {
    ctx.fillStyle = '#fff4a8'; ctx.beginPath();
    ctx.moveTo(sx, sy - r); ctx.lineTo(sx + r * .28, sy - r * .28);
    ctx.lineTo(sx + r, sy); ctx.lineTo(sx + r * .28, sy + r * .28);
    ctx.lineTo(sx, sy + r); ctx.lineTo(sx - r * .28, sy + r * .28);
    ctx.lineTo(sx - r, sy); ctx.lineTo(sx - r * .28, sy - r * .28);
    ctx.closePath(); ctx.fill();
  };
  sparkle(x + w - 18, y + 11, 4 + Math.sin(q.t * 5) * 1.2);
  // đồng hồ cạn dần chạy dọc mép dưới — giữ tay thì nó đứng lại
  const left = clamp(1 - q.t / QUIP_LIFE, 0, 1);
  if (left > 0) {
    ctx.save();
    roundRect(ctx, x, y, w, h, 24); ctx.clip();
    ctx.fillStyle = q.held ? '#ffe066' : '#9ff0ff';
    ctx.fillRect(x, y + h - 3, w * left, 3);
    ctx.restore();
  }
  strokeText(ctx, q.text, x + 49, y + h / 2 - 1,
    { font: FONT.ui(15, 800), fill: '#fffaf0', stroke: 'rgba(33,14,65,.8)', lw: 3,
      align: 'left', baseline: 'middle', shadow: null });
  ctx.restore();
}

G.drawModal = drawModal;
G.drawQuip = drawQuip;   // để công cụ chụp ảnh dev vẽ được lớp này

// ── khởi động ───────────────────────────────────────────────────────────────
(async function boot() {
  resize();
  buildGemSprites();
  buildOrbSprites();
  try { await document.fonts.ready; } catch { /* font chưa tải xong thì vẫn chạy */ }
  G.go('title');
  requestAnimationFrame(frame);
  setTimeout(() => document.getElementById('boot')?.classList.add('hide'), 500);
})();

window.CRICKO = G;           // tiện gỡ lỗi từ console
window.CRICKO_PERF = perf;   // đồng hồ hiệu năng, dùng cho dev/bench

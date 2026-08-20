// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  SDrakon — Proto-Cricket Realm                                            ║
// ║  Điểm khởi động: quản lý màn, vòng lặp, nhập liệu, co giãn theo màn hình ║
// ╚══════════════════════════════════════════════════════════════════════════╝
import { clamp } from './core/util.js';
import { perf, Q } from './core/perf.js';
import { computeLogical } from './core/layout.js';
import * as Store from './core/state.js';
import { getLang, setLang, toggleLang, onLangChange, t } from './core/i18n.js';
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
import { EPISODES, ALL_LEVELS, TOTAL_LEVELS } from './data/levels.js';
import { actAt, currentAct } from './data/story.js';

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
  audio: new Chiptune(),
  songs: SONGS,
  fx: new FX(),
  world: new World(W, H, OX, OY, CW, CH),
  save: Store.load(),
  scenes: { title: titleScene, egg: eggScene, map: mapScene, nest: nestScene, play: playScene, help: helpScene, shoot: shootScene, story: storyScene, duel: duelScene, world: worldScene },
  scene: null,
  level: null, levelIndex: 0,
  totalLevels: TOTAL_LEVELS,
  musicVol: 0.34,
  confirmPending: 0,

  // ── điều hướng ────────────────────────────────────────────────────────────
  go(name, arg) {
    if (G.scene?.exit) G.scene.exit(G);
    G.fx.clear();
    G.scene = G.scenes[name];
    G._sceneArg = arg;                          // giữ lại để dựng lại khi đổi cỡ
    G.scene.hits = [];
    G.scene.enter(G, arg);
  },
  startLevel(i, skipStory = false) {
    G.levelIndex = clamp(i, 0, TOTAL_LEVELS - 1);
    G.level = ALL_LEVELS[G.levelIndex];
    // Hoạt cảnh chỉ chạy lần đầu tới hồi đó; xem rồi thì vào thẳng màn.
    const act = actAt(G.levelIndex);
    if (act && !skipStory && !G.save.seenStory[act.id]) {
      G.go('story', { act, after: () => G.startLevel(G.levelIndex, true) });
      return;
    }
    G.act = currentAct(G.levelIndex);
    // ── TÌNH TIẾT NGẪU NHIÊN: thỉnh thoảng bị thế lực hắc ám chặn đường ──
    // Chỉ từ màn 5 trở đi, và không chặn hai lần liên tiếp.
    if (!skipStory && G.levelIndex >= 4 && !G._justDueled && Math.random() < 0.22) {
      G._justDueled = true;
      G.go('duel', { after: () => { G._justDueled = false; G.startLevel(G.levelIndex, true); } });
      return;
    }
    G._justDueled = false;
    G.go(G.level.mode === 'shoot' ? 'shoot' : 'play');
  },
  /** Xem lại một hồi bất kỳ (dùng ở bản đồ). */
  replayAct(act) { G.go('story', { act, after: () => G.go('map') }); },
  episodeOf(i) { return EPISODES[Math.min(Math.floor(i / 15), EPISODES.length - 1)]; },

  // ── tiện ích dùng chung ───────────────────────────────────────────────────
  persist() { Store.save(G.save); },
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
   * Hộp chọn ngôn ngữ có cờ. Đặt ở tầng TOÀN CỤC chứ không nằm trong scene:
   * nút đổi ngôn ngữ có mặt ở nhiều màn, nhét hộp vào từng scene là chép tay
   * ba bốn bản rồi lệch nhau.
   */
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
G.hero.onFire = (x, y, dx, dy) => G.fx.fire(x, y, dx, dy, 4);
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
  if (captured === 'hit' && activeHit) {
    activeHit.down = false;
    if (activeHit.contains(x, y)) activeHit.act?.();
  } else if (captured === 'scene') G.scene?.up?.(G, x, y);
  activeHit = null; captured = null;
};
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', () => { if (activeHit) activeHit.down = false; activeHit = null; captured = null; });
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

function frame(now) {
  requestAnimationFrame(frame);

  const raw = Math.min(0.05, (now - last) / 1000);   // chặn dt khi tab bị treo
  last = now;

  if (document.hidden) { acc = 0; return; }          // ẩn cửa sổ → không vẽ, không tốn pin
  acc += raw;
  if (acc < STEP * 0.92) return;                     // bỏ khung thừa của màn tần số cao
  const dt = Math.min(acc, 0.05);
  acc = 0;

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

/** Vẽ hộp chọn ngôn ngữ. */
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

G.drawModal = drawModal;   // để công cụ chụp ảnh dev vẽ được lớp này

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

window.SDRAKON = G;          // tiện gỡ lỗi từ console
window.SDRAKON_PERF = perf;  // đồng hồ hiệu năng, dùng cho dev/bench

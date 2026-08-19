// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  SDrakon — Proto-Cricket Realm                                            ║
// ║  Điểm khởi động: quản lý màn, vòng lặp, nhập liệu, co giãn theo màn hình ║
// ╚══════════════════════════════════════════════════════════════════════════╝
import { clamp } from './core/util.js';
import { perf } from './core/perf.js';
import { computeLogical } from './core/layout.js';
import * as Store from './core/state.js';
import { getLang, setLang, toggleLang, onLangChange, t } from './core/i18n.js';
import { Chiptune } from './audio/chiptune.js';
import { SONGS, trackForLevel } from './audio/songs.js';
import { FX } from './game/fx.js';
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
let { W, H } = computeLogical(window.innerWidth, window.innerHeight);
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d', { alpha: false });

const G = {
  W, H, canvas, ctx,
  audio: new Chiptune(),
  songs: SONGS,
  fx: new FX(),
  world: new World(W, H),
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
  // Đổi tỉ lệ thiết bị (xoay máy, mở/gập màn hình, đổi cỡ cửa sổ) → tính lại
  // khung logic rồi dựng lại màn đang chơi để bố cục bám đúng mép mới.
  const next = computeLogical(window.innerWidth, window.innerHeight);
  const changed = Math.abs(next.W - W) > 12;
  if (changed) { W = next.W; H = next.H; G.W = W; G.H = H; }

  // Trần 1.5 thay vì 2: giảm ~44% số điểm ảnh phải tô, mắt thường gần như
  // không thấy khác biệt trên game vẽ vector, nhưng máy mát hơn hẳn.
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  const pad = 8;
  const s = Math.min((window.innerWidth - pad) / W, (window.innerHeight - pad) / H);
  canvas.style.width = Math.round(W * s) + 'px';
  canvas.style.height = Math.round(H * s) + 'px';
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingQuality = 'high';
  G.scale = s;

  if (changed && G.scene) {
    G.world = new World(W, H);                 // nền phải vẽ lại đúng bề ngang
    const sc = G.scene, arg = G._sceneArg;
    sc.hits = [];
    sc.enter(G, arg);
  }
}
window.addEventListener('resize', resize);

// ── nhập liệu ───────────────────────────────────────────────────────────────
const pt = (e) => {
  const r = canvas.getBoundingClientRect();
  return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H];
};
let activeHit = null, captured = null;
const hitsOf = () => (G.scene?.hits || []).filter(h => !h.hidden && !h.disabled);
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
  else { captured = 'scene'; G.scene?.down?.(G, x, y); }
});
canvas.addEventListener('pointermove', (e) => {
  const [x, y] = pt(e);
  G.mouse = [x, y];
  // hover: gọi ở MỌI lần di chuột, kể cả khi không giữ nút — dùng cho việc
  // ngắm ở màn Bắn Đá (rê chuột là mũi tên đi theo, không phải giữ chuột).
  G.scene?.hover?.(G, x, y);
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
  if (e.key === 'm') G.toggleMute();
  if (e.key === 'l') G.toggleLang();
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
  if (G.confirmPending > 0) G.confirmPending -= dt;

  // trạng thái nút
  const [mx, my] = G.mouse || [-1, -1];
  for (const h of hitsOf()) h.tick(dt, h.contains(mx, my), !!h.down);

  G.scene?.update?.(G, dt);
  G.fx.update(dt);

  ctx.save();
  ctx.translate(G.fx.shakeX, G.fx.shakeY);
  ctx.fillStyle = '#0b0716'; ctx.fillRect(-40, -40, W + 80, H + 80);
  G.scene?.draw?.(G, ctx);
  if (G.scene?.name !== 'play') G.fx.draw(ctx);      // màn chơi tự vẽ hạt đúng lớp
  ctx.restore();

  if (showFps) {
    ctx.save();
    ctx.font = '700 15px "Be Vietnam Pro",monospace';
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(8, 8, 168, 26);
    ctx.fillStyle = perf.fps > 50 ? '#8ef08a' : perf.fps > 35 ? '#ffd76b' : '#ff7a90';
    ctx.fillText(`${perf.fps.toFixed(0)} fps · ${perf.ms.toFixed(1)}ms · ${perf.label}`, 14, 26);
    ctx.restore();
  }
}

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

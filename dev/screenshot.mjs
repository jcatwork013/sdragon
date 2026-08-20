// Chụp ảnh mọi màn ngoài trình duyệt + bắt lỗi runtime.
// Chạy:  node dev/screenshot.mjs        (ảnh ra thư mục dev/shots/)
// Cần:   npm i --save-dev @napi-rs/canvas
// Chạy trọn game trong Node bằng canvas thật → chụp từng màn + bắt lỗi runtime.
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import fs from 'node:fs';
import path from 'node:path';

// Ảnh luôn ghi vào dev/shots/ dù chạy từ thư mục nào
const SHOTS = path.join(path.dirname(new URL(import.meta.url).pathname), 'shots');
fs.mkdirSync(SHOTS, { recursive: true });
const out = f => path.join(SHOTS, path.basename(f));

// Font chỉ dùng cho ảnh chụp offline. Thiếu file cũng chạy được (rơi về font hệ thống).
for (const [f, fam] of [['baloo2.ttf','Baloo 2'], ['bvp600.ttf','Be Vietnam Pro'], ['bungee.ttf','Bungee']]) {
  try { GlobalFonts.registerFromPath(new URL('../fonts/' + f, import.meta.url).pathname, fam); } catch {}
}

const W = 1280, H = 720;
const real = createCanvas(W, H);
const rctx = real.getContext('2d');

const el = {
  width: W, height: H, style: {},
  classList: { add() {}, remove() {}, contains: () => false },
  getContext: () => rctx,
  addEventListener() {}, removeEventListener() {},
  setPointerCapture() {},
  getBoundingClientRect: () => ({ left: 0, top: 0, width: W, height: H }),
};
const store = new Map();
globalThis.localStorage = {
  getItem: k => store.has(k) ? store.get(k) : null,
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: k => store.delete(k),
};
globalThis.document = {
  getElementById: id => id === 'game' ? el : { classList: { add() {}, remove() {} } },
  createElement: tag => tag === 'canvas' ? createCanvas(1, 1) : {},
  fonts: { ready: Promise.resolve() },
  addEventListener() {},
};
globalThis.window = {
  addEventListener() {}, innerWidth: 1400, innerHeight: 800, devicePixelRatio: 1,
  AudioContext: undefined,
};
Object.defineProperty(globalThis, 'navigator', { value: { language: 'vi-VN' }, configurable: true });
globalThis.performance = { now: () => Date.now() };
let rafCount = 0;
globalThis.requestAnimationFrame = () => ++rafCount;   // không chạy vòng lặp thật

const errors = [];
process.on('uncaughtException', e => { console.error('UNCAUGHT:', e.stack.split('\n').slice(0,4).join('\n')); errors.push('uncaught: ' + e.message); });

const ROOT = new URL('../js/', import.meta.url).href;
await import(ROOT + 'main.js');
await new Promise(r => setTimeout(r, 120));            // chờ boot() xong
const G = globalThis.window.SDRAKON || globalThis.SDRAKON;
if (!G) { console.error('BOOT THẤT BẠI', errors); process.exit(1); }

function run(name, frames, file, setup) {
  try {
    if (setup) setup();
    for (let i = 0; i < frames; i++) {
      G.scene?.update?.(G, 1 / 60);
      G.fx.update(1 / 60);
    }
    rctx.setTransform(1, 0, 0, 1, 0, 0);
    rctx.fillStyle = '#0b0716'; rctx.fillRect(0, 0, W, H);
    G.scene?.draw?.(G, rctx);
    if (G.scene?.name !== 'play') G.fx.draw(rctx);
    if (G.modal) G.drawModal();        // lớp toàn cục, vòng vẽ thật lo phần này
    fs.writeFileSync(out(file), real.toBuffer('image/png'));
    console.log(`✓ ${name.padEnd(22)} → dev/shots/${path.basename(file)}`);
  } catch (e) {
    errors.push(`${name}: ${e.stack.split('\n').slice(0, 3).join(' | ')}`);
    console.log(`✗ ${name.padEnd(22)} LỖI: ${e.message}`);
  }
}

run('1 · Màn mở đầu',   90, 'sc1_title.png', () => G.go('title'));
run('2 · Chọn trứng',   60, 'sc2_egg.png',   () => G.go('egg'));
run('3 · Nở trứng',    170, 'sc3_hatch.png', () => { G.go('egg'); G.scene.sel = 2; G.scene.startHatch(G); });
run('4 · Bản đồ',       60, 'sc4_map.png',   () => { G.save.breed = 'ember'; G.save.xp = 2600; G.save.unlocked = 7;
                                                     G.save.stars = { 'shellbreak-1': 3, 'shellbreak-2': 2, 'shellbreak-3': 3, 'shellbreak-4': 1, 'shellbreak-5': 2, 'shellbreak-6': 0 };
                                                     G.hero.xp = 2600; G.go('map'); });
run('5 · Tổ dế · luyện', 60, 'sc5_nest.png',  () => { G.save.mats={vo:9,to:8,nhua:7,da:12,sung:9,canh:5}; G.save.crafted={helm1:true,wep1:true}; G.save.equip={helm:'helm1',armor:null,weapon:'wep1'}; G.go('nest'); });
run('5b · Tổ dế · chế tạo', 20, 'sc5b_craft.png', () => { G.scene.tab='craft'; G.scene.build(G); });
run('5c · Tổ dế · trang bị', 20, 'sc5c_gear.png', () => { G.scene.tab='gear'; G.scene.build(G); });
run('6 · Màn chơi',     90, 'sc6_play.png',  () => { G.startLevel(3); });
run('7 · Đang combo',   40, 'sc7_combo.png', () => {
  const s = G.scene; s.score = 4820; s.gold = 213; s.movesLeft = 11; s.vitality = .58; s.breath = 1;
  s.praise = 'Xuất sắc!'; s.praiseT = 1.1;
  G.fx.burst(640, 340, { lite: '#ffc0cf', base: '#f03560', dark: '#750b28', spark: '#ffeaf0' }, 22, 1.4);
  G.fx.float(640, 300, '+1,860', { size: 40 }); G.fx.ring(640, 340, '#ffd76b', 20, 200, .5, 10);
  G.fx.beam(640, 340, true, 280, '#ffd76b');
});
run('8 · Qua màn',      50, 'sc8_win.png',   () => { const s = G.scene; s.score = 9200; s.gold = 340; s.movesLeft = 6; s.finish(G, true); });
run('7b · Đủ điểm',  90, 'sc7b_goal.png', () => { G.startLevel(2, true); const s2=G.scene;
  s2.score = G.level.target + 800; s2.hitGoal = true; s2.movesLeft = 9; s2.timeLeft = 46;
  s2.showFinishNow(G); });
run('7c · Màn bravo', 40, 'sc7c_bravo.png', () => { G.startLevel(2, true); const s2=G.scene;
  s2.score = G.level.target + 800; s2.movesLeft = 9; s2.timeLeft = 46; s2.startBravo(G, 'test'); });
run('9 · Tạm dừng',     20, 'sc9_pause.png', () => { G.startLevel(3); G.scene.togglePause(G); });
run('10 · Hướng dẫn tr1', 40, 'sc10_help1.png', () => { G.go('help', 'map'); });
run('11 · Hướng dẫn tr2', 20, 'sc11_help2.png', () => { G.scene.page = 1; });
run('12 · Dạy màn 1',    60, 'sc12_tutor.png', () => { G.save.seenTut = false; G.startLevel(0); });

run('15 · Hướng dẫn tr3', 30, 'sc15_help3.png', () => { G.go('help','map'); G.scene.page = 2; });
run('13 · Bắn Đá',       90, 'sc13_shoot.png', () => { G.save.unlocked=24; G.startLevel(18, true); });
run('14 · Bắn Đá đang bay', 30, 'sc14_shootfly.png', () => {
  const s = G.scene; s.aim = -Math.PI/2 - 0.35;
  s.board.fire(s.board.W/2, 470, s.aim);
});

run('20 · Đánh địch',  70, 'sc20_battle.png', () => { G.save.unlocked=20; G.startLevel(16, true); });
run('21 · Trúng đòn',   4, 'sc21_hit.png',   () => { const s2=G.scene; s2.hitFlash=.42; s2.hp=s2.maxHp*.34; s2.score=3100; });
run('22 · Lời thoại',  50, 'sc22_beat.png', () => { G.save.unlocked=20; G.startLevel(16, true); G.scene.say(G,'webbed'); });
run('24 · Đấu tay đôi', 40, 'sc24_duel.png', () => {
  G.save.breed='ember'; G.save.xp=5200; G.save.stats={might:4,spirit:3,fortune:2,breath:1};
  G.hero.xp=5200; G.go('duel', { after: () => {} });
});
run('24b · Màn VS',      48, 'sc24b_duelvs.png', () => { G.scene.phase = 'intro'; G.scene.introT = 0; });
run('24c · Khoe chiêu',  12, 'sc24c_duelmove.png', () => { G.scene.phase = 'pick'; G.scene.introT = 9; G.scene.play(G, 'huc'); });
run('24d · Lao vào',      8, 'sc24d_duelclash.png', () => { G.scene.phase = 'clash'; G.scene.clashT = 0; G.scene.impacted = true; });
run('25 · Đang ra đòn', 25, 'sc25_duelhit.png', () => { G.scene.phase = 'pick'; G.scene.play(G, 'huc'); });
run('25b · Thắng (đểu)',  60, 'sc25b_duelwin.png', () => { G.scene.phase='pick'; G.scene.foe.hp = 1; G.scene.play(G,'huc'); G.scene.finish(G, true); });
run('25c · Thua (băng bó)',60,'sc25c_duellose.png', () => { G.go('duel', { after: () => {} }); G.scene.phase='pick'; G.scene.finish(G, false); });
run('27 · Chọn ngôn ngữ', 30, 'sc27_lang.png', () => { G.go('map'); G.askLang(); });
run('28 · Cửa hàng',  40, 'sc28_shop.png', () => { G.save.gold=5200; G.save.owned={sh_helm2:1,sh_scf3:1};
  G.save.equip={helm:'sh_helm2',scarf:'sh_scf3',armor:null,weapon:null}; G.go('shop', { after(){} }); });
run('26 · Bản đồ thế giới', 40, 'sc26_world.png', () => { G.save.unlocked=20; G.go('world', { after: () => {} }); });
run('17 · Búa giáng',  1, 'sc17_hammer.png', () => { G.startLevel(2); G.scene.skillFx = { kind:'hammer', t:.235, dur:.78, x:640, y:340 }; });
run('18 · Lửa quét',   1, 'sc18_fire.png',   () => { G.startLevel(2); G.scene.skillFx = { kind:'fire', t:.40, dur:.95, row:4, y:400 }; });
run('19 · Lốc xoáy',   1, 'sc19_shuf.png',   () => { G.startLevel(2); G.scene.skillFx = { kind:'shuffle', t:.35, dur:.75 }; });

const { ACTS: A2 } = await import(new URL('../js/data/story.js', import.meta.url).href);
run('23 · Lựa chọn', 200, 'sc23_choice.png', () => {
  G.go('story', { act: A2.find(a => a.id === 'well'), after: () => {} });
  G.scene.line = G.scene.lines.length - 1;
  G.scene.chars = 999;
});

const { ACTS } = await import(new URL('../js/data/story.js', import.meta.url).href);
[0,1,3,4,5].forEach((ai,n) => run('16.'+n+' Hồi '+(ai+1), 40, 'sc16_story'+ai+'.png',
  () => G.go('story', { act: ACTS[ai], after: () => {} })));

console.log('\n' + (errors.length ? '❌ ' + errors.length + ' LỖI:\n' + errors.join('\n') : '✅ Không có lỗi runtime ở màn nào.'));

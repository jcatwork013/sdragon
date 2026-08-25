// Chụp ảnh mọi màn ngoài trình duyệt + bắt lỗi runtime.
// Chạy:  node dev/screenshot.mjs        (ảnh ra thư mục dev/shots/)
// Cần:   npm i --save-dev @napi-rs/canvas
// Chạy trọn game trong Node bằng canvas thật → chụp từng màn + bắt lỗi runtime.
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import fs from 'node:fs';
import path from 'node:path';

const PORTRAIT = process.argv.includes('--portrait');
const SHORT = PORTRAIT && process.argv.includes('--short');
// Tách ảnh dọc khỏi bộ chuẩn desktop để có thể so sánh cả hai sau mỗi lần sửa.
const MODE = SHORT ? 'portrait-short' : PORTRAIT ? 'portrait' : 'landscape';
const SHOTS = path.join(path.dirname(new URL(import.meta.url).pathname), 'shots', MODE);
fs.mkdirSync(SHOTS, { recursive: true });
const out = f => path.join(SHOTS, path.basename(f));

// Font chỉ dùng cho ảnh chụp offline. Thiếu file cũng chạy được (rơi về font hệ thống).
for (const [f, fam] of [['baloo2.ttf','Baloo 2'], ['bvp600.ttf','Be Vietnam Pro'], ['bungee.ttf','Bungee']]) {
  try { GlobalFonts.registerFromPath(new URL('../fonts/' + f, import.meta.url).pathname, fam); } catch {}
}

const CSS_W = SHORT ? 375 : PORTRAIT ? 390 : 1400;
const CSS_H = SHORT ? 667 : PORTRAIT ? 845 : 800;
const W = PORTRAIT ? 640 : 1280;
const H = PORTRAIT ? Math.round(W * CSS_H / CSS_W) : 720;
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
  addEventListener() {}, innerWidth: CSS_W, innerHeight: CSS_H, devicePixelRatio: 1,
  AudioContext: undefined,
};
Object.defineProperty(globalThis, 'navigator', { value: { language: 'vi-VN' }, configurable: true });
globalThis.performance = { now: () => Date.now() };
let rafCount = 0;
globalThis.requestAnimationFrame = () => ++rafCount;   // không chạy vòng lặp thật

const errors = [];
process.on('uncaughtException', e => { console.error('UNCAUGHT:', e.stack.split('\n').slice(0,4).join('\n')); errors.push('uncaught: ' + e.message); });

const ROOT = new URL('../js/', import.meta.url).href;
const { shopStock: STOCKI } = await import(ROOT + 'data/gear.js');
const SHOPI = STOCKI();      // lô hàng sinh trong ngày — cửa hàng không còn danh sách cứng
const { EPISODES: EPS, REGIONS: REG } = await import(ROOT + 'data/levels.js');
const LVL = await import(ROOT + 'data/levels.js');
const { DARK: DARKI } = await import(ROOT + 'data/duel.js');
const { Enemy: ENE, ENEMIES: ENEMIESI } = await import(ROOT + 'game/enemy.js');
const DUELI = await import(ROOT + 'data/duel.js');
const { Cricket: CRI } = await import(ROOT + 'game/cricket.js');
await import(ROOT + 'main.js');
await new Promise(r => setTimeout(r, 120));            // chờ boot() xong
const G = globalThis.window.CRICKO || globalThis.CRICKO;
if (!G) { console.error('BOOT THẤT BẠI', errors); process.exit(1); }
// Đánh dấu đã xem mọi màn mở chương — nếu không nó chen vào giữa mọi ảnh
// chụp có gọi startLevel(), và G.scene không còn là màn chơi nữa.
EPS.forEach(e => { G.save.seenEp[e.id] = true; });

function run(name, frames, file, setup) {
  try {
    G.save.fed = 100;                 // chụp liên tiếp thì dế đói thật, no lại trước mỗi ảnh
    if (setup) setup();
    for (let i = 0; i < frames; i++) {
      G.scene?.update?.(G, 1 / 60);
      G.fx.update(1 / 60);
    }
    rctx.setTransform(1, 0, 0, 1, 0, 0);
    rctx.fillStyle = '#0b0716'; rctx.fillRect(0, 0, W, H);
    G.scene?.draw?.(G, rctx);
    if (G.scene?.name !== 'play') G.fx.draw(rctx);
    if (G.quipBox) G.drawQuip();       // lớp toàn cục, vòng vẽ thật lo phần này
    if (G.modal) G.drawModal();
    fs.writeFileSync(out(file), real.toBuffer('image/png'));
    console.log(`✓ ${name.padEnd(22)} → dev/shots/${MODE}/${path.basename(file)}`);
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
// Thanh sao khi đã ăn 2 sao + búa gõ đầu thiên địch (cục u + sao bay).
// Thẻ nhân vật ở giai đoạn CUỐI (dế to nhất) — chỗ dễ bị cắt càng nhất.
run('6d · Thẻ dế lớn', 24, 'sc6d_herocard.png', () => { G.save.xp = 12000; G.hero.xp = 12000; G.startLevel(6, true); });
run('6b · Đủ 2 sao', 20, 'sc6b_stars.png', () => { G.startLevel(8, true); G.scene.score = Math.round(G.level.target * 1.45); });
run('6c · Búa gõ đầu', 26, 'sc6c_bonk.png', () => { G.startLevel(8, true);
  const sc = G.scene; sc.hammerMode = true;
  const n = sc.enemies.length; if (n) sc.down(G, 384 + 540 * (0.5 / n), 82); });
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
run('7d · Câu xà lơ', 30, 'sc7d_quip.png', () => { G.startLevel(2, true);
  G.sess.sessMin = 0; G.quipBox = null; G.quip(); });
run('29 · Ghép Đôi',  50, 'sc29_pair.png', () => { G.save.unlocked=20; G.startLevel(6, true);
  const s2=G.scene, pair=s2.findAvailablePair();
  if (pair) { s2.selected=pair.a; s2.hintPair={...pair,t:100}; s2.linkFx={points:pair.path,t:0,dur:100,col:'#73e9ff'}; }
  for (let i=0;i<8;i++) s2.cards[i].seed=i; });
run('7e · Nổi nộ', 14, 'sc7e_fury.png', () => { G.startLevel(2, true);
  const s2=G.scene; s2.score=2400; s2.rage=.94; s2.hot=6; s2.addRage(G, .1); });
run('9 · Tạm dừng',     20, 'sc9_pause.png', () => { G.startLevel(3); G.scene.togglePause(G); });
run('10 · Hướng dẫn tr1', 40, 'sc10_help1.png', () => { G.go('help', 'map'); });
run('11 · Hướng dẫn tr2', 20, 'sc11_help2.png', () => { G.scene.page = 1; });
run('12 · Dạy màn 1',    60, 'sc12_tutor.png', () => { G.save.seenTut = false; G.startLevel(0); });

run('15b · Hướng dẫn tr4', 30, 'sc15b_help4.png', () => { G.go('help', 'title'); G.scene.page = 3; });
run('15 · Hướng dẫn tr3', 30, 'sc15_help3.png', () => { G.go('help','map'); G.scene.page = 2; });
run('13 · Bắn Đá',       90, 'sc13_shoot.png', () => { G.save.unlocked=24; G.startLevel(18, true); });
run('14 · Bắn Đá đang bay', 30, 'sc14_shootfly.png', () => {
  const s = G.scene; s.aim = -Math.PI/2 - 0.35;
  s.board.fire(s.board.W/2, 470, s.aim);
});

run('20 · Đánh địch',  70, 'sc20_battle.png', () => { G.save.unlocked=20; G.startLevel(16, true); });
run('21 · Trúng đòn',   4, 'sc21_hit.png',   () => { const s2=G.scene; s2.hitFlash=.42; s2.hp=s2.maxHp*.34; s2.score=3100; });
run('21b · Địch lao vào dế', 4, 'sc21b_raid.png', () => {
  const s2=G.scene, enemy=s2.enemies[0];
  s2.hitFlash=.24; s2.raidFx={ enemy, index:0, t:.42, dur:.92, kind:enemy.def.atk };
});
run('22 · Lời thoại',  50, 'sc22_beat.png', () => { G.save.unlocked=20; G.startLevel(16, true); G.scene.say(G,'webbed'); });
run('24 · Đấu tay đôi', 40, 'sc24_duel.png', () => {
  // ép ra Nhện Goá Phụ để soi đúng hình loài, không phụ thuộc bốc ngẫu nhiên
  G.save.breed='ember'; G.save.xp=5200; G.save.stats={might:4,spirit:3,fortune:2,breath:1};
  G.hero.xp=5200; G.go('duel', { after: () => {} });
  const s2=G.scene, D=DARKI.find(d=>d.id==='widow');
  s2.foe.def=D; s2.foeArt=new ENE('spider',1);
  s2.foeArt.def={...ENEMIESI.spider, ...D, id:'spider'};
});
run('24b · Màn VS',      48, 'sc24b_duelvs.png', () => { G.scene.phase = 'intro'; G.scene.introT = 0; });
run('24c · Khoe chiêu',  12, 'sc24c_duelmove.png', () => { G.scene.phase = 'pick'; G.scene.introT = 9; G.scene.play(G, 'huc'); });
run('24d · Lao vào',      8, 'sc24d_duelclash.png', () => { G.scene.phase = 'clash'; G.scene.clashT = 0; G.scene.impacted = true; });
// Đối thủ là DẾ (vẽ bằng hàm vẽ nhân vật) và trùm chim cốc — hai nhánh vẽ khác nhau.
run('24e · Đấu với dế', 40, 'sc24e_duelrival.png', () => { G.go('duel', { after(){} });
  const D = DUELI.RIVALS[1]; const s3 = G.scene; s3.foe.def = D;
  s3.foeArt = { rival: new CRI(D.breed, 5200), def: D, damage(){}, update(dt){ this.rival.update(dt); },
                draw(c,x,y,sz){ this.rival.draw(c,x,y,sz*.58,-1); } };
  s3.phase = 'pick'; s3.introT = 99; });
run('24f · Trùm cốc', 40, 'sc24f_duelbird.png', () => { G.go('duel', { after(){} });
  const D = DUELI.DARK.find(x => x.id === 'coc'); const s4 = G.scene; s4.foe.def = D;
  s4.foeArt = new ENE('bird', 1); s4.foeArt.def = { ...ENEMIESI.bird, ...D, id: 'bird' };
  s4.phase = 'pick'; s4.introT = 99; });
run('25 · Đang ra đòn', 25, 'sc25_duelhit.png', () => { G.scene.phase = 'pick'; G.scene.play(G, 'huc'); });
run('25b · Thắng (đểu)',  60, 'sc25b_duelwin.png', () => { G.scene.phase='pick'; G.scene.foe.hp = 1; G.scene.play(G,'huc'); G.scene.finish(G, true); });
run('25c · Thua (băng bó)',60,'sc25c_duellose.png', () => { G.go('duel', { after: () => {} }); G.scene.phase='pick'; G.scene.finish(G, false); });
run('27 · Chọn ngôn ngữ', 30, 'sc27_lang.png', () => { G.go('map'); G.askLang(); });
const gearOf = (slot, tier) => SHOPI.find(x => x.slot === slot && x.tier === tier);
run('28 · Cửa hàng',  40, 'sc28_shop.png', () => { G.save.gold=14200;
  G.save.owned={ [gearOf('helm',2).id]:1, [gearOf('scarf',3).id]:1 };
  G.save.equip={helm:gearOf('helm',2).id, scarf:gearOf('scarf',3).id, armor:null, weapon:null};
  G.go('shop', { after(){} }); });
run('28b · Xác nhận mua', 20, 'sc28b_buy.png', () => { G.save.gold=14200;
  G.go('shop', { after(){} }); G.scene.askBuy(G, gearOf('helm', 4)); });
run('28c · Tủ đồ', 20, 'sc28c_bag.png', () => { G.save.gold=1240;
  G.save.owned={ [gearOf('helm',2).id]:1, [gearOf('helm',3).id]:1, [gearOf('helm',4).id]:1 };
  G.save.equip={helm:gearOf('helm',3).id};
  G.go('shop', { after(){}, mode:'bag' }); });
run('30 · Mở chương', 40, 'sc30_chapter.png', () => { G.save.unlocked=20;
  G.go('chapter', { ep: EPS[1], after(){} }); });
run('31 · Chuyển vùng ①', 40, 'sc31a_region.png', () => { G.go('region', { done: REG[0], next: REG[1], after(){} }); });
run('31 · Chuyển vùng ②', 100, 'sc31b_region.png', () => { G.scene.t = 3.6; });
run('31 · Chuyển vùng ③', 40, 'sc31c_region.png', () => { G.scene.t = 6.4; });
run('32 · Dế đói',  30, 'sc32_hungry.png', () => { G.go('map'); G.save.fed = 0; G.save.food = 2; });
// Hết sức mà KHÔNG còn thức ăn → phải hiện đồng hồ đếm ngược, không phải câu 'đi cho ăn'.
run('32b · Chờ hồi sức', 30, 'sc32b_rest.png', () => { G.go('map'); G.save.fed = 0; G.save.food = 0; G.save.fedAt = Date.now(); });
// Hết sức mà bấm đi màn: dế giãy nảy + hộp thoại, KHÔNG đá về Tổ Dế nữa.
run('32c · Hộp dế mệt', 20, 'sc32c_restmodal.png', () => { G.go('map'); G.save.fed = 2; G.save.food = 3; G.save.fedAt = Date.now(); G.startLevel(5, true); });
// Mở khoá vùng mới: camera tự chạy sang vùng kế + biển tên + pháo giấy.
run('4b · Mở vùng mới', 108, 'sc4b_newarea.png', () => { G.save.unlocked = 17; G.save.mapEp = 'shellbreak'; G.hero.xp = 4000; G.go('map'); });
// Hết mảnh 1 (màn 45) → hoạt cảnh chuyển sang mảnh 2 Đầm Rêu.
run('31d · Sang mảnh 2', 60, 'sc31d_region2.png', () => { G.save.unlocked = 46; G.nextLevel ? 0 : 0;
  const { regionOf: RO, nextRegion: NR } = LVL; G.go('region', { done: RO(44)?.region, next: NR(44), after(){} }); });
// Bốn kiểu nền theo chủ đề mảnh đất — mỗi mảnh phải nhìn ra ngay là nơi khác.
[[3,  'sc40_biome_grass.png', '40 · Nền Bờ Cỏ'],
 [50, 'sc41_biome_bog.png',   '41 · Nền Đầm Rêu'],
 [95, 'sc42_biome_peak.png',  '42 · Nền Đỉnh Gió'],
 [140,'sc43_biome_mush.png',  '43 · Nền Rừng Nấm']].forEach(([lv, file, name]) =>
  run(name, 30, file, () => { G.save.unlocked = lv + 2; G.startLevel(lv, true); }));
// Nền nhìn rõ nhất ở màn bản đồ — chụp thêm hai mảnh mới.
[[95, 'sc42b_map_peak.png', '42b · Bản đồ Đỉnh Gió'],
 [140,'sc43b_map_mush.png', '43b · Bản đồ Rừng Nấm']].forEach(([lv, file, name]) =>
  run(name, 30, file, () => { G.save.unlocked = lv + 2; G.save.mapEp = null; G.go('map'); }));
run('26 · Bản đồ thế giới', 40, 'sc26_world.png', () => { G.save.unlocked=20; G.go('world', { after: () => {} }); });
// Mảnh chưa mở phải KỂ CHUYỆN chứ không chỉ báo 'chưa tới lượt'.
run('26b · Mảnh 2 đã mở', 40, 'sc26b_worldlock.png', () => { G.save.unlocked=50; G.go('world', { after: () => {} }); G.scene.pick(G, 1); });
run('17 · Búa giáng',  1, 'sc17_hammer.png', () => { G.startLevel(2); G.scene.skillFx = { kind:'hammer', t:.235, dur:.78, x:640, y:340 }; });
run('18 · Gáy quét',   1, 'sc18_chirp.png',  () => { G.startLevel(2); G.scene.skillFx = { kind:'chirp', t:.40, dur:.95, row:4, y:400 }; });
run('19 · Lốc xoáy',   1, 'sc19_shuf.png',   () => { G.startLevel(2); G.scene.skillFx = { kind:'shuffle', t:.35, dur:.75 }; });

const { ACTS: A2 } = await import(new URL('../js/data/story.js', import.meta.url).href);
run('23 · Lựa chọn', 200, 'sc23_choice.png', () => {
  G.go('story', { act: A2.find(a => a.id === 'well'), after: () => {} });
  G.scene.line = G.scene.lines.length - 1;
  G.scene.chars = 999;
});

const { ACTS } = await import(new URL('../js/data/story.js', import.meta.url).href);
[0,1,3,4,5].forEach((ai,n) => run('16.'+n+' Hồi '+(ai+1), 40, 'sc16_story'+ai+'.png',
  () => { G.save.breed = 'ember'; G.go('story', { act: ACTS[ai], after: () => {} }); }));
// Chọn trứng tím thì lời kể phải gọi Mực, không phải Rơm — ảnh này canh đúng lỗi đó.
run('16.5 Hồi 1 · giống Mực', 40, 'sc16_story0_muc.png',
  () => { G.save.breed = 'void'; G.go('story', { act: ACTS[0], after: () => {} }); G.scene.line = 1; G.scene.chars = 999; });
run('16.6 Hồi 3 · giống Mực', 40, 'sc16_story2_muc.png',
  () => { G.save.breed = 'void'; G.go('story', { act: ACTS[2], after: () => {} }); G.scene.line = 2; G.scene.chars = 999; });

console.log('\n' + (errors.length ? '❌ ' + errors.length + ' LỖI:\n' + errors.join('\n') : '✅ Không có lỗi runtime ở màn nào.'));

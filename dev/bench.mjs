// Đo chi phí vẽ mỗi khung hình.  node dev/bench.mjs [số khung]
import { createCanvas } from '@napi-rs/canvas';
const W = 1280, H = 720;
const real = createCanvas(W, H), rctx = real.getContext('2d');
const el = { width: W, height: H, style: {}, classList:{add(){},remove(){},contains:()=>false},
  getContext: () => rctx, addEventListener(){}, setPointerCapture(){},
  getBoundingClientRect: () => ({left:0,top:0,width:W,height:H}) };
const store = new Map();
globalThis.localStorage = { getItem:k=>store.get(k)??null, setItem:(k,v)=>store.set(k,String(v)), removeItem:k=>store.delete(k) };
globalThis.document = { getElementById:id=>id==='game'?el:{classList:{add(){},remove(){}}},
  createElement:t=>t==='canvas'?createCanvas(1,1):{}, fonts:{ready:Promise.resolve()}, addEventListener(){} };
globalThis.window = { addEventListener(){}, innerWidth:1400, innerHeight:800, devicePixelRatio:1, AudioContext:undefined };
Object.defineProperty(globalThis,'navigator',{value:{language:'vi-VN'},configurable:true});
globalThis.performance = { now: () => Number(process.hrtime.bigint() / 1000n) / 1000 };
globalThis.requestAnimationFrame = () => 0;

await import(new URL('../js/main.js', import.meta.url).href);
await new Promise(r => setTimeout(r, 150));
const G = globalThis.window.SDRAKON;
const { perf } = await import(new URL('../js/core/perf.js', import.meta.url).href);

const N = Number(process.argv[2] || 300);
function bench(label, setup) {
  setup();
  for (let i = 0; i < 40; i++) { G.scene.update(G, 1/60); G.fx.update(1/60); G.scene.draw(G, rctx); }  // làm nóng
  const t0 = performance.now();
  for (let i = 0; i < N; i++) {
    G.scene.update(G, 1 / 60);
    G.fx.update(1 / 60);
    rctx.setTransform(1,0,0,1,0,0);
    G.scene.draw(G, rctx);
  }
  const ms = (performance.now() - t0) / N;
  console.log(`${label.padEnd(26)} ${ms.toFixed(2).padStart(6)} ms/khung  →  ${(1000/ms).toFixed(0).padStart(4)} fps (CPU thuần)`);
  return ms;
}

let bakes = 0;
const origBake = G.world._bake.bind(G.world);
G.world._bake = function () { bakes++; return origBake(); };

bench('Màn chơi (tĩnh)', () => G.startLevel(3));
bench('Màn chơi + hiệu ứng', () => {
  G.startLevel(3);
  for (let k = 0; k < 6; k++) G.fx.burst(400 + k*60, 300, {lite:'#fff',base:'#08f',dark:'#036',spark:'#fff'}, 18, 1.4);
  G.fx.fire(300, 400, 1, -.1, 24);
});
bench('Bản đồ', () => { G.save.breed='ember'; G.save.unlocked=9; G.go('map'); });
bench('Tổ rồng', () => G.go('nest'));
bench('Màn mở đầu', () => G.go('title'));
bench('Đấu tay đôi', () => { G.save.xp=5200; G.hero.xp=5200; G.go('duel', { after(){} }); G.scene.phase='pick'; });
bench('Bắn Đá', () => { G.save.unlocked=9; G.startLevel(3, true); });
// ── Quét theo MỨC CHẤT LƯỢNG ────────────────────────────────────────────
// Máy yếu chạy ở mức THẤP, mà bench trên máy khoẻ luôn tự chọn mức CAO — nên
// nếu không ép mức thì mọi tối ưu dành cho máy yếu đều không đo được.
console.log('\n════ THEO MỨC CHẤT LƯỢNG ════');
const SC = [
  ['Màn chơi', () => G.startLevel(3, true)],
  ['Bản đồ',   () => { G.save.breed='ember'; G.save.unlocked=9; G.go('map'); }],
  ['Bắn Đá',   () => { G.save.unlocked=9; G.startLevel(3, true); }],
];
const lock = (q) => { perf.quality = q; perf.tick = () => { perf.quality = q; }; };
for (const [nameS, setup] of SC) {
  const out = [];
  for (const q of [2, 1, 0]) { lock(q); out.push(bench2(setup)); }
  console.log(`${nameS.padEnd(12)} CAO ${out[0].toFixed(2)}  ·  VỪA ${out[1].toFixed(2)}  ·  THẤP ${out[2].toFixed(2)} ms/khung` +
              `   (thấp nhanh hơn cao ${((out[0] / out[2] - 1) * 100).toFixed(0)}%)`);
}
function bench2(setup) {
  setup();
  for (let i = 0; i < 30; i++) { G.scene.update(G, 1/60); G.fx.update(1/60); G.scene.draw(G, rctx); }
  const t0 = performance.now();
  for (let i = 0; i < N; i++) {
    G.scene.update(G, 1/60); G.fx.update(1/60);
    rctx.setTransform(1,0,0,1,0,0); G.scene.draw(G, rctx);
  }
  return (performance.now() - t0) / N;
}

console.log('\nSố lần nướng lại nền:', bakes, bakes <= 4 ? '✓ (chỉ khi đổi chương)' : '✗ nướng quá nhiều!');
console.log('Mức chất lượng tự chọn:', perf.label);

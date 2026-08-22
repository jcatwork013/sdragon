// Mô phỏng ĐẤU TAY ĐÔI: đo số hiệp mỗi trận, tỉ lệ thắng, tần suất đọ càng và nổi Nộ.
// Chạy:  node dev/balance-duel.mjs [số trận] [lối đánh: random|counter]
import { createCanvas } from '@napi-rs/canvas';
const W = 1280, H = 720;
const real = createCanvas(W, H), rctx = real.getContext('2d');
const el = { width: W, height: H, style: {}, classList:{add(){},remove(){},contains:()=>false},
  getContext: () => rctx, addEventListener(){}, setPointerCapture(){},
  getBoundingClientRect: () => ({left:0,top:0,width:W,height:H}) };
const store = new Map();
globalThis.localStorage = { getItem:k=>store.get(k)??null, setItem:(k,v)=>store.set(k,String(v)), removeItem:k=>store.delete(k) };
globalThis.document = { getElementById:id=>id==='game'?el:{classList:{add(){},remove(){}}},
  createElement:t=>t==='canvas'?createCanvas(1,1):{}, fonts:{ready:Promise.resolve()}, addEventListener(){}, hidden:false };
globalThis.window = { addEventListener(){}, innerWidth:1400, innerHeight:800, devicePixelRatio:1, AudioContext:undefined };
Object.defineProperty(globalThis,'navigator',{value:{language:'vi-VN'},configurable:true});
globalThis.performance = { now: () => Date.now() };
globalThis.requestAnimationFrame = () => 0;
await import(new URL('../js/main.js', import.meta.url).href);
await new Promise(r => setTimeout(r, 120));
const G = globalThis.window.CRICKO;
const { MOVES } = await import(new URL('../js/data/duel.js', import.meta.url).href);

const TRIALS = Number(process.argv[2] || 200);
const STYLE  = process.argv[3] || 'random';
G.save.breed = 'ember'; G.save.xp = 5200; G.save.stats = { might: 2, spirit: 2, fortune: 1, breath: 1 };

let wins = 0, rounds = 0, clashes = 0, furies = 0, longest = 0;
for (let k = 0; k < TRIALS; k++) {
  G.go('duel', { after: () => {} });
  const s = G.scene;
  s.phase = 'pick';                       // bỏ qua màn VS cho nhanh
  let guard = 0, sawFury = false;
  while (!s.over && guard++ < 400) {
    if (s.phase === 'pick') {
      // 'counter' = người chơi biết thói quen của địch và bắt bài
      const lean = s.foe.def.lean;
      let pick;
      if (STYLE === 'counter' && lean && lean !== 'read' && Math.random() < .7)
        pick = MOVES.find(m => m.beats === lean).id;
      else pick = MOVES[(Math.random() * 3) | 0].id;
      const before = s.round;
      s.play(G, pick);
      if (s.round === before) break;
    }
    const logBefore = s.log[0]?.msg;
    s.update(G, 1 / 30);
    const top = s.log[0]?.msg;
    if (top && top !== logBefore && /ĐỌ CÀNG|CLASH/.test(top)) clashes++;
    if (s.fury && !sawFury) { sawFury = true; furies++; }
  }
  if (s.over?.win) wins++;
  rounds += s.round; longest = Math.max(longest, s.round);
}
const r = (x) => Math.round(x * 10) / 10;
console.log(`${TRIALS} trận · lối đánh: ${STYLE}`);
console.log(`  thắng           : ${Math.round(wins / TRIALS * 100)}%`);
console.log(`  số hiệp trung bình: ${r(rounds / TRIALS)}  (dài nhất ${longest})`);
console.log(`  đọ càng / trận  : ${r(clashes / TRIALS)}`);
console.log(`  trận có nổi Nộ  : ${Math.round(furies / TRIALS * 100)}%`);

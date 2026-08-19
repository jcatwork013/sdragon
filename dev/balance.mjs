// Chạy:  node dev/balance.mjs [số ván] [giây nghĩ mỗi nước] [bước nhảy màn]
// Cần:   npm i --save-dev @napi-rs/canvas
// Mô phỏng người chơi trung bình → đo tỉ lệ qua màn + phân bố điểm mỗi màn.
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
globalThis.performance = { now: () => Date.now() };
globalThis.requestAnimationFrame = () => 0;

await import(new URL('../js/main.js', import.meta.url).href);
await new Promise(r => setTimeout(r, 120));
const G = globalThis.window.SDRAKON;
const { ALL_LEVELS } = await import(new URL('../js/data/levels.js', import.meta.url).href);

const TRIALS = Number(process.argv[2] || 30);
const THINK  = Number(process.argv[3] || 2.0);
const STEP   = Number(process.argv[4] || 1);
const LEVELS_TO_TEST = ALL_LEVELS.length;
G.save.breed = 'ember';
G.save.stats = { might: 0, spirit: 0, fortune: 0, breath: 0 };

console.log('Mo phong ' + TRIALS + ' van/man - nguoi choi trung binh - nghi ' + THINK + 's/nuoc');
console.log('');
console.log('Man | target | thang |  p25   p50   p75  | sao TB | gucNga/hetGio | het-luot');
console.log('----+--------+-------+-------------------+--------+---------------+---------');
const rates = [];
for (let i = 0; i < LEVELS_TO_TEST; i += STEP) {
  if (ALL_LEVELS[i].mode === 'shoot') continue;      // công cụ này chỉ đo chế độ Ghép Đá
  let wins = 0, starSum = 0, vit = 0, moves0 = 0;
  const scores = [];
  for (let k = 0; k < TRIALS; k++) {
    G.startLevel(i, true);   // bỏ qua hoạt cảnh
    const s = G.scene;
    let think = 0, frames = 0;
    while (!s.over && frames < 60 * 400) {
      if (s.board && s.board.phase === 'idle') {
        think -= 1 / 60;
        if (think <= 0) {
          const m = s.board.findMove();
          if (m) { s.attempt(G, m.a[0], m.a[1], m.b[0], m.b[1]); think = THINK; }
        }
      }
      s.update(G, 1 / 60); frames++;
    }
    scores.push(s.score);
    if (s.over && s.over.win) { wins++; starSum += s.starsEarned; }
    else if (s.hp <= 0) vit++;     // gục vì thiên địch
    else if (s.timeLeft <= 0) vit++;
    else moves0++;
  }
  scores.sort((a, b) => a - b);
  const q = f => scores[Math.min(scores.length - 1, Math.floor(scores.length * f))];
  const L = ALL_LEVELS[i], rate = wins / TRIALS;
  rates.push(rate);
  const flag = rate > .78 ? 'de ' : rate < .58 ? 'kho' : 'ok ';
  console.log(
    String(L.index).padStart(3) + ' |' + String(L.target).padStart(7) + ' |' +
    (Math.round(rate * 100) + '%').padStart(5) + flag.padStart(2) + '|' +
    String(q(.25)).padStart(6) + String(q(.5)).padStart(6) + String(q(.75)).padStart(6) + ' |' +
    (wins ? (starSum / wins).toFixed(1) : '-').padStart(7) + ' |' +
    String(vit).padStart(14) + ' |' + String(moves0).padStart(8));
}
console.log('----+--------+-------+-------------------+--------+---------------+---------');
console.log('Ti le qua man trung binh: ' + Math.round(rates.reduce((a,b)=>a+b,0)/rates.length*100) + '%  (muc tieu 62-70%)');

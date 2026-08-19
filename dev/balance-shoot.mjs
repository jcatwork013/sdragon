// Đo độ khó chế độ BẮN ĐÁ bằng máy chơi tự động.
// Chạy:  node dev/balance-shoot.mjs [số ván/màn] [độ giỏi 0..1]
//   độ giỏi 1.0 = luôn chọn góc tốt nhất · 0.5 = một nửa số phát bắn đại
import { createCanvas } from '@napi-rs/canvas';
const W = 1280, H = 720;
const real = createCanvas(W, H), rctx = real.getContext('2d');
const el = { width:W, height:H, style:{}, classList:{add(){},remove(){},contains:()=>false},
  getContext: () => rctx, addEventListener(){}, setPointerCapture(){},
  getBoundingClientRect: () => ({left:0,top:0,width:W,height:H}) };
const store = new Map();
globalThis.localStorage = { getItem:k=>store.get(k)??null, setItem:(k,v)=>store.set(k,String(v)), removeItem:k=>store.delete(k) };
globalThis.document = { getElementById:id=>id==='game'?el:{classList:{add(){},remove(){}}},
  createElement:t=>t==='canvas'?createCanvas(1,1):{}, fonts:{ready:Promise.resolve()}, addEventListener(){} };
globalThis.window = { addEventListener(){}, innerWidth:1334, innerHeight:750, devicePixelRatio:1, AudioContext:undefined };
Object.defineProperty(globalThis,'navigator',{value:{language:'vi-VN'},configurable:true});
globalThis.performance = { now: () => Date.now() };
globalThis.requestAnimationFrame = () => 0;

await import(new URL('../js/main.js', import.meta.url).href);
await new Promise(r => setTimeout(r, 140));
const G = globalThis.window.SDRAKON;
const { ALL_LEVELS } = await import(new URL('../js/data/levels.js', import.meta.url).href);

const TRIALS = Number(process.argv[2] || 20);
const SKILL  = Number(process.argv[3] || 0.75);

/**
 * Mô phỏng đường bay để đoán viên sẽ dính vào ô nào — dùng đúng hình học của
 * engine (nảy tường, dừng khi chạm viên khác), rồi chấm điểm ô đó theo số
 * hàng xóm CÙNG MÀU. Đây là cách một người chơi khá ngắm bằng mắt.
 */
function scoreAngle(b, ang, type) {
  const Rr = b.R;
  let x = b.W / 2, y = b.deathY + 54, vx = Math.cos(ang), vy = Math.sin(ang);
  for (let step = 0; step < 900; step++) {
    x += vx * 6; y += vy * 6;
    if (x < Rr) { x = Rr; vx = -vx; }
    if (x > b.W - Rr) { x = b.W - Rr; vx = -vx; }
    if (y <= Rr + b.drop) break;
    let hit = false;
    for (let r = 0; r < b.rows && !hit; r++)
      for (let c = 0; c < b.rowCols(r); c++) {
        if (!b.get(r, c)) continue;
        const dx = x - b.cx(r, c), dy = y - b.cy(r);
        if (dx * dx + dy * dy < (Rr * 1.86) ** 2) { hit = true; break; }
      }
    if (hit) break;
  }
  // tìm ô trống gần nhất có neo, đếm hàng xóm cùng màu
  let best = null, bestD = Infinity;
  for (let r = 0; r < b.rows; r++)
    for (let c = 0; c < b.rowCols(r); c++) {
      if (b.get(r, c)) continue;
      const d = (x - b.cx(r, c)) ** 2 + (y - b.cy(r)) ** 2;
      const anchored = r === 0 || b.neighbours(r, c).some(([rr, cc]) => b.get(rr, cc));
      if (anchored && d < bestD) { bestD = d; best = [r, c]; }
    }
  if (!best) return -1;
  const [r, c] = best;
  const same = b.neighbours(r, c).filter(([rr, cc]) => b.get(rr, cc)?.type === type).length;
  return same * 10 + r;                       // ưu tiên ghép được, rồi ưu tiên bắn cao
}

console.log(`Bắn Đá — ${TRIALS} ván/màn · độ giỏi ${SKILL}`);
console.log('');
console.log('Màn           màu lượt target |  thắng | điểm TB | thua vì');
console.log('--------------+----------------+--------+---------+------------------');
const rates = [];
for (let i = 0; i < ALL_LEVELS.length; i++) {
  const L = ALL_LEVELS[i];
  if (L.mode !== 'shoot') continue;
  let wins = 0, sum = 0; const why = {};
  for (let k = 0; k < TRIALS; k++) {
    G.startLevel(i, true);
    const s = G.scene;
    let frames = 0;
    while (!s.over && frames < 60 * 500) {
      if (!s.board.shot && s.shotsLeft > 0) {
        let ang;
        if (Math.random() < SKILL) {
          let bestA = -Math.PI / 2, bestS = -2;
          for (let a = -Math.PI + .25; a < -.25; a += .05) {
            const sc = scoreAngle(s.board, a, s.board.next[0]);
            if (sc > bestS) { bestS = sc; bestA = a; }
          }
          ang = bestA;
        } else ang = -Math.PI / 2 + (Math.random() - .5) * 1.7;
        s.fireAt(G, ang);
      }
      s.update(G, 1 / 60); frames++;
    }
    sum += s.score;
    if (s.over?.win) wins++; else why[s.over?.why || '?'] = (why[s.over?.why || '?'] || 0) + 1;
  }
  const rate = wins / TRIALS; rates.push(rate);
  const top = Object.entries(why).sort((a, b) => b[1] - a[1])[0];
  const flag = rate > .82 ? 'dễ ' : rate < .55 ? 'KHÓ' : 'ok ';
  console.log(
    L.id.padEnd(14) + String(L.shootColours).padStart(3) + String(L.shots).padStart(5) +
    String(L.target).padStart(7) + ' |' + (Math.round(rate * 100) + '%').padStart(6) + ' ' + flag +
    '|' + Math.round(sum / TRIALS).toLocaleString().padStart(8) + ' | ' + (top ? `${top[0]} ×${top[1]}` : '—'));
}
console.log('--------------+----------------+--------+---------+------------------');
console.log('Trung bình: ' + Math.round(rates.reduce((a, b) => a + b, 0) / rates.length * 100) + '%');

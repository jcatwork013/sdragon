// Xem riêng con rồng ở cỡ lớn để chỉnh dáng nhanh.  node dev/hero-lab.mjs
import { createCanvas } from '@napi-rs/canvas';
import fs from 'node:fs'; import path from 'node:path';
globalThis.document = { createElement: t => t === 'canvas' ? createCanvas(1, 1) : {} };
const ROOT = new URL('../js/', import.meta.url).href;
const { Cricket: Cricket } = await import(ROOT + 'game/cricket.js');
const { BREEDS, STAGES } = await import(ROOT + 'data/characters.js');

const W = 1500, H = 760;
const c = createCanvas(W, H), x = c.getContext('2d');
x.fillStyle = '#e9edf5'; x.fillRect(0, 0, W, H);
x.fillStyle = '#dfe5f0'; x.fillRect(0, H * .55, W, H);

// 1 con thật lớn để soi chi tiết
const big = new Cricket(BREEDS[0], 9800);
big.gear = { helm: "helm3", armor: "arm3", weapon: "wep3" };
for (let i = 0; i < 40; i++) big.update(1 / 60);
big.blink = 0; big.bounce = 0;
x.strokeStyle = 'rgba(0,0,0,.12)';
x.beginPath(); x.moveTo(40, 470); x.lineTo(520, 470); x.stroke();
big.draw(x, 280, 470, 330, 1);

// 5 giai đoạn
STAGES.forEach((st, i) => {
  const d = new Cricket(BREEDS[0], st.xp);
  for (let k = 0; k < 40; k++) d.update(1 / 60);
  d.blink = 0; d.bounce = 0;
  d.draw(x, 640 + i * 170, 300, 130, 1);
  x.font = 'bold 13px sans-serif'; x.fillStyle = '#333'; x.textAlign = 'center';
  x.fillText(st.name, 640 + i * 170, 360);
});
// 4 giống + trạng thái
BREEDS.forEach((b, i) => {
  const d = new Cricket(b, 9800);
  d.gear = i%2 ? { helm:"helm2", armor:"arm2", weapon:"wep2" } : {};
  if (i === 1) d.react('happy', 3); if (i === 2) d.breatheFire(3);
  for (let k = 0; k < 40; k++) d.update(1 / 60);
  d.draw(x, 660 + i * 200, 620, 155, 1);
  x.font = 'bold 13px sans-serif'; x.fillStyle = '#333'; x.textAlign = 'center';
  x.fillText(b.name + ' · ' + d.mood, 660 + i * 200, 690);
});
const out = path.join(path.dirname(new URL(import.meta.url).pathname), 'shots', 'lab.png');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, c.toBuffer('image/png'));
console.log('→ dev/shots/lab.png');

// Bảng thiên địch để soi nét vẽ.  node dev/foes.mjs
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import fs from 'node:fs'; import path from 'node:path';
const dir = path.dirname(new URL(import.meta.url).pathname);
globalThis.document = { createElement: t => t === 'canvas' ? createCanvas(1,1) : {} };
const R = new URL('../js/', import.meta.url).href;
const { Enemy, ENEMIES } = await import(R + 'game/enemy.js');
const keys = Object.keys(ENEMIES);
const W = 260 * keys.length, H = 640;
const c = createCanvas(W, H), x = c.getContext('2d');
x.fillStyle = '#efe6f7'; x.fillRect(0, 0, W, 320);
x.fillStyle = '#1c1430'; x.fillRect(0, 320, W, 320);
keys.forEach((k, i) => {
  for (const [row, yy, sz] of [[0, 190, 200], [1, 510, 200]]) {
    const e = new Enemy(k, 1);
    if (row === 1) { e.wind = 1; e.t = 0.5; }
    for (let f = 0; f < 30; f++) e.update(1/60);
    e.draw(x, 130 + i * 260, yy, sz);
  }
  x.font = 'bold 16px sans-serif'; x.fillStyle = '#333'; x.textAlign = 'center';
  x.fillText(ENEMIES[k].name, 130 + i * 260, 300);
});
fs.writeFileSync(path.join(dir, 'shots', 'foes.png'), c.toBuffer('image/png'));
console.log('ok');

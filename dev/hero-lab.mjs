// Xem riêng nhân vật ở cỡ lớn để chỉnh dáng nhanh.  node dev/hero-lab.mjs
import { createCanvas } from '@napi-rs/canvas';
import fs from 'node:fs'; import path from 'node:path';
globalThis.document = { createElement: t => t === 'canvas' ? createCanvas(1, 1) : {} };
const ROOT = new URL('../js/', import.meta.url).href;
const { Cricket } = await import(ROOT + 'game/cricket.js');
const { BREEDS, STAGES } = await import(ROOT + 'data/characters.js');

const W = 1560, H = 900;
const c = createCanvas(W, H), x = c.getContext('2d');
x.fillStyle = '#e9edf5'; x.fillRect(0, 0, W, H);
x.fillStyle = '#dfe5f0'; x.fillRect(0, H * .62, W, H);

const settle = (d, n = 40) => { for (let i = 0; i < n; i++) d.update(1 / 60); d.blink = 0; d.bounce = 0; return d; };
const cap = (s, cx, cy) => { x.font = 'bold 13px sans-serif'; x.fillStyle = '#333'; x.textAlign = 'center'; x.fillText(s, cx, cy); };

// ── 1 con thật lớn để soi chi tiết (khung 560×520, tâm 300,330) ──────────────
const big = settle(new Cricket(BREEDS[0], 9800));
big.gear = { helm: 'helm3', armor: 'arm3', weapon: 'wep3' };
x.strokeStyle = 'rgba(0,0,0,.12)';
x.beginPath(); x.moveTo(40, 470); x.lineTo(560, 470); x.stroke();
big.draw(x, 300, 400, 230, 1);
cap('cỡ lớn · full gear', 300, 545);

// ── 5 giai đoạn ─────────────────────────────────────────────────────────────
STAGES.forEach((st, i) => {
  const d = settle(new Cricket(BREEDS[0], st.xp));
  d.draw(x, 700 + i * 168, 300, 120, 1);
  cap(st.name, 700 + i * 168, 380);
});

// ── 4 giống + trạng thái ────────────────────────────────────────────────────
BREEDS.forEach((b, i) => {
  const d = new Cricket(b, 9800);
  d.gear = i % 2 ? { helm: 'helm2', armor: 'arm2', weapon: 'wep2' } : {};
  if (i === 1) d.react('happy', 3); if (i === 2) d.chirpBurst(3);
  settle(d);
  d.draw(x, 750 + i * 200, 640, 150, 1);
  cap(b.name + ' · ' + d.mood, 750 + i * 200, 730);
});

// ── quay mặt trái + biểu cảm ────────────────────────────────────────────────
['hurt', 'proud', 'eat'].forEach((m, i) => {
  const d = new Cricket(BREEDS[0], 9800); d.react(m, 3); settle(d);
  d.draw(x, 160 + i * 190, 780, 118, i === 0 ? -1 : 1);
  cap(m, 160 + i * 190, 850);
});

const out = path.join(path.dirname(new URL(import.meta.url).pathname), 'shots', 'lab.png');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, c.toBuffer('image/png'));
console.log('→ dev/shots/lab.png');

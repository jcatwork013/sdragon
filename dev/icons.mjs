// Sinh bộ icon PWA/desktop bằng chính hàm vẽ rồng của game — không dùng ảnh ngoài.
// Chạy:  node dev/icons.mjs
import { createCanvas } from '@napi-rs/canvas';
import fs from 'node:fs';
import path from 'node:path';

globalThis.document = { createElement: t => t === 'canvas' ? createCanvas(1, 1) : {} };
const ROOT = new URL('../js/', import.meta.url).href;
const { Cricket } = await import(ROOT + 'game/cricket.js');
const { BREEDS }  = await import(ROOT + 'data/characters.js');
const { buildGemSprites, drawGem } = await import(ROOT + 'game/gems.js');
buildGemSprites();

const OUT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'icons');
fs.mkdirSync(OUT, { recursive: true });

/** @param pad 0 = tràn viền (icon thường) · 0.18 = chừa lề an toàn (maskable) */
function render(size, pad = 0, round = true) {
  const c = createCanvas(size, size), x = c.getContext('2d');
  const S = size;

  // nền
  if (round) {
    const r = S * 0.22;
    x.beginPath();
    x.moveTo(r, 0); x.arcTo(S, 0, S, S, r); x.arcTo(S, S, 0, S, r);
    x.arcTo(0, S, 0, 0, r); x.arcTo(0, 0, S, 0, r); x.closePath();
    x.clip();
  }
  const bg = x.createLinearGradient(0, 0, S, S);
  bg.addColorStop(0, '#4a2a86'); bg.addColorStop(.55, '#2b1a52'); bg.addColorStop(1, '#150d2e');
  x.fillStyle = bg; x.fillRect(0, 0, S, S);
  const glow = x.createRadialGradient(S * .5, S * .42, 0, S * .5, S * .42, S * .62);
  glow.addColorStop(0, 'rgba(170,130,255,.55)'); glow.addColorStop(1, 'rgba(170,130,255,0)');
  x.fillStyle = glow; x.fillRect(0, 0, S, S);

  const inner = S * (1 - pad * 2), ox = S * pad;

  // 3 viên đá phía sau, mờ nhẹ để không tranh chấp với con rồng
  [[.17, .22, .19, 0], [.85, .19, .16, 3], [.86, .80, .15, 4]].forEach(([fx, fy, fs, g]) => {
    x.save(); x.globalAlpha = .5;
    drawGem(x, g, ox + inner * fx, ox + inner * fy, inner * fs, { t: 0.6, seed: g });
    x.restore();
  });

  // Rồng — bề ngang thật của hình là ~1,71 lần tham số kích thước (đuôi tới mõm),
  // nên 0,50 × cạnh trong là mức lớn nhất còn lọt khung mà không bị cắt.
  const d = new Cricket(BREEDS[0], 9800);
  for (let i = 0; i < 30; i++) d.update(1 / 60);
  d.blink = 0; d.bounce = 0;
  d.draw(x, ox + inner * .56, ox + inner * .58, inner * .38, 1);
  return c;
}

const jobs = [
  ['icon-192.png', 192, 0], ['icon-512.png', 512, 0],
  ['icon-maskable-192.png', 192, .16], ['icon-maskable-512.png', 512, .16],
  ['apple-touch-icon.png', 180, 0], ['icon-1024.png', 1024, 0],
  ['favicon-64.png', 64, 0],
];
for (const [name, size, pad] of jobs) {
  fs.writeFileSync(path.join(OUT, name), render(size, pad).toBuffer('image/png'));
  console.log('✓', name, size + 'px');
}

// ảnh giới thiệu cho manifest (screenshot bắt buộc trên một số store)
console.log('\nicons/ đã sẵn sàng —', jobs.length, 'file');

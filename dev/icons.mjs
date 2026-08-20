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

/**
 * ICON — CHÂN DUNG, không phải ảnh toàn thân.
 *
 * Icon bị nhìn ở cỡ 48px trên màn hình chính. Vẽ cả con dế nằm ngang thì ở cỡ
 * đó nó thành một vệt nâu, chân với râu chìa ra bốn phía rồi bị cắt cụt ở mép.
 * Nên ở đây phóng to và CẮT SÁT vào phần đầu: một con mắt to, hai cái râu, cặp
 * hàm — ba thứ đủ để nhận ra ngay cả khi thu bằng đầu ngón tay.
 *
 * @param pad 0 = tràn viền (icon thường) · 0.16 = chừa lề an toàn (maskable)
 */
function render(size, pad = 0, round = true) {
  const c = createCanvas(size, size), x = c.getContext('2d');
  const S = size;

  if (round) {
    const r = S * 0.22;
    x.beginPath();
    x.moveTo(r, 0); x.arcTo(S, 0, S, S, r); x.arcTo(S, S, 0, S, r);
    x.arcTo(0, S, 0, 0, r); x.arcTo(0, 0, S, 0, r); x.closePath();
    x.clip();
  }

  // ── NỀN: chuyển màu chéo + đèn rọi + tối bốn góc ──────────────────────
  const bg = x.createLinearGradient(0, 0, S, S);
  bg.addColorStop(0, '#5a2f9e'); bg.addColorStop(.5, '#2e1a5c'); bg.addColorStop(1, '#120a26');
  x.fillStyle = bg; x.fillRect(0, 0, S, S);

  const spot = x.createRadialGradient(S * .5, S * .44, S * .04, S * .5, S * .48, S * .70);
  spot.addColorStop(0, 'rgba(190,150,255,.62)');
  spot.addColorStop(.55, 'rgba(140,100,230,.22)');
  spot.addColorStop(1, 'rgba(140,100,230,0)');
  x.fillStyle = spot; x.fillRect(0, 0, S, S);

  // tia sáng toả sau đầu — cho khối chính có chỗ tựa
  x.save();
  x.globalCompositeOperation = 'lighter';
  x.translate(S * .5, S * .46);
  for (let i = 0; i < 14; i++) {
    x.save(); x.rotate(i / 14 * Math.PI * 2);
    const g2 = x.createLinearGradient(0, 0, S * .62, 0);
    g2.addColorStop(0, 'rgba(200,165,255,.16)'); g2.addColorStop(1, 'rgba(200,165,255,0)');
    x.fillStyle = g2;
    x.beginPath(); x.moveTo(0, 0); x.arc(0, 0, S * .62, -.10, .10); x.closePath(); x.fill();
    x.restore();
  }
  x.restore();

  const inner = S * (1 - pad * 2), ox = S * pad;

  // ── HAI VIÊN ĐÁ kèm hai bên dưới — nói ngay đây là game ghép đá ───────
  [[.15, .19, .17, 0], [.86, .80, .19, 4]].forEach(([fx, fy, fs, g]) => {
    x.save(); x.globalAlpha = .95;
    drawGem(x, g, ox + inner * fx, ox + inner * fy, inner * fs, { t: 0.6, seed: g });
    x.restore();
  });

  // ── CHÂN DUNG ────────────────────────────────────────────────────────
  // Đầu nằm ở (0.44·s, −0.25·s) so với gốc vẽ, bán kính đầu ≈ 0.315·s. Chọn s
  // sao cho đầu chiếm khoảng nửa khung, rồi dời gốc để đầu rơi đúng tâm icon.
  const d = new Cricket(BREEDS[0], 9800);
  for (let i = 0; i < 30; i++) d.update(1 / 60);
  d.blink = 0; d.bounce = 0; d.mood = 'idle';
  // Bề ngang cái đầu ≈ 0,73 × cỡ vẽ (tính cả hai mép sọ). Để 0,86 thì đầu
  // chiếm 63% khung, râu và mép sọ bị cắt cụt ở bốn phía. 0,58 là mức vừa:
  // đầu chiếm ~42% khung, còn chỗ cho râu vươn ra và thân đọc được ở bên trái.
  const hs = inner * 0.47;
  const cx = ox + inner * .52, cy = ox + inner * .49;
  x.save();
  if (round) {                                  // cắt gọn trong khung bo góc
    const r = S * 0.22;
    x.beginPath();
    x.moveTo(r, 0); x.arcTo(S, 0, S, S, r); x.arcTo(S, S, 0, S, r);
    x.arcTo(0, S, 0, 0, r); x.arcTo(0, 0, S, 0, r); x.closePath(); x.clip();
  }
  // bóng đổ mềm dưới chân dung
  x.save();
  x.globalAlpha = .35; x.fillStyle = '#000';
  x.beginPath(); x.ellipse(cx, ox + inner * .90, inner * .34, inner * .05, 0, 0, Math.PI * 2); x.fill();
  x.restore();
  d.draw(x, cx - hs * 0.44, cy + hs * 0.25, hs, 1);
  x.restore();

  // ── VIỀN TRONG + TỐI GÓC ─────────────────────────────────────────────
  const vig = x.createRadialGradient(S * .5, S * .46, S * .30, S * .5, S * .5, S * .78);
  vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(0,0,0,.45)');
  x.fillStyle = vig; x.fillRect(0, 0, S, S);

  if (round) {
    const r = S * 0.22, w = S * .035;
    x.save();
    x.beginPath();
    x.moveTo(r, w / 2); x.arcTo(S - w / 2, w / 2, S - w / 2, S, r);
    x.arcTo(S - w / 2, S - w / 2, 0, S - w / 2, r);
    x.arcTo(w / 2, S - w / 2, w / 2, 0, r); x.arcTo(w / 2, w / 2, S, w / 2, r);
    x.closePath();
    x.strokeStyle = 'rgba(255,214,110,.55)'; x.lineWidth = w * .55; x.stroke();
    x.restore();
  }
  return c;
}

const jobs = [
  ['icon-192.png', 192, 0], ['icon-512.png', 512, 0],
  ['icon-maskable-192.png', 192, .18], ['icon-maskable-512.png', 512, .18],
  ['apple-touch-icon.png', 180, 0], ['icon-1024.png', 1024, 0],
  ['favicon-64.png', 64, 0],
];
for (const [name, size, pad] of jobs) {
  fs.writeFileSync(path.join(OUT, name), render(size, pad).toBuffer('image/png'));
  console.log('✓', name, size + 'px');
}

// ảnh giới thiệu cho manifest (screenshot bắt buộc trên một số store)
console.log('\nicons/ đã sẵn sàng —', jobs.length, 'file');

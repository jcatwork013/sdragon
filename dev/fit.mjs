// Soi độ lấp đầy màn hình trên loạt máy thật.  node dev/fit.mjs
import { computeLogical, MIN_W, MAX_W } from '../js/core/layout.js';
const D = [
  ['S24 / S23 (19.5:9)',        2340, 1080],
  ['A55 / M-series (20:9)',     2400, 1080],
  ['S24 Ultra (19.3:9)',        3120, 1440],
  ['Z Flip6 mở (22:9)',         2640, 1080],
  ['Z Fold6 màn NGOÀI',         2376,  968],
  ['Z Fold5 màn NGOÀI',         2316,  904],
  ['Z Fold6 màn TRONG (mở)',    2160, 1856],
  ['Z Fold5 màn TRONG (mở)',    2176, 1812],
  ['Tab S9 (16:10)',            2560, 1600],
  ['Fold5 TRONG · cầm DỌC',     1812, 2176],
  ['Tab S9 · cầm DỌC',          1600, 2560],
  ['S24 · cầm DỌC',             1080, 2340],
  ['Màn máy tính 16:9',         1920, 1080],
  ['Siêu rộng 32:9',            3840, 1080],
];
const pct = v => (v * 100).toFixed(1).padStart(5) + '%';
console.log('thiết bị                  màn hình     tỉ lệ  dải UI    khung vẽ   lệch     lấp đầy  viền đen');
console.log('─'.repeat(100));
for (const [name, w, h] of D) {
  const a = w / h;
  const { W, H, CW, CH, ox, oy } = computeLogical(w, h);
  const s = Math.min(w / CW, h / CH);
  const rw = CW * s, rh = CH * s;
  const fill = (rw * rh) / (w * h);
  const bar = (w - rw) > 1.5 || (h - rh) > 1.5
    ? `CÒN ${Math.round(Math.max(w - rw, h - rh))}px` : 'không';
  console.log(
    `${name.padEnd(25)} ${String(w + '×' + h).padEnd(11)} ${a.toFixed(2).padStart(5)}  ` +
    `${String(W + '×' + H).padEnd(9)} ${String(CW + '×' + CH).padEnd(10)} ` +
    `${String(ox + ',' + oy).padEnd(8)} ${pct(fill)}  ${bar}`);
}
console.log(`\ndải UI kẹp trong [${MIN_W}, ${MAX_W}] · khung vẽ luôn đúng tỉ lệ máy`);

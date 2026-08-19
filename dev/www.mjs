// Gom các file web thành thư mục www/ để Capacitor đóng vào APK.
// Chạy:  npm run www
import fs from 'node:fs';
import path from 'node:path';

const root = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const out = path.join(root, 'www');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const FILES = ['index.html', 'manifest.webmanifest', 'sw.js'];
const DIRS  = ['css', 'js', 'fonts', 'icons'];

let n = 0;
for (const f of FILES) { fs.copyFileSync(path.join(root, f), path.join(out, f)); n++; }
for (const d of DIRS) {
  fs.cpSync(path.join(root, d), path.join(out, d), { recursive: true });
  n += fs.readdirSync(path.join(out, d), { recursive: true }).length;
}
// Trong APK không cần service worker (đã là app cài sẵn) — bỏ đăng ký cho nhẹ.
const idx = path.join(out, 'index.html');
fs.writeFileSync(idx, fs.readFileSync(idx, 'utf8')
  .replace(/if \('serviceWorker' in navigator[\s\S]*?\n  \}\n/, '/* service worker không dùng trong bản đóng gói */\n'));
console.log(`✓ www/ đã sẵn sàng — ${n} mục`);

// Chép APK vừa dựng vào dist/ theo đúng tên bản phát hành.
// Chạy: node dev/apk-copy.mjs        (đã gắn sẵn vào cuối `npm run apk`)
//
// Trước đây bước này làm tay, nên `npm run build:all` dựng xong lại báo
// "không thấy Cricko-X.Y.Z.apk trong dist/" — bản Android không được đối chiếu
// mã nguồn cùng bản desktop, đúng lúc cần tin bước kiểm tra nhất.
import fs from 'node:fs';
import path from 'node:path';

const root = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const src = path.join(root, 'android/app/build/outputs/apk/debug/app-debug.apk');
const dst = path.join(root, 'dist', `${pkg.build.productName}-${pkg.version}.apk`);

if (!fs.existsSync(src)) {
  console.error('✗ chưa có app-debug.apk — chạy `npm run apk` trước');
  process.exit(1);
}
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.copyFileSync(src, dst);
console.log(`✓ ${path.relative(root, dst)}  (${(fs.statSync(dst).size / 1048576).toFixed(1)} MB)`);

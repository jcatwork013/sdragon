// Đồng bộ phiên bản từ package.json ra js/core/version.js và sw.js.
// Chạy:  npm run version          (hoặc: npm run version -- 1.1.0 để đặt luôn)
import fs from 'node:fs';
import path from 'node:path';

const root = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const pkgPath = path.join(root, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

const arg = process.argv[2];
if (arg) {
  if (!/^\d+\.\d+\.\d+$/.test(arg)) { console.error('Phiên bản phải dạng X.Y.Z, ví dụ 1.1.0'); process.exit(1); }
  pkg.version = arg;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
}
const V = pkg.version;

const verFile = path.join(root, 'js/core/version.js');
fs.writeFileSync(verFile,
`// Phiên bản game — SINH TỰ ĐỘNG, đừng sửa tay.
// Nguồn duy nhất là trường "version" trong package.json.
// Chạy \`npm run version\` để đồng bộ file này và tên cache trong sw.js.
export const VERSION = '${V}';
`);

// Đổi tên cache của service worker → người chơi cũ nhận bản mới thay vì bản cache
const swPath = path.join(root, 'sw.js');
let sw = fs.readFileSync(swPath, 'utf8');
sw = sw.replace(/const CACHE = 'sdrakon-v[^']*';/, `const CACHE = 'sdrakon-v${V}';`);
fs.writeFileSync(swPath, sw);

// ── Sinh lại danh sách cache offline từ CÂY THƯ MỤC THẬT ──────────────────
// Viết tay danh sách này là nguồn lỗi kinh điển: thêm file mới mà quên thêm vào
// đây thì bản cài offline sẽ vỡ đúng ở màn dùng file đó.
const walk = (dir, base) => fs.readdirSync(path.join(root, dir), { withFileTypes: true })
  .flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name), base)
                                : (e.name.endsWith(base) ? [path.join(dir, e.name)] : []));
const shell = [
  './', './index.html', './manifest.webmanifest',
  ...walk('css', '.css'),
  ...walk('js', '.js'),
  ...walk('fonts', '.ttf'),
  './icons/icon-192.png', './icons/icon-512.png',
  './icons/apple-touch-icon.png', './icons/favicon-64.png',
].map(f => f.startsWith('./') ? f : './' + f);

sw = sw.replace(/const SHELL = \[[\s\S]*?\n\];/,
  'const SHELL = [\n' + shell.map(f => `  '${f}',`).join('\n') + '\n];');
fs.writeFileSync(swPath, sw);

// ── Bảng tải về trong README ────────────────────────────────────────────
// Sửa tay chỗ này là kiểu gì cũng có lần quên, rồi README chỉ sang file không
// tồn tại. Thay mọi số phiên bản trong TÊN FILE, không cần biết bản trước là mấy.
const readme = path.join(root, 'README.md');
if (fs.existsSync(readme)) {
  const before = fs.readFileSync(readme, 'utf8');
  const after = before.replace(/(SDrakon[ -](?:Setup )?)\d+\.\d+\.\d+/g, `$1${V}`);
  if (after !== before) { fs.writeFileSync(readme, after); console.log('  · README.md → tên file bản ' + V); }
}

// ── Đồng bộ phiên bản sang dự án Android (nếu đã tạo) ────────────────────
const gradle = path.join(root, 'android/app/build.gradle');
if (fs.existsSync(gradle)) {
  const [maj, min, pat] = V.split('.').map(Number);
  const code = maj * 10000 + min * 100 + pat;      // 1.0.0 → 10000
  let g = fs.readFileSync(gradle, 'utf8');
  g = g.replace(/versionCode \d+/, `versionCode ${code}`)
       .replace(/versionName "[^"]*"/, `versionName "${V}"`);
  fs.writeFileSync(gradle, g);
  console.log(`  · android/app/build.gradle → versionName ${V}, versionCode ${code}`);
}

console.log(`✓ phiên bản ${V}`);
console.log('  · package.json');
console.log('  · js/core/version.js');
console.log("  · sw.js  → cache 'sdrakon-v" + V + "', " + shell.length + ' file offline');

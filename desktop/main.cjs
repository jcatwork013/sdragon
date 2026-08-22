// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  Vỏ desktop (Windows · macOS · Linux) cho CRICKO.                        ║
// ║                                                                          ║
// ║  Game được phục vụ qua scheme riêng `app://` thay vì file:// — nhờ vậy    ║
// ║  ES modules, localStorage và service worker đều hoạt động bình thường     ║
// ║  mà KHÔNG phải tắt webSecurity.                                          ║
// ╚══════════════════════════════════════════════════════════════════════════╝
const { app, BrowserWindow, protocol, Menu, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

// Kiểu MIME cho scheme app://. Bắt buộc phải đúng: trình duyệt từ chối
// nạp ES module nếu content-type không phải text/javascript.
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.mjs':  'text/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.ttf': 'font/ttf', '.otf': 'font/otf', '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

const ROOT = path.join(__dirname, '..');          // thư mục gốc chứa index.html
const DEV = !app.isPackaged;

protocol.registerSchemesAsPrivileged([{
  scheme: 'app',
  privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true },
}]);

function createWindow() {
  const win = new BrowserWindow({
    width: 1320, height: 800,
    minWidth: 900, minHeight: 560,
    backgroundColor: '#0b0716',
    title: 'CRICKO — Miền Cỏ Cháy',
    icon: process.platform === 'linux' ? path.join(ROOT, 'icons/icon-512.png') : undefined,
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: true,      // mất focus thì tiết lưu → đỡ nóng máy
    },
  });

  win.once('ready-to-show', () => win.show());
  // Lưới an toàn: nếu vì lý do gì ready-to-show không kích hoạt, vẫn hiện cửa sổ
  // thay vì để người chơi nhìn màn hình trống.
  setTimeout(() => { if (!win.isDestroyed() && !win.isVisible()) win.show(); }, 4000);
  win.webContents.on('did-fail-load', (_e, code, desc, url) =>
    console.error('[Cricko] không nạp được', url, code, desc));

  win.loadURL('app://cricko/index.html');

  // Mọi liên kết ra ngoài mở bằng trình duyệt hệ thống, không mở cửa sổ Electron mới
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });

  win.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
    if (DEV && input.key === 'F12') { win.webContents.toggleDevTools(); e.preventDefault(); }
  });
  return win;
}

app.whenReady().then(() => {
  protocol.handle('app', async (request) => {
    const url = new URL(request.url);
    let rel = decodeURIComponent(url.pathname);
    if (rel === '/' || rel === '') rel = '/index.html';
    const file = path.normalize(path.join(ROOT, rel));
    // chặn đi ngược ra ngoài thư mục game
    if (!file.startsWith(ROOT)) return new Response('Forbidden', { status: 403 });
    try {
      // Đọc bằng fs chứ KHÔNG dùng net.fetch(file://): chỉ fs mới nhìn được
      // vào bên trong app.asar của bản đóng gói.
      const data = await fs.promises.readFile(file);
      return new Response(data, {
        headers: { 'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' },
      });
    } catch (err) {
      console.error('[Cricko] thiếu file', rel, err.code);
      return new Response('Not found', { status: 404 });
    }
  });

  if (!DEV) Menu.setApplicationMenu(null);
  createWindow();

  app.on('activate', () => {                       // macOS: bấm icon dock khi không còn cửa sổ
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

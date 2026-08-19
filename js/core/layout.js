// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  KHUNG LOGIC CO GIÃN — chạy đẹp trên nhiều tỉ lệ màn hình.               ║
// ║                                                                          ║
// ║  Cách làm: GIỮ CHIỀU CAO cố định 720 (nhờ vậy mọi cỡ chữ, chiều cao ô,    ║
// ║  thanh HUD… giữ nguyên) và cho CHIỀU NGANG co giãn theo tỉ lệ thiết bị.   ║
// ║  Máy càng dài ngang thì càng thấy rộng hai bên, không bị viền đen to.     ║
// ║                                                                          ║
// ║    iPad 4:3        → 1000 × 720                                          ║
// ║    Máy gập mở      → ~1040 × 720                                         ║
// ║    Điện thoại 16:9 → 1280 × 720                                          ║
// ║    Samsung 20:9    → 1600 × 720                                          ║
// ║    Siêu rộng 21:9  → 1700 × 720 (chặn trần)                              ║
// ╚══════════════════════════════════════════════════════════════════════════╝

export const BASE_H = 720;
export const MIN_W = 1000;
export const MAX_W = 1700;

/** Tính khung logic từ kích thước cửa sổ thật. */
export function computeLogical(winW, winH) {
  const aspect = Math.max(0.5, (winW || 1280) / (winH || 720));
  const W = Math.round(Math.min(MAX_W, Math.max(MIN_W, BASE_H * aspect)));
  return { W, H: BASE_H };
}

/**
 * Bố cục màn chơi, xếp theo "dòng chảy" từ trái sang phải rồi căn giữa:
 *
 *   RỘNG  (≥1240):  [thẻ nhân vật] [dải kỹ năng] [bàn cờ] [bảng HUD]
 *   HẸP   (<1240):                 [dải kỹ năng] [bàn cờ] [bảng HUD]
 *
 * Màn hẹp (iPad 4:3, máy gập mở) bỏ thẻ nhân vật vì không đủ chỗ — ảnh nhân
 * vật được đưa vào đầu bảng HUD thay thế, không mất thông tin nào.
 */
export function playLayout(W, boardW, boardH) {
  const compact = W < 1240;
  const CARD_W = 250, STRIP_W = 78;
  const HUD_W = compact ? 286 : 306;
  const G1 = 18, G2 = 14, G3 = 18;                 // các khoảng hở

  const total = (compact ? 0 : CARD_W + G1) + STRIP_W + G2 + boardW + G3 + HUD_W;
  const margin = Math.max(16, Math.round((W - total) / 2));

  let x = margin;
  const cardX = compact ? -9999 : x;               // đẩy ra ngoài màn khi không dùng
  if (!compact) x += CARD_W + G1;
  const stripX = x; x += STRIP_W + G2;
  const boardX = x; x += boardW + G3;
  const hudX = x;

  return { compact, boardX, boardW, boardH, cardX, cardW: CARD_W, stripX, stripW: STRIP_W, hudX, hudW: HUD_W };
}

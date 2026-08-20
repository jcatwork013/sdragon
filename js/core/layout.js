// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  KHUNG LOGIC CO GIÃN — lấp đầy MỌI tỉ lệ màn hình, không viền đen.       ║
// ║                                                                          ║
// ║  Hai khung lồng nhau:                                                    ║
// ║                                                                          ║
// ║    KHUNG VẼ  (CW × CH)  đúng bằng tỉ lệ máy → canvas phủ kín màn hình.   ║
// ║    DẢI GIAO DIỆN (W × 720) nằm giữa khung vẽ → mọi scene vẫn dựng bố cục ║
// ║    trên nền cao 720 như cũ, không phải sửa toạ độ ở đâu hết.             ║
// ║                                                                          ║
// ║  Phần khung vẽ thừa ra hai bên (hoặc trên–dưới) được NỀN PARALLAX phủ    ║
// ║  kín, nên người chơi thấy tranh nền tràn viền chứ không thấy dải đen.    ║
// ║                                                                          ║
// ║    iPad 4:3        → dải 1000×720 · khung 1000×750                        ║
// ║    Máy gập MỞ 1.16 → dải 1000×720 · khung 1000×862   (nền phủ trên–dưới) ║
// ║    Điện thoại 16:9 → dải 1280×720 · khung 1280×720   (vừa khít)          ║
// ║    Samsung 20:9    → dải 1600×720 · khung 1600×720   (vừa khít)          ║
// ║    Fold màn ngoài  → dải 1700×720 · khung 1844×720   (nền phủ hai bên)   ║
// ║    Dọc 9:20        → dải 1000×720 · khung 1000×2222  (nền phủ trên–dưới) ║
// ╚══════════════════════════════════════════════════════════════════════════╝

export const BASE_H = 720;
export const MIN_W = 1000;     // hẹp hơn nữa thì bàn cờ + bảng HUD không đủ chỗ
export const MAX_W = 1700;     // rộng hơn nữa thì hai mép xa nhau quá, khó liếc

/**
 * @param winW,winH  cỡ cửa sổ thật
 * @param safe       lề an toàn (tai thỏ / lỗ camera), đơn vị điểm ảnh CSS
 * @param cssPerUnit số điểm ảnh CSS trên 1 đơn vị logic — dùng quy đổi `safe`.
 *                   Bỏ trống thì coi như không có lề an toàn.
 */
export function computeLogical(winW, winH, safe = null, cssPerUnit = 0) {
  const aspect = Math.min(6, Math.max(0.25, (winW || 1280) / (winH || 720)));
  const H = BASE_H;

  // Lề an toàn quy về đơn vị logic. Không quy đổi được thì bỏ qua — thà tràn
  // viền còn hơn thụt vào một khoảng bịa ra.
  const k = cssPerUnit > 0.01 ? 1 / cssPerUnit : 0;
  const sL = safe ? safe.l * k : 0, sR = safe ? safe.r * k : 0;
  const sT = safe ? safe.t * k : 0, sB = safe ? safe.b * k : 0;

  // Dải giao diện: co theo tỉ lệ máy, trừ đi lề an toàn ngang.
  const W = Math.round(Math.min(MAX_W, Math.max(MIN_W, H * aspect - sL - sR)));

  // Khung vẽ: luôn đúng tỉ lệ máy, và luôn đủ chứa dải giao diện.
  let CW = Math.round(H * aspect), CH = H;
  if (CW < W) { CW = W; CH = Math.round(W / aspect); }
  if (CH < H) { CH = H; CW = Math.round(H * aspect); }

  // Đặt dải vào giữa phần CÒN LẠI sau khi chừa lề an toàn → tai thỏ không đè
  // lên giao diện, mà tranh nền vẫn tràn ra tận mép máy.
  const ox = Math.round(sL + Math.max(0, (CW - W - sL - sR) / 2));
  const oy = Math.round(sT + Math.max(0, (CH - H - sT - sB) / 2));

  return { W, H, CW, CH, ox, oy };
}

/**
 * Hộp phủ kín KHUNG VẼ, quy về toạ độ dải giao diện.
 *
 * Bất cứ thứ gì phải kín màn hình — tranh nền, lớp phủ mờ, vignette, màn tối
 * chuyển cảnh — đều phải tô theo hộp này. Tô `(0, 0, W, H)` thì chỉ kín DẢI,
 * còn phần khung vẽ thừa ra sẽ trơ nền đen. Dùng kèm toán tử trải:
 *
 *     ctx.fillRect(...bleed(G));
 */
export const bleed = (G) => [-(G.OX || 0), -(G.OY || 0), G.CW || G.W, G.CH || G.H];

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

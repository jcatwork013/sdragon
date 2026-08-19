# SDrakon — Proto-Dragon Realm · Roadmap

> Match-3 nuôi rồng. Motif "chơi màn theo bản đồ, mỗi tuần mở cửa mới" —
> nhưng **toàn bộ tài sản là nguyên gốc** (xem §5 An toàn bản quyền).

---

## 1. Vòng lặp cốt lõi

```
Chọn trứng  →  Ấp nở  →  Bản đồ màn  →  Match-3  →  Thưởng (Vàng / EXP / Thức ăn)
      ↑                                                          │
      └──────────  Tổ rồng: Cho ăn · Huấn luyện · Tiến hóa  ◄────┘
```

Rồng **không phải vật trang trí** — chỉ số rồng đổi luật chơi:

| Chỉ số | Train bằng | Ảnh hưởng trong màn |
|---|---|---|
| **Sức mạnh** (Might) | Vàng | Nổ gem đặc biệt lan rộng hơn |
| **Ý chí** (Spirit) | Thức ăn | Thanh Sinh lực tụt chậm hơn |
| **May mắn** (Fortune) | Vàng + EXP | Tỉ lệ rơi gem đặc biệt cao hơn |
| **Hơi lửa** (Breath) | Nhiệm vụ | Kỹ năng "Phun lửa" xóa 1 hàng, hồi theo combo |

5 giai đoạn tiến hóa: `Trứng → Rồng con → Rồng nhỡ → Rồng trưởng thành → Cổ Long`.
Mỗi giai đoạn đổi **hình dáng, sải cánh, số sừng, hiệu ứng lửa** — vẽ bằng code nên thêm giai đoạn = thêm data.

---

## 2. Lịch phát hành theo tuần

Mỗi **Episode = 15 màn**, ra **1 episode/tuần**. Thêm episode chỉ cần push 1 object vào `js/data/levels.js` — không đụng engine.

| Tuần | Ver | Episode | Màn | Cơ chế mới | Nội dung rồng |
|---|---|---|---|---|---|
| — | **0.9** | *(bản hiện tại)* | 1–20 | Gem đặc biệt, Sinh lực real-time | 4 giống trứng, 5 giai đoạn |
| W1 | 1.0 | **Nứt Vỏ** — Shellbreak | 1–15 | Tutorial, mục tiêu điểm | Nở trứng, cốt truyện mở |
| W2 | 1.1 | **Đồng Cỏ Tro** — Ashmeadow | 16–30 | Ô băng (phá 2 lần) | Train Sức mạnh |
| W3 | 1.2 | **Hang Thạch Anh** — Quartz Hollow | 31–45 | Đá chặn không rơi | Skin vảy thạch anh |
| W4 | 1.3 | **Đầm Rêu** — Mirebog | 46–60 | Dây leo lan mỗi lượt | Pet phụ: Đom đóm |
| W5 | 1.4 | **Đỉnh Gió** — Windspire | 61–75 | Gió đẩy lệch cột | Kỹ năng lượn |
| W6 | 1.5 | **Lò Than** — Emberforge | 76–90 | Dung nham đếm ngược | Tiến hóa Cổ Long |
| W7 | 1.6 | **Băng Nguyên** — Frostreach | 91–105 | Đóng băng gem đặc biệt | Giống trứng thứ 5 |
| W8 | 1.7 | **Vương Miện Cổ** — Elder Crown | 106–120 | **Boss**: Long Vương 3 pha | Kết chương 1 |

**Live-ops xen kẽ:** Trứng hằng ngày (W2+) · Giải đấu cuối tuần (W4+) · Sự kiện Trăng Rồng (W6+).

---

## 3. Backlog kỹ thuật

- [x] Engine match-3: cascade, combo, phát hiện hết nước đi, xáo bài
- [x] Gem đặc biệt: Thương Lửa (4) · Thập Long (L/T) · Trứng Lăng Kính (5)
- [x] **Chế độ thứ hai: Bắn Đá** (lưới lục giác, nảy tường, cụm rơi) — cứ 4 màn có 1
- [x] **Đồng hồ đếm ngược** — hết giờ là thua, phải chơi lại
- [x] **Vật phẩm bất ngờ** trên viên đá: đồng hồ +5s · túi vàng · ngôi sao điểm
- [x] 4 loài côn trùng (dế · muỗm · châu chấu · cào cào) khác nhau về râu/bụng/càng
- [x] Tối ưu hiệu năng: khoá 60fps, nướng lớp nền tĩnh, cache panel, tự hạ chất lượng
- [x] **Cốt truyện gốc "Mùa Cỏ Cháy"** 7 hồi + hoạt cảnh vẽ bằng code
- [x] **7 bản nhạc** đổi theo cảm xúc từng hồi
- [x] **Thiên địch + chiến đấu**: 5 loài, 5 kiểu ra đòn, máu người chơi
- [x] **Chế tài**: thua mất vàng/EXP, đi sai mất lượt, bỏ sót địch mất sao
- [x] Nút thoát màn + hiệu ứng kỹ năng hoành tráng (búa giáng · lửa quét · lốc xoáy)
- [x] **Tỉ thí kéo–búa–bao** với thế lực hắc ám, ghép cặp cân sức ±12%
- [x] **Chế tạo & trang bị**: 6 nguyên liệu · 9 công thức · 3 ô đồ, mặc lên thấy trên hình
- [x] **Bản đồ lớn 10 mảnh** — mảnh 1 mở (45 màn), 9 mảnh sau để ???
- [x] **Chạm vào dế** là nó la làng và giỡn lại (9 câu thoại)
- [x] **10 bản nhạc**, mỗi màn một bài + đổi theo tình huống; bản đồ dùng hành khúc
- [x] **Scale đa thiết bị**: khung logic co theo tỉ lệ (1000–1700 × 720), màn hẹp tự
      chuyển bố cục gọn — chạy đẹp từ iPad 4:3 tới Samsung 20:9
- [x] Sửa vùng nổ: Thương Lửa đúng MỘT hàng/cột, chặn phản ứng dây chuyền quá 2 tầng
- [x] Chiptune 8-bit 4 kênh + sequencer lookahead + SFX tổng hợp
- [x] Nền parallax, particle, screen-shake, số điểm bay
- [x] Chọn trứng · Tổ rồng · Bản đồ màn
- [x] Lưu tiến trình `localStorage` có đánh phiên bản
- [x] Song ngữ VI/EN + font có dấu tiếng Việt (OFL)
- [x] Công cụ mô phỏng cân bằng + chụp ảnh màn hình ngoài trình duyệt
- [ ] Ô chặn (băng / đá / dây leo) — mở đường cho W2–W4
- [ ] Boss AI 3 pha
- [ ] Cân bằng sâu hơn: nâng mô phỏng lên 10k ván/màn + người chơi "giỏi" (chọn nước tối ưu)
- [ ] Port Unity: logic thuần trong `js/game/board.js` map 1-1 sang C#

---

## 4. Cân bằng — số liệu đo được

Chạy `npm run balance` (mô phỏng người chơi tự động trên chính engine thật):

| | Kết quả hiện tại |
|---|---|
| Màn làm quen (1–4 mỗi chương) | 83–97% qua màn |
| Màn giữa/cuối mỗi chương | **63–73%** ← vùng mục tiêu |
| Số sao trung bình mỗi lần thắng | 1,1 – 1,9 / 3 (3 sao thật sự hiếm) |
| Chết vì Sinh lực, nhịp 1,4–2,4 s/nước | 0% ở cả 3 chương |
| Chết vì Sinh lực, nhịp 4,0 s/nước | 0% (Ch.1) · 58% (Ch.2 cuối) · 88% (Ch.3) |

Mọi hằng số trong `js/data/levels.js` đều dẫn xuất từ bảng này, không đặt bằng cảm tính.

**Còn cần theo dõi khi phát hành:** Retention D1/D7 · số lượt train rồng mỗi phiên ·
màn khiến người chơi bỏ · tỉ lệ dùng kỹ năng Hơi lửa.

---

## 5. An toàn bản quyền  ⚠️ ĐỌC KỸ

Nguyên tắc: **không import bất kỳ tài sản nào của bên thứ ba**, và **không dùng
tên/nhân vật của tác phẩm đang được bảo hộ**.

| Hạng mục | Cách làm | Rủi ro |
|---|---|---|
| Nhân vật, đá quý, nền, UI | Vẽ 100% bằng Canvas 2D trong repo này | Không |
| Nhạc + SFX | Tự soạn, tổng hợp thời gian thực bằng Web Audio | Không |
| Font | Baloo 2 · Be Vietnam Pro · Bungee — giấy phép OFL, kèm `fonts/OFL-*.txt` | Không |
| Tên nhân vật | **Rơm · Sương · Lá · Mực** — tự đặt, không trùng tác phẩm nào | Không |
| Tên loài | Dế · Muỗm · Châu chấu · Cào cào — danh từ chung | Không |
| Luật chơi | Match-3 và bắn bóng là **ý tưởng**, không được bảo hộ bản quyền | Thấp |

### Hai thứ ĐÃ CHỦ ĐỘNG TRÁNH

**1. Truyện "Dế Mèn phiêu lưu ký" — Tô Hoài (1941).**
Việt Nam bảo hộ suốt đời tác giả + 50 năm → tới khoảng **2064**. Vì vậy game
**không dùng** tên Dế Mèn, Dế Trũi, Dế Choắt… làm tên nhân vật, không dùng
tên truyện, không kể lại cốt truyện. Chỉ giữ *thể loại*: côn trùng đồng quê đi
phiêu lưu — thể loại thì không ai độc quyền được.

**2. Phim hoạt hình về dế (2025).**
Thiết kế nhân vật của phim đang có bản quyền. Nhân vật của game khác ở:
dựng **vector phẳng vẽ bằng code** thay vì 3D CG · **dáng nghiêng, giải phẫu
côn trùng thật** thay vì dáng chính diện kiểu người · **đai cói đan xanh ngọc
vắt chéo ngực** thay vì khăn len đỏ quấn cổ · bảng màu và tên hoàn toàn khác.

### Nếu muốn đổi tên nhân vật
Sửa duy nhất `js/data/characters.js` — engine không phụ thuộc tên.

### Tránh tuyệt đối
Tên/logo/nhân vật/màu-thương-hiệu của game hay phim khác · sao chép nguyên cụm
giao diện đặc trưng · dùng key-art trong file Figma (chưa rõ license) vào bản build.
Ảnh key-art đó **chỉ dùng làm mood-board**.

# SDrakon — Proto-Dragon Realm

> **Truyện gốc “Mùa Cỏ Cháy” — 7 hồi, có nhân vật, có mất mát, có bài học.**
> Nhạc và bảng màu tự đổi theo cảm xúc từng hồi: vui · buồn · cao trào · gấp rút.

**Hai chế độ chơi trong một game.** Chọn trứng → ấp nở → đi bản đồ → **Ghép Đá** (match-3) xen kẽ **Bắn Đá** (bắn viên vào lưới lục giác) → nuôi và huấn luyện chú côn trùng của bạn.
Chạy bằng **HTML5 Canvas + Web Audio**, **không dùng thư viện ngoài, không dùng file ảnh hay file nhạc nào**.

<p align="center"><em>Toàn bộ đồ hoạ vẽ bằng code · toàn bộ âm thanh tổng hợp thời gian thực</em></p>

---

## Tải về chơi ngay

| File trong `dist/` | Nền tảng |
|---|---|
| `SDrakon-1.2.0.apk` | **Android 7+** — chép vào máy, bật "cài từ nguồn không xác định" |
| `SDrakon Setup 1.2.0.exe` | **Windows** — bộ cài |
| `SDrakon 1.2.0.exe` | **Windows** — bản portable, chạy thẳng |
| `SDrakon-1.2.0-arm64.dmg` | **macOS** Apple Silicon |
| `SDrakon-1.2.0.dmg` | **macOS** Intel |

Dựng lại: `npm run apk` (Android) · `npm run build:mac` · `npm run build:win`.
Đổi phiên bản: `npm run version -- 1.1.0` (tự đồng bộ package.json · sw.js · Android).

## Chạy thử

```bash
cd sdrakon
npm start                 # hoặc:  python3 -m http.server 8080
# mở http://localhost:8080
```

> Cần chạy qua HTTP server (game dùng ES modules — mở thẳng file:// sẽ bị chặn CORS).

**Điều khiển:** chạm/kéo để đổi chỗ 2 viên kề nhau · `Esc`/`P` tạm dừng · `M` tắt tiếng · `L` đổi ngôn ngữ.

---

## Có gì bên trong

| Hệ thống | Chi tiết |
|---|---|
| **2 chế độ** | **Ghép Đá** (match-3) và **Bắn Đá** (bắn bóng lưới lục giác) xen kẽ — cứ 4 màn có 1 màn Bắn Đá |
| **Đồng hồ** | Đếm ngược liên tục; hết giờ là thua và phải chơi lại. Nhặt huy hiệu ĐỒNG HỒ để +5 giây |
| **Vật phẩm** | Viên đá có thể mang huy hiệu: đồng hồ (+giờ) · túi vàng (+vàng) · ngôi sao (+điểm) |
| **Cốt truyện** | 7 hồi, hoạt cảnh vẽ bằng code, chữ hiện dần; mỗi hồi đổi nhạc + bảng màu |
| **Thiên địch** | Kiến Lính · Nhện Cỏ · Ong Vò Vẽ · Bọ Ngựa · Cóc Già (trùm). Có máu, có đồng hồ ra đòn riêng: cắn · cướp vàng · giăng tơ khoá ô · hút giờ |
| **Chế tài** | Thua thì **mất 15% vàng và 120 EXP**. Đi sai nước **vẫn mất 1 lượt**. Bỏ sót thiên địch → chỉ 1 sao, mất 25% vàng |
| **Match-3** | Cascade nhiều tầng, hệ số liên hoàn, tự phát hiện hết nước đi rồi xáo bài, gợi ý sau 4,5 giây đứng yên |
| **Gem đặc biệt** | Thương Lửa (4 viên) · Thập Long (hình L/T) · Trứng Lăng Kính (5 viên) — có cả combo khi hoán đổi 2 gem đặc biệt với nhau |
| **6 họ đá quý** | Khác **cả màu lẫn hình dáng** (tròn, thoi, giọt, lục giác, chữ nhật vát, tam giác) → người mù màu vẫn chơi được |
| **Tỉ thí** | Đấu tay đôi **kéo–búa–bao** với thế lực hắc ám. Đối thủ luôn được **ghép cân sức** (±12% lực của bạn) nên thắng thua do đọc bài, không do chỉ số |
| **Chế tạo** | Nhặt 6 loại nguyên liệu → chế 9 món đồ → **mặc lên người** (thấy được trên hình): mũ · giáp · vũ khí. Full T3 tăng lực chiến ~60% |
| **Tương tác truyện** | Nhân vật nói chuyện ngay trong ván theo sự kiện thật; Hồi VI có **lựa chọn thật** (đánh hay kể thật) đổi phần thưởng, độ khó màn trùm và câu kết |
| **Đa thiết bị** | Khung logic co theo tỉ lệ màn hình (1000–1700 × 720). Màn hẹp (iPad 4:3, máy gập) tự chuyển bố cục gọn. Đã kiểm chứng: iPad · iPhone 16:9 · Galaxy 20:9 · laptop 16:10 |
| **Bản đồ lớn** | 10 mảnh — mảnh 1 đang mở (3 chương, 45 màn), 9 mảnh sau hiện dấu **???** |
| **Nhân vật** | 4 loài (dế · muỗm · châu chấu · cào cào) khác nhau râu/bụng/càng · 5 giai đoạn lớn lên · thở, chớp mắt, ngáp, chùi râu, nhún nhảy, gáy — vẽ bằng path, không sprite |
| **Nhạc 8-bit** | 7 bản gốc (mở đầu · vui · ấm · hùng tráng · buồn · cao trào · gấp rút) trên bộ tổng hợp kiểu NES: 2 kênh pulse + triangle + noise (LFSR), sequencer lookahead 120 ms |
| **SFX** | 19 hiệu ứng tổng hợp tại chỗ — cao độ đổi theo bậc cascade |
| **2 ngôn ngữ** | Tiếng Việt / English, tự nhận theo trình duyệt, đổi được trong game, nhớ lựa chọn |
| **Hiệu ứng** | Mảnh vỡ, tia nổ hàng/cột, sóng xung kích, số điểm bay, rung màn |
| **Hiệu năng** | Khoá 60 fps (màn 120Hz không còn vẽ gấp đôi), nướng lớp nền tĩnh, cache panel, tự hạ chất lượng khi máy yếu. Bấm **F** để xem đồng hồ fps |
| **Nền** | Parallax 6 lớp: trời · núi tuyết · đồi · cây · cỏ đung đưa · phấn hoa, đổi tông theo chương |

---

## Cấu trúc

```
sdrakon/
├─ index.html · css/style.css
├─ js/
│  ├─ main.js              điều phối màn, vòng lặp, nhập liệu, co giãn DPR
│  ├─ core/    util · i18n · state (lưu localStorage có đánh phiên bản)
│  ├─ audio/   chiptune.js (bộ tổng hợp)  ·  songs.js (bản nhạc dạng text)
│  ├─ data/    characters.js · levels.js · story.js  ← thêm nội dung chỉ sửa ở đây
│  ├─ game/    board.js (match-3) · bubble.js (bắn đá) · enemy.js · gems · cricket · fx
│  ├─ render/  background.js
│  ├─ ui/      widgets.js (panel, thanh chỉ số, nút, 15 icon vẽ tay)
│  └─ scenes/  title · egg · map · nest · play · shoot · story · help
└─ dev/        công cụ kiểm thử (xem dưới)
```

`js/game/board.js` và `js/game/bubble.js` là **logic thuần, không đụng UI** — đây là file map 1-1 sang C# nếu sau này dựng bản Unity.

---

## Công cụ kiểm thử

```bash
npm run shots      # chụp cả 9 trạng thái màn hình ngoài trình duyệt + bắt lỗi runtime
npm run balance    # mô phỏng người chơi tự động, in tỉ lệ qua màn từng level
```

`dev/balance-shoot.mjs` làm điều tương tự cho chế độ **Bắn Đá**: máy chơi quét 60 góc
bắn, mô phỏng đường bay rồi chấm điểm ô sẽ dính. Nhờ nó mà phát hiện hai lỗi cân bằng
thật: (1) màn càng dài thì càng nhiều lần tụt trần → đổi sang **cố định SỐ LẦN tụt**;
(2) nhảy từ 4 lên 5 màu làm tỉ lệ qua màn tụt từ ~70% xuống ~10% → **giữ nguyên 4 màu**.
Kết quả: 71% cho người chơi trung bình, 98% cho người chơi khá.

`dev/balance.mjs` chạy **chính engine thật** với một người chơi tự động (chọn nước đi hợp lệ,
nghĩ N giây mỗi nước). Các hằng số cân bằng trong `js/data/levels.js` **lấy từ đầu ra của công cụ này**,
không phải ước lượng bằng cảm tính:

| Đo được | Giá trị |
|---|---|
| Điểm trung vị mỗi lượt (bàn 5 màu) | ≈ 250 |
| Điểm trung vị mỗi lượt (bàn 6 màu) | ≈ 200 |
| Tỉ lệ target/điểm-trung-vị 0,75 | ≈ 90% qua màn |
| Tỉ lệ target/điểm-trung-vị 0,86 | ≈ 68% qua màn |

Kết quả hiện tại (sau khi thêm thiên địch): **90% ở màn làm quen → 55–75% ở chương cuối**,
trung bình **79%**. 3 sao thật sự hiếm (trung bình 1,3–2,3 sao mỗi lần thắng).
Sát thương và máu của thiên địch được ép vào một *ngân sách theo màn* nên không đội hình
ngẫu nhiên nào biến một màn thành bất khả thi.

### Thanh Thời gian

Đồng hồ chạy liên tục, hết giờ là thua và **phải chơi lại màn**. Nhặt huy hiệu
ĐỒNG HỒ trên viên đá để +5 giây. Đòn hút giờ của Cóc Già lấy đi 4 giây mỗi lần.

---

## Bản quyền

Không import bất kỳ tài sản nào của bên thứ ba. Đồ hoạ vẽ bằng Canvas trong repo này,
nhạc tự soạn và tổng hợp thời gian thực, font đóng gói sẵn trong `fonts/` kèm giấy phép OFL.

Tên nhân vật (**Rơm · Sương · Lá · Mực**) là tự đặt — **không** dùng tên nhân vật của
truyện *Dế Mèn phiêu lưu ký* (Tô Hoài, còn bản quyền tới ~2064) lẫn thiết kế của bộ phim
hoạt hình về dế năm 2025. Đọc kỹ [ROADMAP.md §5](ROADMAP.md) trước khi phát hành thương mại.

---

## Kế hoạch

Mỗi tuần một chương mới 15 màn — xem [ROADMAP.md](ROADMAP.md).
Thêm chương = thêm một object vào `js/data/levels.js`, engine không phải sửa dòng nào.

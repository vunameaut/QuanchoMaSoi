# 🐺 Quản Trò Ma Sói - Werewolf Game Master SPA

Ứng dụng Web Single Page Application (SPA) thông minh đóng vai trò là **Quản trò ảo tự động 100%** cho các nhóm bạn chơi Ma Sói bằng bài thật (offline) ngoài đời, giúp **tất cả mọi người đều được tham gia làm người chơi mà không cần ai phải hy sinh làm Quản trò**.

![Werewolf Game Master](https://img.shields.io/badge/Language-HTML5%20%7C%20CSS3%20%7C%20JavaScript%20ES6-crimson)
![Audio](https://img.shields.io/badge/Audio-Web%20Speech%20API%20%2B%20Web%20Audio%20API-purple)
![License](https://img.shields.io/badge/License-MIT-blue)

---

## 🌟 Các Tính Năng Nổi Bật

### 1. 🔒 Đăng Ký Vai Trò Bí Mật (Anti-Peeking Flow)
- **Bảo mật danh tính tuyệt đối**: Màn hình khóa che giấu dữ liệu giữa mỗi lượt chuyền máy (`🔒 HÃY CHUYỂN MÁY CHO: [Tên Người Chơi]`).
- **Chống suy đoán loại trừ**: Mọi người chơi đều nhìn thấy danh sách vai trò khả dụng y hệt nhau, không hiển thị số lượng còn lại hay làm mờ ô chọn.
- **2 Chế độ linh hoạt**: Tự chọn theo bài giấy cầm trên tay hoặc để Web tự chia bài ngẫu nhiên.

### 2. 🌙 Chuỗi Ban Đêm Tự Động 100% (Auto-Night Sequence)
- **Nhạc nền át tiếng động**: Tự động phát âm thanh đêm để át tiếng bước chân, tiếng thở khi người chơi thức dậy thao tác trên máy.
- **Tương tác kín đáo theo từng vai trò**:
  - **🛡️ Bảo Vệ**: Chọn người cần che chở.
  - **🐺 Ma Sói**: Thống nhất chọn con mồi.
  - **🔮 Tiên Tri**: Chạm chọn 1 người $\rightarrow$ Màn hình hiện to huy hiệu `🟢 PHE DÂN LÀNG` hoặc `🔴 PHE MA SÓI`.
  - **🧪 Phù Thủy**: Màn hình hiển thị đích danh nạn nhân bị Sói cắn $\rightarrow$ Quyết định dùng bình Cứu hoặc bình Độc.
  - **🏹 Thợ Săn**: Quản trò gọi thức dậy kiểm tra phát bắn.

### 3. 📢 Xướng ĐÍCH DANH Tên Người Chết & Người Được Bảo Vệ
- Tự động giải quyết logic đêm (Cắn, Bảo vệ, Cứu, Độc).
- Quản trò phát giọng đọc chuẩn Tiếng Việt thông báo chi tiết:
  > *"Trời sáng rồi, tất cả mọi người mở mắt ra! Đêm qua, [Tên] đã bị Ma Sói tấn công, nhưng rất may mắn đã được BẢO VỆ che chở an toàn!"*
  > *"Đêm qua, [Tên] đã bị sát hại!"*
- Banner tổng kết sáng trực quan và cập nhật thẻ bài người chơi trên Dashboard.

### 4. 🗣️ Tùy Chọn Giọng Đọc & 🎶 4 Thể Loại Nhạc Nền
- **Hộp chọn giọng (Voice Selector)**: Ưu tiên giọng tiếng Việt (`vi-VN`) của hệ thống (Microsoft An, Google Tiếng Việt,...).
- **Tùy chỉnh tông giọng (Pitch)**: Trầm ấm nam tính (0.8x), Tiêu chuẩn (1.0x), Nữ/Cao (1.25x).
- **4 Thể loại nhạc nền Synthesizer** (tạo bằng Web Audio API, không lo mất mạng):
  1. 🌲 *Rừng Đêm & Tiếng Gió (Forest & Wind)*
  2. 🎻 *Hồi Hộp & Kịch Tính (Suspense Minor Drone)*
  3. 🥁 *Nhịp Trống Thảo Luận (Discussion Cadence)*
  4. 🌌 *Đêm Trăng Máu (Blood Moon)*

### 5. ⏱️ Đồng Hồ Họp Thảo Luận Ban Ngày (Fullscreen Digital Timer)
- Đồng hồ số kỹ thuật số khổng lồ toàn màn hình.
- Các mốc chọn nhanh: 1 Phút, 2 Phút, 3 Phút, 5 Phút, `+30 Giây`.
- Vòng đồng hồ chuyển sang **ĐỎ RỰC** và phát âm thanh "Tích... tắc..." đếm ngược ở 10 giây cuối.
- Quản trò tự động cất giọng nhắc nhở biểu quyết khi hết giờ.

### 6. 📱 Chế Độ Phòng Chơi Đa Thiết Bị (Multi-Device Room P2P)
- **Mỗi người một máy**: Không cần phải chuyền 1 điện thoại qua lại nữa! Mọi người chơi cầm điện thoại cá nhân của mình để xem vai trò và ra kỹ năng bí mật ngay tại chỗ.
- **Tạo phòng linh hoạt**: Đặt mã phòng tuỳ ý, có thể **đặt mật khẩu phòng** hoặc không đặt mật khẩu.
- **Vào phòng siêu tốc**: Quét mã **QR Code** trực tiếp trên màn hình máy Quản Trò (Host) hoặc nhập mã phòng.
- **Kết nối P2P WebRTC / Offline BroadcastChannel**: Hoạt động mượt mà không cần server backend phức tạp. Khi chơi offline cùng trình duyệt/mạng nội bộ có fallback kênh BroadcastChannel.
- **Rung phản hồi bí mật (Haptic Vibration)**: Khi đến lượt chức năng của bạn trong đêm, điện thoại bạn sẽ tự động rung nhẹ báo thức mà không ai xung quanh hay biết.

---

## 🚀 Hướng Dẫn Sử Dụng

1. Clone repo về máy:
   ```bash
   git clone https://github.com/vunameaut/QuanchoMaSoi.git
   ```
2. Mở trực tiếp file `index.html` bằng trình duyệt (Chrome, Edge, Cốc Cốc, Brave...) hoặc chạy qua một server tĩnh:
   ```bash
   python -m http.server 8080
   ```
3. Truy cập: `http://localhost:8080`
   - **Chế độ 1 Máy (Single-Device)**: 1 máy làm quản trò và chuyền máy bí mật để đăng ký role hoặc chọn đêm.
   - **Chế độ Đa Thiết Bị (Multi-Device)**: 1 máy lớn (iPad/Laptop/Điện thoại) làm Quản Trò Tạo Phòng $\rightarrow$ các bạn còn lại dùng điện thoại quét mã QR/nhập mã phòng để vào chơi.

---

## 🛠️ Công Nghệ Sử Dụng
- **HTML5 & CSS3 thuần**: Giao diện Dark Mode huyền bí, Glassmorphism, Responsive toàn diện.
- **JavaScript (ES6+)**: Module Audio Manager và State Management tách biệt, không phụ thuộc thư viện ngoài (Zero dependencies).
- **Web Speech API (`speechSynthesis`)**: Giọng đọc quản trò tiếng Việt.
- **Web Audio API (`AudioContext`)**: Máy tạo nhạc nền và hiệu ứng âm thanh thời gian thực.

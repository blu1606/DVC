# 👵👴 EasyDVC - Trợ lý thoại thông minh cho Dịch vụ công Việt Nam

**EasyDVC** là một Chrome Extension thông minh được thiết kế đặc biệt nhằm giúp đỡ người cao tuổi tại Việt Nam dễ dàng thực hiện các dịch vụ công trực tuyến trên cổng Dịch vụ công Quốc gia (`dichvucong.gov.vn`) bằng giọng nói tự nhiên.

---

## 🚀 Các tính năng chính (Core Features)

1.  **Giao tiếp giọng nói rảnh tay (Hands-free Voice UI)**: Kết nối trực tiếp qua giao thức OpenAI Realtime WebRTC, tự động nhận diện giọng nói tiếng Việt lễ phép, ấm áp, phù hợp với người lớn tuổi mà không cần bấm giữ nút nói.
2.  **Bảo mật dữ liệu cá nhân (PII Shield - Solution A)**: Tự động phát hiện và che giấu các thông tin nhạy cảm như số định danh/CCCD, số điện thoại thành dạng token bảo mật (`[🔒 CCCD_1]`) trên UI phụ đề. Hiển thị hộp thoại xác nhận cục bộ tại trình duyệt của người dân trước khi đưa dữ liệu vào biểu mẫu.
3.  **Tối ưu hóa DOM Caching**: Giảm dung lượng truyền tải lên AI từ hàng chục ngàn dòng DOM phức tạp xuống còn cấu trúc phẳng tĩnh siêu sạch (`DVC_FORM_TEMPLATES`), giúp tiết kiệm 95% token và tăng tốc độ xử lý.
4.  **Tự động hóa địa chỉ 3 cấp (Cascading Dropdown)**: Tự động điền chuỗi Tỉnh -> Huyện -> Xã, xử lý thông minh các độ trễ tải dữ liệu bất đồng bộ (AJAX) của cổng dịch vụ công.
5.  **Bảng hướng dẫn trực quan (Checklist GenUI)**: Tự động sinh bảng checklist hướng dẫn từng bước trực quan ngay trên giao diện Shadow DOM cô lập.

---

## 📁 Cấu trúc dự án (Project Structure)

*   `extension/`: Mã nguồn Chrome Extension (Manifest V3, Content script, WebRTC voice client, PII Shield).
*   `backend/`: Máy chủ Agent trung gian (Python FastHTML/WebSocket Bridge) dùng để kết nối điều khiển tác nhân từ xa.
*   `docs/`: Tài liệu chi tiết về kiến trúc hệ thống, quy chuẩn viết mã và lộ trình phát triển.
*   `test-dvc-cascading.html`: Trang mockup biểu mẫu cổng dịch vụ công giúp kiểm thử cục bộ E2E thuận tiện.

---

## 🛠️ Hướng dẫn cài đặt & Chạy thử nghiệm (Setup & Run)

### Bước 1: Build và đóng gói Chrome Extension
1.  Truy cập vào thư mục extension:
    ```bash
    cd extension
    ```
2.  Cài đặt các thư viện cần thiết:
    ```bash
    pnpm install
    ```
3.  Đóng gói WebRTC Client sử dụng esbuild:
    ```bash
    npx esbuild webrtc-client.js --bundle --outfile=webrtc-client.bundle.js
    ```

### Bước 2: Nạp Extension vào Google Chrome
1.  Mở trình duyệt Google Chrome, truy cập địa chỉ `chrome://extensions/`.
2.  Bật chế độ nhà phát triển (**Developer mode**) ở góc trên bên phải.
3.  Chọn **Load unpacked** (Tải tiện ích đã giải nén) và chọn thư mục `DVC/extension`.

### Bước 3: Khởi chạy Python Agent Server (Tùy chọn)
1.  Truy cập vào thư mục backend:
    ```bash
    cd ../backend
    ```
2.  Khởi tạo môi trường ảo Python và cài đặt thư viện:
    ```bash
    python -m venv .venv
    .venv\Scripts\activate
    pip install -r requirements.txt
    ```
3.  Khởi chạy máy chủ:
    ```bash
    python agent_server.py
    ```

### Bước 4: Kiểm thử E2E cục bộ
1.  Mở tệp `DVC/test-dvc-cascading.html` trực tiếp bằng trình duyệt Chrome đã nạp Extension.
2.  Nhấp vào biểu tượng Micro nổi của **EasyDVC** ở góc dưới bên phải màn hình.
3.  Bấm nút **Bắt đầu nói** và giao tiếp để thử nghiệm các luồng: chưa đăng nhập, tự động điền hồ sơ cá nhân và tự động điền địa chỉ hành chính 3 cấp.
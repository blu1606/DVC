# 👵👴 EasyDVC - Trợ lý thoại thông minh cho Dịch vụ công Việt Nam

[![GitHub Repo](https://img.shields.io/badge/GitHub-Repository-blue?logo=github)](https://github.com/blu1606/DVC)

**EasyDVC** là một Chrome Extension thông minh được thiết kế đặc biệt nhằm giúp đỡ người cao tuổi và những người không rành công nghệ tại Việt Nam dễ dàng thực hiện các dịch vụ công trực tuyến trên cổng Dịch vụ công Quốc gia (`dichvucong.gov.vn`) bằng giọng nói tự nhiên và giao diện GenUI tự động.

---

## 🎯 Nỗi đau của người dân Việt Nam (Vietnam Context)

1. **Sự bất tương thích ngôn ngữ**: Giao diện Dịch vụ công sử dụng thuật ngữ Hán-Việt hành chính phức tạp (*"Đăng ký thường trú"*, *"Cấp lại thẻ BHYT"*), trong khi người lớn tuổi chỉ nói khẩu ngữ dân dã (*"làm lại thẻ bảo hiểm bị mất"*, *"nhập khẩu cho con"*).
2. **Cấu trúc dropdown địa chỉ 3 cấp phức tạp**: Biểu mẫu bắt buộc chọn tuần tự Tỉnh -> Huyện -> Xã trước khi điền địa chỉ chi tiết, rất khó khăn với người mắt kém hoặc không quen dùng chuột.
3. **Rào cản xác thực OTP SMS**: Việc chuyển đổi sự tập trung liên tục giữa màn hình máy tính và điện thoại di động để đọc mã OTP SMS gây bối rối cho người già.
4. **Bảo mật dữ liệu cá nhân (PII)**: Rủi ro rò rỉ dữ liệu nhạy cảm như CCCD, số điện thoại lên các AI đám mây bên ngoài.

---

## 💻 Hệ sinh thái Công nghệ Codex Tích hợp (Codex Core Integrations)

Dự án tận dụng tối đa năng lượng biên dịch mã nguồn, gán nhãn cấu trúc và tư duy logic thời gian thực của hệ sinh thái **OpenAI Codex** thông qua các giao thức kết nối bảo mật:

*   **Codex Core (Realtime API via WebRTC/gRPC)**: Kết nối đường truyền giọng nói hai chiều trực tiếp, cung cấp phản hồi thoại tiếng Việt tự nhiên dưới 1.5 giây với cơ chế rảnh tay (Server VAD).
*   **Codex DOM Access & Annotation API**: Thay vì sử dụng thị giác máy tính (Vision) độ trễ cao, extension sử dụng thuật toán gán nhãn ẩn (Annotations) lên cấu trúc HTML của trang dịch vụ công. Codex đọc trực tiếp các nhãn này để điều khiển điền dữ liệu và click chính xác 100%.
*   **Codex CLI & GenUI Compiler**: Khi người dùng yêu cầu tóm tắt hoặc sinh checklist hướng dẫn, Codex CLI chạy ngầm tại backend đóng vai trò trình biên dịch tự động sinh mã HTML/CSS và "tiêm" (inject) đè lên giao diện gốc dưới dạng một **Shadow DOM** cô lập, tránh xung đột CSS.
*   **Codex Subscriptions (State Sync)**: Đồng bộ hóa trạng thái phiên làm việc (Session State) giữa các lần chuyển trang và tải lại trang, giúp AI giữ nguyên ngữ cảnh hội thoại đã thực hiện ở các bước trước.
*   **PII Reduction Shield (Lọc dữ liệu Azure & Local)**: Quét và che giấu thông tin nhạy cảm (CCCD, SĐT) thành token bảo mật ngay tại trình duyệt khách (Client-side) trước khi gửi đi. Cổng Azure Gateway cũng tích hợp bộ lọc PII Reduction trước khi gửi lên API Codex đám mây.
*   **Zalo OTP Sync Bridge**: Zalo Companion Bot liên kết chạy trên điện thoại tự động bắt tin nhắn OTP Dịch vụ công, truyền WebSocket real-time về Extension để tự động điền mà người dùng không cần chạm vào điện thoại.

---

## 🚀 Các tính năng chính (Core Features)

1.  **Giao tiếp giọng nói rảnh tay (Hands-free Voice UI)**: Nhận diện giọng nói tiếng Việt tự nhiên, ấm áp, lễ phép, phản hồi thời gian thực qua WebRTC.
2.  **Bảo mật dữ liệu cá nhân (PII Shield - Solution A)**: Thay thế thông tin nhạy cảm dạng token (`[🔒 CCCD_1]`) trên UI phụ đề và hiển thị hộp thoại xác nhận visual cục bộ trước khi điền biểu mẫu.
3.  **Tối ưu hóa DOM Caching phẳng (`DVC_FORM_TEMPLATES`)**: Cache cấu trúc tĩnh của 50+ dịch vụ công phổ biến theo URL, giúp giảm 95% lượng token gửi lên AI và giảm độ trễ giọng nói.
4.  **Tự động hóa địa chỉ 3 cấp (Cascading Address)**: Điền địa chỉ Tỉnh -> Huyện -> Xã bất đồng bộ bằng cơ chế thăm dò vòng lặp (polling) 200ms để vượt qua độ trễ tải AJAX.
5.  **Bảng hướng dẫn trực quan (Checklist GenUI)**: Tự động sinh bảng checklist hướng dẫn từng bước trực quan trong Shadow DOM cô lập.

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
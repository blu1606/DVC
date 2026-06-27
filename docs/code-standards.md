# Code Standards & Guidelines

Dự án **EasyDVC** tuân thủ các nguyên tắc thiết kế mã nguồn tối giản, hiệu quả và bảo mật cao để đảm bảo Chrome Extension hoạt động mượt mà trên bất kỳ trang dịch vụ công nào.

## 1. Nguyên tắc kiến trúc (Architectural Principles)
*   **YAGNI (You Aren't Gonna Need It)**: Tránh phát triển các tính năng dư thừa, giữ mã nguồn tinh gọn dưới 200 dòng đối với các file chức năng độc lập (ngoại trừ các file template DOM tĩnh hoặc bundle biên dịch).
*   **Tách biệt giao diện (UI Isolation)**: Toàn bộ giao diện tiêm từ Extension vào trang web (Checklist, Voice Widget, PII Modal) bắt buộc phải sử dụng **Shadow DOM** để tránh bị ảnh hưởng bởi CSS của trang chủ và ngược lại.
*   **Zero-State PII**: Không gửi bất kỳ dữ liệu cá nhân thô nào lên mô hình AI. Việc lưu trữ PII chỉ diễn ra cục bộ trong bộ nhớ tạm (RAM) của client.

## 2. Tiêu chuẩn mã nguồn Javascript (Chrome Extension)
*   **Sử dụng Vanilla JS & ES6+**: Tránh phụ thuộc vào các thư viện UI cồng kềnh như React/Vue ở Content Script nhằm tối ưu hóa bộ nhớ và tốc độ render.
*   **Bất đồng bộ & Xử lý DOM**:
    *   Khi tìm kiếm hoặc tương tác với phần tử DOM tải bất đồng bộ (AJAX), luôn sử dụng vòng lặp thăm dò (polling) với số lần thử tối đa và độ trễ hợp lý để tránh lỗi nghẽn.
    *   Mọi thay đổi giá trị form cần kích hoạt các sự kiện `input` và `change` một cách rõ ràng để trang web nhận diện được dữ liệu mới nhập:
        ```javascript
        el.value = val;
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
        ```

## 3. Tiêu chuẩn mã nguồn Python (Backend)
*   **Định dạng kiểu (Type Hints)**: Tất cả các khai báo hàm công cụ (`@function_tool`) của Agent phải khai báo rõ kiểu dữ liệu của đối số và mô tả docstring chi tiết để mô hình AI nhận diện chính xác.
*   **Xử lý lỗi (Error Handling)**: Sử dụng các khối `try...except` bao quanh các lệnh gọi API để trả về phản hồi định dạng JSON có cấu trúc `{"status": "error", "message": "..."}` thay vì gây sập tiến trình server.

## 4. Quy trình bảo mật & Đóng gói
*   **Không commit file nhạy cảm**: Không đưa tệp `.env`, API Keys, credentials vào git repository.
*   **Đóng gói WebRTC Client**: Sau khi sửa đổi `webrtc-client.js`, bắt buộc phải chạy lệnh build esbuild để biên dịch lại bundle:
    ```bash
    npx esbuild extension/webrtc-client.js --bundle --outfile=extension/webrtc-client.bundle.js
    ```

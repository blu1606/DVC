# Phase 06: Kiểm thử Đầu cuối & Mô phỏng trên môi trường Hackathon

## 🎯 Mục tiêu
Xác thực toàn bộ luồng hoạt động từ đầu đến cuối: Kiểm tra login -> Giải thích trang -> Nhận diện ý định và check dịch vụ khả dụng -> Lên checklist UI -> Dẫn đường & điền biểu mẫu (gồm cả dropdown 3 cấp) -> Fallback khi ý định sai/mơ hồ.

---

## 📂 Các tệp tạo mới & sửa đổi
*   `[NEW]` `test-dvc-cascading.html` — Tạo trang HTML mockup giả lập form dịch vụ công có nút login, dropdown địa chỉ AJAX tải động để test local.

---

## 📝 Các bước Triển khai chi tiết

### Bước 1: Khởi tạo trang Mockup kiểm thử địa chỉ
Tạo tệp `test-dvc-cascading.html` chứa form DVC mô phỏng có cả trạng thái login (ví dụ: nút login và div chứa thông tin user). Chi tiết cấu trúc đã được định nghĩa trong [phase-04-testing.md cũ](file:///d:/CODE/Hackathon/CODEX/plans/20260627-1002-dvc-dom-optimization-and-cheats/phase-04-testing.md).

### Bước 2: Chạy kiểm thử các Kịch bản (Test Cases)

#### Kịch bản 1: Chưa Login -> Tự động chuyển hướng
1.  Người dùng mở trang mockup ở trạng thái Chưa Login (nút Login hiển thị).
2.  Khởi động trợ lý thoại.
3.  *Kết quả*: Agent phát hiện chưa login và đề xuất: *"Bác chưa đăng nhập. Để cháu chuyển hướng bác..."* và tự điều hướng trình duyệt.

#### Kịch bản 2: Đã Login -> Nhận diện dịch vụ khả dụng -> Lên checklist & Điền form
1.  Người dùng ở trạng thái Đã Login.
2.  Yêu cầu: *"Bác muốn chuyển hộ khẩu cho con"*
3.  *Kết quả*:
    *   Agent nhận diện đúng dịch vụ "Đăng ký thường trú".
    *   Tự động vẽ Checklist hướng dẫn 4 bước trên giao diện.
    *   Dẫn đường người dùng tới đúng form tờ khai.
    *   Thực hiện điền địa chỉ 3 cấp tuần tự bằng `fill_address_cascade`.

#### Kịch bản 3: Yêu cầu dịch vụ không khả dụng -> Fallback gợi ý
1.  Người dùng nói: *"Bác muốn làm sổ đỏ đất đai"*
2.  *Kết quả*: Agent nhận diện không hỗ trợ trực tiếp dịch vụ này, hỏi lại và gợi ý các dịch vụ cư trú hoặc thẻ bảo hiểm y tế tương đương.

---

## 🛠️ Tiêu chuẩn nghiệm thu (Success Criteria)
1.  Tất cả 3 kịch bản kiểm thử trên chạy thông suốt không lỗi.
2.  Dữ liệu điền vào form chính xác, các bước đồng bộ mượt mà.

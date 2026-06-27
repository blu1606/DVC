# Phase 03: Lập kế hoạch, Checklist Động & Điều hướng từng bước

## 🎯 Mục tiêu
Khi dịch vụ của người dùng được xác định là khả dụng, AI sẽ lập ra một kế hoạch thực hiện, tạo một Checklist động hiển thị trên màn hình (GenUI dưới dạng Shadow DOM) và tự động chuyển hướng người dùng đến đúng trang tờ khai để bắt đầu thực hiện từng bước.

---

## 📂 Các tệp sửa đổi
*   `[MODIFY]` [webrtc-client.js](file:///d:/CODE/Hackathon/CODEX/extension/webrtc-client.js) — Cập nhật logic khi khớp dịch vụ: Agent tự động gọi `inject_custom_ui` hiển thị checklist và gọi lệnh điều hướng.
*   `[MODIFY]` [content.js](file:///d:/CODE/Hackathon/CODEX/extension/content.js) — Xử lý lệnh chuyển hướng trang qua JS hoặc giả lập click liên kết dịch vụ.

---

## 📝 Các bước Triển khai chi tiết

### Bước 1: Agent sinh Checklist & Điều hướng tự động
1.  Khi khớp ý định với dịch vụ có sẵn (ví dụ: "Đăng ký thường trú"), Agent gọi tool `inject_custom_ui` gửi mã HTML checklist mẫu:
    *   *Bước 1*: Đăng nhập tài khoản.
    *   *Bước 2*: Điền thông tin tờ khai cư trú.
    *   *Bước 3*: Chọn địa chỉ cơ quan tiếp nhận hồ sơ.
    *   *Bước 4*: Tải lên hồ sơ đính kèm và xác thực OTP.
2.  Sau khi render xong checklist trên UI của người dân, Agent tự động gọi tool điều hướng đưa người dùng đến trang tờ khai `/dvc-tthc-dang-ky-thuong-tru`.

### Bước 2: Đồng bộ trạng thái checklist qua từng bước
Khi người dùng hoàn thành điền xong các trường thông tin cơ bản (ví dụ: xong họ tên, ngày sinh, số điện thoại), Agent sẽ gửi lệnh `inject_custom_ui` phiên bản mới để cập nhật trạng thái checklist (đổi trạng thái từ `⬜` sang `✅` cho bước đã hoàn thành) để người cao tuổi dễ dàng theo dõi tiến độ trực quan.

---

## 🛠️ Tiêu chuẩn nghiệm thu (Success Criteria)
1.  Người dùng yêu cầu đăng ký thường trú.
2.  Bảng checklist trực quan xuất hiện ở góc phải màn hình hiển thị 4 bước thực hiện.
3.  Trình duyệt tự động chuyển hướng sang trang điền tờ khai thường trú.

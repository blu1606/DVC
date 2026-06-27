# Phase 05: Tự động hóa Address Cascading Dropdown & Nhập thông tin

## 🎯 Mục tiêu
Đảm bảo điền nhanh địa chỉ 3 cấp (Tỉnh -> Huyện -> Xã) và hỗ trợ bulk autofill thông tin cá nhân từ bộ nhớ đệm client.

---

## 📂 Các tệp sửa đổi
*   `[MODIFY]` [content.js](file:///d:/CODE/Hackathon/CODEX/extension/content.js) — Thêm hàm `fillAddressCascading` xử lý chọn dropdown đồng bộ và đăng ký action `fill_address_cascade`.
*   `[MODIFY]` [webrtc-client.js](file:///d:/CODE/Hackathon/CODEX/extension/webrtc-client.js) — Đăng ký tool `fill_address_cascade` và `bulk_fill_profile`.
*   `[MODIFY]` [agent_server.py](file:///d:/CODE/Hackathon/CODEX/backend/agent_server.py) — Đăng ký các hàm tool backend tương ứng để phục vụ kiểm thử.

---

## 📝 Các bước Triển khai chi tiết

### Bước 1: Viết hàm phụ trợ fillAddressCascading
Hàm này thực hiện việc chọn tuần tự các dropdown:
1.  Chọn Tỉnh/Thành phố.
2.  Chờ AJAX phản hồi và đổ dữ liệu cho dropdown Quận/Huyện.
3.  Chọn Quận/Huyện.
4.  Chờ AJAX phản hồi và đổ dữ liệu cho dropdown Xã/Phường.
5.  Chọn Xã/Phường.

Chi tiết mã nguồn đã được phác thảo trong tài liệu [dvc_cheatsheet.md](file:///C:/Users/LENOVO/.gemini/antigravity-ide/brain/d7d42866-8e8e-4860-9004-a1a2cfad5ffc/dvc_cheatsheet.md#L62).

### Bước 2: Tích hợp bulk_fill_profile
Tạo sự kiện `"bulk_fill_profile"` trong content script:
```javascript
if (action === "bulk_fill_profile") {
  const profile = command.profile;
  if (!profile) return { status: "error", message: "Không tìm thấy dữ liệu profile" };
  
  // Điền nhanh hàng loạt các trường
  const mappings = {
    "#fullname": profile.fullname,
    "#birthday": profile.birthday,
    "#cccd-num": profile.cccd,
    "#phone": profile.phone
  };
  
  for (const [selector, val] of Object.entries(mappings)) {
    const el = document.querySelector(selector);
    if (el && val) {
      el.value = val;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      highlightElement(el);
    }
  }
  return { status: "success" };
}
```

---

## 🛠️ Tiêu chuẩn nghiệm thu (Success Criteria)
1.  Gọi tool `fill_address_cascade` điền đúng địa chỉ 3 cấp tuần tự, AJAX không bị đè lỗi trống dữ liệu.
2.  Gọi tool `bulk_fill_profile` điền ngay lập tức họ tên, ngày sinh, số điện thoại, CCCD chỉ trong 1 lần gọi.

# Phase 02: Phân tích Ý định, DOM Caching & Nhận dạng Dịch vụ

## 🎯 Mục tiêu
Giúp Agent nhận diện chính xác ý định (intent) của người dùng về thủ tục hành chính họ cần làm (ví dụ: đăng ký tạm trú, cấp thẻ BHYT). Tận dụng bộ đệm DOM để trả về schema cực sạch, tối ưu hóa token.

---

## 📂 Các tệp sửa đổi
*   `[MODIFY]` [content.js](file:///d:/CODE/Hackathon/CODEX/extension/content.js) — Thêm cache `DVC_FORM_TEMPLATES` và cập nhật [getPageDOMStructure](file:///d:/CODE/Hackathon/CODEX/extension/content.js#L210) để trả về schema phẳng.
*   `[MODIFY]` [webrtc-client.js](file:///d:/CODE/Hackathon/CODEX/extension/webrtc-client.js) — Cấu hình danh sách dịch vụ được hỗ trợ (Available Services) và hướng dẫn mô hình kiểm tra tính khả dụng.

---

## 📝 Các bước Triển khai chi tiết

### Bước 1: Khai báo Danh sách dịch vụ khả dụng trong instructions
Trong hệ thống nhắc nhở (instructions) của `RealtimeAgent` ở [webrtc-client.js](file:///d:/CODE/Hackathon/CODEX/extension/webrtc-client.js), khai báo danh sách dịch vụ mà hệ thống có sẵn template và khả năng hỗ trợ điền tự động:

```javascript
const AVAILABLE_SERVICES = [
  { name: "Đăng ký thường trú", keyword: ["thường trú", "hộ khẩu", "chuyển hộ khẩu"], url: "/dvc-tthc-dang-ky-thuong-tru" },
  { name: "Cấp lại thẻ BHYT do mất, hỏng", keyword: ["bảo hiểm y tế", "bhyt", "mất thẻ bảo hiểm"], url: "/dvc-tthc-cap-lai-the-bhyt" }
];
```

### Bước 2: Tối ưu hóa hàm getPageDOMStructure trong content.js
Như đã trình bày ở Phase 01 cũ, cấu hình `DVC_FORM_TEMPLATES` lưu sẵn các selector sạch. Khi người dùng ở đúng URL dịch vụ, ta trả về cấu trúc flat này để LLM đọc và định vị trường điền nhanh chóng mà không cần suy luận từ HTML thô của DVC.

---

## 🛠️ Tiêu chuẩn nghiệm thu (Success Criteria)
1.  Khi người dùng nói: *"Bác muốn chuyển hộ khẩu cho con"* -> Agent khớp ý định với "Đăng ký thường trú".
2.  Agent xác nhận dịch vụ này có hỗ trợ trên hệ thống.

# Kế hoạch Triển khai: Tối ưu hóa DOM Caching, Kiểm tra Đăng nhập & Luồng Nghiệp vụ Trợ lý AI

Kế hoạch này tích hợp các giải pháp tối ưu hóa DOM Caching kết hợp với các luồng nghiệp vụ cốt lõi: kiểm tra trạng thái đăng nhập, phân tích ý định người dùng (User Intent), lập kế hoạch, tạo checklist động và điều hướng tự động hoặc hỏi lại khi độ tự tin thấp.

---

## 📅 Các Giai đoạn Thực hiện (Phases)

| Giai đoạn | Trọng tâm | File chi tiết | Trạng thái |
| :--- | :--- | :--- | :---: |
| **Phase 01** | Kiểm tra Đăng nhập & Điều hướng Tự động | [Phase 01](file:///d:/CODE/Hackathon/CODEX/plans/20260627-1002-dvc-dom-optimization-and-cheats/phase-01-login-navigation.md) | `[ ]` |
| **Phase 02** | Phân tích Ý định, DOM Caching & Nhận dạng Dịch vụ | [Phase 02](file:///d:/CODE/Hackathon/CODEX/plans/20260627-1002-dvc-dom-optimization-and-cheats/phase-02-intent-and-caching.md) | `[ ]` |
| **Phase 03** | Lập kế hoạch, Checklist Động (GenUI) & Điều hướng từng bước | [Phase 03](file:///d:/CODE/Hackathon/CODEX/plans/20260627-1002-dvc-dom-optimization-and-cheats/phase-03-checklist-flow.md) | `[ ]` |
| **Phase 04** | Luồng Hỏi lại (Ask Back) & Gợi ý Dịch vụ Tương tự (Fallback Options) | [Phase 04](file:///d:/CODE/Hackathon/CODEX/plans/20260627-1002-dvc-dom-optimization-and-cheats/phase-04-fallback-loop.md) | `[ ]` |
| **Phase 05** | Tự động hóa Address Cascading Dropdown & Nhập thông tin | [Phase 05](file:///d:/CODE/Hackathon/CODEX/plans/20260627-1002-dvc-dom-optimization-and-cheats/phase-05-cascading-address.md) | `[ ]` |
| **Phase 06** | Kiểm thử Đầu cuối & Mô phỏng trên môi trường Hackathon | [Phase 06](file:///d:/CODE/Hackathon/CODEX/plans/20260627-1002-dvc-dom-optimization-and-cheats/phase-06-testing.md) | `[ ]` |

---

## 🛠️ Chi tiết các tệp sẽ chỉnh sửa

1.  [content.js](file:///d:/CODE/Hackathon/CODEX/extension/content.js):
    *   Thêm hàm `checkLoginStatus()` để quét sự tồn tại của nút "Đăng nhập" hoặc trạng thái session.
    *   Tích hợp hàm `fillAddressCascading` xử lý địa chỉ 3 cấp.
    *   Hỗ trợ cơ chế cache cấu trúc trang qua `DVC_FORM_TEMPLATES`.
2.  [webrtc-client.js](file:///d:/CODE/Hackathon/CODEX/extension/webrtc-client.js):
    *   Thêm các công cụ `check_login`, `navigate_to_login`, `fill_address_cascade`, `bulk_fill_profile`.
    *   Cập nhật `RealtimeAgent` System Prompt định nghĩa rõ luồng nghiệp vụ của AI (giới thiệu dịch vụ, tạo checklist, dẫn đường, fallback gợi ý dịch vụ gần giống).
3.  [agent_server.py](file:///d:/CODE/Hackathon/CODEX/backend/agent_server.py):
    *   Đồng bộ hóa các tool mới định nghĩa ở backend để chạy kiểm thử qua WebSocket Server.

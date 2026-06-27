# Codebase Summary

Cấu trúc thư mục của dự án **ThôngDVC** bao gồm hai thành phần chính: Chrome Extension (Client) và Agent Bridge Server (Backend).

## 1. Bản đồ thư mục (Directory Tree)

```
DVC/
├── docs/                               # Tài liệu hướng dẫn & thiết kế
│   ├── project-overview-pdr.md
│   ├── codebase-summary.md
│   ├── code-standards.md
│   ├── system-architecture.md
│   └── project-roadmap.md
├── extension/                          # Mã nguồn của Chrome Extension
│   ├── manifest.json                   # Cấu hình Extension Manifest V3
│   ├── webrtc-client.js                # Core quản lý OpenAI Realtime WebRTC
│   ├── webrtc-client.bundle.js         # Bản build bundle đóng gói qua esbuild
│   ├── content.js                      # Content script tương tác DOM chính
│   ├── pii-shield.js                   # Lớp bảo mật che dấu CCCD/SĐT
│   ├── ui-builder.js                   # Trình tạo giao diện Checklist (GenUI)
│   ├── voice-widget.js                 # Widget nổi hiển thị micro & chat log
│   ├── popup.html / popup.js           # Giao diện popup extension
│   └── permission.html / permission.js # Trang xin quyền truy cập Microphone
├── backend/                            # Python Backend Server
│   ├── agent_server.py                 # Máy chủ Agent điều khiển bằng gpt-4o
│   └── ...                             # Các module hỗ trợ kết nối WebSocket Bridge
├── test-dvc-cascading.html             # Trang mockup cổng dịch vụ công để test
└── README.md                           # Giới thiệu & Hướng dẫn cài đặt nhanh
```

---

## 2. Chi tiết vai trò của các tệp (File Roles)

### 🌐 Phân hệ Chrome Extension (`extension/`)

*   **[manifest.json](file:///d:/CODE/Hackathon/CODEX/DVC/extension/manifest.json)**: Khai báo quyền (permissions: activeTab, storage, scripting), các tệp content script tiêm vào trang web, và popup cấu hình.
*   **[webrtc-client.js](file:///d:/CODE/Hackathon/CODEX/DVC/extension/webrtc-client.js)**: Khởi tạo kết nối WebRTC với OpenAI, đăng ký schema các tool Client (fill_field, click_element, fill_address_cascade, etc.) và thực hiện che chắn thông tin nhạy cảm ở sự kiện `input_audio_transcription.completed`.
*   **[content.js](file:///d:/CODE/Hackathon/CODEX/DVC/extension/content.js)**: Tệp xử lý DOM chính chạy trong ngữ cảnh trang web. Thực hiện điền dữ liệu, click nút, kiểm tra trạng thái login, vẽ UI xác nhận PII, và chứa logic điền địa chỉ hành chính 3 cấp bất đồng bộ.
*   **[pii-shield.js](file:///d:/CODE/Hackathon/CODEX/DVC/extension/pii-shield.js)**: Sử dụng các biểu thức chính quy (Regex) để trích xuất, thay thế chuỗi số CCCD (12 số) và số điện thoại (10 số) thành token dạng `[CCCD_N]` / `[PHONE_N]`, lưu vết mapping để khôi phục (unmask) cục bộ trước khi điền form.
*   **[voice-widget.js](file:///d:/CODE/Hackathon/CODEX/DVC/extension/voice-widget.js)**: Tiêm một nút tròn nổi hình Micro và panel chat log vào trang web. Nhận các sự kiện từ `webrtc-client` để vẽ phụ đề thoại của người dùng và câu trả lời của AI theo thời gian thực.
*   **[ui-builder.js](file:///d:/CODE/Hackathon/CODEX/DVC/extension/ui-builder.js)**: Xây dựng các mẫu giao diện động (GenUI) như thanh tiến trình checklist hướng dẫn điền form.

### 🐍 Phân hệ Python Backend (`backend/`)

*   **[agent_server.py](file:///d:/CODE/Hackathon/CODEX/DVC/backend/agent_server.py)**: Sử dụng thư viện `google-genai` hoặc các công cụ Agent để liên kết các tool Python với Client thông qua giao thức WebSocket Bridge. Chứa các system prompt để điều hướng nghiệp vụ.

### 🧪 Mockup Kiểm thử

*   **[test-dvc-cascading.html](file:///d:/CODE/Hackathon/CODEX/DVC/test-dvc-cascading.html)**: Tạo ra một trang web mô phỏng cổng dịch vụ công với đầy đủ các dropdown địa chỉ Tỉnh -> Huyện -> Xã tải bất đồng bộ (trễ AJAX 600ms) phục vụ kiểm thử luồng chạy hoàn chỉnh của Extension.

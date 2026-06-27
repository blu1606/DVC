# Kế hoạch Triển khai Tối giản: Trợ lý Dịch vụ Công ThôngDVC

Kế hoạch này đã được tối ưu hóa để **không phát minh lại bánh xe**, tận dụng tối đa các lớp thư viện có sẵn trong **OpenAI Agents SDK (TypeScript/Python)** để giảm thiểu số dòng code phải viết, đồng thời giảm độ trễ (latency) về mức tối thiểu.

---

## 🛠️ Tránh "Phát minh lại bánh xe" (No Reinventing the Wheel)

1.  **Về Voice & WebRTC:**
    *   *Tránh:* Không tự viết mã kết nối WebRTC thủ công (`RTCPeerConnection`, đàm phán SDP, cấu hình luồng ghi âm).
    *   *Dùng sẵn:* Sử dụng lớp `RealtimeAgent` và `RealtimeSession` từ package `@openai/agents/realtime`. Thư viện này tự động xử lý micro, loa, kết nối WebRTC và quản lý ngắt câu (VAD/barge-in) tự động.
2.  **Về Browser Automation (Thay thế CUA Tọa độ):**
    *   *Tránh:* Không sử dụng API Computer Use dạng tọa độ (CUA) của OpenAI vì nó bắt buộc phải chụp ảnh màn hình liên tục, gửi ảnh thô và tính toán pixel $\rightarrow$ Cực kỳ chậm (trễ 5-8 giây) và tốn chi phí.
    *   *Dùng sẵn:* Sử dụng các **Semantic Function Tools** (`fill_field`, `click_button`, `select_option`) thông qua decorator `@function_tool` của Agents SDK. Mô hình chỉ cần gọi tên hàm và truyền selector dạng CSS hoặc nhãn văn bản, Extension thực thi bằng DOM API chuẩn chỉ mất **< 10ms**.

---

## 📅 Các Giai đoạn Triển khai (Phases) đã Tối giản

| Giai đoạn | Trọng tâm | File hướng dẫn chi tiết | Trạng thái |
| :--- | :--- | :--- | :---: |
| **Phase 01** | Thiết lập Python Agent Server & Khai báo Semantic Tools | [Phase 01](file:///d:/CODE/Hackathon/CODEX/plans/20260626-1432-accessibility-voice-agent-integration/phase-01-setup-environment.md) | `[ ]` |
| **Phase 02** | Xây dựng Browser Bridge WebSocket đơn giản | [Phase 02](file:///d:/CODE/Hackathon/CODEX/plans/20260626-1432-accessibility-voice-agent-integration/phase-02-dom-annotation-engine.md) | `[ ]` |
| **Phase 03** | Viết Content Script thực thi DOM Actions phía Trình duyệt | [Phase 03](file:///d:/CODE/Hackathon/CODEX/plans/20260626-1432-accessibility-voice-agent-integration/phase-03-generative-ui-compiler.md) | `[ ]` |
| **Phase 04** | Tích hợp WebRTC qua OpenAI Agents SDK (`RealtimeSession`) | [Phase 04](file:///d:/CODE/Hackathon/CODEX/plans/20260626-1432-accessibility-voice-agent-integration/phase-04-webrtc-audio-transport.md) | `[ ]` |
| **Phase 05** | Thiết lập Tool sinh Checklist UI (Shadow DOM) | [Phase 05](file:///d:/CODE/Hackathon/CODEX/plans/20260626-1432-accessibility-voice-agent-integration/phase-05-state-subscriptions.md) | `[ ]` |
| **Phase 06** | Lá chắn PII Regex & Đồng bộ Zalo OTP bảo mật | [Phase 06](file:///d:/CODE/Hackathon/CODEX/plans/20260626-1432-accessibility-voice-agent-integration/phase-06-pii-shield-zalo-otp.md) | `[ ]` |

# Phase 04: Tích hợp WebRTC qua OpenAI Agents SDK (RealtimeSession)

## 🎯 Mục tiêu
Sử dụng các lớp trợ lý có sẵn trong **OpenAI Agents SDK (TypeScript)** để khởi tạo WebRTC, thu âm từ Micro và tự động phát âm thanh AI phản hồi mà không cần tự viết mã kết nối thủ công.

---

## 💻 Công nghệ sử dụng
*   OpenAI Agents SDK for JavaScript/TypeScript (`@openai/agents`)
*   WebRTC Browser APIs (được bọc sẵn trong SDK)

---

## 📂 Các tệp tạo mới & sửa đổi
*   `[NEW]` `extension/webrtc-client.js` — Quản lý vòng đời cuộc gọi thoại sử dụng RealtimeSession.

---

## 📝 Các bước Triển khai chi tiết

### Bước 1: Cài đặt gói SDK phía Client (Extension)
Tích hợp package chứa các helper giọng nói thời gian thực:
```bash
npm install @openai/agents
```

### Bước 2: Thiết lập Voice Session cực kỳ đơn giản (TypeScript / ES6)
Tận dụng tối đa hai lớp `RealtimeAgent` và `RealtimeSession` của OpenAI. Thư viện này đã bọc sẵn toàn bộ phần kết nối `RTCPeerConnection` và quản lý Media Stream ngầm.

```javascript
// extension/webrtc-client.js
import { RealtimeAgent, RealtimeSession } from "@openai/agents/realtime";

export async function initializeVoiceAssistant() {
  // 1. Lấy mã thông báo tạm thời (Ephemeral Token) từ backend của bạn
  const tokenResponse = await fetch("http://localhost:3000/token");
  const tokenData = await tokenResponse.json();
  const ephemeralKey = tokenData.client_secret.value;

  // 2. Khởi tạo Agent với các chỉ thị nghiệp vụ
  const agent = new RealtimeAgent({
    name: "ThôngDVC Assistant",
    instructions: "Bạn là trợ lý dịch vụ công hỗ trợ người cao tuổi Việt Nam. Hãy phản hồi ngắn gọn bằng tiếng Việt.",
  });

  // 3. Khởi tạo phiên kết nối WebRTC Realtime
  const session = new RealtimeSession(agent, {
    apiKey: ephemeralKey,   // ← Bắt buộc ở constructor, không phải connect()
    transport: "webrtc",   // ← Bắt buộc: "webrtc" | "websocket"
    model: "gpt-realtime-2",
  });

  // 4. Kết nối trực tiếp đến OpenAI qua WebRTC bằng Ephemeral Key
  // SDK sẽ tự động gọi navigator.mediaDevices.getUserMedia để thu âm và phát audio ra loa
  await session.connect({});

  console.log("Phiên thoại Realtime đã sẵn sàng!");

  // 5. Lắng nghe các sự kiện và thao tác trên Data Channel
  session.on("transport_event", (event) => {
    console.log("Nhận sự kiện từ OpenAI:", event);
  });

  return session;
}
```

---

## 🛠️ Tiêu chuẩn nghiệm thu (Success Criteria)
1.  Hàm `initializeVoiceAssistant()` kết nối thành công, không phát sinh bất kỳ dòng code viết tay nào cho `RTCPeerConnection` hay `setLocalDescription`.
2.  Micro tự động ghi âm và âm thanh trả về từ AI phát rõ ràng qua loa trình duyệt của máy khách.

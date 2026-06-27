# Hướng dẫn Tích hợp OpenAI Realtime API qua WebRTC

Tài liệu này hướng dẫn cách kết nối trực tiếp trình duyệt (Chrome Extension) của **ThôngDVC** với OpenAI Realtime API thông qua giao thức **WebRTC**. WebRTC được khuyên dùng thay vì WebSockets để có độ trễ cực thấp (< 100ms) và hiệu năng ổn định hơn trên thiết bị di động/trình duyệt.

---

## 1. Hai Cơ chế Kết nối (Choose the Connection Path)

OpenAI cung cấp 2 giao diện để kết nối WebRTC từ trình duyệt:

| Giao diện kết nối | Luồng đi của dữ liệu | Ưu điểm | Nhược điểm |
| :--- | :--- | :--- | :--- |
| **Unified Interface** *(Khuyên Dùng)* | Trình duyệt gửi SDP $\rightarrow$ Server của bạn $\rightarrow$ OpenAI. | Đơn giản, Server kiểm soát cấu hình session trực tiếp ở mỗi lượt gọi. | Server nằm trong luồng xử lý SDP (critical path) lúc bắt tay. |
| **Ephemeral Token** | Trình duyệt lấy Token tạm từ Server $\rightarrow$ Trình duyệt tự gọi thẳng OpenAI qua WebRTC. | Tách biệt hoàn toàn luồng SDP, giảm tải tối đa cho Server trung gian. | Phải quản lý vòng đời và quyền hạn của Token tạm (ephemeral key). |

---

## 2. Hướng dẫn Lập trình chi tiết (Implementation Guide)

### Cơ chế 1: Kết nối bằng Unified Interface (Giao diện hợp nhất)

#### Bước A: Backend Server (Node.js/Express)
Server nhận gói SDP từ trình duyệt khách, bọc nó với cấu hình phiên (`sessionConfig`) và gửi lên OpenAI bằng API Key chính thức (được bảo mật trên server).

```javascript
import express from "express";

const app = express();
app.use(express.text({ type: ["application/sdp", "text/plain"] }));

const sessionConfig = {
  type: "realtime",
  model: "gpt-realtime-2",
  audio: { output: { voice: "marin" } }, // Giọng đọc phản hồi
};

app.post("/session", async (req, res) => {
  const fd = new FormData();
  fd.set("sdp", req.body); // SDP từ Extension gửi lên
  fd.set("session", JSON.stringify(sessionConfig));

  try {
    const response = await fetch("https://api.openai.com/v1/realtime/calls", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "OpenAI-Safety-Identifier": "hashed-user-id", // Mã bảo mật PII người dùng
      },
      body: fd,
    });
    
    // Trả về SDP cấu hình từ OpenAI cho Client
    const sdpAnswer = await response.text();
    res.send(sdpAnswer);
  } catch (error) {
    console.error("Lỗi khởi tạo session:", error);
    res.status(500).send("Failed to initialize WebRTC call");
  }
});

app.listen(3000);
```

#### Bước B: Frontend Client (Chrome Extension)
Extension thu âm từ Micro, tạo kết nối ngang hàng (Peer Connection), trao đổi SDP với server để thiết lập đường truyền.

```javascript
// 1. Tạo kết nối Peer Connection
const pc = new RTCPeerConnection();

// 2. Tự động phát âm thanh nhận về từ mô hình AI
const audioElement = document.createElement("audio");
audioElement.autoplay = true;
pc.ontrack = (e) => {
  audioElement.srcObject = e.streams[0]; // Nhận luồng âm thanh đầu ra
};

// 3. Thu âm từ Micro của người dùng và đưa vào WebRTC
const localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
pc.addTrack(localStream.getTracks()[0]);

// 4. Tạo kênh dữ liệu (Data Channel) để gửi/nhận sự kiện JSON
const dc = pc.createDataChannel("oai-events");

// 5. Tạo Offer SDP và trao đổi với Backend Server của bạn
const offer = await pc.createOffer();
await pc.setLocalDescription(offer);

const response = await fetch("http://localhost:3000/session", {
  method: "POST",
  body: offer.sdp,
  headers: { "Content-Type": "application/sdp" },
});

// 6. Nhận Answer SDP từ server và kích hoạt WebRTC call
const answer = {
  type: "answer",
  sdp: await response.text(),
};
await pc.setRemoteDescription(answer);
```

---

### Cơ chế 2: Kết nối bằng Ephemeral Token (Khóa tạm thời)

#### Bước A: Backend cấp Token tạm
Server gọi OpenAI API để xin một khóa client secret ngắn hạn (chỉ có giá trị trong phiên đó) và trả về cho Client.

```javascript
app.get("/token", async (req, res) => {
  try {
    const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        "OpenAI-Safety-Identifier": "hashed-user-id", // Mã hóa an toàn danh tính
      },
      body: JSON.stringify({
        session: {
          type: "realtime",
          model: "gpt-realtime-2",
        }
      }),
    });
    const data = await response.json();
    res.json(data); // Trả về { client_secret: { value: "ek_..." } }
  } catch (error) {
    res.status(500).json({ error: "Failed to mint token" });
  }
});
```

#### Bước B: Client gọi thẳng OpenAI WebRTC
Client lấy Token tạm, sau đó gửi trực tiếp SDP lên endpoint của OpenAI mà không cần thông qua server của bạn cho bước bắt tay SDP này.

```javascript
// 1. Lấy token tạm từ server của bạn
const tokenRes = await fetch("/token");
const tokenData = await tokenRes.json();
const EPHEMERAL_KEY = tokenData.client_secret.value;

// 2. Khởi tạo RTCPeerConnection & Add local media track (giống hệt cơ chế 1)
const pc = new RTCPeerConnection();
// ... (lắp Micro và thẻ Audio tương tự đoạn code cơ chế 1)

// 3. Tạo offer SDP
const offer = await pc.createOffer();
await pc.setLocalDescription(offer);

// 4. Gửi trực tiếp SDP lên OpenAI bằng Ephemeral Key
const response = await fetch("https://api.openai.com/v1/realtime/calls", {
  method: "POST",
  body: offer.sdp,
  headers: {
    Authorization: `Bearer ${EPHEMERAL_KEY}`,
    "Content-Type": "application/sdp",
  },
});

const answer = {
  type: "answer",
  sdp: await response.text(),
};
await pc.setRemoteDescription(answer);
```

---

## 3. Gửi và Nhận Sự kiện phi âm thanh (Data Channels)

Ưu điểm lớn nhất của WebRTC là bạn **không cần viết code xử lý truyền/nhận âm thanh nhị phân phức tạp**. WebRTC tự động xử lý truyền tải âm thanh qua RTP.

Để truyền tải các sự kiện khác (ví dụ: gửi tin nhắn văn bản, cập nhật cấu hình, nhận tín hiệu gọi Tool thực thi JS để điền DOM), ta sử dụng **Data Channel** tên `"oai-events"` đã khởi tạo ở trên:

### Lắng nghe sự kiện từ OpenAI (Server-sent Events):
```javascript
dc.addEventListener("message", (e) => {
  const event = JSON.parse(e.data);
  console.log("Nhận sự kiện từ server:", event);
  
  // Ví dụ: Phát hiện lệnh gọi công cụ điền DOM (Tool Call)
  if (event.type === "response.function_call_arguments.done") {
    const { name, arguments: args } = event;
    console.log(`AI yêu cầu gọi hàm: ${name} với tham số:`, args);
    // Thực thi JS điền form ở local browser...
  }
});
```

### Gửi sự kiện từ Extension lên OpenAI (Client-sent Events):
```javascript
const textEvent = {
  type: "conversation.item.create",
  item: {
    type: "message",
    role: "user",
    content: [
      {
        type: "input_text",
        text: "Hãy điền giúp tôi mẫu đăng ký cư trú này",
      },
    ],
  },
};
dc.send(JSON.stringify(textEvent));
```

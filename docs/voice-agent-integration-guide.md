# Hướng dẫn Tích hợp Công nghệ Voice Agent (Trợ lý Giọng nói Độ trễ thấp)

Tài liệu này cung cấp hướng dẫn lập trình và lựa chọn kiến trúc khi tích hợp các tính năng tương tác giọng nói thời gian thực cho dự án **ThôngDVC** sử dụng OpenAI Realtime API và SDK.

---

## 1. Lựa chọn Kiến trúc Hệ thống (Choose the Right Architecture)

Tùy theo nghiệp vụ cụ thể của từng biểu mẫu dịch vụ công, nhà phát triển cần chọn một trong hai mô hình xử lý giọng nói dưới đây:

| Kiến trúc | Phù hợp nhất cho | Lý do lựa chọn |
| :--- | :--- | :--- |
| **Speech-to-speech trực tiếp (Real-time Audio)** | Các cuộc hội thoại tự nhiên, cần phản hồi tức thì (< 100ms), hỗ trợ ngắt lời (barge-in). | Mô hình xử lý trực tiếp âm thanh nhị phân đầu vào và đầu ra mà không cần qua bước trung gian, tối ưu hóa độ trễ cực hạn. |
| **Chained Voice Pipeline (Chuỗi xử lý tách biệt)** | Các quy trình có tính chất bắc cầu, cần phê duyệt trung gian, hoặc tái sử dụng Agent văn bản cũ. | Ứng dụng giữ quyền kiểm soát tuyệt đối ở từng giai đoạn: Chuyển giọng nói $\rightarrow$ Văn bản (STT) $\rightarrow$ Suy luận logic (Agent) $\rightarrow$ Phát âm thanh (TTS). |

---

## 2. Kiến trúc 1: Speech-to-speech thời gian thực (TypeScript)

Sử dụng mô hình này cho giao diện chính của **ThôngDVC Extension** trên trình duyệt để tương tác trò chuyện tự nhiên với người cao tuổi.

### Luồng xử lý trên Trình duyệt (Browser Workflow):
1. **Server-side:** Sinh một khóa truy cập tạm thời (ephemeral client secret) cho phiên làm việc để đảm bảo bảo mật API Key gốc.
2. **Frontend Extension:** Khởi tạo đối tượng `RealtimeSession`.
3. **Transport Layer:** Kết nối trực tiếp qua **WebRTC** (trên trình duyệt khách) hoặc **WebSocket** (ở môi trường chạy thử node).
4. **Execution:** Agent tự động xử lý các luồng thoại, công cụ (Tool Call), ngắt lời và chuyển giao phiên.

### Ví dụ Lập trình (TypeScript):

```typescript
import { RealtimeAgent, RealtimeSession } from "@openai/agents/realtime";

// 1. Khởi tạo Agent với các chỉ thị nghiệp vụ
const agent = new RealtimeAgent({
  name: "ThôngDVC Assistant",
  instructions: "You are an accessibility voice assistant. Help elderly Vietnamese citizens fill out administrative forms.",
});

// 2. Tạo phiên làm việc thời gian thực
const session = new RealtimeSession(agent, {
  model: "gpt-realtime-2",
});

// 3. Kết nối sử dụng khóa tạm thời (ephemeral key) sinh ra từ Azure Server Gateway
await session.connect({
  apiKey: "ek_...(ephemeral key from your server)",
});
```

*Để có cấu hình sâu hơn về tầng truyền tải, tham khảo:*
*   [WebRTC Live Audio API](https://developers.openai.com/api/docs/guides/realtime-webrtc)
*   [WebSocket Live Audio API](https://developers.openai.com/api/docs/guides/realtime-websocket)

---

## 3. Kiến trúc 2: Chained Voice Workflow (Python)

Phù hợp cho backend xử lý dữ liệu phức tạp hoặc khi cần lưu trữ bản ghi (transcripts) văn bản trung gian để đối soát thông tin cá nhân (PII Protection Shield).

### Quy trình xử lý:
1. Nhận âm thanh đầu vào $\rightarrow$ Chuyển thành văn bản (STT).
2. Kiểm tra/lọc thông tin cá nhân (Mã hóa PII nhạy cảm).
3. Đưa vào luồng xử lý của Agent để sinh câu trả lời hoặc kích hoạt Tool.
4. Chuyển đổi phản hồi văn bản thành giọng nói (TTS) sau khi đã giải mã thông tin thật.

### Ví dụ Lập trình (Python):

```python
import asyncio
import numpy as np

from agents import Agent, function_tool
from agents.voice import AudioInput, SingleAgentVoiceWorkflow, VoicePipeline


@function_tool
def get_administrative_status(document_id: str) -> str:
    """Check the status of a government document application."""
    # Simulate database lookup
    return f"Ho so so {document_id} dang duoc can bo phuong ki duyet."


# Định nghĩa Agent xử lý văn bản trung gian
agent = Agent(
    name="DVC_Agent",
    instructions="You are a voice assistant handling administrative queries.",
    model="gpt-5.5",
    tools=[get_administrative_status],
)


async def main() -> None:
    # Thiết lập pipeline chuỗi
    pipeline = VoicePipeline(workflow=SingleAgentVoiceWorkflow(agent))
    
    # Giả lập buffer âm thanh đầu vào (3 giây)
    audio_input = AudioInput(buffer=np.zeros(24000 * 3, dtype=np.int16))
    
    # Thực thi pipeline và truyền phát kết quả âm thanh đầu ra
    result = await pipeline.run(audio_input)
    async for event in result.stream():
        if event.type == "voice_stream_event_audio":
            print("Received audio bytes:", len(event.data))


if __name__ == "__main__":
    asyncio.run(main())
```

---

## 4. Các Khối Nghiệp vụ cốt lõi (Core Building Blocks)

Dù sử dụng kiến trúc âm thanh nào, các nguyên tắc xây dựng Agent vẫn được giữ nguyên:

*   **Sử dụng Tools:** Khai báo các hàm thao tác DOM (nhấp chuột, cuộn trang, điền giá trị) để Agent có thể gọi khi nhận diện câu lệnh thoại.
*   **Orchestration & Handoffs:** Chuyển giao ngữ cảnh hội thoại linh hoạt giữa các Agent chuyên môn khi người dùng chuyển từ khai thủ tục "Đăng ký cư trú" sang "Cấp thẻ BHYT".
*   **Bảo mật & Phê duyệt:** Tích hợp bộ lọc PII che dấu thông tin trước khi chuyển tiếp văn bản thoại lên các tầng LLM ngoài biên giới.

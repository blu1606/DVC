# Phase 01: Thiết lập Python Agent Server & Khai báo Semantic Tools

## 🎯 Mục tiêu
Dựng khung máy chủ Backend bằng Python sử dụng **OpenAI Agents SDK** và khai báo các công cụ ngữ nghĩa (**Semantic Tools**) để tương tác DOM trực tiếp thay vì dùng CUA tọa độ phức tạp.

---

## 💻 Công nghệ sử dụng
*   Python 3.10+
*   OpenAI Agents SDK (`agents`)

---

## 📂 Các tệp tạo mới & sửa đổi
*   `[NEW]` `backend/agent_server.py` — Máy chủ tác nhân chứa khai báo các công cụ ngữ nghĩa.
*   `[NEW]` `backend/requirements.txt` — Quản lý dependencies.

---

## 📝 Các bước Triển khai chi tiết

### Bước 1: Cài đặt thư viện
```bash
pip install openai-agents python-dotenv websockets
```

### Bước 2: Viết mã nguồn Khai báo Semantic Tools (Python)
Thay vì sử dụng ảnh màn hình và click tọa độ `(x, y)` dễ sai lệch, Agent tương tác trực tiếp với các phần tử DOM thông qua tên Selector hoặc ID của thẻ.

```python
# backend/agent_server.py
import os
import json
import asyncio
from dotenv import load_dotenv
from agents import Agent, function_tool, Runner

load_dotenv()

# Định nghĩa cầu nối gửi lệnh xuống Chrome Extension (Xem chi tiết ở Phase 02)
class ExtensionBridge:
    def __init__(self):
        self.active_websocket = None

    async def send_command(self, action: str, params: dict):
        if not self.active_websocket:
            return {"status": "error", "message": "Extension chưa kết nối"}
        # Gửi sự kiện dạng JSON qua WebSocket
        await self.active_websocket.send(json.dumps({"action": action, **params}))
        response = await self.active_websocket.recv()
        return json.loads(response)

bridge = ExtensionBridge()

# ----------------------------------------------------
# ĐĂNG KÝ SEMANTIC TOOLS (Sử dụng Khóa Ngữ Nghĩa)
# ----------------------------------------------------

@function_tool
async def fill_field(field_name: str, value: str) -> dict:
    """
    Điền dữ liệu văn bản vào một trường thông tin trên form dịch vụ công.
    
    Args:
        field_name (str): Tên ngữ nghĩa của trường thông tin (ví dụ: 'fullname', 'birthday', 'cccd-num', 'phone', 'address').
        value (str): Giá trị văn bản cần nhập (ví dụ: 'NGUYỄN VĂN HÙNG').
    """
    print(f"[TOOL] Điền vào {field_name} giá trị: {value}")
    return await bridge.send_command("type_input", {"field_name": field_name, "text": value})

@function_tool
async def click_element(field_name: str) -> dict:
    """
    Click chuột vào một phần tử tương tác trên trang.
    
    Args:
        field_name (str): Tên ngữ nghĩa của nút cần click (ví dụ: 'btn-submit', 'btn-draft').
    """
    print(f"[TOOL] Click vào: {field_name}")
    return await bridge.send_command("click_button", {"field_name": field_name})

@function_tool
async def select_option(field_name: str, value: str) -> dict:
    """
    Chọn một tùy chọn trong menu thả xuống (dropdown).
    
    Args:
        field_name (str): Tên ngữ nghĩa của dropdown (ví dụ: 'province').
        value (str): Giá trị viết tắt của tỉnh/thành cần chọn (ví dụ: 'HCM', 'HN').
    """
    print(f"[TOOL] Chọn option {value} trên dropdown {field_name}")
    return await bridge.send_command("select_option", {"field_name": field_name, "value": value})

# Khởi tạo Agent với các tool ngữ nghĩa DOM
agent = Agent(
    name="ThongDVC_Brain",
    instructions=(
        "Bạn là trợ lý dịch vụ công hỗ trợ người cao tuổi Việt Nam điền biểu mẫu cư trú CT01. "
        "Hãy nhận diện yêu cầu của người dùng và sử dụng các công cụ điền form (fill_field, click_element, select_option) "
        "thông qua tên trường ngữ nghĩa để hoàn thành tờ khai chính xác."
    ),
    model="gpt-4o",
    tools=[fill_field, click_element, select_option]
)
```

---

## 🛠️ Tiêu chuẩn nghiệm thu (Success Criteria)
1.  Agent biên dịch thành công, các mô tả tham số của `@function_tool` tự động được chuyển hóa thành JSON Schema gửi lên OpenAI đúng chuẩn.
2.  Chạy thử nghiệm gọi hàm offline không gặp lỗi logic.

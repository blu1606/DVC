# Phase 02: Xây dựng Browser Bridge WebSocket đơn giản

## 🎯 Mục tiêu
Dựng máy chủ WebSocket trung gian (`websockets` Python) để đón nhận kết nối từ Chrome Extension và làm cầu nối chuyển tiếp các lệnh thực thi DOM.

---

## 💻 Công nghệ sử dụng
*   Python `websockets` package
*   Asynchronous Python (`asyncio`)

---

## 📂 Các tệp tạo mới & sửa đổi
*   `[NEW]` `backend/bridge_server.py` — File chạy WebSocket server độc lập hoặc gộp vào máy chủ agent.

---

## 📝 Các bước Triển khai chi tiết

### Bước 1: Hiện thực hóa Server WebSocket (Python)
Viết script chạy nền để giữ kết nối socket với Extension và cung cấp phương thức gửi lệnh phi đồng bộ.

```python
# backend/bridge_server.py
import asyncio
import websockets
import json

class BrowserBridgeServer:
    def __init__(self):
        self.client_socket = None
        self.response_future = None

    async def handler(self, websocket):
        # Lưu kết nối khi extension kết nối thành công
        self.client_socket = websocket
        print(f"Extension đã kết nối thành công từ: {websocket.remote_address}")
        
        try:
            async for message in websocket:
                data = json.loads(message)
                # Nhận kết quả phản hồi từ Extension sau khi thực hiện xong lệnh DOM
                if "status" in data and self.response_future:
                    self.response_future.set_result(data)
        except websockets.exceptions.ConnectionClosed:
            print("Extension ngắt kết nối!")
        finally:
            if self.client_socket == websocket:
                self.client_socket = None

    async def execute_action(self, action_type: str, params: dict) -> dict:
        if not self.client_socket:
            return {"status": "error", "message": "Chưa có Extension kết nối"}

        # Thiết lập future để nhận kết quả phi đồng bộ
        loop = asyncio.get_event_loop()
        self.response_future = loop.create_future()

        # Gửi sự kiện yêu cầu thao tác DOM
        payload = json.dumps({"action": action_type, **params})
        await self.client_socket.send(payload)

        # Chờ Extension thực thi và gửi kết quả về qua socket
        try:
            result = await asyncio.wait_for(self.response_future, timeout=5.0)
            return result
        except asyncio.TimeoutError:
            return {"status": "error", "message": "Thao tác DOM quá hạn phản hồi (Timeout)"}

# Khởi chạy server trên cổng 8000
async def main():
    bridge_server = BrowserBridgeServer()
    async with websockets.serve(bridge_server.handler, "localhost", 8000):
        await asyncio.Future() # Chạy vô hạn

if __name__ == "__main__":
    asyncio.run(main())
```

---

## 🛠️ Tiêu chuẩn nghiệm thu (Success Criteria)
1.  Chạy `python bridge_server.py` khởi động thành công trên cổng 8000 lắng nghe kết nối.
2.  Extension kết nối thành công, server in ra log: `Extension đã kết nối thành công`.

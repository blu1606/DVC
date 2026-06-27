"""
Phase 02 — Browser Bridge WebSocket Server
Làm cầu nối giữa Python Agent và Chrome Extension.

Sửa so với kế hoạch gốc:
  - Handler signature: bỏ tham số `path` (đã bị xóa từ websockets v14.0)
    Bản gốc:  async def handler(self, websocket, path)  → TypeError tại runtime
    Bản sửa:  async def handler(self, websocket)
  - Thêm method start() để dễ dàng chạy từ agent_server.py
  - Sử dụng websockets.ServerConnection thay vì legacy signature
"""

import asyncio
import json
import websockets
from websockets.server import ServerConnection


class BrowserBridgeServer:
    def __init__(self):
        self.client_socket: ServerConnection | None = None
        self.response_future: asyncio.Future | None = None

    # -------------------------------------------------------------------------
    # HANDLER — websockets v14+ chỉ nhận 1 tham số (bỏ `path`)
    # -------------------------------------------------------------------------
    async def handler(self, websocket: ServerConnection):   # ← FIX: bỏ `path`
        """Xử lý kết nối mới từ Chrome Extension."""
        self.client_socket = websocket
        print(f"[BRIDGE] Extension đã kết nối từ: {websocket.remote_address}")

        try:
            async for message in websocket:
                data = json.loads(message)
                # Nhận phản hồi từ Extension sau khi thực thi lệnh DOM
                if "status" in data and self.response_future and not self.response_future.done():
                    self.response_future.set_result(data)
        except websockets.exceptions.ConnectionClosed:
            print("[BRIDGE] Extension ngắt kết nối!")
        finally:
            if self.client_socket is websocket:
                self.client_socket = None

    # -------------------------------------------------------------------------
    # EXECUTE ACTION — gửi lệnh xuống Extension và chờ kết quả
    # -------------------------------------------------------------------------
    async def execute_action(self, action_type: str, params: dict) -> dict:
        """
        Gửi lệnh DOM xuống Extension qua WebSocket và chờ kết quả phản hồi.
        Timeout mặc định: 5 giây.
        """
        if not self.client_socket:
            return {"status": "error", "message": "Chưa có Extension nào kết nối"}

        loop = asyncio.get_event_loop()
        self.response_future = loop.create_future()

        payload = json.dumps({"action": action_type, **params})
        await self.client_socket.send(payload)

        try:
            result = await asyncio.wait_for(self.response_future, timeout=5.0)
            return result
        except asyncio.TimeoutError:
            return {"status": "error", "message": "Thao tác DOM vượt quá thời gian chờ (5s)"}
        finally:
            self.response_future = None

    # -------------------------------------------------------------------------
    # PROCESS REQUEST — xử lý HTTP request (ví dụ: cấp token) trước khi upgrade WebSocket
    # -------------------------------------------------------------------------
    async def process_request(self, connection, request):
        if request.path == "/token":
            import os
            import json
            import requests
            from http import HTTPStatus
            from websockets.http11 import Response
            from websockets.datastructures import Headers
            
            api_key = os.getenv("OPENAI_API_KEY")
            if not api_key:
                headers = Headers({
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"
                })
                body = json.dumps({"error": "OPENAI_API_KEY is not set in environment"}).encode("utf-8")
                return Response(500, "Internal Server Error", headers, body)
                
            url = "https://api.openai.com/v1/realtime/client_secrets"
            headers_api = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
            body_api = {
                "session": {
                    "type": "realtime",
                    "model": "gpt-realtime-2"
                }
            }
            try:
                def do_post():
                    return requests.post(url, headers=headers_api, json=body_api, timeout=10)
                
                resp = await asyncio.to_thread(do_post)
                
                if resp.status_code != 200:
                    headers = Headers({
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": "*"
                    })
                    return Response(resp.status_code, "Error from OpenAI", headers, resp.content)
                
                headers = Headers({
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "*",
                    "Access-Control-Allow-Methods": "GET, OPTIONS"
                })
                return Response(200, "OK", headers, resp.content)
            except Exception as e:
                headers = Headers({
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"
                })
                body = json.dumps({"error": str(e)}).encode("utf-8")
                return Response(500, "Internal Server Error", headers, body)
        return None

    # -------------------------------------------------------------------------
    # START — khởi động server (gọi từ agent_server.py)
    # -------------------------------------------------------------------------
    async def start(self, host: str = "localhost", port: int = 8000):
        """Khởi động WebSocket server và chạy vô hạn."""
        async with websockets.serve(self.handler, host, port, process_request=self.process_request):
            print(f"[BRIDGE] WebSocket server sẵn sàng tại ws://{host}:{port}")
            print(f"[BRIDGE] Token API server sẵn sàng tại http://{host}:{port}/token")
            await asyncio.Future()   # chạy mãi


# =============================================================================
# ENTRYPOINT — chạy độc lập nếu cần test bridge riêng
# =============================================================================
if __name__ == "__main__":
    server = BrowserBridgeServer()
    asyncio.run(server.start())

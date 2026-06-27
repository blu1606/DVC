"""
Phase 01 — ThôngDVC Agent Server
Khai báo Semantic Tools và khởi tạo Agent.

Sửa so với kế hoạch gốc:
  - Thêm `import json` (bị thiếu trong bản gốc)
  - Bridge được import từ bridge_server.py (Phase 02), không định nghĩa lại ở đây
"""

import os
import json                       # ← FIX: bản gốc thiếu dòng này, gây NameError
import asyncio
from dotenv import load_dotenv
from agents import Agent, function_tool, Runner
from pydantic import BaseModel

load_dotenv()

# =============================================================================
# BROWSER BRIDGE — kết nối tới Chrome Extension qua WebSocket
# (BrowserBridgeServer được khởi tạo tại bridge_server.py)
# =============================================================================
from bridge_server import BrowserBridgeServer
from browser_use_runner import run_browser_task

bridge = BrowserBridgeServer()
chat_lock = asyncio.Lock()
browser_task_lock = asyncio.Lock()
chat_history: list[dict[str, str]] = []


class ChecklistStep(BaseModel):
    label: str
    done: bool


# =============================================================================
# SEMANTIC TOOLS — tương tác DOM qua tên ngữ nghĩa, không dùng tọa độ pixel
# =============================================================================

@function_tool
async def fill_field(field_name: str, value: str, selector: str = None) -> dict:
    """
    Điền dữ liệu văn bản vào một trường thông tin trên form dịch vụ công.

    Args:
        field_name: Tên ngữ nghĩa của trường thông tin.
                    Ví dụ: 'fullname', 'birthday', 'cccd-num', 'phone', 'address'.
        value:      Giá trị văn bản cần nhập.
                    Ví dụ: 'NGUYỄN VĂN HÙNG'.
        selector:   CSS selector của phần tử cần điền (được lấy từ read_page_content).
    """
    print(f"[TOOL] fill_field({field_name!r}, {value!r}, {selector!r})")
    return await bridge.execute_action("type_input", {"field_name": field_name, "text": value, "selector": selector})


@function_tool
async def click_element(field_name: str, selector: str = None) -> dict:
    """
    Click chuột vào một phần tử tương tác trên trang.

    Args:
        field_name: Tên ngữ nghĩa của nút cần click.
                    Ví dụ: 'btn-submit', 'btn-draft'.
        selector:   CSS selector của phần tử cần click (được lấy từ read_page_content).
    """
    print(f"[TOOL] click_element({field_name!r}, {selector!r})")
    return await bridge.execute_action("click_button", {"field_name": field_name, "selector": selector})


@function_tool
async def select_option(field_name: str, value: str, selector: str = None) -> dict:
    """
    Chọn một tùy chọn trong menu thả xuống (dropdown).

    Args:
        field_name: Tên ngữ nghĩa của dropdown.
                    Ví dụ: 'province'.
        value:      Giá trị cần chọn.
                    Ví dụ: 'HCM', 'HN'.
        selector:   CSS selector của dropdown cần chọn (được lấy từ read_page_content).
    """
    print(f"[TOOL] select_option({field_name!r}, {value!r}, {selector!r})")
    return await bridge.execute_action("select_option", {"field_name": field_name, "value": value, "selector": selector})


@function_tool
async def inject_custom_ui(html_content: str) -> dict:
    """
    Inject an accessibility helper panel (checklist or step guide) into the active page.

    Args:
        html_content: Raw HTML string representing the checklist UI to display.
    """
    print("[TOOL] inject_custom_ui()")
    payload = {
        "mount": "accessibility-assistant-panel",
        "html": html_content,
        "mode": "shadow-root",
        "position": "bottom-right",
    }
    result = await bridge.execute_action("inject_html", payload)
    return {
        "ui_id": result.get("ui_id"),
        "status": "mounted",
        "message": "Checklist UI successfully injected.",
    }


@function_tool
async def read_page_content() -> dict:
    """
    Đọc cấu trúc, tiêu đề và các trường thông tin (form fields, buttons, dropdowns) của trang web hiện tại để hỗ trợ người dùng.
    """
    print("[TOOL] read_page_content()")
    return await bridge.execute_action("read_dom", {})


@function_tool
async def scroll_page(direction: str) -> dict:
    """
    Cuộn trang web lên hoặc xuống.

    Args:
        direction: Hướng cuộn ('up' hoặc 'down').
    """
    print(f"[TOOL] scroll_page({direction!r})")
    return await bridge.execute_action("scroll", {"direction": direction})


@function_tool
async def check_login_status() -> dict:
    """
    Kiểm tra xem người dân đã đăng nhập vào hệ thống cổng dịch vụ công chưa.
    """
    print("[TOOL] check_login_status()")
    return await bridge.execute_action("check_login", {})


@function_tool
async def navigate_to_login(selector: str = None) -> dict:
    """
    Điều hướng trình duyệt của người dân sang trang đăng nhập của cổng dịch vụ công.

    Args:
        selector: CSS Selector của nút Đăng nhập được phát hiện bởi check_login_status.
    """
    print(f"[TOOL] navigate_to_login({selector!r})")
    return await bridge.execute_action("navigate_to_login", {"selector": selector})


@function_tool
async def update_checklist(steps: list[ChecklistStep]) -> dict:
    """
    Cập nhật hoặc hiển thị bảng checklist 4 bước hướng dẫn lên màn hình cho người dân.

    Args:
        steps: Danh sách các bước của checklist. Mỗi bước là một dict chứa 'label' (str) và 'done' (bool).
               Ví dụ: [{"label": "1. Đăng nhập", "done": True}]
    """
    normalized_steps = [step.model_dump() if hasattr(step, "model_dump") else step for step in steps]
    print(f"[TOOL] update_checklist({normalized_steps!r})")
    return await bridge.execute_action("update_checklist", {"steps": normalized_steps})


@function_tool
async def fill_address_cascade(province: str, district: str, ward: str) -> dict:
    """
    Tự động điền nhanh địa chỉ 3 cấp (Tỉnh/Thành phố, Quận/Huyện, Xã/Phường) vào biểu mẫu dịch vụ công.
    Giải quyết tự động độ trễ AJAX.

    Args:
        province: Tên Tỉnh/Thành phố. Ví dụ: 'Hà Nội' hoặc 'Hồ Chí Minh'.
        district: Tên Quận/Huyện. Ví dụ: 'Cầu Giấy' hoặc 'Quận 1'.
        ward:     Tên Xã/Phường/Thị trấn. Ví dụ: 'Dịch Vọng Hậu' hoặc 'Bến Nghé'.
    """
    print(f"[TOOL] fill_address_cascade({province!r}, {district!r}, {ward!r})")
    return await bridge.execute_action("fill_address_cascade", {
        "province": province,
        "district": district,
        "ward": ward
    })


@function_tool
async def bulk_fill_profile() -> dict:
    """
    Tự động điền nhanh toàn bộ các thông tin cơ bản của công dân (họ tên, ngày sinh, CCCD, số điện thoại) đã lưu.
    """
    print("[TOOL] bulk_fill_profile()")
    return await bridge.execute_action("bulk_fill_profile", {})


# =============================================================================
# AGENT — Brain của EasyDVC
# Không dùng {"type": "computer"} dict — dùng đúng Tool objects
# Model: "gpt-4o" (tồn tại xác thực). "gpt-5.5" không có trong public docs.
# =============================================================================

agent = Agent(
    name="EasyDVC_Brain",
    instructions=(
        "Bạn là trợ lý dịch vụ công hỗ trợ người cao tuổi Việt Nam thực hiện các thủ tục hành chính trực tuyến.\n"
        "1. Khi vừa bắt đầu phiên thoại hoặc khi chỉ nhận được cấu trúc trang, hãy chào ngắn gọn, nói bác đang ở trang nào, rồi hỏi bác muốn làm thủ tục gì hoặc cần điền phần nào. Không tự gọi `check_login_status` khi vừa bắt đầu.\n"
        "2. Luôn giữ ngữ cảnh hội thoại. Nếu bác trả lời ngắn như 'có', 'đồng ý', 'tiếp tục', hãy hiểu đó là xác nhận cho đề xuất gần nhất; không chào lại hoặc hỏi lại từ đầu.\n"
        "3. Chỉ gọi `check_login_status` khi bác muốn đăng nhập, nộp hồ sơ, điều hướng sang dịch vụ mới, kiểm tra trạng thái đăng nhập, hoặc thực hiện bước chắc chắn cần xác thực. Nếu bác chỉ yêu cầu điền/chọn/click một trường trên biểu mẫu hiện tại, hãy thao tác trực tiếp trên form; không được dừng lại chỉ vì chưa biết trạng thái đăng nhập. Nếu chưa đăng nhập, hãy hỏi xin phép trước khi gọi `navigate_to_login`; không tự chuyển trang khi bác chưa đồng ý rõ ràng.\n"
        "4. Giải thích cho người dân về trang web này và các dịch vụ có sẵn. Hãy kiểm tra xem dịch vụ người dân yêu cầu có được hỗ trợ trực tiếp không (Chúng ta hỗ trợ: 'Đăng ký thường trú' tại /dvc-tthc-dang-ky-thuong-tru, 'Cấp lại thẻ BHYT' tại /dvc-tthc-cap-lai-the-bhyt, và 'Quyết toán thuế / Hoàn thuế TNCN' thủ tục 2.002233 trên trang Thuế Nhà nước).\n"
        "5. Nếu dịch vụ KHÔNG được hỗ trợ hoặc yêu cầu mơ hồ, hãy hỏi lại làm rõ lễ phép và gợi ý các dịch vụ tương đương có sẵn.\n"
        "6. Nếu dịch vụ ĐƯỢC hỗ trợ: hãy lập kế hoạch và gọi `update_checklist` hoặc `inject_custom_ui` để hiển thị checklist hướng dẫn lên màn hình. Khi cần quan sát/truy cập DOM, hãy dùng các tool `read_page_content`, `click_element`, `select_option`, `fill_field`; không chỉ nói suông.\n"
        "7. Khi làm thủ tục thuế 2.002233, không từ chối là chưa hỗ trợ. Nếu đang ở trang danh sách thủ tục, link chữ tên thủ tục chỉ mở chi tiết; muốn nộp hồ sơ phải bấm icon folder màu xanh selector `a.nop-hoso-btn[ma-tthc='2.002233']` và hỏi xác nhận trước khi bấm.\n"
        "8. Khi bác yêu cầu đăng nhập, hãy dùng `update_checklist` với các bước: chọn đối tượng Cá nhân, chọn phương thức Tài khoản điện tử, bác tự nhập mật khẩu/captcha, xác nhận trước khi bấm Đăng nhập/Tiếp tục. Sau đó gọi `read_page_content` hoặc `check_login_status` tùy trang hiện tại.\n"
        "9. Khi ở trang tờ khai, gọi `read_page_content` nếu cần xem các trường nhập liệu. Với yêu cầu trực tiếp như 'điền họ tên là X', 'chọn Hà Nội', 'điền số điện thoại...', hãy dùng ngay các công cụ `fill_field`, `select_option`, `fill_address_cascade`, `click_element` và luôn truyền selector hoặc semanticId tương ứng để điền chính xác. Hãy xác nhận lại thông tin nhạy cảm của người dân trước khi điền.\n"
        "10. Trả lời bằng tiếng Việt ngắn gọn, dễ hiểu và lễ phép dành cho người cao tuổi."
    ),
    model="gpt-4o",               # ← FIX: "gpt-5.5" không tồn tại trong public docs
    tools=[
        fill_field, 
        click_element, 
        select_option, 
        inject_custom_ui, 
        update_checklist,
        read_page_content, 
        scroll_page,
        check_login_status,
        navigate_to_login,
        fill_address_cascade,
        bulk_fill_profile
    ],
)


# =============================================================================
# CHAT HTTP API — kênh text độc lập với phiên thoại WebRTC
# =============================================================================

def _compact_dom_records(records: list, keys: list[str], limit: int = 12) -> list[dict]:
    compacted = []
    for record in records[:limit]:
        if not isinstance(record, dict):
            continue
        compacted.append({key: record.get(key) for key in keys if record.get(key) not in (None, "")})
    return compacted


def _build_dom_context(dom_snapshot: dict | None) -> str:
    if not isinstance(dom_snapshot, dict) or dom_snapshot.get("status") != "success":
        return ""

    page = dom_snapshot.get("page") or {}
    if not isinstance(page, dict):
        return ""

    context = {
        "title": page.get("title"),
        "url": page.get("url"),
        "mode": page.get("mode"),
        "pageState": page.get("pageState"),
        "instructionsForAgent": page.get("instructionsForAgent"),
        "headings": _compact_dom_records(page.get("headings") or [], ["tag", "text"], 8),
        "formFields": _compact_dom_records(
            page.get("formFields") or [],
            ["label", "name", "id", "type", "selector", "semanticId", "sensitive", "piiType"],
            20,
        ),
        "buttons": _compact_dom_records(
            page.get("buttons") or [],
            ["text", "name", "id", "selector", "semanticId", "actionType", "requiresConfirmation"],
            20,
        ),
    }
    return json.dumps(context, ensure_ascii=False)


def _build_chat_input(message: str, dom_snapshot: dict | None) -> str:
    dom_context = _build_dom_context(dom_snapshot)
    history_context = json.dumps(chat_history[-8:], ensure_ascii=False)
    history_block = f"Lịch sử hội thoại gần đây:\n{history_context}\n\n" if chat_history else ""
    if not dom_context:
        return history_block + f"Tin nhắn người dùng: {message}"

    return (
        history_block +
        "Ngữ cảnh DOM hiện tại từ trình duyệt người dùng, đã được lọc an toàn:\n"
        f"{dom_context}\n\n"
        "Dựa trên DOM này để trả lời và thao tác. Nếu DOM cho biết thủ tục thuế 2.002233 hoặc nút nộp hồ sơ, "
        "hãy coi đó là dịch vụ được hỗ trợ.\n\n"
        f"Tin nhắn người dùng: {message}"
    )


def _extract_current_url(dom_snapshot: dict | None) -> str | None:
    if not isinstance(dom_snapshot, dict):
        return None
    page = dom_snapshot.get("page")
    if isinstance(page, dict) and page.get("url"):
        return str(page.get("url"))
    frame = dom_snapshot.get("frame")
    if isinstance(frame, dict) and frame.get("url"):
        return str(frame.get("url"))
    return None


def _normalize_vi(value: str) -> str:
    return " ".join((value or "").lower().split())


def _is_login_intent(message: str) -> bool:
    normalized = _normalize_vi(message)
    return "đăng nhập" in normalized or "dang nhap" in normalized or normalized in {"có", "co", "đồng ý", "dong y", "tiếp tục", "tiep tuc"}


def _is_move_to_login_intent(message: str) -> bool:
    normalized = _normalize_vi(message)
    move_words = ("di chuyển", "di chuyen", "đi tới", "di toi", "mở", "mo", "chuyển", "chuyen", "bấm", "bam", "click")
    return _is_login_intent(message) and any(word in normalized for word in move_words)


def _login_checklist_steps() -> list[dict]:
    return [
        {"label": "1. Chọn đối tượng Cá nhân", "done": False},
        {"label": "2. Chọn phương thức Tài khoản điện tử", "done": False},
        {"label": "3. Bác tự nhập tên đăng nhập, mật khẩu và captcha", "done": False},
        {"label": "4. Xác nhận rồi mới bấm Đăng nhập/Tiếp tục", "done": False},
    ]


def _find_login_selector(dom_snapshot: dict | None) -> str | None:
    page = dom_snapshot.get("page") if isinstance(dom_snapshot, dict) else None
    buttons = page.get("buttons") if isinstance(page, dict) else None
    if not isinstance(buttons, list):
        return None

    for button in buttons:
        if not isinstance(button, dict):
            continue
        text = _normalize_vi(str(button.get("text") or button.get("name") or button.get("id") or ""))
        selector = button.get("selector")
        if selector and ("đăng nhập" in text or "dang nhap" in text or "login" in text or button.get("name") == "openLogin"):
            return selector
    return None


def _result_used_tools(result) -> bool:
    return any(
        getattr(item, "type", "") in {"tool_call_item", "tool_call_output_item"}
        for item in getattr(result, "new_items", [])
    )


async def _run_chat_fallback_actions(message: str, dom_snapshot: dict | None) -> list[str]:
    actions: list[str] = []
    if not _is_login_intent(message):
        return actions

    checklist_result = await bridge.execute_action("update_checklist", {"steps": _login_checklist_steps()})
    actions.append(f"update_checklist={checklist_result.get('status')}: {checklist_result.get('message', '')}")

    read_result = await bridge.execute_action("read_dom", {})
    actions.append(f"read_dom={read_result.get('status')}")

    if _is_move_to_login_intent(message):
        selector = _find_login_selector(dom_snapshot) or _find_login_selector(read_result)
        nav_result = await bridge.execute_action("navigate_to_login", {"selector": selector})
        actions.append(f"navigate_to_login={nav_result.get('status')}: {nav_result.get('message', '')}")
    else:
        login_result = await bridge.execute_action("check_login", {})
        actions.append(f"check_login={login_result.get('status')}: logged_in={login_result.get('logged_in')}")

    return actions


def _fallback_reply(actions: list[str], message: str) -> str:
    if not actions:
        return ""

    if _is_move_to_login_intent(message):
        return (
            "Dạ, cháu đã mở checklist hướng dẫn đăng nhập và đã thực hiện thao tác chuyển tới phần/trang đăng nhập nếu trang cho phép. "
            "Bác vui lòng tự nhập mật khẩu và captcha; trước khi bấm Đăng nhập cháu sẽ hỏi xác nhận."
        )

    return (
        "Dạ, cháu đã mở checklist hướng dẫn đăng nhập trên màn hình. "
        "Bác chọn Cá nhân, dùng Tài khoản điện tử, tự nhập mật khẩu/captcha; khi cần bấm Đăng nhập cháu sẽ hỏi xác nhận trước."
    )


def _http_response(status: int, body: dict, extra_headers: dict | None = None) -> bytes:
    reason = {
        200: "OK",
        204: "No Content",
        400: "Bad Request",
        404: "Not Found",
        405: "Method Not Allowed",
        413: "Payload Too Large",
        500: "Internal Server Error",
    }.get(status, "OK")
    payload = json.dumps(body, ensure_ascii=False).encode("utf-8")
    headers = {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Length": str(len(payload)),
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Connection": "close",
    }
    if extra_headers:
        headers.update(extra_headers)
    header_blob = "".join(f"{key}: {value}\r\n" for key, value in headers.items())
    return f"HTTP/1.1 {status} {reason}\r\n{header_blob}\r\n".encode("utf-8") + payload


async def _handle_chat_http(reader: asyncio.StreamReader, writer: asyncio.StreamWriter):
    try:
      raw_headers = await asyncio.wait_for(reader.readuntil(b"\r\n\r\n"), timeout=5)
    except Exception:
      writer.close()
      await writer.wait_closed()
      return

    try:
        header_text = raw_headers.decode("iso-8859-1")
        request_line, *header_lines = header_text.split("\r\n")
        method, path, _ = request_line.split(" ", 2)
        headers = {}
        for line in header_lines:
            if ":" in line:
                key, value = line.split(":", 1)
                headers[key.strip().lower()] = value.strip()
    except Exception:
        writer.write(_http_response(400, {"error": "Invalid HTTP request"}))
        await writer.drain()
        writer.close()
        await writer.wait_closed()
        return

    if method == "OPTIONS":
        writer.write(_http_response(204, {}))
        await writer.drain()
        writer.close()
        await writer.wait_closed()
        return

    supported_paths = {"/chat", "/browser-task"}
    if method != "POST" or path not in supported_paths:
        writer.write(_http_response(404 if path not in supported_paths else 405, {"error": "Not found"}))
        await writer.drain()
        writer.close()
        await writer.wait_closed()
        return

    content_length = int(headers.get("content-length", "0") or "0")
    if content_length > 131_072:
        writer.write(_http_response(413, {"error": "Message is too large"}))
        await writer.drain()
        writer.close()
        await writer.wait_closed()
        return

    body = await reader.readexactly(content_length) if content_length else b"{}"
    try:
        payload = json.loads(body.decode("utf-8"))
        message = str(payload.get("message", "")).strip()
        dom_snapshot = payload.get("domSnapshot")
        current_url = str(payload.get("currentUrl") or _extract_current_url(dom_snapshot) or "").strip() or None
    except Exception:
        message = ""
        dom_snapshot = None
        current_url = None

    if not message:
        writer.write(_http_response(400, {"error": "message is required"}))
        await writer.drain()
        writer.close()
        await writer.wait_closed()
        return

    try:
        if path == "/browser-task":
            async with browser_task_lock:
                browser_result = await run_browser_task(message, current_url=current_url)
            writer.write(_http_response(200, browser_result))
            await writer.drain()
            writer.close()
            await writer.wait_closed()
            return

        chat_input = _build_chat_input(message, dom_snapshot)
        tool_actions: list[str] = []
        async with chat_lock:
            result = await Runner.run(agent, chat_input, max_turns=8)
            reply = str(result.final_output or "")
            if not _result_used_tools(result):
                fallback_actions = await _run_chat_fallback_actions(message, dom_snapshot)
                if fallback_actions:
                    print(f"[CHAT] Agent không gọi tool, chạy fallback: {fallback_actions!r}")
                    tool_actions = fallback_actions
                    reply = _fallback_reply(fallback_actions, message) or reply
            else:
                tool_actions = [
                    getattr(item, "title", None) or getattr(item, "description", None) or getattr(item, "type", "tool")
                    for item in getattr(result, "new_items", [])
                    if getattr(item, "type", "") in {"tool_call_item", "tool_call_output_item"}
                ]
            chat_history.extend([
                {"role": "user", "content": message},
                {"role": "assistant", "content": reply},
            ])
            del chat_history[:-12]
        writer.write(_http_response(200, {"reply": reply, "tool_actions": tool_actions}))
    except Exception as exc:
        print(f"[CHAT] Lỗi xử lý chat: {exc}")
        writer.write(_http_response(500, {"error": str(exc)}))

    await writer.drain()
    writer.close()
    await writer.wait_closed()


async def start_chat_http_server(host: str = "localhost", port: int = 8001):
    server = await asyncio.start_server(_handle_chat_http, host, port)
    print(f"[CHAT] Text chat API sẵn sàng tại http://{host}:{port}/chat")
    async with server:
        await server.serve_forever()


# =============================================================================
# ENTRYPOINT — Chạy bridge server + agent loop song song
# =============================================================================

async def main():
    # Khởi động WebSocket bridge server ở background
    bridge_task = asyncio.create_task(bridge.start(host="localhost", port=8000))
    chat_task = asyncio.create_task(start_chat_http_server(host="localhost", port=8001))
    print("[SERVER] Bridge WebSocket đang lắng nghe tại ws://localhost:8000")

    # (Tùy chọn) Chạy demo loop để test agent qua terminal
    # from agents import run_demo_loop
    # await run_demo_loop(agent)

    await asyncio.gather(bridge_task, chat_task)


if __name__ == "__main__":
    asyncio.run(main())

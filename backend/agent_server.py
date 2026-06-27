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

load_dotenv()

# =============================================================================
# BROWSER BRIDGE — kết nối tới Chrome Extension qua WebSocket
# (BrowserBridgeServer được khởi tạo tại bridge_server.py)
# =============================================================================
from bridge_server import BrowserBridgeServer

bridge = BrowserBridgeServer()


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
async def update_checklist(steps: list) -> dict:
    """
    Cập nhật hoặc hiển thị bảng checklist 4 bước hướng dẫn lên màn hình cho người dân.

    Args:
        steps: Danh sách các bước của checklist. Mỗi bước là một dict chứa 'label' (str) và 'done' (bool).
               Ví dụ: [{"label": "1. Đăng nhập", "done": True}]
    """
    print(f"[TOOL] update_checklist({steps!r})")
    return await bridge.execute_action("update_checklist", {"steps": steps})


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
# AGENT — Brain của ThôngDVC
# Không dùng {"type": "computer"} dict — dùng đúng Tool objects
# Model: "gpt-4o" (tồn tại xác thực). "gpt-5.5" không có trong public docs.
# =============================================================================

agent = Agent(
    name="ThongDVC_Brain",
    instructions=(
        "Bạn là trợ lý dịch vụ công hỗ trợ người cao tuổi Việt Nam thực hiện các thủ tục hành chính trực tuyến.\n"
        "1. Khi vừa bắt đầu phiên thoại hoặc khi chỉ nhận được cấu trúc trang, hãy chào ngắn gọn, nói bác đang ở trang nào, rồi hỏi bác muốn làm thủ tục gì hoặc cần điền phần nào. Không tự gọi `check_login_status` khi vừa bắt đầu.\n"
        "2. Chỉ gọi `check_login_status` khi bác đã chọn một thủ tục cụ thể hoặc yêu cầu thao tác như điền hồ sơ, nộp hồ sơ, đăng nhập, kiểm tra trạng thái đăng nhập. Nếu chưa đăng nhập, hãy hỏi xin phép trước khi gọi `navigate_to_login`; không tự chuyển trang khi bác chưa đồng ý rõ ràng.\n"
        "3. Giải thích cho người dân về trang web này và các dịch vụ có sẵn. Hãy kiểm tra xem dịch vụ người dân yêu cầu có được hỗ trợ trực tiếp không (Chúng ta hỗ trợ: 'Đăng ký thường trú' tại /dvc-tthc-dang-ky-thuong-tru, và 'Cấp lại thẻ BHYT' tại /dvc-tthc-cap-lai-the-bhyt).\n"
        "4. Nếu dịch vụ KHÔNG được hỗ trợ hoặc yêu cầu mơ hồ, hãy hỏi lại làm rõ (Ask Back) lễ phép và gợi ý các dịch vụ tương đương có sẵn.\n"
        "5. Nếu dịch vụ ĐƯỢC hỗ trợ: Hãy lập kế hoạch, gọi `inject_custom_ui` để hiển thị checklist 4 bước hướng dẫn lên màn hình, tự động điều hướng hoặc hướng dẫn người dân vào đúng trang tờ khai sau khi đã rõ ý định của bác.\n"
        "6. Khi ở trang tờ khai, gọi `read_page_content` để xem các trường nhập liệu. Giúp người dân điền form bằng các công cụ (fill_field, click_element, select_option) và luôn truyền selector tương ứng để điền chính xác. Hãy xác nhận lại thông tin nhạy cảm của người dân trước khi điền. Khi điền địa chỉ hành chính 3 cấp, hãy luôn ưu tiên sử dụng `fill_address_cascade` thay vì điền lẻ tẻ. Bác cũng có thể gọi `bulk_fill_profile` để điền nhanh các thông tin cá nhân cơ bản.\n"
        "7. Trả lời bằng tiếng Việt ngắn gọn, dễ hiểu và lễ phép dành cho người cao tuổi."
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
# ENTRYPOINT — Chạy bridge server + agent loop song song
# =============================================================================

async def main():
    # Khởi động WebSocket bridge server ở background
    bridge_task = asyncio.create_task(bridge.start(host="localhost", port=8000))
    print("[SERVER] Bridge WebSocket đang lắng nghe tại ws://localhost:8000")

    # (Tùy chọn) Chạy demo loop để test agent qua terminal
    # from agents import run_demo_loop
    # await run_demo_loop(agent)

    await bridge_task


if __name__ == "__main__":
    asyncio.run(main())

from __future__ import annotations

import unicodedata
from typing import Any


TAX_PROCEDURE_CODE = "2.002233"
TAX_SUBMIT_SELECTOR = "a.nop-hoso-btn[ma-tthc='2.002233']"


def normalize_vi(value: str) -> str:
    text = unicodedata.normalize("NFD", value or "")
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    text = text.replace("đ", "d").replace("Đ", "D")
    return " ".join(text.lower().split())


def _page_from_snapshot(dom_snapshot: dict | None) -> dict:
    if not isinstance(dom_snapshot, dict):
        return {}
    page = dom_snapshot.get("page")
    return page if isinstance(page, dict) else {}


def _iter_values(value: Any):
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from _iter_values(child)
    elif isinstance(value, list):
        for item in value:
            yield from _iter_values(item)


def _find_selector(dom_snapshot: dict | None, predicate) -> str | None:
    for record in _iter_values(dom_snapshot):
        selector = record.get("selector")
        if selector and predicate(record):
            return str(selector)
    return None


def _find_tax_submit_selector(dom_snapshot: dict | None) -> str | None:
    found_tax_procedure = False
    fallback_selector = None
    for record in _iter_values(dom_snapshot):
        haystack = normalize_vi(" ".join(str(record.get(key) or "") for key in ("selector", "text", "label", "name", "id", "semanticId")))
        if TAX_PROCEDURE_CODE in haystack:
            found_tax_procedure = True
        selector = record.get("selector")
        if selector and ("nop-hoso-btn" in haystack or "nop ho so" in haystack or TAX_PROCEDURE_CODE in haystack):
            fallback_selector = str(selector)
            if "nop-hoso-btn" in haystack:
                return fallback_selector
    if fallback_selector:
        return fallback_selector
    return TAX_SUBMIT_SELECTOR if found_tax_procedure else None


def _find_login_selector(dom_snapshot: dict | None) -> str | None:
    def matches(record: dict) -> bool:
        haystack = normalize_vi(" ".join(str(record.get(key) or "") for key in ("text", "label", "name", "id", "semanticId")))
        return "dang nhap" in haystack or "login" in haystack or record.get("name") == "openLogin"

    return _find_selector(dom_snapshot, matches)


def classify_intent(message: str, chat_history: list[dict[str, str]] | None = None) -> dict:
    normalized = normalize_vi(message)
    short_confirm = normalized in {"co", "dong y", "tiep tuc", "ok", "oke", "dung roi"}
    last_assistant = ""
    for item in reversed(chat_history or []):
        if item.get("role") == "assistant":
            last_assistant = normalize_vi(item.get("content", ""))
            break

    inherited = last_assistant if short_confirm else ""
    wants_login = "dang nhap" in normalized or (short_confirm and "dang nhap" in inherited)
    wants_tax = any(keyword in normalized for keyword in ("thue", "tncn", "quyet toan", "hoan thue", TAX_PROCEDURE_CODE)) or (
        short_confirm and any(keyword in inherited for keyword in ("thue", "tncn", "quyet toan", "hoan thue", TAX_PROCEDURE_CODE))
    )
    wants_move = any(keyword in normalized for keyword in ("di chuyen", "di toi", "mo", "chuyen", "bam", "click", "toi trang"))
    wants_browser_agent = any(keyword in normalized for keyword in ("browser use", "browser agent", "chrome rieng", "trinh duyet rieng", "tu browse"))
    wants_happy_demo = any(keyword in normalized for keyword in (
        "happy case",
        "happycase",
        "chay demo",
        "demo happy",
        "demo dien",
        "dien mau",
        "test luong chat",
    ))
    return {
        "normalized": normalized,
        "wants_login": wants_login,
        "wants_tax": wants_tax,
        "wants_move": wants_move,
        "wants_browser_agent": wants_browser_agent,
        "wants_happy_demo": wants_happy_demo,
        "short_confirm": short_confirm,
        "inherited_context": bool(inherited),
    }


def build_preflight_state(
    message: str,
    dom_snapshot: dict | None,
    login_result: dict | None = None,
    current_url: str | None = None,
    chat_history: list[dict[str, str]] | None = None,
) -> dict:
    page = _page_from_snapshot(dom_snapshot)
    intent = classify_intent(message, chat_history)
    url = current_url or page.get("url") or ""
    title = page.get("title") or ""
    login_state = "unknown"
    if isinstance(login_result, dict) and login_result.get("status") == "success":
        login_state = "logged_in" if login_result.get("logged_in") else "login_required"

    normalized_url = normalize_vi(str(url))
    page_state = "unknown"
    if login_state == "logged_in":
        page_state = "logged_in"
    elif "login" in normalized_url or "dang-nhap" in normalized_url:
        page_state = "login"
    elif TAX_PROCEDURE_CODE in normalized_url or "maTTHC=2.002233" in str(url):
        page_state = "procedure_detail"
    elif "thu-tuc-hanh-chinh" in normalized_url:
        page_state = "procedure_list"

    return {
        "intent": intent,
        "page": {
            "url": url,
            "title": title,
            "state": page_state,
            "mode": page.get("mode"),
            "pageState": page.get("pageState"),
        },
        "login": {
            "state": login_state,
            "selector": login_result.get("login_selector") if isinstance(login_result, dict) else _find_login_selector(dom_snapshot),
        },
        "selectors": {
            "login": _find_login_selector(dom_snapshot),
            "tax_submit": _find_tax_submit_selector(dom_snapshot),
        },
        "has_dom": isinstance(dom_snapshot, dict) and dom_snapshot.get("status") == "success",
    }


def _step(step_id: str, label: str, status: str, tool: str = "none", **extra) -> dict:
    return {
        "id": step_id,
        "label": label,
        "status": status,
        "done": status == "done",
        "tool": tool,
        **{key: value for key, value in extra.items() if value not in (None, "")},
    }


def _plan(goal: str, preflight: dict, steps: list[dict], reply: str, **extra) -> dict:
    current_step = next((step for step in steps if step.get("status") == "current"), None)
    blocked_step = next((step for step in steps if step.get("status") == "blocked"), None)
    return {
        "goal": goal,
        "page": preflight.get("page", {}),
        "steps": steps,
        "next_step_id": (current_step or blocked_step or {}).get("id"),
        "needs_user_confirmation": bool((current_step or blocked_step or {}).get("requires_confirmation")),
        "reply": reply,
        **extra,
    }


def build_action_plan(message: str, preflight: dict) -> dict | None:
    intent = preflight.get("intent", {})
    login_state = preflight.get("login", {}).get("state")
    tax_selector = preflight.get("selectors", {}).get("tax_submit")

    if intent.get("wants_browser_agent") and not preflight.get("has_dom"):
        return _plan(
            "Dùng browser agent dự phòng",
            preflight,
            [_step("browser_agent", "Mở browser agent dự phòng", "current", "browser_task")],
            "Dạ, DOM hiện tại chưa đủ để thao tác. Cháu sẽ chuyển sang browser agent dự phòng nếu backend đã bật tính năng này.",
            use_browser_agent=True,
        )

    if intent.get("wants_happy_demo"):
        steps = [
            _step("read_dom", "Đọc trang mock thường trú", "done", "read_dom"),
            _step(
                "fill_profile",
                "Điền thông tin công dân mẫu",
                "current",
                "bulk_fill_profile",
                payload={
                    "fullname": "NGUYỄN VĂN HÙNG",
                    "birthday": "15/05/1955",
                    "cccd": "037155001234",
                    "phone": "0987654321",
                },
            ),
            _step(
                "fill_address",
                "Chọn địa chỉ Hà Nội - Cầu Giấy - Dịch Vọng Hậu",
                "todo",
                "fill_address_cascade",
                payload={
                    "province": "Hà Nội",
                    "district": "Cầu Giấy",
                    "ward": "Dịch Vọng Hậu",
                },
            ),
            _step("review", "Bác kiểm tra lại thông tin đã điền", "todo", "none"),
            _step(
                "submit_guard",
                "Không tự bấm Nộp hồ sơ",
                "blocked",
                "none",
                sensitive=True,
                reason="Demo dừng trước hành động nộp hồ sơ.",
            ),
        ]
        return _plan(
            "Demo happy case điền hồ sơ thường trú",
            preflight,
            steps,
            "Dạ, cháu sẽ chạy demo happy case: điền thông tin mẫu, chọn địa chỉ 3 cấp, rồi dừng lại để bác kiểm tra; cháu chưa bấm Nộp hồ sơ.",
            auto_execute=True,
        )

    if intent.get("wants_login") and login_state == "logged_in":
        steps = [
            _step("check_login", "Xác nhận bác đã đăng nhập", "done", "check_login"),
            _step(
                "continue_tax",
                "Tiếp tục tới thủ tục thuế TNCN nếu bác muốn",
                "current",
                "click_element" if tax_selector else "none",
                selector=tax_selector,
                requires_confirmation=bool(tax_selector),
                sensitive=True,
            ),
        ]
        return _plan(
            "Tiếp tục sau đăng nhập",
            preflight,
            steps,
            "Dạ, bác đã đăng nhập rồi nên không cần đăng nhập lại. Nếu bác muốn làm hồ sơ thuế, cháu sẽ chuyển sang bước mở thủ tục thuế TNCN và sẽ hỏi xác nhận trước khi bấm.",
        )

    if intent.get("wants_login"):
        steps = [
            _step("open_login", "Mở trang hoặc khung đăng nhập", "done" if preflight.get("page", {}).get("state") == "login" else "current", "navigate_to_login", selector=preflight.get("selectors", {}).get("login")),
            _step("choose_person", "Chọn đối tượng Cá nhân", "todo", "click_element"),
            _step("choose_account", "Chọn phương thức Tài khoản điện tử", "todo", "click_element"),
            _step("user_secrets", "Bác tự nhập mật khẩu và captcha", "blocked", "none", sensitive=True, reason="AI không đọc hoặc nhập mật khẩu/captcha."),
            _step("confirm_login", "Xác nhận trước khi bấm Đăng nhập/Tiếp tục", "todo", "click_element", requires_confirmation=True, sensitive=True),
        ]
        return _plan(
            "Đăng nhập Dịch vụ công Thuế",
            preflight,
            steps,
            "Dạ, cháu đã lập checklist đăng nhập. Bác tự nhập mật khẩu/captcha trên trang; trước khi bấm Đăng nhập hoặc Tiếp tục cháu sẽ hỏi xác nhận.",
        )

    if intent.get("wants_tax"):
        if login_state == "login_required":
            steps = [
                _step("check_login", "Kiểm tra trạng thái đăng nhập", "done", "check_login"),
                _step("login_required", "Đăng nhập trước khi nộp hồ sơ thuế", "current", "navigate_to_login", selector=preflight.get("selectors", {}).get("login")),
                _step("open_tax", "Mở thủ tục quyết toán thuế TNCN", "todo", "click_element", selector=tax_selector, requires_confirmation=True, sensitive=True),
            ]
            return _plan(
                "Chuẩn bị hồ sơ thuế TNCN",
                preflight,
                steps,
                "Dạ, để làm hồ sơ thuế bác cần đăng nhập trước. Cháu đã chuẩn bị bước đăng nhập và sẽ không bấm hành động nhạy cảm khi chưa được bác xác nhận.",
            )

        steps = [
            _step("read_dom", "Đọc trang thủ tục đã index", "done", "read_dom"),
            _step("open_tax", "Mở nút nộp hồ sơ thủ tục 2.002233", "current", "click_element", selector=tax_selector, requires_confirmation=True, sensitive=True),
            _step("fill_tax_form", "Hướng dẫn điền tờ khai thuế", "todo", "none"),
        ]
        return _plan(
            "Mở hồ sơ thuế TNCN",
            preflight,
            steps,
            "Dạ, cháu đã thấy thủ tục thuế TNCN. Để nộp hồ sơ phải bấm icon folder màu xanh, không bấm vào chữ chi tiết. Bác xác nhận thì cháu mới bấm.",
        )

    return None

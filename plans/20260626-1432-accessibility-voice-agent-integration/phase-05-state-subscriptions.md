# Phase 05: Thiết lập Tool sinh Checklist UI (Shadow DOM)

## 🎯 Mục tiêu
Khai báo công cụ `inject_custom_ui` dưới dạng một công cụ (Tool) hiển thị của Agent. Khi được gọi, Extension sẽ lọc mã độc (Sanitize), tiêm cấu trúc giao diện vào Shadow DOM và quản lý vòng đời UI thông qua mã định danh `ui_id`.

---

## 💻 Công nghệ sử dụng
*   OpenAI Agents SDK (`function_tool`)
*   Web APIs (Shadow Root, DOM elements)
*   DOMPurify (hoặc thư viện khử độc HTML local đơn giản)

---

## 📂 Các tệp tạo mới & sửa đổi
*   `[MODIFY]` `backend/agent_server.py` — Khai báo `inject_custom_ui` tool và bọc vào Agent.
*   `[MODIFY]` `extension/content.js` — Nhận sự kiện tiêm đè HTML và bọc trong Shadow DOM.

---

## 📝 Các bước Triển khai chi tiết

### Bước 1: Khai báo Tool `inject_custom_ui` (Python Backend)
Định nghĩa công cụ và mô tả chi tiết để mô hình AI biết khi nào cần dùng để hiển thị giao diện checklist hướng dẫn.

```python
# backend/agent_server.py
from agents import function_tool

# Cầu nối BrowserBridge đã khởi tạo từ Phase 02
browser_bridge = BrowserBridge()

@function_tool
async def inject_custom_ui(html_content: str) -> dict:
    """
    Inject an accessibility helper panel (like a checklist or step guide) into the active page.
    
    Args:
        html_content (str): The raw HTML content representing the checklist UI.
    """
    payload = {
        "mount": "accessibility-assistant-panel",
        "html": html_content,
        "mode": "shadow-root",
        "position": "bottom-right"
    }
    
    # Gửi lệnh tiêm HTML xuống Extension qua WebSocket
    result = await browser_bridge.request("inject_html", payload)
    
    return {
      "ui_id": result.get("ui_id"),
      "status": "mounted",
      "message": "Checklist UI successfully injected."
    }

# Đăng ký tool vào Agent
agent = Agent(
    name="ThongDVC_Brain",
    model="gpt-4o",
    tools=[inject_custom_ui] # Tích hợp UI Tool
)
```

### Bước 2: Nhận diện và tiêm đè Shadow DOM (Client Extension)
Extension nhận lệnh, khử độc chuỗi HTML và dựng hộp thoại đè lên trang web dịch vụ công:

```javascript
// extension/content.js

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "INJECT_HTML") {
    const { html, mount, mode } = message.payload;
    
    // 1. Tạo hoặc lấy thẻ host
    let host = document.getElementById(mount);
    if (!host) {
      host = document.createElement("div");
      host.id = mount;
      document.body.appendChild(host);
    }

    // 2. Thiết lập Shadow Root (nếu chế độ yêu cầu)
    let container = host;
    if (mode === "shadow-root") {
      container = host.shadowRoot || host.attachShadow({ mode: "open" });
    }

    // 3. Khử độc mã độc trước khi tiêm đè (Sanitization)
    const cleanHTML = sanitizeHTML(html);

    // 4. Dựng giao diện
    container.innerHTML = cleanHTML;
    
    // 5. Trả về mã ID đại diện để theo dõi
    sendResponse({ ui_id: "ui_checklist_active" });
  }
});

function sanitizeHTML(htmlString) {
  // Demo đơn giản: Loại bỏ các thẻ <script> nguy hiểm
  return htmlString.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
}
```

---

## 🛠️ Tiêu chuẩn nghiệm thu (Success Criteria)
1.  Agent gọi `inject_custom_ui` với nội dung chuỗi HTML checklist $\rightarrow$ Trình duyệt hiển thị lớp phủ Shadow DOM chuẩn xác.
2.  Dù CSS của trang dịch vụ công gốc có quy định định dạng trùng lặp, giao diện checklist của ThôngDVC vẫn hiển thị đúng cấu trúc phong cách thiết kế riêng (font chữ to, tương phản cao) không bị lỗi hiển thị.

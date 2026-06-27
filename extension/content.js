/**
 * Phase 03 — Chrome Extension Content Script
 * Nhận lệnh từ WebSocket Bridge và thực thi thao tác DOM.
 *
 * Không có lỗi so với kế hoạch gốc. File này giữ nguyên.
 */

// Ánh xạ ngữ nghĩa → CSS Selector (nhất quán với form-mappings.json)
const FIELD_MAPPINGS = {
  "fullname":   "input#fullname",
  "name":       "input#fullname",
  "birthday":   "input#birthday",
  "birth":      "input#birthday",
  "cccd-num":   "input#cccd-num",
  "cccd":       "input#cccd-num",
  "phone":      "input#phone",
  "tel":        "input#phone",
  "province":   "select#prov",
  "city":       "select#prov",
  "address":    "input#address",
  "btn-submit": "button#btn-submit",
  "submit":     "button#btn-submit",
};

// ─────────────────────────────────────────────────────────────────────────────
// KẾT NỐI WEBSOCKET ĐẾN BRIDGE SERVER
// ─────────────────────────────────────────────────────────────────────────────
const socket = new WebSocket("ws://localhost:8000");

socket.addEventListener("open", () => {
  console.log("[EasyDVC] Extension đã kết nối với Bridge Server.");
});

socket.addEventListener("message", async (event) => {
  let command;
  try {
    command = JSON.parse(event.data);
  } catch (e) {
    console.error("[EasyDVC] JSON không hợp lệ:", event.data);
    return;
  }

  const result = await handleCommand(command);
  socket.send(JSON.stringify(result));
});

socket.addEventListener("close", () => {
  console.warn("[EasyDVC] Mất kết nối với Bridge Server.");
});

// Lắng nghe lệnh trực tiếp từ Extension Popup (cho WebRTC client-side)
if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    handleCommand(message).then(response => {
      sendResponse(response);
    }).catch(err => {
      sendResponse({ status: "error", message: err.message });
    });
    return true; // Giữ kết nối sendResponse không bị ngắt vì xử lý async
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// XỬ LÝ LỆNH DOM
// ─────────────────────────────────────────────────────────────────────────────
async function handleCommand(command) {
  console.log("[ThôngDVC] Nhận lệnh:", command);
  const { action, field_name, text, value, html, mount, mode } = command;

  // Lệnh tiêm Shadow DOM UI (Phase 05)
  if (action === "inject_html") {
    console.log("[ThôngDVC] Thực hiện inject HTML vào shadow DOM");
    return injectShadowUI({ html, mount, mode });
  }

  // Lệnh đọc cấu trúc DOM hiện tại
  if (action === "read_dom") {
    console.log("[ThôngDVC] Thực hiện đọc cấu trúc DOM");
    try {
      return getPageDOMStructure();
    } catch (err) {
      return { status: "error", message: err.message };
    }
  }

  // Lệnh cuộn trang
  if (action === "scroll") {
    console.log("[ThôngDVC] Thực hiện cuộn trang:", command.direction);
    try {
      const direction = command.direction;
      const distance = window.innerHeight * 0.6;
      window.scrollBy({
        top: direction === "down" ? distance : -distance,
        behavior: "smooth"
      });
      return { status: "success" };
    } catch (err) {
      return { status: "error", message: err.message };
    }
  }

  // Xác định selector: ưu tiên selector động được gửi từ Agent, sau đó tra cứu mapping cố định
  let selector = command.selector;
  if (!selector && field_name) {
    selector = FIELD_MAPPINGS[field_name];
  }

  let element = null;
  if (selector) {
    element = document.querySelector(selector);
  }

  // Fallback: Tìm theo ID hoặc name trùng với field_name nếu không tìm thấy bằng selector
  if (!element && field_name) {
    element = document.getElementById(field_name) || document.querySelector(`[name="${field_name}"]`);
  }

  if (!element) {
    const errorMsg = `Không tìm thấy phần tử DOM cho field_name: '${field_name}' hoặc selector: '${selector || ""}'`;
    console.warn(`[ThôngDVC] Lỗi: ${errorMsg}`);
    return {
      status: "error",
      message: errorMsg,
    };
  }

  try {
    if (action === "type_input") {
      element.value = text;
      element.dispatchEvent(new Event("input",  { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
      highlightElement(element);
      console.log(`[ThôngDVC] Điền thành công vào '${field_name || selector}' (${selector}):`, text);
      return { status: "success" };
    }

    if (action === "click_button") {
      element.click();
      highlightElement(element);
      console.log(`[ThôngDVC] Click thành công vào '${field_name || selector}' (${selector})`);
      return { status: "success" };
    }

    if (action === "select_option") {
      element.value = value;
      element.dispatchEvent(new Event("change", { bubbles: true }));
      highlightElement(element);
      console.log(`[ThôngDVC] Chọn thành công option '${value}' cho '${field_name || selector}' (${selector})`);
      return { status: "success" };
    }

    if (action === "check_login") {
      try {
        return checkLoginStatus();
      } catch (err) {
        return { status: "error", message: err.message };
      }
    }

    if (action === "navigate_to_login") {
      try {
        let selector = command.selector;
        if (!selector) {
          const loginBtn = document.querySelector('a[href*="login"], a[href*="dang-nhap"], .btn-login, #btn-login');
          if (loginBtn) {
            selector = getUniqueSelector(loginBtn);
          }
        }

        if (selector) {
          const el = document.querySelector(selector);
          if (el) {
            el.click();
            return { status: "success", message: `Đã click vào nút đăng nhập (${selector})` };
          }
        }

        // Fallback: Chuyển hướng theo domain hiện tại
        const origin = window.location.origin;
        window.location.href = origin + (origin.includes("dichvucong.gov.vn") ? "/dvc-tthc-login" : "/login");
        return { status: "success", message: "Đang chuyển hướng sang trang đăng nhập bằng URL..." };
      } catch (err) {
        return { status: "error", message: err.message };
      }
    }

    if (action === "update_checklist") {
      try {
        const html = buildChecklistHTML(command.steps);
        return injectShadowUI({
          mount: "accessibility-assistant-panel",
          html: html,
          mode: "shadow-root"
        });
      } catch (err) {
        return { status: "error", message: err.message };
      }
    }

    if (action === "show_pii_confirm") {
      try {
        const { masked_text, raw_text, tokens } = command;
        const confirmed = await showPIIConfirmModal(masked_text, raw_text, tokens);
        return { status: "success", confirmed: confirmed };
      } catch (err) {
        return { status: "error", message: err.message };
      }
    }

    if (action === "fill_address_cascade") {
      try {
        const { province, district, ward } = command;
        return await fillAddressCascading({ province, district, ward });
      } catch (err) {
        return { status: "error", message: err.message };
      }
    }

    if (action === "bulk_fill_profile") {
      try {
        const { profile } = command;
        return await bulkFillProfile(profile);
      } catch (err) {
        return { status: "error", message: err.message };
      }
    }

    console.warn(`[EasyDVC] Lỗi: Hành động không hỗ trợ: ${action}`);
    return { status: "error", message: `Hành động không hỗ trợ: ${action}` };

  } catch (error) {
    return { status: "error", message: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TIÊM SHADOW DOM UI (Phase 05)
// ─────────────────────────────────────────────────────────────────────────────
function injectShadowUI({ html, mount, mode }) {
  let host = document.getElementById(mount);
  if (!host) {
    host = document.createElement("div");
    host.id = mount;
    Object.assign(host.style, {
      position: "fixed",
      bottom: "20px",
      right: "20px",
      zIndex: "2147483647",
    });
    document.body.appendChild(host);
  }

  let container = host;
  if (mode === "shadow-root") {
    container = host.shadowRoot || host.attachShadow({ mode: "open" });
  }

  container.innerHTML = sanitizeHTML(html);
  return { status: "success", ui_id: "ui_checklist_active" };
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function highlightElement(el) {
  el.style.transition  = "all 0.3s ease";
  el.style.boxShadow   = "0 0 10px #10b981";
  el.style.borderColor = "#10b981";
  setTimeout(() => {
    el.style.boxShadow   = "none";
    el.style.borderColor = "";
  }, 1500);
}

function sanitizeHTML(htmlString) {
  // Loại bỏ thẻ <script> trước khi tiêm vào DOM
  return htmlString.replace(
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    ""
  );
}

const CT01_TEMPLATE = {
  title: "Đăng ký thường trú",
  headings: [
    { tag: "h1", text: "Nộp hồ sơ Đăng ký thường trú trực tuyến" }
  ],
  formFields: [
    { tag: "input", type: "text", id: "fullname", name: "fullname", placeholder: "Nhập họ và tên", label: "Họ và tên người nộp", required: true, selector: "input#fullname" },
    { tag: "input", type: "text", id: "birthday", name: "birthday", placeholder: "DD/MM/YYYY", label: "Ngày tháng năm sinh", required: true, selector: "input#birthday" },
    { tag: "input", type: "text", id: "cccd-num", name: "cccd-num", placeholder: "Số CCCD/Định danh", label: "Số định danh/CCCD", required: true, selector: "input#cccd-num" },
    { tag: "input", type: "text", id: "phone", name: "phone", placeholder: "Nhập số điện thoại", label: "Số điện thoại", required: true, selector: "input#phone" },
    { tag: "select", id: "prov", name: "province", label: "Tỉnh/Thành phố", required: true, selector: "select#prov", options: [
      { text: "Thành phố Hà Nội", value: "01" },
      { text: "Thành phố Hồ Chí Minh", value: "79" }
    ]},
    { tag: "select", id: "dist", name: "district", label: "Quận/Huyện", required: true, selector: "select#dist", options: [] },
    { tag: "select", id: "ward", name: "ward", label: "Xã/Phường", required: true, selector: "select#ward", options: [] },
    { tag: "input", type: "text", id: "address", name: "address", placeholder: "Số nhà, đường phố...", label: "Địa chỉ chi tiết", required: true, selector: "input#address" }
  ],
  buttons: [
    { id: "btn-submit", name: "submit", text: "Nộp hồ sơ", selector: "button#btn-submit" }
  ]
};

const DVC_FORM_TEMPLATES = {
  "/dvc-tthc-dang-ky-thuong-tru": CT01_TEMPLATE,
  "/test-dvc-cascading.html": CT01_TEMPLATE,
  "/dvc-tthc-cap-lai-the-bhyt": {
    title: "Cấp lại thẻ bảo hiểm y tế do hỏng, mất",
    headings: [
      { tag: "h1", text: "Cấp lại thẻ BHYT do mất, hỏng trực tuyến" }
    ],
    formFields: [
      { tag: "input", type: "text", id: "fullname", name: "fullname", placeholder: "Nhập họ và tên", label: "Họ và tên người yêu cầu", required: true, selector: "input#fullname" },
      { tag: "input", type: "text", id: "birthday", name: "birthday", placeholder: "DD/MM/YYYY", label: "Ngày tháng năm sinh", required: true, selector: "input#birthday" },
      { tag: "input", type: "text", id: "cccd-num", name: "cccd-num", placeholder: "Số định danh/CCCD", label: "Số định danh/CCCD", required: true, selector: "input#cccd-num" },
      { tag: "input", type: "text", id: "phone", name: "phone", placeholder: "Nhập số điện thoại", label: "Số điện thoại BHYT", required: true, selector: "input#phone" }
    ],
    buttons: [
      { id: "btn-submit", name: "submit", text: "Gửi yêu cầu cấp lại", selector: "button#btn-submit" }
    ]
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DYNAMIC DOM SCRAPER FOR AGENT ACCESSIBILITY SNAPSHOTS
// ─────────────────────────────────────────────────────────────────────────────
function getPageDOMStructure() {
  const title = document.title;
  const url = window.location.href;

  const matchedRoute = Object.keys(DVC_FORM_TEMPLATES).find(route => url.includes(route));

  if (matchedRoute) {
    console.log("[ThôngDVC] Khớp mẫu template DVC. Đọc giá trị hiện tại của form và trả về cache.");
    const template = JSON.parse(JSON.stringify(DVC_FORM_TEMPLATES[matchedRoute]));
    
    // Đọc động các giá trị thực tế đang có trên form để LLM đồng bộ
    template.formFields.forEach(field => {
      const el = document.querySelector(field.selector);
      if (el) {
        field.value = el.value || "";
        // Nếu là select, load thêm option đã chọn
        if (field.tag === "select" && el.options) {
          field.options = Array.from(el.options).map(opt => ({
            text: opt.text.trim(),
            value: opt.value
          })).slice(0, 50);
        }
      }
    });
    
    return {
      status: "success",
      page: {
        title,
        url,
        headings: template.headings,
        formFields: template.formFields,
        buttons: template.buttons
      }
    };
  }

  // Thu thập các thẻ Heading để biết ngữ cảnh trang
  const headings = Array.from(document.querySelectorAll("h1, h2, h3, h4"))
    .map(el => ({
      tag: el.tagName.toLowerCase(),
      text: (el.innerText || el.textContent || "").trim()
    }))
    .map(h => ({ ...h, text: h.text.replace(/\s+/g, " ").slice(0, 100) }))
    .filter(h => h.text.length > 0)
    .slice(0, 10);

  // Lấy các phần tử tương tác
  const elements = Array.from(document.querySelectorAll("input, select, textarea, button, a.btn, [role='button']"));
  
  const formFields = [];
  const buttons = [];

  elements.forEach(el => {
    // Bỏ qua các phần tử ẩn hoặc không hiển thị
    if (el.type === "hidden" || el.style.display === "none" || el.style.visibility === "hidden") {
      return;
    }
    // Bỏ qua phần tử thuộc widget của trợ lý
    if (el.closest("#thongdvc-widget-container") || el.closest("#accessibility-assistant-panel")) {
      return;
    }

    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      return;
    }

    const tag = el.tagName.toLowerCase();
    const id = el.id || "";
    const name = el.getAttribute("name") || "";
    const type = el.getAttribute("type") || "";
    const placeholder = el.getAttribute("placeholder") || "";
    const value = el.value || "";
    const required = el.hasAttribute("required");
    const selector = getUniqueSelector(el);

    // Xác định nhãn (label) đi kèm
    let labelText = "";
    if (id) {
      const labelEl = document.querySelector(`label[for="${id}"]`);
      if (labelEl) {
        labelText = labelEl.innerText || labelEl.textContent || "";
      }
    }
    if (!labelText) {
      const parentLabel = el.closest("label");
      if (parentLabel) {
        labelText = parentLabel.innerText || parentLabel.textContent || "";
      }
    }
    if (!labelText && el.getAttribute("aria-label")) {
      labelText = el.getAttribute("aria-label");
    }
    if (!labelText) {
      // Tìm text node phía trước phần tử
      let sibling = el.previousSibling;
      while (sibling) {
        if (sibling.nodeType === Node.TEXT_NODE && sibling.textContent.trim()) {
          labelText = sibling.textContent.trim();
          break;
        } else if (sibling.nodeType === Node.ELEMENT_NODE && (sibling.tagName === "SPAN" || sibling.tagName === "LABEL")) {
          labelText = sibling.innerText || sibling.textContent || "";
          break;
        }
        sibling = sibling.previousSibling;
      }
    }

    labelText = labelText.trim().replace(/\s+/g, " ").replace(/:\s*$/, "").slice(0, 100);

    // Bỏ qua các trường thông tin trống không có nhãn, placeholder hoặc name
    if (tag !== "button" && type !== "button" && type !== "submit" && el.getAttribute("role") !== "button" && !(tag === "a" && el.classList.contains("btn"))) {
      if (!labelText && !placeholder && !name) {
        return;
      }
    }

    if (tag === "button" || type === "button" || type === "submit" || el.getAttribute("role") === "button" || (tag === "a" && el.classList.contains("btn"))) {
      const btnText = (el.innerText || el.textContent || el.value || placeholder || labelText || "").trim().replace(/\s+/g, " ").slice(0, 80);
      if (btnText) {
        buttons.push({
          id,
          name,
          text: btnText,
          selector
        });
      }
    } else {
      const fieldInfo = {
        tag,
        type,
        id,
        name,
        placeholder,
        label: labelText,
        value: type === "password" ? "******" : value,
        required,
        selector
      };

      if (tag === "select") {
        const options = Array.from(el.options)
          .map(opt => ({
            text: opt.text.trim(),
            value: opt.value
          }))
          .filter(opt => opt.text.length > 0);
        fieldInfo.options = options.slice(0, 20); // Giới hạn 20 option
      }

      formFields.push(fieldInfo);
    }
  });

  return {
    status: "success",
    page: {
      title,
      url,
      headings,
      formFields,
      buttons
    }
  };
}

function getUniqueSelector(el) {
  if (el.id) {
    return `#${CSS.escape(el.id)}`;
  }
  if (el.getAttribute("name")) {
    return `${el.tagName.toLowerCase()}[name="${CSS.escape(el.getAttribute("name"))}"]`;
  }
  let path = [];
  while (el && el.nodeType === Node.ELEMENT_NODE) {
    let selector = el.nodeName.toLowerCase();
    if (el.id) {
      selector += `#${CSS.escape(el.id)}`;
      path.unshift(selector);
      break;
    } else if (el.className) {
      const classes = el.className.trim().split(/\s+/).filter(c => c.length > 0 && !c.includes(":"));
      if (classes.length > 0) {
        selector += "." + classes.join(".");
      }
    }
    path.unshift(selector);
    el = el.parentNode;
  }
  return path.join(" > ");
}

function checkLoginStatus() {
  // Tìm kiếm liên kết hoặc nút bấm đăng nhập
  const loginBtn = document.querySelector('a[href*="login"], a[href*="dang-nhap"], .btn-login, #btn-login');
  const userInfo = document.querySelector('.user-info, .profile-menu, #username-display, .login-username');
  
  if (userInfo) {
    return { status: "success", logged_in: true, username: userInfo.innerText.trim() };
  }
  if (loginBtn) {
    return { status: "success", logged_in: false, login_selector: getUniqueSelector(loginBtn) };
  }
  
  // Fallback: Tìm text "Đăng nhập" trên toàn bộ trang
  const anchors = Array.from(document.querySelectorAll("a, button"));
  const foundLogin = anchors.find(el => (el.innerText || "").toLowerCase().includes("đăng nhập"));
  if (foundLogin) {
    return { status: "success", logged_in: false, login_selector: getUniqueSelector(foundLogin) };
  }
  
  // Mặc định coi như đã login hoặc không tìm thấy nút login rõ ràng
  return { status: "success", logged_in: true };
}

function buildChecklistHTML(steps) {
  const stepItems = steps
    .map(
      ({ label, done }) => `
      <li class="step ${done ? "done" : ""}">
        <span class="icon">${done ? "✅" : "⬜"}</span>
        <span class="label">${escapeHtml(label)}</span>
      </li>`
    )
    .join("");

  return `
    <style>
      :host {
        font-family: "Segoe UI", Arial, sans-serif;
        font-size: 16px;
      }
      .panel {
        background: #1e293b;
        color: #f8fafc;
        border-radius: 12px;
        padding: 16px 20px;
        min-width: 260px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.4);
      }
      h3 {
        margin: 0 0 12px;
        font-size: 14px;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      ul {
        list-style: none;
        padding: 0;
        margin: 0;
      }
      .step {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 0;
        border-bottom: 1px solid #334155;
        font-size: 15px;
        line-height: 1.4;
      }
      .step:last-child { border-bottom: none; }
      .step.done .label { color: #64748b; text-decoration: line-through; }
      .icon { font-size: 18px; flex-shrink: 0; }
    </style>
    <div class="panel">
      <h3>📋 Hướng dẫn điền form</h3>
      <ul>${stepItems}</ul>
    </div>
  `;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function showPIIConfirmModal(maskedText, rawText, tokens) {
  return new Promise((resolve) => {
    // Xóa modal cũ nếu có
    const oldModal = document.getElementById("pii-confirm-modal-host");
    if (oldModal) oldModal.remove();

    const host = document.createElement("div");
    host.id = "pii-confirm-modal-host";
    Object.assign(host.style, {
      position: "fixed",
      top: "0",
      left: "0",
      width: "100vw",
      height: "100vh",
      backgroundColor: "rgba(15, 23, 42, 0.6)",
      backdropFilter: "blur(4px)",
      zIndex: "2147483647",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Segoe UI', Arial, sans-serif"
    });

    const shadow = host.attachShadow({ mode: "open" });
    
    // Tạo CSS cho modal
    const style = document.createElement("style");
    style.textContent = `
      .card {
        background: #1e293b;
        color: #f8fafc;
        padding: 24px;
        border-radius: 16px;
        width: 420px;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2);
        border: 1px solid #334155;
        animation: zoomIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      }
      @keyframes zoomIn {
        from { transform: scale(0.95); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
      h3 {
        margin: 0 0 12px;
        font-size: 18px;
        display: flex;
        align-items: center;
        gap: 8px;
        color: #38bdf8;
      }
      .icon-shield {
        font-size: 22px;
      }
      .description {
        font-size: 14px;
        color: #94a3b8;
        margin-bottom: 16px;
        line-height: 1.5;
      }
      .masked-box {
        background: #0f172a;
        padding: 12px 16px;
        border-radius: 8px;
        font-size: 14px;
        margin-bottom: 20px;
        border: 1px solid #1e293b;
        line-height: 1.6;
      }
      .token-highlight {
        background: #f59e0b;
        color: #0f172a;
        padding: 2px 6px;
        border-radius: 4px;
        font-weight: bold;
        font-size: 12px;
      }
      .real-values {
        font-size: 14px;
        margin-bottom: 20px;
      }
      .real-item {
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
        border-bottom: 1px solid #334155;
      }
      .real-item:last-child {
        border-bottom: none;
      }
      .label {
        color: #94a3b8;
      }
      .value {
        font-weight: 600;
        color: #10b981;
      }
      .buttons {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
      }
      button {
        padding: 8px 16px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        border: none;
      }
      .btn-cancel {
        background: #334155;
        color: #94a3b8;
      }
      .btn-cancel:hover {
        background: #475569;
        color: #f8fafc;
      }
      .btn-confirm {
        background: #10b981;
        color: #ffffff;
      }
      .btn-confirm:hover {
        background: #059669;
      }
    `;

    // Render HTML
    const card = document.createElement("div");
    card.className = "card";

    // Tạo danh sách giá trị thật tương ứng
    let realItemsHtml = "";
    tokens.forEach(([token, realVal]) => {
      let typeName = "Thông tin";
      if (token.includes("CCCD")) typeName = "Căn cước công dân";
      if (token.includes("PHONE")) typeName = "Số điện thoại";
      
      realItemsHtml += `
        <div class="real-item">
          <span class="label">${typeName}:</span>
          <span class="value">${realVal}</span>
        </div>
      `;
    });

    // Highlight các token trong văn bản
    let displayedText = maskedText;
    tokens.forEach(([token]) => {
      displayedText = displayedText.replaceAll(token, `<span class="token-highlight">🔒 ${token}</span>`);
    });

    card.innerHTML = `
      <h3><span class="icon-shield">🛡️</span> Phát hiện Thông tin Nhạy cảm</h3>
      <div class="description">
        Hệ thống phát hiện bác vừa đọc thông tin cá nhân. Để bảo mật, thông tin này đã được mã hóa cục bộ:
      </div>
      <div class="masked-box">
        ${displayedText}
      </div>
      <div class="real-values">
        ${realItemsHtml}
      </div>
      <div class="buttons">
        <button class="btn-cancel" id="btn-cancel">Hủy bỏ</button>
        <button class="btn-confirm" id="btn-confirm">Đồng ý điền</button>
      </div>
    `;

    shadow.appendChild(style);
    shadow.appendChild(card);
    document.body.appendChild(host);

    // Gắn sự kiện click cho các nút trong shadow root
    shadow.getElementById("btn-confirm").addEventListener("click", () => {
      console.log("[PII] Người dùng xác nhận điền PII.");
      host.remove();
      resolve(true);
    });

    shadow.getElementById("btn-cancel").addEventListener("click", () => {
      console.log("[PII] Người dùng hủy bỏ PII.");
      host.remove();
      resolve(false);
    });
  });
}

async function fillAddressCascading({ province, district, ward }) {
  console.log("[EasyDVC] Khởi chạy Cascading Address Autofill:", { province, district, ward });
  const delay = ms => new Promise(res => setTimeout(res, ms));

  const provEl = document.querySelector("select#prov");
  if (!provEl) throw new Error("Không tìm thấy dropdown Tỉnh/Thành phố (#prov)");
  
  await selectDropdownOptionByText(provEl, province);
  
  let retries = 10;
  const distEl = document.querySelector("select#dist");
  while (retries > 0 && (!distEl || distEl.options.length <= 1)) {
    await delay(200);
    retries--;
  }

  if (!distEl || distEl.options.length <= 1) throw new Error("Dropdown Quận/Huyện không tải kịp dữ liệu hoặc bị lỗi");
  await selectDropdownOptionByText(distEl, district);

  retries = 10;
  const wardEl = document.querySelector("select#ward");
  while (retries > 0 && (!wardEl || wardEl.options.length <= 1)) {
    await delay(200);
    retries--;
  }

  if (!wardEl || wardEl.options.length <= 1) throw new Error("Dropdown Xã/Phường không tải kịp dữ liệu hoặc bị lỗi");
  await selectDropdownOptionByText(wardEl, ward);

  highlightElement(provEl);
  highlightElement(distEl);
  highlightElement(wardEl);

  return { status: "success" };
}

async function selectDropdownOptionByText(selectEl, text) {
  const option = Array.from(selectEl.options).find(opt => 
    opt.text.toLowerCase().replace(/\s+/g, "").includes(text.toLowerCase().replace(/\s+/g, ""))
  );
  
  if (!option) {
    throw new Error(`Không tìm thấy giá trị '${text}' trong dropdown ${selectEl.id}`);
  }
  
  selectEl.value = option.value;
  selectEl.dispatchEvent(new Event("change", { bubbles: true }));
  console.log(`[EasyDVC] Đã chọn '${option.text}' (${option.value}) cho #${selectEl.id}`);
}

async function bulkFillProfile(profile) {
  console.log("[EasyDVC] Khởi chạy Bulk Fill Profile:", profile);
  if (!profile) {
    profile = {
      fullname: "NGUYỄN VĂN HÙNG",
      birthday: "15/05/1955",
      cccd: "037155001234",
      phone: "0987654321"
    };
  }

  const mappings = {
    "input#fullname": profile.fullname,
    "input#birthday": profile.birthday,
    "input#cccd-num": profile.cccd,
    "input#phone": profile.phone
  };

  let filledCount = 0;
  for (const [selector, val] of Object.entries(mappings)) {
    const el = document.querySelector(selector);
    if (el && val) {
      el.value = val;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      highlightElement(el);
      filledCount++;
    }
  }

  return { status: "success", message: `Đã điền xong hàng loạt ${filledCount} trường thông tin.` };
}

// Expose handleCommand globally so webrtc-client.bundle.js can call it directly
if (typeof window !== "undefined") {
  window.handleCommand = handleCommand;
}

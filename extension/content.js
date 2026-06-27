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
// KẾT NỐI WEBSOCKET ĐẾN BRIDGE SERVER & THIẾT LẬP GIAO TIẾP FRAME
// ─────────────────────────────────────────────────────────────────────────────
const childCommandResolvers = new Map();

if (window === window.top) {
  const socket = new WebSocket("ws://localhost:8000");

  socket.addEventListener("open", () => {
    console.log("[ThôngDVC] Trang cha đã kết nối với Bridge Server.");
  });

  socket.addEventListener("message", async (event) => {
    let command;
    try {
      command = JSON.parse(event.data);
    } catch (e) {
      console.error("[ThôngDVC] JSON không hợp lệ:", event.data);
      return;
    }

    const result = await handleCommand(command);
    socket.send(JSON.stringify(result));
  });

  socket.addEventListener("close", () => {
    console.warn("[ThôngDVC] Mất kết nối với Bridge Server.");
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

  // Lắng nghe các thông điệp từ iframe con
  window.addEventListener("message", async (event) => {
    const msg = event.data;
    if (!msg) return;

    if (msg.type === "THONGDVC_RESPONSE_COMMAND") {
      const resolver = childCommandResolvers.get(msg.commandId);
      if (resolver) {
        resolver(msg.result);
        childCommandResolvers.delete(msg.commandId);
      }
    }

    if (msg.type === "THONGDVC_FORWARD_INJECT") {
      const res = injectShadowUI({ html: msg.command.html, mount: msg.command.mount, mode: msg.command.mode });
      event.source.postMessage({ type: "THONGDVC_RESPONSE_COMMAND", commandId: msg.commandId, result: res }, "*");
    }

    if (msg.type === "THONGDVC_FORWARD_PII") {
      const res = await showPIIConfirmModal(msg.command.masked_text, msg.command.raw_text, msg.command.tokens);
      event.source.postMessage({ type: "THONGDVC_RESPONSE_COMMAND", commandId: msg.cmdId, result: { status: "success", confirmed: res } }, "*");
    }
  });

} else {
  // Chạy trong iframe con: Lắng nghe yêu cầu từ parent frame
  window.addEventListener("message", async (event) => {
    const msg = event.data;
    if (!msg) return;

    if (msg.type === "THONGDVC_REQUEST_DOM") {
      const localDOM = getLocalPageDOMStructure();
      event.source.postMessage({
        type: "THONGDVC_RESPONSE_DOM",
        frameSelector: msg.frameSelector,
        page: localDOM.page
      }, "*");
    }

    if (msg.type === "THONGDVC_EXECUTE_COMMAND") {
      const result = await handleCommand(msg.command);
      event.source.postMessage({
        type: "THONGDVC_RESPONSE_COMMAND",
        commandId: msg.commandId,
        result: result
      }, "*");
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// XỬ LÝ LỆNH DOM
// ─────────────────────────────────────────────────────────────────────────────
async function handleCommand(command) {
  console.log("[ThôngDVC] Nhận lệnh:", command);
  const { action, field_name, text, value, html, mount, mode } = command;

  // Lệnh tiêm Shadow DOM UI (Phase 05) - chỉ chạy ở top-level frame để tránh trùng lặp
  if (action === "inject_html") {
    if (window !== window.top) {
      const cmdId = Math.random().toString(36).substring(2);
      window.parent.postMessage({ type: "THONGDVC_FORWARD_INJECT", commandId: cmdId, command }, "*");
      return { status: "success", message: "Đã chuyển tiếp lệnh inject lên trang cha" };
    }
    console.log("[ThôngDVC] Thực hiện inject HTML vào shadow DOM");
    return injectShadowUI({ html, mount, mode });
  }

  // Lệnh đọc cấu trúc DOM hiện tại
  if (action === "read_dom") {
    try {
      return await getPageDOMStructure();
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

  // Đi xác thực PII
  if (action === "show_pii_confirm") {
    try {
      if (window !== window.top) {
        return new Promise((resolve) => {
          const cmdId = Math.random().toString(36).substring(2);
          childCommandResolvers.set(cmdId, (res) => resolve(res));
          window.parent.postMessage({ type: "THONGDVC_FORWARD_PII", cmdId, command }, "*");
        });
      }
      const { masked_text, raw_text, tokens } = command;
      const confirmed = await showPIIConfirmModal(masked_text, raw_text, tokens);
      return { status: "success", confirmed: confirmed };
    } catch (err) {
      return { status: "error", message: err.message };
    }
  }

  // Xác định selector: ưu tiên selector động
  let selector = command.selector;
  if (!selector && field_name) {
    selector = FIELD_MAPPINGS[field_name];
  }

  // Phân tích nếu selector là iframe lồng nhau (có ký hiệu " -> ")
  if (selector && selector.includes(" -> ")) {
    const parts = selector.split(" -> ");
    const frameSelector = parts[0];
    const remainingSelector = parts.slice(1).join(" -> ");

    console.log(`[ThôngDVC] Chuyển hướng lệnh điều khiển xuống iframe: ${frameSelector}`);
    const iframe = document.querySelector(frameSelector);
    if (iframe) {
      const commandId = Math.random().toString(36).substring(2);
      iframe.contentWindow.postMessage({
        type: "THONGDVC_EXECUTE_COMMAND",
        commandId: commandId,
        command: {
          ...command,
          selector: remainingSelector
        }
      }, "*");

      return await waitForChildCommandResult(commandId);
    } else {
      return { status: "error", message: `Không tìm thấy iframe ở đường dẫn: ${frameSelector}` };
    }
  }

  // Điền địa chỉ 3 cấp (chỉ thực hiện ở main frame hoặc nội bộ iframe)
  if (action === "fill_address_cascade") {
    try {
      const { province, district, ward } = command;
      return await fillAddressCascading({ province, district, ward });
    } catch (err) {
      return { status: "error", message: err.message };
    }
  }

  // Điền hàng loạt profile
  if (action === "bulk_fill_profile") {
    try {
      const { profile } = command;
      return await bulkFillProfile(profile);
    } catch (err) {
      return { status: "error", message: err.message };
    }
  }

  // XỬ LÝ CỤC BỘ TRÊN CHÍNH FRAME NÀY (khi selector không chứa " -> ")
  let element = null;
  if (selector) {
    element = document.querySelector(selector);
  }

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

        const origin = window.location.origin;
        window.location.href = origin + (origin.includes("dichvucong.gov.vn") ? "/dvc-tthc-login" : "/login");
        return { status: "success", message: "Đang chuyển hướng sang trang đăng nhập..." };
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

    console.warn(`[ThôngDVC] Lỗi: Hành động không hỗ trợ: ${action}`);
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
// DYNAMIC DOM SCRAPER & IFRAME AGGREGATION
// ─────────────────────────────────────────────────────────────────────────────

// Tìm nhãn văn bản liên kết với ô nhập liệu bằng thuật toán duyệt ngữ cảnh thông minh
function findLabelForElement(el) {
  let labelText = "";
  const id = el.id;

  // 1. Thẻ <label> liên kết qua for
  if (id) {
    const labelEl = document.querySelector(`label[for="${id}"]`);
    if (labelEl) {
      labelText = labelEl.innerText || labelEl.textContent || "";
    }
  }

  // 2. Thẻ <label> bọc ngoài phần tử
  if (!labelText) {
    const parentLabel = el.closest("label");
    if (parentLabel) {
      labelText = parentLabel.innerText || parentLabel.textContent || "";
    }
  }

  // 3. Sử dụng các thuộc tính có sẵn
  if (!labelText) {
    labelText = el.getAttribute("aria-label") || el.getAttribute("placeholder") || el.getAttribute("title") || "";
  }

  // 4. Định dạng bảng (TableCell TD) - Tìm ở ô TD nằm ngay trước (thường chứa nhãn ở cột trái)
  if (!labelText) {
    const td = el.closest("td");
    if (td && td.previousElementSibling) {
      labelText = td.previousElementSibling.innerText || td.previousElementSibling.textContent || "";
    }
  }

  // 5. Tìm phần tử văn bản (span, div, label) đứng trước cùng cấp
  if (!labelText) {
    let sibling = el.previousElementSibling;
    while (sibling) {
      const text = (sibling.innerText || sibling.textContent || "").trim();
      if (text) {
        labelText = text;
        break;
      }
      sibling = sibling.previousElementSibling;
    }
  }

  // 6. Tìm Text Node đứng trước
  if (!labelText) {
    let sibling = el.previousSibling;
    while (sibling) {
      if (sibling.nodeType === Node.TEXT_NODE && sibling.textContent.trim()) {
        labelText = sibling.textContent.trim();
        break;
      }
      sibling = sibling.previousSibling;
    }
  }

  // 7. Dự phòng từ name hoặc class
  if (!labelText && el.getAttribute("name")) {
    labelText = el.getAttribute("name");
  }

  return labelText.trim().replace(/\s+/g, " ").replace(/[:*]\s*$/, "").slice(0, 100);
}

// Lấy cấu trúc DOM của chính tài liệu hiện tại (Main page hoặc Iframe)
function getLocalPageDOMStructure() {
  const title = document.title;
  const url = window.location.href;

  const matchedRoute = Object.keys(DVC_FORM_TEMPLATES).find(route => url.includes(route));

  if (matchedRoute) {
    console.log("[ThôngDVC] Khớp mẫu template DVC. Đọc giá trị hiện tại của form.");
    const template = JSON.parse(JSON.stringify(DVC_FORM_TEMPLATES[matchedRoute]));
    
    template.formFields.forEach(field => {
      const el = document.querySelector(field.selector);
      if (el) {
        field.value = el.value || "";
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

  const headings = Array.from(document.querySelectorAll("h1, h2, h3, h4"))
    .map(el => ({
      tag: el.tagName.toLowerCase(),
      text: (el.innerText || el.textContent || "").trim()
    }))
    .map(h => ({ ...h, text: h.text.replace(/\s+/g, " ").slice(0, 100) }))
    .filter(h => h.text.length > 0)
    .slice(0, 10);

  const elements = Array.from(document.querySelectorAll("input, select, textarea, button, a.btn, [role='button']"));
  
  const formFields = [];
  const buttons = [];

  elements.forEach(el => {
    if (el.type === "hidden" || el.style.display === "none" || el.style.visibility === "hidden") {
      return;
    }
    if (el.closest("#thongdvc-widget-container") || el.closest("#accessibility-assistant-panel") || el.closest("#pii-confirm-modal-host")) {
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

    const labelText = findLabelForElement(el);

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
        fieldInfo.options = options.slice(0, 20);
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

// Yêu cầu tất cả iframe con quét DOM nội bộ của chúng
function requestChildFramesDOM(iframes) {
  return new Promise((resolve) => {
    const results = [];
    const pendingFrames = new Set();
    
    const timeout = setTimeout(() => {
      console.warn("[ThôngDVC] Thời gian quét các iframe con quá hạn. Trả về DOM hiện tại.");
      cleanup();
      resolve(results);
    }, 400);

    function cleanup() {
      window.removeEventListener("message", onMessage);
      clearTimeout(timeout);
    }

    function onMessage(event) {
      const msg = event.data;
      if (msg && msg.type === "THONGDVC_RESPONSE_DOM" && pendingFrames.has(msg.frameSelector)) {
        results.push({ frameSelector: msg.frameSelector, page: msg.page });
        pendingFrames.delete(msg.frameSelector);
        if (pendingFrames.size === 0) {
          cleanup();
          resolve(results);
        }
      }
    }

    window.addEventListener("message", onMessage);

    iframes.forEach((iframe) => {
      try {
        const frameSelector = getUniqueSelector(iframe);
        pendingFrames.add(frameSelector);
        iframe.contentWindow.postMessage({
          type: "THONGDVC_REQUEST_DOM",
          frameSelector: frameSelector
        }, "*");
      } catch (err) {
        console.warn("[ThôngDVC] Lỗi khi postMessage đến iframe:", err);
      }
    });

    if (pendingFrames.size === 0) {
      cleanup();
      resolve(results);
    }
  });
}

// Chờ phản hồi lệnh thực thi từ iframe con
function waitForChildCommandResult(commandId) {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      childCommandResolvers.delete(commandId);
      resolve({ status: "error", message: "Thực thi lệnh trên iframe quá hạn (timeout)" });
    }, 4500);

    childCommandResolvers.set(commandId, (result) => {
      clearTimeout(timeout);
      resolve(result);
    });
  });
}

// API chính quét hợp nhất DOM trang chính và toàn bộ iframes con
async function getPageDOMStructure() {
  const localDOM = getLocalPageDOMStructure();
  if (localDOM.status !== "success") return localDOM;

  const title = localDOM.page.title;
  const url = localDOM.page.url;
  const headings = localDOM.page.headings || [];
  let formFields = localDOM.page.formFields || [];
  let buttons = localDOM.page.buttons || [];

  const iframes = Array.from(document.querySelectorAll("iframe"));
  if (iframes.length > 0) {
    console.log(`[ThôngDVC] Phát hiện ${iframes.length} iframe. Bắt đầu thu thập dữ liệu...`);
    const childDOMs = await requestChildFramesDOM(iframes);
    
    childDOMs.forEach(({ frameSelector, page }) => {
      if (page) {
        if (page.formFields) {
          page.formFields.forEach(field => {
            field.selector = `${frameSelector} -> ${field.selector}`;
            formFields.push(field);
          });
        }
        if (page.buttons) {
          page.buttons.forEach(btn => {
            btn.selector = `${frameSelector} -> ${btn.selector}`;
            buttons.push(btn);
          });
        }
        if (page.headings) {
          headings.push(...page.headings);
        }
      }
    });
  }

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
  console.log("[ThôngDVC] Khởi chạy Cascading Address Autofill:", { province, district, ward });
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
  console.log(`[ThôngDVC] Đã chọn '${option.text}' (${option.value}) cho #${selectEl.id}`);
}

async function bulkFillProfile(profile) {
  console.log("[ThôngDVC] Khởi chạy Bulk Fill Profile:", profile);
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

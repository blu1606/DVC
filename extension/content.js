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
  "tax-code":             "input#tax-code",
  "mst":                  "input#tax-code",
  "taxable-income":       "input#taxable-income",
  "tax-deducted":         "input#tax-deducted",
  "tax-refund":           "input#tax-refund",
  "bank-account":         "input#bank-account",
  "bank-name":            "input#bank-name",
  "change-workplace-yes": "input#change-workplace-yes",
  "change-workplace-no":  "input#change-workplace-no",
  "has-contract-yes":     "input#has-contract-yes",
  "has-contract-no":      "input#has-contract-no",
  "tax-deducted-source-yes": "input#tax-deducted-source-yes",
  "tax-deducted-source-no":  "input#tax-deducted-source-no",
  "maTTHC":                  "input[name='maTTHC']",
  "search-input":            "input[name='maTTHC']",
  "btn-search":              "button.btn-primary[type='submit']",
  "search-btn":              "button.btn-primary[type='submit']",
  "nop-hoso-2.002233":       "a.nop-hoso-btn[ma-tthc='2.002233']",
  "btn-nop-hoso":            "a.nop-hoso-btn[ma-tthc='2.002233']",
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
  const { action, html, mount, mode } = command;
  const elementActions = new Set(["type_input", "click_button", "select_option"]);
  const pageActions = new Set([
    "inject_html",
    "read_dom",
    "read_tax_login_state",
    "scroll",
    "check_login",
    "navigate_to_login",
    "update_checklist",
    "show_pii_confirm",
    "fill_address_cascade",
    "bulk_fill_profile",
  ]);

  try {
    if (action === "inject_html") {
      console.log("[ThôngDVC] Thực hiện inject HTML vào shadow DOM");
      return injectShadowUI({ html, mount, mode });
    }

    if (action === "read_dom") {
      console.log("[ThôngDVC] Thực hiện đọc cấu trúc DOM");
      return getPageDOMStructure();
    }

    if (action === "read_tax_login_state") {
      console.log("[ThôngDVC] Đọc trạng thái đăng nhập thuế");
      const snapshot = getPageDOMStructure();
      if (snapshot.status !== "success") {
        return snapshot;
      }
      return {
        status: "success",
        pageState: snapshot.page.pageState || "unknown",
        mode: snapshot.page.mode || "scrape",
        page: snapshot.page
      };
    }

    if (action === "scroll") {
      console.log("[ThôngDVC] Thực hiện cuộn trang:", command.direction);
      const direction = command.direction;
      const distance = window.innerHeight * 0.6;
      window.scrollBy({
        top: direction === "down" ? distance : -distance,
        behavior: "smooth"
      });
      return { status: "success" };
    }

    if (action === "check_login") {
      return checkLoginStatus();
    }

    if (action === "navigate_to_login") {
      return navigateToLogin(command.selector);
    }

    if (action === "update_checklist") {
      const checklistHtml = buildChecklistHTML(command.steps || []);
      return injectShadowUI({
        mount: "accessibility-assistant-panel",
        html: checklistHtml,
        mode: "shadow-root"
      });
    }

    if (action === "show_pii_confirm") {
      const { masked_text, raw_text, tokens } = command;
      const confirmed = await showPIIConfirmModal(masked_text, raw_text, tokens || []);
      return { status: "success", confirmed };
    }

    if (action === "fill_address_cascade") {
      const { province, district, ward } = command;
      return await fillAddressCascading({ province, district, ward });
    }

    if (action === "bulk_fill_profile") {
      return await bulkFillProfile(command.profile);
    }

    if (elementActions.has(action)) {
      return await executeDomAction(command);
    }

    if (!pageActions.has(action)) {
      console.warn(`[EasyDVC] Lỗi: Hành động không hỗ trợ: ${action}`);
      return { status: "error", message: `Hành động không hỗ trợ: ${action}` };
    }

    return { status: "error", message: `Hành động chưa được xử lý: ${action}` };
  } catch (error) {
    return { status: "error", message: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TIÊM SHADOW DOM UI (Phase 05)
// ─────────────────────────────────────────────────────────────────────────────
function injectShadowUI({ html, mount, mode }) {
  let host = document.getElementById(mount);
  const assistantPanel = mount === "accessibility-assistant-panel"
    ? document.getElementById("thongdvc-panel")
    : null;

  if (!host) {
    host = document.createElement("div");
    host.id = mount;
  }

  if (assistantPanel) {
    if (host.parentElement !== document.body) {
      document.body.appendChild(host);
    }
    delete host.dataset.dismissed;
    setupAssistantCompanionPanel(host, assistantPanel);
  } else {
    if (!host.parentElement) {
      document.body.appendChild(host);
    }
    Object.assign(host.style, {
      position: "fixed",
      top: "16px",
      right: "max(16px, env(safe-area-inset-right))",
      bottom: "auto",
      left: "auto",
      width: "min(360px, calc(100vw - 32px))",
      zIndex: "2147483647",
      boxSizing: "border-box",
    });
  }

  let container = host;
  if (mode === "shadow-root") {
    container = host.shadowRoot || host.attachShadow({ mode: "open" });
  }

  container.innerHTML = sanitizeHTML(normalizeAssistantPanelHTML(html, mount));
  bindAssistantPanelActions(host, container, mount);
  return { status: "success", ui_id: "ui_checklist_active" };
}

function bindAssistantPanelActions(host, container, mount) {
  if (mount !== "accessibility-assistant-panel") {
    return;
  }
  const closeBtn = container.querySelector("[data-easydvc-close]");
  if (!closeBtn) {
    return;
  }
  closeBtn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    host.dataset.dismissed = "true";
    host.style.display = "none";
  });
}

function normalizeAssistantPanelHTML(html, mount) {
  if (mount !== "accessibility-assistant-panel") {
    return html;
  }
  if (String(html || "").includes('data-easydvc-checklist="true"')) {
    return html;
  }
  return buildChecklistHTML(extractChecklistSteps(html));
}

function extractChecklistSteps(html) {
  const fallbackSteps = [
    { label: "Xác định thủ tục cần làm", done: false },
    { label: "Điền thông tin theo hướng dẫn", done: false },
    { label: "Kiểm tra lại thông tin", done: false },
    { label: "Nộp hồ sơ khi đã sẵn sàng", done: false }
  ];

  try {
    const doc = new DOMParser().parseFromString(sanitizeHTML(String(html || "")), "text/html");
    const listItems = Array.from(doc.querySelectorAll("li"));
    const itemSteps = listItems
      .map((item) => ({
        label: cleanChecklistText(item.textContent),
        done: item.classList.contains("done") || /[✓✔✅]/.test(item.textContent || "")
      }))
      .filter(({ label }) => label.length > 0);

    if (itemSteps.length > 0) {
      return itemSteps.slice(0, 8);
    }

    const textSteps = (doc.body?.textContent || "")
      .split(/\n|(?=\s*\d+[\).\-\s]+)/)
      .map(cleanChecklistText)
      .filter((line) => line && !/checklist|các bước|hướng dẫn|lưu ý/i.test(line))
      .slice(0, 8)
      .map((label) => ({ label, done: false }));

    return textSteps.length > 0 ? textSteps : fallbackSteps;
  } catch (error) {
    return fallbackSteps;
  }
}

function cleanChecklistText(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .replace(/^[✓✔✅☑☐□⬜\s-]+/, "")
    .replace(/^\s*\d+[\).\-\s]+/, "")
    .trim();
}

function setupAssistantCompanionPanel(host, assistantPanel) {
  const sync = () => {
    positionAssistantCompanionPanel(host, assistantPanel);
    const shouldShow = assistantPanel.classList.contains("show") && host.dataset.dismissed !== "true";
    host.style.display = shouldShow ? "block" : "none";
  };

  sync();

  if (!host.__thongdvcChecklistObserver) {
    host.__thongdvcChecklistObserver = new MutationObserver(sync);
    host.__thongdvcChecklistObserver.observe(assistantPanel, {
      attributes: true,
      attributeFilter: ["class"]
    });
  }

  if (!host.__thongdvcResizeHandler) {
    host.__thongdvcResizeHandler = sync;
    window.addEventListener("resize", host.__thongdvcResizeHandler);
  }
}

function positionAssistantCompanionPanel(host, assistantPanel) {
  const rect = assistantPanel.getBoundingClientRect();
  const margin = 12;
  const gap = 12;
  const verticalOffset = 78;
  const leftSpace = rect.left - margin - gap;
  const canDockLeft = leftSpace >= 260 && window.innerWidth >= 760;

  if (canDockLeft) {
    const width = Math.min(330, leftSpace);
    const top = Math.min(
      Math.max(margin, rect.top + verticalOffset),
      Math.max(margin, window.innerHeight - 220)
    );
    const maxHeight = Math.max(160, Math.min(rect.bottom - top, window.innerHeight - top - margin));
    Object.assign(host.style, {
      position: "fixed",
      top: `${top}px`,
      left: `${Math.max(margin, rect.left - width - gap)}px`,
      right: "auto",
      bottom: "auto",
      width: `${width}px`,
      maxHeight: `${maxHeight}px`,
      zIndex: "2147483643",
      boxSizing: "border-box",
      pointerEvents: "auto",
    });
    return;
  }

  Object.assign(host.style, {
    position: "fixed",
    top: `${Math.max(margin, rect.top + verticalOffset)}px`,
    left: `${margin}px`,
    right: `${margin}px`,
    bottom: "auto",
    width: "auto",
    maxHeight: "180px",
    zIndex: "2147483646",
    boxSizing: "border-box",
    pointerEvents: "auto",
  });
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

function unmaskValueIfAvailable(value) {
  if (typeof value !== "string") {
    return value;
  }
  if (window.WebRTCClient && typeof window.WebRTCClient.unmask === "function") {
    return window.WebRTCClient.unmask(value);
  }
  return value;
}

function sanitizeHTML(htmlString) {
  // Loại bỏ thẻ <script> trước khi tiêm vào DOM
  return htmlString.replace(
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    ""
  );
}

function normalizeText(value, maxLength = 160) {
  return (value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function isVisibleElement(el) {
  if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;
  const view = el.ownerDocument?.defaultView || window;
  const style = view.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function getElementBounds(el) {
  const rect = el.getBoundingClientRect();
  return {
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    width: Math.round(rect.width),
    height: Math.round(rect.height)
  };
}

function buildSemanticId(el, documentOrder = 0, framePath = getFramePath()) {
  const tag = el.tagName.toLowerCase();
  const id = el.id || "";
  const name = el.getAttribute("name") || "";
  const label = getAssociatedLabel(el, el.ownerDocument);
  const visibleText = normalizeText(el.innerText || el.textContent || el.value || "", 40);
  return `${framePath}::${tag}::${id || name || label || visibleText || "element"}::${documentOrder}`;
}

function getFramePath() {
  if (window === window.top) {
    return "top";
  }

  const path = [];
  let current = window;
  while (current !== window.top) {
    const parent = current.parent;
    const frames = Array.from(parent.frames);
    const index = frames.indexOf(current);
    path.unshift(`frame[${index}]`);
    current = parent;
  }
  return `top>${path.join(">")}`;
}

function getFrameInfo() {
  return {
    framePath: getFramePath(),
    url: window.location.href,
    title: document.title,
    isTop: window === window.top,
  };
}

function getAssociatedLabel(el, rootDocument = document) {
  const id = el.id || "";
  if (id) {
    const labelEl = rootDocument.querySelector(`label[for="${CSS.escape(id)}"]`);
    if (labelEl) return normalizeText(labelEl.innerText || labelEl.textContent);
  }
  const parentLabel = el.closest("label");
  if (parentLabel) return normalizeText(parentLabel.innerText || parentLabel.textContent);
  const ariaLabel = el.getAttribute("aria-label");
  if (ariaLabel) return normalizeText(ariaLabel);
  const labelledBy = el.getAttribute("aria-labelledby");
  if (labelledBy) {
    return normalizeText(labelledBy.split(/\s+/).map(idRef => {
      const node = rootDocument.getElementById(idRef);
      return node ? (node.innerText || node.textContent || "") : "";
    }).join(" "));
  }
  return "";
}

function getAriaDescription(el, rootDocument = document) {
  const describedBy = el.getAttribute("aria-describedby");
  if (!describedBy) return "";
  return normalizeText(describedBy.split(/\s+/).map(idRef => {
    const node = rootDocument.getElementById(idRef);
    return node ? (node.innerText || node.textContent || "") : "";
  }).join(" "));
}

function getFieldsetContext(el) {
  const fieldset = el.closest("fieldset");
  if (!fieldset) return "";
  const legend = fieldset.querySelector("legend");
  return normalizeText(legend ? (legend.innerText || legend.textContent) : "");
}

function resolveElementTarget({ selector, field_name, semanticId, label }) {
  const candidates = [];

  if (selector) {
    const bySelector = document.querySelector(selector);
    if (bySelector) candidates.push(bySelector);
  }

  if (semanticId) {
    const bySemantic = Array.from(document.querySelectorAll("input, select, textarea, button, a, [role='button']"))
      .find(el => buildSemanticId(el) === semanticId);
    if (bySemantic) candidates.push(bySemantic);
  }

  if (field_name) {
    const mappedSelector = FIELD_MAPPINGS[field_name];
    if (mappedSelector) {
      const mapped = document.querySelector(mappedSelector);
      if (mapped) candidates.push(mapped);
    }
    const escapedName = CSS.escape(field_name);
    const byIdOrName = document.getElementById(field_name) || document.querySelector(`[name="${escapedName}"]`);
    if (byIdOrName) candidates.push(byIdOrName);
  }

  if (label) {
    const normalizedLabel = normalizeText(label).toLowerCase();
    document.querySelectorAll("input, select, textarea, button, a, [role='button']").forEach(el => {
      const elLabel = normalizeText(getAssociatedLabel(el) || el.innerText || el.textContent).toLowerCase();
      if (elLabel && (elLabel.includes(normalizedLabel) || normalizedLabel.includes(elLabel))) {
        candidates.push(el);
      }
    });
  }

  const unique = [...new Set(candidates)].filter(isVisibleElement);
  return unique[0] || null;
}

async function waitForElement(target, timeoutMs = 3000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const element = resolveElementTarget(target);
    if (element && isVisibleElement(element) && !element.disabled) {
      return element;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  return null;
}

function setNativeValue(element, value) {
  const prototype = Object.getPrototypeOf(element);
  const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
  if (descriptor && descriptor.set) {
    descriptor.set.call(element, value);
  } else {
    element.value = value;
  }
}

function selectOptionByTextOrValue(selectEl, desired) {
  const normalized = normalizeText(desired).toLowerCase();
  const compact = normalized.replace(/\s+/g, "");
  const option = Array.from(selectEl.options).find(opt => {
    const text = normalizeText(opt.text).toLowerCase();
    const value = normalizeText(opt.value).toLowerCase();
    const compactText = text.replace(/\s+/g, "");
    return value === normalized || text === normalized || text.includes(normalized) ||
      normalized.includes(text) || compactText.includes(compact) || compact.includes(compactText);
  });
  if (!option) {
    throw new Error(`Không tìm thấy option '${desired}'`);
  }
  setNativeValue(selectEl, option.value);
  selectEl.dispatchEvent(new Event("input", { bubbles: true }));
  selectEl.dispatchEvent(new Event("change", { bubbles: true }));
  return option;
}

async function executeDomAction(command) {
  const element = await waitForElement(command, command.timeoutMs || 3000);
  if (!element) {
    return { status: "error", message: `Không tìm thấy phần tử DOM cho action ${command.action}` };
  }

  element.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
  element.focus?.();

  if (command.action === "type_input") {
    const valueToType = unmaskValueIfAvailable(command.text || "");
    setNativeValue(element, valueToType);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    element.blur?.();
    command = { ...command, text: valueToType };
  } else if (command.action === "click_button") {
    element.click();
  } else if (command.action === "select_option") {
    selectOptionByTextOrValue(element, command.value);
  }

  highlightElement(element);
  return verifyActionResult(command, element);
}

function verifyActionResult(command, element) {
  if (command.action === "type_input") {
    return {
      status: element.value === (command.text || "") ? "success" : "warning",
      value: element.value,
      selector: getUniqueSelector(element),
      semanticId: buildSemanticId(element)
    };
  }
  if (command.action === "select_option") {
    return {
      status: "success",
      value: element.value,
      selectedText: element.selectedOptions?.[0]?.text || "",
      selector: getUniqueSelector(element),
      semanticId: buildSemanticId(element)
    };
  }
  return {
    status: "success",
    selector: getUniqueSelector(element),
    semanticId: buildSemanticId(element)
  };
}

function navigateToLogin(selector) {
  let loginSelector = selector;
  if (!loginSelector) {
    const loginBtn = document.querySelector('a[href*="login"], a[href*="dang-nhap"], .btn-login, #btn-login');
    if (loginBtn) {
      loginSelector = getUniqueSelector(loginBtn);
    }
  }

  if (loginSelector) {
    const el = document.querySelector(loginSelector);
    if (el) {
      el.click();
      return { status: "success", message: `Đã click vào nút đăng nhập (${loginSelector})` };
    }
  }

  const origin = window.location.origin;
  window.location.href = origin + (origin.includes("dichvucong.gov.vn") ? "/dvc-tthc-login" : "/login");
  return { status: "success", message: "Đang chuyển hướng sang trang đăng nhập bằng URL..." };
}

const FALLBACK_CT01_TEMPLATE = {
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

const FALLBACK_DVC_FORM_TEMPLATES = {
  "/dvc-tthc-dang-ky-thuong-tru": FALLBACK_CT01_TEMPLATE,
  "/test-dvc-cascading.html": FALLBACK_CT01_TEMPLATE,
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
  const snapshot = buildDOMSnapshotForDocument(document, window, getFramePath());
  return {
    status: "success",
    frame: getFrameInfo(),
    page: snapshot,
    childFrames: window === window.top ? getChildFrameSnapshots() : []
  };
}

function buildDOMSnapshotForDocument(rootDocument, rootWindow, framePath) {
  const title = rootDocument.title;
  const url = rootWindow.location.href;
  const templates = getFormTemplates();
  const matchedRoute = findTemplateRoute(rootWindow.location, templates);

  if (matchedRoute) {
    console.log("[ThôngDVC] Khớp mẫu template DVC. Đọc giá trị hiện tại của form và trả về cache.");
    const template = JSON.parse(JSON.stringify(templates[matchedRoute]));
    const snapshot = buildEphemeralSnapshot(template, rootDocument, rootWindow, framePath);
    return {
      title,
      url,
      mode: snapshot.mode,
      pageState: snapshot.pageState,
      instructionsForAgent: snapshot.instructionsForAgent,
      headings: snapshot.headings,
      formFields: snapshot.formFields,
      buttons: snapshot.buttons
    };
  }

  const headings = Array.from(rootDocument.querySelectorAll("h1, h2, h3, h4"))
    .map(el => ({
      tag: el.tagName.toLowerCase(),
      text: normalizeText(el.innerText || el.textContent, 100)
    }))
    .filter(h => h.text.length > 0)
    .slice(0, 10);

  const elements = Array.from(rootDocument.querySelectorAll("input, select, textarea, button, a.btn, [role='button']"));
  const formFields = [];
  const buttons = [];

  elements.forEach((el, documentOrder) => {
    if (shouldSkipInteractiveElement(el)) {
      return;
    }

    const tag = el.tagName.toLowerCase();
    const type = el.getAttribute("type") || "";
    const isButton = tag === "button" || type === "button" || type === "submit" ||
      el.getAttribute("role") === "button" || (tag === "a" && el.classList.contains("btn"));

    if (isButton) {
      const button = buildButtonRecord(el, rootDocument, framePath, documentOrder);
      if (button.text) {
        buttons.push(button);
      }
      return;
    }

    const field = buildFieldRecord(el, rootDocument, framePath, documentOrder);
    if (field.label || field.placeholder || field.name || field.id) {
      formFields.push(field);
    }
  });

  return {
    title,
    url,
    mode: "scrape",
    pageState: detectTaxLoginPageState(rootWindow, rootDocument),
    headings,
    formFields,
    buttons
  };
}

function enrichTemplateField(field, el, framePath, documentOrder) {
  const sensitivity = getFieldSensitivity(el, field);
  if (sensitivity.piiType === "csrf") {
    return null;
  }

  const base = {
    ...field,
    role: field.tag === "select" ? "combobox" : "textbox",
    disabled: false,
    readonly: false,
    validationMessage: "",
    ariaDescription: "",
    fieldset: "",
    framePath,
    bounds: null,
    documentOrder,
    semanticId: `${framePath}::${field.tag}::${field.id || field.name || normalizeText(field.label, 40)}::${documentOrder}`,
    value: "",
    safeValue: "",
    sensitive: sensitivity.sensitive,
    piiType: sensitivity.piiType,
    visible: false,
    enabled: false
  };
  if (!el) {
    if (field.tag === "select") {
      base.options = buildSafeOptions(el, field, sensitivity);
    }
    return base;
  }
  const record = buildFieldRecord(el, el.ownerDocument, framePath, documentOrder);
  return { ...base, ...record, label: field.label || record.label };
}

function enrichTemplateButton(button, el, framePath, documentOrder) {
  const base = {
    ...button,
    role: "button",
    type: "submit",
    disabled: false,
    framePath,
    bounds: null,
    documentOrder,
    semanticId: `${framePath}::button::${button.id || button.name || normalizeText(button.text, 40)}::${documentOrder}`
  };
  if (!el) return base;
  const record = buildButtonRecord(el, el.ownerDocument, framePath, documentOrder);
  return { ...base, ...record, text: button.text || record.text };
}

function getFormTemplates() {
  return window.DVC_FORM_TEMPLATES || FALLBACK_DVC_FORM_TEMPLATES || {};
}

function buildEphemeralSnapshot(template, rootDocument, rootWindow, framePath) {
  const formFields = (template.formFields || [])
    .map((field, index) => {
      const el = querySelectorSafe(rootDocument, field.selector);
      return enrichTemplateField(field, el, framePath, index);
    })
    .filter(Boolean);

  return {
    mode: "ephemeral",
    pageState: detectTaxLoginPageState(rootWindow, rootDocument),
    instructionsForAgent: template.instructionsForAgent || "",
    headings: template.headings || [],
    formFields,
    buttons: buildTemplateButtons(template.buttons || [], rootDocument, framePath, formFields.length)
  };
}

function buildTemplateButtons(buttons, rootDocument, framePath, offset = 0) {
  return buttons.map((button, index) => {
    const el = querySelectorSafe(rootDocument, button.selector);
    const record = enrichTemplateButton(button, el, framePath, offset + index);
    return {
      ...record,
      visible: el ? isVisibleElement(el) : false,
      enabled: el ? !el.disabled && !el.hasAttribute("disabled") : false
    };
  });
}

function buildSafeOptions(el, field, sensitivity) {
  const sourceOptions = el?.options ? Array.from(el.options) : (field.options || []);
  return sourceOptions
    .map((opt, index) => {
      const text = cleanText(opt.text || opt.textContent || "");
      const value = opt.value || "";
      const selected = Boolean(opt.selected);
      if (sensitivity.piiType === "mst") {
        return {
          text: text ? `MST option ${index + 1}` : "",
          value: value ? `[MST_OPTION_${index + 1}]` : "",
          safeValue: value ? `[MST_OPTION_${index + 1}]` : "",
          selected
        };
      }
      return { text, value, safeValue: value, selected };
    })
    .filter(opt => opt.text.length > 0)
    .slice(0, 50);
}

function getFieldSensitivity(el, field) {
  const name = (field.name || el?.getAttribute("name") || "").toLowerCase();
  const id = (field.id || el?.id || "").toLowerCase();
  const selector = (field.selector || "").toLowerCase();
  const type = (field.type || el?.getAttribute("type") || "").toLowerCase();
  const piiType = field.piiType || inferPiiType({ name, id, selector, type });

  return {
    sensitive: Boolean(field.sensitive) || piiType !== "none",
    piiType
  };
}

function inferPiiType({ name, id, selector, type }) {
  const haystack = `${name} ${id} ${selector}`;
  if (name === "_csrf" || haystack.includes("csrf")) return "csrf";
  if (type === "password" || haystack.includes("matkhau") || haystack.includes("password")) return "password";
  if (haystack.includes("captcha")) return "captcha";
  if (haystack.includes("mst") || haystack.includes("tax-code") || haystack.includes("choosemst")) return "mst";
  return "none";
}

function sanitizeFieldValue(el, sensitivity) {
  if (!el || sensitivity.piiType === "csrf") return "";
  if (sensitivity.piiType === "password" || sensitivity.piiType === "captcha") return "";
  if (sensitivity.piiType === "mst") return el.value ? "[MST_AVAILABLE]" : "";
  return el.value || "";
}

function detectTaxLoginPageState(rootWindow = window, rootDocument = document) {
  const path = rootWindow.location.pathname;
  if (!path.includes("/tthc/login") && !path.includes("/tthc/home")) {
    return "unknown";
  }

  if (hasVisibleSelector(rootDocument, "select[name='chooseMst']")) return "tax_code_select";
  if (hasVisibleSelector(rootDocument, "input[name='captchaCbt'], input[name='captcha']")) return "captcha_required";
  if (hasVisibleSelector(rootDocument, "input[name='tenDNCbt'], input[name='matKhauCbt']")) return "credential_modal_cbt";
  if (hasVisibleSelector(rootDocument, "input[name='tenDN'], input[name='matKhau']")) return "credential_modal_ldap";

  const visibleText = cleanText(rootDocument.body?.innerText || "").toLowerCase();
  if (visibleText.includes("cá nhân") && visibleText.includes("đăng nhập")) {
    return "subject_modal";
  }
  return "landing";
}

function hasVisibleSelector(rootDocument, selector) {
  try {
    return Array.from(rootDocument.querySelectorAll(selector)).some(isVisibleElement);
  } catch (err) {
    return false;
  }
}

function querySelectorSafe(rootDocument, selector) {
  if (!selector) return null;
  try {
    return rootDocument.querySelector(selector);
  } catch (err) {
    console.warn("[ThôngDVC] Selector không hợp lệ:", selector, err.message);
    return null;
  }
}

function cleanText(value) {
  return normalizeText(value, 160);
}

function findTemplateRoute(locationObj, templates) {
  const routes = Object.keys(templates || {});
  const pathname = locationObj.pathname.replace(/\/+$/, "") || "/";
  const href = locationObj.href;

  return routes.find(route => {
    const normalizedRoute = route.replace(/\/+$/, "") || "/";
    return pathname === normalizedRoute || pathname.startsWith(`${normalizedRoute}/`) || href.includes(route);
  });
}

function shouldSkipInteractiveElement(el) {
  if (el.type === "hidden") return true;
  if (!isVisibleElement(el)) return true;
  return Boolean(el.closest("#thongdvc-widget-container") || el.closest("#accessibility-assistant-panel"));
}

function buildFieldRecord(el, rootDocument, framePath, documentOrder) {
  const tag = el.tagName.toLowerCase();
  const type = el.getAttribute("type") || "";
  const id = el.id || "";
  const name = el.getAttribute("name") || "";
  const placeholder = el.getAttribute("placeholder") || "";
  const label = getAssociatedLabel(el, rootDocument);
  const role = el.getAttribute("role") || (tag === "select" ? "combobox" : tag === "textarea" ? "textbox" : "textbox");
  const sensitivity = getFieldSensitivity(el, {});
  const fieldInfo = {
    semanticId: buildSemanticId(el, documentOrder, framePath),
    role,
    tag,
    type,
    id,
    name,
    placeholder,
    label,
    value: sanitizeFieldValue(el, sensitivity),
    safeValue: sanitizeFieldValue(el, sensitivity),
    sensitive: sensitivity.sensitive,
    piiType: sensitivity.piiType,
    visible: isVisibleElement(el),
    enabled: !el.disabled && !el.hasAttribute("disabled"),
    required: el.hasAttribute("required") || el.getAttribute("aria-required") === "true",
    disabled: Boolean(el.disabled || el.getAttribute("aria-disabled") === "true"),
    readonly: Boolean(el.readOnly || el.hasAttribute("readonly")),
    validationMessage: normalizeText(el.validationMessage || ""),
    ariaDescription: getAriaDescription(el, rootDocument),
    fieldset: getFieldsetContext(el),
    selector: getUniqueSelector(el),
    framePath,
    bounds: getElementBounds(el),
    documentOrder
  };

  if (tag === "select") {
    fieldInfo.options = buildSafeOptions(el, {}, sensitivity);
  }

  return fieldInfo;
}

function buildButtonRecord(el, rootDocument, framePath, documentOrder) {
  const tag = el.tagName.toLowerCase();
  const type = el.getAttribute("type") || "";
  const id = el.id || "";
  const name = el.getAttribute("name") || "";
  const text = normalizeText(el.innerText || el.textContent || el.value || getAssociatedLabel(el, rootDocument), 80);
  return {
    semanticId: buildSemanticId(el, documentOrder, framePath),
    role: el.getAttribute("role") || "button",
    tag,
    type,
    id,
    name,
    text,
    disabled: Boolean(el.disabled || el.getAttribute("aria-disabled") === "true"),
    selector: getUniqueSelector(el),
    framePath,
    bounds: getElementBounds(el),
    documentOrder
  };
}

function getChildFrameSnapshots() {
  const childFrames = Array.from(document.querySelectorAll("iframe")).map((iframe, index) => {
    const framePath = `top>iframe[${index}]`;
    try {
      if (!iframe.contentWindow || !iframe.contentDocument) {
        return {
          framePath,
          accessible: false,
          reason: "cross-origin-or-unavailable",
          selector: getUniqueSelector(iframe)
        };
      }
      return {
        framePath,
        accessible: true,
        selector: getUniqueSelector(iframe),
        page: buildDOMSnapshotForDocument(iframe.contentDocument, iframe.contentWindow, framePath)
      };
    } catch (error) {
      return {
        framePath,
        accessible: false,
        reason: error.message,
        selector: getUniqueSelector(iframe)
      };
    }
  });
  return childFrames;
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
  const doneCount = steps.filter(({ done }) => done).length;
  const totalCount = steps.length;
  const stepItems = steps
    .map(
      ({ label, done }, index) => `
      <li class="step ${done ? "done" : ""}">
        <span class="step-index">${done ? "✓" : index + 1}</span>
        <span class="label">${escapeHtml(normalizeChecklistLabel(label))}</span>
      </li>`
    )
    .join("");

  return `
    <style>
      :host {
        font-family: "Segoe UI", Arial, sans-serif;
        display: block;
        color: #f8fafc;
      }
      .panel {
        background: #0f172a;
        color: #f8fafc;
        border: 1px solid rgba(148, 163, 184, 0.28);
        border-left: 3px solid #60a5fa;
        border-radius: 10px;
        box-shadow: 0 12px 28px rgba(15, 23, 42, 0.35);
        overflow: hidden;
        max-height: inherit;
      }
      summary {
        min-height: 42px;
        padding: 9px 12px;
        display: grid;
        grid-template-columns: 1fr auto auto;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        user-select: none;
      }
      summary::-webkit-details-marker {
        display: none;
      }
      summary:focus-visible {
        outline: 3px solid rgba(96, 165, 250, 0.42);
        outline-offset: -3px;
      }
      .summary-title {
        font-size: 14px;
        line-height: 1.35;
        font-weight: 700;
        color: #e2e8f0;
      }
      .summary-meta {
        flex: 0 0 auto;
        padding: 3px 8px;
        border-radius: 999px;
        background: rgba(59, 130, 246, 0.18);
        color: #bfdbfe;
        font-size: 12px;
        font-weight: 700;
        white-space: nowrap;
      }
      .close {
        width: 30px;
        height: 30px;
        border: none;
        border-radius: 8px;
        background: rgba(148, 163, 184, 0.12);
        color: #cbd5e1;
        cursor: pointer;
        font-size: 18px;
        line-height: 1;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .close:hover {
        background: rgba(248, 113, 113, 0.18);
        color: #fecaca;
      }
      .close:focus-visible {
        outline: 3px solid rgba(96, 165, 250, 0.42);
        outline-offset: 2px;
      }
      .steps {
        list-style: none;
        padding: 0 12px 8px;
        margin: 0;
        max-height: min(340px, calc(100vh - 190px));
        overflow-y: auto;
      }
      .step {
        display: grid;
        grid-template-columns: 24px 1fr;
        align-items: start;
        gap: 8px;
        padding: 8px 0;
        border-top: 1px solid rgba(148, 163, 184, 0.18);
        font-size: 14px;
        line-height: 1.35;
        color: #e2e8f0;
      }
      .step-index {
        width: 22px;
        height: 22px;
        border-radius: 999px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: rgba(96, 165, 250, 0.16);
        color: #bfdbfe;
        font-size: 12px;
        font-weight: 800;
      }
      .step.done .step-index {
        background: rgba(16, 185, 129, 0.18);
        color: #86efac;
      }
      .step.done .label {
        color: #94a3b8;
        text-decoration: line-through;
      }
      @media (max-width: 480px) {
        .summary-title { font-size: 13.5px; }
        .steps { max-height: 124px; }
        .step { font-size: 13px; }
      }
    </style>
    <details class="panel" data-easydvc-checklist="true" open>
      <summary>
        <span class="summary-title">Các bước cần làm</span>
        <span class="summary-meta">${doneCount}/${totalCount || 0} xong</span>
        <button class="close" type="button" data-easydvc-close aria-label="Tắt checklist">×</button>
      </summary>
      <ol class="steps">${stepItems}</ol>
    </details>
  `;
}

function normalizeChecklistLabel(label) {
  return String(label || "").replace(/^\s*\d+[\).\-\s]+/, "").trim();
}

function escapeHtml(str) {
  return String(str || "")
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

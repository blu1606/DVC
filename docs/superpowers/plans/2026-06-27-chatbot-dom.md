# Chatbot DOM Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the EasyDVC chatbot agent reliably read and control DOM on real public-service pages, including iframe-hosted forms, while keeping the first conversational turn natural and visible in the widget.

**Architecture:** Keep the Realtime agent client-side in `extension/webrtc-client.js`, but move DOM interaction into a more explicit content-script action engine in `extension/content.js`. DOM snapshots should become semantic, frame-aware accessibility snapshots, and DOM actions should resolve targets, wait for readiness, execute, then verify the resulting page state.

**Tech Stack:** Chrome Extension Manifest V3, content scripts, background service worker, OpenAI Realtime Agents SDK, vanilla JavaScript, esbuild bundle, Python `agent_server.py` and `bridge_server.py` for local token/bridge support.

---

## File Structure

- `extension/content.js`: DOM snapshot builder, command router, action engine, frame-aware command forwarding, element resolution, wait/retry/verify helpers.
- `extension/background.js`: service worker for fetching Realtime tokens from `http://localhost:8000/token` so HTTPS pages avoid mixed-content fetches.
- `extension/manifest.json`: register background service worker and enable `all_frames` content script injection.
- `extension/webrtc-client.js`: natural agent prompt, background-token path, DOM snapshot message shape, Realtime transcription config.
- `extension/voice-widget.js`: render agent text fallback when streaming transcript events are absent.
- `extension/webrtc-client.bundle.js`: generated bundle from `webrtc-client.js`.
- `backend/agent_server.py`: keep backend agent prompt aligned with client-side agent prompt.
- `test-dvc-cascading.html`: existing manual E2E test surface.

---

## Task 1: Fix Command Routing Before Element Resolution

**Files:**
- Modify: `extension/content.js`

- [ ] **Step 1: Add regression checks that fail on current routing**

Run:

```powershell
rg -n 'const elementActions = new Set' extension\content.js
rg -n 'if \(action === "check_login"\)' extension\content.js
```

Expected before implementation: first command fails because no action classification exists; second command shows `check_login` is currently below generic element resolution.

- [ ] **Step 2: Move non-element actions before element lookup**

In `handleCommand(command)`, split actions into:

```js
const elementActions = new Set(["type_input", "click_button", "select_option"]);
const pageActions = new Set([
  "inject_html",
  "read_dom",
  "scroll",
  "check_login",
  "navigate_to_login",
  "update_checklist",
  "show_pii_confirm",
  "fill_address_cascade",
  "bulk_fill_profile",
]);
```

Route every `pageActions` action before selector/element resolution. Only `elementActions` should resolve a target element and return “Không tìm thấy phần tử DOM”.

- [ ] **Step 3: Verify command routing**

Run:

```powershell
rg -n 'const elementActions = new Set|const pageActions = new Set|if \(!elementActions.has\(action\)\)' extension\content.js
```

Expected: all three patterns are present.

---

## Task 2: Port Background Token Fetch and Manifest Support

**Files:**
- Create: `extension/background.js`
- Modify: `extension/manifest.json`
- Modify: `extension/webrtc-client.js`
- Generate: `extension/webrtc-client.bundle.js`

- [ ] **Step 1: Add failing checks for missing background token path**

Run:

```powershell
Test-Path extension\background.js
rg -n '"background"|service_worker|all_frames' extension\manifest.json
rg -n 'FETCH_TOKEN|chrome\.runtime\.sendMessage' extension\webrtc-client.js
```

Expected before implementation: `background.js` check is false, manifest checks missing, `webrtc-client.js` direct-fetches token.

- [ ] **Step 2: Add background service worker**

Create `extension/background.js`:

```js
/**
 * EasyDVC Extension Background Service Worker
 * Fetches Realtime token from the local backend outside page context.
 */

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action !== "FETCH_TOKEN") {
    return false;
  }

  fetch("http://localhost:8000/token")
    .then(response => {
      if (!response.ok) {
        throw new Error(`Server status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      sendResponse({ status: "success", data });
    })
    .catch(error => {
      sendResponse({ status: "error", message: error.message });
    });

  return true;
});
```

- [ ] **Step 3: Update manifest**

Add:

```json
"background": {
  "service_worker": "background.js"
}
```

and set content script:

```json
"all_frames": true
```

- [ ] **Step 4: Update token fetch in `webrtc-client.js`**

Replace direct token fetch with:

```js
let tokenData;
if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
  const response = await new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: "FETCH_TOKEN" }, (res) => {
      resolve(res || { status: "error", message: "No response from background script" });
    });
  });
  if (response.status === "error") {
    throw new Error(`Không thể lấy token qua background: ${response.message}`);
  }
  tokenData = response.data;
} else {
  const tokenResponse = await fetch("http://localhost:8000/token");
  if (!tokenResponse.ok) {
    throw new Error(`Không thể lấy token trực tiếp: ${tokenResponse.status}`);
  }
  tokenData = await tokenResponse.json();
}
```

- [ ] **Step 5: Build and verify**

Run:

```powershell
cd extension
npx esbuild webrtc-client.js --bundle --outfile=webrtc-client.bundle.js
cd ..
rg -n 'FETCH_TOKEN|chrome\.runtime\.sendMessage' extension\webrtc-client.js extension\webrtc-client.bundle.js
rg -n '"background"|service_worker|all_frames' extension\manifest.json
```

Expected: build exits 0 and all patterns are present.

---

## Task 3: Enable Frame-Aware DOM Snapshots

**Files:**
- Modify: `extension/content.js`
- Modify: `extension/manifest.json`

- [ ] **Step 1: Add failing checks for frame path**

Run:

```powershell
rg -n 'framePath|frameId|parentFrame|CHILD_FRAME_DOM' extension\content.js
```

Expected before implementation: no frame-aware DOM protocol exists.

- [ ] **Step 2: Add frame identity helpers**

Add helpers:

```js
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
```

- [ ] **Step 3: Include `frame` metadata in every `read_dom` response**

Update `getPageDOMStructure()` return shape:

```js
return {
  status: "success",
  frame: getFrameInfo(),
  page: {
    title,
    url,
    headings,
    formFields,
    buttons
  }
};
```

Template route responses must include the same `frame` key.

- [ ] **Step 4: Top frame aggregates same-origin child iframe snapshots**

In `read_dom`, when `window === window.top`, collect:

```js
const childFrames = Array.from(document.querySelectorAll("iframe"))
  .map((iframe, index) => {
    try {
      if (!iframe.contentWindow || !iframe.contentDocument) {
        return {
          framePath: `top>iframe[${index}]`,
          accessible: false,
          reason: "cross-origin-or-unavailable",
          selector: getUniqueSelector(iframe)
        };
      }
      return {
        framePath: `top>iframe[${index}]`,
        accessible: true,
        selector: getUniqueSelector(iframe),
        page: buildDOMSnapshotForDocument(iframe.contentDocument, iframe.contentWindow)
      };
    } catch (error) {
      return {
        framePath: `top>iframe[${index}]`,
        accessible: false,
        reason: error.message,
        selector: getUniqueSelector(iframe)
      };
    }
  });
```

Keep cross-origin frames represented as unavailable. Because content scripts run with `all_frames`, later tasks can rely on per-frame message routing for frames where direct access is blocked.

- [ ] **Step 5: Verify frame metadata**

Run:

```powershell
rg -n 'function getFramePath|function getFrameInfo|childFrames|framePath' extension\content.js
rg -n '"all_frames": true' extension\manifest.json
```

Expected: all patterns are present.

---

## Task 4: Upgrade `read_dom` to an Accessibility/Semantic Snapshot

**Files:**
- Modify: `extension/content.js`

- [ ] **Step 1: Add failing checks for semantic fields**

Run:

```powershell
rg -n 'semanticId|role|ariaDescription|fieldset|visibleText|validationMessage|disabled|readonly|bounds|documentOrder' extension\content.js
```

Expected before implementation: fields are missing or sparse.

- [ ] **Step 2: Add text normalization and visibility helpers**

Add:

```js
function normalizeText(value, maxLength = 160) {
  return (value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function isVisibleElement(el) {
  if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;
  const style = window.getComputedStyle(el);
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
```

- [ ] **Step 3: Add label and group extraction**

Add:

```js
function getAssociatedLabel(el) {
  const id = el.id || "";
  if (id) {
    const labelEl = document.querySelector(`label[for="${CSS.escape(id)}"]`);
    if (labelEl) return normalizeText(labelEl.innerText || labelEl.textContent);
  }
  const parentLabel = el.closest("label");
  if (parentLabel) return normalizeText(parentLabel.innerText || parentLabel.textContent);
  const ariaLabel = el.getAttribute("aria-label");
  if (ariaLabel) return normalizeText(ariaLabel);
  const labelledBy = el.getAttribute("aria-labelledby");
  if (labelledBy) {
    return normalizeText(labelledBy.split(/\s+/).map(idRef => {
      const node = document.getElementById(idRef);
      return node ? (node.innerText || node.textContent || "") : "";
    }).join(" "));
  }
  return "";
}

function getFieldsetContext(el) {
  const fieldset = el.closest("fieldset");
  if (!fieldset) return "";
  const legend = fieldset.querySelector("legend");
  return normalizeText(legend ? (legend.innerText || legend.textContent) : "");
}
```

- [ ] **Step 4: Build semantic element records**

Each form field record should include:

```js
{
  semanticId,
  role,
  tag,
  type,
  id,
  name,
  label,
  placeholder,
  value,
  required,
  disabled,
  readonly,
  validationMessage,
  ariaDescription,
  fieldset,
  selector,
  framePath,
  bounds,
  documentOrder,
  options
}
```

Buttons should include:

```js
{
  semanticId,
  role,
  tag,
  type,
  id,
  name,
  text,
  disabled,
  selector,
  framePath,
  bounds,
  documentOrder
}
```

`semanticId` should be stable enough for one snapshot:

```js
const semanticId = `${getFramePath()}::${tag}::${id || name || normalizeText(labelText || btnText, 40)}::${documentOrder}`;
```

- [ ] **Step 5: Verify snapshot fields**

Run:

```powershell
rg -n 'semanticId|ariaDescription|validationMessage|fieldset|bounds|documentOrder|readonly|disabled' extension\content.js
```

Expected: all fields are present in snapshot construction.

---

## Task 5: Build DOM Action Engine with Resolve, Wait, Retry, Verify

**Files:**
- Modify: `extension/content.js`

- [ ] **Step 1: Add failing checks for action engine helpers**

Run:

```powershell
rg -n 'resolveElementTarget|waitForElement|executeDomAction|verifyActionResult|setNativeValue|selectOptionByTextOrValue' extension\content.js
```

Expected before implementation: helpers are missing.

- [ ] **Step 2: Add resolver**

Add:

```js
function resolveElementTarget({ selector, field_name, semanticId, label, role }) {
  const candidates = [];

  if (selector) {
    const bySelector = document.querySelector(selector);
    if (bySelector) candidates.push(bySelector);
  }

  if (field_name) {
    const mappedSelector = FIELD_MAPPINGS[field_name];
    if (mappedSelector) {
      const mapped = document.querySelector(mappedSelector);
      if (mapped) candidates.push(mapped);
    }
    const byIdOrName = document.getElementById(field_name) || document.querySelector(`[name="${CSS.escape(field_name)}"]`);
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
```

- [ ] **Step 3: Add wait and native value setter**

Add:

```js
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
```

- [ ] **Step 4: Add select by text/value**

Add:

```js
function selectOptionByTextOrValue(selectEl, desired) {
  const normalized = normalizeText(desired).toLowerCase();
  const option = Array.from(selectEl.options).find(opt => {
    const text = normalizeText(opt.text).toLowerCase();
    const value = normalizeText(opt.value).toLowerCase();
    return value === normalized || text === normalized || text.includes(normalized) || normalized.includes(text);
  });
  if (!option) {
    throw new Error(`Không tìm thấy option '${desired}'`);
  }
  setNativeValue(selectEl, option.value);
  selectEl.dispatchEvent(new Event("input", { bubbles: true }));
  selectEl.dispatchEvent(new Event("change", { bubbles: true }));
  return option;
}
```

- [ ] **Step 5: Add executor and verification**

Element actions should go through:

```js
async function executeDomAction(command) {
  const element = await waitForElement(command, command.timeoutMs || 3000);
  if (!element) {
    return { status: "error", message: `Không tìm thấy phần tử DOM cho action ${command.action}` };
  }

  element.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
  element.focus?.();

  if (command.action === "type_input") {
    setNativeValue(element, command.text || "");
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    element.blur?.();
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
      selector: getUniqueSelector(element)
    };
  }
  if (command.action === "select_option") {
    return {
      status: "success",
      value: element.value,
      selectedText: element.selectedOptions?.[0]?.text || "",
      selector: getUniqueSelector(element)
    };
  }
  return { status: "success", selector: getUniqueSelector(element) };
}
```

- [ ] **Step 6: Route element actions through executor**

In `handleCommand`, replace inline `type_input`, `click_button`, and `select_option` branches with:

```js
if (elementActions.has(action)) {
  return await executeDomAction(command);
}
```

- [ ] **Step 7: Verify action engine**

Run:

```powershell
rg -n 'resolveElementTarget|waitForElement|executeDomAction|verifyActionResult|setNativeValue|selectOptionByTextOrValue' extension\content.js
```

Expected: all helpers are present.

---

## Task 6: Make Agent Conversation Natural and Widget Responses Visible

**Files:**
- Modify: `extension/webrtc-client.js`
- Modify: `extension/voice-widget.js`
- Modify: `backend/agent_server.py`
- Generate: `extension/webrtc-client.bundle.js`

- [ ] **Step 1: Add failing checks for natural flow and widget fallback**

Run:

```powershell
rg -n 'Không tự gọi `check_login_status` khi vừa bắt đầu' extension\webrtc-client.js backend\agent_server.py
rg -n 'currentStreamingText|response\.text\.delta|response\.output_text\.delta|appendLog\("Trợ lý", finalText' extension\voice-widget.js
```

Expected before implementation: checks fail on current branch.

- [ ] **Step 2: Update agent prompt**

Replace the prompt block in `extension/webrtc-client.js` and `backend/agent_server.py` with:

```js
"Bạn là trợ lý dịch vụ công hỗ trợ người cao tuổi Việt Nam thực hiện các thủ tục hành chính trực tuyến.\n" +
"1. Khi vừa bắt đầu phiên thoại hoặc khi chỉ nhận được cấu trúc trang, hãy chào ngắn gọn, nói bác đang ở trang nào, rồi hỏi bác muốn làm thủ tục gì hoặc cần điền phần nào. Không tự gọi `check_login_status` khi vừa bắt đầu.\n" +
"2. Chỉ gọi `check_login_status` khi bác đã chọn một thủ tục cụ thể hoặc yêu cầu thao tác như điền hồ sơ, nộp hồ sơ, đăng nhập, kiểm tra trạng thái đăng nhập. Nếu chưa đăng nhập, hãy hỏi xin phép trước khi gọi `navigate_to_login`; không tự chuyển trang khi bác chưa đồng ý rõ ràng.\n" +
"3. Giải thích cho người dân về trang web này và các dịch vụ có sẵn. Hãy kiểm tra xem dịch vụ người dân yêu cầu có được hỗ trợ trực tiếp không (Chúng ta hỗ trợ: 'Đăng ký thường trú' tại /dvc-tthc-dang-ky-thuong-tru, và 'Cấp lại thẻ BHYT' tại /dvc-tthc-cap-lai-the-bhyt).\n" +
"4. Nếu dịch vụ KHÔNG được hỗ trợ hoặc yêu cầu mơ hồ, hãy hỏi lại làm rõ lễ phép và gợi ý các dịch vụ tương đương có sẵn.\n" +
"5. Nếu dịch vụ ĐƯỢC hỗ trợ: Hãy lập kế hoạch, gọi `inject_custom_ui` để hiển thị checklist 4 bước hướng dẫn lên màn hình, tự động điều hướng hoặc hướng dẫn người dân vào đúng trang tờ khai sau khi đã rõ ý định của bác.\n" +
"6. Khi ở trang tờ khai, gọi `read_page_content` để xem các trường nhập liệu. Giúp người dân điền form bằng các công cụ và luôn truyền selector hoặc semanticId tương ứng để điền chính xác. Hãy xác nhận lại thông tin nhạy cảm của người dân trước khi điền.\n" +
"7. Trả lời bằng tiếng Việt ngắn gọn, dễ hiểu và lễ phép dành cho người cao tuổi."
```

For Python, use adjacent string literals with the same content.

- [ ] **Step 3: Update initial DOM snapshot message**

In `extension/webrtc-client.js`, change the final instruction in `session.sendMessage(...)` to:

```js
`Hãy chào bác một cách thân thiện, cho bác biết bác đang ở trang nào, và hỏi bác muốn làm thủ tục gì hoặc cần cháu giúp phần nào. Không gọi công cụ nào ở lượt chào đầu tiên này.`
```

- [ ] **Step 4: Add widget fallback**

In `extension/voice-widget.js`, add:

```js
let currentStreamingText = "";
```

Update `updateAiStreaming(delta)` to append to `currentStreamingText`, reset it in `finalizeAiStreaming()`, and in `agent_end`:

```js
const finalText = (msg.text || "").trim();
if (finalText && !currentStreamingText.trim()) {
  appendLog("Trợ lý", finalText, "agent");
}
finalizeAiStreaming();
```

Also handle:

```js
if (event.type === "response.text.delta" || event.type === "response.output_text.delta") {
  updateAiStreaming(event.delta);
}
```

- [ ] **Step 5: Upgrade transcription config**

In `extension/webrtc-client.js`, replace `whisper-1` and deprecated `inputAudioTranscription` with:

```js
audio: {
  input: {
    transcription: {
      model: "gpt-4o-transcribe",
      language: "vi",
      prompt: "Người nói dùng tiếng Việt trong ngữ cảnh dịch vụ công Việt Nam, biểu mẫu hành chính, căn cước công dân, bảo hiểm y tế, thường trú, tạm trú."
    },
    turnDetection: {
      type: "semantic_vad",
      eagerness: "medium",
    },
  },
},
```

- [ ] **Step 6: Build and verify**

Run:

```powershell
python -m py_compile backend\agent_server.py
cd extension
npx esbuild webrtc-client.js --bundle --outfile=webrtc-client.bundle.js
cd ..
rg -n 'Không tự gọi `check_login_status` khi vừa bắt đầu|gpt-4o-transcribe|semantic_vad' extension\webrtc-client.js extension\webrtc-client.bundle.js backend\agent_server.py
rg -n 'currentStreamingText|response\.text\.delta|response\.output_text\.delta|appendLog\("Trợ lý", finalText' extension\voice-widget.js
```

Expected: Python compile exits 0, build exits 0, and all patterns are present.

---

## Task 7: Manual E2E Verification

**Files:**
- No code changes.

- [ ] **Step 1: Start backend**

Run:

```powershell
cd D:\VSCODE\AIA-K2\DVC
backend\.venv\Scripts\python.exe -u backend\agent_server.py
```

Expected:

```text
[BRIDGE] WebSocket server sẵn sàng tại ws://localhost:8000
[BRIDGE] Token API server sẵn sàng tại http://localhost:8000/token
```

- [ ] **Step 2: Reload extension**

Open:

```text
chrome://extensions/
```

Click reload on EasyDVC.

- [ ] **Step 3: Open local mock**

Open:

```text
D:\VSCODE\AIA-K2\DVC\test-dvc-cascading.html
```

- [ ] **Step 4: Validate natural first turn**

Click “Bắt đầu nói”.

Expected:
- System says voice connected.
- Agent greets and asks what the user wants.
- No immediate `check_login_status`.
- No immediate `navigate_to_login`.

- [ ] **Step 5: Validate DOM reading**

Ask:

```text
Trang này có những trường nào?
```

Expected:
- Agent mentions fields from semantic snapshot.
- Console `read_dom` response includes `frame.framePath`, `semanticId`, `selector`, labels, buttons.

- [ ] **Step 6: Validate DOM control**

Ask:

```text
Điền họ tên là Nguyễn Văn Hùng và số điện thoại là 0987654321.
```

Expected:
- Tool calls use `fill_field`.
- Inputs are filled.
- Tool result includes verified `value`.

- [ ] **Step 7: Validate select control**

Ask:

```text
Chọn Thành phố Hà Nội, Quận Cầu Giấy, Phường Dịch Vọng Hậu.
```

Expected:
- Cascading select waits for options.
- Tool result success after all three selects are selected.

---

## Task 8: Final Verification and Commit

**Files:**
- All modified files.

- [ ] **Step 1: Run final checks**

Run:

```powershell
python -m py_compile backend\agent_server.py
cd extension
npx esbuild webrtc-client.js --bundle --outfile=webrtc-client.bundle.js
cd ..
git diff --check
git status --short
```

Expected:
- Python compile exits 0.
- esbuild exits 0.
- `git diff --check` exits 0.
- Only intended files are modified.

- [ ] **Step 2: Commit**

Run:

```powershell
git add extension/content.js extension/background.js extension/manifest.json extension/webrtc-client.js extension/webrtc-client.bundle.js extension/voice-widget.js backend/agent_server.py docs/superpowers/plans/2026-06-27-chatbot-dom.md
git commit -m "feat: improve chatbot DOM control"
```

Expected: commit succeeds.

---

## Self-Review

- Spec coverage: all six requested areas map to Tasks 1 through 6; manual verification and final commit are covered by Tasks 7 and 8.
- Placeholder scan: no `TBD`, `TODO`, or unspecified implementation steps remain.
- Type consistency: action names stay aligned with existing tool names: `read_dom`, `type_input`, `click_button`, `select_option`, `check_login`, `navigate_to_login`, `fill_address_cascade`, `bulk_fill_profile`.

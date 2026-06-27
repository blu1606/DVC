/**
 * Phase 05 — Shadow DOM UI Injection (Client-side Extension)
 *
 * Phần Python backend (inject_custom_ui tool) đã được tích hợp vào
 * backend/agent_server.py.
 *
 * Phần này xử lý phía Extension: nhận lệnh "inject_html" qua WebSocket,
 * khử độc HTML và tiêm vào Shadow DOM. Logic này đã được tích hợp
 * vào content.js (Phase 03) qua hàm injectShadowUI() và sanitizeHTML().
 *
 * File này chứa:
 *   1. Hàm tạo nội dung HTML checklist mẫu để Agent gọi inject_custom_ui
 *   2. Hướng dẫn sử dụng
 */

/**
 * Tạo HTML cho checklist hướng dẫn điền form CT01.
 * Agent sẽ gọi inject_custom_ui(html_content=buildChecklistHTML([...]))
 *
 * @param {Array<{label: string, done: boolean}>} steps
 * @returns {string} HTML string
 */
export function buildChecklistHTML(steps) {
  const doneCount = steps.filter(({ done, status }) => done || status === "done").length;
  const totalCount = steps.length;
  const stepItems = steps
    .map(
      ({ label, done, status, reason }, index) => {
        const stepStatus = status || (done ? "done" : "todo");
        const icon = stepStatus === "done" ? "✓" : stepStatus === "current" ? "→" : stepStatus === "blocked" ? "!" : index + 1;
        const reasonHtml = reason ? `<span class="reason">${escapeHtml(reason)}</span>` : "";
        return `
      <li class="step ${escapeHtml(stepStatus)}">
        <span class="icon">${escapeHtml(String(icon))}</span>
        <span class="label">${escapeHtml(normalizeChecklistLabel(label))}</span>
        ${reasonHtml}
      </li>`;
      }
    )
    .join("");

  return `
    <style>
      :host {
        font-family: "Segoe UI", Arial, sans-serif;
        display: block;
        color: #f8fafc;
      }
      :host([data-collapsed="true"]) .body { display: none; }
      :host([data-collapsed="true"]) .panel { min-width: 0; width: auto; }
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
      .header {
        min-height: 42px;
        display: grid;
        grid-template-columns: 1fr auto auto;
        align-items: center;
        gap: 8px;
        padding: 9px 12px;
        background: rgba(15, 23, 42, 0.55);
      }
      .title {
        margin: 0;
        font-size: 14px;
        line-height: 1.35;
        font-weight: 700;
        color: #e2e8f0;
      }
      .meta {
        flex: 0 0 auto;
        padding: 3px 8px;
        border-radius: 999px;
        background: rgba(59, 130, 246, 0.18);
        color: #bfdbfe;
        font-size: 12px;
        font-weight: 700;
        white-space: nowrap;
      }
      .controls {
        display: flex;
        gap: 6px;
      }
      button {
        width: 28px;
        height: 28px;
        border-radius: 6px;
        border: 1px solid rgba(148, 163, 184, 0.25);
        background: rgba(15, 23, 42, 0.75);
        color: #e2e8f0;
        cursor: pointer;
        font-size: 16px;
        line-height: 1;
      }
      button:hover { background: rgba(51, 65, 85, 0.95); }
      #close-checklist:hover {
        background: rgba(248, 113, 113, 0.18);
        color: #fecaca;
      }
      .body {
        padding: 0 12px 8px;
        max-height: min(340px, calc(100vh - 190px));
        overflow-y: auto;
      }
      ul {
        list-style: none;
        padding: 0;
        margin: 0;
      }
      .step {
        display: grid;
        grid-template-columns: 24px 1fr;
        gap: 8px;
        padding: 8px 0;
        border-top: 1px solid rgba(148, 163, 184, 0.18);
        font-size: 14px;
        line-height: 1.35;
      }
      .step.done .label { color: #94a3b8; text-decoration: line-through; }
      .step.current {
        margin: 6px -8px;
        padding: 10px 8px;
        border-radius: 8px;
        background: rgba(16, 185, 129, 0.14);
      }
      .step.current .label { color: #f8fafc; font-weight: 700; }
      .step.blocked .label { color: #fde68a; }
      .icon {
        width: 22px;
        height: 22px;
        border-radius: 999px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: rgba(148, 163, 184, 0.16);
        font-size: 14px;
        font-weight: 800;
        flex-shrink: 0;
      }
      .step.done .icon { background: rgba(16, 185, 129, 0.22); color: #86efac; }
      .step.current .icon { background: rgba(16, 185, 129, 0.32); color: #a7f3d0; }
      .step.blocked .icon { background: rgba(251, 191, 36, 0.18); color: #fde68a; }
      .reason {
        grid-column: 2;
        color: #cbd5e1;
        font-size: 12.5px;
        line-height: 1.35;
        margin-top: -4px;
      }
      @media (max-width: 480px) {
        .title { font-size: 13.5px; }
        .body { max-height: 124px; }
        .step { font-size: 13px; }
      }
    </style>
    <div class="panel" data-easydvc-checklist="true">
      <div class="header">
        <h3 class="title">Các bước cần làm</h3>
        <span class="meta">${doneCount}/${totalCount || 0} xong</span>
        <div class="controls">
          <button id="toggle-checklist" type="button" title="Thu gọn/mở rộng">−</button>
          <button id="close-checklist" type="button" title="Đóng">×</button>
        </div>
      </div>
      <div class="body"><ul>${stepItems}</ul></div>
    </div>
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

/*
 * ─── HƯỚNG DẪN TÍCH HỢP ──────────────────────────────────────────────────────
 *
 * 1. Trong agent_server.py, tool inject_custom_ui đã được khai báo và đăng ký.
 *
 * 2. Agent sẽ tự quyết định gọi inject_custom_ui khi cần hiển thị hướng dẫn.
 *    Ví dụ: khi nhận câu "Tôi cần làm gì để đăng ký tạm trú?", Agent gọi:
 *
 *      inject_custom_ui(html_content="<style>...</style><div>...</div>")
 *
 * 3. Extension nhận lệnh "inject_html" qua WebSocket trong content.js và gọi
 *    injectShadowUI({ html, mount, mode }).
 *
 * 4. Lỗi đã sửa trong Phase 05 (Python backend):
 *
 *    TRƯỚC (SAI):
 *      agent = Agent(
 *          model="gpt-5.5",                   ← không tồn tại trong public docs
 *          tools=[inject_custom_ui, {"type": "computer"}]  ← dict không hợp lệ
 *      )
 *
 *    SAU (ĐÚNG):
 *      agent = Agent(
 *          model="gpt-4o",                    ← model xác thực
 *          tools=[inject_custom_ui, fill_field, click_element, select_option]
 *      )
 * ─────────────────────────────────────────────────────────────────────────────
 */

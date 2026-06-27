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

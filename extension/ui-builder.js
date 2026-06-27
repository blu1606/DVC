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

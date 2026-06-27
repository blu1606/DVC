/**
 * Phase 04 — WebRTC Voice Client
 * Quản lý vòng đời phiên thoại Realtime qua OpenAI Agents SDK (TypeScript/JS).
 */

import { RealtimeAgent, RealtimeSession } from "@openai/agents/realtime";
import { tool } from "@openai/agents";
import { z } from "zod";
import { buildChecklistHTML } from "./ui-builder.js";
import { PIIShield } from "./pii-shield.js";

const piiShield = new PIIShield();

/**
 * Gửi lệnh DOM đến content script của Active Tab.
 */
async function sendCommandToActiveTab(action, params) {
  // Nếu đang chạy trong content script của trang web, gọi trực tiếp handleCommand
  if (typeof window !== "undefined" && window.handleCommand) {
    console.log("[ThôngDVC] Đang chạy trong Content Script, thực thi DOM trực tiếp.");
    return await window.handleCommand({ action, ...params });
  }

  if (typeof chrome === "undefined" || !chrome.tabs) {
    console.warn("[ThôngDVC] Không chạy trong môi trường Extension. Bỏ qua gửi lệnh DOM.");
    return { status: "success", message: "Simulated success (no extension context)" };
  }

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return { status: "error", message: "Không tìm thấy active tab" };

    return new Promise((resolve) => {
      chrome.tabs.sendMessage(tab.id, { action, ...params }, (response) => {
        resolve(response || { status: "success" });
      });
    });
  } catch (error) {
    console.error("[ThôngDVC] Lỗi khi gửi lệnh đến active tab:", error);
    return { status: "error", message: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SEMANTIC TOOLS — Tích hợp ngay tại Client-side Voice Agent
// ─────────────────────────────────────────────────────────────────────────────

const fillFieldTool = tool({
  name: "fill_field",
  description: "Điền dữ liệu văn bản vào một trường thông tin trên form dịch vụ công.",
  parameters: z.object({
    field_name: z.string().describe("Tên ngữ nghĩa của trường thông tin (fullname, birthday, cccd-num, phone, address)."),
    value: z.string().describe("Giá trị văn bản cần nhập."),
    selector: z.string().optional().describe("CSS selector của trường thông tin cần điền (được lấy từ read_page_content). Nếu có hãy truyền tham số này để định vị chính xác.")
  }),
  async execute({ field_name, value, selector }) {
    console.log("[TOOL] Client fill_field:", field_name, value, selector);
    const unmaskedValue = piiShield.unmask(value);
    return await sendCommandToActiveTab("type_input", { field_name, text: unmaskedValue, selector });
  }
});

const clickElementTool = tool({
  name: "click_element",
  description: "Click chuột vào một phần tử tương tác trên trang. Với đăng nhập thuế hoặc nộp hồ sơ, chỉ bấm sau khi người dùng vừa xác nhận.",
  parameters: z.object({
    field_name: z.string().describe("Tên ngữ nghĩa của nút cần click (btn-submit, btn-draft)."),
    selector: z.string().optional().describe("CSS selector của nút cần click (được lấy từ read_page_content). Nếu có hãy truyền tham số này để click chính xác."),
    user_confirmed: z.boolean().optional().describe("Đặt true chỉ sau khi người dùng xác nhận rõ ràng thao tác nhạy cảm như Đăng nhập, chọn/dùng MST, Tiếp tục sau MST, hoặc Nộp hồ sơ.")
  }),
  async execute({ field_name, selector, user_confirmed }) {
    console.log("[TOOL] Client click_element:", field_name, selector, user_confirmed);
    const target = `${field_name || ""} ${selector || ""}`.toLowerCase();
    const needsConfirmation =
      target.includes("login") ||
      target.includes("submitcbt") ||
      target.includes("submitldap") ||
      target.includes("choosemst") ||
      target.includes("continueaftermst") ||
      target.includes("nop-hoso") ||
      target.includes("nophoso");

    if (needsConfirmation && user_confirmed !== true) {
      return {
        status: "error",
        message: "Cần hỏi và nhận xác nhận rõ ràng từ người dùng trước khi bấm đăng nhập, chọn MST, tiếp tục sau MST, hoặc nộp hồ sơ."
      };
    }

    return await sendCommandToActiveTab("click_button", { field_name, selector });
  }
});

const selectOptionTool = tool({
  name: "select_option",
  description: "Chọn một tùy chọn trong menu thả xuống (dropdown).",
  parameters: z.object({
    field_name: z.string().describe("Tên ngữ nghĩa của dropdown (province)."),
    value: z.string().describe("Giá trị cần chọn (HCM, HN)."),
    selector: z.string().optional().describe("CSS selector của dropdown cần chọn (được lấy từ read_page_content). Nếu có hãy truyền tham số này để chọn chính xác.")
  }),
  async execute({ field_name, value, selector }) {
    console.log("[TOOL] Client select_option:", field_name, value, selector);
    return await sendCommandToActiveTab("select_option", { field_name, value, selector });
  }
});

const injectCustomUiTool = tool({
  name: "inject_custom_ui",
  description: "Hiển thị hộp thoại hướng dẫn checklist hoặc bảng trợ lý cho người dùng.",
  parameters: z.object({
    html_content: z.string().describe("Chuỗi HTML đại diện cho giao diện checklist hướng dẫn.")
  }),
  async execute({ html_content }) {
    console.log("[TOOL] Client inject_custom_ui");
    return await sendCommandToActiveTab("inject_html", {
      mount: "accessibility-assistant-panel",
      html: html_content,
      mode: "shadow-root",
      position: "bottom-right"
    });
  }
});

const updateChecklistTool = tool({
  name: "update_checklist",
  description: "Cập nhật hoặc hiển thị bảng checklist 4 bước hướng dẫn lên màn hình cho người dân.",
  parameters: z.object({
    steps: z.array(z.object({
      label: z.string().describe("Tên của bước thực hiện (ví dụ: '1. Đăng nhập hệ thống', '2. Điền tờ khai thường trú')."),
      done: z.boolean().describe("Trạng thái hoàn thành bước này (true là đã hoàn thành, false là chưa).")
    })).describe("Mảng chứa các bước của checklist.")
  }),
  async execute({ steps }) {
    console.log("[TOOL] Client update_checklist:", steps);
    const html = buildChecklistHTML(steps);
    return await sendCommandToActiveTab("inject_html", {
      mount: "accessibility-assistant-panel",
      html: html,
      mode: "shadow-root",
      position: "bottom-right"
    });
  }
});

const checkLoginStatusTool = tool({
  name: "check_login_status",
  description: "Kiểm tra xem người dân đã đăng nhập vào hệ thống cổng dịch vụ công chưa.",
  parameters: z.object({}),
  async execute() {
    console.log("[TOOL] Client check_login_status");
    return await sendCommandToActiveTab("check_login", {});
  }
});

const navigateToLoginTool = tool({
  name: "navigate_to_login",
  description: "Điều hướng trình duyệt của người dân sang trang đăng nhập của cổng dịch vụ công.",
  parameters: z.object({
    selector: z.string().optional().describe("CSS Selector của nút Đăng nhập được phát hiện bởi check_login_status.")
  }),
  async execute({ selector }) {
    console.log("[TOOL] Client navigate_to_login:", selector);
    return await sendCommandToActiveTab("navigate_to_login", { selector });
  }
});

const fillAddressCascadeTool = tool({
  name: "fill_address_cascade",
  description: "Tự động điền nhanh địa chỉ 3 cấp (Tỉnh/Thành phố, Quận/Huyện, Xã/Phường) vào biểu mẫu dịch vụ công. Giải quyết tự động độ trễ AJAX.",
  parameters: z.object({
    province: z.string().describe("Tên Tỉnh/Thành phố (ví dụ: 'Hà Nội', 'Hồ Chí Minh')."),
    district: z.string().describe("Tên Quận/Huyện (ví dụ: 'Cầu Giấy', 'Quận 1')."),
    ward: z.string().describe("Tên Xã/Phường/Thị trấn (ví dụ: 'Dịch Vọng Hậu', 'Bến Nghé').")
  }),
  async execute({ province, district, ward }) {
    console.log("[TOOL] Client fill_address_cascade:", province, district, ward);
    return await sendCommandToActiveTab("fill_address_cascade", { province, district, ward });
  }
});

const bulkFillProfileTool = tool({
  name: "bulk_fill_profile",
  description: "Tự động điền nhanh toàn bộ các thông tin cơ bản của công dân (họ tên, ngày sinh, CCCD, số điện thoại) đã lưu trong bộ nhớ máy của người dân.",
  parameters: z.object({}),
  async execute() {
    console.log("[TOOL] Client bulk_fill_profile");
    let profile = null;
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      const data = await chrome.storage.local.get("user_profile");
      profile = data.user_profile;
    }
    return await sendCommandToActiveTab("bulk_fill_profile", { profile });
  }
});

const readPageContentTool = tool({
  name: "read_page_content",
  description: "Đọc cấu trúc, tiêu đề và các trường thông tin (form fields, buttons, dropdowns) của trang web hiện tại để hỗ trợ người dùng.",
  parameters: z.object({}),
  async execute() {
    console.log("[TOOL] Client read_page_content");
    return await sendCommandToActiveTab("read_dom", {});
  }
});

const readTaxLoginStateTool = tool({
  name: "read_tax_login_state",
  description: "Đọc trạng thái đăng nhập thuế hiện tại bằng snapshot tạm thời đã lọc an toàn. Dùng sau mỗi lần mở modal, đổi bước đăng nhập, hoặc sau khi người dùng xử lý captcha/MST.",
  parameters: z.object({}),
  async execute() {
    console.log("[TOOL] Client read_tax_login_state");
    return await sendCommandToActiveTab("read_tax_login_state", {});
  }
});

const scrollPageTool = tool({
  name: "scroll_page",
  description: "Cuộn trang web lên hoặc xuống.",
  parameters: z.object({
    direction: z.enum(["up", "down"]).describe("Hướng cuộn trang ('up' là cuộn lên, 'down' là cuộn xuống).")
  }),
  async execute({ direction }) {
    console.log("[TOOL] Client scroll_page:", direction);
    return await sendCommandToActiveTab("scroll", { direction });
  }
});

/**
 * Khởi tạo trợ lý giọng nói và kết nối WebRTC đến OpenAI Realtime API.
 * @param {Function} onEvent Callback nhận các sự kiện thời gian thực (transcript, status, error).
 * @returns {Promise<RealtimeSession>} Session đã kết nối, sẵn sàng giao tiếp.
 */
async function fetchRealtimeTokenDirect() {
  const tokenResponse = await fetch("http://localhost:8000/token");
  if (!tokenResponse.ok) {
    throw new Error(`Không thể lấy token trực tiếp: ${tokenResponse.status}`);
  }
  return await tokenResponse.json();
}

async function fetchRealtimeTokenFromBackground() {
  return await new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage({ action: "FETCH_TOKEN" }, (res) => {
        const runtimeError = chrome.runtime.lastError;
        if (runtimeError) {
          resolve({ status: "error", message: runtimeError.message });
          return;
        }
        resolve(res || { status: "error", message: "No response from background script" });
      });
    } catch (error) {
      resolve({ status: "error", message: error.message });
    }
  });
}

function isInvalidatedExtensionContext(message) {
  return String(message || "").toLowerCase().includes("extension context invalidated");
}

export async function initializeVoiceAssistant(onEvent) {
  let tokenData;
  let backgroundError = "";
  if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
    const response = await fetchRealtimeTokenFromBackground();
    if (response.status === "error") {
      backgroundError = response.message || "Unknown background error";
    } else {
      tokenData = response.data;
    }
  }

  if (!tokenData) {
    try {
      tokenData = await fetchRealtimeTokenDirect();
    } catch (error) {
      if (isInvalidatedExtensionContext(backgroundError)) {
        throw new Error("Extension vừa được reload. Bác hãy refresh lại trang rồi bấm Bắt đầu nói lại.");
      }
      if (backgroundError) {
        throw new Error(`Không thể lấy token qua background: ${backgroundError}; trực tiếp: ${error.message}`);
      }
      throw error;
    }
  }
  const ephemeralKey = tokenData.value || (tokenData.client_secret && tokenData.client_secret.value);  // dạng "ek_..."

  // Tạo RealtimeAgent với các tools đã định nghĩa
  const agent = new RealtimeAgent({
    name: "ThôngDVC Assistant",
    instructions:
      "Bạn là trợ lý dịch vụ công hỗ trợ người cao tuổi Việt Nam thực hiện các thủ tục hành chính trực tuyến.\n" +
      "1. Khi vừa bắt đầu phiên thoại hoặc khi chỉ nhận được cấu trúc trang, hãy chào ngắn gọn, nói bác đang ở trang nào, rồi hỏi bác muốn làm thủ tục gì hoặc cần điền phần nào. Không tự gọi `check_login_status` khi vừa bắt đầu.\n" +
      "2. Chỉ gọi `check_login_status` khi bác đã chọn một thủ tục cụ thể hoặc yêu cầu thao tác như điền hồ sơ, nộp hồ sơ, đăng nhập, kiểm tra trạng thái đăng nhập. Nếu chưa đăng nhập, hãy hỏi xin phép trước khi gọi `navigate_to_login`; không tự chuyển trang khi bác chưa đồng ý rõ ràng.\n" +
      "3. Giải thích cho người dân về trang web này và các dịch vụ có sẵn. Hãy kiểm tra xem dịch vụ người dân yêu cầu có được hỗ trợ trực tiếp không (Chúng ta hỗ trợ: 'Đăng ký thường trú' tại /dvc-tthc-dang-ky-thuong-tru, và 'Cấp lại thẻ BHYT' tại /dvc-tthc-cap-lai-the-bhyt).\n" +
      "4. Nếu dịch vụ KHÔNG được hỗ trợ hoặc yêu cầu mơ hồ, hãy hỏi lại làm rõ lễ phép và gợi ý các dịch vụ tương đương có sẵn.\n" +
      "5. Nếu dịch vụ ĐƯỢC hỗ trợ: Hãy lập kế hoạch, gọi `inject_custom_ui` để hiển thị checklist 4 bước hướng dẫn lên màn hình, tự động điều hướng hoặc hướng dẫn người dân vào đúng trang tờ khai sau khi đã rõ ý định của bác.\n" +
      "6. Khi thực hiện thủ tục Quyết toán thuế TNCN (Mã 2.002233):\n" +
      "   - Khi ở trang https://dichvucong.gdt.gov.vn/tthc/login hoặc /tthc/home, hãy gọi `read_tax_login_state` sau mỗi lần chuyển modal. Snapshot này đã lọc CSRF, mật khẩu, captcha và MST thô.\n" +
      "   - Tuyệt đối không yêu cầu người dân đọc mật khẩu hoặc captcha cho AI; hãy hướng dẫn bác tự nhập captcha/mật khẩu trên trang. Không tìm cách giải captcha.\n" +
      "   - Trước khi bấm nút Đăng nhập, chọn/dùng MST đã lưu, hoặc bấm Tiếp tục sau khi chọn MST, hãy hỏi xác nhận rõ ràng. Chỉ truyền `user_confirmed: true` vào `click_element` sau khi bác đồng ý.\n" +
      "   - Khi tìm thủ tục 2.002233, link chữ tên thủ tục chỉ mở trang chi tiết. Để nộp hồ sơ phải bấm icon folder màu xanh với selector `a.nop-hoso-btn[ma-tthc='2.002233']`; hãy hỏi xác nhận trước và truyền `user_confirmed: true`.\n" +
      "   - Hướng dẫn người dân giải quyết cây quyết định chọn cơ quan thuế bằng các câu hỏi đơn giản, ví dụ: 'Năm ngoái bác làm ở mấy công ty?', 'Hiện tại bác có đang ký hợp đồng lao động ở đâu không?', 'Các công ty cũ đã khấu trừ thuế của bác chưa?'. Sau đó gọi click_element để chọn đúng các ô điều kiện: 'change-workplace-yes'/'change-workplace-no', 'has-contract-yes'/'has-contract-no', 'tax-deducted-source-yes'/'tax-deducted-source-no'.\n" +
      "   - Điền các số liệu từ Chứng từ khấu trừ thuế TNCN (Mã số thuế, thu nhập chịu thuế, số thuế đã khấu trừ, số tiền đề nghị hoàn, số tài khoản, ngân hàng) bằng tool fill_field.\n" +
      "7. Khi ở trang tờ khai, gọi `read_page_content` để xem các trường nhập liệu. Giúp người dân điền form bằng các công cụ và luôn truyền selector hoặc semanticId tương ứng để điền chính xác. Hãy xác nhận lại thông tin nhạy cảm của người dân trước khi điền.\n" +
      "8. Trả lời bằng tiếng Việt ngắn gọn, dễ hiểu và lễ phép dành cho người cao tuổi.",
    voice: "alloy",
    tools: [
      fillFieldTool,
      clickElementTool,
      selectOptionTool,
      injectCustomUiTool,
      updateChecklistTool,
      readPageContentTool,
      readTaxLoginStateTool,
      scrollPageTool,
      checkLoginStatusTool,
      navigateToLoginTool,
      fillAddressCascadeTool,
      bulkFillProfileTool
    ]
  });

  const session = new RealtimeSession(agent, {
    apiKey:    ephemeralKey,
    transport: "webrtc",
    model:     "gpt-realtime-2",
    config: {
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
    },
  });

  await session.connect({});
  console.log("[EasyDVC] Phiên thoại Realtime đã sẵn sàng!");

  // Gửi DOM snapshot hiện tại để Agent có ngữ cảnh ngay lập tức
  try {
    const domSnapshot = await sendCommandToActiveTab("read_dom", {});
    if (domSnapshot && domSnapshot.status === "success") {
      console.log("[EasyDVC] Đã gửi cấu trúc trang hiện tại cho Agent.");
      session.sendMessage(
        `Hệ thống: Người dùng vừa kết nối thoại. Dưới đây là cấu trúc trang web hiện tại bác đang xem (Bác KHÔNG cần đọc to hay lặp lại thông tin này trừ khi được hỏi):\n` +
        `Frame hiện tại:\n${JSON.stringify(domSnapshot.frame)}\n` +
        `Tiêu đề trang: ${domSnapshot.page.title}\n` +
        `Địa chỉ URL: ${domSnapshot.page.url}\n` +
        `Chế độ snapshot: ${domSnapshot.page.mode || "scrape"}\n` +
        `Trạng thái trang: ${domSnapshot.page.pageState || "unknown"}\n` +
        `Hướng dẫn an toàn theo trang: ${domSnapshot.page.instructionsForAgent || ""}\n` +
        `Các thẻ tiêu đề:\n${JSON.stringify(domSnapshot.page.headings)}\n` +
        `Các trường nhập liệu:\n${JSON.stringify(domSnapshot.page.formFields)}\n` +
        `Các nút bấm:\n${JSON.stringify(domSnapshot.page.buttons)}\n` +
        `Các iframe con:\n${JSON.stringify(domSnapshot.childFrames || [])}\n\n` +
        `Hãy chào bác một cách thân thiện, cho bác biết bác đang ở trang nào, và hỏi bác muốn làm thủ tục gì hoặc cần cháu giúp phần nào. Không gọi công cụ nào ở lượt chào đầu tiên này.`
      );
    }
  } catch (err) {
    console.error("[EasyDVC] Lỗi gửi DOM ban đầu:", err);
  }

  // Nhận toàn bộ raw events từ OpenAI
  session.on("transport_event", (event) => {
    // Can thiệp để mã hóa PII khi Whisper dịch xong giọng nói của user
    if (event && event.type === "conversation.item.input_audio_transcription.completed") {
      const rawText = event.transcript;
      if (rawText) {
        const maskedText = piiShield.mask(rawText);
        if (maskedText !== rawText) {
          console.log("[PII] Phát hiện PII trong giọng nói, hiển thị modal xác nhận cục bộ!");

          // Ghi đè transcript để UI widget chỉ hiển thị bản đã mã hóa có ổ khóa
          event.transcript = maskedText;

          const tokensArray = Array.from(piiShield.tokenMap.entries());

          sendCommandToActiveTab("show_pii_confirm", {
            masked_text: maskedText,
            raw_text: rawText,
            tokens: tokensArray
          }).then(response => {
            if (response && response.confirmed === false) {
              console.log("[PII] Người dùng hủy bỏ, xóa các tokens khỏi RAM.");
              tokensArray.forEach(([token]) => {
                piiShield.tokenMap.delete(token);
              });
            } else {
              console.log("[PII] Người dùng đồng ý, giữ lại các tokens để phục vụ điền form.");
            }
          });
        }
      }
    }

    console.log("[TRANSPORT]", event.type, event);
    if (onEvent) {
      onEvent({ type: "transport_event", event });
    }
  });

  // Nhận output text khi agent trả lời
  session.on("agent_end", (context, agentInstance, outputText) => {
    console.log("[AGENT] Trả lời:", outputText);
    if (onEvent) {
      onEvent({ type: "agent_end", text: outputText });
    }
  });

  // Phát hiện AI nói
  session.on("audio_start", () => {
    console.log("[EasyDVC] AI đang nói...");
    if (onEvent) {
      onEvent({ type: "status", status: "ai_speaking" });
    }
  });

  session.on("audio_stopped", () => {
    console.log("[EasyDVC] AI nói xong.");
    if (onEvent) {
      onEvent({ type: "status", status: "ai_stopped" });
    }
  });

  session.on("error", ({ error }) => {
    console.error("[EasyDVC] Lỗi session:", error);
    if (onEvent) {
      onEvent({ type: "error", error });
    }
  });

  return session;
}

export function closeVoiceSession(session) {
  if (session) {
    session.interrupt();
    session.close();
    console.log("[EasyDVC] Đã đóng phiên thoại.");
  }
}

// Expose globally for extension content scripts / popup script
if (typeof window !== "undefined") {
  window.WebRTCClient = {
    initializeVoiceAssistant,
    closeVoiceSession,
    mask: (txt) => piiShield.mask(txt),
    unmask: (txt) => piiShield.unmask(txt),
    getTokenMap: () => piiShield.tokenMap
  };
}

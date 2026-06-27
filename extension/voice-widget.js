/**
 * ThongDVC Floating Voice Widget
 * Injects a floating microphone button and an assistant panel for voice control.
 */

(function () {
  if (typeof window === "undefined" || document.getElementById("thongdvc-widget-container")) {
    return;
  }

  // 1. Inject Styles
  const style = document.createElement("style");
  style.innerHTML = `
    .thongdvc-widget-container {
      font-family: system-ui, -apple-system, sans-serif;
      color: #f8fafc;
    }
    .thongdvc-floating-btn {
      position: fixed;
      bottom: max(20px, env(safe-area-inset-bottom));
      right: max(20px, env(safe-area-inset-right));
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, #10b981, #059669);
      border: none;
      box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);
      cursor: pointer;
      z-index: 2147483645;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      color: white;
    }
    .thongdvc-floating-btn:hover {
      transform: scale(1.08);
      box-shadow: 0 6px 20px rgba(16, 185, 129, 0.6);
    }
    .thongdvc-floating-btn.active {
      background: linear-gradient(135deg, #ef4444, #dc2626);
      box-shadow: 0 4px 15px rgba(239, 68, 68, 0.4);
      animation: thongdvc-pulse 1.5s infinite;
    }
    .thongdvc-panel {
      position: fixed;
      bottom: 95px;
      right: max(20px, env(safe-area-inset-right));
      width: min(380px, calc(100vw - 32px));
      height: min(520px, calc(100vh - 112px));
      background: rgba(15, 23, 42, 0.95);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(16px);
      z-index: 2147483644;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      opacity: 0;
      transform: translateY(20px) scale(0.95);
      pointer-events: none;
    }
    .thongdvc-panel.show {
      opacity: 1;
      transform: translateY(0) scale(1);
      pointer-events: auto;
    }
    .thongdvc-header {
      padding: 14px 12px 14px 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: rgba(30, 41, 59, 0.5);
    }
    .thongdvc-title {
      font-weight: 700;
      font-size: 15px;
      color: #10b981;
      line-height: 1.3;
    }
    .thongdvc-status {
      font-size: 13px;
      color: #94a3b8;
      margin-top: 4px;
      line-height: 1.35;
    }
    .thongdvc-log {
      flex: 1;
      padding: 16px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .thongdvc-bubble {
      padding: 10px 14px;
      border-radius: 12px;
      font-size: 13.5px;
      line-height: 1.45;
      max-width: 85%;
      word-wrap: break-word;
    }
    .thongdvc-bubble-user {
      background: rgba(255, 255, 255, 0.08);
      color: #f1f5f9;
      align-self: flex-end;
      border-bottom-right-radius: 4px;
    }
    .thongdvc-bubble-agent {
      background: rgba(16, 185, 129, 0.12);
      border-left: 3px solid #10b981;
      color: #f1f5f9;
      align-self: flex-start;
      border-bottom-left-radius: 4px;
    }
    .thongdvc-bubble-error {
      background: rgba(239, 68, 68, 0.1);
      border-left: 3px solid #ef4444;
      color: #fca5a5;
      align-self: center;
      font-size: 12.5px;
      max-width: 95%;
    }
    .thongdvc-bubble-warning {
      background: rgba(251, 191, 36, 0.12);
      border-left: 3px solid #fbbf24;
      color: #fde68a;
      align-self: center;
      font-size: 13px;
      max-width: 95%;
    }
    .thongdvc-footer {
      padding: 12px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      flex-direction: column;
      gap: 10px;
      background: rgba(30, 41, 59, 0.75);
    }
    .thongdvc-input-row {
      display: flex;
      gap: 8px;
      width: 100%;
    }
    .thongdvc-chat-input {
      flex: 1;
      min-width: 0;
      min-height: 44px;
      padding: 10px 12px;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      background: rgba(15, 23, 42, 0.65);
      color: #f8fafc;
      font-size: 15px;
      outline: none;
    }
    .thongdvc-chat-input::placeholder {
      color: #94a3b8;
    }
    .thongdvc-chat-input:focus {
      border-color: #10b981;
      box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.18);
    }
    .thongdvc-send-btn {
      min-width: 72px;
      min-height: 48px;
      background: #10b981;
      color: white;
      border: none;
      padding: 0 16px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 15px;
      font-weight: 700;
      transition: background 0.2s;
    }
    .thongdvc-send-btn:hover {
      background: #059669;
    }
    .thongdvc-btn {
      flex: 1;
      min-height: 48px;
      padding: 10px 12px;
      border-radius: 8px;
      border: none;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      font-size: 15px;
      text-align: center;
    }
    .thongdvc-btn-start {
      background: #10b981;
      color: white;
    }
    .thongdvc-btn-start:hover {
      background: #059669;
    }
    .thongdvc-btn-stop {
      background: #ef4444;
      color: white;
    }
    .thongdvc-btn-stop:hover {
      background: #dc2626;
    }
    .thongdvc-close {
      width: 48px;
      height: 48px;
      border: none;
      border-radius: 8px;
      background: transparent;
      cursor: pointer;
      color: #94a3b8;
      font-size: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .thongdvc-close:hover {
      color: white;
      background: rgba(255, 255, 255, 0.08);
    }
    .thongdvc-floating-btn:focus-visible,
    .thongdvc-close:focus-visible,
    .thongdvc-btn:focus-visible,
    .thongdvc-send-btn:focus-visible {
      outline: 3px solid rgba(16, 185, 129, 0.5);
      outline-offset: 2px;
    }
    @media (max-width: 480px) {
      .thongdvc-panel {
        left: 12px;
        right: 12px;
        bottom: 88px;
        width: auto;
        height: min(70vh, 520px);
      }
      .thongdvc-bubble {
        max-width: 92%;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .thongdvc-floating-btn,
      .thongdvc-panel,
      .thongdvc-btn,
      .thongdvc-send-btn {
        transition: none;
      }
      .thongdvc-floating-btn.active {
        animation: none;
      }
    }
    @keyframes thongdvc-pulse {
      0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
      70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
      100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
    }
  `;
  document.head.appendChild(style);

  // 2. Create elements
  const widgetContainer = document.createElement("div");
  widgetContainer.id = "thongdvc-widget-container";
  widgetContainer.className = "thongdvc-widget-container";

  widgetContainer.innerHTML = `
    <button class="thongdvc-floating-btn" id="thongdvc-mic-btn" type="button" title="Mở Trợ lý giọng nói" aria-label="Mở trợ lý giọng nói" aria-expanded="false" aria-controls="thongdvc-panel">🎙️</button>
    <div class="thongdvc-panel" id="thongdvc-panel" role="dialog" aria-modal="false" aria-labelledby="thongdvc-title">
      <div class="thongdvc-header">
        <div>
          <div class="thongdvc-title" id="thongdvc-title">👵👴 Trợ lý giọng nói EasyDVC</div>
          <div class="thongdvc-status" id="thongdvc-status" role="status" aria-live="polite">Nhấn Bắt đầu để kết nối thoại</div>
        </div>
        <button class="thongdvc-close" id="thongdvc-close-btn" type="button" aria-label="Đóng trợ lý">✕</button>
      </div>
      <div class="thongdvc-log" id="thongdvc-log">
        <div class="thongdvc-bubble thongdvc-bubble-agent">
          <strong>Trợ lý:</strong> Chào bác! Cháu là trợ lý Dịch vụ công. Bác hãy nhấn "Bắt đầu nói" hoặc gõ câu hỏi bên dưới nhé.
        </div>
      </div>
      <div class="thongdvc-footer">
        <div class="thongdvc-input-row">
          <input type="text" id="thongdvc-chat-input" class="thongdvc-chat-input" placeholder="Gõ câu hỏi cho trợ lý..." aria-label="Nhập câu hỏi cho trợ lý" autocomplete="off" />
          <button id="thongdvc-send-btn" class="thongdvc-send-btn" type="button">Gửi</button>
        </div>
        <button class="thongdvc-btn thongdvc-btn-start" id="thongdvc-toggle-action" type="button">Bắt đầu nói</button>
      </div>
    </div>
  `;
  document.body.appendChild(widgetContainer);

  // 3. Variables & Handlers
  let session = null;
  let currentStreamingBubble = null;
  let currentStreamingText = "";
  let functionCallNames = {};
  let isSendingChat = false;
  let isAiSpeaking = false;
  let isUserSpeaking = false;
  const micBtn = document.getElementById("thongdvc-mic-btn");
  const panel = document.getElementById("thongdvc-panel");
  const closeBtn = document.getElementById("thongdvc-close-btn");
  const toggleBtn = document.getElementById("thongdvc-toggle-action");
  const chatInput = document.getElementById("thongdvc-chat-input");
  const sendBtn = document.getElementById("thongdvc-send-btn");
  const statusEl = document.getElementById("thongdvc-status");
  const logEl = document.getElementById("thongdvc-log");

  // Toggle Panel open/close
  function setStatus(text, color) {
    statusEl.innerText = text;
    statusEl.style.color = color;
  }

  function togglePanel(force) {
    const shouldShow = typeof force === "boolean" ? force : !panel.classList.contains("show");
    panel.classList.toggle("show", shouldShow);
    micBtn.setAttribute("aria-expanded", String(shouldShow));
    if (shouldShow) {
      setTimeout(() => chatInput.focus({ preventScroll: true }), 0);
    }
  }

  micBtn.addEventListener("click", togglePanel);
  closeBtn.addEventListener("click", () => togglePanel(false));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && panel.classList.contains("show")) {
      togglePanel(false);
      micBtn.focus();
    }
  });

  // Append a bubble to log
  function appendLog(sender, text, type) {
    const bubble = document.createElement("div");
    bubble.className = `thongdvc-bubble thongdvc-bubble-${type}`;
    const label = document.createElement("strong");
    label.textContent = `${sender}:`;
    bubble.appendChild(label);
    bubble.appendChild(document.createTextNode(` ${text}`));
    logEl.appendChild(bubble);
    logEl.scrollTop = logEl.scrollHeight;
    return bubble;
  }

  function isExtensionContextInvalidated(error) {
    return String(error?.message || error || "").toLowerCase().includes("extension context invalidated");
  }

  function showExtensionReloadRequired(error) {
    const message = isExtensionContextInvalidated(error)
      ? "Extension vừa được reload. Bác tải lại trang này rồi mở trợ lý lại nhé."
      : (error?.message || error || "Không thể kết nối.");
    setStatus("Cần tải lại trang.", "#f87171");
    appendLog("Lỗi", message, "error");
  }

  function isLikelyNoiseTranscript(text) {
    const normalized = (text || "").replace(/\s+/g, " ").trim();
    if (!normalized) return true;
    if (normalized.length < 3) return true;
    if (/^[.,!?…\-\s]+$/.test(normalized)) return true;
    return false;
  }

  // Real-time AI response delta streaming
  function updateAiStreaming(delta) {
    if (!currentStreamingBubble) {
      currentStreamingBubble = document.createElement("div");
      currentStreamingBubble.className = "thongdvc-bubble thongdvc-bubble-agent";
      currentStreamingBubble.innerHTML = `<strong>Trợ lý:</strong> <span id="thongdvc-stream-text"></span>`;
      logEl.appendChild(currentStreamingBubble);
      currentStreamingText = "";
    }
    const textEl = document.getElementById("thongdvc-stream-text");
    if (textEl) {
      textEl.innerText += delta;
      currentStreamingText += delta;
    }
    logEl.scrollTop = logEl.scrollHeight;
  }

  function finalizeAiStreaming() {
    currentStreamingBubble = null;
    currentStreamingText = "";
  }

  // WebRTC events callback
  function onVoiceEvent(msg) {
    if (msg.type === "status") {
      if (msg.status === "ai_speaking") {
        isAiSpeaking = true;
        setStatus("Trợ lý đang nói...", "#10b981");
      } else if (msg.status === "ai_stopped") {
        isAiSpeaking = false;
        if (!isUserSpeaking) {
          setStatus("Đang lắng nghe bác...", "#60a5fa");
        }
      }
    } else if (msg.type === "agent_end") {
      const finalText = (msg.text || "").trim();
      if (finalText && !currentStreamingText.trim()) {
        appendLog("Trợ lý", finalText, "agent");
      }
      finalizeAiStreaming();
    } else if (msg.type === "error") {
      setStatus("Lỗi kết nối!", "#f87171");
      showExtensionReloadRequired(msg.error);
      stopVoiceSession({ silent: true });
    } else if (msg.type === "transport_event") {
      const event = msg.event;
      if (event.type === "input_audio_buffer.speech_started") {
        isUserSpeaking = true;
        setStatus(isAiSpeaking ? "Đã nghe bác, đang ngắt lời trợ lý..." : "Đang nghe bác nói...", "#fbbf24");
      }
      if (event.type === "input_audio_buffer.speech_stopped") {
        isUserSpeaking = false;
        setStatus("Đang xử lý lời bác...", "#fbbf24");
      }
      // 1. User finished speaking, transcript completed
      if (event.type === "conversation.item.input_audio_transcription.completed") {
        if (!isLikelyNoiseTranscript(event.transcript)) {
          appendLog("Bạn", event.transcript.trim(), "user");
        } else {
          console.debug("[EasyDVC] Bỏ qua transcript nhiễu/rỗng:", event.transcript);
        }
      }
      // 2. Real-time AI text/audio transcript deltas
      if (event.type === "response.audio_transcript.delta") {
        updateAiStreaming(event.delta);
      }
      if (event.type === "response.text.delta" || event.type === "response.output_text.delta") {
        updateAiStreaming(event.delta);
      }
      // 3. Track function call names
      if (event.type === "response.output_item.added" && event.item && event.item.type === "function_call") {
        functionCallNames[event.item.call_id] = event.item.name;
      }
      // 4. Real-time tool call status (e.g. AI calling a form filling function)
      if (event.type === "response.function_call_arguments.done") {
        const toolName = functionCallNames[event.call_id] || "unknown_tool";
        appendLog("Hệ thống", `AI đang thực hiện lệnh: ${toolName}`, "warning");
      }
    }
  }

  // Start Session
  async function startVoiceSession() {
    setStatus("Đang kết nối thoại...", "#fbbf24");
    toggleBtn.disabled = true;

    try {
      session = await window.WebRTCClient.initializeVoiceAssistant(onVoiceEvent);
      
      setStatus("Đang lắng nghe bác...", "#60a5fa");
      
      micBtn.classList.add("active");
      toggleBtn.innerText = "Dừng thoại";
      toggleBtn.className = "thongdvc-btn thongdvc-btn-stop";
      toggleBtn.disabled = false;
      appendLog("Hệ thống", "Đã kết nối thoại thành công.", "warning");
    } catch (err) {
      toggleBtn.innerText = "Bắt đầu nói";
      toggleBtn.className = "thongdvc-btn thongdvc-btn-start";
      toggleBtn.disabled = false;
      
      
      // Tự động chuyển hướng đến trang permission.html nếu bị từ chối quyền
      const errMsg = (err.message || "").toLowerCase();
      const errName = (err.name || "").toLowerCase();
      if (errMsg.includes("permission") || errMsg.includes("dismissed") || errName.includes("notallowederror")) {
        setStatus("Chưa có quyền micro.", "#f87171");
        appendLog("Lỗi", "Vui lòng cấp quyền micro trong tab mới để tiếp tục.", "error");
        try {
          window.open(chrome.runtime.getURL("permission.html"));
        } catch (runtimeErr) {
          showExtensionReloadRequired(runtimeErr);
        }
      } else if (isExtensionContextInvalidated(err)) {
        showExtensionReloadRequired(err);
      } else {
        setStatus("Không kết nối được trợ lý thoại.", "#f87171");
        appendLog("Lỗi", err.message || "Không thể kết nối trợ lý thoại.", "error");
      }
    }
  }

  // Stop Session
  function stopVoiceSession(options = {}) {
    if (session) {
      try {
        window.WebRTCClient.closeVoiceSession(session);
      } catch (err) {
        if (!isExtensionContextInvalidated(err)) {
          appendLog("Lỗi", err.message || "Không thể đóng phiên thoại.", "error");
        }
      }
      session = null;
    }
    micBtn.classList.remove("active");
    if (!options.silent) {
      setStatus("Đã ngắt kết nối thoại.", "#94a3b8");
    }
    toggleBtn.innerText = "Bắt đầu nói";
    toggleBtn.className = "thongdvc-btn thongdvc-btn-start";
    if (!options.silent) {
      appendLog("Hệ thống", "Đã dừng phiên thoại.", "warning");
    }
  }

  toggleBtn.addEventListener("click", () => {
    if (!session) {
      startVoiceSession();
    } else {
      stopVoiceSession();
    }
  });

  function shouldUseBrowserAgent(text) {
    const normalized = (text || "").toLowerCase();
    return [
      "browser use",
      "browser agent",
      "chrome riêng",
      "trình duyệt riêng",
      "agent tự",
      "tự browse",
      "tự thao tác trình duyệt",
      "làm giúp thủ tục",
      "mở dịch vụ",
      "đi tới dịch vụ"
    ].some(keyword => normalized.includes(keyword));
  }

  async function sendChatMessage() {
    const text = chatInput.value.trim();
    if (!text || isSendingChat) {
      return;
    }

    let textToSend = text;
    if (window.WebRTCClient && typeof window.WebRTCClient.mask === "function") {
      const maskedText = window.WebRTCClient.mask(text);
      if (maskedText !== text) {
        console.log("[PII] Phát hiện PII trong ô nhập text, kích hoạt xác thực!");
        appendLog("Bạn", maskedText, "user");
        chatInput.value = "";
        
        let confirmed;
        try {
          confirmed = await window.handleCommand({
            action: "show_pii_confirm",
            masked_text: maskedText,
            raw_text: text,
            tokens: Array.from(window.WebRTCClient.getTokenMap().entries())
          });
        } catch (err) {
          showExtensionReloadRequired(err);
          return;
        }
        
        if (confirmed && confirmed.confirmed) {
          textToSend = maskedText;
          console.log("[PII] Đã xác nhận điền PII cho text input.");
        } else {
          console.log("[PII] Hủy bỏ PII cho text input, rút lại tin nhắn.");
          const tokensArray = Array.from(window.WebRTCClient.getTokenMap().entries());
          tokensArray.forEach(([token]) => {
            window.WebRTCClient.getTokenMap().delete(token);
          });
          const bubbles = logEl.querySelectorAll(".thongdvc-bubble-user");
          if (bubbles.length > 0) {
            bubbles[bubbles.length - 1].remove();
          }
          return;
        }
      } else {
        appendLog("Bạn", text, "user");
        chatInput.value = "";
      }
    } else {
      appendLog("Bạn", text, "user");
      chatInput.value = "";
    }

    isSendingChat = true;
    sendBtn.disabled = true;
    sendBtn.innerText = "Đợi...";
    setStatus(session ? "Đang gửi tin nhắn..." : "Đang chat với trợ lý...", "#fbbf24");
    const pendingBubble = appendLog("Trợ lý", "Đang xử lý...", "agent");

    try {
      let domSnapshot = null;
      if (typeof window.handleCommand === "function") {
        try {
          const snapshot = await window.handleCommand({ action: "read_dom" });
          if (snapshot && snapshot.status === "success") {
            domSnapshot = snapshot;
          }
        } catch (snapshotErr) {
          console.warn("[EasyDVC] Không đọc được DOM context cho text chat:", snapshotErr);
        }
      }

      const useBrowserAgent = shouldUseBrowserAgent(textToSend);
      const endpoint = useBrowserAgent ? "browser-task" : "chat";
      if (useBrowserAgent) {
        setStatus("Browser agent đang mở Chrome riêng...", "#fbbf24");
      }

      const response = await fetch(`http://localhost:8001/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ message: textToSend, domSnapshot, currentUrl: window.location.href })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }
      pendingBubble.remove();
      if (Array.isArray(data.tool_actions) && data.tool_actions.length > 0) {
        appendLog(useBrowserAgent ? "Browser agent" : "Công cụ", data.tool_actions.join(" · "), "warning");
      }
      appendLog("Trợ lý", data.reply || "Cháu chưa có câu trả lời phù hợp.", "agent");
      setStatus(session ? "Đang lắng nghe bác..." : "Chat sẵn sàng. Thoại đang tắt.", session ? "#60a5fa" : "#94a3b8");
    } catch (err) {
      pendingBubble.remove();
      appendLog(
        "Lỗi",
        "Không gửi được tin nhắn. Bác kiểm tra backend ở http://localhost:8001 rồi thử lại.",
        "error"
      );
      setStatus("Chat chưa kết nối được backend.", "#f87171");
      chatInput.value = text;
      console.error("[EasyDVC] Chat error:", err);
    } finally {
      isSendingChat = false;
      sendBtn.disabled = false;
      sendBtn.innerText = "Gửi";
    }
  }

  sendBtn.addEventListener("click", sendChatMessage);
  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      sendChatMessage();
    }
  });

})();

/**
 * ThongDVC Floating Voice Widget
 * Injects a floating microphone button and an assistant panel for voice control.
 */

(function () {
  if (typeof window === "undefined" || window !== window.top || document.getElementById("thongdvc-widget-container")) {
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
      bottom: 25px;
      right: 25px;
      width: 56px;
      height: 56px;
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
      right: 25px;
      width: 360px;
      height: 480px;
      background: rgba(15, 23, 42, 0.95);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
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
      padding: 16px;
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
    }
    .thongdvc-status {
      font-size: 11px;
      color: #94a3b8;
      margin-top: 2px;
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
    .thongdvc-footer {
      padding: 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      gap: 10px;
      background: rgba(30, 41, 59, 0.5);
    }
    .thongdvc-btn {
      flex: 1;
      padding: 10px;
      border-radius: 8px;
      border: none;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      font-size: 13px;
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
      cursor: pointer;
      color: #94a3b8;
      font-size: 18px;
    }
    .thongdvc-close:hover {
      color: white;
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
    <button class="thongdvc-floating-btn" id="thongdvc-mic-btn" title="Mở Trợ lý giọng nói">🎙️</button>
    <div class="thongdvc-panel" id="thongdvc-panel">
      <div class="thongdvc-header">
        <div>
          <div class="thongdvc-title">👵👴 Trợ lý giọng nói ThôngDVC</div>
          <div class="thongdvc-status" id="thongdvc-status">Nhấn Bắt đầu để kết nối thoại</div>
        </div>
        <span class="thongdvc-close" id="thongdvc-close-btn">✕</span>
      </div>
      <div class="thongdvc-log" id="thongdvc-log">
        <div class="thongdvc-bubble thongdvc-bubble-agent">
          <strong>Trợ lý:</strong> Chào bác! Cháu là trợ lý Dịch vụ công. Bác hãy nhấn "Bắt đầu nói" hoặc gõ câu hỏi bên dưới nhé.
        </div>
      </div>
      <div class="thongdvc-footer" style="display: flex; flex-direction: column; gap: 8px; padding: 12px; background: rgba(30, 41, 59, 0.75);">
        <div style="display: flex; gap: 8px; width: 100%;">
          <input type="text" id="thongdvc-chat-input" placeholder="Hoặc bác gõ câu hỏi vào đây..." style="flex: 1; padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.15); background: rgba(15,23,42,0.6); color: white; font-size: 13px; outline: none;" />
          <button id="thongdvc-send-btn" style="background: #10b981; color: white; border: none; padding: 0 16px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 600; transition: background 0.2s;">Gửi</button>
        </div>
        <button class="thongdvc-btn thongdvc-btn-start" id="thongdvc-toggle-action" style="width: 100%; margin: 0;">Bắt đầu nói</button>
      </div>
    </div>
  `;
  document.body.appendChild(widgetContainer);

  // 3. Variables & Handlers
  let session = null;
  let currentStreamingBubble = null;
  let currentStreamingText = "";
  let functionCallNames = {};
  const micBtn = document.getElementById("thongdvc-mic-btn");
  const panel = document.getElementById("thongdvc-panel");
  const closeBtn = document.getElementById("thongdvc-close-btn");
  const toggleBtn = document.getElementById("thongdvc-toggle-action");
  const chatInput = document.getElementById("thongdvc-chat-input");
  const sendBtn = document.getElementById("thongdvc-send-btn");
  const statusEl = document.getElementById("thongdvc-status");
  const logEl = document.getElementById("thongdvc-log");

  // Toggle Panel open/close
  function togglePanel() {
    panel.classList.toggle("show");
  }

  micBtn.addEventListener("click", togglePanel);
  closeBtn.addEventListener("click", togglePanel);

  // Append a bubble to log
  function appendLog(sender, text, type) {
    const bubble = document.createElement("div");
    bubble.className = `thongdvc-bubble thongdvc-bubble-${type}`;
    bubble.innerHTML = `<strong>${sender}:</strong> ${text}`;
    logEl.appendChild(bubble);
    logEl.scrollTop = logEl.scrollHeight;
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
        statusEl.innerText = "Trợ lý đang nói...";
        statusEl.style.color = "#10b981";
      } else if (msg.status === "ai_stopped") {
        statusEl.innerText = "Đang lắng nghe bác...";
        statusEl.style.color = "#60a5fa";
      }
    } else if (msg.type === "agent_end") {
      const finalText = (msg.text || "").trim();
      if (finalText && !currentStreamingText.trim()) {
        appendLog("Trợ lý", finalText, "agent");
      }
      finalizeAiStreaming();
    } else if (msg.type === "error") {
      statusEl.innerText = "Lỗi kết nối!";
      statusEl.style.color = "#f87171";
      appendLog("Lỗi", msg.error.message || msg.error, "error");
      stopVoiceSession();
    } else if (msg.type === "transport_event") {
      const event = msg.event;
      // 1. User finished speaking, transcript completed
      if (event.type === "conversation.item.input_audio_transcription.completed") {
        if (event.transcript && event.transcript.trim()) {
          appendLog("Bạn", event.transcript, "user");
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
        appendLog("Hệ thống", `AI đang thực hiện lệnh: <code>${toolName}</code>`, "error"); // Use red/special bubble
      }
    }
  }

  // Start Session
  async function startVoiceSession() {
    statusEl.innerText = "Đang kết nối thoại...";
    statusEl.style.color = "#fbbf24";
    toggleBtn.disabled = true;

    try {
      session = await window.WebRTCClient.initializeVoiceAssistant(onVoiceEvent);
      
      statusEl.innerText = "Đang lắng nghe bác...";
      statusEl.style.color = "#60a5fa";
      
      micBtn.classList.add("active");
      toggleBtn.innerText = "Dừng thoại";
      toggleBtn.className = "thongdvc-btn thongdvc-btn-stop";
      toggleBtn.disabled = false;
      appendLog("Hệ thống", "Đã kết nối thoại thành công.", "error");
    } catch (err) {
      statusEl.innerText = "Lỗi: " + err.message;
      statusEl.style.color = "#f87171";
      toggleBtn.innerText = "Bắt đầu nói";
      toggleBtn.className = "thongdvc-btn thongdvc-btn-start";
      toggleBtn.disabled = false;
      
      
      // Tự động chuyển hướng đến trang permission.html nếu bị từ chối quyền
      const errMsg = (err.message || "").toLowerCase();
      const errName = (err.name || "").toLowerCase();
      if (errMsg.includes("permission") || errMsg.includes("dismissed") || errName.includes("notallowederror")) {
        appendLog("Lỗi", "Vui lòng cấp quyền Micro trong tab mới để tiếp tục.", "error");
        window.open(chrome.runtime.getURL("permission.html"));
      }
    }
  }

  // Stop Session
  function stopVoiceSession() {
    if (session) {
      window.WebRTCClient.closeVoiceSession(session);
      session = null;
    }
    micBtn.classList.remove("active");
    statusEl.innerText = "Đã ngắt kết nối thoại.";
    statusEl.style.color = "#94a3b8";
    toggleBtn.innerText = "Bắt đầu nói";
    toggleBtn.className = "thongdvc-btn thongdvc-btn-start";
    appendLog("Hệ thống", "Đã dừng phiên thoại.", "error");
  }

  toggleBtn.addEventListener("click", () => {
    if (!session) {
      startVoiceSession();
    } else {
      stopVoiceSession();
    }
  });

  async function sendChatMessage() {
    const text = chatInput.value.trim();
    if (!text) return;

    if (!session) {
      statusEl.innerText = "Đang kết nối thoại...";
      statusEl.style.color = "#fbbf24";
      try {
        await startVoiceSession();
      } catch (err) {
        statusEl.innerText = "Lỗi kết nối: " + err.message;
        statusEl.style.color = "#f87171";
        return;
      }
    }

    let textToSend = text;
    if (window.WebRTCClient && typeof window.WebRTCClient.mask === "function") {
      const maskedText = window.WebRTCClient.mask(text);
      if (maskedText !== text) {
        console.log("[PII] Phát hiện PII trong ô nhập text, kích hoạt xác thực!");
        appendLog("Bạn", maskedText, "user");
        chatInput.value = "";
        
        const confirmed = await window.handleCommand({
          action: "show_pii_confirm",
          masked_text: maskedText,
          raw_text: text,
          tokens: Array.from(window.WebRTCClient.getTokenMap().entries())
        });
        
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

    if (session && typeof session.sendMessage === "function") {
      session.sendMessage(textToSend);
    }
  }

  sendBtn.addEventListener("click", sendChatMessage);
  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      sendChatMessage();
    }
  });

})();

const { initializeVoiceAssistant, closeVoiceSession } = window.WebRTCClient;

let session = null;
const btnToggle = document.getElementById("btn-toggle");
const status = document.getElementById("status");

btnToggle.addEventListener("click", async () => {
  if (!session) {
    status.innerText = "Đang kết nối...";
    btnToggle.disabled = true;
    try {
      session = await initializeVoiceAssistant();
      status.innerText = "Đang lắng nghe...";
      btnToggle.innerText = "Dừng thoại";
      btnToggle.style.backgroundColor = "#ef4444";
      btnToggle.disabled = false;
    } catch (err) {
      status.innerText = "Lỗi: " + err.message;
      btnToggle.disabled = false;
      console.error(err);

      const errMsg = (err.message || "").toLowerCase();
      const errName = (err.name || "").toLowerCase();
      if (
        errMsg.includes("permission") || 
        errMsg.includes("dismissed") || 
        errName.includes("notallowederror") || 
        errName.includes("permission")
      ) {
        status.innerText = "Vui lòng cấp quyền Micro trong tab mới...";
        chrome.tabs.create({ url: chrome.runtime.getURL("permission.html") });
      }
    }
  } else {
    closeVoiceSession(session);
    session = null;
    status.innerText = "Đã ngắt kết nối.";
    btnToggle.innerText = "Bắt đầu nói";
    btnToggle.style.backgroundColor = "#10b981";
  }
});

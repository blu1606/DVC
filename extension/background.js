/**
 * ThongDVC Extension Background Service Worker
 * Handles fetching token from local server to bypass Mixed Content and CORS restrictions on HTTPS pages.
 */

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "FETCH_TOKEN") {
    console.log("[ThôngDVC Background] Đang fetch token từ http://localhost:8000/token...");
    fetch("http://localhost:8000/token")
      .then(response => {
        if (!response.ok) {
          throw new Error(`Server status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        console.log("[ThôngDVC Background] Lấy token thành công.");
        sendResponse({ status: "success", data: data });
      })
      .catch(error => {
        console.error("[ThôngDVC Background] Lỗi fetch token:", error);
        sendResponse({ status: "error", message: error.message });
      });
    return true; // Keep the message channel open for async response
  }
});

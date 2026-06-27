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

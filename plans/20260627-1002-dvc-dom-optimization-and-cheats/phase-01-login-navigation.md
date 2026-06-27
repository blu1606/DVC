# Phase 01: Kiểm tra Đăng nhập & Điều hướng Tự động

## 🎯 Mục tiêu
Đảm bảo khi người dùng truy cập trang Dịch vụ công và kích hoạt trợ lý ảo, hệ thống sẽ kiểm tra xem họ đã đăng nhập tài khoản chưa. Nếu chưa đăng nhập, tự động dẫn đường hoặc điều hướng họ đến trang đăng nhập (`/dvc-tthc-login` hoặc trang dịch vụ công tương đương).

---

## 📂 Các tệp sửa đổi
*   `[MODIFY]` [content.js](file:///d:/CODE/Hackathon/CODEX/extension/content.js) — Thêm hàm `checkLoginStatus()` và đăng ký hành động điều hướng.
*   `[MODIFY]` [webrtc-client.js](file:///d:/CODE/Hackathon/CODEX/extension/webrtc-client.js) — Đăng ký tool `check_login_status` và `navigate_to_login`.

---

## 📝 Các bước Triển khai chi tiết

### Bước 1: Thêm logic kiểm tra login trong content.js
Trên trang `dichvucong.gov.vn`, trạng thái đăng nhập được xác định bằng việc tìm kiếm nút "Đăng nhập" trên thanh điều hướng hoặc thông tin tài khoản:
```javascript
function checkLoginStatus() {
  // Tìm kiếm liên kết hoặc nút bấm đăng nhập
  const loginBtn = document.querySelector('a[href*="login"], a[href*="dang-nhap"], .btn-login, #btn-login');
  const userInfo = document.querySelector('.user-info, .profile-menu, #username-display');
  
  if (userInfo) {
    return { logged_in: true, username: userInfo.innerText.trim() };
  }
  if (loginBtn) {
    return { logged_in: false, login_selector: getUniqueSelector(loginBtn) };
  }
  
  // Fallback: Tìm text "Đăng nhập" trên toàn bộ trang
  const anchors = Array.from(document.querySelectorAll("a, button"));
  const foundLogin = anchors.find(el => (el.innerText || "").toLowerCase().includes("đăng nhập"));
  if (foundLogin) {
    return { logged_in: false, login_selector: getUniqueSelector(foundLogin) };
  }
  
  // Mặc định coi như đã login hoặc không tìm thấy nút login rõ ràng
  return { logged_in: true };
}
```

Đăng ký hành động trong `handleCommand`:
```javascript
if (action === "check_login") {
  return checkLoginStatus();
}
if (action === "navigate_to_login") {
  const loginUrl = "https://dichvucong.gov.vn/dvc-tthc-login"; // Hoặc selector loginBtn.click()
  window.location.href = loginUrl;
  return { status: "success", message: "Đang chuyển hướng sang trang đăng nhập..." };
}
```

### Bước 2: Đăng ký tool ở Client-side (webrtc-client.js)
```javascript
const checkLoginTool = tool({
  name: "check_login_status",
  description: "Kiểm tra xem người dân đã đăng nhập vào cổng dịch vụ công chưa.",
  parameters: z.object({}),
  async execute() {
    return await sendCommandToActiveTab("check_login", {});
  }
});

const navigateToLoginTool = tool({
  name: "navigate_to_login",
  description: "Chuyển hướng trình duyệt của người dân đến trang đăng nhập dịch vụ công.",
  parameters: z.object({}),
  async execute() {
    return await sendCommandToActiveTab("navigate_to_login", {});
  }
});
```

---

## 🛠️ Tiêu chuẩn nghiệm thu (Success Criteria)
1.  Người dùng kích hoạt thoại, Agent kiểm tra trạng thái đăng nhập qua `check_login_status`.
2.  Nếu trả về `logged_in: false`, Agent thông báo: *"Bác chưa đăng nhập tài khoản Dịch vụ công. Cháu xin phép chuyển hướng bác sang trang đăng nhập nhé."* và gọi `navigate_to_login`.

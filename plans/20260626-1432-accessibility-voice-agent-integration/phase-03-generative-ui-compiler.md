# Phase 03: Viết Content Script thực thi DOM Actions phía Trình duyệt

## 🎯 Mục tiêu
Chrome Extension nhận lệnh hành động (`type_input`, `click_button`, `select_option`) từ WebSocket Bridge, tìm kiếm phần tử DOM trên trang bằng selector và thực thi hành động thực tế.

---

## 💻 Công nghệ sử dụng
*   Chrome Extension API (Content Scripts)
*   Vanilla Javascript DOM Events (`Event`, `CustomEvent`)

---

## 📂 Các tệp tạo mới & sửa đổi
*   `[NEW]` `extension/form-mappings.json` — Lưu trữ cố định ánh xạ giữa khóa ngữ nghĩa và CSS Selector.
*   `[NEW]` `extension/content.js` — Script chạy trên trang dịch vụ công để tương tác DOM dựa trên ánh xạ cố định.

---

## 📝 Các bước Triển khai chi tiết

### Bước 1: Khởi tạo File ánh xạ cố định (`form-mappings.json`)
Tạo tệp JSON lưu trữ ánh xạ selector cho form dịch vụ công CT01:

```json
// extension/form-mappings.json
{
  "fullname": "input#fullname",
  "birthday": "input#birthday",
  "cccd-num": "input#cccd-num",
  "phone": "input#phone",
  "province": "select#prov",
  "address": "input#address",
  "btn-submit": "button#btn-submit"
}
```

### Bước 2: Lập trình Bộ xử lý Hành động DOM (Content Script)
Extension nạp tệp cấu hình mapping cố định. Khi nhận yêu cầu thao tác có chứa `field_name`, nó sẽ tự động tra cứu selector tương ứng từ file JSON.

```javascript
// extension/content.js

// Nạp file mapping cố định (có thể fetch từ extension assets hoặc khai báo trực tiếp)
const FIELD_MAPPINGS = {
  "fullname": "input#fullname",
  "birthday": "input#birthday",
  "cccd-num": "input#cccd-num",
  "phone": "input#phone",
  "province": "select#prov",
  "address": "input#address",
  "btn-submit": "button#btn-submit"
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { action, field_name, text, value } = message;

  try {
    // Tra cứu selector từ bộ map cố định
    const selector = FIELD_MAPPINGS[field_name];
    if (!selector) {
      return sendResponse({ status: "error", message: `Trường thông tin '${field_name}' chưa được định nghĩa trong mapping.` });
    }

    const element = document.querySelector(selector);
    if (!element) {
      return sendResponse({ status: "error", message: `Không tìm thấy phần tử DOM cho selector: ${selector}` });
    }

    if (action === "type_input") {
      element.value = text;
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
      highlightElement(element);
      return sendResponse({ status: "success" });
    }

    if (action === "click_button") {
      element.click();
      highlightElement(element);
      return sendResponse({ status: "success" });
    }

    if (action === "select_option") {
      element.value = value;
      element.dispatchEvent(new Event("change", { bubbles: true }));
      highlightElement(element);
      return sendResponse({ status: "success" });
    }
  } catch (error) {
    sendResponse({ status: "error", message: error.message });
  }
});

function highlightElement(el) {
  el.style.transition = "all 0.3s ease";
  el.style.boxShadow = "0 0 10px #10b981";
  el.style.borderColor = "#10b981";
  setTimeout(() => {
    el.style.boxShadow = "none";
    el.style.borderColor = "";
  }, 1500);
}
```

---

## 🛠️ Tiêu chuẩn nghiệm thu (Success Criteria)
1.  Khi gọi lệnh `"type_input"` với selector `"input#fullname"` và giá trị `"NGUYỄN VĂN HÙNG"`, ô input lập tức hiển thị tên và nhấp nháy viền xanh lá.
2.  Nếu tìm kiếm một selector không tồn tại trên trang, Extension trả về mã lỗi `{ status: "error", message: "Không tìm thấy phần tử..." }` mà không làm crash content script.

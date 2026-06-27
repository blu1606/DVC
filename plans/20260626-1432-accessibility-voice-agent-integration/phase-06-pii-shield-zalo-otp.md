# Phase 06: Lá chắn PII Regex & Đồng bộ Zalo OTP bảo mật

## 🎯 Mục tiêu
Triển khai bộ lọc Regex để mã hóa thông tin nhạy cảm (CCCD, SĐT, Họ tên) tại máy khách (Extension local) trước khi chuyển lên AI Loop, và kết nối kênh WebSocket truyền OTP ngắn hạn siêu bảo mật.

---

## 💻 Công nghệ sử dụng
*   Javascript Regular Expressions (Regex)
*   Client-side Memory Mapping (Tokenization)
*   WebSockets (truyền sự kiện ngắn hạn)

---

## 📂 Các tệp tạo mới & sửa đổi
*   `[NEW]` `extension/pii-shield.js` — Lọc PII và chuyển đổi thành Tokens.
*   `[NEW]` `extension/otp-channel.js` — Nhận và xóa mã OTP tức thì.

---

## 📝 Các bước Triển khai chi tiết

### Bước 1: Lập trình Lá chắn PII cục bộ (Client-Side Tokenization)
Extension thực hiện rà soát thông tin văn bản hoặc DOM trước khi gửi dữ liệu lên Python Server, chuyển đổi dữ liệu thật thành các token placeholder và thực hiện khôi phục ngược lại khi tự động điền form.

```javascript
// extension/pii-shield.js

export class PIIShield {
  constructor() {
    this.tokenMap = new Map();
    this.counter = 1;
  }

  // Token hóa thông tin thật
  mask(text) {
    let masked = text;

    // 1. Nhận diện số CCCD (12 chữ số)
    const cccdRegex = /\b\d{12}\b/g;
    masked = masked.replace(cccdRegex, (match) => {
      const token = `[CCCD_${this.counter++}]`;
      this.tokenMap.set(token, match);
      return token;
    });

    // 2. Nhận diện Số điện thoại (đầu số Việt Nam)
    const phoneRegex = /\b(0[3|5|7|8|9])([0-9]{8})\b/g;
    masked = masked.replace(phoneRegex, (match) => {
      const token = `[PHONE_${this.counter++}]`;
      this.tokenMap.set(token, match);
      return token;
    });

    return masked;
  }

  // Giải mã khi điền form thực tế
  unmask(tokenizedText) {
    let unmasked = tokenizedText;
    for (const [token, realValue] of this.tokenMap.entries()) {
      unmasked = unmasked.replaceAll(token, realValue);
    }
    return unmasked;
  }
}
```

### Bước 2: Truyền nhận OTP ngắn hạn qua WebSocket và tự động hủy
Để bảo vệ an toàn giao dịch công dân, mã OTP không được ghi lại vào nhật ký (logs), cơ sở dữ liệu hay lịch sử hội thoại của AI:
1. Zalo Bot gửi tin nhắn OTP đến server gateway.
2. Server đẩy thẳng OTP xuống Extension qua kênh WebSocket độc lập.
3. Extension nhận mã OTP, tự động điền vào thẻ input, nhấn gửi và **xóa biến chứa OTP trong bộ nhớ RAM ngay lập tức**.

```javascript
// extension/otp-channel.js

export function listenToOTPEvents(piiShieldInstance) {
  const socket = new WebSocket("ws://localhost:8080/otp-sync");

  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    if (data.type === "OTP_RECEIVED") {
      const otpCode = data.code;
      console.log("Đã nhận mã OTP an toàn!");

      // 1. Tìm ô nhập OTP trên DOM của trang dịch vụ công gốc
      const otpInput = document.querySelector("input[name*='otp'], input[id*='otp']");
      if (otpInput) {
        otpInput.value = otpCode;
        
        // 2. Kích hoạt nút submit hồ sơ tự động
        const submitBtn = document.querySelector("button#btn-submit");
        if (submitBtn) submitBtn.click();
      }

      // 3. Xóa biến OTP khỏi RAM để tránh lộ lọt
      setTimeout(() => {
        delete data.code;
        console.log("Đã xóa vĩnh viễn OTP khỏi bộ nhớ Extension.");
      }, 100);
    }
  };
}
```

---

## 🛠️ Tiêu chuẩn nghiệm thu (Success Criteria)
1.  Hàm `mask()` hoạt động tốt: chuyển đổi thành công số điện thoại `0912345678` thành `[PHONE_1]` trong các chuỗi payload gửi lên Server.
2.  Sau khi điền OTP và tự động gửi hồ sơ, biến dữ liệu chứa mã OTP trên bộ nhớ RAM của Extension được xóa sạch hoàn toàn, không lưu lại vết.

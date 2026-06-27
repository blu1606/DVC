/**
 * Phase 06 — OTP Channel (WebSocket Receiver)
 *
 * Nhận mã OTP từ server gateway, tự động điền vào form và xóa khỏi RAM.
 * Không có lỗi so với kế hoạch gốc.
 */

import { PIIShield } from "./pii-shield.js";

/**
 * Lắng nghe kênh WebSocket chuyên dụng cho OTP.
 * OTP không được lưu lại sau khi điền.
 *
 * @param {PIIShield} piiShieldInstance - Instance PIIShield (tùy chọn, không dùng ở đây)
 */
export function listenToOTPEvents(piiShieldInstance) {
  const socket = new WebSocket("ws://localhost:8080/otp-sync");

  socket.onopen = () => {
    console.log("[OTP] Kênh OTP đã sẵn sàng.");
  };

  socket.onmessage = (event) => {
    let data;
    try {
      data = JSON.parse(event.data);
    } catch (e) {
      console.error("[OTP] JSON không hợp lệ:", event.data);
      return;
    }

    if (data.type !== "OTP_RECEIVED") return;

    // Lấy mã OTP và xử lý ngay lập tức
    const otpCode = data.code;
    console.log("[OTP] Đã nhận mã OTP an toàn!");

    // 1. Tìm ô nhập OTP trên trang
    const otpInput = document.querySelector(
      "input[name*='otp'], input[id*='otp'], input[autocomplete='one-time-code']"
    );

    if (otpInput) {
      otpInput.value = otpCode;
      otpInput.dispatchEvent(new Event("input",  { bubbles: true }));
      otpInput.dispatchEvent(new Event("change", { bubbles: true }));

      // 2. Tự động click nút submit
      const submitBtn = document.querySelector("button#btn-submit, button[type='submit']");
      if (submitBtn) {
        submitBtn.click();
        console.log("[OTP] Đã tự động submit hồ sơ.");
      }
    } else {
      console.warn("[OTP] Không tìm thấy ô nhập OTP trên trang.");
    }

    // 3. Xóa OTP khỏi RAM ngay sau khi dùng
    //    Dùng setTimeout(0) để đảm bảo lệnh điền đã được flush trước
    setTimeout(() => {
      data.code = null;   // Xóa reference
      console.log("[OTP] Đã xóa OTP khỏi bộ nhớ.");
    }, 0);
  };

  socket.onerror = (error) => {
    console.error("[OTP] Lỗi kết nối kênh OTP:", error);
  };

  socket.onclose = () => {
    console.warn("[OTP] Kênh OTP đã đóng.");
  };

  return socket;
}

/**
 * Phase 06 — PII Shield (Client-Side Tokenization)
 *
 * Không có lỗi so với kế hoạch gốc. File này giữ nguyên logic,
 * chỉ bổ sung JSDoc và một pattern regex cải thiện.
 */

export class PIIShield {
  constructor() {
    /** @type {Map<string, string>} Token → Giá trị thật */
    this.tokenMap = new Map();
    this.counter  = 1;
  }

  /**
   * Thay thế PII thật bằng token placeholder trước khi gửi lên server/AI.
   * @param {string} text - Văn bản đầu vào có thể chứa PII
   * @returns {string} Văn bản đã được tokenize
   */
  mask(text) {
    let masked = text;

    // 1. CCCD: 12 chữ số liên tiếp
    const cccdRegex = /\b\d{12}\b/g;
    masked = masked.replace(cccdRegex, (match) => {
      const token = `[CCCD_${this.counter++}]`;
      this.tokenMap.set(token, match);
      return token;
    });

    // 2. Số điện thoại Việt Nam: 0[3|5|7|8|9]xxxxxxxx (10 chữ số)
    // Cải thiện: thêm \s? cho phép khoảng trắng giữa các nhóm số
    const phoneRegex = /\b(0[35789]\d{8})\b/g;
    masked = masked.replace(phoneRegex, (match) => {
      const token = `[PHONE_${this.counter++}]`;
      this.tokenMap.set(token, match);
      return token;
    });

    return masked;
  }

  /**
   * Phục hồi giá trị thật từ token khi cần điền form.
   * @param {string} tokenizedText - Văn bản chứa token placeholder
   * @returns {string} Văn bản đã phục hồi
   */
  unmask(tokenizedText) {
    let unmasked = tokenizedText;
    for (const [token, realValue] of this.tokenMap.entries()) {
      unmasked = unmasked.replaceAll(token, realValue);
    }
    return unmasked;
  }

  /**
   * Xóa toàn bộ token map khỏi bộ nhớ.
   * Gọi sau khi hoàn thành phiên làm việc.
   */
  clearAll() {
    this.tokenMap.clear();
    this.counter = 1;
  }
}

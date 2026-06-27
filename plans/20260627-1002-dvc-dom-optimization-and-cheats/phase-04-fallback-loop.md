# Phase 04: Luồng Hỏi lại (Ask Back) & Gợi ý Dịch vụ Tương tự

## 🎯 Mục tiêu
Giải quyết tình huống khi người dùng yêu cầu một dịch vụ không có trên hệ thống hoặc thông tin nói ra quá mơ hồ (low confidence). AI sẽ chủ động hỏi lại để làm rõ và gợi ý các dịch vụ có sẵn có tính chất gần giống.

---

## 📂 Các tệp sửa đổi
*   `[MODIFY]` [webrtc-client.js](file:///d:/CODE/Hackathon/CODEX/extension/webrtc-client.js) — Cấu hình prompts phản hồi cho Agent khi rơi vào trạng thái không tìm thấy dịch vụ hoặc độ tin cậy thấp.

---

## 📝 Các bước Triển khai chi tiết

### Bước 1: Xây dựng quy trình suy luận Fallback của Agent
1.  **Phát hiện ý định mơ hồ**: Nếu người dùng nói chung chung như *"Bác muốn làm giấy tờ"* hoặc *"Bác muốn đăng ký cái này"*, Agent được cấu hình để kích hoạt luồng **Ask Back**:
    *   Hỏi lại một cách lễ phép và dễ hiểu: *"Dạ thưa bác, bác đang muốn làm thủ tục liên quan đến cư trú (hộ khẩu) hay thẻ bảo hiểm y tế ạ?"*
2.  **Khớp từ khóa tương tự (Similarity Suggestion)**: Nếu người dùng yêu cầu dịch vụ không hỗ trợ trực tiếp (ví dụ: *"Bác muốn làm lại thẻ căn cước"*):
    *   Agent đối chiếu danh sách dịch vụ hiện có.
    *   Phản hồi: *"Dạ hiện tại cháu chưa hỗ trợ làm lại thẻ căn cước công dân trực tuyến. Tuy nhiên cháu có thể giúp bác làm các thủ tục liên quan đến sổ hộ khẩu (thường trú) hoặc cấp lại thẻ bảo hiểm y tế bị mất. Bác có muốn cháu hướng dẫn các dịch vụ này không ạ?"*

### Bước 2: Thiết lập luồng hội thoại đệm
Để tránh việc Agent im lặng hoặc tự động gọi tool bừa bãi khi không hiểu ý người dùng, cấu hình Agent bắt buộc phải hỏi ý kiến xác nhận của người dùng trước khi thực thi bất kỳ thao tác điền form hoặc chuyển trang nào.

---

## 🛠️ Tiêu chuẩn nghiệm thu (Success Criteria)
1.  Người dùng yêu cầu dịch vụ không có sẵn (e.g. làm căn cước công dân).
2.  Agent không gọi tool bừa bãi, trả lời lễ phép rằng chưa hỗ trợ dịch vụ đó, và chủ động gợi ý các dịch vụ hiện có (thường trú, thẻ BHYT).

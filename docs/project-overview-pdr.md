# Project Overview & Product Development Requirements (PDR)

## 1. Giới thiệu dự án (Project Overview)
**ThôngDVC** là trợ lý giọng nói thông minh được thiết kế đặc biệt dưới dạng Chrome Extension để hỗ trợ người cao tuổi Việt Nam thực hiện các thủ tục hành chính trực tuyến trên cổng Dịch vụ công Quốc gia (`dichvucong.gov.vn`). 

Hệ thống kết hợp sức mạnh giao tiếp tự nhiên của mô hình AI Realtime (OpenAI WebRTC) với khả năng tương tác trực tiếp lên trình duyệt để đơn giản hóa biểu mẫu và tối ưu hóa trải nghiệm cho người lớn tuổi.

## 2. Mục tiêu sản phẩm (Objectives)
*   **Thân thiện với người cao tuổi**: Giao tiếp bằng giọng nói tiếng Việt tự nhiên, ấm áp, lễ phép, phản hồi nhanh nhạy.
*   **Bảo mật dữ liệu cá nhân (PII Shield)**: Ngăn chặn tuyệt đối việc truyền thông tin nhạy cảm (như số CCCD, số điện thoại) lên máy chủ AI bằng giải pháp mã hóa cục bộ và hộp thoại xác nhận visual ở Client (Solution A).
*   **Tương tác DOM thông minh**: Hỗ trợ điền thông tin tự động, điền nhanh địa chỉ 3 cấp đồng bộ bất đồng bộ, điền nhanh hồ sơ và hiển thị checklist hướng dẫn trực quan (GenUI).

## 3. Yêu cầu tính năng (Functional Requirements)

### Phân hệ 1: Trợ lý giọng nói & Điều khiển (WebRTC Voice Client)
*   Kết nối trực tiếp từ trình duyệt tới OpenAI Realtime qua WebRTC.
*   Hỗ trợ chế độ rảnh tay (Server VAD) giúp người cao tuổi nói chuyện không cần bấm giữ.
*   Hiển thị bong bóng chat (Voice Widget) nổi trên màn hình cập nhật trạng thái thời gian thực.

### Phân hệ 2: Quản lý đăng nhập & Điều hướng thông minh
*   Tự động phát hiện trạng thái đăng nhập khi người dùng truy cập.
*   Nếu chưa đăng nhập, tự động phát hiện và click nút đăng nhập hoặc chuyển hướng tương đối sang trang đăng nhập.

### Phân hệ 3: Tối ưu hóa DOM & Caching
*   Sử dụng bộ đệm cấu trúc trang phẳng (`DVC_FORM_TEMPLATES`) để giảm lượng token gửi lên AI từ hàng chục ngàn xuống còn vài trăm.
*   Cơ chế cập nhật trạng thái form theo thời gian thực và đồng bộ dữ liệu.

### Phân hệ 4: Bảo mật dữ liệu cục bộ (PII Shield)
*   Tự động phát hiện và che giấu SĐT, CCCD thành các token bảo mật (`[🔒 CCCD_1]`, `[🔒 PHONE_1]`) trong phụ đề hiển thị.
*   Hiển thị modal xác nhận Visual ở Client. Chỉ khi người dân bấm "Đồng ý", thông tin mới được nạp vào bộ nhớ tạm để điền form.

### Phân hệ 5: Điền form & Địa chỉ 3 cấp (Cascading Address)
*   Điền nhanh thông tin cá nhân cơ bản (Bulk Fill).
*   Xử lý bất đồng bộ AJAX khi điền địa chỉ hành chính 3 cấp (Tỉnh -> Quận -> Phường) bằng cơ chế thăm dò vòng lặp (polling) thông minh.

---

## 4. Yêu cầu phi chức năng (Non-Functional Requirements)
*   **Hiệu năng**: Thời gian phản hồi giọng nói (latency) dưới 1.5 giây.
*   **Dung lượng Extension**: Tối ưu hóa dung lượng bundle dưới 3MB.
*   **Độ tin cậy**: Hoạt động bền bỉ, xử lý tốt các ngoại lệ mất mạng hoặc lỗi micro.
*   **Bảo mật**: Không lưu trữ vĩnh viễn thông tin CCCD hay SĐT của người dùng trên máy chủ trung gian.

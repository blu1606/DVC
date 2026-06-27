/**
 * EasyDVC Form Templates Configuration
 * Chứa định nghĩa cấu trúc phẳng (cached DOM) cho các trang dịch vụ công thật.
 */

const CT01_TEMPLATE = {
  title: "Đăng ký thường trú",
  headings: [
    { tag: "h1", text: "Nộp hồ sơ Đăng ký thường trú trực tuyến" }
  ],
  formFields: [
    { tag: "input", type: "text", id: "fullname", name: "fullname", placeholder: "Nhập họ và tên", label: "Họ và tên người nộp", required: true, selector: "input#fullname" },
    { tag: "input", type: "text", id: "birthday", name: "birthday", placeholder: "DD/MM/YYYY", label: "Ngày tháng năm sinh", required: true, selector: "input#birthday" },
    { tag: "input", type: "text", id: "cccd-num", name: "cccd-num", placeholder: "Số CCCD/Định danh", label: "Số định danh/CCCD", required: true, selector: "input#cccd-num" },
    { tag: "input", type: "text", id: "phone", name: "phone", placeholder: "Nhập số điện thoại", label: "Số điện thoại", required: true, selector: "input#phone" },
    { tag: "select", id: "prov", name: "province", label: "Tỉnh/Thành phố", required: true, selector: "select#prov", options: [
      { text: "Thành phố Hà Nội", value: "01" },
      { text: "Thành phố Hồ Chí Minh", value: "79" }
    ]},
    { tag: "select", id: "dist", name: "district", label: "Quận/Huyện", required: true, selector: "select#dist", options: [] },
    { tag: "select", id: "ward", name: "ward", label: "Xã/Phường", required: true, selector: "select#ward", options: [] },
    { tag: "input", type: "text", id: "address", name: "address", placeholder: "Số nhà, đường phố...", label: "Địa chỉ chi tiết", required: true, selector: "input#address" }
  ],
  buttons: [
    { id: "btn-submit", name: "submit", text: "Nộp hồ sơ", selector: "button#btn-submit" }
  ]
};

const TAX_TEMPLATE = {
  title: "Quyết toán thuế / Hoàn thuế thu nhập cá nhân trực tiếp với cơ quan thuế",
  headings: [
    { tag: "h1", text: "Quyết toán thuế thu nhập cá nhân (Mẫu số 02/QTT-TNCN)" }
  ],
  formFields: [
    { tag: "input", type: "text", id: "fullname", name: "fullname", placeholder: "Nhập họ và tên", label: "Họ và tên người nộp", required: true, selector: "input#fullname" },
    { tag: "input", type: "text", id: "cccd-num", name: "cccd-num", placeholder: "Số định danh/CCCD", label: "Số định danh/CCCD", required: true, selector: "input#cccd-num" },
    { tag: "input", type: "text", id: "phone", name: "phone", placeholder: "Nhập số điện thoại", label: "Số điện thoại", required: true, selector: "input#phone" },
    { tag: "input", type: "text", id: "tax-code", name: "tax-code", placeholder: "Mã số thuế 10 số", label: "Mã số thuế", required: true, selector: "input#tax-code" },
    { tag: "input", type: "text", id: "taxable-income", name: "taxable-income", placeholder: "Tổng thu nhập chịu thuế", label: "Tổng thu nhập chịu thuế", required: true, selector: "input#taxable-income" },
    { tag: "input", type: "text", id: "tax-deducted", name: "tax-deducted", placeholder: "Tổng số thuế đã khấu trừ", label: "Tổng số thuế đã khấu trừ", required: true, selector: "input#tax-deducted" },
    { tag: "input", type: "text", id: "tax-refund", name: "tax-refund", placeholder: "Số thuế đề nghị hoàn", label: "Số thuế đề nghị hoàn", required: true, selector: "input#tax-refund" },
    { tag: "input", type: "text", id: "bank-account", name: "bank-account", placeholder: "Số tài khoản nhận tiền hoàn", label: "Số tài khoản ngân hàng", required: true, selector: "input#bank-account" },
    { tag: "input", type: "text", id: "bank-name", name: "bank-name", placeholder: "Tên ngân hàng (ví dụ: Vietcombank)", label: "Ngân hàng nhận hoàn", required: true, selector: "input#bank-name" },
    { tag: "input", type: "radio", id: "change-workplace-yes", name: "change-workplace", label: "Có thay đổi nơi làm việc", selector: "input#change-workplace-yes" },
    { tag: "input", type: "radio", id: "change-workplace-no", name: "change-workplace", label: "Không thay đổi nơi làm việc", selector: "input#change-workplace-no" },
    { tag: "input", type: "radio", id: "has-contract-yes", name: "has-contract", label: "Có ký hợp đồng lao động trên 3 tháng tại nơi hiện tại", selector: "input#has-contract-yes" },
    { tag: "input", type: "radio", id: "has-contract-no", name: "has-contract", label: "Không ký hợp đồng lao động hoặc đã nghỉ việc", selector: "input#has-contract-no" },
    { tag: "input", type: "radio", id: "tax-deducted-source-yes", name: "tax-deducted-source", label: "Đã khấu trừ thuế tại nguồn đủ 100%", selector: "input#tax-deducted-source-yes" },
    { tag: "input", type: "radio", id: "tax-deducted-source-no", name: "tax-deducted-source", label: "Chưa khấu trừ hoặc khấu trừ thiếu tại nguồn", selector: "input#tax-deducted-source-no" }
  ],
  buttons: [
    { id: "btn-submit", name: "submit", text: "Nộp tờ khai quyết toán", selector: "button#btn-submit" }
  ]
};

const LOGIN_TEMPLATE = {
  title: "Dịch Vụ Công Thuế Nhà Nước - Trang chủ",
  headings: [
    { tag: "h1", text: "Dịch Vụ Công Thuế Nhà Nước" }
  ],
  states: {
    landing: "Trang đăng nhập ban đầu hoặc trang chủ thuế.",
    subject_modal: "Modal chọn đối tượng đăng nhập, ưu tiên Cá nhân.",
    credential_modal_cbt: "Form Tài khoản điện tử với tên đăng nhập, mật khẩu và captcha.",
    credential_modal_ldap: "Form tài khoản định danh/LDAP với tên đăng nhập, mật khẩu và captcha.",
    captcha_required: "Captcha đang hiển thị; người dùng phải tự đọc và nhập.",
    tax_code_select: "Modal chọn mã số thuế sau khi xác thực thành công.",
    unknown: "Không nhận diện chắc chắn trạng thái đăng nhập."
  },
  instructionsForAgent:
    "Không đọc, lưu, hoặc gửi CSRF, mật khẩu, captcha, cookie hay localStorage. " +
    "Hướng dẫn người dùng tự xử lý captcha. Hỏi xác nhận trước khi dùng MST đã lưu, bấm Đăng nhập, hoặc tiếp tục sau khi chọn MST. " +
    "Sau mỗi lần click/chuyển modal, gọi lại read_tax_login_state hoặc read_page_content.",
  formFields: [
    { tag: "select", id: "droplistInput", name: "_domain", placeholder: "", label: "Tên miền", required: false, selector: "select#droplistInput", sensitive: false, piiType: "none", options: [
      { text: "han.tct.vn", value: "han.tct.vn" },
      { text: "mb.tct.vn", value: "mb.tct.vn" },
      { text: "mn.tct.vn", value: "mn.tct.vn" },
      { text: "hcm.tct.vn", value: "hcm.tct.vn" },
      { text: "vp.tct.vn", value: "vp.tct.vn" }
    ]},
    { tag: "input", type: "text", name: "tenDNCbt", placeholder: "Nhập tên đăng nhập", label: "Tên đăng nhập tài khoản điện tử", required: false, selector: "input[name='tenDNCbt']", sensitive: false, piiType: "none" },
    { tag: "input", type: "password", name: "matKhauCbt", placeholder: "Nhập mật khẩu", label: "Mật khẩu tài khoản điện tử", required: false, selector: "input[name='matKhauCbt']", sensitive: true, piiType: "password" },
    { tag: "input", type: "text", name: "captchaCbt", placeholder: "Nhập mã captcha", label: "Mã captcha tài khoản điện tử", required: false, selector: "input[name='captchaCbt']", sensitive: true, piiType: "captcha" },
    { tag: "input", type: "text", name: "tenDN", placeholder: "Nhập tên đăng nhập", label: "Tên đăng nhập định danh", required: false, selector: "input[name='tenDN']", sensitive: false, piiType: "none" },
    { tag: "input", type: "password", name: "matKhau", placeholder: "Nhập mật khẩu", label: "Mật khẩu định danh", required: false, selector: "input[name='matKhau']", sensitive: true, piiType: "password" },
    { tag: "input", type: "text", name: "captcha", placeholder: "Nhập mã captcha", label: "Mã captcha định danh", required: false, selector: "input[name='captcha']", sensitive: true, piiType: "captcha" },
    { tag: "select", id: "chooseMst", name: "chooseMst", placeholder: "", label: "Chọn mã số thuế", required: false, selector: "select[name='chooseMst']", sensitive: true, piiType: "mst", options: [] },
    { tag: "input", type: "text", name: "maTTHC", placeholder: "Nhập tên/Mã thủ tục hành chính", label: "Tìm kiếm thủ tục hành chính", required: false, selector: "input[name='maTTHC']", sensitive: false, piiType: "none" }
  ],
  buttons: [
    { id: "btn-open-login", name: "openLogin", text: "Đăng nhập", selector: "a[href*='login'], button[data-bs-target*='login'], button.btn-login, #btn-login" },
    { id: "btn-login-submit-cbt", name: "loginCbt", text: "Đăng nhập tài khoản điện tử", selector: "button.btn-secondary[hx-on\\:click*='submitCBT']" },
    { id: "btn-login-submit-ldap", name: "loginLdap", text: "Đăng nhập định danh", selector: "button.btn-secondary[hx-on\\:click*='submitLDAP'], button.btn-primary[hx-on\\:click*='submitLDAP']" },
    { id: "btn-tax-code-continue", name: "continueAfterMst", text: "Tiếp tục sau khi chọn mã số thuế", selector: "button[hx-on\\:click*='chooseMst'], button[onclick*='chooseMst'], button.btn-primary" },
    { id: "btn-search-submit", name: "search", text: "Tìm kiếm", selector: "button.btn-primary[type='submit']" }
  ]
};

const SELECT_DECLARATION_TEMPLATE = {
  title: "Chọn tờ khai quyết toán thuế",
  headings: [
    { tag: "h1", text: "Chọn tờ khai quyết toán thuế" }
  ],
  instructionsForAgent:
    "Trên danh sách thủ tục, link chữ của thủ tục 2.002233 chỉ mở trang chi tiết. " +
    "Muốn nộp hồ sơ phải bấm icon folder màu xanh: a.nop-hoso-btn[ma-tthc='2.002233']. " +
    "Hỏi xác nhận người dùng trước khi bấm icon nộp hồ sơ.",
  formFields: [
    { tag: "select", id: "selectToKhai", name: "modalSelectMaToKhai", label: "Tờ khai quyết toán thuế", required: true, selector: "select#selectToKhai", options: [
      { text: "02/QTT-TNCN - Tờ khai quyết toán thuế thu nhập cá nhân (TT80/2021)", value: "952" },
      { text: "02/QTT-TNCN_TKHAI_GOI_Y - Tờ khai gợi ý (TT80/2021)", value: "1000" },
      { text: "02/QTT-TNCN - Tờ khai quyết toán thuế thu nhập cá nhân (TT92/2015)", value: "392" }
    ]}
  ],
  buttons: [
    { id: "link-detail-2.002233", name: "detail2.002233", text: "Xem chi tiết thủ tục 2.002233", selector: "a[href='/tthc/thu-tuc-hanh-chinh/chi-tiet-tthc?maTTHC=2.002233']", actionType: "detail_only" },
    { id: "btn-nop-hoso-2.002233", name: "nopHoso2.002233", text: "Nộp hồ sơ Quyết toán thuế bằng icon folder xanh", selector: "a.nop-hoso-btn[ma-tthc='2.002233']", actionType: "submit_procedure", icon: "bi bi-folder-symlink-fill", requiresConfirmation: true },
    { id: "btn-select-tokhai-trigger", name: "selectToKhaiTrigger", text: "Mở danh sách tờ khai", selector: "button[data-id='selectToKhai']" },
    { id: "btn-continue", name: "continue", text: "Tiếp tục", selector: "button[onclick='selectData()']" }
  ]
};

const DVC_FORM_TEMPLATES = {
  "/dvc-tthc-dang-ky-thuong-tru": CT01_TEMPLATE,
  "/test-dvc-cascading.html": CT01_TEMPLATE,
  "/dvc-tthc-quyet-toan-thue": TAX_TEMPLATE,
  "/test-dvc-tax.html": TAX_TEMPLATE,
  "/tthc/home": LOGIN_TEMPLATE,
  "/tthc/login": LOGIN_TEMPLATE,
  "/tthc/thu-tuc-hanh-chinh": SELECT_DECLARATION_TEMPLATE,
  "/dvc-tthc-cap-lai-the-bhyt": {
    title: "Cấp lại thẻ bảo hiểm y tế do hỏng, mất",
    headings: [
      { tag: "h1", text: "Cấp lại thẻ BHYT do mất, hỏng trực tuyến" }
    ],
    formFields: [
      { tag: "input", type: "text", id: "fullname", name: "fullname", placeholder: "Nhập họ và tên", label: "Họ và tên người yêu cầu", required: true, selector: "input#fullname" },
      { tag: "input", type: "text", id: "birthday", name: "birthday", placeholder: "DD/MM/YYYY", label: "Ngày tháng năm sinh", required: true, selector: "input#birthday" },
      { tag: "input", type: "text", id: "cccd-num", name: "cccd-num", placeholder: "Số định danh/CCCD", label: "Số định danh/CCCD", required: true, selector: "input#cccd-num" },
      { tag: "input", type: "text", id: "phone", name: "phone", placeholder: "Nhập số điện thoại", label: "Số điện thoại BHYT", required: true, selector: "input#phone" }
    ],
    buttons: [
      { id: "btn-submit", name: "submit", text: "Gửi yêu cầu cấp lại", selector: "button#btn-submit" }
    ]
  }
};

window.DVC_FORM_TEMPLATES = DVC_FORM_TEMPLATES;

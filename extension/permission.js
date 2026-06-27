document.getElementById("btn-request").addEventListener("click", async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Dừng luồng audio ngay lập tức sau khi được cấp quyền
    stream.getTracks().forEach(track => track.stop());
    alert("Cấp quyền Micro thành công! Bạn hãy mở lại popup để sử dụng.");
    window.close();
  } catch (err) {
    console.error(err);
    alert("Không thể lấy quyền Micro: " + err.message);
  }
});

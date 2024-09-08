document.getElementById("updateSizeButton").addEventListener("click", async function() {
  const plistUrl = document.getElementById("plistUrlInput").value; // Lấy URL từ input của người dùng
  if (!plistUrl) {
    alert("Vui lòng nhập URL plist hoặc IPA.");
    return;
  }

  try {
    const response = await fetch(`/api/getIpaSize?url=${encodeURIComponent(plistUrl)}`);
    const result = await response.json();

    if (response.ok) {
      document.getElementById("fileSizeField").value = result.size; // Tự động điền kích thước vào trường kích thước
    } else {
      alert(`Lỗi: ${result.error}`);
    }
  } catch (error) {
    console.error("Error:", error);
    alert("Có lỗi xảy ra khi cập nhật kích thước.");
  }
});
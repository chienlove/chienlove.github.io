// main.js - Khởi tạo ứng dụng chính
function initCMS() {
  // Khởi tạo các module
  initAuth();
  
  // Tải cấu hình CMS
  loadCMSConfig().then(() => {
    updateSidebar();
    // Load nội dung mặc định
    window.loadFolderContents('content');
  });
}

// Khởi chạy ứng dụng khi DOM sẵn sàng
document.addEventListener('DOMContentLoaded', () => {
  initCMS();
});
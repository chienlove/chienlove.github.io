// CMS MOBILE FIX - DEFINITIVE SOLUTION
document.addEventListener('DOMContentLoaded', function() {
  // 1. Tạo style element
  const style = document.createElement('style');
  style.id = 'cms-mobile-definitive-fix';
  style.textContent = `
    /* MOBILE OVERRIDES - STRONGEST POSSIBLE */
    .nc-root {
      display: flex !important;
      flex-direction: column-reverse !important;
      padding-bottom: 80px !important;
    }
    
    .nc-sidebar {
      all: initial !important; /* Reset hoàn toàn */
      position: fixed !important;
      bottom: 0 !important;
      left: 0 !important;
      right: 0 !important;
      height: 60px !important;
      background: #fff !important;
      box-shadow: 0 -5px 15px rgba(0,0,0,0.1) !important;
      z-index: 9999 !important;
      display: flex !important;
      flex-direction: row !important;
      overflow-x: auto !important;
      border-top: 3px solid #4CAF50 !important;
    }
    
    .nc-collectionLink {
      min-width: 120px !important;
      height: 100% !important;
      padding: 0 15px !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      border-right: 1px solid #eee !important;
      font-size: 14px !important;
    }
    
    .nc-main {
      margin-bottom: 70px !important;
      padding: 15px !important;
    }
    
    /* VISUAL CONFIRMATION */
    .nc-sidebar::before {
      content: "MOBILE LAYOUT ACTIVE";
      position: absolute;
      top: -25px;
      left: 0;
      right: 0;
      background: #4CAF50;
      color: white;
      text-align: center;
      font-size: 12px;
      padding: 2px;
      z-index: 10000;
    }
  `;
  
  // 2. Chèn vào head
  document.head.appendChild(style);
  
  // 3. Kiểm tra và áp dụng liên tục
  function checkAndApply() {
    const sidebar = document.querySelector('.nc-sidebar');
    if (sidebar) {
      // Thêm hiệu ứng visual confirmation
      sidebar.style.transition = 'all 0.5s';
      sidebar.style.transform = 'translateY(0)';
      
      // Log thành công
      console.log('CMS MOBILE FIX APPLIED SUCCESSFULLY!');
      
      // Thêm class vào body
      document.body.classList.add('cms-mobile-active');
    } else {
      setTimeout(checkAndApply, 500);
    }
  }
  
  // Bắt đầu kiểm tra
  checkAndApply();
});

// Fallback cho CMS loaded event
if (window.CMS) {
  window.CMS.registerEventListener({
    name: 'preview',
    handler: () => console.log('CMS preview updated')
  });
}
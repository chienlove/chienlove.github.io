// Thêm vào thư mục /admin/widgets/
document.addEventListener('DOMContentLoaded', function() {
  function applyMobileFix() {
    // 1. Kiểm tra mobile
    const isMobile = window.innerWidth < 768;
    
    // 2. Thêm class vào các element chính
    document.documentElement.classList.toggle('cms-mobile', isMobile);
    document.body.classList.toggle('mobile-view', isMobile);
    
    // 3. Tìm root element của CMS
    const cmsRoot = document.getElementById('nc-root');
    if (!cmsRoot) return;
    
    // 4. Áp dụng style trực tiếp
    const style = document.createElement('style');
    style.id = 'mobile-forced-styles';
    style.textContent = `
      /* GHI ĐÈ MẠNH MẼ */
      .nc-root {
        display: flex !important;
        flex-direction: column-reverse !important;
        padding-bottom: 60px !important;
      }
      
      .nc-sidebar {
        position: fixed !important;
        bottom: 0 !important;
        top: auto !important;
        left: 0 !important;
        right: 0 !important;
        width: 100% !important;
        height: 60px !important;
        flex-direction: row !important;
        overflow-x: auto !important;
        z-index: 1000 !important;
        background: #fff !important;
        box-shadow: 0 -2px 10px rgba(0,0,0,0.1) !important;
      }
      
      .nc-collectionLink {
        min-width: 120px !important;
        height: 100% !important;
        padding: 0 15px !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        border-right: 1px solid #eee !important;
      }
      
      .nc-main {
        margin: 0 !important;
        padding: 15px !important;
        width: 100% !important;
        margin-bottom: 60px !important;
      }
    `;
    
    // 5. Đảm bảo không trùng lặp
    const existingStyle = document.getElementById('mobile-forced-styles');
    if (existingStyle) existingStyle.remove();
    
    // 6. Chèn vào head
    document.head.appendChild(style);
    
    // 7. Log để debug
    console.log('Mobile styles applied', isMobile);
  }
  
  // Kích hoạt ngay lập tức
  applyMobileFix();
  
  // Theo dõi thay đổi kích thước
  window.addEventListener('resize', applyMobileFix);
  
  // Theo dõi sự kiện load CMS
  if (window.CMS) {
    CMS.registerEventListener({
      name: 'preview',
      handler: applyMobileFix
    });
  }
});
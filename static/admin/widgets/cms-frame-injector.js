// /admin/widgets/cms-frame-injector.js
function injectMobileStyles() {
  // 1. Tìm iframe chứa CMS
  const cmsFrame = document.querySelector('#nc-root iframe, .nc-root iframe');
  
  if (!cmsFrame) {
    console.log('CMS frame not found, retrying...');
    setTimeout(injectMobileStyles, 1000);
    return;
  }

  // 2. Chờ frame load xong
  cmsFrame.onload = function() {
    try {
      const frameDoc = cmsFrame.contentDocument || cmsFrame.contentWindow.document;
      
      // 3. Tạo style element
      const styleId = 'cms-mobile-forced';
      let style = frameDoc.getElementById(styleId);
      
      if (!style) {
        style = frameDoc.createElement('style');
        style.id = styleId;
        frameDoc.head.appendChild(style);
      }
      
      // 4. CSS sẽ ghi đè mạnh mẽ
      style.textContent = `
        /* ROOT LAYOUT */
        .nc-root {
          display: flex !important;
          flex-direction: column-reverse !important;
          padding-bottom: 60px !important;
        }
        
        /* SIDEBAR - MENU DƯỚI ĐÁY */
        .nc-sidebar {
          position: fixed !important;
          bottom: 0 !important;
          top: auto !important;
          left: 0 !important;
          right: 0 !important;
          width: 100% !important;
          height: 60px !important;
          background: #fff !important;
          box-shadow: 0 -2px 10px rgba(0,0,0,0.1) !important;
          z-index: 1000 !important;
          display: flex !important;
          flex-direction: row !important;
          border: 5px solid #00FF00 !important; /* MÀU XANH LÁ TEST */
        }
        
        /* MENU ITEMS */
        .nc-collectionLink {
          min-width: 120px !important;
          height: 100% !important;
          padding: 0 15px !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
        }
        
        /* MAIN CONTENT */
        .nc-main {
          margin-bottom: 80px !important;
          padding: 15px !important;
        }
      `;
      
      console.log('SUCCESS: Injected mobile styles into CMS frame');
      
      // 5. Kiểm tra bằng cách thay đổi màu nền
      setTimeout(() => {
        const sidebar = frameDoc.querySelector('.nc-sidebar');
        if (sidebar) {
          sidebar.style.backgroundColor = 'rgba(0,255,0,0.3)';
          console.log('Applied green background to sidebar');
        }
      }, 500);
      
    } catch (error) {
      console.error('Injection failed:', error);
    }
  };
  
  // Nếu frame đã load sẵn
  if (cmsFrame.contentDocument) {
    cmsFrame.onload();
  }
}

// Bắt đầu quá trình
document.addEventListener('DOMContentLoaded', injectMobileStyles);
document.addEventListener('netlify-cms-loaded', injectMobileStyles);
setInterval(injectMobileStyles, 2000); // Fallback
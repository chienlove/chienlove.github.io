// /admin/widgets/cms-mobile-injector.js
document.addEventListener('DOMContentLoaded', function() {
  const injectStyles = () => {
    // 1. Tìm root element của CMS
    const cmsRoot = document.querySelector('#nc-root, .nc-root');
    if (!cmsRoot) return;
    
    // 2. Tạo style element với CSS quan trọng
    const styleId = 'cms-mobile-forced-styles';
    let style = document.getElementById(styleId);
    
    if (!style) {
      style = document.createElement('style');
      style.id = styleId;
      document.head.appendChild(style);
    }
    
    // 3. CSS sẽ ghi đè mọi thứ
    style.textContent = `
      /* ROOT LAYOUT */
      .nc-root {
        display: flex !important;
        flex-direction: column-reverse !important;
        padding-bottom: 60px !important;
      }
      
      /* SIDEBAR - CHUYỂN THÀNH MENU DƯỚI ĐÁY */
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
        transform: none !important;
      }
      
      /* MENU ITEMS */
      .nc-collectionLink {
        min-width: 120px !important;
        height: 100% !important;
        padding: 0 15px !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        border-right: 1px solid #eee !important;
      }
      
      /* MAIN CONTENT */
      .nc-main {
        margin: 0 !important;
        padding: 15px !important;
        width: 100% !important;
        margin-bottom: 60px !important;
      }
      
      /* TEST THÀNH CÔNG */
      .nc-sidebar {
        border: 3px solid red !important;
      }
    `;
    
    console.log('MOBILE STYLES INJECTED - CHECK FOR RED BORDER');
  };

  // 4. Chạy ngay lập tức và thiết lập interval
  injectStyles();
  const interval = setInterval(injectStyles, 1000);
  
  // 5. Dọn dẹp khi unload
  window.addEventListener('beforeunload', () => {
    clearInterval(interval);
  });
});
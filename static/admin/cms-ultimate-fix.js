// ULTIMATE CMS MOBILE FIX - WORKING SOLUTION
(function() {
  // 1. Tạo style element toàn cục
  const globalStyle = document.createElement('style');
  globalStyle.id = 'cms-ultimate-global-fix';
  globalStyle.textContent = `
    /* GLOBAL OVERRIDES */
    .nc-root {
      display: flex !important;
      flex-direction: column-reverse !important;
      padding-bottom: 80px !important;
    }
    
    .nc-sidebar {
      position: fixed !important;
      bottom: 0 !important;
      left: 0 !important;
      right: 0 !important;
      height: 60px !important;
      background: #ffffff !important;
      box-shadow: 0 -5px 15px rgba(0,0,0,0.1) !important;
      z-index: 9999 !important;
      display: flex !important;
      border-top: 3px solid #2196F3 !important;
      animation: pulse-border 2s infinite;
    }
    
    @keyframes pulse-border {
      0% { border-color: #2196F3; }
      50% { border-color: #4CAF50; }
      100% { border-color: #2196F3; }
    }
    
    .nc-collectionLink {
      min-width: 120px !important;
      padding: 0 15px !important;
      display: flex !important;
      align-items: center !important;
      border-right: 1px solid #e0e0e0 !important;
      font-size: 14px !important;
    }
    
    .nc-main {
      margin-bottom: 70px !important;
      padding: 15px !important;
    }
    
    /* VISUAL CONFIRMATION */
    .cms-mobile-confirm {
      position: fixed !important;
      bottom: 70px !important;
      left: 0 !important;
      right: 0 !important;
      background: #FFC107 !important;
      color: #000 !important;
      padding: 10px !important;
      text-align: center !important;
      z-index: 9998 !important;
      font-weight: bold !important;
    }
  `;
  document.head.appendChild(globalStyle);

  // 2. Hàm apply styles trực tiếp
  function applyDirectStyles() {
    const sidebar = document.querySelector('.nc-sidebar');
    if (sidebar) {
      sidebar.style.cssText = `
        position: fixed !important;
        bottom: 0 !important;
        left: 0 !important;
        right: 0 !important;
        height: 60px !important;
        background: #ffffff !important;
        z-index: 9999 !important;
        display: flex !important;
        border-top: 3px solid #FF5722 !important;
      `;
      
      // Tạo visual confirmation
      const confirmDiv = document.createElement('div');
      confirmDiv.className = 'cms-mobile-confirm';
      confirmDiv.textContent = 'CMS MOBILE MODE ACTIVE (DIRECT INJECTION)';
      document.body.appendChild(confirmDiv);
      
      console.log('DIRECT STYLES APPLIED TO SIDEBAR!');
      return true;
    }
    return false;
  }

  // 3. Thử áp dụng ngay lập tức
  if (!applyDirectStyles()) {
    // Nếu chưa tồn tại, sử dụng MutationObserver
    const observer = new MutationObserver((mutations) => {
      if (applyDirectStyles()) {
        observer.disconnect();
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // Timeout fallback
    setTimeout(() => {
      if (!document.querySelector('.cms-mobile-confirm')) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          background: #F44336;
          color: white;
          padding: 15px;
          text-align: center;
          z-index: 10000;
          font-weight: bold;
        `;
        errorDiv.textContent = 'CMS MOBILE FIX FAILED - PLEASE CONTACT SUPPORT';
        document.body.appendChild(errorDiv);
      }
    }, 10000);
  }
})();
// CMS Mobile Override Plugin
CMS.registerEventListener({
  name: 'preview',
  handler: ({ entry, view }) => {
    // 1. Chờ CMS render xong
    setTimeout(() => {
      // 2. Áp dụng mobile styles trực tiếp
      const styleId = 'cms-mobile-override';
      let style = document.getElementById(styleId);
      
      if (!style) {
        style = document.createElement('style');
        style.id = styleId;
        document.head.appendChild(style);
      }

      // 3. CSS ghi đè mạnh mẽ
      style.textContent = `
        /* MOBILE ROOT LAYOUT */
        .nc-root {
          display: flex !important;
          flex-direction: column-reverse !important;
          padding-bottom: 80px !important;
        }
        
        /* SIDEBAR AS BOTTOM NAV */
        .nc-sidebar {
          position: fixed !important;
          bottom: 0 !important;
          left: 0 !important;
          right: 0 !important;
          height: 60px !important;
          background: #fff !important;
          box-shadow: 0 -5px 15px rgba(0,0,0,0.1) !important;
          z-index: 1000 !important;
          display: flex !important;
          overflow-x: auto !important;
          border-top: 3px solid #FF5722 !important;
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
        
        /* MAIN CONTENT AREA */
        .nc-main {
          margin-bottom: 70px !important;
          padding: 15px !important;
        }
        
        /* VISUAL TEST */
        .nc-sidebar::after {
          content: "MOBILE MODE ACTIVE";
          position: absolute;
          top: -25px;
          left: 0;
          right: 0;
          background: #FF5722;
          color: white;
          text-align: center;
          font-size: 12px;
          padding: 2px;
        }
      `;
      
      console.log('CMS MOBILE OVERRIDE APPLIED!');
      
      // 4. Kiểm tra bằng cách thêm animation
      const sidebar = document.querySelector('.nc-sidebar');
      if (sidebar) {
        sidebar.style.transition = 'all 0.3s';
        setTimeout(() => {
          sidebar.style.transform = 'translateY(0)';
        }, 500);
      }
    }, 1000);
  }
});

console.log('CMS Mobile Plugin Registered');
// PROXY CSS INJECTOR - LAST RESORT SOLUTION
(function() {
  const observer = new MutationObserver((mutations) => {
    const cmsRoot = document.querySelector('.nc-root, #nc-root');
    if (cmsRoot) {
      // Tạo shadow DOM nếu cần
      if (!cmsRoot.shadowRoot) {
        cmsRoot.attachShadow({ mode: 'open' });
      }
      
      // Inject CSS vào shadow DOM
      const style = document.createElement('style');
      style.textContent = `
        :host {
          display: block;
          position: relative;
          padding-bottom: 80px !important;
        }
        
        .nc-sidebar {
          all: initial !important;
          position: fixed !important;
          bottom: 0 !important;
          left: 0 !important;
          right: 0 !important;
          height: 60px !important;
          background: #fff !important;
          box-shadow: 0 -5px 15px rgba(0,0,0,0.1) !important;
          z-index: 9999 !important;
          display: flex !important;
          border-top: 3px solid #FF5252 !important;
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
          0% { border-color: #FF5252; }
          50% { border-color: #2196F3; }
          100% { border-color: #FF5252; }
        }
        
        .nc-collectionLink {
          min-width: 120px !important;
          padding: 0 15px !important;
          display: flex !important;
          align-items: center !important;
          border-right: 1px solid #eee !important;
        }
        
        .nc-main {
          margin-bottom: 70px !important;
        }
      `;
      
      // Đảm bảo không trùng lặp
      cmsRoot.shadowRoot.querySelectorAll('style').forEach(s => s.remove());
      cmsRoot.shadowRoot.appendChild(style);
      
      console.log('SHADOW DOM CSS INJECTED!');
      observer.disconnect();
    }
  });

  // Bắt đầu quan sát
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Fallback timeout
  setTimeout(() => {
    if (!document.querySelector('.nc-root style')) {
      console.error('Fallback injection');
      const style = document.createElement('style');
      style.textContent = `
        body::before {
          content: "CMS MOBILE FIX FAILED!";
          display: block;
          padding: 20px;
          background: red;
          color: white;
          font-size: 24px;
          text-align: center;
          position: fixed;
          top: 0;
          z-index: 99999;
        }
      `;
      document.head.appendChild(style);
    }
  }, 10000);
})();
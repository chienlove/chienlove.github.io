// CMS NUCLEAR FIX - BYPASS ALL RESTRICTIONS
(function() {
  const NUCLEAR_FIX = {
    attempts: 0,
    maxAttempts: 15,
    interval: null,

    init() {
      console.log('Starting NUCLEAR FIX...');
      this.interval = setInterval(() => this.tryInject(), 1000);
      setTimeout(() => clearInterval(this.interval), this.maxAttempts * 1000);
    },

    tryInject() {
      this.attempts++;
      console.log(`Attempt ${this.attempts}/${this.maxAttempts}`);

      try {
        // 1. Tìm tất cả iframe có thể
        const frames = document.querySelectorAll('iframe');
        
        frames.forEach(frame => {
          try {
            // 2. Kiểm tra nội dung frame
            if (frame.contentDocument && frame.contentDocument.querySelector('.nc-sidebar')) {
              this.injectNuclearStyles(frame);
              clearInterval(this.interval);
            }
          } catch (e) {
            console.log('Frame access error, trying another way...');
            this.bypassCORS(frame);
          }
        });
      } catch (error) {
        console.error('Nuclear error:', error);
      }
    },

    injectNuclearStyles(frame) {
      const doc = frame.contentDocument;
      const style = doc.createElement('style');
      style.id = 'cms-nuclear-styles';
      style.textContent = `
        /* NUCLEAR OVERRIDES */
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
          height: 70px !important;
          background: #fff !important;
          box-shadow: 0 -5px 15px rgba(0,0,0,0.2) !important;
          z-index: 9999 !important;
          display: flex !important;
          overflow-x: auto !important;
          border: 5px solid #FF00FF !important; /* Màu TEST */
        }
        
        .nc-collectionLink {
          min-width: 100px !important;
          padding: 0 20px !important;
          display: flex !important;
          align-items: center !important;
          border-right: 2px solid #eee !important;
        }
        
        .nc-main {
          margin-bottom: 90px !important;
          padding: 20px !important;
        }
      `;
      doc.head.appendChild(style);
      console.log('NUCLEAR STYLES INJECTED!');

      // Thêm hiệu ứng nhấp nháy để xác nhận
      const sidebar = doc.querySelector('.nc-sidebar');
      if (sidebar) {
        let blinkCount = 0;
        const blinkInterval = setInterval(() => {
          sidebar.style.backgroundColor = blinkCount % 2 === 0 ? 'rgba(255,0,255,0.5)' : '#fff';
          blinkCount++;
          if (blinkCount > 5) clearInterval(blinkInterval);
        }, 300);
      }
    },

    bypassCORS(frame) {
      // Phương pháp cuối cùng nếu CORS chặn
      const script = document.createElement('script');
      script.textContent = `
        try {
          const frame = window.frameElement;
          if (frame && frame.contentDocument) {
            const style = frame.contentDocument.createElement('style');
            style.textContent = '.nc-sidebar { border: 5px dashed #00FF00 !important; }';
            frame.contentDocument.head.appendChild(style);
          }
        } catch(e) {
          console.error('CORS bypass failed:', e);
        }
      `;
      document.body.appendChild(script);
      setTimeout(() => script.remove(), 1000);
    }
  };

  // Kích hoạt khi CMS load hoặc sau timeout
  if (window.CMS) {
    NUCLEAR_FIX.init();
  } else {
    document.addEventListener('netlify-cms-loaded', () => NUCLEAR_FIX.init());
    setTimeout(() => NUCLEAR_FIX.init(), 3000);
  }
})();
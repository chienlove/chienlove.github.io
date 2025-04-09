// CMS FINAL INJECTOR - WORKING SOLUTION
const CMS_INJECTOR = {
  init() {
    this.attemptCount = 0;
    this.maxAttempts = 10;
    this.startInjection();
  },

  startInjection() {
    const inject = () => {
      this.attemptCount++;
      
      // 1. Tìm đúng iframe preview
      const frame = document.getElementById('preview-pane');
      if (!frame) {
        if (this.attemptCount < this.maxAttempts) {
          setTimeout(inject, 1000);
          console.log(`Retrying... (${this.attemptCount}/${this.maxAttempts})`);
        }
        return;
      }

      // 2. Đảm bảo frame đã load
      if (!frame.contentDocument || !frame.contentDocument.readyState === 'complete') {
        frame.onload = inject;
        return;
      }

      // 3. Tiêm CSS trực tiếp
      this.injectStyles(frame);
    };

    inject();
  },

  injectStyles(frame) {
    const doc = frame.contentDocument;
    const styleId = 'cms-mobile-final-fix';
    
    // Xóa style cũ nếu tồn tại
    const oldStyle = doc.getElementById(styleId);
    if (oldStyle) oldStyle.remove();

    // Tạo style mới
    const style = doc.createElement('style');
    style.id = styleId;
    style.textContent = this.getMobileCSS();
    doc.head.appendChild(style);

    console.log('SUCCESSFULLY INJECTED MOBILE STYLES!');
    
    // Kiểm tra bằng cách thêm border đỏ
    const sidebar = doc.querySelector('.nc-sidebar');
    if (sidebar) {
      sidebar.style.border = '5px solid red !important';
      sidebar.style.background = 'rgba(255,0,0,0.1) !important';
      console.log('Applied red border to sidebar');
    }
  },

  getMobileCSS() {
    return `
      /* MOBILE OVERRIDES */
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
        background: #fff !important;
        box-shadow: 0 -2px 10px rgba(0,0,0,0.1) !important;
        z-index: 1000 !important;
        display: flex !important;
        flex-direction: row !important;
        overflow-x: auto !important;
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
        margin-bottom: 80px !important;
        padding: 15px !important;
      }
    `;
  }
};

// Khởi động khi CMS ready
document.addEventListener('netlify-cms-loaded', () => CMS_INJECTOR.init());
document.addEventListener('DOMContentLoaded', () => CMS_INJECTOR.init());
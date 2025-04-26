// admin/nuclear.js
const nuclearStrike = () => {
  // 1. Xóa sidebar hoàn toàn
  const sidebarElements = [
    ...document.querySelectorAll('.CMS_sidebar-wrapper'),
    ...document.querySelectorAll('.CMS_sidebar'),
    ...document.querySelectorAll('[class*="sidebar"]')
  ];
  
  sidebarElements.forEach(el => {
    el.style.cssText = `
      display: none !important;
      width: 0 !important;
      height: 0 !important;
      transform: translateX(-100vw) !important;
    `;
    el.remove();
  });
  
  // 2. Fix editor
  const editor = document.querySelector('.CMS_editor');
  if (editor) {
    editor.style.cssText = `
      width: 100vw !important;
      max-width: 100vw !important;
      padding: 20px !important;
      margin-left: 0 !important;
      background-color: #fff !important;
      overflow-x: hidden !important;
    `;
  }
};

// Chạy mỗi 100ms
const strikeInterval = setInterval(nuclearStrike, 100);

// Dừng sau 10s
setTimeout(() => clearInterval(strikeInterval), 10000);
// auth.js - Xử lý xác thực với Netlify Identity
let currentUser = null;

function initAuth() {
  if (window.netlifyIdentity) {
    netlifyIdentity.init({
      APIUrl: 'https://storeios.net/.netlify/identity',
      enableOperator: true
    });

    netlifyIdentity.on('init', handleAuthChange);
    netlifyIdentity.on('login', (user) => {
      handleAuthChange(user);
      netlifyIdentity.close();
    });
    netlifyIdentity.on('logout', () => handleAuthChange(null));
    netlifyIdentity.on('close', () => {
      if (!netlifyIdentity.currentUser()) {
        handleAuthChange(null);
      }
    });

    document.getElementById('login-btn').addEventListener('click', () => {
      if (netlifyIdentity.currentUser()) {
        netlifyIdentity.logout();
      } else {
        netlifyIdentity.open('login');
      }
    });
  }
}

function handleAuthChange(user) {
  currentUser = user;
  const loginBtn = document.getElementById('login-btn');
  const dashboard = document.getElementById('dashboard');
  const sidebar = document.getElementById('sidebar');
  
  if (user) {
    console.log('Đã đăng nhập:', user.email);
    loginBtn.innerHTML = `<i class="fas fa-sign-out-alt"></i> <span>Đăng xuất (${user.email.split('@')[0]})</span>`;
    loginBtn.style.backgroundColor = '#f44336';
    dashboard.style.display = 'block';
    sidebar.style.display = 'block';
    
    // Kích hoạt các chức năng sau khi đăng nhập
    if (window.initCMS) window.initCMS();
  } else {
    console.log('Chưa đăng nhập');
    loginBtn.innerHTML = `<i class="fas fa-sign-in-alt"></i> <span>Đăng nhập</span>`;
    loginBtn.style.backgroundColor = '#4cc9f0';
    dashboard.style.display = 'none';
    sidebar.style.display = 'none';
  }
}

// Export các hàm cần thiết
window.initAuth = initAuth;
window.getCurrentUser = () => currentUser;
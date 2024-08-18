document.addEventListener('DOMContentLoaded', () => {
  const netlifyIdentity = window.netlifyIdentity;

  // Khởi tạo Netlify Identity
  netlifyIdentity.init();

  // Xử lý đăng nhập admin
  document.getElementById('admin-login-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = document.getElementById('admin-email').value;
    const password = document.getElementById('admin-password').value;

    try {
      // Sử dụng API Netlify Identity để xác thực
      await netlifyIdentity.signIn({ email, password });
      window.location.href = '/admin-dashboard'; // Điều hướng đến trang quản trị admin
    } catch (error) {
      console.error('Lỗi đăng nhập admin:', error);
    }
  });

  // Xử lý đăng nhập Google
  document.getElementById('google-login-button').addEventListener('click', () => {
    netlifyIdentity.open('login');
  });
});
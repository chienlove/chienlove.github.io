ddocument.addEventListener('DOMContentLoaded', () => {
  const netlifyIdentity = window.netlifyIdentity;

  // Khởi tạo Netlify Identity
  netlifyIdentity.init();

  // Ẩn widget đăng nhập mặc định
  document.addEventListener('DOMContentLoaded', () => {
    const identityWidget = document.querySelector('.netlify-identity-widget');
    if (identityWidget) {
      identityWidget.style.display = 'none';
    }
  });

  // Các phần còn lại của mã xử lý đăng nhập và đăng xuất
  const loginFormContainer = document.getElementById('login-form-container');
  const userInfoContainer = document.getElementById('user-info-container');
  const userAvatar = document.getElementById('avatar');
  const userName = document.getElementById('user-name');
  const userEmail = document.getElementById('user-email');
  const loginDate = document.getElementById('login-date');
  const userRole = document.getElementById('user-role');
  const logoutButton = document.getElementById('logout-button');
  const googleLoginButton = document.getElementById('google-login-button');

  function showUserInfo(user) {
    loginFormContainer.style.display = 'none';
    userInfoContainer.style.display = 'flex';

    const userMetadata = user.user_metadata || {};
    userAvatar.src = user.user_metadata.avatar_url || 'default-avatar.png';
    userName.textContent = user.user_metadata.full_name || 'Chưa có tên';
    userEmail.textContent = user.email;
    loginDate.textContent = new Date(user.updated_at).toLocaleDateString();
    userRole.textContent = user.user_metadata.role || 'Thành viên';
  }

  document.getElementById('admin-login-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = document.getElementById('admin-email').value;
    const password = document.getElementById('admin-password').value;

    try {
      const user = await netlifyIdentity.signIn({ email, password });
      showUserInfo(user);
    } catch (error) {
      console.error('Lỗi đăng nhập admin:', error);
    }
  });

  googleLoginButton.addEventListener('click', () => {
    netlifyIdentity.open('login');
  });

  logoutButton.addEventListener('click', () => {
    netlifyIdentity.logout();
    loginFormContainer.style.display = 'flex';
    userInfoContainer.style.display = 'none';
  });

  if (netlifyIdentity.currentUser()) {
    showUserInfo(netlifyIdentity.currentUser());
  }

  netlifyIdentity.on('login', showUserInfo);
  netlifyIdentity.on('logout', () => {
    loginFormContainer.style.display = 'flex';
    userInfoContainer.style.display = 'none';
  });
});
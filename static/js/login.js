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
      const user = await netlifyIdentity.signIn({ email, password });
      showUserInfo(user);
    } catch (error) {
      console.error('Lỗi đăng nhập admin:', error);
    }
  });

  // Xử lý đăng nhập Google
  googleLoginButton.addEventListener('click', () => {
    netlifyIdentity.open('login');
  });

  // Xử lý đăng xuất
  logoutButton.addEventListener('click', () => {
    netlifyIdentity.logout();
    loginFormContainer.style.display = 'flex';
    userInfoContainer.style.display = 'none';
  });

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

  if (netlifyIdentity.currentUser()) {
    showUserInfo(netlifyIdentity.currentUser());
  }

  netlifyIdentity.on('login', showUserInfo);
  netlifyIdentity.on('logout', () => {
    loginFormContainer.style.display = 'flex';
    userInfoContainer.style.display = 'none';
  });
});
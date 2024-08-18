// Xử lý đăng nhập và hiển thị thông tin người dùng
if (window.netlifyIdentity) {
    window.netlifyIdentity.on("init", user => {
        if (!user) {
            showLoginButton();
        } else {
            showUserInfo(user);
        }
    });

    window.netlifyIdentity.on("login", user => {
        showUserInfo(user);
    });

    window.netlifyIdentity.on("logout", () => {
        showLoginButton();
    });
}

function showLoginButton() {
    document.getElementById('login-button').style.display = 'block';
    document.getElementById('user-info').style.display = 'none';
    document.getElementById('mobile-login-button').style.display = 'block';
    document.getElementById('mobile-user-info').style.display = 'none';
}

function showUserInfo(user) {
    document.getElementById('login-button').style.display = 'none';
    document.getElementById('user-info').style.display = 'block';
    document.getElementById('user-name').textContent = user.user_metadata.full_name;
    document.getElementById('mobile-login-button').style.display = 'none';
    document.getElementById('mobile-user-info').style.display = 'block';
    document.getElementById('mobile-user-name').textContent = user.user_metadata.full_name;

    if (user.app_metadata && user.app_metadata.roles && user.app_metadata.roles.includes('admin')) {
        showAdminPanel();
    }
}

function showAdminPanel() {
    const adminPanel = `
        <div class="admin-panel">
            <h2>Admin Panel</h2>
            <div class="admin-menu">
                <a href="/admin/#/collections/posts">Quản lý bài viết</a>
                <a href="/admin/#/collections/pages">Quản lý trang</a>
                <a href="/admin/#/collections/settings">Cài đặt</a>
            </div>
        </div>
    `;

    const mainContainer = document.querySelector('main.container');
    mainContainer.insertAdjacentHTML('afterbegin', adminPanel);
}

function loginWithGoogle() {
    window.netlifyIdentity.open();
}

function logout() {
    window.netlifyIdentity.logout();
}

// Xử lý menu hamburger
document.querySelector('.hamburger-menu').addEventListener('click', function() {
    document.querySelector('.mobile-nav').classList.toggle('active');
});
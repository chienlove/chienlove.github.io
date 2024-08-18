// Khởi tạo Netlify Identity
if (window.netlifyIdentity) {
    window.netlifyIdentity.on("init", user => {
        if (!user) {
            showLoginButtons();
        } else {
            if (isAdmin(user)) {
                showAdminInfo(user);
            } else {
                showUserInfo(user);
            }
        }
    });

    window.netlifyIdentity.on("login", user => {
        if (isAdmin(user)) {
            showAdminInfo(user);
        } else {
            showUserInfo(user);
        }
    });

    window.netlifyIdentity.on("logout", () => {
        showLoginButtons();
    });
}

function showLoginButtons() {
    document.getElementById('google-login').style.display = 'block';
    document.getElementById('admin-login').style.display = 'block';
    document.getElementById('user-info').style.display = 'none';
    document.getElementById('mobile-google-login').style.display = 'block';
    document.getElementById('mobile-admin-login').style.display = 'block';
    document.getElementById('mobile-user-info').style.display = 'none';
    removeAdminPanel();
}

function showUserInfo(user) {
    document.getElementById('google-login').style.display = 'none';
    document.getElementById('admin-login').style.display = 'none';
    document.getElementById('user-info').style.display = 'block';
    document.getElementById('user-name').textContent = user.user_metadata.full_name;
    document.getElementById('mobile-google-login').style.display = 'none';
    document.getElementById('mobile-admin-login').style.display = 'none';
    document.getElementById('mobile-user-info').style.display = 'block';
    document.getElementById('mobile-user-name').textContent = user.user_metadata.full_name;
}

function showAdminInfo(user) {
    document.getElementById('google-login').style.display = 'none';
    document.getElementById('admin-login').style.display = 'none';
    document.getElementById('user-info').style.display = 'block';
    document.getElementById('user-name').textContent = `Admin: ${user.user_metadata.full_name}`;
    document.getElementById('mobile-google-login').style.display = 'none';
    document.getElementById('mobile-admin-login').style.display = 'none';
    document.getElementById('mobile-user-info').style.display = 'block';
    document.getElementById('mobile-user-name').textContent = `Admin: ${user.user_metadata.full_name}`;
    showAdminPanel();
}

function isAdmin(user) {
    return user.app_metadata && user.app_metadata.roles && user.app_metadata.roles.includes('admin');
}

function loginWithGoogle() {
    window.netlifyIdentity.open('google');
}

function loginAsAdmin() {
    window.netlifyIdentity.open();
}

function logout() {
    window.netlifyIdentity.logout();
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

function removeAdminPanel() {
    const adminPanel = document.querySelector('.admin-panel');
    if (adminPanel) {
        adminPanel.remove();
    }
}

// Xử lý menu hamburger
document.querySelector('.hamburger-menu').addEventListener('click', function() {
    document.querySelector('.mobile-nav').classList.toggle('active');
});
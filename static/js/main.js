document.addEventListener('DOMContentLoaded', function() {
    const hamburger = document.querySelector('.hamburger-menu');
    const mobileNav = document.querySelector('.mobile-nav');

    hamburger.addEventListener('click', function() {
        mobileNav.style.display = mobileNav.style.display === 'block' ? 'none' : 'block';
    });
});

function loginWithGoogle() {
    // Xử lý đăng nhập Google
}

function loginAsAdmin() {
    // Xử lý đăng nhập Admin
}

function logout() {
    // Xử lý đăng xuất
}
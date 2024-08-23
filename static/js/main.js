document.addEventListener('DOMContentLoaded', function () {
    const hamburgerMenu = document.querySelector('.hamburger-menu');
    const mobileNav = document.querySelector('.mobile-nav');
    const sidebarOverlay = document.querySelector('.sidebar-overlay');

    hamburgerMenu.addEventListener('click', function () {
        mobileNav.classList.toggle('active');
        sidebarOverlay.classList.toggle('active');
    });

    sidebarOverlay.addEventListener('click', function () {
        mobileNav.classList.remove('active');
        sidebarOverlay.classList.remove('active');
    });
});
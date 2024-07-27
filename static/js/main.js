// main.js
document.addEventListener('DOMContentLoaded', function() {
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const mainNav = document.getElementById('main-nav');
    const searchToggle = document.getElementById('search-toggle');
    const searchBar = document.getElementById('search-bar');

    mobileMenuToggle.addEventListener('click', function() {
        mainNav.classList.toggle('active');
    });

    searchToggle.addEventListener('click', function() {
        searchBar.classList.toggle('active');
    });
});
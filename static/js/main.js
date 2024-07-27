// main.js
document.addEventListener('DOMContentLoaded', function() {
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const searchToggle = document.querySelector('.search-toggle');
    const mainNav = document.querySelector('.main-nav');
    const searchBar = document.querySelector('.search-bar');

    mobileMenuToggle.addEventListener('click', function() {
        mainNav.classList.toggle('active');
    });

    searchToggle.addEventListener('click', function() {
        searchBar.classList.toggle('active');
    });
});
document.querySelector('.hamburger-menu').addEventListener('click', function () {
    document.querySelector('.mobile-nav').classList.toggle('active');
    document.querySelector('.sidebar-overlay').classList.toggle('active');
});

document.querySelector('.sidebar-overlay').addEventListener('click', function () {
    document.querySelector('.mobile-nav').classList.remove('active');
    document.querySelector('.sidebar-overlay').classList.remove('active');
});
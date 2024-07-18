document.addEventListener("DOMContentLoaded", function() {
    const mobileMenuToggle = document.getElementById("mobile-menu-toggle");
    const mainNav = document.getElementById("main-nav");
    const searchToggle = document.getElementById("search-toggle");
    const searchBar = document.getElementById("search-bar");

    mobileMenuToggle.addEventListener("click", function() {
        if (mainNav.style.display === "flex") {
            mainNav.style.display = "none";
        } else {
            mainNav.style.display = "flex";
            searchBar.style.display = "none"; // Hide search bar if visible
        }
    });

    searchToggle.addEventListener("click", function() {
        if (searchBar.style.display === "block") {
            searchBar.style.display = "none";
        } else {
            searchBar.style.display = "block";
            mainNav.style.display = "none"; // Hide nav if visible
        }
    });
});
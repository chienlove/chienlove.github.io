// Biến toàn cục
let searchIndex;
let appData = {};

// Hàm tải dữ liệu ứng dụng
async function loadAppData() {
    try {
        const response = await fetch('/list.json');
        if (!response.ok) throw new Error('Network response was not ok');
        
        const data = await response.json();
        appData = data.reduce((acc, app) => {
            acc[app.url] = app;
            return acc;
        }, {});
        
        // Khởi tạo Lunr search index
        searchIndex = lunr(function() {
            this.ref('url');
            this.field('title', { boost: 10 });
            this.field('description', { boost: 5 });
            this.field('content', { boost: 3 });
            this.field('category', { boost: 2 });
            
            data.forEach(app => {
                this.add(app);
            });
        });
        
        console.log('Search index ready');
        
        // Tự động tìm kiếm nếu có query trong URL
        const urlParams = new URLSearchParams(window.location.search);
        const searchQuery = urlParams.get('q');
        if (searchQuery && document.getElementById('search-input')) {
            document.getElementById('search-input').value = searchQuery;
            performSearch(searchQuery);
        }
    } catch (error) {
        console.error('Error loading search data:', error);
    }
}

// Hàm xử lý submit form
function handleSearchSubmit(event) {
    event.preventDefault();
    const query = document.getElementById('search-input').value.trim();
    
    if (query.length > 0) {
        // Lưu query vào localStorage để đồng bộ giữa các trang
        localStorage.setItem('searchQuery', query);
        
        // Chuyển đến trang search.html với query
        window.location.href = `/search?q=${encodeURIComponent(query)}`;
    }
}

// Hàm thực hiện tìm kiếm
function performSearch(query) {
    const searchResults = document.getElementById('header-search-results');
    if (!searchResults) return;
    
    if (!searchIndex || query.length < 2) {
        if (searchResults) searchResults.style.display = 'none';
        return;
    }
    
    try {
        const results = searchIndex.search(query);
        displaySearchResults(results);
    } catch (error) {
        console.error('Search error:', error);
        if (searchResults) searchResults.style.display = 'none';
    }
}

// Hàm hiển thị kết quả
function displaySearchResults(results) {
    const searchResults = document.getElementById('header-search-results');
    if (!searchResults) return;
    
    if (!results || results.length === 0) {
        searchResults.innerHTML = '<div class="search-result-item">Không tìm thấy kết quả</div>';
        searchResults.style.display = 'block';
        return;
    }
    
    let html = '';
    results.slice(0, 5).forEach(result => {
        const app = appData[result.ref];
        if (!app) return;
        
        html += `
            <a href="${app.url}" class="search-result-item">
                <img src="${app.icon || '/images/default-icon.png'}" alt="${app.title}" loading="lazy">
                <div class="result-info">
                    <h4>${app.title}</h4>
                    <p>${app.description || ''}</p>
                </div>
            </a>
        `;
    });
    
    searchResults.innerHTML = html;
    searchResults.style.display = 'block';
}

// Hàm debounce
function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

// Khởi tạo khi DOM ready
document.addEventListener('DOMContentLoaded', function() {
    // Tải dữ liệu
    loadAppData();
    
    // Gắn sự kiện input với debounce (nếu có ô tìm kiếm trên trang)
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(function() {
            performSearch(this.value.trim());
        }, 300));
        
        // Khôi phục query từ localStorage (nếu có)
        const savedQuery = localStorage.getItem('searchQuery');
        if (savedQuery) {
            searchInput.value = savedQuery;
            performSearch(savedQuery);
        }
    }
    
    // Đóng dropdown khi click ra ngoài (nếu có dropdown)
    document.addEventListener('click', function(e) {
        const searchBar = document.querySelector('.search-bar');
        const searchResults = document.getElementById('header-search-results');
        if (searchBar && searchResults && !searchBar.contains(e.target)) {
            searchResults.style.display = 'none';
        }
    });
});
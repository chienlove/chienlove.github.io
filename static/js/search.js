// Hàm xử lý khi submit form search
function handleSearchSubmit(event) {
    event.preventDefault(); // Ngăn chặn form submit mặc định
    const query = document.getElementById('search-input').value.trim();
    
    if (query.length > 0) {
        // Hiển thị kết quả ngay lập tức
        performSearch(query);
        
        // Nếu muốn chuyển đến trang search khi nhấn Enter (tùy chọn)
        // window.location.href = `/search?q=${encodeURIComponent(query)}`;
    }
}

// Hàm thực hiện tìm kiếm và hiển thị kết quả
function performSearch(query) {
    if (!searchIndex || query.length < 2) {
        document.getElementById('header-search-results').style.display = 'none';
        return;
    }
    
    try {
        const results = searchIndex.search(query);
        displaySearchResults(results);
    } catch (error) {
        console.error('Search error:', error);
        document.getElementById('header-search-results').style.display = 'none';
    }
}

// Hàm hiển thị kết quả trong dropdown
function displaySearchResults(results) {
    const searchResults = document.getElementById('header-search-results');
    
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

// Thêm sự kiện click ra ngoài để đóng dropdown
document.addEventListener('click', function(e) {
    const searchBar = document.querySelector('.search-bar');
    if (!searchBar.contains(e.target)) {
        document.getElementById('header-search-results').style.display = 'none';
    }
});

// Thêm sự kiện input với debounce
document.getElementById('search-input').addEventListener('input', debounce(function() {
    performSearch(this.value.trim());
}, 300));
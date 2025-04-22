// Khởi tạo biến toàn cục
let searchIndex = null;
let appData = {};

// Hàm tải dữ liệu JSON
async function loadAppData() {
    try {
        const response = await fetch('/index.json');
        if (!response.ok) throw new Error('Failed to load data');
        const data = await response.json();
        
        // Lưu dữ liệu ứng dụng
        appData = {};
        data.forEach(app => {
            appData[app.url] = app;
            
            // Tạo biến tokenized để hỗ trợ tìm kiếm cho các từ có số hoặc ký tự đặc biệt
            if (app.title) {
                app.title_tokens = app.title.toLowerCase().replace(/[0-9]/g, ' $& ');
            }
        });
        
        // Xây dựng search index
        searchIndex = lunr(function() {
            this.ref('url');
            this.field('title', { boost: 10 });
            this.field('title_tokens', { boost: 12 }); // Trường đặc biệt cho tokenized title
            this.field('description', { boost: 5 });
            this.field('content', { boost: 3 });
            this.field('category', { boost: 2 });
            
            // Thiết lập pipeline cho việc tìm kiếm
            this.pipeline.remove(lunr.stemmer);
            this.searchPipeline.remove(lunr.stemmer);
            
            // Điều chỉnh để tối ưu hóa cho từ khóa ngắn
            this.k1(1.2);  // Tham số cho BM25 scoring
            this.b(0.75);  // Tham số cho document length normalization
            
            data.forEach(app => {
                this.add(app);
            });
        });
        
        console.log('Search index ready');
        initSearch();
    } catch (error) {
        console.error('Error loading search data:', error);
        showError('Không thể tải dữ liệu tìm kiếm');
    }
}

// Hàm khởi tạo tìm kiếm
function initSearch() {
    const searchInput = document.getElementById('search-input');
    const searchForm = document.getElementById('search-form');
    
    if (searchInput && searchForm) {
        // Xử lý sự kiện input
        searchInput.addEventListener('input', debounce(function() {
            performSearch(this.value.trim());
        }, 300));
        
        // Xử lý submit form
        searchForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const query = searchInput.value.trim();
            if (query) {
                window.location.href = `/search?q=${encodeURIComponent(query)}`;
            }
        });
        
        // Khôi phục query từ URL (nếu có)
        const urlParams = new URLSearchParams(window.location.search);
        const query = urlParams.get('q');
        if (query) {
            searchInput.value = query;
            performSearch(query);
        }
    }
}

// Hàm thực hiện tìm kiếm - phiên bản tối ưu
function performSearch(query) {
    // Thay đổi từ 2 ký tự thành 3 ký tự
    if (!searchIndex || query.length < 3) {
        hideResults();
        return;
    }
    
    try {
        // Tạo các query tối ưu hóa cho từng cách tìm kiếm khác nhau
        const exactQuery = query;
        const wildcardQuery = query + '*';
        const fuzzyQuery = query + '~1';
        
        // Thử tìm kiếm chính xác trước
        let results = searchIndex.search(exactQuery);
        
        // Nếu không có kết quả, thử wildcard search
        if (results.length === 0) {
            results = searchIndex.search(wildcardQuery);
        }
        
        // Nếu vẫn không có kết quả, thử fuzzy search
        if (results.length === 0) {
            results = searchIndex.search(fuzzyQuery);
        }
        
        displayResults(results, query);
    } catch (error) {
        console.error('Search error:', error);
        showError('Lỗi khi tìm kiếm');
    }
}

// Hàm hiển thị kết quả
function displayResults(results, query) {
    const container = document.getElementById('header-search-results') || 
                     document.getElementById('search-results');
    if (!container) return;
    
    if (!results || results.length === 0) {
        container.innerHTML = `
            <div class="no-results">
                <i class="far fa-frown"></i>
                <p>Không tìm thấy kết quả cho "${query}"</p>
            </div>
        `;
        container.style.display = 'block';
        return;
    }
    
    let html = '';
    results.slice(0, container.id === 'header-search-results' ? 5 : 20).forEach(result => {
        const app = appData[result.ref];
        if (!app) return;
        
        const cardClass = container.id === 'header-search-results' ? 'search-result-item' : 'app-card';
        
        html += `
            <div class="${cardClass}" onclick="window.location.href='${app.url}'">
                <img src="${app.icon || '/images/default-icon.png'}" alt="${app.title}" loading="lazy">
                <div class="info">
                    <h4>${highlightQuery(app.title, query)}</h4>
                    <p>${highlightQuery(app.description || 'Không có mô tả', query)}</p>
                    ${cardClass === 'app-card' ? `<span class="category">${app.category || 'Ứng dụng'}</span>` : ''}
                </div>
            </div>
        `;
    });
    
    if (container.id === 'search-results') {
        html = `
            <div class="results-count">Tìm thấy ${results.length} kết quả cho "${query}"</div>
            <div class="app-grid">${html}</div>
        `;
    }
    
    container.innerHTML = html;
    container.style.display = 'block';
}

// Hàm highlight query trong kết quả tìm kiếm
function highlightQuery(text, query) {
    if (!text || !query || query.length < 3) return text;
    
    try {
        // Escape regex special characters
        const escapedQuery = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(`(${escapedQuery})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    } catch (e) {
        return text;
    }
}

// Hàm ẩn kết quả
function hideResults() {
    const container = document.getElementById('header-search-results');
    if (container) container.style.display = 'none';
}

// Hàm hiển thị lỗi
function showError(message) {
    const container = document.getElementById('search-results');
    if (container) {
        container.innerHTML = `
            <div class="error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>${message}</p>
            </div>
        `;
    }
}

// Hàm debounce
function debounce(func, delay) {
    let timeout;
    return function() {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, arguments), delay);
    };
}

// Bắt đầu khi DOM sẵn sàng
document.addEventListener('DOMContentLoaded', () => {
    loadAppData();
    
    // Đóng dropdown khi click ra ngoài
    document.addEventListener('click', (e) => {
        const searchBar = document.querySelector('.search-bar');
        const results = document.getElementById('header-search-results');
        if (searchBar && results && !searchBar.contains(e.target)) {
            results.style.display = 'none';
        }
    });
});
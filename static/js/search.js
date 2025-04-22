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
        });
        
        // Xây dựng search index với cấu hình tối ưu
        searchIndex = lunr(function() {
            this.ref('url');
            this.field('title', { boost: 10 });
            this.field('description', { boost: 5 });
            this.field('content', { boost: 3 });
            this.field('category', { boost: 2 });
            
            // Tùy chỉnh tokenizer để xử lý tốt các từ có số
            this.tokenizer = function (str) {
                return str.split(/[\s\-\.]+/).filter(function (token) {
                    return token.length > 0;
                });
            };
            
            // Tùy chỉnh pipeline
            this.pipeline.reset();
            this.pipeline.add(
                lunr.trimmer,
                function (token) {
                    // Giữ lại tất cả token (kể cả các token có số)
                    return token.toString().toLowerCase();
                }
            );
            
            // Thêm dữ liệu vào index
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

// Hàm thực hiện tìm kiếm
function performSearch(query) {
    if (!searchIndex || query.length < 2) {
        hideResults();
        return;
    }
    
    try {
        // Thực hiện tìm kiếm với wildcard và không phân biệt hoa thường
        const results = searchIndex.query(function(q) {
            // Tìm kiếm chính xác hơn với các từ có số trong title
            q.term(query.toLowerCase(), { 
                wildcard: lunr.Query.wildcard.TRAILING,
                fields: ['title'],
                boost: 100,
                usePipeline: false
            });
            
            // Tìm kiếm mở rộng cho các trường khác
            q.term(query.toLowerCase(), { 
                wildcard: lunr.Query.wildcard.TRAILING,
                fields: ['description', 'content', 'category'],
                boost: 10,
                usePipeline: false
            });
        });
        
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
        const highlightedTitle = highlightText(app.title, query);
        const highlightedDesc = highlightText(app.description || 'Không có mô tả', query);
        
        html += `
            <div class="${cardClass}" onclick="window.location.href='${app.url}'">
                <img src="${app.icon || '/images/default-icon.png'}" alt="${app.title}" loading="lazy">
                <div class="info">
                    <h4>${highlightedTitle}</h4>
                    <p>${highlightedDesc}</p>
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

// Hàm highlight từ khóa trong văn bản
function highlightText(text, query) {
    if (!text || !query) return text;
    
    try {
        const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
        return text.replace(regex, '<span class="highlight">$1</span>');
    } catch (e) {
        return text;
    }
}

// Hàm escape ký tự đặc biệt cho regex
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
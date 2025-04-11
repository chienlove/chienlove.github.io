// Biến toàn cục
let searchIndex;
let appData = {};

// Hàm tải dữ liệu ứng dụng
async function loadAppData() {
    try {
        const response = await fetch('/index.json');
        if (!response.ok) throw new Error('Không thể tải dữ liệu');
        
        const data = await response.json();
        appData = data.reduce((acc, app) => {
            acc[app.url] = app;
            return acc;
        }, {});
        
        // Khởi tạo Lunr search index với cấu hình tìm kiếm mờ
        searchIndex = lunr(function() {
            this.ref('url');
            this.field('title', { 
                boost: 10,
                extractor: (doc) => {
                    // Thêm cả title không dấu để tìm kiếm tốt hơn
                    return doc.title + ' ' + removeAccents(doc.title);
                }
            });
            this.field('description', { boost: 5 });
            this.field('content', { boost: 3 });
            this.field('category', { boost: 2 });
            
            data.forEach(app => {
                this.add(app);
            });
        });
        
        console.log('Search index ready');
        initSearch();
    } catch (error) {
        console.error('Lỗi khi tải dữ liệu:', error);
        showError('Không thể tải dữ liệu tìm kiếm');
    }
}

// Hàm bỏ dấu tiếng Việt
function removeAccents(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Hàm khởi tạo tìm kiếm
function initSearch() {
    const searchInput = document.getElementById('search-input');
    if (!searchInput) return;
    
    // Tự động focus vào ô tìm kiếm trên trang search
    if (window.location.pathname === '/search') {
        searchInput.focus();
    }
    
    // Khôi phục query từ URL nếu có
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q');
    if (query) {
        searchInput.value = query;
        performSearch(query);
    }
}

// Hàm thực hiện tìm kiếm
function performSearch(query) {
    const searchResults = document.getElementById('header-search-results') || 
                         document.getElementById('search-results');
    if (!searchResults) return;
    
    query = query.trim().toLowerCase();
    
    // Chỉ tìm kiếm khi có ít nhất 2 ký tự
    if (!searchIndex || query.length < 2) {
        searchResults.style.display = 'none';
        return;
    }
    
    try {
        // Tìm kiếm với Lunr
        let results = searchIndex.search(query);
        
        // Nếu không có kết quả, thử tìm kiếm không dấu
        if (results.length === 0) {
            const queryWithoutAccents = removeAccents(query);
            if (queryWithoutAccents !== query) {
                results = searchIndex.search(queryWithoutAccents);
            }
        }
        
        displaySearchResults(results, query);
    } catch (error) {
        console.error('Lỗi tìm kiếm:', error);
        searchResults.style.display = 'none';
    }
}

// Hàm hiển thị kết quả
function displaySearchResults(results, query) {
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
    const maxResults = container.id === 'header-search-results' ? 5 : 20;
    
    results.slice(0, maxResults).forEach(result => {
        const app = appData[result.ref];
        if (!app) return;
        
        // Highlight từ khóa tìm kiếm trong kết quả
        const highlightedTitle = highlightMatches(app.title, query);
        const highlightedDesc = highlightMatches(app.description || '', query);
        
        const isHeaderResults = container.id === 'header-search-results';
        const itemClass = isHeaderResults ? 'search-result-item' : 'app-card';
        
        html += `
            <div class="${itemClass}" onclick="window.location.href='${app.url}'">
                <img src="${app.icon || '/images/default-icon.png'}" 
                     alt="${app.title}" 
                     loading="lazy"
                     onerror="this.src='/images/default-icon.png'">
                <div class="info">
                    <h4>${highlightedTitle}</h4>
                    <p>${highlightedDesc}</p>
                    ${!isHeaderResults ? `<span class="category">${app.category || 'Ứng dụng'}</span>` : ''}
                </div>
            </div>
        `;
    });
    
    if (!isHeaderResults) {
        html = `
            <div class="results-count">Tìm thấy ${results.length} kết quả cho "${query}"</div>
            <div class="app-grid">${html}</div>
        `;
    }
    
    container.innerHTML = html;
    container.style.display = 'block';
}

// Hàm highlight từ khóa tìm kiếm
function highlightMatches(text, query) {
    if (!text || !query) return text || '';
    
    const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
    return text.replace(regex, '<span class="highlight">$1</span>');
}

// Hàm escape ký tự đặc biệt cho regex
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Hàm debounce
const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
};

// Khởi tạo khi DOM ready
document.addEventListener('DOMContentLoaded', () => {
    loadAppData();
    
    // Gắn sự kiện input với debounce 300ms
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', debounce((e) => {
            performSearch(e.target.value);
        }, 300));
    }
    
    // Đóng dropdown khi click ra ngoài
    document.addEventListener('click', (e) => {
        const searchBar = document.querySelector('.search-bar');
        const results = document.getElementById('header-search-results');
        if (searchBar && results && !searchBar.contains(e.target)) {
            results.style.display = 'none';
        }
    });
    
    // Xử lý submit form
    const searchForm = document.getElementById('search-form');
    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const query = searchInput?.value.trim();
            if (query) {
                window.location.href = `/search?q=${encodeURIComponent(query)}`;
            }
        });
    }
});
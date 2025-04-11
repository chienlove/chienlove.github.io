// Global variables
let searchIndex = null;
let appData = {};
let isSearchPage = window.location.pathname.includes('/search');

// Load app data and initialize search
async function initSearch() {
    try {
        // Load data from index.json
        const response = await fetch('/index.json');
        if (!response.ok) throw new Error('Failed to load search data');
        
        const data = await response.json();
        
        // Store app data
        appData = data.reduce((acc, app) => {
            acc[app.url] = app;
            return acc;
        }, {});
        
        // Initialize Lunr search index with better configuration
        searchIndex = lunr(function() {
            this.ref('url');
            this.field('title', { 
                boost: 15,
                extractor: (doc) => {
                    // Search with both original and normalized text
                    return `${doc.title} ${doc.title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}`;
                }
            });
            this.field('description', { boost: 5 });
            this.field('content', { boost: 3 });
            this.field('category', { boost: 2 });
            
            // Add documents to index
            data.forEach(app => {
                this.add(app);
            });
        });

        console.log('Search initialized successfully');
        
        // Initialize search functionality
        setupSearch();
        
        // If on search page with query, perform search immediately
        if (isSearchPage) {
            const query = new URLSearchParams(window.location.search).get('q');
            if (query && query.length > 0) {
                document.getElementById('search-input').value = query;
                performSearch(query, true);
            }
        }
    } catch (error) {
        console.error('Search initialization failed:', error);
        showError('Không thể khởi tạo tìm kiếm');
    }
}

// Setup search event listeners
function setupSearch() {
    const searchInput = document.getElementById('search-input');
    const searchForm = document.getElementById('search-form');
    
    if (!searchInput || !searchForm) return;
    
    // Input event with debounce
    searchInput.addEventListener('input', debounce((e) => {
        const query = e.target.value.trim();
        if (query.length > 0) {
            performSearch(query, false);
        } else {
            clearResults();
        }
    }, 250));
    
    // Form submission
    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const query = searchInput.value.trim();
        if (query.length > 0) {
            if (!isSearchPage) {
                window.location.href = `/search?q=${encodeURIComponent(query)}`;
            } else {
                performSearch(query, true);
                window.history.pushState({}, '', `/search?q=${encodeURIComponent(query)}`);
            }
        }
    });
    
    // Focus search input on search page
    if (isSearchPage) {
        searchInput.focus();
    }
}

// Perform search
function performSearch(query, isFullPageSearch = false) {
    if (!searchIndex || query.length < 1) {
        if (isFullPageSearch) {
            showNoResults(query);
        } else {
            clearResults();
        }
        return;
    }
    
    try {
        // First try: Exact match with wildcard
        let results = searchIndex.query(q => {
            q.term(query, { 
                boost: 100,
                wildcard: lunr.Query.wildcard.TRAILING
            });
            
            // Second try: Fuzzy match
            q.term(query, { 
                boost: 10,
                editDistance: 1
            });
            
            // Third try: Individual terms
            query.split(' ').forEach(term => {
                if (term.length > 1) {
                    q.term(term, { boost: 5 });
                }
            });
        });
        
        // Filter and sort results
        results = results
            .filter(result => result.score > 0.1)
            .sort((a, b) => b.score - a.score)
            .map(result => {
                return {
                    ...result,
                    item: appData[result.ref]
                };
            });
        
        if (results.length > 0) {
            displayResults(results, query, isFullPageSearch);
        } else {
            showNoResults(query);
        }
    } catch (error) {
        console.error('Search failed:', error);
        showError('Lỗi tìm kiếm');
    }
}

// Display search results
function displayResults(results, query, isFullPage = false) {
    const container = isFullPage 
        ? document.getElementById('search-results')
        : document.getElementById('header-search-results');
    
    if (!container) return;
    
    // Highlight matches in text
    const highlight = (text) => {
        if (!text || !query) return text || '';
        const regex = new RegExp(`(${query.split(' ').filter(t => t.length > 1).join('|')})`, 'gi');
        return text.replace(regex, '<span class="highlight">$1</span>');
    };
    
    // Generate results HTML
    let html = '';
    const displayResults = isFullPage ? results : results.slice(0, 5);
    
    displayResults.forEach(result => {
        const app = result.item;
        html += `
            <div class="${isFullPage ? 'app-card' : 'search-result-item'}" 
                 onclick="window.location.href='${app.url}'">
                <img src="${app.icon || '/images/default-icon.png'}" 
                     alt="${app.title}" 
                     loading="lazy"
                     onerror="this.src='/images/default-icon.png'">
                <div class="info">
                    <h4>${highlight(app.title)}</h4>
                    <p>${highlight(app.description || '')}</p>
                    ${isFullPage ? `<span class="category">${app.category || 'App'}</span>` : ''}
                </div>
            </div>
        `;
    });
    
    // Add header for full page results
    if (isFullPage) {
        html = `
            <div class="results-header">
                <h3>Tìm thấy ${results.length} kết quả cho "${query}"</h3>
            </div>
            <div class="results-grid">${html}</div>
        `;
    }
    
    container.innerHTML = html;
    container.style.display = 'block';
}

// Show no results message
function showNoResults(query) {
    const container = isSearchPage 
        ? document.getElementById('search-results')
        : document.getElementById('header-search-results');
    
    if (!container) return;
    
    container.innerHTML = `
        <div class="no-results">
            <i class="far fa-frown"></i>
            <p>Không tìm thấy kết quả cho "${query}"</p>
        </div>
    `;
    container.style.display = 'block';
}

// Show error message
function showError(message) {
    const container = isSearchPage 
        ? document.getElementById('search-results')
        : document.getElementById('header-search-results');
    
    if (!container) return;
    
    container.innerHTML = `
        <div class="error-message">
            <i class="fas fa-exclamation-triangle"></i>
            <p>${message}</p>
        </div>
    `;
    container.style.display = 'block';
}

// Clear results
function clearResults() {
    const container = isSearchPage 
        ? document.getElementById('search-results')
        : document.getElementById('header-search-results');
    
    if (container) {
        container.style.display = 'none';
    }
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initSearch);
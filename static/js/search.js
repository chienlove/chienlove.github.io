// search.js - Complete Site Search
document.addEventListener('DOMContentLoaded', function() {
    // Global variables
    let searchIndex;
    let pageData = {};
    const MIN_QUERY_LENGTH = 2;
    const isSearchPage = window.location.pathname.includes('/search');

    // Initialize search
    async function initSearch() {
        try {
            // Load all site data
            const response = await fetch('/index.json');
            if (!response.ok) throw new Error('Failed to load search data');
            
            const allPages = await response.json();
            
            // Store all pages data
            pageData = {};
            allPages.forEach(page => {
                pageData[page.url] = page;
            });

            // Build search index for all content
            searchIndex = lunr(function() {
                this.ref('url');
                this.field('title', { boost: 10 });
                this.field('content', { boost: 5 });
                this.field('description', { boost: 3 });
                this.field('tags', { boost: 2 });
                
                allPages.forEach(page => this.add(page));
            });

            setupSearchUI();
            autoSearchIfQueryExists();
            
        } catch (error) {
            console.error('Search init error:', error);
            showError('Khởi tạo tìm kiếm thất bại');
        }
    }

    // Setup search UI events
    function setupSearchUI() {
        const searchInput = document.getElementById('search-input');
        const searchForm = document.getElementById('search-form');
        
        if (!searchInput || !searchForm) return;

        // Input with debounce
        searchInput.addEventListener('input', debounce(function(e) {
            const query = e.target.value.trim();
            if (query.length >= MIN_QUERY_LENGTH) {
                performSearch(query);
            } else {
                clearResults();
            }
        }, 300));

        // Form submission
        searchForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const query = searchInput.value.trim();
            if (query) {
                if (isSearchPage) {
                    updateSearchURL(query);
                } else {
                    window.location.href = `/search?q=${encodeURIComponent(query)}`;
                }
            }
        });

        // Focus on search page
        if (isSearchPage) searchInput.focus();
    }

    // Perform search across all content
    function performSearch(query) {
        if (!searchIndex) return;

        try {
            const results = searchIndex.search(query)
                .map(result => ({
                    ...result,
                    page: pageData[result.ref]
                }))
                .sort((a, b) => b.score - a.score);

            displayResults(results, query);
        } catch (error) {
            console.error('Search error:', error);
            showError('Lỗi tìm kiếm');
        }
    }

    // Display results
    function displayResults(results, query) {
        const container = isSearchPage 
            ? document.getElementById('search-results')
            : document.getElementById('header-search-results');
        
        if (!container) return;

        if (!results.length) {
            showNoResults(container, query);
            return;
        }

        container.innerHTML = isSearchPage 
            ? createFullPageResultsHTML(results, query)
            : createDropdownResultsHTML(results, query);
        
        container.style.display = 'block';
    }

    // HTML templates
    function createDropdownResultsHTML(results, query) {
        return results.slice(0, 5).map(result => `
            <a href="${result.page.url}" class="search-result-item">
                <div class="info">
                    <h4>${highlightMatches(result.page.title || result.page.url, query)}</h4>
                    <p>${highlightMatches(result.page.description || '', query)}</p>
                </div>
            </a>
        `).join('');
    }

    function createFullPageResultsHTML(results, query) {
        return `
            <div class="results-header">
                <h2>Tìm thấy ${results.length} kết quả cho "${query}"</h2>
            </div>
            <div class="results-list">
                ${results.map(result => `
                    <div class="result-item">
                        <h3><a href="${result.page.url}">${highlightMatches(result.page.title || result.page.url, query)}</a></h3>
                        <div class="result-url">${result.page.url}</div>
                        ${result.page.description ? `<p>${highlightMatches(result.page.description, query)}</p>` : ''}
                        <div class="snippet">${getContentSnippet(result.page.content, query)}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // Helper functions
    function highlightMatches(text, query) {
        if (!text || !query) return text || '';
        return text.replace(new RegExp(`(${escapeRegExp(query)})`, 'gi'), 
            '<span class="highlight">$1</span>');
    }

    function getContentSnippet(content, query) {
        if (!content) return '';
        const text = content.replace(/<[^>]*>/g, ' '); // Remove HTML tags
        const index = text.toLowerCase().indexOf(query.toLowerCase());
        
        if (index >= 0) {
            const start = Math.max(0, index - 50);
            const end = Math.min(text.length, index + query.length + 100);
            return '...' + text.substring(start, end) + '...';
        }
        return text.substring(0, 150) + '...';
    }

    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function showNoResults(container, query) {
        container.innerHTML = `
            <div class="no-results">
                <i class="far fa-frown"></i>
                <p>Không tìm thấy kết quả cho "${query}"</p>
            </div>
        `;
        container.style.display = 'block';
    }

    function showError(message) {
        const container = isSearchPage 
            ? document.getElementById('search-results')
            : document.getElementById('header-search-results');
        
        if (container) {
            container.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>${message}</p>
                </div>
            `;
            container.style.display = 'block';
        }
    }

    function clearResults() {
        const container = isSearchPage 
            ? document.getElementById('search-results')
            : document.getElementById('header-search-results');
        
        if (container) container.style.display = 'none';
    }

    function autoSearchIfQueryExists() {
        const params = new URLSearchParams(window.location.search);
        const query = params.get('q');
        if (query && searchIndex) {
            document.getElementById('search-input').value = query;
            performSearch(query);
        }
    }

    function updateSearchURL(query) {
        window.history.pushState({}, '', `?q=${encodeURIComponent(query)}`);
        performSearch(query);
    }

    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    // Start the search system
    initSearch();
});
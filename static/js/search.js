// search.js - Complete Search Functionality
document.addEventListener('DOMContentLoaded', function() {
    // Global variables
    let searchIndex;
    let appData = {};
    const MIN_QUERY_LENGTH = 2;
    const MAX_RESULTS = 10;
    const isSearchPage = window.location.pathname.includes('/search');

    // Initialize search
    async function initSearch() {
        try {
            // Load and process data
            const response = await fetch('/index.json');
            if (!response.ok) throw new Error('Failed to load search data');
            
            const rawData = await response.json();
            
            // Filter and prepare data
            appData = {};
            const searchableItems = rawData.filter(item => 
                item.type === 'app' || item.type === 'game'
            );
            
            searchableItems.forEach(item => {
                appData[item.url] = {
                    ...item,
                    normalizedTitle: normalizeText(item.title),
                    normalizedDesc: normalizeText(item.description || '')
                };
            });

            // Build search index
            searchIndex = lunr(function() {
                this.ref('url');
                this.field('title', { 
                    boost: 15,
                    extractor: doc => `${doc.title} ${doc.normalizedTitle}`
                });
                this.field('description', { boost: 5 });
                this.field('category', { boost: 3 });
                this.field('tags', { boost: 2 });
                
                searchableItems.forEach(item => this.add(item));
            });

            setupSearchUI();
            autoSearchIfQueryExists();
            
        } catch (error) {
            console.error('Search init error:', error);
            showError('Khởi tạo tìm kiếm thất bại');
        }
    }

    // Text normalization
    function normalizeText(text) {
        return text.toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9 ]/g, ' ');
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

    // Perform search
    function performSearch(query) {
        if (!searchIndex) return;

        try {
            const normalizedQuery = normalizeText(query);
            const results = searchIndex.query(q => {
                // Exact match boost
                q.term(normalizedQuery, { 
                    boost: 100,
                    wildcard: lunr.Query.wildcard.TRAILING
                });
                
                // Fuzzy match
                if (normalizedQuery.length > 3) {
                    q.term(normalizedQuery, { 
                        boost: 50,
                        editDistance: 1
                    });
                }
                
                // Individual terms
                normalizedQuery.split(' ').forEach(term => {
                    if (term.length >= 2) q.term(term, { boost: 20 });
                });
            })
            .map(result => ({
                ...result,
                item: appData[result.ref]
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, MAX_RESULTS);

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
            : createDropdownResultsHTML(results);
        
        container.style.display = 'block';
    }

    // HTML templates
    function createDropdownResultsHTML(results) {
        return results.map(result => `
            <a href="${result.item.url}" class="search-result-item">
                <img src="${result.item.icon || '/images/default-icon.png'}" 
                     alt="${result.item.title}"
                     onerror="this.src='/images/default-icon.png'">
                <div class="info">
                    <h4>${highlightMatches(result.item.title, query)}</h4>
                    <p>${highlightMatches(result.item.description || '', query)}</p>
                </div>
            </a>
        `).join('');
    }

    function createFullPageResultsHTML(results, query) {
        return `
            <div class="results-header">
                <h2>Tìm thấy ${results.length} kết quả cho "${query}"</h2>
            </div>
            <div class="app-grid">
                ${results.map(result => `
                    <div class="app-card" onclick="window.location.href='${result.item.url}'">
                        <img src="${result.item.icon || '/images/default-icon.png'}"
                             alt="${result.item.title}"
                             onerror="this.src='/images/default-icon.png'">
                        <div class="app-info">
                            <h3>${highlightMatches(result.item.title, query)}</h3>
                            <p>${highlightMatches(result.item.description || '', query)}</p>
                            <div class="app-meta">
                                <span class="category">${result.item.category || 'App'}</span>
                                ${result.item.version ? `<span class="version">${result.item.version}</span>` : ''}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // Helper functions
    function highlightMatches(text, query) {
        if (!text || !query) return text || '';
        const normalizedText = text.toLowerCase();
        const normalizedQuery = query.toLowerCase();
        
        return text.replace(new RegExp(`(${normalizedQuery.split(' ').filter(t => t.length >= 2).join('|')})`, 'gi'), 
            '<span class="highlight">$1</span>');
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
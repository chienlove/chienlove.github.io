document.addEventListener('DOMContentLoaded', function() {
    // Initialize search functionality
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('header-search-results');
    let searchIndex;
    let appData = {};
    
    // Load app data and build search index
    async function loadAppData() {
        try {
            const response = await fetch('/list.json');
            if (!response.ok) throw new Error('Network response was not ok');
            
            const data = await response.json();
            appData = data.reduce((acc, app) => {
                acc[app.url] = app;
                return acc;
            }, {});
            
            // Initialize Lunr search index
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
        } catch (error) {
            console.error('Error loading search data:', error);
        }
    }
    
    // Perform search and display results
    function performSearch(query) {
        if (!searchIndex || query.length < 2) {
            searchResults.style.display = 'none';
            return;
        }
        
        try {
            const results = searchIndex.search(query);
            displaySearchResults(results);
        } catch (error) {
            console.error('Search error:', error);
            searchResults.style.display = 'none';
        }
    }
    
    // Display search results in dropdown
    function displaySearchResults(results) {
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
    
    // Handle input events with debounce
    const debounce = (func, delay) => {
        let timeoutId;
        return function(...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    };
    
    // Event listeners
    searchInput.addEventListener('input', debounce(function() {
        performSearch(this.value.trim());
    }, 300));
    
    searchInput.addEventListener('focus', function() {
        if (this.value.trim().length > 1 && searchResults.innerHTML) {
            searchResults.style.display = 'block';
        }
    });
    
    document.addEventListener('click', function(e) {
        if (!searchForm.contains(e.target)) {
            searchResults.style.display = 'none';
        }
    });
    
    // Load data when page is ready
    loadAppData();
});
}
let currentPage = 1;
const perPage = 20;
let versions = [];

// Utility functions
function sanitizeHTML(str) {
    if (!str) return '';
    return str.toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function formatDate(dateString) {
    if (!dateString) return 'Không rõ';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
}

// DOM Elements
const searchForm = document.getElementById('searchForm');
const searchTerm = document.getElementById('searchTerm');
const loading = document.getElementById('loading');
const appInfo = document.getElementById('appInfo');
const result = document.getElementById('result');
const pagination = document.getElementById('pagination');
const errorElement = document.getElementById('error');

// Event Listeners
searchForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const term = searchTerm.value.trim();
    
    // Reset UI
    loading.style.display = 'flex';
    appInfo.innerHTML = '';
    result.innerHTML = '';
    pagination.innerHTML = '';
    errorElement.style.display = 'none';
    versions = [];
    currentPage = 1;
    
    if (term) {
        if (/^\d+$/.test(term)) {
            // Search by App ID
            fetchAppInfo(term);
            fetchVersions(term);
        } else {
            // Search by name
            searchApp(term);
        }
    }
});

// Fetch App Info
async function fetchAppInfo(appId) {
    try {
        const response = await fetch(`/api/appInfo?id=${appId}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.json();
        if (!data.results || data.results.length === 0) {
            throw new Error('Không tìm thấy ứng dụng');
        }
        
        displayAppInfo(data.results[0]);
    } catch (error) {
        showError(error.message);
    }
}

function displayAppInfo(app) {
    const iconUrl = app.artworkUrl512 || app.artworkUrl100 || app.artworkUrl60;
    const fileSizeMB = app.fileSizeBytes ? (app.fileSizeBytes / (1024 * 1024)).toFixed(1) + ' MB' : 'Không rõ';
    
    appInfo.innerHTML = `
        <div class="app-info-header">
            <img src="${iconUrl}" alt="${sanitizeHTML(app.trackName)}" class="app-icon-large">
            <div>
                <h2 class="app-title">${sanitizeHTML(app.trackName)}</h2>
                <p class="app-developer">${sanitizeHTML(app.artistName)}</p>
            </div>
        </div>
        
        <div class="app-meta-grid">
            <div class="app-meta-item">
                <div class="app-meta-label">Phiên bản hiện tại</div>
                <div class="app-meta-value">${sanitizeHTML(app.version || 'Không rõ')}</div>
            </div>
            <div class="app-meta-item">
                <div class="app-meta-label">Kích thước</div>
                <div class="app-meta-value">${fileSizeMB}</div>
            </div>
            <div class="app-meta-item">
                <div class="app-meta-label">Ngày phát hành</div>
                <div class="app-meta-value">${formatDate(app.releaseDate)}</div>
            </div>
            <div class="app-meta-item">
                <div class="app-meta-label">Đánh giá</div>
                <div class="app-meta-value">${app.averageUserRating ? app.averageUserRating.toFixed(1) + '★' : 'Chưa có'}</div>
            </div>
        </div>
        
        <div class="bundle-id-container">
            <div class="app-meta-label">Bundle ID</div>
            <div class="app-meta-value">${sanitizeHTML(app.bundleId || 'Không rõ')}</div>
        </div>
        
        ${app.releaseNotes ? `
        <div class="release-notes-container">
            <h3 class="release-notes-title">Ghi chú phát hành</h3>
            <div class="release-notes-content">${sanitizeHTML(app.releaseNotes)}</div>
        </div>
        ` : ''}
    `;
}

// Search App by Name
async function searchApp(term) {
    try {
        const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=software&limit=10`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.json();
        if (!data.results || data.results.length === 0) {
            throw new Error('Không tìm thấy ứng dụng nào phù hợp');
        }
        
        displaySearchResults(data.results);
    } catch (error) {
        showError(error.message);
    } finally {
        loading.style.display = 'none';
    }
}

function displaySearchResults(apps) {
    result.innerHTML = `
        <div class="search-results">
            <h3>Kết quả tìm kiếm (${apps.length})</h3>
            <div class="apps-list">
                ${apps.map(app => `
                    <div class="app-item" data-appid="${app.trackId}">
                        <img src="${app.artworkUrl60}" alt="${sanitizeHTML(app.trackName)}" class="app-icon">
                        <div class="app-details">
                            <h4>${sanitizeHTML(app.trackName)}</h4>
                            <p>${sanitizeHTML(app.artistName)}</p>
                            <div class="app-meta">
                                <span>${sanitizeHTML(app.version || 'N/A')}</span>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    // Add click event to each app item
    document.querySelectorAll('.app-item').forEach(item => {
        item.addEventListener('click', function() {
            const appId = this.getAttribute('data-appid');
            fetchAppInfo(appId);
            fetchVersions(appId);
        });
    });
}

// Fetch Versions
async function fetchVersions(appId) {
    loading.style.display = 'flex';
    result.innerHTML = '<p>Đang tải lịch sử phiên bản...</p>';
    
    try {
        const response = await fetch(`/api/getAppVersions?id=${appId}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.json();
        if (!data.data || !Array.isArray(data.data)) {
            throw new Error('Dữ liệu phiên bản không hợp lệ');
        }
        
        versions = data.data;
        renderVersions();
    } catch (error) {
        showError(error.message);
        result.innerHTML = '<p>Không thể tải lịch sử phiên bản</p>';
    } finally {
        loading.style.display = 'none';
    }
}

function renderVersions() {
    if (versions.length === 0) {
        result.innerHTML = '<p>Không có dữ liệu phiên bản</p>';
        pagination.innerHTML = '';
        return;
    }
    
    const start = (currentPage - 1) * perPage;
    const end = start + perPage;
    const paginatedVersions = versions.slice(start, end);
    
    result.innerHTML = `
        <div class="versions-container">
            <div class="versions-header">
                <h3>Lịch sử Phiên bản</h3>
                <span class="total-versions">${versions.length} phiên bản</span>
            </div>
            <div class="versions-scroll-container">
                <table class="versions-table">
                    <thead>
                        <tr>
                            <th class="version-col">Phiên bản</th>
                            <th class="id-col">ID</th>
                            <th class="date-col">Ngày phát hành</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${paginatedVersions.map(version => `
                            <tr>
                                <td class="version-col">${sanitizeHTML(version.bundle_version || 'N/A')}</td>
                                <td class="id-col">${sanitizeHTML(version.external_identifier || 'N/A')}</td>
                                <td class="date-col">${formatDate(version.created_at)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    renderPagination();
}

function renderPagination() {
    const totalPages = Math.ceil(versions.length / perPage);
    
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let paginationHTML = '<div class="pagination">';
    
    // Previous button
    if (currentPage > 1) {
        paginationHTML += `<button class="pagination-button" data-page="${currentPage - 1}">←</button>`;
    }
    
    // Page numbers
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `<button class="pagination-button ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }
    
    // Next button
    if (currentPage < totalPages) {
        paginationHTML += `<button class="pagination-button" data-page="${currentPage + 1}">→</button>`;
    }
    
    paginationHTML += '</div>';
    pagination.innerHTML = paginationHTML;
    
    // Add event listeners
    document.querySelectorAll('.pagination-button').forEach(button => {
        button.addEventListener('click', function() {
            currentPage = parseInt(this.getAttribute('data-page'));
            renderVersions();
            window.scrollTo({ top: result.offsetTop, behavior: 'smooth' });
        });
    });
}

// Error Handling
function showError(message) {
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    loading.style.display = 'none';
}
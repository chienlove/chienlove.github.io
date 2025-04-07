let currentPage = 1;
const perPage = 50;
let versions = [];

// Utility functions
function isAppId(input) {
    return /^\d+$/.test(input);
}

function extractAppIdFromUrl(url) {
    const match = url.match(/(?:id|app\/.*?\bid)(\d+)/i);
    return match ? match[1] : null;
}

function escapeSingleQuote(str) {
    return str.replace(/'/g, "\\'");
}

function sanitizeHTML(str) {
    if (str == null) return '';
    return str.toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Main search function
document.getElementById('searchForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const searchTerm = document.getElementById('searchTerm').value.trim();
    resetSearchUI();
    
    if (isAppId(searchTerm)) {
        fetchFullAppInfo(searchTerm);
    } else {
        const appIdFromUrl = extractAppIdFromUrl(searchTerm);
        if (appIdFromUrl) {
            fetchFullAppInfo(appIdFromUrl);
        } else {
            searchApp(searchTerm);
        }
    }
});

function resetSearchUI() {
    document.getElementById('loading').style.display = 'block';
    document.getElementById('appInfo').innerHTML = '';
    document.getElementById('result').innerHTML = '';
    document.getElementById('pagination').innerHTML = '';
    versions = [];
}

// Click on app name to show versions
function handleAppClick(appId, appName, artistName, version, releaseNotes, bundleId) {
    displayFullAppInfo({
        trackId: appId,
        trackName: appName,
        artistName: artistName,
        version: version,
        releaseNotes: releaseNotes,
        bundleId: bundleId
    });
    fetchTimbrdVersion(appId);
}

async function fetchFullAppInfo(appId) {
    try {
        const response = await fetch(`/api/appInfo?id=${appId}`);
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        
        const data = await response.json();
        if (!data?.results?.length) throw new Error('Không có dữ liệu');
        
        displayFullAppInfo(data.results[0]);
        fetchTimbrdVersion(appId);
    } catch (error) {
        console.error('Lỗi:', error);
        document.getElementById('appInfo').innerHTML = `
            <p class="error">Lỗi: ${sanitizeHTML(error.message)}</p>
        `;
        document.getElementById('loading').style.display = 'none';
    }
}

function displayFullAppInfo(app) {
    const sanitize = str => str ? sanitizeHTML(str) : 'Không có thông tin';
    const fileSizeMB = app.fileSizeBytes ? (app.fileSizeBytes / (1024 * 1024)).toFixed(2) : 'N/A';
    const releaseDate = app.releaseDate ? new Date(app.releaseDate).toLocaleDateString() : 'N/A';
    const iconUrl = app.artworkUrl512 || app.artworkUrl100 || app.artworkUrl60;

    document.getElementById('appInfo').innerHTML = `
        <div class="app-info-container">
            <div class="app-icon">
                <img src="${iconUrl}" alt="${sanitize(app.trackName)}">
            </div>
            <div class="app-details">
                <h2>${sanitize(app.trackName)}</h2>
                <p class="developer">${sanitize(app.artistName)}</p>
                <div class="app-meta">
                    <span class="version">Version: ${sanitize(app.version)}</span>
                    <span class="size">${fileSizeMB} MB</span>
                    <span class="release-date">${releaseDate}</span>
                </div>
                <p class="bundle-id"><strong>Bundle ID:</strong> ${sanitize(app.bundleId || 'N/A')}</p>
                <div class="release-notes">
                    <h3>Release Notes:</h3>
                    <div class="notes-content">${sanitize(app.releaseNotes || 'Không có thông tin cập nhật')}</div>
                </div>
            </div>
        </div>
    `;
}

async function searchApp(term) {
    const encodedTerm = encodeURIComponent(term);
    document.getElementById('result').innerHTML = '<p class="loading-text">Đang tìm kiếm ứng dụng...</p>';

    try {
        const response = await fetch(`https://itunes.apple.com/search?term=${encodedTerm}&entity=software`);
        if (!response.ok) throw new Error(`Lỗi HTTP: ${response.status}`);

        const data = await response.json();
        if (!data.results || data.results.length === 0) {
            throw new Error('Không tìm thấy ứng dụng nào phù hợp');
        }
        displaySearchResults(data.results);
    } catch (error) {
        document.getElementById('result').innerHTML = `
            <p class="error">Lỗi: ${sanitizeHTML(error.message)}</p>
        `;
    } finally {
        document.getElementById('loading').style.display = 'none';
    }
}

function displaySearchResults(apps) {
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = '';

    if (!apps || !Array.isArray(apps) || apps.length === 0) {
        resultDiv.innerHTML = '<p class="no-results">Không tìm thấy ứng dụng nào.</p>';
        return;
    }

    let output = `
        <div class="search-results-container">
            <div class="results-header">
                <span class="result-count">${apps.length} kết quả</span>
            </div>
            <div class="results-list">
    `;

    apps.forEach(app => {
        const trackName = sanitizeHTML(app.trackName || '');
        const artistName = sanitizeHTML(app.artistName || '');
        const version = sanitizeHTML(app.version || '');
        const bundleId = sanitizeHTML(app.bundleId || '');

        output += `
            <div class="app-result" onclick="handleAppClick(
                ${app.trackId}, 
                '${escapeSingleQuote(trackName)}', 
                '${escapeSingleQuote(artistName)}',
                '${escapeSingleQuote(version)}',
                '${escapeSingleQuote(app.releaseNotes || '')}',
                '${escapeSingleQuote(bundleId)}'
            )">
                <img src="${app.artworkUrl60}" alt="${trackName}" class="app-icon">
                <div class="app-info">
                    <h3 class="app-name">${trackName}</h3>
                    <p class="app-developer">${artistName}</p>
                    <p class="app-meta">
                        <span class="app-version">${version}</span>
                        <span class="app-bundle">${bundleId || 'N/A'}</span>
                    </p>
                </div>
            </div>
        `;
    });

    output += `</div></div>`;
    resultDiv.innerHTML = output;
}

// Version history functions
async function fetchTimbrdVersion(appId, retryCount = 0) {
    const MAX_RETRIES = 3;
    document.getElementById('loading').style.display = 'block';
    document.getElementById('result').innerHTML = '<p class="loading-text">Đang tải danh sách phiên bản...</p>';

    try {
        const response = await fetch(`/api/getAppVersions?id=${appId}`);
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

        const data = await response.json();
        if (!data.data || !Array.isArray(data.data)) {
            throw new Error('Định dạng dữ liệu không hợp lệ');
        }

        versions = data.data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        renderVersions();
    } catch (error) {
        console.error(`Lỗi (attempt ${retryCount + 1}):`, error);
        
        if (retryCount < MAX_RETRIES) {
            document.getElementById('result').innerHTML = `
                <p class="loading-text">Đang thử lại lần ${retryCount + 1}/${MAX_RETRIES}...</p>
            `;
            await new Promise(resolve => setTimeout(resolve, 2000));
            return fetchTimbrdVersion(appId, retryCount + 1);
        } else {
            document.getElementById('result').innerHTML = `
                <p class="error">Lỗi: ${sanitizeHTML(error.message)}</p>
            `;
        }
    } finally {
        document.getElementById('loading').style.display = 'none';
    }
}

function renderVersions() {
    const totalVersions = versions.length;
    const start = (currentPage - 1) * perPage;
    const end = start + perPage;
    const paginatedVersions = versions.slice(start, end);

    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = '';

    if (totalVersions === 0) {
        resultDiv.innerHTML = '<p class="no-results">Không có phiên bản nào.</p>';
        document.getElementById('pagination').innerHTML = '';
        return;
    }

    let output = `
        <div class="versions-container">
            <div class="versions-header">
                <h3>Lịch sử Phiên bản</h3>
                <span class="total-versions">${totalVersions} phiên bản</span>
            </div>
            <div class="versions-list">
                <table>
                    <thead>
                        <tr>
                            <th class="version">Phiên bản</th>
                            <th class="id">ID</th>
                            <th class="date">Ngày phát hành</th>
                            <th class="bundle">Bundle ID</th>
                        </tr>
                    </thead>
                    <tbody>
    `;

    paginatedVersions.forEach(version => {
        output += `
            <tr>
                <td class="version">${sanitizeHTML(version.bundle_version || 'N/A')}</td>
                <td class="id">${sanitizeHTML(version.external_identifier || 'N/A')}</td>
                <td class="date">${version.created_at ? new Date(version.created_at).toLocaleDateString() : 'N/A'}</td>
                <td class="bundle">${sanitizeHTML(version.bundle_id || 'N/A')}</td>
            </tr>
        `;
    });

    output += `</tbody></table></div></div>`;
    resultDiv.innerHTML = output;

    renderPagination(totalVersions);
}

function renderPagination(totalItems) {
    const totalPages = Math.ceil(totalItems / perPage);
    const paginationDiv = document.getElementById('pagination');
    paginationDiv.innerHTML = '';

    if (totalPages <= 1) return;

    const pagination = document.createElement('div');
    pagination.className = 'pagination-container';

    // Previous button
    if (currentPage > 1) {
        const prevBtn = document.createElement('button');
        prevBtn.className = 'pagination-btn prev';
        prevBtn.innerHTML = '&larr; Trước';
        prevBtn.addEventListener('click', () => {
            currentPage--;
            renderVersions();
        });
        pagination.appendChild(prevBtn);
    }

    // Page numbers
    const pageNumbers = document.createElement('div');
    pageNumbers.className = 'page-numbers';

    // First page
    if (currentPage > 3) {
        const firstPage = createPageBtn(1);
        pageNumbers.appendChild(firstPage);
        if (currentPage > 4) {
            pageNumbers.appendChild(createEllipsis());
        }
    }

    // Middle pages
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    for (let i = startPage; i <= endPage; i++) {
        pageNumbers.appendChild(createPageBtn(i));
    }

    // Last page
    if (currentPage < totalPages - 2) {
        if (currentPage < totalPages - 3) {
            pageNumbers.appendChild(createEllipsis());
        }
        const lastPage = createPageBtn(totalPages);
        pageNumbers.appendChild(lastPage);
    }

    pagination.appendChild(pageNumbers);

    // Next button
    if (currentPage < totalPages) {
        const nextBtn = document.createElement('button');
        nextBtn.className = 'pagination-btn next';
        nextBtn.innerHTML = 'Sau &rarr;';
        nextBtn.addEventListener('click', () => {
            currentPage++;
            renderVersions();
        });
        pagination.appendChild(nextBtn);
    }

    paginationDiv.appendChild(pagination);
}

function createPageBtn(page) {
    const btn = document.createElement('button');
    btn.textContent = page;
    btn.className = page === currentPage ? 'active' : '';
    btn.addEventListener('click', () => {
        currentPage = page;
        renderVersions();
    });
    return btn;
}

function createEllipsis() {
    const span = document.createElement('span');
    span.className = 'ellipsis';
    span.textContent = '...';
    return span;
}

// Global functions
window.handleAppClick = handleAppClick;
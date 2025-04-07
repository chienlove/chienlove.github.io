let currentPage = 1;
const perPage = 50;
let versions = [];

// Hàm utility
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

// Event listeners
document.getElementById('searchForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const searchTerm = document.getElementById('searchTerm').value.trim();

    // Reset UI
    resetSearchUI();
    
    if (isAppId(searchTerm)) {
        fetchAppInfoFromiTunes(searchTerm);
        fetchTimbrdVersion(searchTerm);
    } else {
        const appIdFromUrl = extractAppIdFromUrl(searchTerm);
        if (appIdFromUrl) {
            fetchAppInfoFromiTunes(appIdFromUrl);
            fetchTimbrdVersion(appIdFromUrl);
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

// API functions
async function fetchAppInfoFromiTunes(appId) {
    try {
        const response = await fetch(`/api/appInfo?id=${appId}`);
        
        if (!response.ok) {
            throw new Error(response.status === 404 
                ? 'Ứng dụng không tồn tại' 
                : `Lỗi HTTP: ${response.status}`);
        }

        const data = await response.json();
        if (!data?.results?.length) throw new Error('Không có dữ liệu');
        
        displayAppInfo(data.results[0]);
    } catch (error) {
        console.error('Lỗi iTunes:', error);
        document.getElementById('appInfo').innerHTML = `
            <p class="error">Lỗi: ${sanitizeHTML(error.message)}</p>
        `;
    } finally {
        document.getElementById('loading').style.display = 'none';
    }
}

function displayAppInfo(app) {
    const sanitize = str => str ? sanitizeHTML(str) : 'Không có thông tin';
    const fileSizeMB = app.fileSizeBytes ? (app.fileSizeBytes / (1024 * 1024)).toFixed(2) : 'N/A';

    document.getElementById('appInfo').innerHTML = `
        <div class="app-info">
            <h2>Thông tin Ứng dụng</h2>
            <p><strong>ID:</strong> ${app.trackId}</p>
            <p><strong>Tên:</strong> ${sanitize(app.trackName)}</p>
            <p><strong>Tác giả:</strong> ${sanitize(app.artistName)}</p>
            <p><strong>Phiên bản hiện tại:</strong> ${sanitize(app.version)}</p>
            <p><strong>Ngày phát hành:</strong> ${app.releaseDate ? new Date(app.releaseDate).toLocaleDateString() : 'N/A'}</p>
            <p><strong>Dung lượng:</strong> ${fileSizeMB} MB</p>
        </div>
    `;
}

async function searchApp(term) {
    const encodedTerm = encodeURIComponent(term);
    document.getElementById('result').innerHTML = '<p>Đang tìm kiếm ứng dụng...</p>';

    try {
        const response = await fetch(`https://itunes.apple.com/search?term=${encodedTerm}&entity=software`);
        if (!response.ok) throw new Error(`Lỗi HTTP: ${response.status}`);

        const data = await response.json();
        if (!data.results || data.results.length === 0) {
            throw new Error('Không tìm thấy ứng dụng nào phù hợp');
        }
        displaySearchResults(data.results);
    } catch (error) {
        console.error('Lỗi tìm kiếm:', error);
        document.getElementById('result').innerHTML = `
            <p class="error">Lỗi: ${sanitizeHTML(error.message)}</p>
        `;
    }
}

function displaySearchResults(apps) {
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = '';

    if (!apps || !Array.isArray(apps) || apps.length === 0) {
        resultDiv.innerHTML = '<p>Không tìm thấy ứng dụng nào.</p>';
        return;
    }

    let output = `
        <table class="search-results">
            <thead>
                <tr>
                    <th>Icon</th>
                    <th>Tên ứng dụng</th>
                    <th>Tác giả</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
    `;

    apps.forEach(app => {
        const trackName = sanitizeHTML(app.trackName || '');
        const artistName = sanitizeHTML(app.artistName || '');
        output += `
            <tr>
                <td><img src="${app.artworkUrl60}" alt="${trackName}" width="60"></td>
                <td>${trackName}</td>
                <td>${artistName}</td>
                <td>
                    <button class="btn-view" 
                        onclick="selectApp(${app.trackId}, '${escapeSingleQuote(trackName)}', '${escapeSingleQuote(artistName)}')">
                        Xem versions
                    </button>
                </td>
            </tr>
        `;
    });

    output += '</tbody></table>';
    resultDiv.innerHTML = output;
}

// Version history functions
function selectApp(trackId, trackName, artistName) {
    document.getElementById('appInfo').innerHTML = `
        <div class="app-info">
            <h2>Thông tin Ứng dụng</h2>
            <p><strong>ID:</strong> ${trackId}</p>
            <p><strong>Tên:</strong> ${trackName}</p>
            <p><strong>Tác giả:</strong> ${artistName}</p>
        </div>
    `;

    document.getElementById('result').innerHTML = '<p>Đang tải danh sách phiên bản...</p>';
    document.getElementById('pagination').innerHTML = '';
    versions = [];
    
    fetchTimbrdVersion(trackId);
}

async function fetchTimbrdVersion(appId, retryCount = 0) {
    const MAX_RETRIES = 3;
    document.getElementById('loading').style.display = 'block';
    
    try {
        const response = await fetch(`/api/getAppVersions?id=${appId}`);
        
        if (!response.ok) {
            if (response.status === 403) {
                throw new Error('Ứng dụng này không hỗ trợ xem version history');
            }
            throw new Error(`HTTP Error: ${response.status}`);
        }

        const data = await response.json();
        if (!data.data || !Array.isArray(data.data)) {
            throw new Error('Định dạng dữ liệu không hợp lệ');
        }

        versions = data.data;
        versions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        renderVersions();
    } catch (error) {
        console.error(`Lỗi khi tải phiên bản (attempt ${retryCount + 1}):`, error);
        
        if (retryCount < MAX_RETRIES && !error.message.includes('403')) {
            document.getElementById('result').innerHTML = `
                <p>Đang thử lại lần ${retryCount + 1}/${MAX_RETRIES}...</p>
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
        resultDiv.innerHTML = '<p>Không có phiên bản nào.</p>';
        document.getElementById('pagination').innerHTML = '';
        return;
    }

    let output = `<p class="total-versions">Tổng số phiên bản: ${totalVersions}</p>`;
    output += `
        <table class="versions-table">
            <thead>
                <tr>
                    <th>Phiên bản</th>
                    <th>ID</th>
                    <th>Ngày phát hành</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    paginatedVersions.forEach(version => {
        output += `
            <tr>
                <td>${sanitizeHTML(version.bundle_version || 'N/A')}</td>
                <td>${sanitizeHTML(version.external_identifier || 'N/A')}</td>
                <td>${version.created_at ? new Date(version.created_at).toLocaleDateString() : 'N/A'}</td>
            </tr>
        `;
    });
    
    output += '</tbody></table>';
    resultDiv.innerHTML = output;

    renderPagination(totalVersions);
}

function renderPagination(totalItems) {
    const totalPages = Math.ceil(totalItems / perPage);
    const paginationDiv = document.getElementById('pagination');
    paginationDiv.innerHTML = '';

    if (totalPages <= 1) return;

    const paginationContainer = document.createElement('div');
    paginationContainer.className = 'pagination';

    // Previous button
    if (currentPage > 1) {
        const prevButton = document.createElement('button');
        prevButton.innerHTML = '&laquo;';
        prevButton.addEventListener('click', () => {
            currentPage--;
            renderVersions();
        });
        paginationContainer.appendChild(prevButton);
    }

    // Page buttons
    for (let i = 1; i <= totalPages; i++) {
        const button = document.createElement('button');
        button.textContent = i;
        if (i === currentPage) {
            button.className = 'active';
        }
        button.addEventListener('click', () => {
            currentPage = i;
            renderVersions();
        });
        paginationContainer.appendChild(button);
    }

    // Next button
    if (currentPage < totalPages) {
        const nextButton = document.createElement('button');
        nextButton.innerHTML = '&raquo;';
        nextButton.addEventListener('click', () => {
            currentPage++;
            renderVersions();
        });
        paginationContainer.appendChild(nextButton);
    }

    paginationDiv.appendChild(paginationContainer);
}

// Make functions available globally
window.selectApp = selectApp;
window.paginateVersions = function(page) {
    currentPage = page;
    renderVersions();
};
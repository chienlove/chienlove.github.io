let currentPage = 1;
const perPage = 50;
let versions = [];

function isAppId(input) {
    return /^\d+$/.test(input);
}

function extractAppIdFromUrl(url) {
    const match = url.match(/(?:id|app\/.*?\bid)(\d+)/i);
    return match ? match[1] : null;
}

document.getElementById('searchForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const searchTerm = document.getElementById('searchTerm').value.trim();

    // Reset UI
    document.getElementById('loading').style.display = 'block';
    document.getElementById('appInfo').innerHTML = '';
    document.getElementById('result').innerHTML = '';
    document.getElementById('pagination').innerHTML = '';
    versions = [];

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

function fetchAppInfoFromiTunes(appId) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    fetch(`/api/appInfo?id=${appId}`, { signal: controller.signal })
        .then(response => {
            clearTimeout(timeoutId);
            if (response.status === 404) throw new Error('Ứng dụng không tồn tại');
            if (!response.ok) throw new Error(`Lỗi HTTP: ${response.status}`);
            return response.json();
        })
        .then(data => {
            if (!data?.results?.length) throw new Error('Không có dữ liệu');
            displayAppInfo(data.results[0]);
        })
        .catch(error => {
            console.error('Lỗi iTunes:', error);
            document.getElementById('appInfo').innerHTML = `
                <p class="error">Lỗi: ${sanitizeHTML(error.message)}</p>
            `;
        })
        .finally(() => {
            document.getElementById('loading').style.display = 'none';
        });
}

function displayAppInfo(app) {
    const sanitize = str => str ? sanitizeHTML(str) : 'Không có thông tin';
    const fileSizeMB = app.fileSizeBytes ? (app.fileSizeBytes / (1024 * 1024)).toFixed(2) : 'N/A';

    document.getElementById('appInfo').innerHTML = `
        <h2>Thông tin Ứng dụng</h2>
        <p><strong>ID:</strong> ${app.trackId}</p>
        <p><strong>Tên:</strong> ${sanitize(app.trackName)}</p>
        <p><strong>Tác giả:</strong> ${sanitize(app.artistName)}</p>
        <p><strong>Phiên bản:</strong> ${sanitize(app.version)}</p>
        <p><strong>Cập nhật:</strong> ${sanitize(app.releaseNotes)}</p>
        <p><strong>Ngày phát hành:</strong> ${app.releaseDate ? new Date(app.releaseDate).toLocaleDateString() : 'N/A'}</p>
        <p><strong>Dung lượng:</strong> ${fileSizeMB} MB</p>
    `;
}

function searchApp(term) {
    const encodedTerm = encodeURIComponent(term);
    document.getElementById('loading').style.display = 'block';
    document.getElementById('result').innerHTML = '<p>Đang tìm kiếm ứng dụng...</p>';

    fetch(`https://itunes.apple.com/search?term=${encodedTerm}&entity=software`)
        .then(response => {
            if (!response.ok) throw new Error(`Lỗi HTTP: ${response.status}`);
            return response.json();
        })
        .then(data => {
            if (!data.results || data.results.length === 0) {
                throw new Error('Không tìm thấy ứng dụng nào phù hợp');
            }
            displaySearchResults(data.results);
        })
        .catch(error => {
            console.error('Lỗi tìm kiếm:', error);
            document.getElementById('result').innerHTML = `
                <p class="error">Lỗi: ${sanitizeHTML(error.message)}</p>
            `;
        })
        .finally(() => {
            document.getElementById('loading').style.display = 'none';
        });
}

function displaySearchResults(apps) {
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = '';

    if (!apps || !Array.isArray(apps) {
        resultDiv.innerHTML = '<p class="error">Dữ liệu ứng dụng không hợp lệ</p>';
        return;
    }

    if (apps.length === 0) {
        resultDiv.innerHTML = '<p>Không tìm thấy ứng dụng nào.</p>';
        return;
    }

    let output = '<table><tr><th>Icon</th><th>Tên ứng dụng</th><th>Tác giả</th><th>Action</th></tr>';
    apps.forEach(app => {
        const trackName = sanitizeHTML(app.trackName || '');
        const artistName = sanitizeHTML(app.artistName || '');
        output += `
            <tr>
                <td><img src="${app.artworkUrl60 || ''}" alt="${trackName} icon" width="60"></td>
                <td>${trackName}</td>
                <td>${artistName}</td>
                <td>
                    <button onclick="selectApp(${app.trackId}, '${trackName.replace(/'/g, "\\'")}', '${artistName.replace(/'/g, "\\'")}')">Xem versions</button>
                </td>
            </tr>
        `;
    });
    output += '</table>';
    resultDiv.innerHTML = output;
}

function selectApp(trackId, trackName, artistName) {
    // Hiển thị thông tin cơ bản
    document.getElementById('appInfo').innerHTML = `
        <h2>Thông tin Ứng dụng</h2>
        <p><strong>ID:</strong> ${trackId}</p>
        <p><strong>Tên:</strong> ${trackName}</p>
        <p><strong>Tác giả:</strong> ${artistName}</p>
    `;

    // Reset và tải versions mới
    document.getElementById('result').innerHTML = '<p>Đang tải danh sách phiên bản...</p>';
    document.getElementById('pagination').innerHTML = '';
    versions = [];
    
    fetchTimbrdVersion(trackId);
}

function fetchTimbrdVersion(appId, retryCount = 0) {
    const MAX_RETRIES = 3;
    document.getElementById('loading').style.display = 'block';
    
    if (retryCount > 0) {
        document.getElementById('result').innerHTML = `
            <p>Đang thử lại lần ${retryCount}/${MAX_RETRIES}...</p>
        `;
    }

    fetchVersionsChunk(appId, 1, retryCount);
}

function fetchVersionsChunk(appId, page, retryCount = 0) {
    const MAX_RETRIES = 3;
    const limit = 1000;
    
    fetch(`/api/getAppVersions?id=${appId}&page=${page}&limit=${limit}`, {
        headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
        }
    })
    .then(response => {
        if (!response.ok) {
            if (response.status === 403) {
                throw new Error('Ứng dụng này không hỗ trợ xem version history');
            }
            throw new Error(`HTTP Error: ${response.status}`);
        }
        return response.text();
    })
    .then(text => {
        if (!text || text.trim() === '') {
            throw new Error('Không nhận được dữ liệu từ server');
        }
        
        try {
            return JSON.parse(text);
        } catch (e) {
            console.error('Parse error:', e);
            throw new Error('Không thể xử lý dữ liệu từ server');
        }
    })
    .then(response => {
        if (!response.data || !Array.isArray(response.data)) {
            throw new Error('Định dạng dữ liệu không hợp lệ');
        }

        versions = versions.concat(response.data);
        
        if (response.metadata?.hasMore) {
            fetchVersionsChunk(appId, page + 1, retryCount);
        } else {
            versions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            currentPage = 1;
            renderVersions();
        }
    })
    .catch(error => {
        console.error(`Error (attempt ${retryCount + 1}):`, error);
        
        const noRetryErrors = [
            'Ứng dụng này không hỗ trợ xem version history',
            'Định dạng dữ liệu không hợp lệ'
        ];
        
        if (retryCount < MAX_RETRIES && 
            !error.message.includes('404') && 
            !noRetryErrors.some(msg => error.message.includes(msg))) {
            
            setTimeout(() => {
                fetchVersionsChunk(appId, page, retryCount + 1);
            }, 2000);
        } else {
            document.getElementById('result').innerHTML = `
                <p class="error">
                    ${retryCount > 0 ? `Đã thử ${retryCount} lần. ` : ''}
                    Lỗi: ${sanitizeHTML(error.message)}
                </p>
            `;
            document.getElementById('loading').style.display = 'none';
        }
    });
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
        document.getElementById('loading').style.display = 'none';
        return;
    }

    let output = `<p>Tổng số phiên bản: ${totalVersions}</p>`;
    output += '<table><tr><th>Phiên bản</th><th>ID</th><th>Ngày phát hành</th></tr>';
    
    paginatedVersions.forEach(version => {
        output += `
            <tr>
                <td>${sanitizeHTML(version.bundle_version || 'N/A')}</td>
                <td>${sanitizeHTML(version.external_identifier || 'N/A')}</td>
                <td>${version.created_at ? new Date(version.created_at).toLocaleDateString() : 'N/A'}</td>
            </tr>
        `;
    });
    output += '</table>';
    resultDiv.innerHTML = output;

    renderPagination(totalVersions);
    document.getElementById('loading').style.display = 'none';
}

function renderPagination(totalItems) {
    const totalPages = Math.ceil(totalItems / perPage);
    const paginationDiv = document.getElementById('pagination');
    paginationDiv.innerHTML = '';

    if (totalPages <= 1) return;

    for (let i = 1; i <= totalPages; i++) {
        const button = document.createElement('button');
        button.textContent = i;
        if (i === currentPage) {
            button.classList.add('active');
        }
        button.addEventListener('click', () => {
            currentPage = i;
            renderVersions();
        });
        paginationDiv.appendChild(button);
    }
}

function sanitizeHTML(str) {
    if (!str) return '';
    return str.toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Thêm vào global scope để có thể gọi từ HTML
window.selectApp = selectApp;
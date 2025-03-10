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
    versions = []; // Reset versions array

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
    fetch(`https://itunes.apple.com/search?term=${encodedTerm}&entity=software`)
        .then(response => {
            if (!response.ok) throw new Error(`Lỗi HTTP: ${response.status}`);
            return response.json();
        })
        .then(data => displaySearchResults(data.results || []))
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

    if (apps.length === 0) {
        resultDiv.innerHTML = '<p>Không tìm thấy ứng dụng nào.</p>';
        return;
    }

    let output = '<table><tr><th>Icon</th><th>Tên ứng dụng</th><th>Tác giả</th><th>Action</th></tr>';
    apps.forEach(app => {
        const trackName = sanitizeHTML(app.trackName);
        const artistName = sanitizeHTML(app.artistName);
        output += `
            <tr>
                <td><img src="${app.artworkUrl60}" alt="${trackName} icon"></td>
                <td>${trackName}</td>
                <td>${artistName}</td>
                <td>
                    <button onclick="selectApp(
                        ${app.trackId},
                        '${trackName.replace(/'/g, "\\'")}',
                        '${artistName.replace(/'/g, "\\'")}',
                        '${sanitizeHTML(app.version || '')}',
                        '${sanitizeHTML(app.releaseNotes || '')}'
                    )">Xem versions</button>
                </td>
            </tr>
        `;
    });
    output += '</table>';
    resultDiv.innerHTML = output;
}

// Thêm hàm mới để xử lý việc chọn ứng dụng
function selectApp(trackId, trackName, artistName, version, releaseNotes) {
    // Hiển thị thông tin ứng dụng
    document.getElementById('appInfo').innerHTML = `
        <h2>Thông tin Ứng dụng</h2>
        <p><strong>ID:</strong> ${trackId}</p>
        <p><strong>Tên:</strong> ${trackName}</p>
        <p><strong>Tác giả:</strong> ${artistName}</p>
        <p><strong>Phiên bản hiện tại:</strong> ${version}</p>
        <p><strong>Cập nhật:</strong> ${releaseNotes}</p>
    `;

    // Fetch versions cho ứng dụng đã chọn
    fetchTimbrdVersion(trackId);
}

function fetchTimbrdVersion(appId, retryCount = 0) {
    const MAX_RETRIES = 3;
    document.getElementById('loading').style.display = 'block';
    document.getElementById('result').innerHTML = '<p>Đang tải dữ liệu...</p>';
    
    if (retryCount > 0) {
        document.getElementById('result').innerHTML = `
            <p>Đang thử lại lần ${retryCount}/${MAX_RETRIES}...</p>
        `;
    }

    versions = [];
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
            // Handle specific status codes
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
            const response = JSON.parse(text);
            if (!response.data || !Array.isArray(response.data)) {
                throw new Error('Định dạng dữ liệu không hợp lệ');
            }
            return response;
        } catch (e) {
            console.error('Parse error:', e);
            console.error('Raw response:', text);
            throw new Error('Không thể xử lý dữ liệu từ server');
        }
    })
    .then(response => {
        const { data, metadata } = response;
        
        // Merge với dữ liệu hiện có
        versions = versions.concat(data);
        
        document.getElementById('result').innerHTML = `
            <p>Đã tải ${versions.length} phiên bản...</p>
        `;

        if (metadata.hasMore) {
            fetchVersionsChunk(appId, page + 1, retryCount);
        } else {
            versions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            currentPage = 1;
            paginateVersions(currentPage);
        }
    })
    .catch(error => {
        console.error(`Error (attempt ${retryCount + 1}):`, error);
        
        // Don't retry for certain errors
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

// Cập nhật hàm paginateVersions để hiển thị thông tin về tổng số phiên bản
function paginateVersions(page) {
    currentPage = page;
    const totalVersions = versions.length;
    const start = (currentPage - 1) * perPage;
    const end = start + perPage;

    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = '';

    if (totalVersions === 0) {
        resultDiv.innerHTML = '<p>Không có phiên bản nào.</p>';
        document.getElementById('pagination').innerHTML = '';
        return;
    }

    // Thêm thông tin tổng số phiên bản
    resultDiv.innerHTML = `<p>Tổng số phiên bản: ${totalVersions}</p>`;

    let output = '<table><tr><th>Phiên bản</th><th>ID</th><th>Ngày phát hành</th></tr>';
    versions.slice(start, end).forEach(version => {
        output += `
            <tr>
                <td>${sanitizeHTML(version.bundle_version)}</td>
                <td>${sanitizeHTML(version.external_identifier)}</td>
                <td>${new Date(version.created_at).toLocaleDateString()}</td>
            </tr>
        `;
    });
    output += '</table>';
    resultDiv.innerHTML += output;

    const totalPages = Math.ceil(totalVersions / perPage);
    document.getElementById('pagination').innerHTML = Array.from(
        { length: totalPages },
        (_, i) => `<button class="${i + 1 === currentPage ? 'active' : ''}" onclick="paginateVersions(${i + 1})">${i + 1}</button>`
    ).join('');
    
    document.getElementById('loading').style.display = 'none';
}
// Hàm phân trang (thêm kiểm tra dữ liệu)
function paginateVersions(page) {
    currentPage = page;
    const totalVersions = versions.length;
    const start = (currentPage - 1) * perPage;
    const end = start + perPage;

    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = '';

    if (totalVersions === 0) {
        resultDiv.innerHTML = '<p>Không có phiên bản nào.</p>';
        document.getElementById('pagination').innerHTML = '';
        return;
    }

    let output = '<table><tr><th>Phiên bản</th><th>ID</th><th>Ngày phát hành</th></tr>';
    versions.slice(start, end).forEach(version => {
        output += `
            <tr>
                <td>${sanitizeHTML(version.bundle_version)}</td>
                <td>${sanitizeHTML(version.external_identifier)}</td>
                <td>${new Date(version.created_at).toLocaleDateString()}</td>
            </tr>
        `;
    });
    output += '</table>';
    resultDiv.innerHTML = output;

    // Hiển thị phân trang
    const totalPages = Math.ceil(totalVersions / perPage);
    document.getElementById('pagination').innerHTML = Array.from(
        { length: totalPages },
        (_, i) => `<button class="${i + 1 === currentPage ? 'active' : ''}" onclick="changePage(${i + 1})">${i + 1}</button>`
    ).join('');
}

// Hàm utility: Xử lý XSS
function sanitizeHTML(str) {
    return str.toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
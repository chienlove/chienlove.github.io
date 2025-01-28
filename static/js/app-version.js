let currentPage = 1;
const perPage = 50;
let versions = [];

// Hàm kiểm tra ID ứng dụng hợp lệ
function isAppId(input) {
    return /^\d+$/.test(input);
}

// Hàm trích xuất ID từ URL (đã cải tiến)
function extractAppIdFromUrl(url) {
    const match = url.match(/(?:id|app\/.*?\bid)(\d+)/i); // Regex mạnh hơn
    return match ? match[1] : null;
}

// Xử lý sự kiện tìm kiếm
document.getElementById('searchForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const searchTerm = document.getElementById('searchTerm').value.trim();

    // Reset UI
    document.getElementById('loading').style.display = 'block';
    document.getElementById('appInfo').innerHTML = '';
    document.getElementById('result').innerHTML = '';
    document.getElementById('pagination').innerHTML = '';

    // Xử lý logic tìm kiếm
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

// Hàm gọi API iTunes (thêm timeout và xử lý lỗi)
function fetchAppInfoFromiTunes(appId) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // Timeout 10s

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

// Hiển thị thông tin ứng dụng (escape HTML)
function displayAppInfo(app) {
    const sanitize = str => str ? sanitizeHTML(str) : 'Không có thông tin';
    const fileSizeMB = app.fileSizeBytes ? (app.fileSizeBytes / (1024 * 1024)).toFixed(2) : 'N/A';

    document.getElementById('appInfo').innerHTML = `
        <h2>Thông tin Ứng dụng</h2>
        <p><strong>Tên:</strong> ${sanitize(app.trackName)}</p>
        <p><strong>Tác giả:</strong> ${sanitize(app.artistName)}</p>
        <p><strong>Phiên bản:</strong> ${sanitize(app.version)}</p>
        <p><strong>Cập nhật:</strong> ${sanitize(app.releaseNotes)}</p>
        <p><strong>Ngày phát hành:</strong> ${app.releaseDate ? new Date(app.releaseDate).toLocaleDateString() : 'N/A'}</p>
        <p><strong>Dung lượng:</strong> ${fileSizeMB} MB</p>
    `;
}

// Hàm tìm kiếm ứng dụng (thêm xử lý lỗi mạng)
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

// Hiển thị kết quả tìm kiếm (escape HTML)
function displaySearchResults(apps) {
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = '';

    if (apps.length === 0) {
        resultDiv.innerHTML = '<p>Không tìm thấy ứng dụng nào.</p>';
        return;
    }

    let output = '<table><tr><th>Icon</th><th>Tên ứng dụng</th><th>Tác giả</th></tr>';
    apps.forEach(app => {
        const trackName = sanitizeHTML(app.trackName);
        const artistName = sanitizeHTML(app.artistName);
        output += `
            <tr>
                <td><img src="${app.artworkUrl60}" alt="${trackName} icon"></td>
                <td><a href="#" onclick="getAppVersions(
                    ${app.trackId},
                    '${trackName.replace(/'/g, "\\'")}',
                    '${artistName.replace(/'/g, "\\'")}',
                    '${sanitizeHTML(app.version || '')}',
                    '${sanitizeHTML(app.releaseNotes || '')}'
                )">${trackName}</a></td>
                <td>${artistName}</td>
            </tr>
        `;
    });
    output += '</table>';
    resultDiv.innerHTML = output;
}

// Hàm gọi phiên bản từ Timbrd (thêm kiểm tra dữ liệu)
function fetchTimbrdVersion(appId) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // Timeout 10s

    fetch(`/api/getAppVersions?id=${appId}`, { signal: controller.signal })
        .then(response => {
            clearTimeout(timeoutId);
            if (response.status === 404) throw new Error('Không tìm thấy phiên bản');
            if (!response.ok) throw new Error(`Lỗi HTTP: ${response.status}`);
            return response.json();
        })
        .then(data => {
            if (!Array.isArray(data)) throw new Error('Dữ liệu không hợp lệ');
            versions = data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            paginateVersions(currentPage);
        })
        .catch(error => {
            console.error('Lỗi Timbrd:', error);
            document.getElementById('result').innerHTML = `
                <p class="error">Lỗi: ${sanitizeHTML(error.message)}</p>
            `;
        })
        .finally(() => {
            document.getElementById('loading').style.display = 'none';
        });
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
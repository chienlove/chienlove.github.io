let currentPage = 1;
const perPage = 50;
let versions = [];

function isAppId(input) {
    return /^\d+$/.test(input);
}

function extractAppIdFromUrl(url) {
    const match = url.match(/(?:id|app\/.*?id)(\d+)/i); // Cập nhật regex
    return match ? match[1] : null;
}

document.getElementById('searchForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const searchTerm = document.getElementById('searchTerm').value.trim();

    document.getElementById('loading').style.display = 'block';
    document.getElementById('appInfo').innerHTML = '';
    document.getElementById('result').innerHTML = '';
    document.getElementById('pagination').innerHTML = '';

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
    console.log(`Fetching iTunes data from URL: https://itunes.apple.com/lookup?id=${appId}`);
    document.getElementById('loading').style.display = 'block';
    document.getElementById('appInfo').innerHTML = '';

    fetch(`/api/appInfo?id=${appId}`)
        .then(response => {
            if (response.status === 404) {
                throw new Error('Không tìm thấy ứng dụng');
            }
            if (!response.ok) {
                throw new Error(`Lỗi HTTP! Trạng thái: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.results && data.results.length > 0) {
                const app = data.results[0];
                const fileSizeMB = app.fileSizeBytes ? (app.fileSizeBytes / (1024 * 1024)).toFixed(2) : 'Không có thông tin';

                document.getElementById('appInfo').innerHTML = `
                    <h2>Thông tin Ứng dụng</h2>
                    <p><strong>Tên:</strong> ${app.trackName || 'Không có thông tin'}</p>
                    <p><strong>Tác giả:</strong> ${app.artistName || 'Không có thông tin'}</p>
                    <p><strong>Phiên bản mới nhất:</strong> ${app.version || 'Không có thông tin'}</p>
                    <p><strong>Mô tả cập nhật:</strong> ${app.releaseNotes || 'Không có thông tin'}</p>
                    <p><strong>Ngày phát hành:</strong> ${app.releaseDate ? new Date(app.releaseDate).toLocaleDateString() : 'Không có thông tin'}</p>
                    <p><strong>Dung lượng:</strong> ${fileSizeMB} MB</p>
                    <p><strong>Bundle ID:</strong> ${app.bundleId || 'Không có thông tin'}</p>
                    <p><strong>iOS tối thiểu:</strong> ${app.minimumOsVersion || 'Không có thông tin'}</p>
                `;
            } else {
                throw new Error('Không tìm thấy thông tin ứng dụng.');
            }
        })
        .catch(error => {
            console.error('Lỗi khi gọi API iTunes:', error);
            document.getElementById('appInfo').innerHTML = `<p class="error">Lỗi khi lấy thông tin ứng dụng: ${error.message}</p>`;
        })
        .finally(() => {
            document.getElementById('loading').style.display = 'none';
        });
}

function searchApp(term) {
    const encodedTerm = encodeURIComponent(term); // Encode URI
    fetch(`https://itunes.apple.com/search?term=${encodedTerm}&entity=software`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Lỗi HTTP! Trạng thái: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            displaySearchResults(data.results);
        })
        .catch(error => {
            console.error('Lỗi:', error);
            document.getElementById('result').innerHTML = `<p class="error">Lỗi khi tìm kiếm ứng dụng: ${error.message}</p>`;
        })
        .finally(() => {
            document.getElementById('loading').style.display = 'none';
        });
}

function displaySearchResults(apps) {
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = '';

    if (apps && apps.length > 0) {
        let output = '<table><tr><th>Icon</th><th>Tên ứng dụng</th><th>Tác giả</th></tr>';
        apps.forEach(app => {
            output += `<tr>
                <td><img src="${app.artworkUrl60}" alt="${app.trackName} icon"></td>
                <td><a href="#" onclick="getAppVersions(${app.trackId}, '${app.trackName}', '${app.artistName}', '${app.version || ''}', '${app.releaseNotes || ''}'); return false;">${app.trackName}</a></td>
                <td>${app.artistName}</td>
            </tr>`;
        });
        output += '</table>';
        resultDiv.innerHTML = output;
    } else {
        resultDiv.innerHTML = '<p>Không tìm thấy ứng dụng nào.</p>';
    }
}

function getAppVersions(appId, appName, artistName, latestVersion, releaseNotes) {
    document.getElementById('appInfo').innerHTML = `
        <h2>Thông tin Ứng dụng</h2>
        <p><strong>Tên:</strong> ${appName || 'Không có thông tin'}</p>
        <p><strong>Tác giả:</strong> ${artistName || 'Không có thông tin'}</p>
        <p><strong>Phiên bản mới nhất:</strong> ${latestVersion || 'Không có thông tin'}</p>
        <p><strong>Mô tả cập nhật:</strong> ${releaseNotes || 'Không có thông tin'}</p>
    `;

    fetchAppInfoFromiTunes(appId);
    fetchTimbrdVersion(appId);
}

function fetchTimbrdVersion(appId) {
    document.getElementById('loading').style.display = 'block';
    fetch(`/api/getAppVersions?id=${appId}`)
        .then(response => {
            if (response.status === 404) {
                throw new Error("Không tìm thấy thông tin phiên bản");
            }
            if (!response.ok) {
                throw new Error(`Lỗi HTTP! Trạng thái: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (Array.isArray(data) && data.length > 0) { // Kiểm tra mảng hợp lệ
                versions = data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                paginateVersions(currentPage);
            } else {
                document.getElementById('result').innerHTML = '<p>Không tìm thấy phiên bản nào.</p>';
            }
        })
        .catch(error => {
            console.error('Lỗi khi gọi API Timbrd:', error);
            document.getElementById('result').innerHTML = `<p class="error">Lỗi khi lấy thông tin phiên bản: ${error.message}</p>`;
        })
        .finally(() => {
            document.getElementById('loading').style.display = 'none';
        });
}

function paginateVersions(page) {
    currentPage = page;
    const totalVersions = versions.length;
    const start = (currentPage - 1) * perPage;
    const end = start + perPage;

    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = '';

    if (totalVersions > 0) {
        let output = '<table><tr><th>Phiên bản</th><th>ID Phiên bản</th><th>Ngày phát hành</th></tr>';
        versions.slice(start, end).forEach(version => {
            output += `<tr>
                <td>${version.bundle_version}</td>
                <td>${version.external_identifier}</td>
                <td>${new Date(version.created_at).toLocaleDateString()}</td>
            </tr>`;
        });
        output += '</table>';
        resultDiv.innerHTML = output;

        const paginationDiv = document.getElementById('pagination');
        paginationDiv.innerHTML = '';
        const totalPages = Math.ceil(totalVersions / perPage);

        for (let i = 1; i <= totalPages; i++) {
            paginationDiv.innerHTML += `<button onclick="changePage(${i})" class="${i === currentPage ? 'active' : ''}">${i}</button>`;
        }
    } else {
        resultDiv.innerHTML = '<p>Không tìm thấy phiên bản nào cho ứng dụng này.</p>';
        document.getElementById('pagination').innerHTML = ''; // Xóa phân trang
    }
}

function changePage(page) {
    currentPage = page;
    paginateVersions(currentPage);
}
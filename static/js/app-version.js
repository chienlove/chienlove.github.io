let currentPage = 1;
        const perPage = 50;
        let versions = [];

        // Kiểm tra nếu input là App ID (số) hoặc URL App Store
        function isAppId(input) {
            return /^\d+$/.test(input);  // Kiểm tra nếu input là số (appId)
        }

        function extractAppIdFromUrl(url) {
            // Kiểm tra nếu input là URL App Store, lấy appId từ URL
            const match = url.match(/id(\d+)/);
            return match ? match[1] : null;
        }

        document.getElementById('searchForm').addEventListener('submit', function(e) {
            e.preventDefault();
            const searchTerm = document.getElementById('searchTerm').value.trim();

            document.getElementById('loading').style.display = 'block';  // Hiển thị thông báo loading
            document.getElementById('appInfo').innerHTML = '';  // Xóa thông tin cũ
            document.getElementById('result').innerHTML = '';  // Xóa kết quả cũ
            document.getElementById('pagination').innerHTML = '';  // Xóa phân trang cũ

            if (isAppId(searchTerm)) {
                // Nếu người dùng nhập App ID
                fetchAppInfoFromiTunes(searchTerm);  // Lấy thông tin ứng dụng từ iTunes
                fetchTimbrdVersion(searchTerm);      // Lấy các phiên bản từ Timbrd
            } else {
                const appIdFromUrl = extractAppIdFromUrl(searchTerm);
                if (appIdFromUrl) {
                    // Nếu người dùng nhập URL App Store, trích xuất appId từ URL
                    fetchAppInfoFromiTunes(appIdFromUrl);  // Lấy thông tin ứng dụng từ iTunes
                    fetchTimbrdVersion(appIdFromUrl);      // Lấy các phiên bản từ Timbrd
                } else {
                    // Nếu người dùng nhập tên ứng dụng, sử dụng iTunes API để tìm appId
                    searchApp(searchTerm);
                }
            }
        });

        // Hàm tìm thông tin ứng dụng từ iTunes bằng appId
        function fetchAppInfoFromiTunes(appId) {
            fetch(`https://itunes.apple.com/lookup?id=${appId}`)
                .then(response => response.json())
                .then(data => {
                    if (data.results.length > 0) {
                        const app = data.results[0];  // Lấy thông tin ứng dụng

                        // Chuyển đổi dung lượng từ bytes sang MB
                        const fileSizeMB = (app.fileSizeBytes / (1024 * 1024)).toFixed(2); 

                        // Hiển thị thông tin ứng dụng
                        document.getElementById('appInfo').innerHTML = `
                            <h2>Thông tin Ứng dụng</h2>
                            <p><strong>Tên:</strong> ${app.trackName}</p>
                            <p><strong>Tác giả:</strong> ${app.artistName}</p>
                            <p><strong>Phiên bản mới nhất:</strong> ${app.version}</p>
                            <p><strong>Mô tả cập nhật:</strong> ${app.releaseNotes}</p>
                            <p><strong>Ngày phát hành:</strong> ${new Date(app.releaseDate).toLocaleDateString()}</p>
                            <p><strong>Dung lượng:</strong> ${fileSizeMB} MB</p>
                            <p><strong>Bundle ID:</strong> ${app.bundleId}</p>
                            <p><strong>iOS tối thiểu:</strong> ${app.minimumOsVersion}</p>
                        `;
                    } else {
                        document.getElementById('appInfo').innerHTML = '<p>Không tìm thấy thông tin ứng dụng.</p>';
                    }
                    document.getElementById('loading').style.display = 'none';  // Tắt thông báo loading
                })
                .catch(error => {
                    console.error('Lỗi khi gọi iTunes API:', error);
                    document.getElementById('appInfo').innerHTML = '<p class="error">Lỗi khi tìm thông tin ứng dụng.</p>';
                    document.getElementById('loading').style.display = 'none';  // Tắt thông báo loading
                });
        }

        // Hàm tìm ứng dụng từ iTunes bằng tên ứng dụng
        function searchApp(term) {
            fetch(`https://itunes.apple.com/search?term=${term}&entity=software`)
                .then(response => response.json())
                .then(data => {
                    document.getElementById('loading').style.display = 'none';  // Tắt thông báo loading
                    displaySearchResults(data.results);
                })
                .catch(error => {
                    console.error('Lỗi:', error);
                    document.getElementById('result').innerHTML = `<p class="error">Lỗi khi tìm kiếm ứng dụng: ${error.message}</p>`;
                    document.getElementById('loading').style.display = 'none';  // Tắt thông báo loading
                });
        }

        function displaySearchResults(apps) {
            const resultDiv = document.getElementById('result');
            resultDiv.innerHTML = ''; // Xóa kết quả cũ

            if (apps.length > 0) {
                let output = '<table><tr><th>Icon</th><th>Tên ứng dụng</th><th>Tác giả</th></tr>';
                apps.forEach(app => {
                    output += `<tr>
                        <td><img src="${app.artworkUrl60}" alt="${app.trackName} icon"></td>
                        <td><a href="#" onclick="getAppVersions(${app.trackId}, '${app.trackName}', '${app.artistName}', '${app.version}', '${app.releaseNotes}'); return false;">${app.trackName}</a></td>
                        <td>${app.artistName}</td>
                    </tr>`;
                });
                output += '</table>';
                resultDiv.innerHTML = output;
            } else {
                resultDiv.innerHTML = '<p>Không tìm thấy ứng dụng nào.</p>';
            }
        }

        // Khi click vào ứng dụng trong danh sách kết quả tìm kiếm
        function getAppVersions(appId, appName, artistName, latestVersion, releaseNotes) {
            document.getElementById('appInfo').innerHTML = `
                <h2>Thông tin Ứng dụng</h2>
                <p><strong>Tên:</strong> ${appName}</p>
                <p><strong>Tác giả:</strong> ${artistName}</p>
                <p><strong>Phiên bản mới nhất:</strong> ${latestVersion}</p>
                <p><strong>Mô tả cập nhật:</strong> ${releaseNotes}</p>
            `;

            fetchTimbrdVersion(appId);  // Gọi API của Timbrd để lấy phiên bản
        }

        // Gọi API Timbrd với appId để lấy các phiên bản
        function fetchTimbrdVersion(appId) {
            document.getElementById('loading').style.display = 'block';  // Hiển thị thông báo loading
            fetch(`/api/getAppVersions?id=${appId}`)
                .then(response => response.json())
                .then(data => {
                    if (data && data.length > 0) {
                        versions = data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                        paginateVersions(currentPage);
                    } else {
                        document.getElementById('result').innerHTML = '<p>Không tìm thấy phiên bản nào.</p>';
                    }
                    document.getElementById('loading').style.display = 'none';  // Tắt thông báo loading
                })
                .catch(error => {
                    console.error('Lỗi khi gọi Timbrd API:', error);
                    document.getElementById('result').innerHTML = `<p class="error">Lỗi khi lấy thông tin phiên bản: ${error.message}</p>`;
                    document.getElementById('loading').style.display = 'none';  // Tắt thông báo loading
                });
        }

        function paginateVersions(page) {
            currentPage = page;
            const totalVersions = versions.length;
            const start = (currentPage - 1) * perPage;
            const end = start + perPage;

            const resultDiv = document.getElementById('result');
            resultDiv.innerHTML = '';  // Xóa kết quả trước

            if (totalVersions > 0) {
                let output = '<table><tr><th>Phiên bản</th><th>ID Phiên bản</th><th>Ngày phát hành</th></tr>';
                versions.slice(start, end).forEach(version => {
                    output += `<tr>
                        <td>${version.bundle_version}</td>
                        <td>${version.external_identifier}</td>
                        <td>${version.created_at}</td>
                    </tr>`;
                });
                output += '</table>';
                resultDiv.innerHTML = output;

                // Phân trang
                const paginationDiv = document.getElementById('pagination');
                paginationDiv.innerHTML = '';
                const totalPages = Math.ceil(totalVersions / perPage);

                for (let i = 1; i <= totalPages; i++) {
                    paginationDiv.innerHTML += `<button onclick="changePage(${i})" class="${i === currentPage ? 'active' : ''}">${i}</button>`;
                }
            } else {
                resultDiv.innerHTML = '<p>Không tìm thấy phiên bản nào cho ứng dụng này.</p>';
            }
        }

        function changePage(page) {
            currentPage = page;
            paginateVersions(currentPage);  // Gọi lại phân trang với trang mới
        }
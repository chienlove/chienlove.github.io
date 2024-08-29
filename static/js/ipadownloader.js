let authToken = null;

document.getElementById('downloadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const result = document.getElementById('result');
    result.textContent = 'Đang xử lý...';

    const appleId = document.getElementById('appleId').value;
    const password = document.getElementById('password').value;
    const appId = document.getElementById('appId').value;
    const appVerId = document.getElementById('appVerId').value;
    const code = document.getElementById('code').value;

    if (!authToken) {
        // Nếu chưa có token, thực hiện xác thực
        await authenticate(appleId, password, code);
    }

    if (authToken) {
        // Nếu đã có token, thực hiện tải xuống
        await downloadApp(appId, appVerId);
    }
});

async function authenticate(appleId, password, code) {
    const formData = {
        APPLE_ID: appleId,
        PASSWORD: password,
        CODE: code
    };

    try {
        const response = await fetch('https://ipa-downloader.boypink93.workers.dev/auth', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (data.needsMFA) {
            document.getElementById('mfaInput').style.display = 'block';
            result.textContent = 'Vui lòng nhập mã xác thực';
        } else if (data.token) {
            authToken = data.token;
            result.textContent = 'Xác thực thành công. Bạn có thể tải xuống ứng dụng.';
        } else {
            result.textContent = `Lỗi xác thực: ${data.error || 'Không xác định'}`;
        }
    } catch (error) {
        console.error("Authentication failed:", error);
        result.textContent = `Lỗi xác thực: ${error.message}`;
    }
}

async function downloadApp(appId, appVerId) {
    if (!authToken) {
        result.textContent = 'Vui lòng xác thực trước khi tải xuống.';
        return;
    }

    try {
        const response = await fetch('https://ipa-downloader.boypink93.workers.dev/download', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ APPID: appId, appVerId: appVerId })
        });

        const data = await response.json();

        if (response.ok) {
            result.innerHTML = `Tải xuống thành công: <a href="${data.url}" target="_blank">Tải xuống IPA</a>`;
        } else {
            result.textContent = `Lỗi tải xuống: ${data.error || 'Không xác định'}`;
        }
    } catch (error) {
        console.error("Download failed:", error);
        result.textContent = `Lỗi tải xuống: ${error.message}`;
    }
}
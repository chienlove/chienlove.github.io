document.getElementById('downloadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const result = document.getElementById('result');
    const mfaInput = document.getElementById('mfaInput');
    result.textContent = 'Đang xử lý...';

    const formData = {
        APPLE_ID: document.getElementById('appleId').value,
        PASSWORD: document.getElementById('password').value,
        APPID: document.getElementById('appId').value,
        appVerId: document.getElementById('appVerId').value,
        CODE: document.getElementById('code').value
    };

    console.log("Data being sent:", { ...formData, PASSWORD: '********' });

    try {
        const response = await fetch('https://ipa-downloader.boypink93.workers.dev', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });

        console.log("Raw response:", response);
        const data = await response.json();
        console.log("Parsed response data:", data);

        if (data.needsMFA && !formData.CODE) {
            mfaInput.style.display = 'block';
            result.textContent = 'Vui lòng nhập mã xác thực và bấm "Tải xuống" lại';
        } else if (data.url) {
            result.innerHTML = `Tải xuống thành công: <a href="${data.url}" target="_blank">Tải xuống IPA</a>`;
            document.getElementById('code').value = '';
            mfaInput.style.display = 'none';
        } else {
            result.textContent = `Lỗi: ${data.error || 'Không xác định'}`;
            console.error("Error details:", data);
        }
    } catch (error) {
        console.error("Request failed:", error);
        result.textContent = `Lỗi: ${error.message}`;
    }
});
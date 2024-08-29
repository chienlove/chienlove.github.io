document.getElementById('downloadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const result = document.getElementById('result');
    result.textContent = 'Đang xử lý...';

    const formData = {
        APPLE_ID: document.getElementById('appleId').value,
        PASSWORD: document.getElementById('password').value,
        APPID: document.getElementById('appId').value,
        appVerId: document.getElementById('appVerId').value,
        CODE: document.getElementById('code').value
    };

    console.log("Data being sent:", formData);

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

        if (response.ok) {
            result.innerHTML = `Tải xuống thành công: <a href="${data.url}" target="_blank">Tải xuống IPA</a>`;
        } else {
            result.textContent = `Lỗi: ${data.error}`;
            if (data.details) {
                console.error("Chi tiết lỗi:", data.details);
            }
        }
    } catch (error) {
        console.error("Request failed:", error);
        result.textContent = `Lỗi: ${error.message}`;
    }
});
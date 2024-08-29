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

        if (data.needsMFA) {
            // Hiển thị trường nhập mã MFA
            document.getElementById('mfaInput').style.display = 'block';
            result.textContent = 'Vui lòng nhập mã xác thực';
        } else if (response.ok) {
            result.innerHTML = `Tải xuống thành công: <a href="${data.url}" target="_blank">Tải xuống IPA</a>`;
        } else {
            let errorMessage = data.error || 'Lỗi không xác định';
            if (data.details) {
                errorMessage += '<br>Chi tiết: ' + JSON.stringify(data.details);
            }
            result.innerHTML = `Lỗi: ${errorMessage}`;
            console.error("Error details:", data);
        }
    } catch (error) {
        console.error("Request failed:", error);
        result.textContent = `Lỗi: ${error.message}`;
    }
});
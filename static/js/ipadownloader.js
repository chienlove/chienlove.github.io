document.getElementById('downloadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const result = document.getElementById('result');
    const mfaInput = document.getElementById('mfaInput');
    const submitButton = document.querySelector('button[type="submit"]');
    result.textContent = 'Đang xử lý...';
    submitButton.disabled = true;

    const formData = {
        APPLE_ID: document.getElementById('appleId').value,
        PASSWORD: document.getElementById('password').value,
        APPID: document.getElementById('appId').value,
        appVerId: document.getElementById('appVerId').value,
        CODE: document.getElementById('code').value,
        scnt: localStorage.getItem('scnt'),
        xAppleSessionToken: localStorage.getItem('xAppleSessionToken')
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

        if (data.needsMFA) {
            mfaInput.style.display = 'block';
            localStorage.setItem('scnt', data.scnt);
            localStorage.setItem('xAppleSessionToken', data.xAppleSessionToken);
            result.textContent = `Vui lòng nhập mã xác thực ${data.authType || ''} và bấm "Tải xuống" lại`;
            document.getElementById('password').value = ''; // Clear password field
        } else if (data.url) {
            result.innerHTML = `Tải xuống thành công: <a href="${data.url}" target="_blank">Tải xuống IPA</a>`;
            document.getElementById('code').value = '';
            document.getElementById('password').value = '';
            mfaInput.style.display = 'none';
            localStorage.removeItem('scnt');
            localStorage.removeItem('xAppleSessionToken');
        } else if (data.error) {
            result.textContent = `Lỗi: ${data.error}`;
            console.error("Error details:", data);
            if (data.error.includes('MFA failed')) {
                mfaInput.style.display = 'block';
                result.textContent += '. Vui lòng thử lại mã xác thực.';
            }
        } else {
            result.textContent = 'Lỗi không xác định. Vui lòng thử lại.';
        }
    } catch (error) {
        console.error("Request failed:", error);
        result.textContent = `Lỗi: ${error.message}`;
    } finally {
        submitButton.disabled = false;
    }
});
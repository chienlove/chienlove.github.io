document.getElementById('downloadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const result = document.getElementById('result');
    const mfaInput = document.getElementById('mfaInput');
    const submitButton = document.querySelector('button[type="submit"]');
    result.textContent = 'Đang xử lý...';
    submitButton.disabled = true;

    // Lấy dữ liệu từ các trường
    const formData = {
        APPLE_ID: document.getElementById('appleId').value.trim(),
        PASSWORD: document.getElementById('password').value,
        APPID: document.getElementById('appId').value.trim(),
        appVerId: document.getElementById('appVerId').value.trim(),
        CODE: document.getElementById('code').value.trim(),
        scnt: localStorage.getItem('scnt'),
        xAppleSessionToken: localStorage.getItem('xAppleSessionToken')
    };

    // Kiểm tra các trường bắt buộc
    if (!formData.APPLE_ID || !formData.APPID || !formData.appVerId) {
        result.textContent = 'Vui lòng điền đầy đủ thông tin bắt buộc.';
        submitButton.disabled = false;
        return;
    }

    if (!formData.PASSWORD && !formData.CODE) {
        result.textContent = 'Vui lòng nhập mật khẩu hoặc mã xác thực.';
        submitButton.disabled = false;
        return;
    }

    console.log("Dữ liệu gửi đi:", { ...formData, PASSWORD: '********' });

    try {
        const response = await fetch('https://ipa-downloader.boypink93.workers.dev', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });

        console.log("Phản hồi ban đầu:", response);
        const data = await response.json();
        console.log("Dữ liệu phản hồi đã phân tích:", data);

        if (!response.ok) {
            throw new Error(data.error || `Lỗi HTTP! trạng thái: ${response.status}`);
        }

        if (data.needsMFA) {
            // Yêu cầu nhập mã xác thực MFA
            if (mfaInput) {
                mfaInput.style.display = 'block';
            }
            localStorage.setItem('scnt', data.scnt);
            localStorage.setItem('xAppleSessionToken', data.xAppleSessionToken);
            result.textContent = `Vui lòng nhập mã xác thực ${data.authType || ''} và bấm "Tải xuống" lại`;
            document.getElementById('password').value = ''; // Xóa trường mật khẩu sau khi nhập MFA
        } else if (data.url) {
            // Tải xuống thành công
            result.innerHTML = `Tải xuống thành công: <a href="${data.url}" target="_blank">Tải xuống IPA</a>`;
            document.getElementById('code').value = ''; // Xóa mã xác thực
            document.getElementById('password').value = ''; // Xóa trường mật khẩu
            if (mfaInput) {
                mfaInput.style.display = 'none'; // Ẩn trường MFA
            }
            localStorage.removeItem('scnt'); // Xóa scnt sau khi tải thành công
            localStorage.removeItem('xAppleSessionToken'); // Xóa token phiên
        } else {
            throw new Error(data.error || 'Lỗi không xác định');
        }
    } catch (error) {
        console.error("Yêu cầu thất bại:", error);
        result.textContent = `Lỗi: ${error.message}`;
        if (error.message.includes('Authentication failed')) {
            result.textContent += '. Vui lòng kiểm tra lại thông tin đăng nhập của bạn.';
        }
    } finally {
        submitButton.disabled = false;
    }
});
const fetch = require('node-fetch');

exports.handler = async (event) => {
    try {
        // 1. Kiểm tra headers và body
        if (event.headers['content-type'] !== 'application/json') {
            throw new Error('Chỉ chấp nhận JSON');
        }

        const { workerId, code, password, raw } = JSON.parse(event.body);
        
        // 2. Xác thực
        if (password !== process.env.EDITOR_PASSWORD) {
            return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
        }

        // 3. Chuẩn bị request giống Dashboard
        const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/workers/scripts/${workerId}`;
        
        const apiResponse = await fetch(apiUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
                'Content-Type': 'application/javascript',
                'X-Cloudflare-Intent': 'editor' // Giống Dashboard
            },
            body: code // Gửi nguyên bản
        });

        // 4. Xử lý response giống Dashboard
        const responseText = await apiResponse.text();
        let apiResult;
        
        try {
            apiResult = JSON.parse(responseText);
        } catch {
            throw new Error(`Cloudflare trả về response không hợp lệ: ${responseText.substring(0, 200)}`);
        }

        if (!apiResponse.ok) {
            const error = apiResult.errors?.[0] || {};
            throw new Error(error.message || 'Lỗi không xác định từ Cloudflare');
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                lastModified: new Date().toISOString()
            })
        };
        
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'server_error',
                message: error.message
            })
        };
    }
};
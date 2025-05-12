const fetch = require('node-fetch');

exports.handler = async (event) => {
    try {
        // 1. Xác thực nghiêm ngặt
        if (!event.headers['content-type']?.includes('application/json')) {
            throw new Error('Chỉ chấp nhận JSON');
        }

        const { workerId, code, password } = JSON.parse(event.body);
        
        if (password !== process.env.EDITOR_PASSWORD) {
            throw new Error('Unauthorized');
        }

        // 2. Chuẩn bị code - CÁCH MỚI TRIỆT ĐỂ
        let preparedCode;
        try {
            // Kiểm tra nếu code đã là module ES hợp lệ
            if (/export\s+default\s*\{/.test(code)) {
                preparedCode = code;
            } 
            // Nếu code bắt đầu bằng { và kết thúc bằng } -> object literal
            else if (/^\s*\{[\s\S]*\}\s*$/.test(code)) {
                preparedCode = `export default ${code}`;
            }
            // Trường hợp còn lại -> wrap trong template chuẩn
            else {
                preparedCode = `
export default {
    async fetch(request, env, ctx) {
        ${code}
        return new Response('Hello World');
    }
};`.trim();
            }
        } catch (e) {
            throw new Error(`Lỗi chuẩn bị code: ${e.message}`);
        }

        // 3. Gọi API Cloudflare
        const response = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/workers/scripts/${workerId}`,
            {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
                    'Content-Type': 'application/javascript'
                },
                body: preparedCode
            }
        );

        const data = await response.json();
        
        if (!response.ok) {
            const firstError = data.errors?.[0] || {};
            throw new Error(firstError.message || 'Cloudflare API error');
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
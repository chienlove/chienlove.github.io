const fetch = require('node-fetch');

exports.handler = async (event) => {
    try {
        // Validate request
        const { workerId, code, password } = JSON.parse(event.body);
        
        if (!workerId || !code || !password) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Missing required parameters' }) };
        }

        // Verify password
        if (password !== process.env.EDITOR_PASSWORD) {
            return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
        }

        // Gọi Cloudflare API
        const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/workers/scripts/${workerId}`;
        
        const apiResponse = await fetch(apiUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
                'Content-Type': 'application/javascript'
            },
            body: code // Gửi nguyên bản code đã được chuẩn hóa
        });

        // Cloudflare API thường trả về JSON ngay cả khi có lỗi
        const apiResult = await apiResponse.json();
        
        if (!apiResponse.ok) {
            // Xử lý lỗi đặc biệt từ Cloudflare
            const firstError = apiResult.errors?.[0] || {};
            let errorMessage = firstError.message || 'Unknown API error';
            
            // Nếu là lỗi cú pháp, trích xuất thông tin dòng lỗi
            if (errorMessage.includes('SyntaxError')) {
                const lineMatch = errorMessage.match(/line (\d+)/);
                return {
                    statusCode: 422, // Unprocessable Entity
                    body: JSON.stringify({
                        error: 'syntax_error',
                        message: errorMessage.split('\n')[0],
                        line: lineMatch ? lineMatch[1] : 'unknown'
                    })
                };
            }
            
            return {
                statusCode: apiResponse.status,
                body: JSON.stringify({
                    error: 'api_error',
                    message: errorMessage,
                    details: apiResult.errors
                })
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                lastModified: new Date().toISOString()
            })
        };
        
    } catch (error) {
        console.error('Internal error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'internal_error',
                message: error.message
            })
        };
    }
};
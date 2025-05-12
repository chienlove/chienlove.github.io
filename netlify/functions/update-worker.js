const fetch = require('node-fetch');

exports.handler = async (event) => {
    try {
        // 1. Kiểm tra request cơ bản
        if (!event.body) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Missing request body' }) };
        }

        const { workerId, code, password } = JSON.parse(event.body);
        
        if (!workerId || !code || !password) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Missing required parameters' }) };
        }

        // 2. Xác thực mật khẩu
        if (password !== process.env.EDITOR_PASSWORD) {
            return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
        }

        // 3. Chuẩn bị API request
        const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/workers/scripts/${workerId}`;
        
        console.log(`Updating worker: ${workerId}`);
        console.log(`Code length: ${code.length}`);

        // 4. Gọi Cloudflare API
        const apiResponse = await fetch(apiUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
                'Content-Type': 'application/javascript'
            },
            body: code
        });

        // 5. Xử lý response
        const responseText = await apiResponse.text();
        let apiResult;
        
        try {
            apiResult = JSON.parse(responseText);
        } catch (e) {
            console.error('Failed to parse API response:', responseText);
            return {
                statusCode: 500,
                body: JSON.stringify({
                    error: 'invalid_response',
                    message: 'Cloudflare API returned malformed response',
                    details: responseText.substring(0, 200)
                })
            };
        }

        // 6. Kiểm tra lỗi từ Cloudflare
        if (!apiResponse.ok) {
            console.error('Cloudflare API error:', apiResult);
            
            const firstError = apiResult.errors?.[0] || {};
            let errorMessage = firstError.message || 'Unknown Cloudflare API error';
            
            // Chuẩn hóa thông báo lỗi
            if (errorMessage.includes('SyntaxError')) {
                errorMessage = errorMessage.split('\n')[0];
            }
            
            return {
                statusCode: apiResponse.status,
                body: JSON.stringify({
                    error: 'cloudflare_error',
                    message: errorMessage,
                    details: apiResult.errors
                })
            };
        }

        // 7. Trả về thành công
        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                lastModified: new Date().toISOString()
            })
        };
        
    } catch (error) {
        console.error('Server error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'server_error',
                message: error.message,
                stack: error.stack
            })
        };
    }
};
const fetch = require('node-fetch');

exports.handler = async (event) => {
    try {
        // Validate và parse request
        const { workerId, code, password } = JSON.parse(event.body);
        
        // Verify password
        if (password !== process.env.EDITOR_PASSWORD) {
            return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
        }

        // Gọi Cloudflare API
        const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/workers/scripts/${workerId}`;
        
        console.log(`Đang cập nhật worker ${workerId}...`);
        
        const apiResponse = await fetch(apiUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
                'Content-Type': 'application/javascript'
            },
            body: code
        });

        // Kiểm tra response trước khi parse JSON
        const contentType = apiResponse.headers.get('content-type');
        let apiResult;
        const responseText = await apiResponse.text();
        
        console.log(`API Response status: ${apiResponse.status}`);
        console.log(`API Response content-type: ${contentType}`);
        console.log(`API Response body (first 100 chars): ${responseText.substring(0, 100)}`);
        
        // Parse JSON nếu response là JSON, nếu không xử lý như text
        if (contentType && contentType.includes('application/json')) {
            try {
                apiResult = JSON.parse(responseText);
            } catch (parseError) {
                return {
                    statusCode: 500,
                    body: JSON.stringify({
                        error: 'parse_error',
                        message: 'Không thể parse phản hồi từ API',
                        details: responseText.substring(0, 100)
                    })
                };
            }
        } else {
            // Response không phải JSON - có thể là lỗi xác thực hoặc CORS
            return {
                statusCode: apiResponse.status,
                body: JSON.stringify({
                    error: 'invalid_response',
                    message: 'API trả về định dạng không hỗ trợ',
                    status: apiResponse.status,
                    details: responseText.substring(0, 100)
                })
            };
        }
        
        if (!apiResponse.ok) {
            // Xử lý lỗi SyntaxError đặc biệt
            const firstError = apiResult.errors?.[0] || {};
            if (firstError.message?.includes('SyntaxError')) {
                let line = 'unknown';
                const lineMatch = firstError.message.match(/line (\d+)/);
                if (lineMatch) line = lineMatch[1];
                
                return {
                    statusCode: 422,
                    body: JSON.stringify({
                        error: 'syntax_error',
                        message: firstError.message.split('\n')[0],
                        line: line
                    })
                };
            }
            
            return {
                statusCode: apiResponse.status,
                body: JSON.stringify({
                    error: 'api_error',
                    details: apiResult.errors || 'Unknown API error'
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
                message: error.message,
                stack: error.stack
            })
        };
    }
};
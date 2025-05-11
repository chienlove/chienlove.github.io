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
        const apiResponse = await fetch(apiUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
                'Content-Type': 'application/javascript'
            },
            body: code
        });

        const apiResult = await apiResponse.json();
        
        if (!apiResponse.ok) {
            // Xử lý lỗi SyntaxError đặc biệt
            const firstError = apiResult.errors?.[0] || {};
            if (firstError.message?.includes('SyntaxError')) {
                return {
                    statusCode: 422,
                    body: JSON.stringify({
                        error: 'syntax_error',
                        message: firstError.message.split('\n')[0],
                        line: firstError.message.match(/line (\d+)/)?.[1] || 'unknown'
                    })
                };
            }
            
            return {
                statusCode: apiResponse.status,
                body: JSON.stringify({
                    error: 'api_error',
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
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'internal_error',
                message: error.message
            })
        };
    }
};
const fetch = require('node-fetch');

exports.handler = async (event) => {
    try {
        // CHỈ CHẤP NHẬN JSON
        if (event.headers['content-type'] !== 'application/json') {
            throw new Error('Chỉ chấp nhận dữ liệu JSON');
        }

        const { workerId, code, password } = JSON.parse(event.body);
        
        // XÁC THỰC
        if (password !== process.env.EDITOR_PASSWORD) {
            return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
        }

        // GỌI CLOUDFLARE API CHỈ VỚI CODE
        const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/workers/scripts/${workerId}`;
        
        const apiResponse = await fetch(apiUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
                'Content-Type': 'application/javascript' // QUAN TRỌNG
            },
            body: code // CHỈ GỬI CODE JS
        });

        const apiResult = await apiResponse.json();
        
        if (!apiResponse.ok) {
            return {
                statusCode: apiResponse.status,
                body: JSON.stringify({
                    error: 'cloudflare_error',
                    message: apiResult.errors?.[0]?.message || 'Lỗi không xác định từ Cloudflare'
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
                error: 'server_error',
                message: error.message
            })
        };
    }
};
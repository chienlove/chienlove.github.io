exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method Not Allowed' })
        };
    }

    try {
        const body = JSON.parse(event.body);
        const { code, password, workerId } = body;

        // Validate input
        if (!code || !password || !workerId) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Thiếu tham số bắt buộc: code, password hoặc workerId' })
            };
        }

        // Verify password
        if (password !== process.env.EDITOR_PASSWORD) {
            return {
                statusCode: 401,
                body: JSON.stringify({ error: 'Mật khẩu không đúng' })
            };
        }

        // Update worker on Cloudflare
        const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/workers/scripts/${workerId}`;
        const response = await fetch(apiUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
                'Content-Type': 'application/javascript'
            },
            body: code
        });

        const result = await response.json();

        if (!response.ok) {
            console.error('Cloudflare API Error:', result);
            return {
                statusCode: response.status,
                body: JSON.stringify({ 
                    error: result.errors?.map(e => e.message).join(', ') || 'Cập nhật Worker thất bại'
                })
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ 
                success: true,
                message: 'Worker đã được cập nhật thành công',
                lastModified: new Date().toISOString()
            })
        };
    } catch (error) {
        console.error('Server Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Lỗi máy chủ nội bộ' })
        };
    }
};
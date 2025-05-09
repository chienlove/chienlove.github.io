exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const body = JSON.parse(event.body);
        const code = decodeURIComponent(body.code);
        const password = body.password;
        const workerId = body.workerId || process.env.CLOUDFLARE_WORKER_ID;

        if (!code || !password || !workerId) {
            return { statusCode: 400, body: 'Missing required fields' };
        }

        // Gọi Cloudflare API để cập nhật Worker
        const response = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/workers/scripts/${workerId}`,
            {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
                    'Content-Type': 'application/javascript'
                },
                body: code
            }
        );

        if (!response.ok) throw new Error(await response.text());
        return { statusCode: 200, body: 'Worker updated successfully' };
    } catch (error) {
        return { statusCode: 500, body: error.message };
    }
};
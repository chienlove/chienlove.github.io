const fetch = require('node-fetch');

exports.handler = async (event) => {
    // 1. Validate request
    if (!event.body) {
        console.error('Request body is missing');
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Request body is required' })
        };
    }

    let workerId, code, password;
    try {
        const body = JSON.parse(event.body);
        workerId = body.workerId;
        code = body.code;
        password = body.password;
    } catch (e) {
        console.error('JSON parse error:', e);
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Invalid JSON format' })
        };
    }

    // 2. Validate required fields
    if (!workerId || !code || !password) {
        console.error('Missing required fields:', { workerId, code: !!code, password: !!password });
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Missing required fields' })
        };
    }

    // 3. Authenticate
    if (password !== process.env.EDITOR_PASSWORD) {
        console.error('Authentication failed');
        return {
            statusCode: 401,
            body: JSON.stringify({ error: 'Unauthorized' })
        };
    }

    // 4. Prepare Cloudflare API request
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;
    const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${workerId}`;

    console.log(`Attempting to update worker: ${workerId}`);
    console.log(`Code length: ${code.length}`);

    try {
        // 5. Make API call to Cloudflare
        const apiResponse = await fetch(apiUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${apiToken}`,
                'Content-Type': 'application/javascript'
            },
            body: code
        });

        // 6. Process response
        const responseText = await apiResponse.text();
        console.log(`Cloudflare API response: ${responseText.substring(0, 200)}...`);

        let apiResult;
        try {
            apiResult = JSON.parse(responseText);
        } catch (e) {
            console.error('Failed to parse Cloudflare response:', responseText);
            return {
                statusCode: 502,
                body: JSON.stringify({
                    error: 'invalid_cloudflare_response',
                    message: 'Cloudflare returned invalid JSON',
                    details: responseText.substring(0, 200)
                })
            };
        }

        // 7. Handle Cloudflare errors
        if (!apiResponse.ok) {
            const firstError = apiResult.errors?.[0] || {};
            console.error('Cloudflare API error:', firstError);

            return {
                statusCode: apiResponse.status,
                body: JSON.stringify({
                    error: 'cloudflare_error',
                    message: firstError.message || 'Unknown Cloudflare error',
                    code: firstError.code,
                    details: apiResult.errors
                })
            };
        }

        // 8. Success response
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
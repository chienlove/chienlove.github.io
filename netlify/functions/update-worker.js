const fetch = require('node-fetch');

exports.handler = async (event) => {
    // 1. Validate request
    if (!event.body) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Missing request body' })
        };
    }

    let workerId, code, password;
    try {
        const body = JSON.parse(event.body);
        workerId = body.workerId;
        code = body.code;
        password = body.password;
    } catch (e) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Invalid JSON format' })
        };
    }

    // 2. Validate required fields
    if (!workerId || !code || !password) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Missing required fields' })
        };
    }

    // 3. Authenticate
    if (password !== process.env.EDITOR_PASSWORD) {
        return {
            statusCode: 401,
            body: JSON.stringify({ error: 'Unauthorized' })
        };
    }

    // 4. Prepare Cloudflare API request
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;
    const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${workerId}`;

    try {
        // 5. First check if worker exists
        const checkResponse = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!checkResponse.ok) {
            const errorData = await checkResponse.json();
            return {
                statusCode: 404,
                body: JSON.stringify({
                    error: 'worker_not_found',
                    message: 'Worker does not exist or you have no permission',
                    details: errorData.errors
                })
            };
        }

        // 6. Now update the worker
        const updateResponse = await fetch(apiUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${apiToken}`,
                'Content-Type': 'application/javascript',
                'X-Cloudflare-Workers-Script-Name': workerId
            },
            body: code
        });

        // 7. Handle response
        const responseText = await updateResponse.text();
        let responseData;

        try {
            responseData = JSON.parse(responseText);
        } catch (e) {
            return {
                statusCode: 500,
                body: JSON.stringify({
                    error: 'invalid_response',
                    message: 'Cloudflare returned invalid JSON',
                    details: responseText.substring(0, 200)
                })
            };
        }

        if (!updateResponse.ok) {
            const firstError = responseData.errors?.[0] || {};
            return {
                statusCode: updateResponse.status,
                body: JSON.stringify({
                    error: 'cloudflare_error',
                    message: firstError.message || 'Unknown Cloudflare error',
                    code: firstError.code,
                    details: responseData.errors
                })
            };
        }

        // 8. Success
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
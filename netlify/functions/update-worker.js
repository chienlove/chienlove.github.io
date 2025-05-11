const fetch = require('node-fetch');

exports.handler = async (event) => {
    // Debug log (ẩn password nhạy cảm)
    const requestBody = event.body ? JSON.parse(event.body) : {};
    const logBody = {...requestBody};
    if (logBody.password) logBody.password = '******';
    
    console.log('Request received:', {
        method: event.httpMethod,
        path: event.path,
        body: logBody,
        codeLength: requestBody.code?.length || 0
    });

    try {
        // 1. Validate HTTP Method
        if (event.httpMethod !== 'POST') {
            throw new Error('Only POST requests are accepted');
        }

        // 2. Parse and Validate Body
        const { workerId, code, password } = JSON.parse(event.body);
        
        if (!workerId || !code || !password) {
            throw new Error('Missing required fields: workerId, code or password');
        }

        // 3. Verify Password
        if (password !== process.env.EDITOR_PASSWORD) {
            throw new Error('Invalid password');
        }

        // 4. Validate Worker ID format
        if (!/^[a-z0-9_-]+$/i.test(workerId)) {
            throw new Error('Invalid Worker ID format');
        }

        // 5. Call Cloudflare API
        const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/workers/scripts/${workerId}`;
        
        console.log('Calling Cloudflare API for worker:', workerId);
        console.log('Code preview:', code.substring(0, 50) + '...');

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
            const errorDetails = apiResult.errors?.[0] || {};
            console.error('Cloudflare API Error:', {
                status: apiResponse.status,
                workerId,
                codeLength: code.length,
                error: errorDetails
            });

            let errorMessage = 'Cloudflare API Error: ';
            if (errorDetails.code === 10034) {
                errorMessage += `Syntax error at line ${errorDetails.message.match(/line (\d+)/)?.[1] || 'unknown'}`;
            } else {
                errorMessage += errorDetails.message || 'Unknown error';
            }

            throw new Error(errorMessage);
        }

        console.log('Update successful for worker:', workerId);
        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                workerId,
                lastModified: new Date().toISOString()
            }),
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        };

    } catch (error) {
        console.error('Error processing request:', error.message);
        return {
            statusCode: error.message.includes('Invalid password') ? 401 : 
                      error.message.includes('Missing') ? 400 : 500,
            body: JSON.stringify({
                error: 'update_failed',
                message: error.message,
                workerId: requestBody.workerId || 'unknown'
            }),
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        };
    }
};
const fetch = require('node-fetch');

exports.handler = async (event) => {
    console.log('Incoming request:', {
        method: event.httpMethod,
        path: event.path,
        body: event.body ? JSON.parse(event.body) : null
    });

    try {
        // 1. Validate HTTP Method
        if (event.httpMethod !== 'POST') {
            return {
                statusCode: 405,
                body: JSON.stringify({
                    error: 'method_not_allowed',
                    message: 'Only POST requests are accepted'
                }),
                headers: {
                    'Content-Type': 'application/json'
                }
            };
        }

        // 2. Parse and Validate Body
        let body;
        try {
            body = JSON.parse(event.body);
        } catch (e) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: 'invalid_json',
                    message: 'Invalid JSON format in request body'
                }),
                headers: {
                    'Content-Type': 'application/json'
                }
            };
        }

        // 3. Check Required Fields
        const requiredFields = ['code', 'password', 'workerId'];
        const missingFields = requiredFields.filter(field => !body[field]);
        if (missingFields.length > 0) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: 'missing_fields',
                    message: `Missing required fields: ${missingFields.join(', ')}`
                }),
                headers: {
                    'Content-Type': 'application/json'
                }
            };
        }

        // 4. Verify Password
        if (body.password !== process.env.EDITOR_PASSWORD) {
            return {
                statusCode: 401,
                body: JSON.stringify({
                    error: 'unauthorized',
                    message: 'Invalid password'
                }),
                headers: {
                    'Content-Type': 'application/json'
                }
            };
        }

        // 5. Prepare Cloudflare API Request
        const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/workers/scripts/${body.workerId}`;
        
        console.log('Calling Cloudflare API with:', {
            workerId: body.workerId,
            codeLength: body.code.length
        });

        // 6. Make API Call
        const apiResponse = await fetch(apiUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
                'Content-Type': 'application/javascript'
            },
            body: body.code
        });

        // 7. Handle API Response
        const apiResult = await apiResponse.json();
        
        if (!apiResponse.ok) {
            console.error('Cloudflare API Error:', apiResult);
            return {
                statusCode: apiResponse.status,
                body: JSON.stringify({
                    error: 'cloudflare_api_error',
                    message: apiResult.errors?.map(e => e.message).join(' | ') || 'Unknown Cloudflare API error',
                    details: apiResult.errors
                }),
                headers: {
                    'Content-Type': 'application/json'
                }
            };
        }

        // 8. Success Response
        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                message: 'Worker updated successfully',
                lastModified: new Date().toISOString(),
                workerId: body.workerId
            }),
            headers: {
                'Content-Type': 'application/json'
            }
        };

    } catch (error) {
        console.error('Server Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'internal_server_error',
                message: error.message
            }),
            headers: {
                'Content-Type': 'application/json'
            }
        };
    }
};
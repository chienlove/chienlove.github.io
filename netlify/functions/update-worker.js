const fetch = require('node-fetch');

exports.handler = async (event) => {
    // Debug log
    console.log('Incoming request:', {
        method: event.httpMethod,
        path: event.path,
        headers: event.headers,
        body: event.body ? JSON.parse(event.body) : null
    });

    try {
        // 1. Validate HTTP Method
        if (event.httpMethod !== 'POST') {
            return respond(405, {
                error: 'method_not_allowed',
                message: 'Only POST requests are accepted'
            });
        }

        // 2. Parse and Validate Body
        let body;
        try {
            body = JSON.parse(event.body);
        } catch (e) {
            return respond(400, {
                error: 'invalid_json',
                message: 'Invalid JSON format in request body'
            });
        }

        // 3. Check Required Fields
        const requiredFields = ['code', 'password', 'workerId'];
        const missingFields = requiredFields.filter(field => !body[field]);
        if (missingFields.length > 0) {
            return respond(400, {
                error: 'missing_fields',
                message: `Missing required fields: ${missingFields.join(', ')}`
            });
        }

        // 4. Verify Password
        if (body.password !== process.env.EDITOR_PASSWORD) {
            return respond(401, {
                error: 'unauthorized',
                message: 'Invalid password'
            });
        }

        // 5. Prepare Cloudflare API Request
        const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/workers/scripts/${body.workerId}`;
        console.log('Calling Cloudflare API:', apiUrl);
        console.log('Code length:', body.code.length);

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
        console.log('Cloudflare API response:', {
            status: apiResponse.status,
            data: apiResult
        });

        if (!apiResponse.ok) {
            const errorMessages = apiResult.errors?.map(e => e.message) || ['Unknown Cloudflare API error'];
            return respond(apiResponse.status, {
                error: 'cloudflare_api_error',
                message: errorMessages.join(' | '),
                details: apiResult
            });
        }

        // 8. Success Response
        return respond(200, {
            success: true,
            message: 'Worker updated successfully',
            lastModified: new Date().toISOString(),
            workerId: body.workerId
        });

    } catch (error) {
        console.error('Server Error:', {
            message: error.message,
            stack: error.stack
        });
        return respond(500, {
            error: 'internal_server_error',
            message: error.message,
            ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
        });
    }
};

// Helper function for consistent responses
function respond(statusCode, body) {
    return {
        statusCode,
        body: JSON.stringify(body),
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
    };
}
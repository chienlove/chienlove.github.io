exports.handler = async (event) => {
    // Log request info
    console.log('Incoming request:', {
        method: event.httpMethod,
        headers: event.headers,
        body: event.body
    });

    try {
        // Validate HTTP method
        if (event.httpMethod !== 'POST') {
            return respond(405, {
                error: 'method_not_allowed',
                message: 'Only POST requests are accepted'
            });
        }

        // Parse request body
        let body;
        try {
            body = JSON.parse(event.body);
        } catch (e) {
            return respond(400, {
                error: 'invalid_json',
                message: 'Invalid JSON format'
            });
        }

        // Validate required fields
        const requiredFields = ['code', 'password', 'workerId'];
        const missingFields = requiredFields.filter(field => !body[field]);
        if (missingFields.length) {
            return respond(400, {
                error: 'missing_fields',
                message: `Missing required fields: ${missingFields.join(', ')}`,
                required: requiredFields
            });
        }

        // Verify password
        if (body.password !== process.env.EDITOR_PASSWORD) {
            return respond(401, {
                error: 'unauthorized',
                message: 'Invalid password'
            });
        }

        // Prepare Cloudflare API request
        const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/workers/scripts/${body.workerId}`;
        const apiHeaders = {
            'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
            'Content-Type': 'application/javascript'
        };

        console.log('Making request to:', apiUrl);
        const apiResponse = await fetch(apiUrl, {
            method: 'PUT',
            headers: apiHeaders,
            body: body.code
        });

        const apiResult = await apiResponse.json();
        console.log('Cloudflare API response:', apiResult);

        if (!apiResponse.ok) {
            return respond(apiResponse.status, {
                error: 'cloudflare_api_error',
                message: 'Failed to update worker',
                details: apiResult.errors || 'Unknown error'
            });
        }

        // Success response
        return respond(200, {
            success: true,
            message: 'Worker updated successfully',
            lastModified: new Date().toISOString(),
            workerId: body.workerId
        });

    } catch (error) {
        console.error('Server error:', error);
        return respond(500, {
            error: 'server_error',
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
            'Access-Control-Allow-Origin': '*'
        }
    };
}
exports.handler = async (event) => {
    // Log request info for debugging
    console.log('Request Headers:', event.headers);
    console.log('Request Method:', event.httpMethod);
    
    try {
        // Validate HTTP Method
        if (event.httpMethod !== 'POST') {
            return respond(405, {
                error: 'METHOD_NOT_ALLOWED',
                message: 'Only POST requests are accepted'
            });
        }

        // Parse and validate request body
        let body;
        try {
            body = JSON.parse(event.body);
        } catch (e) {
            return respond(400, {
                error: 'INVALID_JSON',
                message: 'Request body must be valid JSON'
            });
        }

        // Check required fields
        const requiredFields = ['code', 'password', 'workerId'];
        const missingFields = requiredFields.filter(field => !body[field]);
        if (missingFields.length) {
            return respond(400, {
                error: 'MISSING_FIELDS',
                message: `Missing required fields: ${missingFields.join(', ')}`,
                required: requiredFields
            });
        }

        // Verify password
        if (body.password !== process.env.EDITOR_PASSWORD) {
            return respond(401, {
                error: 'UNAUTHORIZED',
                message: 'Invalid password'
            });
        }

        // Prepare Cloudflare API request
        const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
        const apiToken = process.env.CLOUDFLARE_API_TOKEN;
        const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${body.workerId}`;
        
        console.log('Making request to Cloudflare API:', apiUrl);
        
        const apiResponse = await fetch(apiUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${apiToken}`,
                'Content-Type': 'application/javascript'
            },
            body: body.code
        });

        const apiResult = await apiResponse.json();
        console.log('Cloudflare API Response:', apiResult);

        if (!apiResponse.ok) {
            const errors = apiResult.errors || [{ message: 'Unknown Cloudflare API error' }];
            return respond(apiResponse.status, {
                error: 'CLOUDFLARE_API_ERROR',
                message: 'Failed to update worker',
                details: {
                    errors: errors.map(e => e.message),
                    response: apiResult
                }
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
        console.error('SERVER ERROR:', error);
        return respond(500, {
            error: 'INTERNAL_SERVER_ERROR',
            message: error.message,
            ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
        });
    }
};

// Helper function for consistent response format
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
const fetch = require('node-fetch');

exports.handler = async (event) => {
    // Debug log incoming request (ẩn password)
    const requestBody = event.body ? JSON.parse(event.body) : null;
    console.log('Incoming request:', {
        method: event.httpMethod,
        path: event.path,
        body: {
            ...requestBody,
            password: requestBody?.password ? '******' : undefined
        }
    });

    try {
        // 1. Validate HTTP Method
        if (event.httpMethod !== 'POST') {
            return formatResponse(405, {
                error: 'method_not_allowed',
                message: 'Chỉ hỗ trợ yêu cầu POST'
            });
        }

        // 2. Parse and Validate Body
        let body;
        try {
            body = JSON.parse(event.body);
        } catch (e) {
            return formatResponse(400, {
                error: 'invalid_json',
                message: 'Dữ liệu JSON không hợp lệ'
            });
        }

        // 3. Check Required Fields
        const requiredFields = ['code', 'password', 'workerId'];
        const missingFields = requiredFields.filter(field => !body[field]);
        if (missingFields.length > 0) {
            return formatResponse(400, {
                error: 'missing_fields',
                message: `Thiếu các trường bắt buộc: ${missingFields.join(', ')}`
            });
        }

        // 4. Verify Password
        if (body.password !== process.env.EDITOR_PASSWORD) {
            return formatResponse(401, {
                error: 'unauthorized',
                message: 'Mật khẩu không chính xác'
            });
        }

        // 5. Validate Worker ID format
        if (!/^[a-z0-9_-]+$/.test(body.workerId)) {
            return formatResponse(400, {
                error: 'invalid_worker_id',
                message: 'Worker ID chỉ được chứa chữ thường, số, dấu gạch ngang và gạch dưới'
            });
        }

        // 6. Prepare Cloudflare API Request
        const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/workers/scripts/${body.workerId}`;
        
        console.log('Calling Cloudflare API for worker:', body.workerId);
        console.log('Code length:', body.code.length, 'characters');

        // 7. Make API Call
        const apiResponse = await fetch(apiUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
                'Content-Type': 'application/javascript'
            },
            body: body.code
        });

        // 8. Handle API Response
        const apiResult = await apiResponse.json();
        
        if (!apiResponse.ok) {
            console.error('Cloudflare API Error:', {
                status: apiResponse.status,
                workerId: body.workerId,
                errors: apiResult.errors,
                codePreview: body.code.substring(0, 100) + '...'
            });

            // Xử lý các lỗi phổ biến của Cloudflare
            const firstError = apiResult.errors?.[0] || {};
            let userMessage = 'Lỗi khi cập nhật Worker';
            
            switch (firstError.code) {
                case 10021:
                    userMessage = 'Worker không tồn tại hoặc không có quyền truy cập';
                    break;
                case 10034:
                    userMessage = `Lỗi cú pháp: ${firstError.message.split('\n')[0]}`;
                    break;
                case 10000:
                    userMessage = 'Script vượt quá giới hạn kích thước';
                    break;
                default:
                    userMessage = firstError.message || userMessage;
            }

            return formatResponse(apiResponse.status, {
                error: 'cloudflare_api_error',
                message: userMessage,
                details: apiResult.errors
            });
        }

        // 9. Success Response
        console.log('Worker updated successfully:', body.workerId);
        return formatResponse(200, {
            success: true,
            message: 'Cập nhật Worker thành công',
            lastModified: new Date().toISOString(),
            workerId: body.workerId
        });

    } catch (error) {
        console.error('Unexpected Error:', {
            message: error.message,
            stack: error.stack,
            workerId: requestBody?.workerId || 'unknown'
        });
        return formatResponse(500, {
            error: 'internal_server_error',
            message: 'Lỗi hệ thống không mong muốn'
        });
    }
};

// Helper function for consistent responses
function formatResponse(statusCode, body) {
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
exports.handler = async (event) => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  try {
    // Validate HTTP method
    if (event.httpMethod !== 'POST') {
      return respond(405, {
        error: 'method_not_allowed',
        message: 'Chỉ chấp nhận POST request'
      });
    }

    // Parse request body
    let body;
    try {
      body = JSON.parse(event.body);
    } catch (e) {
      return respond(400, {
        error: 'invalid_json',
        message: 'Dữ liệu không phải JSON hợp lệ'
      });
    }

    // Validate required fields
    const requiredFields = ['code', 'password', 'workerId'];
    const missingFields = requiredFields.filter(field => !body[field]);
    if (missingFields.length) {
      return respond(400, {
        error: 'missing_fields',
        message: `Thiếu trường bắt buộc: ${missingFields.join(', ')}`
      });
    }

    // Verify password
    if (body.password !== process.env.EDITOR_PASSWORD) {
      return respond(401, {
        error: 'unauthorized',
        message: 'Mật khẩu không đúng'
      });
    }

    // Call Cloudflare API
    const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/workers/scripts/${body.workerId}`;
    console.log('Calling Cloudflare API:', apiUrl);
    
    const apiResponse = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/javascript'
      },
      body: body.code
    });

    const apiResult = await apiResponse.json();
    console.log('Cloudflare API response:', apiResult);

    if (!apiResponse.ok) {
      const errorMessages = apiResult.errors?.map(e => e.message) || ['Lỗi không xác định từ Cloudflare'];
      return respond(apiResponse.status, {
        error: 'cloudflare_error',
        message: errorMessages.join(' | ')
      });
    }

    // Success response
    return respond(200, {
      success: true,
      message: 'Cập nhật Worker thành công',
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
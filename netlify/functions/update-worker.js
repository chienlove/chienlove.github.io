const fetch = require('node-fetch');

function prepareWorkerCode(code) {
    // 1. Remove BOM if exists
    if (code.charCodeAt(0) === 0xFEFF) {
        code = code.slice(1);
    }
    
    // 2. Normalize line endings to LF
    code = code.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // 3. Trim whitespace
    code = code.trim();
    
    // 4. Remove invisible Unicode characters
    code = code.replace(/[\u200B-\u200D\uFEFF]/g, '');
    
    // 5. Ensure it's in proper ES module format
    if (!code.includes('export default') && !code.includes('export {')) {
        // If it's a simple function, wrap it in export default
        if (code.match(/^(async\s+)?function\s+\w+\s*\(/)) {
            code = `export default ${code}`;
        } else if (code.match(/^\(.*\)\s*=>/)) {
            code = `export default ${code}`;
        } else {
            // Otherwise, wrap in standard worker format
            code = `export default {
  async fetch(request, env, ctx) {
    ${code}
    return new Response('Hello World!');
  },
};`;
        }
    }
    
    return code;
}

exports.handler = async (event) => {
    try {
        // Only accept JSON
        if (!event.headers['content-type']?.includes('application/json')) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Chỉ chấp nhận dữ liệu JSON' })
            };
        }

        const { workerId, code, password } = JSON.parse(event.body);
        
        // Validate input
        if (!workerId || !code || !password) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Thiếu thông tin bắt buộc' })
            };
        }

        // Authentication
        if (password !== process.env.EDITOR_PASSWORD) {
            return { 
                statusCode: 401, 
                body: JSON.stringify({ error: 'Unauthorized' }) 
            };
        }

        // Prepare code for Cloudflare
        const preparedCode = prepareWorkerCode(code);

        // Call Cloudflare API
        const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/workers/scripts/${workerId}`;
        
        const apiResponse = await fetch(apiUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
                'Content-Type': 'application/javascript'
            },
            body: preparedCode
        });

        const apiResult = await apiResponse.json();
        
        if (!apiResponse.ok) {
            // Extract the first error message if available
            const errorMessage = apiResult.errors?.[0]?.message || 'Lỗi không xác định từ Cloudflare';
            
            // Clean up syntax error messages
            const cleanMessage = errorMessage.split('\n')[0];
            
            return {
                statusCode: apiResponse.status,
                body: JSON.stringify({
                    error: 'cloudflare_error',
                    message: cleanMessage
                })
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                lastModified: new Date().toISOString()
            })
        };
        
    } catch (error) {
        console.error('Error in worker update:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'server_error',
                message: error.message || 'Lỗi máy chủ nội bộ'
            })
        };
    }
};
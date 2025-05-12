const fetch = require('node-fetch');

function prepareWorkerCode(code) {
    // Always wrap in standard worker format to avoid syntax issues
    return `export default {
  async fetch(request, env, ctx) {
    try {
      ${code.trim()}
      return new Response('OK');
    } catch (err) {
      return new Response(err.stack, { status: 500 });
    }
  }
};`;
}

exports.handler = async (event) => {
    try {
        // Validate input
        if (!event.headers['content-type']?.includes('application/json')) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Invalid content type' }) };
        }

        const { workerId, code, password } = JSON.parse(event.body);
        if (!workerId || !code || !password) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Missing parameters' }) };
        }

        // Authentication
        if (password !== process.env.EDITOR_PASSWORD) {
            return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
        }

        // Prepare code - STRICT MODE
        const preparedCode = prepareWorkerCode(code);
        console.log("DEBUG - Prepared code:", preparedCode);

        // Call Cloudflare API
        const response = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/workers/scripts/${workerId}`,
            {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
                    'Content-Type': 'application/javascript'
                },
                body: preparedCode
            }
        );

        const result = await response.json();
        
        if (!response.ok) {
            // Extract and clean error message
            const errorMsg = result.errors?.[0]?.message || 'Unknown Cloudflare error';
            const cleanMsg = errorMsg.split('\n')[0].replace(/at worker\.js:\d+:\d+/g, '');
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: 'cloudflare_error', message: cleanMsg })
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
        console.error('FATAL ERROR:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                error: 'server_error',
                message: error.message 
            })
        };
    }
};
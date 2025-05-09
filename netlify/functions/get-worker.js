const { CloudflareWorkerAPI } = require('./cloudflare-api');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    // Xác thực
    const password = event.queryStringParameters?.password || 
                     event.headers['x-editor-password'];
    
    if (password !== process.env.EDITOR_PASSWORD) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }
    
    // Lấy worker_id từ query params
    const workerId = event.queryStringParameters?.worker_id || 
                     process.env.CLOUDFLARE_WORKER_ID;

    if (!workerId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Worker ID is required' })
      };
    }

    const apiToken = process.env.CLOUDFLARE_API_TOKEN;
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;

    if (!apiToken || !accountId) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Missing environment variables' })
      };
    }

    const api = new CloudflareWorkerAPI(apiToken, accountId);
    const workerContent = await api.getWorkerCode(workerId);

    return {
      statusCode: 200,
      body: JSON.stringify({ code: workerContent }),
      headers: {
        'Content-Type': 'application/json'
      }
    };
  } catch (error) {
    console.error('Error fetching worker code:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch worker code' })
    };
  }
};
const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    // Xác thực qua query param hoặc header
    const password = event.queryStringParameters?.password || 
                     event.headers['x-editor-password'];
    
    if (password !== process.env.EDITOR_PASSWORD) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized' })
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

    // Gọi API Cloudflare để lấy danh sách workers
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to fetch workers: ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    
    // Chỉ trả về thông tin cần thiết
    const workers = data.result.map(worker => ({
      id: worker.id,
      name: worker.name || worker.id,
      lastModified: worker.last_modified || 'Unknown'
    }));

    return {
      statusCode: 200,
      body: JSON.stringify({ workers }),
      headers: {
        'Content-Type': 'application/json'
      }
    };
  } catch (error) {
    console.error('Error fetching workers:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch workers list' })
    };
  }
};
console.log('Env vars:', {
  EDITOR_PASSWORD: !!process.env.EDITOR_PASSWORD,
  CLOUDFLARE_API_TOKEN: !!process.env.CLOUDFLARE_API_TOKEN,
  CLOUDFLARE_ACCOUNT_ID: !!process.env.CLOUDFLARE_ACCOUNT_ID
});
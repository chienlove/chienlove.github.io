// netlify/functions/authenticate.js
const axios = require('axios');

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { appleId, password } = JSON.parse(event.body);
    
    // Step 1: Get X-Apple-Session-Token
    const authResponse = await axios.post('https://idmsa.apple.com/appleauth/auth/signin', {
      accountName: appleId,
      password: password,
      rememberMe: true
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-Apple-Widget-Key': process.env.APPLE_WIDGET_KEY, // Bạn cần thêm biến này vào Netlify Environment Variables
        'Accept': 'application/json'
      }
    });

    const sessionToken = authResponse.headers['x-apple-session-token'];

    // Step 2: Get list of purchased apps
    const purchasesResponse = await axios.get('https://apps.apple.com/WebObjects/MZFinance.woa/wa/purchasesService', {
      headers: {
        'Cookie': `X-Apple-Session-Token=${sessionToken}`,
        'Accept': 'application/json'
      }
    });

    // Transform the response to match our expected format
    const apps = purchasesResponse.data.items.map(item => ({
      id: item.itemId,
      name: item.title,
      bundleId: item.bundleId,
      version: item.version
    }));

    return {
      statusCode: 200,
      body: JSON.stringify({ apps })
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to authenticate',
        details: error.message 
      })
    };
  }
};
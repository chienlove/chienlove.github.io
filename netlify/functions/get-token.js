const axios = require('axios');

exports.handler = async function(event, context) {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: ''
    };
  }

  // Validate request method
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  console.log("get-token function called");

  try {
    // Validate request body
    if (!event.body) {
      throw new Error('Missing request body');
    }

    // Parse and validate code from request body
    const { code } = JSON.parse(event.body);
    if (!code) {
      throw new Error('Missing authorization code');
    }

    console.log("Received code:", code);

    // Request access token from GitHub
    const tokenResponse = await axios.post('https://github.com/login/oauth/access_token', {
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code: code
    }, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    });

    console.log("Token response received");

    const { access_token, error_description } = tokenResponse.data;

    // Check for error in GitHub response
    if (!access_token) {
      throw new Error(error_description || 'Failed to get access token from GitHub');
    }

    // Validate token by making a test API call
    try {
      await axios.get('https://api.github.com/user', {
        headers: {
          Authorization: `token ${access_token}`,
          Accept: 'application/vnd.github.v3+json'
        }
      });
      console.log("Token validated successfully");
    } catch (error) {
      console.error("Token validation failed:", error.response?.data);
      throw new Error('Invalid token received from GitHub');
    }

    // Return successful response with token
    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        access_token,
        token_type: 'bearer'
      })
    };

  } catch (error) {
    // Error handling with appropriate status codes
    console.error("Error in get-token function:", error);
    
    const statusCode = error.response?.status || 500;
    const errorMessage = error.message || 'Internal Server Error';

    return {
      statusCode,
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: errorMessage,
        details: error.response?.data || {}
      })
    };
  }
};
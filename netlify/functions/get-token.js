const axios = require('axios');

exports.handler = async function (event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };

  // Handle preflight request
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const code = body.code;

    if (!code) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing authorization code' })
      };
    }

    // Exchange code for access token
    const tokenRes = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code
      },
      {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        }
      }
    );

    const { access_token, error_description } = tokenRes.data;

    if (!access_token) {
      throw new Error(error_description || 'Failed to retrieve access token');
    }

    // Validate token
    await axios.get('https://api.github.com/user', {
      headers: {
        Authorization: `token ${access_token}`,
        Accept: 'application/vnd.github.v3+json'
      }
    });

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ access_token, token_type: 'bearer' })
    };
  } catch (err) {
    console.error('OAuth Error:', err.response?.data || err.message);
    return {
      statusCode: err.response?.status || 500,
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: err.message || 'Internal Server Error',
        details: err.response?.data || {}
      })
    };
  }
};
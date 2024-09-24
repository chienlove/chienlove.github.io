const axios = require('axios');

exports.handler = async function(event, context) {
  console.log("get-token function called");
  
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { code } = JSON.parse(event.body);
    console.log("Received code:", code);

    const tokenResponse = await axios.post('https://github.com/login/oauth/access_token', {
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code: code
    }, {
      headers: {
        Accept: 'application/json'
      }
    });

    console.log("Token response:", tokenResponse.data);

    const accessToken = tokenResponse.data.access_token;

    if (!accessToken) {
      console.error("No access token in response");
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No access token received' })
      };
    }

    // Kiểm tra tính hợp lệ của token
    try {
      const userResponse = await axios.get('https://api.github.com/user', {
        headers: {
          Authorization: `token ${accessToken}`
        }
      });
      console.log("User data fetched successfully");
    } catch (error) {
      console.error("Error validating token:", error.response.data);
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid token' })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ access_token: accessToken })
    };
  } catch (error) {
    console.error("Error in get-token function:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to get access token' })
    };
  }
};
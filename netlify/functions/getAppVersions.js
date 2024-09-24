const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  const appId = event.queryStringParameters.id;  // Lấy appId từ query string
  if (!appId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'App ID is required' }),
    };
  }

  const apiUrl = `https://api.timbrd.com/apple/app-version/index.php?id=${appId}`;

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();
    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch data' }),
    };
  }
};
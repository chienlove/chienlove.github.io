const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  const url = 'https://ipa-apps.me';
  
  try {
    const response = await fetch(url, { headers: { 'Cache-Control': 'no-cache' } });
    const text = await response.text();

    let status = 'revoked';
    if (text.toLowerCase().includes('signed')) {
      status = 'signed';
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ status }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error fetching data' }),
    };
  }
};
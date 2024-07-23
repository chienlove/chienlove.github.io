const fetch = require('node-fetch');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const response = await fetch(`https://api.github.com/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/dispatches`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${process.env.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify({
        event_type: 'upload',
        client_payload: {
          file_url: 'URL_TO_UPLOADED_FILE' // Bạn cần thay thế cái này bằng URL thực tế của file đã upload
        }
      })
    });

    if (response.ok) {
      return { statusCode: 200, body: JSON.stringify({ message: 'GitHub Action triggered successfully' }) };
    } else {
      throw new Error('Failed to trigger GitHub Action');
    }
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
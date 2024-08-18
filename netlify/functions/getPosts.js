const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  const token = event.headers.authorization.replace("Bearer ", "");

  try {
    const response = await fetch('https://api.github.com/repos/chienlove/chienlove.github.io/contents/content/posts', {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3.raw'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch posts');
    }

    const files = await response.json();
    const posts = files.map(file => ({
      title: file.name,
      path: file.path
    }));

    return {
      statusCode: 200,
      body: JSON.stringify(posts),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
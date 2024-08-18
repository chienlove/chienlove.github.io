const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  const token = event.headers.authorization.replace("Bearer ", "");
  const { title, content } = JSON.parse(event.body);

  try {
    const response = await fetch('https://api.github.com/repos/chienlove/chienlove.github.io/contents/content/posts/' + title + '.md', {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Create new post: ${title}`,
        content: Buffer.from(content).toString('base64'),
        branch: 'master' // Thay thế bằng nhánh chính của bạn
      })
    });

    if (!response.ok) {
      throw new Error('Failed to create post');
    }

    return {
      statusCode: 201,
      body: JSON.stringify({ message: 'Post created successfully' }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
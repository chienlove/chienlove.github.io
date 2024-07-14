const fs = require('fs');
const path = require('path');

exports.handler = async function(event, context) {
  console.log('Function started');
  try {
    // Sử dụng đường dẫn tương đối
    const postsDirectory = path.join(__dirname, '..', '..', 'content', 'apps');
    console.log('Posts directory:', postsDirectory);

    // Kiểm tra xem thư mục có tồn tại không
    if (!fs.existsSync(postsDirectory)) {
      console.error('Directory does not exist:', postsDirectory);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Posts directory not found' }),
      };
    }

    // Rest of your code...
  } catch (error) {
    console.error('Error in function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `An internal server error occurred: ${error.message}` }),
    };
  }
};
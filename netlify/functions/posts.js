const fs = require('fs');
const path = require('path');

exports.handler = async function(event, context) {
  console.log('Function started');
  try {
    // Sử dụng process.env.LAMBDA_TASK_ROOT để lấy đường dẫn gốc của function
    const postsDirectory = path.join(process.env.LAMBDA_TASK_ROOT, 'content/apps');
    console.log('Posts directory:', postsDirectory);

    // Kiểm tra xem thư mục có tồn tại không
    if (!fs.existsSync(postsDirectory)) {
      console.error('Directory does not exist:', postsDirectory);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Posts directory not found' }),
      };
    }

    const filenames = fs.readdirSync(postsDirectory);
    console.log('Files found:', filenames);

    const posts = filenames
      .filter(filename => filename.endsWith('.md'))
      .map(filename => {
        const filePath = path.join(postsDirectory, filename);
        try {
          const fileContents = fs.readFileSync(filePath, 'utf8');
          const match = fileContents.match(/title:\s*(.*)/);
          const title = match ? match[1].trim() : 'No title';
          return {
            title: title,
            link: `/apps/${filename.replace('.md', '')}`,
          };
        } catch (readError) {
          console.error(`Error reading file ${filename}:`, readError);
          return null;
        }
      })
      .filter(Boolean);

    console.log('Posts processed:', posts);
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: JSON.stringify({ posts }),
    };
  } catch (error) {
    console.error('Error in function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `An internal server error occurred: ${error.message}` }),
    };
  }
};
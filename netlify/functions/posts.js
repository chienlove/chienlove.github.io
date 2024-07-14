const fs = require('fs');
const path = require('path');

exports.handler = async function(event, context) {
  try {
    const postsDirectory = path.join(__dirname, '/../../content/apps');
    const filenames = fs.readdirSync(postsDirectory);
    
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
          console.error(`Error reading file ${filename}: ${readError.message}`);
          return null;
        }
      })
      .filter(Boolean); // Remove any null entries from failed reads

    return {
      statusCode: 200,
      body: JSON.stringify({ posts }),
    };
  } catch (error) {
    console.error(`General error: ${error.message}`);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'An internal server error occurred' }),
    };
  }
};
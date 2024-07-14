const fs = require('fs');
const path = require('path');

exports.handler = async function(event, context) {
  try {
    console.log('Starting handler function');
    
    const postsDirectory = path.join(__dirname, '/../../content/apps');
    console.log('Posts directory:', postsDirectory);
    
    console.log('Attempting to read directory');
    const filenames = fs.readdirSync(postsDirectory);
    console.log('Files found:', filenames);
    
    const posts = filenames
      .filter(filename => filename.endsWith('.md'))
      .map(filename => {
        const filePath = path.join(postsDirectory, filename);
        console.log('Processing file:', filePath);
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
      .filter(Boolean);
    
    console.log('Processed posts:', posts);
    
    return {
      statusCode: 200,
      body: JSON.stringify({ posts }),
    };
  } catch (error) {
    console.error(`General error: ${error.message}`);
    console.error(`Error stack: ${error.stack}`);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `An internal server error occurred: ${error.message}` }),
    };
  }
};
const fs = require('fs');
const path = require('path');

exports.handler = async function(event, context) {
  try {
    const postsDirectory = path.join(__dirname, '/../../content/apps');
    const filenames = fs.readdirSync(postsDirectory);

    const posts = filenames.map(filename => {
      const filePath = path.join(postsDirectory, filename);
      const fileContents = fs.readFileSync(filePath, 'utf8');

      // Extract the title from the Markdown front matter
      const match = fileContents.match(/title:\s*(.*)/);
      const title = match ? match[1] : 'No title';

      return {
        title: title,
        link: `/apps/${filename.replace('.md', '')}`,
      };
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ posts }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
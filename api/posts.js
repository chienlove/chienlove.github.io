const fs = require('fs');
const path = require('path');

const postsDirectory = path.join(__dirname, '..', 'content', 'apps');

exports.handler = async function(event, context) {
  try {
    const filenames = fs.readdirSync(postsDirectory);
    const posts = filenames.map(filename => {
      const filePath = path.join(postsDirectory, filename);
      const fileContents = fs.readFileSync(filePath, 'utf8');
      const [metadata, body] = fileContents.split('---\n')[2].split('\n\n');
      const metadataLines = metadata.split('\n').filter(Boolean);
      const metadataObject = {};
      metadataLines.forEach(line => {
        const [key, value] = line.split(': ');
        metadataObject[key.trim()] = value.trim();
      });
      return {
        ...metadataObject,
        body
      };
    });
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
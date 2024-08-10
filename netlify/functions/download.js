const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

exports.handler = async function(event, context) {
  const appId = event.queryStringParameters.appId;
  
  if (!appId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'AppId is required' })
    };
  }

  try {
    const contentDir = path.join(__dirname, '..', '..', 'content', 'jailbreak-tools');
    const files = fs.readdirSync(contentDir);

    for (const file of files) {
      const filePath = path.join(contentDir, file);
      const fileContents = fs.readFileSync(filePath, 'utf8');
      const { data } = matter(fileContents);

      if (data.versions) {
        const version = data.versions.find(v => v.appId === appId);
        if (version) {
          const redirectUrl = version.plistUrl;
          return {
            statusCode: 302,
            headers: {
              Location: redirectUrl
            }
          };
        }
      }
    }

    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'App not found' })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error', details: error.message })
    };
  }
};
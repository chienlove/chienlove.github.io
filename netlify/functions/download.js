const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

exports.handler = async function(event, context) {
  const appId = event.queryStringParameters.appId;
  const contentDir = path.join(__dirname, '../../content/jailbreak-tools');

  try {
    const files = fs.readdirSync(contentDir);
    for (const file of files) {
      const filePath = path.join(contentDir, file);
      const fileContents = fs.readFileSync(filePath, 'utf8');
      const { data } = matter(fileContents);

      if (data.versions) {
        for (const version of data.versions) {
          if (version.appId === appId) {
            const redirectUrl = version.intermediate_page_url.replace(':appId', appId);
            return {
              statusCode: 302,
              headers: {
                Location: redirectUrl
              }
            };
          }
        }
      }
    }

    return {
      statusCode: 404,
      body: 'App not found'
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: 'Internal Server Error'
    };
  }
};
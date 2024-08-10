const fetch = require('node-fetch');
const matter = require('gray-matter');

exports.handler = async function(event, context) {
  const appId = event.queryStringParameters.appId;
  const repo = 'chienlove/chienlove.github.io';
  const contentDir = 'content/jailbreak-tools';
  const token = process.env.GITHUB_TOKEN;

  if (!appId) {
    return {
      statusCode: 400,
      body: 'AppId is required'
    };
  }

  try {
    // Fetch the content of the directory
    const response = await fetch(`https://api.github.com/repos/${repo}/contents/${contentDir}`, {
      headers: {
        'Authorization': `token ${token}`
      }
    });
    const files = await response.json();

    for (const file of files) {
      // Get the content of each file
      const fileResponse = await fetch(file.download_url);
      const fileContents = await fileResponse.text();
      const { data } = matter(fileContents);

      // Check the appId in the file data
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
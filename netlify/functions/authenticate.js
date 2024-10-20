// netlify/functions/authenticate.js
const { execFile } = require('child_process');
const util = require('util');
const path = require('path');
const execFileAsync = util.promisify(execFile);

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { appleId, password } = JSON.parse(event.body);
    
    // Xác định đường dẫn đến ipatool
    const ipatoolPath = path.join(__dirname, '../bin/ipatool-2.1.4-linux-amd64');
    
    // Use ipatool to authenticate
    const { stdout } = await execFileAsync(ipatoolPath, ['auth', 'login', '--apple-id', appleId, '--password', password]);
    
    // Parse the output to get the session information
    const sessionInfo = JSON.parse(stdout);

    // Use ipatool to get the list of purchased apps
    const { stdout: appsOutput } = await execFileAsync(ipatoolPath, ['list', '--purchased']);
    
    // Parse the output to get the list of apps
    const apps = JSON.parse(appsOutput).map(app => ({
      id: app.adamId,
      name: app.name,
      bundleId: app.bundleId,
      version: app.version
    }));

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        apps,
        sessionInfo
      })
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to authenticate',
        details: error.message 
      })
    };
  }
};
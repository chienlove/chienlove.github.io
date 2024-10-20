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
    const { appleId, password, verificationCode } = JSON.parse(event.body);
    
    // Đường dẫn trực tiếp đến file ipatool
    const ipatoolPath = path.join(__dirname, 'bin', 'ipatool-2.1.4-linux-amd64');
    
    // Set HOME environment variable to /tmp
    process.env.HOME = '/tmp';

    // Chuẩn bị command array
    const command = ['auth', 'login', '--apple-id', appleId, '--password', password];
    if (verificationCode) {
      command.push('--verification-code', verificationCode);
    }

    try {
      // Use ipatool to authenticate
      const { stdout } = await execFileAsync(ipatoolPath, command);
      
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
      // Check if error message indicates 2FA is required
      if (error.message.includes('2FA')) {
        return {
          statusCode: 401,
          body: JSON.stringify({
            error: 'Two-factor authentication required',
            requires2FA: true
          })
        };
      }
      throw error;
    }
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
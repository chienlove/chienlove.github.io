const { execFile } = require('child_process');
const util = require('util');
const path = require('path');
const fs = require('fs');
const execFileAsync = util.promisify(execFile);

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const { appleId, password, verificationCode, sessionInfo } = JSON.parse(event.body);
    const ipatoolPath = path.join(process.cwd(), 'netlify', 'functions', 'bin', 'ipatool');

    if (!fs.existsSync(ipatoolPath)) {
      throw new Error('ipatool binary not found at: ' + ipatoolPath);
    }

    process.env.HOME = '/tmp';

    let result = null;
    let command = [];

    if (!verificationCode) {
      // Lần đầu login
      command = [
        'auth',
        'login',
        '--email', appleId,
        '--password', password,
        '--format', 'json'
      ];

      const { stdout } = await execFileAsync(ipatoolPath, command);
      result = JSON.parse(stdout);

      if (result.error && (result.error.includes('2FA') || result.error.includes('verification'))) {
        return {
          statusCode: 401,
          body: JSON.stringify({
            error: 'Two-factor authentication required',
            requires2FA: true,
            sessionInfo: result.sessionInfo || result
          })
        };
      }
    } else {
      // Submit mã xác thực
      if (!sessionInfo) {
        throw new Error('Missing session info for verification');
      }

      command = [
        'auth',
        'submit-verification-code',
        '--code', verificationCode,
        '--session-info', JSON.stringify(sessionInfo),
        '--format', 'json'
      ];

      const { stdout } = await execFileAsync(ipatoolPath, command);
      result = JSON.parse(stdout);

      if (result.error) {
        throw new Error(result.error);
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        sessionInfo: result,
        apps: []
      })
    };

  } catch (error) {
    console.error('Authentication error:', error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Authentication failed',
        details: error.message
      })
    };
  }
};
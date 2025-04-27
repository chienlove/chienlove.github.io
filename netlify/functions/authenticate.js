// netlify/functions/authenticate.js
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

    let command = [];
    let result = null;

    if (!verificationCode) {
      // Nếu chưa có mã 2FA => chỉ đăng nhập
      command = [
        'auth',
        'login',
        '--email', appleId,
        '--password', password,
        '--format', 'json'
      ];

      console.log('Executing auth login:', [ipatoolPath, ...command].join(' '));

      const { stdout } = await execFileAsync(ipatoolPath, command);
      result = JSON.parse(stdout);

      if (result.error && (result.error.includes('2FA') || result.error.includes('verification'))) {
        return {
          statusCode: 401,
          body: JSON.stringify({
            error: 'Two-factor authentication required',
            requires2FA: true,
            sessionInfo: result.sessionInfo || result // trả luôn sessionInfo để xác thực sau
          })
        };
      }
    } else {
      // Nếu có mã 2FA => submit mã
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

      console.log('Executing submit verification:', [ipatoolPath, ...command].join(' '));

      const { stdout } = await execFileAsync(ipatoolPath, command);
      result = JSON.parse(stdout);

      if (result.error) {
        throw new Error(result.error);
      }
    }

    // Sau khi login hoặc submit 2FA thành công => trả về
    return {
      statusCode: 200,
      body: JSON.stringify({
        sessionInfo: result,
        apps: [] // apps sẽ lấy ở bước khác
      })
    };

  } catch (error) {
    console.error('Authentication error:', error);

    let statusCode = 500;
    let errorMessage = error.message;

    if (error.message.includes('Invalid credentials')) {
      statusCode = 401;
      errorMessage = 'Invalid Apple ID or password';
    }

    return {
      statusCode,
      body: JSON.stringify({
        error: 'Authentication failed',
        details: errorMessage
      })
    };
  }
};
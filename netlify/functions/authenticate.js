const { execFile } = require('child_process');
const util = require('util');
const path = require('path');
const fs = require('fs');
const execFileAsync = util.promisify(execFile);

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const { appleId, password, verificationCode } = JSON.parse(event.body);
    const ipatoolPath = path.join(process.cwd(), 'netlify', 'functions', 'bin', 'ipatool');

    // Verify ipatool exists
    if (!fs.existsSync(ipatoolPath)) {
      throw new Error('ipatool binary not found');
    }

    process.env.HOME = '/tmp';

    // Build command with proper escaping
    const command = [
      'auth',
      'login',
      '--email', appleId,
      '--password', password,
      '--format', 'json'
    ];

    if (verificationCode) {
      command.push('--verification-code', verificationCode);
    }

    console.log('Executing command with timeout');
    const { stdout, stderr } = await execFileAsync(ipatoolPath, command, {
      timeout: 30000,
      maxBuffer: 1024 * 1024 * 5
    });

    console.log('Command output:', stdout);
    const result = JSON.parse(stdout);

    // Enhanced 2FA detection
    if (result.error) {
      const twoFactorIndicators = [
        'verification',
        'two-factor',
        '2fa',
        'code',
        'additional verification'
      ];

      const requires2FA = twoFactorIndicators.some(indicator => 
        result.error.toLowerCase().includes(indicator)
      );

      if (requires2FA) {
        return {
          statusCode: 200,
          body: JSON.stringify({
            status: '2fa_required',
            message: 'Please enter the 6-digit verification code sent to your trusted device',
            requires2FA: true
          })
        };
      }

      throw new Error(result.error);
    }

    // Success case
    return {
      statusCode: 200,
      body: JSON.stringify({
        sessionInfo: result,
        apps: [] // Bạn cần thêm logic lấy danh sách app ở đây
      })
    };

  } catch (error) {
    console.error('Full error:', {
      message: error.message,
      stderr: error.stderr,
      stdout: error.stdout
    });

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Authentication failed',
        details: error.message.includes('ETIMEDOUT') 
          ? 'Request timed out. Please try again.' 
          : error.message
      })
    };
  }
};
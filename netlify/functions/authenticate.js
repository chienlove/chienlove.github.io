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

    // Build command
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

    // Execute with timeout
    const { stdout, stderr } = await execFileAsync(ipatoolPath, command, {
      timeout: 25000,
      maxBuffer: 1024 * 1024 * 5
    });

    // Parse response
    const result = JSON.parse(stdout);

    // Handle 2FA
    if (result.error) {
      const twoFactorTerms = ['verification', 'two-factor', '2fa', 'code'];
      const requires2FA = twoFactorTerms.some(term => 
        result.error.toLowerCase().includes(term)
      );

      if (requires2FA) {
        return {
          statusCode: 200,
          body: JSON.stringify({
            status: '2fa_required',
            message: result.error,
            requires2FA: true
          })
        };
      }

      throw new Error(result.error);
    }

    // Get apps list
    const { stdout: appsStdout } = await execFileAsync(ipatoolPath, [
      'list',
      '--purchased',
      '--format', 'json',
      '--session-info', JSON.stringify(result)
    ], { timeout: 25000 });

    return {
      statusCode: 200,
      body: JSON.stringify({
        apps: JSON.parse(appsStdout).map(app => ({
          id: app.adamId,
          name: app.name,
          bundleId: app.bundleId,
          version: app.version
        })),
        sessionInfo: result
      })
    };

  } catch (error) {
    console.error('Full error:', {
      message: error.message,
      stack: error.stack,
      stderr: error.stderr?.toString(),
      stdout: error.stdout?.toString()
    });

    return {
      statusCode: error.code === 'ETIMEDOUT' ? 504 : 401,
      body: JSON.stringify({
        error: 'Authentication failed',
        details: error.message,
        requires2FA: false
      })
    };
  }
};
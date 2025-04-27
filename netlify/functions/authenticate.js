// netlify/functions/authenticate.js
const { execFile } = require('child_process');
const util = require('util');
const path = require('path');
const fs = require('fs');
const execFileAsync = util.promisify(execFile);

exports.handler = async function(event, context) {
  // 1. Kiểm tra phương thức HTTP
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    // 2. Parse thông tin từ client
    const { appleId, password, verificationCode } = JSON.parse(event.body);
    console.log('Authentication request for:', appleId);

    // 3. Cấu hình đường dẫn ipatool
    const ipatoolPath = path.join(process.cwd(), 'netlify', 'functions', 'bin', 'ipatool');
    console.log('ipatool path:', ipatoolPath);

    // 4. Kiểm tra file ipatool tồn tại (không set quyền thực thi)
    if (!fs.existsSync(ipatoolPath)) {
      throw new Error('ipatool binary not found at: ' + ipatoolPath);
    }
    // Đã bỏ dòng fs.chmodSync vì không thể thay đổi quyền trong môi trường read-only

    // 5. Thiết lập biến môi trường
    process.env.HOME = '/tmp'; // Yêu cầu bởi ipatool

    // 6. Chuẩn bị lệnh auth login
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

    console.log('Executing command:', [ipatoolPath, ...command].join(' '));

    // 7. Thực thi lệnh
    const { stdout, stderr } = await execFileAsync(ipatoolPath, command);
    console.log('stderr:', stderr);
    
    // Check if stdout is valid JSON
    let result;
    try {
      result = JSON.parse(stdout);
      console.log('stdout parsed successfully');
    } catch (parseError) {
      console.error('Error parsing stdout:', parseError);
      console.log('Raw stdout:', stdout);
      
      // Check for common 2FA patterns in raw output
      if (stdout.includes('2FA') || 
          stdout.includes('verification') || 
          stdout.includes('two factor') || 
          stdout.includes('two-factor') ||
          stderr.includes('2FA') || 
          stderr.includes('verification') || 
          stderr.includes('two factor') || 
          stderr.includes('two-factor')) {
        return {
          statusCode: 401,
          body: JSON.stringify({
            error: 'Two-factor authentication required',
            requires2FA: true
          })
        };
      }
      
      throw new Error('Invalid response from authentication tool: ' + stdout);
    }
    
    if (result.error) {
      // Expanded check for 2FA requirement
      if (result.error.includes('2FA') || 
          result.error.includes('verification') || 
          result.error.includes('two factor') || 
          result.error.includes('two-factor') ||
          result.error.includes('code') ||
          result.error.includes('verify')) {
        return {
          statusCode: 401,
          body: JSON.stringify({
            error: 'Two-factor authentication required',
            requires2FA: true
          })
        };
      }
      throw new Error(result.error);
    }

    // 9. Lấy danh sách ứng dụng đã mua
    const appsCommand = [
      'list',
      '--purchased',
      '--format', 'json',
      '--session-info', stdout
    ];

    try {
      const { stdout: appsStdout } = await execFileAsync(ipatoolPath, appsCommand);
      
      // Validate JSON before parsing
      let appsData;
      try {
        appsData = JSON.parse(appsStdout);
      } catch (parseError) {
        console.error('Error parsing apps stdout:', parseError);
        console.log('Raw apps stdout:', appsStdout);
        throw new Error('Invalid response when fetching apps list');
      }

      // 10. Trả về kết quả
      return {
        statusCode: 200,
        body: JSON.stringify({
          apps: appsData.map(app => ({
            id: app.adamId,
            name: app.name,
            bundleId: app.bundleId,
            version: app.version
          })),
          sessionInfo: result
        })
      };
    } catch (appsError) {
      console.error('Error fetching apps:', appsError);
      throw new Error('Failed to fetch apps list: ' + appsError.message);
    }

  } catch (error) {
    console.error('Authentication error:', error);
    
    // Expanded error detection patterns
    let statusCode = 500;
    let errorMessage = error.message;
    let requires2FA = false;

    // Check for 2FA or verification requirements in the error
    if (error.message.includes('2FA') || 
        error.message.includes('verification') || 
        error.message.includes('two factor') || 
        error.message.includes('two-factor') ||
        error.message.includes('code') ||
        error.message.includes('verify')) {
      statusCode = 401;
      errorMessage = 'Two-factor authentication required';
      requires2FA = true;
    } else if (error.message.includes('Invalid credentials') || 
               error.message.includes('password') || 
               error.message.includes('unauthorized')) {
      statusCode = 401;
      errorMessage = 'Invalid Apple ID or password';
    } else if (error.message.includes('pattern')) {
      statusCode = 400;
      errorMessage = 'Invalid input format. Please check your credentials format.';
    }

    return {
      statusCode,
      body: JSON.stringify({
        error: 'Authentication failed',
        details: errorMessage,
        requires2FA
      })
    };
  }
};
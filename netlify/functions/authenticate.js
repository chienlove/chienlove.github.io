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

    // 4. Kiểm tra file ipatool tồn tại và có quyền thực thi
    if (!fs.existsSync(ipatoolPath)) {
      throw new Error('ipatool binary not found at: ' + ipatoolPath);
    }
    fs.chmodSync(ipatoolPath, 0o755); // Đảm bảo có quyền thực thi

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
    console.log('stdout:', stdout);
    console.log('stderr:', stderr);

    // 8. Parse kết quả
    const result = JSON.parse(stdout);
    
    if (result.error) {
      // Xử lý yêu cầu 2FA
      if (result.error.includes('2FA') || result.error.includes('verification')) {
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

    const { stdout: appsStdout } = await execFileAsync(ipatoolPath, appsCommand);
    const appsData = JSON.parse(appsStdout);

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

  } catch (error) {
    console.error('Authentication error:', error);
    
    // Phân loại lỗi
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
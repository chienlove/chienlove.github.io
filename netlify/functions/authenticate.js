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

    // 4. Kiểm tra file ipatool tồn tại
    if (!fs.existsSync(ipatoolPath)) {
      throw new Error('ipatool binary not found at: ' + ipatoolPath);
    }

    // 5. Thiết lập biến môi trường
    process.env.HOME = '/tmp'; // Yêu cầu bởi ipatool
    console.log('Environment:', {
      HOME: process.env.HOME,
      PATH: process.env.PATH
    });

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

    // 7. Thực thi lệnh với timeout
    const { stdout, stderr } = await execFileAsync(ipatoolPath, command, { timeout: 30000 });
    console.log('Command output:', { stdout, stderr });

    // 8. Parse kết quả
    let result;
    try {
      result = JSON.parse(stdout);
    } catch (parseError) {
      console.error('Failed to parse stdout:', stdout);
      throw new Error('Invalid response from authentication service');
    }
    
    if (result.error) {
      // Xử lý yêu cầu 2FA
      const lowerError = result.error.toLowerCase();
      if (lowerError.includes('2fa') || lowerError.includes('verification') || lowerError.includes('code')) {
        return {
          statusCode: 401,
          body: JSON.stringify({
            error: 'Two-factor authentication required',
            requires2FA: true,
            message: result.error
          })
        };
      }
      
      // Xử lý thông báo lỗi không đúng credentials
      if (lowerError.includes('invalid') || lowerError.includes('incorrect')) {
        return {
          statusCode: 401,
          body: JSON.stringify({
            error: 'Invalid Apple ID or password',
            details: result.error,
            requires2FA: false
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
      '--session-info', JSON.stringify(result)
    ];

    console.log('Executing apps command:', [ipatoolPath, ...appsCommand].join(' '));
    const { stdout: appsStdout } = await execFileAsync(ipatoolPath, appsCommand, { timeout: 30000 });
    
    let appsData;
    try {
      appsData = JSON.parse(appsStdout);
    } catch (parseError) {
      console.error('Failed to parse apps stdout:', appsStdout);
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

  } catch (error) {
    console.error('Authentication error:', error);
    
    // Phân loại lỗi
    let statusCode = 500;
    let errorMessage = error.message;

    if (error.message.toLowerCase().includes('invalid credentials') || 
        error.message.toLowerCase().includes('invalid apple id')) {
      statusCode = 401;
      errorMessage = 'Invalid Apple ID or password';
    } else if (error.message.toLowerCase().includes('timeout')) {
      errorMessage = 'Request timed out. Please try again.';
    }

    return {
      statusCode,
      body: JSON.stringify({
        error: 'Authentication failed',
        details: errorMessage,
        requires2FA: false
      })
    };
  }
};
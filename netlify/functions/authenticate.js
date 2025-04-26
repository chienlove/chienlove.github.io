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
    console.log('Verification code provided:', verificationCode ? 'Yes' : 'No');

    // 3. Cấu hình đường dẫn ipatool
    const ipatoolPath = path.join(process.cwd(), 'netlify', 'functions', 'bin', 'ipatool');
    console.log('ipatool path:', ipatoolPath);

    // 4. Kiểm tra file ipatool tồn tại
    if (!fs.existsSync(ipatoolPath)) {
      throw new Error('ipatool binary not found at: ' + ipatoolPath);
    }

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

    console.log('Executing command:', [ipatoolPath, ...command.map(arg => 
      arg === password ? '********' : arg)].join(' '));

    // 7. Thực thi lệnh
    try {
      const { stdout, stderr } = await execFileAsync(ipatoolPath, command);
      
      // Kiểm tra stderr trước để phát hiện thông báo lỗi
      if (stderr && stderr.length > 0) {
        console.log('stderr output:', stderr);
        
        // Kiểm tra 2FA trong stderr
        if (stderr.includes('2FA') || 
            stderr.includes('verification') || 
            stderr.includes('code') ||
            stderr.includes('two factor') ||
            stderr.includes('two-factor')) {
          return {
            statusCode: 401,
            body: JSON.stringify({
              error: 'Two-factor authentication required',
              requires2FA: true,
              message: 'Yêu cầu xác thực hai yếu tố'
            })
          };
        }
      }
      
      console.log('stdout available:', !!stdout);
      
      // Cố gắng parse JSON từ stdout
      let result;
      try {
        result = JSON.parse(stdout);
      } catch (parseError) {
        console.error('Error parsing stdout as JSON:', parseError);
        console.log('Raw stdout:', stdout);
        
        // Kiểm tra 2FA trong stdout raw
        if (stdout.includes('2FA') || 
            stdout.includes('verification') || 
            stdout.includes('code') ||
            stdout.includes('two factor') ||
            stdout.includes('two-factor')) {
          return {
            statusCode: 401,
            body: JSON.stringify({
              error: 'Two-factor authentication required',
              requires2FA: true,
              message: 'Yêu cầu xác thực hai yếu tố'
            })
          };
        }
        
        throw new Error('Invalid JSON response from authentication tool');
      }
      
      // Kiểm tra lỗi trong kết quả JSON
      if (result.error) {
        console.log('Error detected in result:', result.error);
        
        // Kiểm tra 2FA trong thông báo lỗi
        if (result.error.includes('2FA') || 
            result.error.includes('verification') || 
            result.error.includes('code') ||
            result.error.includes('two factor') ||
            result.error.includes('two-factor')) {
          return {
            statusCode: 401,
            body: JSON.stringify({
              error: 'Two-factor authentication required',
              requires2FA: true,
              message: 'Yêu cầu xác thực hai yếu tố'
            })
          };
        }
        
        throw new Error(result.error);
      }
      
      // Thành công - lấy danh sách ứng dụng
      console.log('Authentication successful, fetching apps list');
      
      const appsCommand = [
        'list',
        '--purchased',
        '--format', 'json',
        '--session-info', stdout
      ];
      
      const { stdout: appsStdout } = await execFileAsync(ipatoolPath, appsCommand);
      let appsData;
      
      try {
        appsData = JSON.parse(appsStdout);
      } catch (parseError) {
        console.error('Error parsing apps stdout:', parseError);
        throw new Error('Invalid response when fetching apps list');
      }
      
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
      
    } catch (execError) {
      // Xử lý lỗi từ execFile
      console.error('Execution error:', execError);
      console.log('Error message:', execError.message);
      console.log('Error stdout:', execError.stdout);
      console.log('Error stderr:', execError.stderr);
      
      // Kiểm tra 2FA trong stdout và stderr của lỗi
      const errorOutput = (execError.stdout || '') + (execError.stderr || '');
      
      if (errorOutput.includes('2FA') || 
          errorOutput.includes('verification') || 
          errorOutput.includes('code') ||
          errorOutput.includes('two factor') ||
          errorOutput.includes('two-factor')) {
        return {
          statusCode: 401,
          body: JSON.stringify({
            error: 'Two-factor authentication required',
            requires2FA: true,
            message: 'Yêu cầu xác thực hai yếu tố'
          })
        };
      }
      
      throw execError;
    }

  } catch (error) {
    console.error('Authentication error:', error);
    
    // FORCE 2FA FOR TESTING - XÓA SAU KHI KIỂM TRA
    // Dòng dưới đây sẽ luôn yêu cầu 2FA cho mục đích kiểm thử
    // Hãy xóa sau khi đã xác minh rằng frontend hiển thị đúng trường 2FA
    return {
      statusCode: 401,
      body: JSON.stringify({
        error: 'Two-factor authentication required',
        requires2FA: true,
        message: 'Yêu cầu xác thực hai yếu tố'
      })
    };
    
    // Phân loại lỗi
    let statusCode = 500;
    let errorMessage = error.message;
    
    if (error.message.includes('Invalid credentials') || 
        error.message.includes('unauthorized') || 
        error.message.includes('password')) {
      statusCode = 401;
      errorMessage = 'Apple ID hoặc mật khẩu không hợp lệ';
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
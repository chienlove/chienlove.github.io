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
    console.log('Authentication request for:', appleId, 'with verification code:', verificationCode ? 'YES' : 'NO');

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

    console.log('Executing command:', ipatoolPath, command.filter(arg => !arg.includes(password)).join(' '));

    // 7. Thực thi lệnh
    let stdout, stderr;
    try {
      const result = await execFileAsync(ipatoolPath, command);
      stdout = result.stdout;
      stderr = result.stderr;
      console.log('Command executed successfully');
    } catch (execError) {
      console.error('Execution error:', execError.message);
      // Đôi khi lỗi xảy ra nhưng vẫn có output
      stdout = execError.stdout || '';
      stderr = execError.stderr || '';
      
      // Kiểm tra xem có phải là lỗi 2FA không
      if (stdout.includes('2FA') || 
          stdout.includes('verification') || 
          stderr.includes('2FA') || 
          stderr.includes('verification') ||
          stderr.includes('factor')) {
        console.log('Detected 2FA requirement from execution error');
        return {
          statusCode: 401,
          body: JSON.stringify({
            error: 'Yêu cầu xác thực hai yếu tố',
            requires2FA: true,
            rawError: execError.message
          })
        };
      }
      
      // Rethrow nếu không phải lỗi 2FA
      if (!stdout && !stderr) {
        throw execError;
      }
    }
    
    console.log('Raw stdout:', stdout);
    console.log('Raw stderr:', stderr);
    
    // Kiểm tra lỗi 2FA trong stderr trước
    if (stderr && (
        stderr.includes('2FA') || 
        stderr.includes('verification') || 
        stderr.includes('factor') ||
        stderr.includes('code'))) {
      console.log('Detected 2FA requirement from stderr');
      return {
        statusCode: 401,
        body: JSON.stringify({
          error: 'Yêu cầu xác thực hai yếu tố',
          requires2FA: true,
          debug: { stderr }
        })
      };
    }
    
    // Kiểm tra có lỗi 2FA trong stdout không (trước khi parse)
    if (stdout && (
        stdout.toLowerCase().includes('2fa') || 
        stdout.toLowerCase().includes('verification') || 
        stdout.toLowerCase().includes('factor') ||
        stdout.toLowerCase().includes('verification code'))) {
      console.log('Detected 2FA requirement from raw stdout');
      return {
        statusCode: 401,
        body: JSON.stringify({
          error: 'Yêu cầu xác thực hai yếu tố',
          requires2FA: true,
          debug: { stdout: stdout.substring(0, 200) } // Chỉ gửi 200 ký tự đầu để tránh quá lớn
        })
      };
    }

    // Parse kết quả stdout thành JSON nếu có thể
    let result;
    try {
      result = JSON.parse(stdout);
      console.log('Parsed result:', JSON.stringify(result, null, 2).substring(0, 500));
    } catch (parseError) {
      console.error('Error parsing stdout:', parseError);
      
      // Trường hợp đặc biệt: có thể là yêu cầu 2FA nhưng không trả về JSON
      if (stdout.includes('2FA') || 
          stdout.includes('verification') || 
          stdout.includes('factor') ||
          stdout.includes('code')) {
        console.log('Detected possible 2FA requirement after JSON parse error');
        return {
          statusCode: 401,
          body: JSON.stringify({
            error: 'Yêu cầu xác thực hai yếu tố',
            requires2FA: true,
            parseError: parseError.message
          })
        };
      }
      
      throw new Error('Không thể xử lý phản hồi từ công cụ xác thực: ' + parseError.message);
    }
    
    // Kiểm tra lỗi trong kết quả JSON đã parse
    if (result.error) {
      console.log('Found error in parsed result:', result.error);
      
      // Kiểm tra xem có phải lỗi 2FA không
      if (result.error.toLowerCase().includes('2fa') || 
          result.error.toLowerCase().includes('verification') || 
          result.error.toLowerCase().includes('factor') ||
          result.error.toLowerCase().includes('code')) {
        console.log('Detected 2FA requirement from parsed error');
        return {
          statusCode: 401,
          body: JSON.stringify({
            error: result.error,
            requires2FA: true
          })
        };
      }
      
      throw new Error(result.error);
    }

    // THÊM: Kiểm tra xác nhận 2FA TRƯỚC khi lấy danh sách ứng dụng
    if (result.authType === '2FA' || 
        (result.sessionData && result.sessionData.authType === '2FA') ||
        stdout.includes('verification required')) {
      console.log('Detected 2FA from session info');
      return {
        statusCode: 401,
        body: JSON.stringify({
          error: 'Yêu cầu xác thực hai yếu tố',
          requires2FA: true
        })
      };
    }

    console.log('Authentication successful, retrieving app list');
    
    try {
      // 9. Lấy danh sách ứng dụng đã mua
      const appsCommand = [
        'list',
        '--purchased',
        '--format', 'json'
      ];
      
      // Thêm thông tin phiên (cách truyền có thể khác nhau tùy vào ipatool)
      if (typeof result === 'object') {
        appsCommand.push('--session-info', JSON.stringify(result));
      } else {
        appsCommand.push('--session-info', stdout);
      }

      console.log('Executing apps list command');
      const { stdout: appsStdout, stderr: appsStderr } = await execFileAsync(ipatoolPath, appsCommand);
      console.log('Apps stderr:', appsStderr);
      
      // Validate JSON before parsing
      let appsData;
      try {
        appsData = JSON.parse(appsStdout);
        console.log(`Found ${appsData.length} apps`);
      } catch (parseError) {
        console.error('Error parsing apps stdout:', parseError);
        console.log('Raw apps stdout:', appsStdout);
        throw new Error('Phản hồi không hợp lệ khi lấy danh sách ứng dụng');
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
      
      // Kiểm tra xem lỗi có liên quan đến 2FA không
      if (appsError.message.includes('2FA') || 
          appsError.message.includes('verification') ||
          (appsError.stderr && (
            appsError.stderr.includes('2FA') || 
            appsError.stderr.includes('verification')))) {
        return {
          statusCode: 401,
          body: JSON.stringify({
            error: 'Yêu cầu xác thực hai yếu tố',
            requires2FA: true,
            source: 'apps_list'
          })
        };
      }
      
      throw new Error('Không thể lấy danh sách ứng dụng: ' + appsError.message);
    }

  } catch (error) {
    console.error('Authentication error:', error);
    
    // Phân loại lỗi
    let statusCode = 500;
    let errorMessage = error.message;
    let requires2FA = false;

    // Phát hiện các mẫu 2FA trong lỗi
    if (error.message.includes('2FA') || 
        error.message.includes('verification') || 
        error.message.includes('two factor') || 
        error.message.includes('two-factor') ||
        error.message.includes('code') ||
        error.message.includes('verify')) {
      statusCode = 401;
      errorMessage = 'Yêu cầu xác thực hai yếu tố';
      requires2FA = true;
    } else if (error.message.includes('Invalid credentials') || 
               error.message.includes('password') || 
               error.message.includes('unauthorized')) {
      statusCode = 401;
      errorMessage = 'Apple ID hoặc mật khẩu không hợp lệ';
    } else if (error.message.includes('pattern')) {
      statusCode = 400;
      errorMessage = 'Định dạng đầu vào không hợp lệ. Vui lòng kiểm tra định dạng thông tin xác thực của bạn.';
    }

    return {
      statusCode,
      body: JSON.stringify({
        error: 'Xác thực thất bại',
        details: errorMessage,
        requires2FA,
        errorObj: {
          message: error.message,
          stack: error.stack ? error.stack.split('\n').slice(0, 3).join('\n') : null
        }
      })
    };
  }
};
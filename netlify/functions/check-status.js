const https = require('https');

const URL = 'https://ipa-apps.me';

exports.handler = async function(event, context) {
  return new Promise((resolve, reject) => {
    const req = https.get(URL, {
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    }, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
        // Chỉ đọc một phần nhỏ của dữ liệu
        if (data.length > 1000) {
          req.destroy();
          checkStatus(data, resolve);
        }
      });

      res.on('end', () => {
        checkStatus(data, resolve);
      });
    });

    req.on('error', (error) => {
      console.error('Lỗi:', error);
      resolve({
        statusCode: 500,
        body: JSON.stringify({ error: 'Lỗi khi kết nối đến trang web', details: error.message }),
        headers: { 'Content-Type': 'application/json' }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        statusCode: 504,
        body: JSON.stringify({ error: 'Timeout khi kết nối đến trang web' }),
        headers: { 'Content-Type': 'application/json' }
      });
    });
  });
};

function checkStatus(data, resolve) {
  const status = data.toLowerCase().includes('signed') ? 'signed' : 'revoked';
  resolve({
    statusCode: 200,
    body: JSON.stringify({ status }),
    headers: { 'Content-Type': 'application/json' }
  });
}
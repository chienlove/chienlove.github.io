const https = require('https');
const cheerio = require('cheerio');

const URL = 'https://ipa-apps.me';

exports.handler = async function(event, context) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      URL,
      {
        timeout: 5000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Cache-Control': 'no-cache'
        }
      },
      (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          console.log('HTML nhận được:', data); // Log dữ liệu thô

          try {
            const $ = cheerio.load(data);
            const statusElement = $('.status-class'); // Thay đổi class/ID theo đúng trang web
            const statusText = statusElement.text().toLowerCase();

            console.log('Trạng thái phân tích:', statusText); // Log trạng thái được phân tích

            const status = statusText.includes('signed') ? 'signed' : 'revoked';

            resolve({
              statusCode: 200,
              body: JSON.stringify({ status }),
              headers: { 'Content-Type': 'application/json' }
            });
          } catch (error) {
            console.error('Lỗi phân tích dữ liệu:', error);

            resolve({
              statusCode: 500,
              body: JSON.stringify({ error: 'Lỗi phân tích dữ liệu', details: error.message }),
              headers: { 'Content-Type': 'application/json' }
            });
          }
        });
      }
    );

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
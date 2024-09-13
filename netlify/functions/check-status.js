const axios = require('axios');
const cheerio = require('cheerio');
const URL = 'https://ipa-apps.me';

exports.handler = async function(event, context) {
  try {
    const response = await axios.get(URL, {
      timeout: 10000, // Đặt thời gian chờ là 10 giây
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (response.status !== 200) {
      throw new Error(`Không thể tải trang: ${response.status}`);
    }

    // Sử dụng cheerio để tải và phân tích HTML
    const $ = cheerio.load(response.data);
    
    // Tìm văn bản có chứa từ "signed"
    const bodyText = $('body').text().toLowerCase();
    const status = bodyText.includes('signed') ? 'signed' : 'revoked';

    return {
      statusCode: 200,
      body: JSON.stringify({ status }),
      headers: {
        'Content-Type': 'application/json'
      }
    };
  } catch (error) {
    console.error('Lỗi:', error);
    return {
      statusCode: error.response?.status || 500,
      body: JSON.stringify({ 
        error: 'Lỗi khi lấy dữ liệu', 
        details: error.message,
        stack: error.stack // Thêm stack trace để debug
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    };
  }
};
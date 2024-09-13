const axios = require('axios');
const cheerio = require('cheerio');

const URL = 'https://ipa-apps.me';

exports.handler = async function(event, context) {
  try {
    const response = await axios.get(URL);
    
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
    };

  } catch (error) {
    console.error('Lỗi:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Lỗi khi lấy dữ liệu', details: error.message }),
    };
  }
};
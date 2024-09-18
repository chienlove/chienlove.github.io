const axios = require('axios');
const plist = require('plist');

const validTokens = new Map(); // Thêm logic xác thực token ở đây

exports.handler = async function(event) {
  const url = event.queryStringParameters.url;
  const token = event.queryStringParameters.token; // Nhận token từ query string

  if (!url || !token) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'URL hoặc token không được cung cấp' }),
    };
  }

  // Kiểm tra token hợp lệ
  if (!validTokens.has(token)) {
    return {
      statusCode: 403,
      body: JSON.stringify({ error: 'Token không hợp lệ hoặc đã hết hạn' }),
    };
  }

  try {
    let ipaUrl = url;

    // Nếu URL là .plist, trích xuất URL IPA
    if (url.toLowerCase().endsWith('.plist')) {
      const plistResponse = await axios.get(url, { 
        responseType: 'arraybuffer',
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      const plistText = Buffer.from(plistResponse.data, 'binary').toString('utf8');
      const plistData = plist.parse(plistText);

      const ipaAsset = plistData.items?.[0]?.assets?.find(asset => asset.kind === 'software-package');
      if (!ipaAsset?.url) {
        throw new Error('Không thể tìm thấy URL IPA trong file plist');
      }

      ipaUrl = ipaAsset.url;
    }

    // Gửi yêu cầu HEAD để lấy kích thước file IPA
    const response = await axios.head(ipaUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const fileSize = response.headers['content-length'];

    if (fileSize) {
      const fileSizeMB = (parseInt(fileSize) / (1024 * 1024)).toFixed(2);
      
      // Xóa token sau khi sử dụng thành công
      validTokens.delete(token);

      return {
        statusCode: 200,
        body: JSON.stringify({ size: `${fileSizeMB} MB` }),
      };
    } else {
      throw new Error('Không thể tìm thấy kích thước file');
    }
  } catch (error) {
    console.error('Error:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Lỗi xảy ra khi xử lý yêu cầu' }),
    };
  }
};
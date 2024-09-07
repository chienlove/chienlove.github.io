const axios = require('axios');
const plist = require('plist');

exports.handler = async function(event) {
  const url = event.queryStringParameters.url;

  if (!url) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'URL không được cung cấp' }),
    };
  }

  try {
    let ipaUrl = url;

    // Nếu URL là .plist, trích xuất URL IPA
    if (url.toLowerCase().endsWith('.plist')) {
      const plistResponse = await axios.get(url, { 
        responseType: 'arraybuffer',
        headers: { 'User-Agent': 'Mozilla/5.0' } // Thêm User-Agent
      });
      const contentType = plistResponse.headers['content-type'];
      const plistText = Buffer.from(plistResponse.data, 'binary').toString('utf8');

      // Kiểm tra tính hợp lệ của XML
      if (!contentType.includes('application/xml') && !contentType.includes('text/xml') && !plistText.trim().startsWith('<?xml')) {
        throw new Error('Phản hồi không phải là tài liệu XML hợp lệ');
      }

      // Phân tích nội dung plist
      const plistData = plist.parse(plistText);

      // Trích xuất URL IPA
      const ipaAsset = plistData.items?.[0]?.assets?.find(asset => asset.kind === 'software-package');
      if (!ipaAsset?.url) {
        throw new Error('Không thể tìm thấy URL IPA trong file plist');
      }

      ipaUrl = ipaAsset.url;
    }

    // Gửi yêu cầu HEAD để lấy kích thước file IPA
    const response = await axios.head(ipaUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' } // Thêm User-Agent
    });
    const fileSize = response.headers['content-length'];

    // Trả về kích thước file dưới dạng MB
    if (fileSize) {
      const fileSizeMB = (parseInt(fileSize) / (1024 * 1024)).toFixed(2);
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
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
    if (url.endsWith('.plist')) {
      const plistResponse = await axios.get(url, { responseType: 'arraybuffer' });
      const contentType = plistResponse.headers['content-type'];
      const plistText = Buffer.from(plistResponse.data, 'binary').toString('utf8');

      // Kiểm tra tính hợp lệ của XML
      if (!contentType.includes('application/xml') && !plistText.startsWith('<?xml')) {
        return {
          statusCode: 500,
          body: JSON.stringify({ error: 'Phản hồi không phải là tài liệu XML hợp lệ' }),
        };
      }

      // Phân tích nội dung plist
      const plistData = plist.parse(plistText);

      // Trích xuất URL IPA
      const ipaAsset = plistData.items && plistData.items[0].assets.find(asset => asset.kind === 'software-package');
      if (!ipaAsset || !ipaAsset.url) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Không thể tìm thấy URL IPA trong file plist' }),
        };
      }

      ipaUrl = ipaAsset.url;
    }

    // Gửi yêu cầu HEAD để lấy kích thước file IPA
    const response = await axios.head(ipaUrl);
    const fileSize = response.headers['content-length'];

    // Trả về kích thước file dưới dạng MB
    if (fileSize) {
      const fileSizeMB = (parseInt(fileSize) / (1024 * 1024)).toFixed(2);
      
      // Trả về JSON chỉ có kích thước file
      return {
        statusCode: 200,
        body: JSON.stringify({ size: `${fileSizeMB} MB` }),
      };
    } else {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Không thể tìm thấy kích thước file' }),
      };
    }
  } catch (error) {
    // Chỉ trả về lỗi, không trả về thông tin bổ sung
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Lỗi xảy ra khi xử lý yêu cầu' }),
    };
  }
};
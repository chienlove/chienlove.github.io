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
    
    // Nếu là URL .plist, trích xuất URL IPA từ nó
    if (url.endsWith('.plist')) {
      const plistResponse = await axios.get(url);
      const plistData = plist.parse(plistResponse.data);
      ipaUrl = plistData.items[0].assets[0].url;
    }

    // Gửi yêu cầu HEAD để lấy kích thước file IPA
    const response = await axios.head(ipaUrl);
    const fileSize = response.headers['content-length'];

    if (fileSize) {
      const fileSizeMB = (parseInt(fileSize) / (1024 * 1024)).toFixed(2);
      return {
        statusCode: 200,
        body: JSON.stringify({ size: `${fileSizeMB} MB` }),
      };
    } else {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Không thể lấy kích thước file' }),
      };
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Lỗi khi lấy kích thước file' }),
    };
  }
};
const axios = require('axios');

exports.handler = async function(event, context) {
  // Lấy URL của file IPA từ query parameters
  const ipaUrl = event.queryStringParameters.url;

  if (!ipaUrl) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'URL không được cung cấp' })
    };
  }

  try {
    const response = await axios.head(ipaUrl);
    const fileSize = response.headers['content-length'];

    if (fileSize) {
      // Chuyển đổi byte sang MB
      const fileSizeMB = (parseInt(fileSize) / (1024 * 1024)).toFixed(2);
      
      return {
        statusCode: 200,
        body: JSON.stringify({ size: `${fileSizeMB} MB` })
      };
    } else {
      throw new Error('Không thể lấy kích thước file');
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Có lỗi khi lấy kích thước file' })
    };
  }
};
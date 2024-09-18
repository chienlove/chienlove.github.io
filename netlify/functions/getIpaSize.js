const axios = require('axios');
const plist = require('plist');

exports.handler = async function(event) {
  const urlWithToken = event.queryStringParameters.url;

  if (!urlWithToken) {
    console.log('Thiếu URL:', { urlWithToken }); // Log lỗi nếu thiếu tham số
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'URL không được cung cấp' }),
    };
  }

  try {
    const url = new URL(urlWithToken);
    const token = url.searchParams.get('token');
    url.searchParams.delete('token'); // Xóa token khỏi URL để sử dụng cho các yêu cầu tiếp theo

    let ipaUrl = url.toString();

    // Nếu URL là .plist, trích xuất URL IPA
    if (ipaUrl.toLowerCase().endsWith('.plist')) {
      const plistResponse = await axios.get(ipaUrl, { 
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
      
      console.log('Kích thước file IPA:', fileSizeMB, 'MB');
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
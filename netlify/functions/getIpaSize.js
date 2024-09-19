const axios = require('axios');
const plist = require('plist');

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { plistUrl } = JSON.parse(event.body);

  if (!plistUrl) {
    return { statusCode: 400, body: JSON.stringify({ error: 'URL plist không được cung cấp' }) };
  }

  try {
    // Generate token
    const tokenResponse = await axios.post(`${process.env.BASE_URL}/generate-token?url=${encodeURIComponent(plistUrl)}`);
    const token = tokenResponse.data;

    // Create URL with token and action
    const urlWithToken = new URL(plistUrl);
    urlWithToken.searchParams.append('token', token);
    urlWithToken.searchParams.append('action', 'download-manifest');

    // Fetch plist content
    const plistResponse = await axios.get(urlWithToken.toString(), {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    const plistContent = plistResponse.data;

    if (typeof plistContent !== 'string' || !plistContent.trim().startsWith('<?xml')) {
      throw new Error('Nội dung nhận được không phải là plist hợp lệ');
    }

    const plistData = plist.parse(plistContent);

    const ipaAsset = plistData.items?.[0]?.assets?.find(asset => asset.kind === 'software-package');
    if (!ipaAsset?.url) {
      throw new Error('Không thể tìm thấy URL IPA trong file plist');
    }

    // Get IPA file size
    const ipaResponse = await axios.head(ipaAsset.url);
    const fileSize = ipaResponse.headers['content-length'];

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
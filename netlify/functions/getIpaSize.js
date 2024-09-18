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
    // Gọi API để tạo token
    const tokenResponse = await axios.post(`${process.env.URL}/generate-token`, { url: plistUrl });
    const token = tokenResponse.data;

    if (!token) {
      throw new Error('Không nhận được token');
    }

    // Tạo URL mới với token và action
    const urlWithToken = new URL(plistUrl);
    urlWithToken.searchParams.append('token', token);
    urlWithToken.searchParams.append('action', 'download-manifest');

    // Truy cập plist
    const plistResponse = await axios.get(urlWithToken.toString(), {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    const plistContent = plistResponse.data;

    if (typeof plistContent !== 'string' || !plistContent.trim().startsWith('<?xml')) {
      console.error('Nội dung plist không hợp lệ:', plistContent);
      throw new Error('Nội dung nhận được không phải là plist hợp lệ');
    }

    const plistData = plist.parse(plistContent);

    const ipaAsset = plistData.items?.[0]?.assets?.find(asset => asset.kind === 'software-package');
    if (!ipaAsset?.url) {
      throw new Error('Không thể tìm thấy URL IPA trong file plist');
    }

    // Gửi yêu cầu HEAD để lấy kích thước file IPA
    const ipaResponse = await axios.head(ipaAsset.url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

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
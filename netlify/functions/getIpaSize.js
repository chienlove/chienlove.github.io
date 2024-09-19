const axios = require('axios');
const plist = require('plist');

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { plistUrl } = JSON.parse(event.body);

  if (!plistUrl) {
    return { statusCode: 400, body: JSON.stringify({ error: 'URL plist không được cung cấp' }) };
  }

  try {
    const host = event.headers.host;
    const proto = event.headers['x-forwarded-proto'] || 'https';
    const baseUrl = `${proto}://${host}`;
    const tokenUrl = `${baseUrl}/generate-token`;

    // Gọi API tạo token
    const tokenResponse = await axios.post(tokenUrl, {
      url: plistUrl
    });

    if (tokenResponse.status !== 200 || !tokenResponse.data) {
      throw new Error(`Failed to generate token with status: ${tokenResponse.status}`);
    }

    const token = tokenResponse.data;
    const urlWithToken = `${plistUrl}?token=${encodeURIComponent(token)}`;

    // Fetch plist file với token
    const plistResponse = await axios.get(urlWithToken, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    if (plistResponse.status !== 200) {
      throw new Error(`Failed to fetch plist file, status: ${plistResponse.status}`);
    }

    const plistContent = plistResponse.data;

    if (typeof plistContent !== 'string' || !plistContent.trim().startsWith('<?xml')) {
      throw new Error('Nội dung nhận được không phải là plist hợp lệ');
    }

    const plistData = plist.parse(plistContent);
    const ipaAsset = plistData.items?.[0]?.assets?.find(asset => asset.kind === 'software-package');

    if (!ipaAsset?.url) {
      throw new Error('Không thể tìm thấy URL IPA trong file plist');
    }

    // Lấy kích thước file IPA
    const ipaResponse = await axios.head(ipaAsset.url);
    const fileSize = ipaResponse.headers['content-length'];

    if (!fileSize) {
      throw new Error('Không thể tìm thấy kích thước file');
    }

    const fileSizeMB = (parseInt(fileSize) / (1024 * 1024)).toFixed(2);
    return {
      statusCode: 200,
      body: JSON.stringify({ size: `${fileSizeMB} MB` }),
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Lỗi xảy ra khi xử lý yêu cầu' }),
    };
  }
};
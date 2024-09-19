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

  console.log('Received plist URL:', plistUrl);

  try {
    // Construct the full URL for token generation
    const host = event.headers.host;
    const proto = event.headers['x-forwarded-proto'] || 'https';
    const baseUrl = `${proto}://${host}`;
    const tokenUrl = `${baseUrl}/generate-token`;

    console.log('Generating token using URL:', tokenUrl);

    // Generate token
    const tokenResponse = await axios.post(tokenUrl, null, {
      params: { url: plistUrl }
    });
    const token = tokenResponse.data;
    console.log('Token generated:', token);

    // Create URL with token and action
    const urlWithToken = new URL(plistUrl);
    urlWithToken.searchParams.append('token', token);
    urlWithToken.searchParams.append('action', 'download-manifest');
    console.log('URL with token:', urlWithToken.toString());

    // Fetch plist content
    console.log('Fetching plist content...');
    const plistResponse = await axios.get(urlWithToken.toString(), {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    const plistContent = plistResponse.data;
    console.log('Plist content received');

    if (typeof plistContent !== 'string' || !plistContent.trim().startsWith('<?xml')) {
      console.error('Invalid plist content:', plistContent);
      throw new Error('Nội dung nhận được không phải là plist hợp lệ');
    }

    const plistData = plist.parse(plistContent);

    const ipaAsset = plistData.items?.[0]?.assets?.find(asset => asset.kind === 'software-package');
    if (!ipaAsset?.url) {
      console.error('IPA URL not found in plist');
      throw new Error('Không thể tìm thấy URL IPA trong file plist');
    }

    console.log('IPA URL found:', ipaAsset.url);

    // Get IPA file size
    console.log('Getting IPA file size...');
    const ipaResponse = await axios.head(ipaAsset.url);
    const fileSize = ipaResponse.headers['content-length'];

    if (fileSize) {
      const fileSizeMB = (parseInt(fileSize) / (1024 * 1024)).toFixed(2);
      console.log('IPA file size:', fileSizeMB, 'MB');
      return {
        statusCode: 200,
        body: JSON.stringify({ size: `${fileSizeMB} MB` }),
      };
    } else {
      console.error('File size not found in headers');
      throw new Error('Không thể tìm thấy kích thước file');
    }
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Error stack:', error.stack);
    if (error.response) {
      console.error('Error response:', error.response.data);
    }
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Lỗi xảy ra khi xử lý yêu cầu' }),
    };
  }
};
const axios = require('axios');

exports.handler = async function(event, context) {
  const url = 'https://ipa-apps.me';

  try {
    // Gửi yêu cầu GET đến trang web
    const response = await axios.get(url);

    // Lấy nội dung của trang
    const pageContent = response.data;

    // Kiểm tra xem trang có chứa từ "signed" không
    let status = 'revoked';
    if (pageContent.toLowerCase().includes('signed')) {
      status = 'signed';
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ status }),
    };
  } catch (error) {
    console.error('Error fetching the page:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error fetching data', details: error.message }),
    };
  }
};
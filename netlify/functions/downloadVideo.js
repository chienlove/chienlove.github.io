const axios = require('axios');
const { promisify } = require('util');
const { pipeline } = require('stream');
const pump = promisify(pipeline);

exports.handler = async (event, context) => {
  const { url } = JSON.parse(event.body);

  try {
    console.log('Fetching video from TikTok URL:', url);
    
    // Sử dụng axios để tải video từ API TikTok
    const response = await axios.get(url, { responseType: 'stream' });

    console.log('Video fetched successfully, preparing to stream...');
    
    // Trả về video dưới dạng stream
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': 'attachment; filename="tiktok_video.mp4"',
      },
      body: response.data,
      isBase64Encoded: true, // Chuyển luồng dữ liệu thành base64 cho Netlify
    };
  } catch (error) {
    console.error('Error downloading video:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error downloading video' }),
    };
  }
};
const fs = require('fs');

exports.handler = async (event, context) => {
  try {
    const videoPath = '/tmp/tiktok_video.mp4';

    // Kiểm tra file có tồn tại không
    if (!fs.existsSync(videoPath)) {
      console.error('File not found:', videoPath);
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'File not found' }),
      };
    }

    const videoBuffer = fs.readFileSync(videoPath);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': 'attachment; filename="tiktok_video.mp4"',
      },
      body: videoBuffer.toString('base64'),  // Trả về file dưới dạng base64
      isBase64Encoded: true,  // Báo cho Netlify biết đây là dữ liệu mã hóa base64
    };
  } catch (error) {
    console.error('Error serving video:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error serving video' }),
    };
  }
};
const fs = require('fs');

exports.handler = async (event, context) => {
  try {
    const videoPath = '/tmp/tiktok_video.mp4';
    const videoBuffer = fs.readFileSync(videoPath);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': 'attachment; filename=tiktok_video.mp4',
      },
      body: videoBuffer.toString('base64'),
      isBase64Encoded: true,
    };
  } catch (error) {
    console.error('Error serving video:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error serving video' }),
    };
  }
};
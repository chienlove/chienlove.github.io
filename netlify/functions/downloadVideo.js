const axios = require('axios');
const fs = require('fs');
const { promisify } = require('util');
const { pipeline } = require('stream');
const pump = promisify(pipeline);

exports.handler = async (event, context) => {
  const { url } = JSON.parse(event.body);

  try {
    console.log('Fetching video from TikTok URL:', url);

    // Tải video từ API TikTok
    const response = await axios.get(url, { responseType: 'stream' });

    // Lưu video tạm thời vào /tmp
    const videoPath = '/tmp/tiktok_video.mp4';
    const writeStream = fs.createWriteStream(videoPath);
    await pump(response.data, writeStream);

    console.log('Video downloaded successfully to:', videoPath);

    // Trả về đường dẫn để video tải về
    return {
      statusCode: 200,
      body: JSON.stringify({ videoUrl: `/.netlify/functions/getVideo` }),
    };
  } catch (error) {
    console.error('Error downloading video:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error downloading video' }),
    };
  }
};
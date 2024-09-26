const axios = require('axios');
const fs = require('fs');
const { promisify } = require('util');
const { pipeline } = require('stream');
const pump = promisify(pipeline);

exports.handler = async (event, context) => {
  const { url } = JSON.parse(event.body);

  try {
    // Sử dụng axios để tải video từ API TikTok
    const response = await axios.get(url, { responseType: 'stream' });

    // Lưu trữ video tạm thời
    const videoPath = '/tmp/tiktok_video.mp4';
    const writeStream = fs.createWriteStream(videoPath);
    await pump(response.data, writeStream);

    return {
      statusCode: 200,
      body: JSON.stringify({ videoUrl: `http://${context.hostname}/.netlify/functions/getVideo` })
    };
  } catch (error) {
    console.error('Lỗi tải video:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Lỗi tải video' })
    };
  }
};
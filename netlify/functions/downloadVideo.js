const axios = require('axios');
const { pipeline } = require('stream');
const { promisify } = require('util');
const pump = promisify(pipeline);

exports.handler = async (event, context) => {
  const { url } = JSON.parse(event.body);

  try {
    // Use axios to download video from TikTok
    const response = await axios.get(url, { responseType: 'stream' });

    // Prepare response to send video directly as stream
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': 'attachment; filename="tiktok_video.mp4"',
      },
      body: response.data,
      isBase64Encoded: true, // Convert the stream to base64 for Netlify
    };
  } catch (error) {
    console.error('Error downloading video:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error downloading video' }),
    };
  }
};
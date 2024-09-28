const AWS = require('aws-sdk');
const axios = require('axios');

const r2 = new AWS.S3({
  accessKeyId: process.env.R2_ACCESS_KEY,
  secretAccessKey: process.env.R2_SECRET_KEY,
  endpoint: process.env.R2_ENDPOINT,
  region: 'auto',
  signatureVersion: 'v4',
  s3ForcePathStyle: true,
});

const PUBLIC_BUCKET_URL = process.env.PUBLIC_BUCKET_URL || 'https://pub-74c4980e4731417d93dc9a8bbc6315eb.r2.dev';

async function getActualVideoUrl(tiktokUrl) {
  try {
    const response = await axios.get(tiktokUrl, {
      maxRedirects: 5,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const htmlContent = response.data;
    
    // In ra nội dung HTML để kiểm tra
    console.log('HTML Content:', htmlContent);

    // Sử dụng regex để tìm URL video từ HTML
    const videoUrlMatch = htmlContent.match(/"playAddr":"(https:[^"]+)"/);
    if (!videoUrlMatch || videoUrlMatch.length < 2) {
      throw new Error('Could not find video URL in HTML');
    }

    // Chuyển đổi ký tự thoát trong URL
    const videoUrl = videoUrlMatch[1].replace(/\\u002F/g, '/');

    // In ra URL video để kiểm tra
    console.log('Actual video URL:', videoUrl);

    // Kiểm tra URL có đuôi .mp4 không
    if (!videoUrl.endsWith('.mp4')) {
      throw new Error('The URL is not a valid MP4 file.');
    }

    return videoUrl;
  } catch (error) {
    console.error('Error getting actual video URL:', error.message);
    throw error;
  }
}

exports.handler = async (event, context) => {
  const { url } = JSON.parse(event.body);

  try {
    console.log('Fetching video from TikTok URL:', url);

    const actualVideoUrl = await getActualVideoUrl(url);
    console.log('Actual video URL:', actualVideoUrl);

    const response = await axios.get(actualVideoUrl, {
      responseType: 'stream',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (response.headers['content-type'] !== 'video/mp4') {
      throw new Error('The response is not a valid MP4 file.');
    }

    const videoKey = `tiktok_videos/${Date.now()}.mp4`;

    console.log('Uploading video to R2...');

    await r2.upload({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: videoKey,
      Body: response.data,
      ContentType: 'video/mp4',
    }).promise();

    const videoUrl = `${PUBLIC_BUCKET_URL}/${videoKey}`;
    return {
      statusCode: 200,
      body: JSON.stringify({ videoUrl }),
    };
  } catch (error) {
    console.error('Error downloading or uploading video:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error downloading or uploading video', details: error.message }),
    };
  }
};
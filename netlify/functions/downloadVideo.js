const axios = require('axios');
const AWS = require('aws-sdk');
const { promisify } = require('util');
const { pipeline } = require('stream');
const pump = promisify(pipeline);

// Cấu hình kết nối với R2
const r2 = new AWS.S3({
  accessKeyId: process.env.R2_ACCESS_KEY,
  secretAccessKey: process.env.R2_SECRET_KEY,
  endpoint: process.env.R2_ENDPOINT,
  s3ForcePathStyle: true, // Cloudflare R2 yêu cầu điều này
});

exports.handler = async (event, context) => {
  const { url } = JSON.parse(event.body);

  try {
    console.log('Fetching video from TikTok URL:', url);

    // Tải video từ API TikTok
    const response = await axios.get(url, { responseType: 'stream' });

    // Tạo tên file duy nhất
    const videoKey = `tiktok_videos/${Date.now()}.mp4`;

    console.log('Uploading video to R2...');

    // Tải video lên R2
    await r2.upload({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: videoKey,
      Body: response.data,
      ContentType: 'video/mp4',
      ACL: 'public-read', // Cho phép truy cập công khai để tải về
    }).promise();

    console.log(`Video uploaded successfully to R2: ${videoKey}`);

    // Trả về link video từ R2
    const videoUrl = `https://${process.env.R2_BUCKET_NAME}.${process.env.R2_ENDPOINT}/${videoKey}`;

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
const AWS = require('aws-sdk');
const axios = require('axios');
const fs = require('fs');
const { promisify } = require('util');
const { pipeline } = require('stream');
const pump = promisify(pipeline);

// Cấu hình kết nối với R2
const r2 = new AWS.S3({
  accessKeyId: process.env.R2_ACCESS_KEY,
  secretAccessKey: process.env.R2_SECRET_KEY,
  endpoint: process.env.R2_ENDPOINT,  // Ví dụ: b9b33e1228ae77e510897cc002c1735c.r2.cloudflarestorage.com
  region: 'auto',
  s3ForcePathStyle: true,
});

exports.handler = async (event, context) => {
  const { url } = JSON.parse(event.body);

  try {
    console.log('Fetching video from TikTok URL:', url);

    // Tạo đường dẫn lưu tạm thời
    const videoPath = `/tmp/tiktok_video_${Date.now()}.mp4`;

    // Tải video từ API TikTok và lưu vào /tmp
    const response = await axios.get(url, { responseType: 'stream' });
    const writeStream = fs.createWriteStream(videoPath);
    await pump(response.data, writeStream);

    // Kiểm tra kích thước file
    const fileStats = fs.statSync(videoPath);
    console.log(`Video downloaded successfully, size: ${fileStats.size} bytes`);

    if (fileStats.size < 2048) {  // Kiểm tra xem file có quá nhỏ không
      throw new Error('Downloaded video size is too small, likely an error.');
    }

    // Tạo tên file duy nhất cho video
    const videoKey = `tiktok_videos/${Date.now()}.mp4`;

    console.log('Uploading video to R2...');

    // Đọc lại video từ /tmp và tải lên R2
    const fileStream = fs.createReadStream(videoPath);
    await r2.upload({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: videoKey,
      Body: fileStream,
      ContentType: 'video/mp4',
      ACL: 'public-read',
    }).promise();

    console.log(`Video uploaded successfully to R2: ${videoKey}`);

    // Tạo URL tải video từ R2
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
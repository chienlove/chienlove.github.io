const AWS = require('aws-sdk');
const axios = require('axios');
const { promisify } = require('util');
const { pipeline } = require('stream');
const pump = promisify(pipeline);

// Cấu hình kết nối với R2
const r2 = new AWS.S3({
  accessKeyId: process.env.R2_ACCESS_KEY,
  secretAccessKey: process.env.R2_SECRET_KEY,
  endpoint: process.env.R2_ENDPOINT,  // Ví dụ: b9b33e1228ae77e510897cc002c1735c.r2.cloudflarestorage.com
  region: 'auto',
  s3ForcePathStyle: true,  // Cần thiết cho Cloudflare R2
});

exports.handler = async (event, context) => {
  const { url } = JSON.parse(event.body);

  try {
    console.log('Đang tải video từ TikTok URL:', url);

    // Tải video từ API TikTok
    const response = await axios.get(url, { responseType: 'stream' });

    // Tạo tên file duy nhất cho video
    const videoKey = `tiktok_videos/${Date.now()}.mp4`;

    console.log('Đang tải video lên R2...');

    // Tải video lên R2 và thiết lập quyền public-read
    await r2.upload({
      Bucket: process.env.R2_BUCKET_NAME,  // Tên bucket R2
      Key: videoKey,  // Đường dẫn file trên R2
      Body: response.data,  // Dữ liệu video từ TikTok
      ContentType: 'video/mp4',  // Định dạng video
      ACL: 'public-read',  // Quyền truy cập công khai để tải về
    }).promise();

    console.log(`Video đã tải lên R2 thành công: ${videoKey}`);

    // Tạo URL tải video từ R2
    const videoUrl = `https://${process.env.R2_BUCKET_NAME}.${process.env.R2_ENDPOINT}/${videoKey}`;

    return {
      statusCode: 200,
      body: JSON.stringify({ videoUrl }),  // Trả về link tải video
    };
  } catch (error) {
    console.error('Lỗi khi tải hoặc upload video:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Lỗi khi tải hoặc upload video', details: error.message }),
    };
  }
};
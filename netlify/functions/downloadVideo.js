const AWS = require('aws-sdk');
const axios = require('axios');

// Cấu hình R2
const r2 = new AWS.S3({
  accessKeyId: process.env.R2_ACCESS_KEY,
  secretAccessKey: process.env.R2_SECRET_KEY,
  endpoint: process.env.R2_ENDPOINT,
  region: 'auto',
  signatureVersion: 'v4',
  s3ForcePathStyle: true,
});

const PUBLIC_BUCKET_URL = process.env.PUBLIC_BUCKET_URL || 'https://pub-74c4980e4731417d93dc9a8bbc6315eb.r2.dev';

// Hàm để lấy URL video thực tế từ TikTok
async function getActualVideoUrl(tiktokUrl) {
  try {
    const response = await axios.get(tiktokUrl, {
      maxRedirects: 5,
      validateStatus: function (status) {
        return status >= 200 && status < 300 || status === 302;
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    const finalUrl = response.request.res.responseUrl;
    
    // Kiểm tra nếu URL trả về không phải là video mà là HTML (có thể là trang lỗi)
    if (!finalUrl.endsWith('.mp4')) {
      throw new Error('The URL is not a valid MP4 file.');
    }
    
    return finalUrl;
  } catch (error) {
    console.error('Error getting actual video URL:', error.message);
    throw error;
  }
}

// Handler chính để xử lý yêu cầu Netlify Function
exports.handler = async (event, context) => {
  const { url } = JSON.parse(event.body);

  try {
    console.log('Fetching video from TikTok URL:', url);

    // Lấy URL thực tế của video
    const actualVideoUrl = await getActualVideoUrl(url);
    console.log('Actual video URL:', actualVideoUrl);

    // Tải video từ URL thực tế
    const response = await axios.get(actualVideoUrl, { 
      responseType: 'stream',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    // Kiểm tra content-type để đảm bảo rằng đó là file video MP4
    if (response.headers['content-type'] !== 'video/mp4') {
      throw new Error('The response is not a valid MP4 file.');
    }

    // Tạo key cho video để upload lên R2
    const videoKey = `tiktok_videos/${Date.now()}.mp4`;
    console.log('Uploading video to R2 directly from stream...');

    // Upload trực tiếp video từ stream lên R2
    await r2.upload({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: videoKey,
      Body: response.data,
      ContentType: 'video/mp4',
    }).promise();

    console.log(`Video uploaded successfully to R2: ${videoKey}`);

    // Tạo URL public để truy cập video đã upload
    const videoUrl = `${PUBLIC_BUCKET_URL}/${videoKey}`;

    // Trả về URL video cho phía client
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
const AWS = require('aws-sdk');
const axios = require('axios');
const fs = require('fs');
const { promisify } = require('util');
const { pipeline } = require('stream');
const pump = promisify(pipeline);
const TikTokDownloader = require('tiktok-downloader');

const PUBLIC_BUCKET_URL = process.env.PUBLIC_BUCKET_URL || 'https://pub-74c4980e4731417d93dc9a8bbc6315eb.r2.dev';

const r2 = new AWS.S3({
  accessKeyId: process.env.R2_ACCESS_KEY,
  secretAccessKey: process.env.R2_SECRET_KEY,
  endpoint: process.env.R2_ENDPOINT,
  region: 'auto',
  signatureVersion: 'v4',
  s3ForcePathStyle: true,
});

async function getVideoInfo(tiktokUrl) {
  try {
    const videoMeta = await TikTokDownloader.getInfo(tiktokUrl);
    if (videoMeta && videoMeta.video) {
      return videoMeta.video;
    }
    throw new Error('Could not find video URL in TikTok response');
  } catch (error) {
    console.error('Error getting video info from TikTok:', error);
    throw error;
  }
}

exports.handler = async (event, context) => {
  const { url } = JSON.parse(event.body);

  try {
    console.log('Fetching video info from TikTok URL:', url);

    const videoUrl = await getVideoInfo(url);
    console.log('Video URL:', videoUrl);

    const videoPath = `/tmp/tiktok_video_${Date.now()}.mp4`;

    const response = await axios.get(videoUrl, { 
      responseType: 'stream',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://www.tiktok.com/'
      }
    });
    
    const writeStream = fs.createWriteStream(videoPath);
    await pump(response.data, writeStream);

    const fileStats = fs.statSync(videoPath);
    console.log(`Video downloaded successfully, size: ${fileStats.size} bytes`);

    if (fileStats.size < 1000000) { // Increased minimum size check to 1MB
      throw new Error('Downloaded video size is too small, likely an error.');
    }

    const videoKey = `tiktok_videos/${Date.now()}.mp4`;

    console.log('Uploading video to R2...');

    const fileStream = fs.createReadStream(videoPath);
    const uploadResult = await r2.upload({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: videoKey,
      Body: fileStream,
      ContentType: 'video/mp4',
    }).promise();

    console.log(`Video uploaded successfully to R2: ${videoKey}`);
    console.log('Upload result:', JSON.stringify(uploadResult));

    const finalVideoUrl = `${PUBLIC_BUCKET_URL}/${videoKey}`;

    return {
      statusCode: 200,
      body: JSON.stringify({ videoUrl: finalVideoUrl }),
    };
  } catch (error) {
    console.error('Error downloading or uploading video:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error downloading or uploading video', details: error.message }),
    };
  }
};
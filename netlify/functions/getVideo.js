exports.handler = async (event, context) => {
  try {
    const videoPath = '/tmp/tiktok_video.mp4';
    const videoBuffer = fs.readFileSync(videoPath);
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': 'attachment; filename=tiktok_video.mp4'
      },
      body: videoBuffer.toString('base64')
    };
  } catch (error) {
    console.error('Lỗi tải video:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Lỗi tải video' })
    };
  }
};
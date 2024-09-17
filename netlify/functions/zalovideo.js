const puppeteer = require('puppeteer');

(async () => {
  // Khởi chạy trình duyệt Puppeteer
  const browser = await puppeteer.launch({
    headless: false, // Chạy trình duyệt trong chế độ không headless để xem giao diện
    args: ['--no-sandbox', '--disable-setuid-sandbox'] // Thêm các tham số cấu hình nếu cần
  });
  const page = await browser.newPage();

  // Thay đổi User-Agent nếu cần
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

  // Thiết lập các headers nếu cần
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive'
  });

  // Truy cập vào liên kết video
  try {
    await page.goto('https://zalo.video/s/jZrFD33t', {
      waitUntil: 'networkidle2', // Chờ cho đến khi không còn yêu cầu mạng nào
      timeout: 60000 // Thay đổi thời gian chờ nếu cần
    });

    // Chờ trang tải hoàn tất (nếu cần)
    await page.waitForTimeout(5000); // Chờ 5 giây trước khi tiếp tục

    // Tìm liên kết video từ nội dung trang
    const videoLink = await page.evaluate(() => {
      // Tìm phần tử video trên trang
      const video = document.querySelector('video');
      // Trả về URL của video nếu tìm thấy
      return video ? video.src : null;
    });

    console.log('Video link:', videoLink);
  } catch (error) {
    console.error('Error during page load or evaluation:', error);
  }

  // Đóng trình duyệt
  await browser.close();
})();
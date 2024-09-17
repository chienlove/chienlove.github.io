const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Mở liên kết trang web có video
  await page.goto('https://zalo.video/s/jZrFD33t');
  
  // Chờ trang tải xong và quét mã QR (nếu cần)
  // Bạn có thể cần mô phỏng các bước để quét mã QR nếu ứng dụng yêu cầu

  // Lấy nội dung của trang
  const pageContent = await page.content();
  
  // Tìm liên kết video từ nội dung trang
  const videoLink = await page.evaluate(() => {
    // Xác định cách trang web chứa liên kết video
    // Ví dụ: tìm tất cả các thẻ video và lấy URL
    const video = document.querySelector('video');
    return video ? video.src : null;
  });
  
  console.log('Video link:', videoLink);
  
  await browser.close();
})();
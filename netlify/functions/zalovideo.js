const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // Thiết lập User-Agent nếu cần
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

  // Thiết lập cookies nếu cần
  await page.setCookie({
    name: 'cookie_name',
    value: 'cookie_value',
    domain: 'zalo.video'
  });

  try {
    await page.goto('https://zalo.video/s/jZrFD33t', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    // Thực hiện các thao tác cần thiết để tìm liên kết video
    const videoLink = await page.evaluate(() => {
      const video = document.querySelector('video');
      return video ? video.src : null;
    });

    console.log('Video link:', videoLink);
  } catch (error) {
    console.error('Error during page load or evaluation:', error);
  }

  await browser.close();
})();
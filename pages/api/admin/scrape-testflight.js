const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function scrapeTestFlight(url) {
  const browser = await puppeteer.launch({
    headless: true, // Đặt thành true khi deploy lên server
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu'
    ]
  });
  
  try {
    const page = await browser.newPage();
    
    // Thiết lập user agent iPhone
    await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1');
    
    // Thiết lập viewport mobile
    await page.setViewport({ width: 375, height: 812, isMobile: true });
    
    console.log('Đang truy cập TestFlight...');
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    
    // Chờ các element quan trọng xuất hiện
    console.log('Đang chờ nội dung tải...');
    await page.waitForSelector('.app-name', { timeout: 30000 });
    
    // Lấy thông tin ứng dụng
    const appInfo = await page.evaluate(() => {
      // Hàm helper để lấy text an toàn
      const getText = (selector) => {
        const el = document.querySelector(selector);
        return el ? el.textContent.trim() : null;
      };
      
      // Hàm helper để lấy attribute
      const getAttr = (selector, attr) => {
        const el = document.querySelector(selector);
        return el ? el.getAttribute(attr) : null;
      };
      
      return {
        appName: getText('h1.app-name') || getText('h1'),
        developer: getText('.developer-name') || getText('.name'),
        version: getText('.version-build') || getText('.version'),
        buildNumber: getText('.build-number') || getText('.build'),
        whatsNew: getText('.change-log-text') || getText('.whats-new'),
        releaseDate: getText('.release-date') || getText('.date'),
        appIcon: getAttr('.app-icon img', 'src') || getAttr('.app-icon-source', 'src'),
        testFlightLink: window.location.href
      };
    });
    
    console.log('Scrape thành công!');
    return appInfo;
    
  } catch (error) {
    console.error('Lỗi khi scrape:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Sử dụng hàm
(async () => {
  try {
    const testFlightUrl = 'https://testflight.apple.com/join/b9jMyOWt'; // Thay bằng link của bạn
    const result = await scrapeTestFlight(testFlightUrl);
    console.log('Thông tin ứng dụng:', result);
  } catch (error) {
    console.error('Lỗi:', error);
  }
})();
const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

const URL = 'https://ipa-apps.me';
const TIMEOUT = 10000; // 10 giây

exports.handler = async function(event, context) {
  let browser = null;

  try {
    browser = await puppeteer.launch({
      args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(TIMEOUT);

    const response = await page.goto(URL, { waitUntil: 'networkidle2' });

    if (!response.ok()) {
      throw new Error(`Không tải được trang: ${response.status()} ${response.statusText()}`);
    }

    const content = await page.content();
    const status = content.toLowerCase().includes('signed') ? 'signed' : 'revoked';

    return {
      statusCode: 200,
      body: JSON.stringify({ status }),
    };

  } catch (error) {
    console.error('Lỗi:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Lỗi khi lấy dữ liệu', details: error.message }),
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};
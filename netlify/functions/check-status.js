const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

exports.handler = async function(event, context) {
  const url = 'https://ipa-apps.me';

  let browser = null;

  try {
    // Launch the headless browser with @sparticuz/chromium
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: true,
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });

    const text = await page.content();

    let status = 'revoked';
    if (text.toLowerCase().includes('signed')) {
      status = 'signed';
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ status }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error fetching data', details: error.message }),
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
const puppeteer = require('puppeteer');

exports.handler = async function(event, context) {
  const url = 'https://ipa-apps.me';
  
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });

    const text = await page.content();

    let status = 'revoked';
    if (text.toLowerCase().includes('signed')) {
      status = 'signed';
    }

    await browser.close();

    return {
      statusCode: 200,
      body: JSON.stringify({ status }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error fetching data' }),
    };
  }
};
const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

exports.handler = async () => {
    try {
        const browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
        });

        const page = await browser.newPage();
        await page.goto('https://ipa-apps.me', { waitUntil: 'networkidle2' });

        // Tìm kiếm chữ "SIGNED" trong nội dung đã render
        const htmlContent = await page.content();
        const isSigned = /SIGNED/i.test(htmlContent);

        // Đóng trình duyệt
        await browser.close();

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                status: isSigned ? 'signed' : 'revoked',
                timestamp: new Date().toISOString(),
            }),
        };
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                error: 'Cannot check status',
                details: error.message,
            }),
        };
    }
};
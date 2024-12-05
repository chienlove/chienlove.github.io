const https = require('https');

exports.handler = async () => {
    try {
        const options = {
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
            },
        };

        // Fetch nội dung HTML
        const html = await new Promise((resolve, reject) => {
            https.get('https://ipa-apps.me', options, (res) => {
                let data = '';
                res.on('data', (chunk) => (data += chunk));
                res.on('end', () => resolve(data));
            }).on('error', reject);
        });

        // Loại bỏ bình luận và các thẻ HTML
        const cleanedHtml = html
            .replace(/<!--[\s\S]*?-->/g, '') // Loại bỏ bình luận HTML
            .replace(/<[^>]*>/g, '')        // Loại bỏ thẻ HTML
            .replace(/[^\w\s]/g, '');       // Loại bỏ biểu tượng và ký tự đặc biệt

        // Kiểm tra từ "signed" không phân biệt hoa/thường
        const isSigned = /\bsigned\b/i.test(cleanedHtml);

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
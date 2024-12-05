const https = require('https');

exports.handler = async () => {
    try {
        const options = {
            headers: {
                'User-Agent': 'Mozilla/5.0',
            },
        };

        const html = await new Promise((resolve, reject) => {
            https.get('https://ipa-apps.me', options, (res) => {
                let data = '';
                res.on('data', (chunk) => (data += chunk));
                res.on('end', () => resolve(data));
            }).on('error', reject);
        });

        const isSigned = /SIGNED/i.test(html);

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
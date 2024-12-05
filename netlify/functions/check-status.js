const https = require('https');
const { URL } = require('url');

const CONFIG = {
    TARGET_URL: 'https://ipa-apps.me',
    TIMEOUT: 5000,
    RETRY_ATTEMPTS: 3
};

async function fetchWithRetry(url, options, maxRetries = CONFIG.RETRY_ATTEMPTS) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await new Promise((resolve, reject) => {
                const req = https.get(url, options, (res) => {
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => resolve(data));
                });

                req.on('error', reject);
                req.setTimeout(CONFIG.TIMEOUT, () => {
                    req.destroy();
                    reject(new Error('Request timeout'));
                });
            });
        } catch (error) {
            if (attempt === maxRetries) throw error;
            console.log(`Attempt ${attempt} failed. Retrying...`);
        }
    }
}

function parseStatus(html) {
    // Kiểm tra xem chữ "SIGNED" có xuất hiện không
    const isSigned = /SIGNED/i.test(html);
    return isSigned ? "signed" : "revoked";
}

exports.handler = async (event) => {
    try {
        const options = {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'Accept': 'text/html,application/xhtml+xml,application/xml',
                'Accept-Language': 'en-US,en;q=0.9',
                'Cache-Control': 'no-cache'
            }
        };

        const htmlContent = await fetchWithRetry(CONFIG.TARGET_URL, options);

        // Debug HTML nếu cần
        console.log("HTML Content:", htmlContent);

        const status = parseStatus(htmlContent);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ 
                status, 
                timestamp: new Date().toISOString() 
            })
        };
    } catch (error) {
        console.error('Lỗi chi tiết:', error);

        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ 
                error: 'Không thể kiểm tra trạng thái',
                details: error.message 
            })
        };
    }
};
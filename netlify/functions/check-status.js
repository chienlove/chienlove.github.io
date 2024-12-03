const https = require('https');
const { URL } = require('url');

// Cấu hình linh hoạt
const CONFIG = {
    TARGET_URL: 'https://ipa-apps.me',
    TIMEOUT: 5000,
    RETRY_ATTEMPTS: 3
};

// Hàm gửi request với nhiều lần thử lại
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

// Hàm phân tích trạng thái
function parseStatus(html) {
    // Chiến lược phân tích linh hoạt
    const statusPatterns = [
        /signed/i,
        /revoked/i,
        /available/i,
        /unavailable/i
    ];

    for (const pattern of statusPatterns) {
        if (pattern.test(html)) {
            return pattern.source.replace(/\\/g, '').toLowerCase().replace(/[\^$]/g, '');
        }
    }

    return 'unknown';
}

exports.handler = async (event) => {
    try {
        // Thêm User-Agent và các header bảo mật
        const options = {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'Accept': 'text/html,application/xhtml+xml,application/xml',
                'Accept-Language': 'en-US,en;q=0.9',
                'Cache-Control': 'no-cache'
            }
        };

        // Lấy nội dung trang web
        const htmlContent = await fetchWithRetry(CONFIG.TARGET_URL, options);
        
        // Phân tích trạng thái
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
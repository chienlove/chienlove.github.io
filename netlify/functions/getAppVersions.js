const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    const appId = event.queryStringParameters.id;
    const apiUrl = `https://api.timbrd.com/apple/app-version/index.php?id=${appId}`;
    
    // Tăng timeout của Lambda
    context.callbackWaitsForEmptyEventLoop = false;
    
    // Hàm retry với exponential backoff
    const fetchWithRetry = async (url, options, maxRetries = 3) => {
        let lastError;
        
        for (let i = 0; i < maxRetries; i++) {
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 20000); // 20s timeout
                
                const response = await fetch(url, {
                    ...options,
                    signal: controller.signal,
                    compress: true, // Thêm compression
                    headers: {
                        ...options.headers,
                        'Accept-Encoding': 'gzip, deflate',
                        'Connection': 'keep-alive'
                    }
                });
                
                clearTimeout(timeout);
                
                // Đọc response theo chunks để tránh EOF
                const chunks = [];
                const reader = response.body.getReader();
                
                while (true) {
                    const {done, value} = await reader.read();
                    if (done) break;
                    chunks.push(value);
                }
                
                // Combine chunks
                const allChunks = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
                let position = 0;
                for (const chunk of chunks) {
                    allChunks.set(chunk, position);
                    position += chunk.length;
                }
                
                // Convert to text
                const decoder = new TextDecoder('utf-8');
                const rawData = decoder.decode(allChunks);
                
                if (!response.ok) {
                    throw new Error(`HTTP Error: ${response.status}`);
                }
                
                if (!rawData || rawData.trim() === '') {
                    throw new Error('Empty response');
                }
                
                try {
                    return JSON.parse(rawData);
                } catch (e) {
                    console.error('Parse error:', e);
                    console.error('Raw data:', rawData);
                    throw new Error('JSON parse failed');
                }
                
            } catch (error) {
                console.error(`Attempt ${i + 1} failed:`, error);
                lastError = error;
                
                if (i < maxRetries - 1) {
                    // Exponential backoff
                    const delay = Math.min(1000 * Math.pow(2, i), 5000);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        
        throw lastError;
    };
    
    try {
        const data = await fetchWithRetry(apiUrl, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache'
            }
        });
        
        if (!Array.isArray(data)) {
            throw new Error('Invalid response format');
        }
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify(data)
        };
        
    } catch (error) {
        console.error('Final error:', error);
        
        return {
            statusCode: error.message.includes('404') ? 404 : 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                message: "Request failed",
                error: error.message,
                appId: appId
            })
        };
    }
};
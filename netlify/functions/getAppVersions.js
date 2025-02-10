const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    const appId = event.queryStringParameters.id;
    const apiUrl = `https://api.timbrd.com/apple/app-version/index.php?id=${appId}`;
    
    // Tăng timeout của Lambda
    context.callbackWaitsForEmptyEventLoop = false;
    
    const fetchWithRetry = async (url, maxRetries = 3) => {
        let lastError;
        
        for (let i = 0; i < maxRetries; i++) {
            try {
                const response = await fetch(url, {
                    timeout: 30000, // 30 seconds
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1',
                        'Accept': 'application/json',
                        'Cache-Control': 'no-cache'
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP Error: ${response.status}`);
                }

                const text = await response.text();
                
                if (!text || text.trim() === '') {
                    throw new Error('Empty response');
                }

                try {
                    const data = JSON.parse(text);
                    if (!Array.isArray(data)) {
                        throw new Error('Invalid response format');
                    }
                    return data;
                } catch (e) {
                    console.error('Parse error:', e);
                    throw new Error('JSON parse failed');
                }
                
            } catch (error) {
                console.error(`Attempt ${i + 1} failed:`, error);
                lastError = error;
                
                if (i < maxRetries - 1) {
                    // Simple delay between retries
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
        }
        
        throw lastError;
    };
    
    try {
        const data = await fetchWithRetry(apiUrl);
        
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
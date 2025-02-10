const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    const appId = event.queryStringParameters.id;
    const apiUrl = `https://api.timbrd.com/apple/app-version/index.php?id=${appId}`;
    
    // Tăng timeout của Lambda function
    context.callbackWaitsForEmptyEventLoop = false;
    
    try {
        // Thêm timeout và headers
        const timeoutMs = 12000;
        const controller = new AbortController();
        const timeout = setTimeout(() => {
            controller.abort();
        }, timeoutMs);

        const response = await fetch(apiUrl, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'application/json',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            },
            timeout: timeoutMs
        });

        clearTimeout(timeout);

        // Kiểm tra status code HTTP
        if (!response.ok) {
            throw new Error(`API trả về lỗi: ${response.status} ${response.statusText}`);
        }

        // Đọc và kiểm tra dữ liệu thô
        const rawData = await response.text();
        console.log('Raw response:', rawData); // Log để debug

        // Kiểm tra dữ liệu rỗng
        if (!rawData || rawData.trim() === '') {
            throw new Error('API trả về dữ liệu rỗng');
        }

        // Parse JSON với xử lý lỗi chi tiết
        let parsedData;
        try {
            parsedData = JSON.parse(rawData);
        } catch (jsonError) {
            console.error('JSON parse error:', jsonError);
            console.error('Raw data causing error:', rawData);
            throw new Error(`Lỗi parse JSON: ${jsonError.message}`);
        }

        // Validate cấu trúc dữ liệu
        if (!Array.isArray(parsedData)) {
            console.error('Invalid data structure:', parsedData);
            throw new Error('Dữ liệu không có cấu trúc mảng');
        }

        // Trả về dữ liệu thành công
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify(parsedData)
        };

    } catch (error) {
        console.error('Detailed error:', error);
        
        // Xử lý timeout
        if (error.name === 'AbortError') {
            return {
                statusCode: 504,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: "Request timeout",
                    error: "API không phản hồi trong thời gian cho phép",
                    appId: appId
                })
            };
        }

        // Xử lý các lỗi khác
        return {
            statusCode: error.message.includes('404') ? 404 : 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: "Lỗi khi xử lý yêu cầu",
                error: error.message,
                suggestion: appId 
                    ? `Hãy kiểm tra lại ID ứng dụng '${appId}'`
                    : 'Thiếu tham số ID ứng dụng'
            })
        };
    }
};
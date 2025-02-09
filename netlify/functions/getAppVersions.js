const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    const appId = event.queryStringParameters.id;
    const apiUrl = `https://api.timbrd.com/apple/app-version/index.php?id=${appId}`;

    try {
        // Gọi API và đợi phản hồi
        const response = await fetch(apiUrl);

        // Kiểm tra status code HTTP
        if (!response.ok) {
            throw new Error(`API trả về lỗi: ${response.status} ${response.statusText}`);
        }

        // Đọc dữ liệu thô từ phản hồi
        const rawData = await response.text();
        console.log('Dữ liệu thô từ API:', rawData); // Log để debug

        // Kiểm tra dữ liệu rỗng
        if (!rawData || rawData.trim() === '') {
            throw new Error('API trả về dữ liệu rỗng');
        }

        // Cố gắng phân tích JSON
        let parsedData;
        try {
            parsedData = JSON.parse(rawData);
        } catch (jsonError) {
            throw new Error(`Lỗi phân tích JSON: ${jsonError.message}`);
        }

        // Kiểm tra cấu trúc dữ liệu mong đợi
        if (!Array.isArray(parsedData) || parsedData.length === 0) {
            return {
                statusCode: 404,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    message: "Không tìm thấy thông tin phiên bản",
                    details: `Dữ liệu trả về không có cấu trúc mảng hoặc mảng rỗng. Dữ liệu: ${rawData}`
                })
            };
        }

        // Trả về dữ liệu thành công
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(parsedData)
        };

    } catch (error) {
        // Xử lý tất cả các loại lỗi
        console.error('Lỗi chi tiết:', error); // Log lỗi đầy đủ

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
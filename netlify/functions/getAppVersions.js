const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    const appId = event.queryStringParameters.id;
    const apiUrl = `https://api.timbrd.com/apple/app-version/index.php?id=${appId}`;

    try {
        const response = await fetch(apiUrl);
        const data = await response.json();
        
        return {
            statusCode: 200,
            body: JSON.stringify(data)
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Lỗi khi lấy thông tin phiên bản", error: error.message })
        };
    }
};
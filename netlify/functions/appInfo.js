const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    const appId = event.queryStringParameters.id;
    const apiUrl = `https://itunes.apple.com/lookup?id=${appId}`;

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
            body: JSON.stringify({ message: "Lỗi khi gọi iTunes API", error: error.message })
        };
    }
};
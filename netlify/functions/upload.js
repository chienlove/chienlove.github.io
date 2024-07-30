const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

exports.handler = async function (event, context) {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: 'Method Not Allowed',
        };
    }

    const { file, fileName } = JSON.parse(event.body);

    if (!file || !fileName) {
        return {
            statusCode: 400,
            body: 'Bad Request: Missing file or fileName',
        };
    }

    const filePath = path.join('/tmp', fileName);

    try {
        fs.writeFileSync(filePath, Buffer.from(file, 'base64'));

        const formData = new FormData();
        formData.append('file', fs.createReadStream(filePath), fileName);

        const response = await axios.post(
            `https://api.github.com/repos/chienlove/chienlove.github.io/releases/latest/assets?name=${fileName}`,
            formData,
            {
                headers: {
                    'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json',
                    ...formData.getHeaders()
                }
            }
        );

        fs.unlinkSync(filePath); // Xóa tệp sau khi tải lên thành công

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'File uploaded successfully', data: response.data }),
        };
    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'File upload failed', error }),
        };
    }
};
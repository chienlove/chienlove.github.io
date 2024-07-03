exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { title, content } = JSON.parse(event.body);
        // Ở đây, bạn sẽ lưu bài viết vào cơ sở dữ liệu hoặc CMS của bạn
        // Đây chỉ là một ví dụ đơn giản
        console.log(`New post: ${title}`);

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Post created successfully' }),
        };
    } catch (error) {
        return { statusCode: 500, body: error.toString() };
    }
};
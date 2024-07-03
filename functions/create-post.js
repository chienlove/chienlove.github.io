const { getUser } = require('@netlify/functions');

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ message: 'Method Not Allowed' }) };
    }

    try {
        // Kiểm tra xác thực
        const user = await getUser(context);
        if (!user) {
            return { 
                statusCode: 401, 
                body: JSON.stringify({ message: 'Unauthorized' }) 
            };
        }

        const { title, content } = JSON.parse(event.body);
        
        if (!title || !content) {
            return { 
                statusCode: 400, 
                body: JSON.stringify({ message: 'Title and content are required' }) 
            };
        }

        // Ở đây, bạn sẽ lưu bài viết vào cơ sở dữ liệu hoặc CMS của bạn
        // Đây chỉ là một ví dụ đơn giản
        console.log(`New post: ${title}`);

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Bài viết đã được tạo thành công' }),
        };
    } catch (error) {
        console.error('Server error:', error);
        return { 
            statusCode: 500, 
            body: JSON.stringify({ message: 'Internal Server Error' }) 
        };
    }
};
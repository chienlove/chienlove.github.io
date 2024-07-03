exports.handler = async (event, context) => {
    try {
        // Ở đây, bạn sẽ lấy danh sách bài viết từ cơ sở dữ liệu hoặc CMS của bạn
        // Đây chỉ là một ví dụ đơn giản
        const posts = [
            { id: 1, title: 'Bài viết 1' },
            { id: 2, title: 'Bài viết 2' },
            { id: 3, title: 'Bài viết 3' },
        ];
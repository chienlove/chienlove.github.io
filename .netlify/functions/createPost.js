exports.handler = async function(event, context) {
    const data = JSON.parse(event.body);

    // Logic để lưu bài viết (có thể là lưu vào một file, database, hoặc dịch vụ khác)

    return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Bài viết đã được lưu thành công!' })
    };
}
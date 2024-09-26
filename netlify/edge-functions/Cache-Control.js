export default async (request, context) => {
  const url = new URL(request.url);

  // Kiểm tra xem có phải là file tĩnh (CSS, JS, hình ảnh) hay không
  const isStaticFile = url.pathname.endsWith('.js') || url.pathname.endsWith('.css');

  if (isStaticFile) {
    // Gọi next để lấy phản hồi tiếp theo
    const response = await context.next();

    if (response) {
      // Đảm bảo rằng phản hồi tồn tại trước khi thêm header
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      response.headers.set('Expires', '0');
      response.headers.set('Surrogate-Control', 'no-store');
    } else {
      console.log('Không nhận được phản hồi từ context.next()');
    }

    return response;
  }

  // Nếu không phải file tĩnh, tiếp tục với pipeline mặc định
  return context.next();
};
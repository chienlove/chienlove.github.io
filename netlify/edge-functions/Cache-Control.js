export default async (request, context) => {
  // Đặt header Cache-Control cho các file JS
  if (request.url.endsWith(".js")) {
    const response = await context.next();
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Expires', '0');
    response.headers.set('Surrogate-Control', 'no-store');
    return response;
  }

  // Với các yêu cầu khác, để nguyên không thay đổi
  return context.next();
};
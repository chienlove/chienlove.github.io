export default async (request, context) => {
  const url = new URL(request.url);

  // Kiểm tra xem có phải file tĩnh không (CSS, JS, hình ảnh)
  const isStaticFile = url.pathname.endsWith('.js') || url.pathname.endsWith('.css');
  
  if (isStaticFile) {
    const response = await context.next();
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Expires', '0');
    response.headers.set('Surrogate-Control', 'no-store');
    return response;
  }

  return context.next();
};
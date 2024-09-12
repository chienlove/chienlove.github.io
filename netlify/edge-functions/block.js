const validTokens = new Map();

export default async (request, context) => {
  const url = new URL(request.url);

  // Xử lý yêu cầu tạo token
  if (request.method === 'POST' && url.pathname === '/generate-token') {
    const token = generateToken();
    const expirationTime = Date.now() + 30000; // Token hết hạn sau 30 giây
    validTokens.set(token, { expirationTime, url: url.searchParams.get('url') });
    
    // Dọn dẹp token sau khi hết hạn
    setTimeout(() => {
      validTokens.delete(token);
    }, 30000);

    return new Response(JSON.stringify({ token }), { status: 200 });
  }

  // Xử lý yêu cầu tải về tệp plist có token
  if (url.searchParams.get('action') === 'download-manifest') {
    const plistToken = url.searchParams.get('token');
    const plistUrl = decodeURIComponent(url.searchParams.get('url'));

    if (plistToken && validTokens.has(plistToken)) {
      const tokenData = validTokens.get(plistToken);

      // Kiểm tra token hợp lệ và đúng URL
      if (Date.now() < tokenData.expirationTime && tokenData.url === plistUrl) {
        validTokens.delete(plistToken); // Xóa token sau khi dùng

        const response = await fetch(plistUrl);
        const plistContent = await response.text();

        return new Response(plistContent, {
          status: 200,
          headers: {
            'Content-Type': 'application/x-plist',
            'Cache-Control': 'no-store',
            'Pragma': 'no-cache'
          }
        });
      } else {
        validTokens.delete(plistToken); // Xóa token hết hạn hoặc không hợp lệ
        return new Response('Token expired or invalid', { status: 403 });
      }
    } else {
      return new Response('Invalid or expired token', { status: 403 });
    }
  }

  // Kiểm tra xem đây có phải là Netlify Function không
  const functionSecret = request.headers.get('X-Netlify-Function-Secret');
  const isNetlifyFunction = functionSecret === context.env.NETLIFY_FUNCTION_SECRET;

  // Kiểm tra yêu cầu vào tệp plist
  const isProtectedPlistPath = (path) => {
    return path.endsWith('.plist') || path.startsWith('/plist') || path.includes('/plist/');
  };

  // Chặn truy cập trực tiếp vào tệp plist nếu không có token hoặc function secret
  if (isProtectedPlistPath(url.pathname)) {
    const plistToken = url.searchParams.get('token');

    if ((!plistToken || !validTokens.has(plistToken)) && !isNetlifyFunction) {
      return Response.redirect('/access-denied', 302);
    }
  }

  return context.next();
};

// Hàm tạo token ngẫu nhiên
function generateToken() {
  return Math.random().toString(36).substr(2, 10);
}
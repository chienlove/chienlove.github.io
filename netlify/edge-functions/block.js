const validTokens = new Map();

export default async (request, context) => {
  const url = new URL(request.url);

  // Thử lấy INTERNAL_SECRET từ Deno.env
  const INTERNAL_SECRET = Deno.env.get('INTERNAL_SECRET');

  if (!INTERNAL_SECRET) {
    console.error('INTERNAL_SECRET chưa được cấu hình.');
    return new Response('Internal server error: INTERNAL_SECRET is missing', { status: 500 });
  }

  // Kiểm tra xem yêu cầu có phải từ một Netlify Function khác không
  const isInternalRequest = request.headers.get('X-Internal-Secret') === INTERNAL_SECRET;

  // Xử lý việc tạo token
  if (request.method === 'POST' && url.pathname === '/generate-token') {
    const token = generateToken();
    const expirationTime = Date.now() + 30000; // Token hết hạn sau 30 giây
    validTokens.set(token, { expirationTime, url: url.searchParams.get('url') });

    // Xóa token sau khi hết hạn
    setTimeout(() => {
      validTokens.delete(token);
    }, expirationTime - Date.now());

    return new Response(token, { status: 200 });
  }

  // Xử lý yêu cầu itms-services với token hoặc yêu cầu nội bộ
  if (url.searchParams.get('action') === 'download-manifest') {
    const plistToken = url.searchParams.get('token');
    const plistUrl = decodeURIComponent(url.searchParams.get('url'));

    // Cho phép yêu cầu nếu có token hợp lệ hoặc là yêu cầu nội bộ
    if ((plistToken && validTokens.has(plistToken)) || isInternalRequest) {
      if (!isInternalRequest) {
        const tokenData = validTokens.get(plistToken);
        if (Date.now() >= tokenData.expirationTime || tokenData.url !== plistUrl) {
          validTokens.delete(plistToken);
          return new Response('Token expired or invalid', { status: 403 });
        }
        validTokens.delete(plistToken); // Xóa token sau khi sử dụng
      }

      // Lấy nội dung plist
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
      return new Response('Invalid or expired token', { status: 403 });
    }
  }

  // Chặn truy cập trực tiếp vào các file plist nếu không có token hợp lệ hoặc không phải là yêu cầu nội bộ
  if (url.pathname.endsWith('.plist') || url.pathname.startsWith('/plist')) {
    const plistToken = url.searchParams.get('token');

    // Cho phép nếu là yêu cầu nội bộ hoặc có token hợp lệ
    if ((!plistToken || !validTokens.has(plistToken)) && !isInternalRequest) {
      return Response.redirect('/access-denied', 302); // Chuyển hướng nếu không có token hợp lệ và không phải là yêu cầu nội bộ
    }
  }

  return context.next();
};

// Hàm tạo token
function generateToken() {
  return Math.random().toString(36).substr(2, 10);
}
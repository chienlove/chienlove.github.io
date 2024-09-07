const validTokens = new Map();

export default async (request, context) => {
  const url = new URL(request.url);

  // Kiểm tra nếu yêu cầu đến từ Netlify bằng cách kiểm tra User-Agent hoặc header đặc biệt
  const isNetlifyRequest = request.headers.get('user-agent')?.includes('Netlify') || 
                           request.headers.get('X-Netlify-Request') === 'true';

  // Xử lý việc tạo token
  if (request.method === 'POST' && url.pathname === '/generate-token') {
    const token = generateToken();
    const expirationTime = Date.now() + 30000; // Token hết hạn sau 30 giây
    validTokens.set(token, { expirationTime, url: url.searchParams.get('url') });
    
    // Đặt thời gian hết hạn token và xoá token khi hết hạn
    setTimeout(() => {
      validTokens.delete(token);
    }, expirationTime - Date.now());

    return new Response(token, { status: 200 });
  }

  // Xử lý yêu cầu itms-services với token
  if (url.searchParams.get('action') === 'download-manifest') {
    const plistToken = url.searchParams.get('token');
    const plistUrl = decodeURIComponent(url.searchParams.get('url'));

    if (plistToken && validTokens.has(plistToken)) {
      const tokenData = validTokens.get(plistToken);

      // Đảm bảo token chỉ được sử dụng cho URL cụ thể và vẫn còn hiệu lực
      if (Date.now() < tokenData.expirationTime && tokenData.url === plistUrl) {
        validTokens.delete(plistToken); // Xoá token ngay sau khi sử dụng
        
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
        validTokens.delete(plistToken); // Xoá token hết hạn hoặc không hợp lệ
        return new Response('Token expired or invalid', { status: 403 });
      }
    } else {
      return new Response('Invalid or expired token', { status: 403 });
    }
  }

  // Chặn truy cập trực tiếp vào các file plist nếu không có token hợp lệ, ngoại trừ các yêu cầu từ Netlify
  if (url.pathname.endsWith('.plist') || url.pathname.startsWith('/plist')) {
    const plistToken = url.searchParams.get('token');

    // Nếu là yêu cầu từ Netlify hoặc token hợp lệ, bỏ qua việc chặn
    if (!isNetlifyRequest && (!plistToken || !validTokens.has(plistToken))) {
      return Response.redirect('/access-denied', 302); // Chặn nếu không có token hợp lệ và không phải yêu cầu từ Netlify
    }
  }

  return context.next();
};

function generateToken() {
  return Math.random().toString(36).substr(2, 10);
}
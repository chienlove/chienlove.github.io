const validTokens = new Map();

export default async (request, context) => {
  const url = new URL(request.url);

  // Xử lý tạo token
  if (request.method === 'POST' && url.pathname === '/generate-token') {
    const token = generateToken();
    const expirationTime = Date.now() + 30000; // Token hết hạn sau 30 giây
    validTokens.set(token, { expirationTime, url: url.searchParams.get('url') });
    
    // Lên lịch xóa token sau khi hết hạn
    setTimeout(() => {
      validTokens.delete(token);
    }, 30000);

    // Chuyển hướng đến trang trung gian với token
    return Response.redirect(`/intermediate.html?token=${token}`, 302);
  }

  // Xử lý yêu cầu itms-services với token
  if (url.searchParams.get('action') === 'download-manifest') {
    const plistToken = url.searchParams.get('token');

    if (plistToken && validTokens.has(plistToken)) {
      const tokenData = validTokens.get(plistToken);
      const plistUrl = tokenData.url;

      // Đảm bảo token vẫn còn hiệu lực
      if (Date.now() < tokenData.expirationTime) {
        validTokens.delete(plistToken); // Xóa token ngay lập tức sau khi sử dụng
        
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
        validTokens.delete(plistToken); // Xóa token đã hết hạn
        return new Response('Token hết hạn', { status: 403 });
      }
    } else {
      return new Response('Token không hợp lệ', { status: 403 });
    }
  }

  // Chặn truy cập trực tiếp vào file plist hoặc thư mục plist
  if (url.pathname.endsWith('.plist') || url.pathname.startsWith('/plist')) {
    return Response.redirect('/access-denied', 302);
  }

  // Endpoint để lấy URL plist từ token
  if (url.pathname === '/get-plist-url') {
    const token = url.searchParams.get('token');
    if (token && validTokens.has(token)) {
      const tokenData = validTokens.get(token);
      if (Date.now() < tokenData.expirationTime) {
        return new Response(JSON.stringify({ url: tokenData.url }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    return new Response('Token không hợp lệ hoặc đã hết hạn', { status: 403 });
  }

  return context.next();
};

function generateToken() {
  return Math.random().toString(36).substr(2, 10);
}
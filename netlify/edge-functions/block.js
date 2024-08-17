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

    return new Response(token, { status: 200 });
  }

  // Xử lý yêu cầu itms-services với token
  if (url.searchParams.get('action') === 'download-manifest') {
    const plistToken = url.searchParams.get('token');
    const plistUrl = decodeURIComponent(url.searchParams.get('url'));

    if (plistToken && validTokens.has(plistToken)) {
      const tokenData = validTokens.get(plistToken);

      // Đảm bảo token chỉ được sử dụng cho URL dự định và vẫn còn hiệu lực
      if (Date.now() < tokenData.expirationTime && tokenData.url === plistUrl) {
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
        validTokens.delete(plistToken); // Xóa token đã hết hạn hoặc không hợp lệ
        return new Response('Token hết hạn hoặc không hợp lệ', { status: 403 });
      }
    } else {
      return new Response('Token không hợp lệ hoặc đã hết hạn', { status: 403 });
    }
  }

  // Chặn truy cập trực tiếp vào file plist hoặc thư mục plist
  if (url.pathname.endsWith('.plist') || url.pathname.startsWith('/plist')) {
    return Response.redirect('/access-denied', 302);
  }

  // Xử lý yêu cầu trang trung gian
  if (url.pathname === '/intermediate') {
    const token = generateToken();
    const plistUrl = url.searchParams.get('url');
    const expirationTime = Date.now() + 60000; // Token hết hạn sau 60 giây
    validTokens.set(token, { expirationTime, url: plistUrl });
    
    // Lên lịch xóa token sau khi hết hạn
    setTimeout(() => {
      validTokens.delete(token);
    }, 60000);

    // Chuyển hướng đến trang trung gian với token
    return Response.redirect(`/intermediate.html?token=${token}`, 302);
  }

  // Endpoint mới để lấy URL plist từ token
  if (url.pathname === '/get-plist-url') {
    const token = url.searchParams.get('token');
    if (token && validTokens.has(token)) {
      const tokenData = validTokens.get(token);
      if (Date.now() < tokenData.expirationTime) {
        const plistUrl = tokenData.url;
        validTokens.delete(token); // Xóa token ngay lập tức sau khi sử dụng
        return new Response(plistUrl, { status: 200 });
      }
    }
    return new Response('Token không hợp lệ hoặc đã hết hạn', { status: 403 });
  }

  return context.next();
};

function generateToken() {
  return Math.random().toString(36).substr(2, 10);
}
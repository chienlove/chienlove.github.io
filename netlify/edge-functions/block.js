const validTokens = new Map();

export default async (request, context) => {
  const url = new URL(request.url);

  // Xử lý việc tạo token
  if (request.method === 'POST' && url.pathname === '/generate-token') {
    const token = generateToken();
    const expirationTime = Date.now() + 30000; // Token hết hạn sau 30 giây
    validTokens.set(token, { expirationTime, url: url.searchParams.get('url') });
    return new Response(token, { status: 200 });
  }

  // Xử lý yêu cầu itms-services với token
  if (url.searchParams.get('action') === 'download-manifest') {
    const plistToken = url.searchParams.get('token');
    const plistUrl = decodeURIComponent(url.searchParams.get('url'));

    if (plistToken && validTokens.has(plistToken)) {
      const tokenData = validTokens.get(plistToken);

      // Đảm bảo token chỉ được sử dụng cho URL đã định và vẫn còn hợp lệ
      if (Date.now() < tokenData.expirationTime && tokenData.url === plistUrl) {
        validTokens.delete(plistToken); // Xóa token ngay sau khi sử dụng
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
        return Response.redirect('/access-denied.html', 302);
      }
    } else {
      return Response.redirect('/access-denied.html', 302);
    }
  }

  // Chặn truy cập trực tiếp vào các file plist mà không có token
  if (url.pathname.endsWith('.plist')) {
    const plistToken = url.searchParams.get('token');

    if (!plistToken || !validTokens.has(plistToken)) {
      return Response.redirect('/access-denied.html', 302);
    }
  }

  return context.next();
};

// Hàm tạo token ngẫu nhiên
function generateToken() {
  return Math.random().toString(36).substr(2, 10);
}
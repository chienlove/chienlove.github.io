const validTokens = new Map();

export default async (request, context) => {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Chặn truy cập vào thư mục /plist và /plist/ nếu không có token
  if (pathname.startsWith('/plist') && !url.searchParams.has('token')) {
    return Response.redirect('/access-denied.html', 302);
  }

  // Xử lý việc tạo token
  if (request.method === 'POST' && pathname === '/generate-token') {
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

      // Kiểm tra tính hợp lệ và thời gian tồn tại của token
      if (Date.now() < tokenData.expirationTime && tokenData.url === plistUrl) {
        // Xóa token trước khi tải plist để đảm bảo không giữ lại token
        validTokens.delete(plistToken); 

        // Tải và trả về nội dung plist
        const response = await fetch(plistUrl);
        const plistContent = await response.text();

        return new Response(plistContent, {
          status: 200,
          headers: {
            'Content-Type': 'application/x-plist',
            'Cache-Control': 'no-store',
            'Pragma': 'no-cache',
          }
        });
      } else {
        validTokens.delete(plistToken); // Xóa token không hợp lệ hoặc hết hạn
        return Response.redirect('/access-denied.html', 302);
      }
    } else {
      return Response.redirect('/access-denied.html', 302);
    }
  }

  // Chặn truy cập trực tiếp vào các file plist mà không có token hợp lệ
  if (pathname.endsWith('.plist')) {
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
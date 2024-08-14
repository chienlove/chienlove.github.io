export default async (request, context) => {
  const url = new URL(request.url);

  // Xử lý yêu cầu itms-services
  if (url.searchParams.get('action') === 'download-manifest' && url.searchParams.get('url')?.includes('.plist')) {
    const plistUrl = url.searchParams.get('url');
    // Tạo một token tạm thời bằng cách mã hóa URL gốc
    const tempToken = btoa(plistUrl).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    
    // Chuyển hướng đến URL tạm thời
    const newUrl = new URL(request.url);
    newUrl.searchParams.set('temp_token', tempToken);
    return Response.redirect(newUrl.toString(), 302);
  }

  // Xử lý yêu cầu với token tạm thời
  if (url.searchParams.has('temp_token')) {
    const tempToken = url.searchParams.get('temp_token');
    try {
      // Giải mã token để lấy URL gốc
      const originalUrl = atob(tempToken.replace(/-/g, '+').replace(/_/g, '/'));
      if (originalUrl.includes('.plist')) {
        // Chuyển hướng đến URL gốc
        return Response.redirect(originalUrl, 302);
      }
    } catch (error) {
      // Xử lý lỗi nếu token không hợp lệ
      return new Response('Invalid token', { status: 400 });
    }
  }

  // Xử lý truy cập trực tiếp đến file .plist
  if (url.pathname.endsWith('.plist')) {
    return new Response('Access Denied', { status: 403 });
  }

  // Chặn truy cập trực tiếp vào thư mục /plist
  if (url.pathname.startsWith('/plist')) {
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Access Denied</title>
        <style>
            /* ... (giữ nguyên CSS như trước) ... */
        </style>
    </head>
    <body>
        <div class="container">
            <img src="https://i.imgur.com/JKNdp0c.png" alt="Access Denied">
            <h1>Access Denied</h1>
            <p>Sorry, you don't have permission to access this resource.</p>
            <a href="/" class="btn">Go to Homepage</a>
        </div>
    </body>
    </html>
    `;
    return new Response(html, { 
      status: 403,
      headers: {
        'Content-Type': 'text/html'
      }
    });
  }
  
  return context.next();
};
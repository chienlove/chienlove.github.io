export default async (request, context) => {
  const url = new URL(request.url);
  const userAgent = request.headers.get('User-Agent') || '';

  // Xử lý yêu cầu itms-services
  if (url.searchParams.get('action') === 'download-manifest') {
    const plistUrl = url.searchParams.get('url');
    if (plistUrl && plistUrl.includes('.plist')) {
      // Tạo một token tạm thời
      const tempToken = Date.now().toString(36) + Math.random().toString(36).substr(2);
      
      // Tạo URL mới với token
      const newUrl = new URL(request.url);
      newUrl.searchParams.set('temp_token', tempToken);
      newUrl.searchParams.set('plist_url', encodeURIComponent(plistUrl));
      newUrl.searchParams.delete('url');
      newUrl.searchParams.delete('action');

      // Chuyển hướng đến URL mới
      return Response.redirect(newUrl.toString(), 302);
    }
  }

  // Xử lý yêu cầu với token tạm thời
  if (url.searchParams.has('temp_token') && url.searchParams.has('plist_url')) {
    const plistUrl = decodeURIComponent(url.searchParams.get('plist_url'));
    
    // Kiểm tra User-Agent
    if (userAgent.includes('iPhone') || userAgent.includes('iPad') || userAgent.includes('iPod') || userAgent.includes('iTunes')) {
      try {
        const response = await fetch(plistUrl);
        if (!response.ok) {
          throw new Error('Failed to fetch .plist file');
        }
        const plistContent = await response.text();
        return new Response(plistContent, {
          status: 200,
          headers: {
            'Content-Type': 'application/x-plist',
            'Content-Disposition': 'attachment; filename="manifest.plist"'
          }
        });
      } catch (error) {
        return new Response('Error fetching .plist file', { status: 500 });
      }
    } else {
      return new Response('Access Denied', { status: 403 });
    }
  }

  // Xử lý truy cập trực tiếp đến file .plist hoặc thư mục /plist
  if (url.pathname.endsWith('.plist') || url.pathname.startsWith('/plist')) {
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
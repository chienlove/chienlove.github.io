// block.js
export default async (request, context) => {
  const url = new URL(request.url);
  const userAgent = request.headers.get('User-Agent') || '';

  // Xử lý yêu cầu itms-services
  if (url.searchParams.get('action') === 'download-manifest') {
    const plistUrl = url.searchParams.get('url');
    if (plistUrl && plistUrl.includes('.plist')) {
      const tempToken = Date.now().toString(36) + Math.random().toString(36).substr(2);
      const newUrl = new URL(request.url);
      newUrl.searchParams.set('temp_token', tempToken);
      newUrl.searchParams.set('plist_url', encodeURIComponent(plistUrl));
      newUrl.searchParams.delete('url');
      newUrl.searchParams.delete('action');

      // Chuyển hướng đến URL mới
      return Response.redirect(newUrl.toString(), 302);
    }
  }

  // Kiểm tra token tạm thời và cung cấp file plist
  if (url.searchParams.has('temp_token') && url.searchParams.has('plist_url')) {
    const plistUrl = decodeURIComponent(url.searchParams.get('plist_url'));
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
            'Content-Disposition': 'attachment; filename="manifest.plist"',
          },
        });
      } catch (error) {
        return new Response('Error fetching .plist file', { status: 500 });
      }
    } else {
      return new Response('Access Denied', { status: 403 });
    }
  }

  // Chặn truy cập trực tiếp vào file plist hoặc thư mục /plist
  if (url.pathname.endsWith('.plist') || url.pathname.startsWith('/plist')) {
    const html = `
      <html>
      <body>
        <h1>Access Denied</h1>
        <p>You don't have permission to access this resource.</p>
      </body>
      </html>`;
    return new Response(html, {
      status: 403,
      headers: { 'Content-Type': 'text/html' },
    });
  }

  return context.next();
};
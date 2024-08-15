export default async (request, context) => {
  const url = new URL(request.url);
  const userAgent = request.headers.get('User-Agent') || '';

  // Xử lý yêu cầu tải manifest
  if (url.searchParams.get('action') === 'download-manifest') {
    const plistUrl = url.searchParams.get('url');
    if (plistUrl && plistUrl.includes('.plist')) {
      // Chuyển hướng đến trang trung gian
      const intermediateUrl = new URL('/intermediate.html', request.url);
      intermediateUrl.searchParams.set('url', plistUrl);
      return Response.redirect(intermediateUrl.toString(), 302);
    }
  }

  // Xử lý yêu cầu có temp_token (giữ lại để tương thích ngược nếu cần)
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

  // Xử lý truy cập trực tiếp vào file .plist hoặc thư mục plist
  if (url.pathname.endsWith('.plist') || url.pathname.startsWith('/plist')) {
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Access Denied</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background-color: #f0f0f0;
            }
            .container {
                text-align: center;
                padding: 20px;
                background-color: white;
                border-radius: 10px;
                box-shadow: 0 0 10px rgba(0,0,0,0.1);
            }
            h1 {
                color: #d9534f;
            }
            .btn {
                display: inline-block;
                padding: 10px 20px;
                margin-top: 20px;
                background-color: #5bc0de;
                color: white;
                text-decoration: none;
                border-radius: 5px;
            }
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
  
  // Xử lý các yêu cầu khác
  return context.next();
};
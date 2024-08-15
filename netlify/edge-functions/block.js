function encodeExtension(url) {
  return url.replace('.plist', '.p1i5t');
}

function decodeExtension(url) {
  return url.replace('.p1i5t', '.plist');
}

export default async (request, context) => {
  const url = new URL(request.url);
  const userAgent = request.headers.get('User-Agent') || '';

  // Xử lý yêu cầu itms-services
  if (url.searchParams.get('action') === 'download-manifest') {
    let plistUrl = url.searchParams.get('url');
    if (plistUrl && plistUrl.includes('.p1i5t')) {
      plistUrl = decodeExtension(plistUrl);

      // Chỉ cho phép yêu cầu từ các thiết bị Apple hoặc trình duyệt giả lập
      if (/iPhone|iPad|iPod|iTunes|Safari/i.test(userAgent)) {
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
  }

  // Chuyển hướng đến trang trung gian nếu truy cập trực tiếp vào file .plist
  if (url.pathname.endsWith('.plist') || url.pathname.startsWith('/plist')) {
    const intermediateUrl = new URL('/intermediate.html', request.url);
    intermediateUrl.searchParams.set('url', url.href);
    return Response.redirect(intermediateUrl.toString(), 302);
  }

  // Xử lý các yêu cầu khác
  return context.next();
};
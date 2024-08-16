const validTokens = new Map(); // In-memory store for valid tokens

export default async (request, context) => {
  const url = new URL(request.url);
  const userAgent = request.headers.get('User-Agent') || '';

  // Generate and validate temp-token
  const tempToken = url.searchParams.get('token');
  if (tempToken) {
    // Store the token temporarily (expires after 5 minutes)
    validTokens.set(tempToken, Date.now() + 5 * 60 * 1000);
  }

  // Xử lý yêu cầu itms-services
  if (url.searchParams.get('action') === 'download-manifest') {
    const plistUrl = url.searchParams.get('url');
    if (plistUrl && plistUrl.includes('.plist')) {
      if (userAgent.includes('iPhone') || userAgent.includes('iPad') || userAgent.includes('iPod') || userAgent.includes('iTunes')) {
        const plistToken = url.searchParams.get('token');
        if (validTokens.has(plistToken) && validTokens.get(plistToken) > Date.now()) {
          try {
            validTokens.delete(plistToken); // Delete the token after use
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
          return new Response('Invalid or expired token', { status: 403 });
        }
      } else {
        return new Response('Access Denied', { status: 403 });
      }
    }
  }

  // Chặn truy cập trực tiếp vào các tệp plist
  if ((url.pathname.endsWith('.plist') || url.pathname.startsWith('/plist')) && !tempToken) {
    return new Response('This endpoint is not accessible directly.', { status: 403 });
  }

  // Xử lý các yêu cầu khác
  return context.next();
};
const validTokens = new Map(); // In-memory store for valid tokens

export default async (request, context) => {
  const url = new URL(request.url);
  const userAgent = request.headers.get('User-Agent') || '';

  // Handle the itms-services request
  if (url.searchParams.get('action') === 'download-manifest') {
    const plistUrl = url.searchParams.get('url');
    const plistToken = url.searchParams.get('token');
    
    if (plistUrl && plistUrl.includes('.plist')) {
      // Verify that the request comes from a compatible user-agent
      if (userAgent.includes('iPhone') || userAgent.includes('iPad') || userAgent.includes('iPod') || userAgent.includes('iTunes')) {
        // Check if token is valid and present
        if (plistToken && validTokens.has(plistToken)) {
          try {
            // Remove the token immediately after use
            validTokens.delete(plistToken);
            
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
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
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

  // Block direct access to plist files without valid token
  if ((url.pathname.endsWith('.plist') || url.pathname.startsWith('/plist')) && !url.searchParams.get('token')) {
    return new Response('This endpoint is not accessible directly.', { status: 403 });
  }

  // Handle other requests
  return context.next();
};
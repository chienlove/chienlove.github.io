const validTokens = new Map();

export default async (request, context) => {
  const url = new URL(request.url);

  // Handle token generation
  if (request.method === 'POST' && url.pathname === '/generate-token') {
    const token = generateToken();
    const expirationTime = Date.now() + 30000; // Token expires in 30 seconds
    const requestedUrl = url.searchParams.get('url');
    
    // Validate requested URL
    if (!requestedUrl || !requestedUrl.endsWith('.plist')) {
      return new Response('Invalid URL', { status: 400 });
    }
    
    validTokens.set(token, { expirationTime, url: requestedUrl });
    
    // Schedule token cleanup after expiration time
    setTimeout(() => {
      validTokens.delete(token);
    }, 30000);
    
    return new Response(token, { status: 200 });
  }

  // Handle the itms-services request with token
  if (url.searchParams.get('action') === 'download-manifest') {
    const plistToken = url.searchParams.get('token');
    const plistUrl = decodeURIComponent(url.searchParams.get('url'));
    
    if (!plistToken || !plistUrl) {
      return new Response('Missing token or URL', { status: 400 });
    }
    
    if (validTokens.has(plistToken)) {
      const tokenData = validTokens.get(plistToken);
      // Ensure token is used only for the intended URL and is still valid
      if (Date.now() < tokenData.expirationTime && tokenData.url === plistUrl) {
        validTokens.delete(plistToken); // Immediately delete token after use
        
        try {
          const response = await fetch(plistUrl);
          if (!response.ok) {
            throw new Error('Failed to fetch PLIST');
          }
          const plistContent = await response.text();
          return new Response(plistContent, {
            status: 200,
            headers: {
              'Content-Type': 'application/x-plist',
              'Cache-Control': 'no-store, no-cache, must-revalidate, private',
              'Pragma': 'no-cache'
            }
          });
        } catch (error) {
          return new Response('Error fetching PLIST', { status: 500 });
        }
      }
    }
    
    return new Response('Invalid or expired token', { status: 403 });
  }

  // Block all direct access to plist files or plist directory
  if (url.pathname.endsWith('.plist') || url.pathname.startsWith('/plist/')) {
      return Response.redirect('/access-denied', 302);
    }

  return context.next();
};

function generateToken() {
  return crypto.randomUUID();
}
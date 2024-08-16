const validTokens = new Map();

export default async (request, context) => {
  const url = new URL(request.url);

  // Block access to plist directory
  if (url.pathname.startsWith('/plist/') || url.pathname === '/plist') {
    return new Response('Access Denied', { status: 403 });
  }

  // Handle token generation
  if (request.method === 'POST' && url.pathname === '/generate-token') {
    const token = generateToken();
    const expirationTime = Date.now() + 30000; // Token expires in 30 seconds
    validTokens.set(token, { expirationTime, url: url.searchParams.get('url') });
    return new Response(token, { status: 200 });
  }

  // Handle the itms-services request with token
  if (url.searchParams.get('action') === 'download-manifest') {
    const plistToken = url.searchParams.get('token');
    const plistUrl = decodeURIComponent(url.searchParams.get('url'));
    
    if (plistToken && validTokens.has(plistToken)) {
      const tokenData = validTokens.get(plistToken);
      
      // Ensure token is used only for the intended URL and is still valid
      if (Date.now() < tokenData.expirationTime && tokenData.url === plistUrl) {
        validTokens.delete(plistToken); // Immediately delete token after use
        try {
          const response = await fetch(plistUrl);
          if (!response.ok) {
            throw new Error('Failed to fetch plist');
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
          console.error('Error fetching plist:', error);
          return new Response('Error fetching plist', { status: 500 });
        }
      } else {
        validTokens.delete(plistToken); // Clean up expired or invalid token
        return new Response('Token expired or invalid', { status: 403 });
      }
    } else {
      return new Response('Invalid or expired token', { status: 403 });
    }
  }

  // Block direct access to plist files without token
  if (url.pathname.endsWith('.plist')) {
    const plistToken = url.searchParams.get('token');
    if (!plistToken || !validTokens.has(plistToken)) {
      return new Response('Access Denied', { status: 403 });
    }
    // If token is valid, let it pass through to be handled by the download-manifest action
  }

  return context.next();
};

function generateToken() {
  return crypto.randomUUID();
}
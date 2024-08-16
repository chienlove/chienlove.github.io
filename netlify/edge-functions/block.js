const validTokens = new Map();

export default async (request, context) => {
  const url = new URL(request.url);

  // Handle token generation
  if (request.method === 'POST' && url.pathname === '/generate-token') {
    const token = generateToken();
    const expirationTime = Date.now() + 30000; // Token expires in 30 seconds (adjust if needed)
    validTokens.set(token, expirationTime);
    return new Response(token, { status: 200 });
  }

  // Handle the itms-services request
  if (url.searchParams.get('action') === 'download-manifest') {
    const plistToken = url.searchParams.get('token');
    
    if (plistToken && validTokens.has(plistToken)) {
      const expirationTime = validTokens.get(plistToken);
      
      if (Date.now() < expirationTime) {
        validTokens.delete(plistToken); // Immediately delete token after use
        const plistUrl = url.searchParams.get('url');
        const response = await fetch(plistUrl);
        const plistContent = await response.text();

        return new Response(plistContent, {
          status: 200,
          headers: {
            'Content-Type': 'application/x-plist',
            'Cache-Control': 'no-store',
            'Pragma': 'no-cache'
          }
        });
      } else {
        validTokens.delete(plistToken); // Clean up expired token
        return new Response('Token expired', { status: 403 });
      }
    } else {
      return new Response('Invalid or expired token', { status: 403 });
    }
  }

  // Block direct access to plist files without token
  if (url.pathname.endsWith('.plist') || url.pathname.startsWith('/plist')) {
    return new Response('Access Denied', { status: 403 });
  }

  return context.next();
};

function generateToken() {
  return Math.random().toString(36).substr(2, 10);
}
const validTokens = new Map();
const INTERNAL_SECRET = process.env.INTERNAL_SECRET; // Đặt điều này trong biến môi trường Netlify

export default async (request, context) => {
  const url = new URL(request.url);

  // Kiểm tra xem yêu cầu có phải từ một Netlify Function khác không
  const isInternalRequest = request.headers.get('X-Internal-Secret') === INTERNAL_SECRET;

  // Handle token generation
  if (request.method === 'POST' && url.pathname === '/generate-token') {
    const token = generateToken();
    const expirationTime = Date.now() + 30000; // Token expires in 30 seconds
    validTokens.set(token, { expirationTime, url: url.searchParams.get('url') });
    
    setTimeout(() => {
      validTokens.delete(token);
    }, expirationTime - Date.now());

    return new Response(token, { status: 200 });
  }

  // Handle the itms-services request with token
  if (url.searchParams.get('action') === 'download-manifest') {
    const plistToken = url.searchParams.get('token');
    const plistUrl = decodeURIComponent(url.searchParams.get('url'));

    if ((plistToken && validTokens.has(plistToken)) || isInternalRequest) {
      if (!isInternalRequest) {
        const tokenData = validTokens.get(plistToken);
        if (Date.now() >= tokenData.expirationTime || tokenData.url !== plistUrl) {
          validTokens.delete(plistToken);
          return new Response('Token expired or invalid', { status: 403 });
        }
        validTokens.delete(plistToken);
      }
      
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
      return new Response('Invalid or expired token', { status: 403 });
    }
  }

  // Block direct access to plist files without token or internal secret
  if (url.pathname.endsWith('.plist') || url.pathname.startsWith('/plist')) {
    const plistToken = url.searchParams.get('token');

    if ((!plistToken || !validTokens.has(plistToken)) && !isInternalRequest) {
      return Response.redirect('/access-denied', 302);
    }
  }

  return context.next();
};

function generateToken() {
  return Math.random().toString(36).substr(2, 10);
}
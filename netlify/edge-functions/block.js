const Redis = require("ioredis");
const redis = new Redis();

export default async (request, context) => {
  const url = new URL(request.url);

  // Handle token generation
  if (request.method === 'POST' && url.pathname === '/generate-token') {
    const token = generateToken();
    const expirationTime = 30; // Token expires in 30 seconds

    // Store token in Redis with expiration time
    await redis.set(token, url.searchParams.get('url'), 'EX', expirationTime);

    return new Response(token, { status: 200 });
  }

  // Handle the itms-services request with token
  if (url.searchParams.get('action') === 'download-manifest') {
    const plistToken = url.searchParams.get('token');
    const plistUrl = decodeURIComponent(url.searchParams.get('url'));

    const storedUrl = await redis.get(plistToken);
    
    if (storedUrl === plistUrl) {
      await redis.del(plistToken); // Immediately delete token after use
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
      return new Response('Token expired or invalid', { status: 403 });
    }
  }

  // Block direct access to plist files without token
  if (url.pathname.endsWith('.plist')) {
    const plistToken = url.searchParams.get('token');
    const storedUrl = await redis.get(plistToken);

    if (!plistToken || !storedUrl) {
      return new Response('Access Denied', { status: 403 });
    }
  }

  return context.next();
};

function generateToken() {
  return Math.random().toString(36).substr(2, 10);
}
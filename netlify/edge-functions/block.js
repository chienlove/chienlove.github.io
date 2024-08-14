export default async (request, context) => {
  const url = new URL(request.url);
  
  if (url.pathname.endsWith('.plist') || url.pathname.startsWith('/plist/')) {
    return new Response('Access Denied', { 
      status: 403,
      headers: {
        'Content-Type': 'text/plain'
      }
    });
  }
  
  return context.next();
};
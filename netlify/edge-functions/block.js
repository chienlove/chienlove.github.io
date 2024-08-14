export default async (request, context) => {
  const url = new URL(request.url);

  // Kiểm tra nếu là yêu cầu itms-services
  if (url.searchParams.get('url') && url.searchParams.get('url').endsWith('.plist') && url.protocol === 'https:') {
    return context.next(); // Cho phép tiếp tục xử lý yêu cầu nếu là itms-services
  }

  // Chặn truy cập vào thư mục /plist và các file .plist trong thư mục này
  if (url.pathname.startsWith('/plist') || url.pathname.endsWith('.plist')) {
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
                background-color: #f0f0f0;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
            }
            .container {
                background-color: white;
                padding: 2rem;
                border-radius: 10px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                text-align: center;
                max-width: 80%;
            }
            h1 {
                color: #e74c3c;
                margin-bottom: 1rem;
            }
            p {
                color: #34495e;
                margin-bottom: 1.5rem;
            }
            img {
                max-width: 100%;
                height: auto;
                margin-bottom: 1.5rem;
                border-radius: 5px;
            }
            .btn {
                display: inline-block;
                background-color: #3498db;
                color: white;
                padding: 0.5rem 1rem;
                text-decoration: none;
                border-radius: 5px;
                transition: background-color 0.3s ease;
            }
            .btn:hover {
                background-color: #2980b9;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <img src="/images/access_denied.png" alt="Access Denied">
            <h1>Sorry, you have been blocked</h1>
          <p>You are unable to access this site.</p>
          <p>Why have I been blocked? This website is using a security service to protect itself from online attacks. The action you just performed triggered the security solution. There are several actions that could trigger this block including submitting a certain word or phrase, a SQL command or malformed data.</p>
          <p>What can I do to resolve this? You can email the site owner to let them know you were blocked. Please include what you were doing when this page came up.</p>
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
  
  return context.next();
};
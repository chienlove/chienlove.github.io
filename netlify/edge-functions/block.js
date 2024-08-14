export default async (request, context) => {
  const url = new URL(request.url);
  
  if (url.pathname.endsWith('.plist') || url.pathname.startsWith('/plist/')) {
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
        <img src="https://i.imgur.com/JKNdp0c.png" alt="Access Denied">
        <h1>Access Denied</h1>
        <p>Sorry, you don't have permission to access this resource.</p>
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
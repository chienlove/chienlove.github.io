exports.handler = async function(event, context) {
  return {
    statusCode: 403,
    body: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Access Denied</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background-color: #f8d7da;
            color: #721c24;
            text-align: center;
          }
          .container {
            background-color: #fff;
            border: 1px solid #f5c6cb;
            border-radius: 8px;
            padding: 2rem;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
            max-width: 600px;
            margin: 0 auto;
          }
          h1 {
            font-size: 2rem;
            margin-bottom: 1rem;
          }
          p {
            font-size: 1rem;
            margin-bottom: 1rem;
          }
          a {
            color: #0056b3;
            text-decoration: none;
            font-weight: bold;
          }
          a:hover {
            text-decoration: underline;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Sorry, you have been blocked</h1>
          <p>You are unable to access this site.</p>
          <p>Why have I been blocked? This website is using a security service to protect itself from online attacks. The action you just performed triggered the security solution. There are several actions that could trigger this block including submitting a certain word or phrase, a SQL command or malformed data.</p>
          <p>What can I do to resolve this? You can email the site owner to let them know you were blocked. Please include what you were doing when this page came up.</p>
          <a href="/">Return to Homepage</a>
        </div>
      </body>
      </html>
    `
  };
};
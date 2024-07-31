exports.handler = async function(event, context) {
  const code = event.queryStringParameters.code;
  
  return {
    statusCode: 200,
    body: `
      <html>
        <body>
          <script>
            window.opener.postMessage({ type: 'oauth', code: '${code}' }, '*');
            window.close();
          </script>
        </body>
      </html>
    `
  };
};
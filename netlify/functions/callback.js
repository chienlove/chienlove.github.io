exports.handler = async function(event, context) {
  const code = event.queryStringParameters.code;
  
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "text/html",
      "Access-Control-Allow-Origin": "*"
    },
    body: `
      <html>
        <body>
          <p>Authentication successful. This window will close automatically.</p>
          <script>
            function sendMessageAndClose() {
              if (window.opener) {
                window.opener.postMessage({ type: 'oauth', code: '${code}' }, '*');
                setTimeout(() => window.close(), 1000);
              } else {
                document.body.innerHTML += '<p>Please close this window and refresh the original page.</p>';
              }
            }
            // Delay the execution to ensure the message is sent
            setTimeout(sendMessageAndClose, 500);
          </script>
        </body>
      </html>
    `
  };
};
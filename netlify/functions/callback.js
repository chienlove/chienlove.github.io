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
          <p id="message">Authentication successful. Processing...</p>
          <script>
            function sendMessageAndClose() {
              if (window.opener) {
                window.opener.postMessage({ type: 'oauth', code: '${code}' }, '*');
                document.getElementById('message').textContent = 'Authentication successful. You can close this window.';
              } else {
                document.getElementById('message').textContent = 'Authentication successful. Please close this window and refresh the original page.';
              }
            }
            // Gọi hàm ngay lập tức
            sendMessageAndClose();
            
            // Thêm một listener để nhận phản hồi từ cửa sổ chính
            window.addEventListener('message', function(event) {
              if (event.data === 'token_received') {
                window.close();
              }
            });
          </script>
        </body>
      </html>
    `
  };
};
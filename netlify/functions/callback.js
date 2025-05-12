exports.handler = async function (event, context) {
  const code = event.queryStringParameters.code || '';

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "text/html",
      "Access-Control-Allow-Origin": "*"
    },
    body: `
      <html>
        <head><title>GitHub OAuth Callback</title></head>
        <body>
          <p id="message">Đăng nhập thành công. Đang xử lý...</p>
          <script>
            function sendMessageAndClose() {
              if (window.opener) {
                window.opener.postMessage({ type: 'oauth', code: '${code}' }, '*');
                document.getElementById('message').textContent = 'Đăng nhập thành công. Bạn có thể đóng cửa sổ này.';
              } else {
                document.getElementById('message').textContent = 'Đăng nhập thành công. Hãy quay lại trang chính.';
              }
            }

            sendMessageAndClose();

            window.addEventListener('message', function(event) {
              if (event.data === 'token_received') {
                window.close();
              }
            });

            // Tự động đóng nếu người dùng quên
            setTimeout(() => window.close(), 5000);
          </script>
        </body>
      </html>
    `
  };
};
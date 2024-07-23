const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  const formData = event.body;

  // Giải mã dữ liệu form
  const data = new URLSearchParams(formData);
  const fileUrl = data.get("file"); // URL của tệp tải lên

  const payload = {
    event_type: "upload",
    client_payload: {
      file_url: fileUrl
    }
  };

  // Gửi webhook đến GitHub Actions
  const response = await fetch(`https://api.github.com/repos/chienlove/chienlove.github.io/dispatches`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `token ${process.env.GITHUB_TOKEN}` // Sử dụng token từ biến môi trường
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    return {
      statusCode: response.status,
      body: JSON.stringify({ error: 'Failed to trigger GitHub Actions webhook' })
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Webhook triggered', file_url: fileUrl })
  };
};
const nodemailer = require('nodemailer');

exports.handler = async (event, context) => {
  const { email, inviteUrl } = JSON.parse(event.body);

  // Tạo transporter dùng cho SMTP
  let transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false, // true cho 465, false cho các cổng khác
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  // Thiết lập nội dung email
  let mailOptions = {
    from: process.env.SMTP_FROM,
    to: email,
    subject: 'Lời mời tham gia',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Lời mời tham gia</title>
      </head>
      <body>
        <p>Chào ${email},</p>
        <p>Bạn đã được mời tham gia trang web của chúng tôi. Vui lòng chấp nhận lời mời bằng cách nhấp vào liên kết dưới đây:</p>
        <p><a href="${inviteUrl}">Chấp nhận lời mời</a></p>
        <p>Nếu bạn không yêu cầu điều này, vui lòng bỏ qua email này.</p>
        <p>Trân trọng,</p>
        <p>Đội ngũ Netlify</p>
      </body>
      </html>
    `
  };

  // Gửi email
  try {
    let info = await transporter.sendMail(mailOptions);
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Email sent', info })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to send email', details: error })
    };
  }
};
const nodemailer = require('nodemailer');

exports.handler = async (event, context) => {
    const { recovery_token } = JSON.parse(event.body);

    const userEmail = await getUserEmailFromToken(recovery_token);

    if (userEmail) {
        let transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: false, // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });

        let mailOptions = {
            from: process.env.SMTP_FROM,
            to: userEmail,
            subject: 'Reset Your Password',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>Reset Your Password</title>
                </head>
                <body>
                    <p>You have requested to reset your password. Click the link below to proceed:</p>
                    <p><a href="https://storeios.net/reset-password?token=${recovery_token}">Reset Password</a></p>
                    <p>If you did not request this, please ignore this email.</p>
                    <p>Regards,</p>
                    <p>The StoreiOS Team</p>
                </body>
                </html>
            `
        };

        try {
            let info = await transporter.sendMail(mailOptions);
            return {
                statusCode: 200,
                body: JSON.stringify({ message: 'Email sent successfully', info })
            };
        } catch (error) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Failed to send email', details: error })
            };
        }
    } else {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Invalid recovery token' })
        };
    }
};

async function getUserEmailFromToken(token) {
    const users = {
        'ZMc4gJg6WoWDp76ZC4yzkg': 'example@email.com'
    };

    return users[token] || null;
}
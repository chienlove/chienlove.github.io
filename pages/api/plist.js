import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

const secret = process.env.JWT_SECRET;

export default async function handler(req, res) {
  const { ipa_name: encodedIpaName, token } = req.query;

  try {
    const decoded = jwt.verify(token, secret);
    const requestedIpaName = decodeURIComponent(encodedIpaName);
    const tokenIpaName = decodeURIComponent(decoded.ipa_name);
    
    // Kiểm tra tên IPA chính xác sau khi decode
    if (tokenIpaName !== requestedIpaName) {
      console.error(`Tên IPA không khớp: ${tokenIpaName} (token) vs ${requestedIpaName} (request)`);
      return res.status(403).send('Invalid token');
    }

    // Đường dẫn tới file plist (giữ nguyên tên gốc)
    const plistPath = path.join(process.cwd(), 'secure/plist', `${requestedIpaName}.plist`);

    if (!fs.existsSync(plistPath)) {
      console.error('Không tìm thấy file:', plistPath);
      return res.status(404).send(`Plist not found for ${requestedIpaName}`);
    }

    res.setHeader('Content-Type', 'application/x-plist');
    fs.createReadStream(plistPath).pipe(res);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).send('Internal Server Error');
  }
}
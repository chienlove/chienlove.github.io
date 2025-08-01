import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

const secret = process.env.JWT_SECRET;

export default async function handler(req, res) {
  const { ipa_name, token } = req.query;

  try {
    const decoded = jwt.verify(token, secret);
    
    // Kiểm tra tên IPA chính xác (không chuẩn hóa)
    if (decoded.ipa_name !== ipa_name) {
      console.error(`Tên IPA không khớp: ${decoded.ipa_name} (token) vs ${ipa_name} (request)`);
      return res.status(403).send('Invalid token');
    }

    // Đường dẫn tới file plist (giữ nguyên tên gốc)
    const plistPath = path.join(process.cwd(), 'secure/plist', `${ipa_name}.plist`);

    if (!fs.existsSync(plistPath)) {
      console.error('Không tìm thấy file:', plistPath);
      return res.status(404).send(`Plist not found for ${ipa_name}`);
    }

    res.setHeader('Content-Type', 'application/x-plist');
    fs.createReadStream(plistPath).pipe(res);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).send('Internal Server Error');
  }
}
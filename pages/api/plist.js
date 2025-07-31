import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

const secret = process.env.JWT_SECRET;

export default async function handler(req, res) {
  const { ipa_name, token } = req.query;

  try {
    // Verify token và kiểm tra ipa_name
    const decoded = jwt.verify(token, secret);
    if (!decoded.ipa_name || decoded.ipa_name !== ipa_name) {
      return res.status(403).send('Invalid token or IPA name');
    }

    // Đường dẫn plist trực tiếp từ tên IPA
    const plistPath = path.join(process.cwd(), 'secure/plist', `${ipa_name}.plist`);
    
    if (!fs.existsSync(plistPath)) {
      return res.status(404).send('Plist not found');
    }

    res.setHeader('Content-Type', 'application/x-plist');
    fs.createReadStream(plistPath).pipe(res);

  } catch (err) {
    console.error('Error:', err);
    res.status(500).send('Internal Server Error');
  }
}
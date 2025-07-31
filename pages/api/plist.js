import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

const secret = process.env.JWT_SECRET;

export default async function handler(req, res) {
  const { ipa_name, token } = req.query;

  try {
    // 1. Kiểm tra token
    const decoded = jwt.verify(token, secret);

    // 2. Tìm file plist CHÍNH XÁC theo tên IPA (không sửa tên)
    const plistPath = path.join(process.cwd(), 'secure/plist', `${ipa_name}.plist`);

    // 3. Kiểm tra file có tồn tại không
    if (!fs.existsSync(plistPath)) {
      console.log('Tìm thấy các file plist sau:', fs.readdirSync(path.join(process.cwd(), 'secure/plist')));
      return res.status(404).send(`Không tìm thấy file: ${ipa_name}.plist`);
    }

    // 4. Trả về file plist
    res.setHeader('Content-Type', 'application/x-plist');
    fs.createReadStream(plistPath).pipe(res);
  } catch (err) {
    console.error('Lỗi:', err);
    res.status(500).send('Lỗi server');
  }
}
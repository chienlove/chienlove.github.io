import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

const secret = process.env.JWT_SECRET;

export default async function handler(req, res) {
  const { ipa_name, token } = req.query;

  if (!ipa_name || !token) {
    return res.status(400).send('Thiếu tham số ipa_name hoặc token');
  }

  try {
    // Xác thực token
    const decoded = jwt.verify(token, secret);
    
    // Kiểm tra tên IPA trong token có khớp với request
    if (decoded.ipa_name !== ipa_name) {
      console.error(`Tên IPA không khớp: Token=${decoded.ipa_name}, Request=${ipa_name}`);
      return res.status(403).send('Token không hợp lệ');
    }

    // Đường dẫn tới file plist (giữ nguyên tên gốc)
    const plistDir = path.join(process.cwd(), 'secure/plist');
    const plistPath = path.join(plistDir, `${ipa_name}.plist`);

    // Debug: Log danh sách file có sẵn
    const files = fs.readdirSync(plistDir);
    console.log('Danh sách file plist:', files);
    console.log('Đang tìm file:', `${ipa_name}.plist`);

    if (!fs.existsSync(plistPath)) {
      return res.status(404).send(`Không tìm thấy file ${ipa_name}.plist`);
    }

    // Trả về file plist
    res.setHeader('Content-Type', 'application/x-plist');
    fs.createReadStream(plistPath).pipe(res);

  } catch (err) {
    console.error('Lỗi xử lý plist:', err);
    
    if (err.name === 'JsonWebTokenError') {
      return res.status(403).send('Token không hợp lệ');
    }
    
    res.status(500).send('Lỗi server');
  }
}
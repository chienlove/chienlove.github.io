import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  try {
    const plistDir = path.join(process.cwd(), 'secure/plist');
    const files = fs.readdirSync(plistDir)
      .filter(file => file.endsWith('.plist'))
      .map(file => file.replace('.plist', '')); // Bỏ đuôi .plist
    
    if (files.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy file plist' });
    }

    // Trả về tên file plist đầu tiên (hoặc customize logic nếu có nhiều file)
    res.status(200).json({ plistName: files[0] });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi khi đọc thư mục plist' });
  }
}
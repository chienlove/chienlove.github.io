import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  const { appSlug } = req.query; // Nhận slug từ frontend (ví dụ: "chimera", "dopamine")

  try {
    const plistDir = path.join(process.cwd(), 'secure/plist');
    const allPlistFiles = fs.readdirSync(plistDir)
      .filter(file => file.endsWith('.plist'))
      .map(file => file.replace('.plist', ''));

    // Lọc plist chứa appSlug (không phân biệt hoa thường)
    const matchedPlist = allPlistFiles.find(name => 
      name.toLowerCase().includes(appSlug.toLowerCase())
    );

    if (!matchedPlist) {
      return res.status(404).json({ 
        error: `Không tìm thấy plist cho ứng dụng ${appSlug}`,
        availablePlist: allPlistFiles // Trả về danh sách plist có sẵn để debug
      });
    }

    res.status(200).json({ plistName: matchedPlist });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server khi đọc plist' });
  }
}
import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  const plistDir = path.join(process.cwd(), 'secure/plist');
  
  try {
    if (!fs.existsSync(plistDir)) {
      return res.status(200).json({ files: [] });
    }

    const files = fs.readdirSync(plistDir)
      .filter(file => file.endsWith('.plist'))
      .map(file => ({
        name: file,
        path: path.join(plistDir, file),
        size: fs.statSync(path.join(plistDir, file)).size,
        mtime: fs.statSync(path.join(plistDir, file)).mtime
      }));

    res.status(200).json({ 
      files: files.sort((a, b) => b.mtime - a.mtime) // Sắp xếp mới nhất trước
    });
  } catch (error) {
    console.error('Error reading plist directory:', error);
    res.status(500).json({ error: 'Unable to read plist directory' });
  }
}
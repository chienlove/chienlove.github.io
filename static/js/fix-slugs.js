const fs = require('fs');
const path = require('path');

function removeAccents(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function processFiles(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      processFiles(filePath); // Duyệt tiếp trong thư mục con
    } else if (path.extname(file) === '.md') {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Tìm title trong frontmatter
      const titleMatch = content.match(/title:\s*"([^"]+)"/);
      if (titleMatch) {
        const title = titleMatch[1];
        const newSlug = removeAccents(title);
        
        // Kiểm tra xem đã có slug chưa
        if (content.includes('slug:')) {
          // Thay thế slug cũ
          content = content.replace(/slug:\s*"[^"]+"/g, `slug: "${newSlug}"`);
        } else {
          // Thêm slug mới vào sau title
          content = content.replace(
            /title:\s*"[^"]+"\n/,
            `title: "${title}"\nslug: "${newSlug}"\n`
          );
        }
        
        fs.writeFileSync(filePath, content);
        console.log(`Processed: ${file} -> ${newSlug}`);
      }
    }
  });
}

// Thư mục cha chứa các thư mục con với bài viết
const rootDir = path.join(__dirname, '../content'); // Thay đổi đường dẫn nếu cần

// Duyệt qua tất cả các thư mục con và áp dụng `processFiles` cho mỗi thư mục
const directories = fs.readdirSync(rootDir).filter(file => {
  const filePath = path.join(rootDir, file);
  return fs.statSync(filePath).isDirectory();
});

directories.forEach(directory => {
  const dirPath = path.join(rootDir, directory);
  processFiles(dirPath); // Áp dụng cho từng thư mục con
});
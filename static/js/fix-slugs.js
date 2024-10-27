const fs = require('fs');
const path = require('path');

// Hàm xóa dấu
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

// Hàm xử lý file
function processFiles(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      processFiles(filePath); // Đệ quy vào thư mục con
    } else if (path.extname(file) === '.md') {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Tìm title trong frontmatter
      const titleMatch = content.match(/title:\s*"([^"]+)"/);
      if (titleMatch) {
        const title = titleMatch[1];
        const newSlug = removeAccents(title);
        
        // Cập nhật slug
        if (content.includes('slug:')) {
          content = content.replace(/slug:\s*"[^"]+"/g, `slug: "${newSlug}"`);
        } else {
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

// Thư mục chứa bài viết
const postsDir = path.join(__dirname, '../content/posts'); // Đường dẫn tới thư mục bài viết
processFiles(postsDir);
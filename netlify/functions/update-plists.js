```javascript
// netlify/functions/update-plists.js

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

exports.handler = async (event, context) => {
  const plistUrls = [
    'https://file.jb-apps.me/plist/Unc0ver_old.plist',
    'LINK_TO_PLIST_2',
    'LINK_TO_PLIST_3'
  ];

  try {
    for (const url of plistUrls) {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Network response was not ok');

      const plistContent = await response.text();
      const fileName = path.basename(url); // Lấy tên file từ URL
      const filePath = path.join(__dirname, '../static/plist/', fileName); // Đường dẫn lưu file

      // Tạo thư mục nếu chưa tồn tại
      fs.mkdirSync(path.dirname(filePath), { recursive: true });

      // Lưu nội dung vào file
      fs.writeFileSync(filePath, plistContent);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Tất cả file plist đã được cập nhật thành công!' }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Có lỗi xảy ra: ' + error.message }),
    };
  }
};

```
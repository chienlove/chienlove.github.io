const fs = require('fs');
const path = require('path');

exports.handler = async function(event, context) {
  try {
    // Lấy đường dẫn tuyệt đối của file hiện tại
    const currentDirectory = __dirname;
    console.log("Current directory:", currentDirectory);
    
    // Tìm đường dẫn đến thư mục content/apps từ thư mục hiện tại
    const postsDirectory = path.join(currentDirectory, '..', 'content', 'apps');
    console.log("Posts directory path:", postsDirectory);

    // Kiểm tra xem thư mục có tồn tại hay không
    if (!fs.existsSync(postsDirectory)) {
      console.error("Directory does not exist:", postsDirectory);
      throw new Error(`Directory does not exist: ${postsDirectory}`);
    }

    // Đọc danh sách tệp tin trong thư mục content/apps
    const filenames = fs.readdirSync(postsDirectory);
    console.log("Filenames:", filenames);

    // Xử lý nội dung từng tệp tin
    const posts = filenames.map(filename => {
      const filePath = path.join(postsDirectory, filename);
      console.log("Reading file:", filePath);
      
      const fileContents = fs.readFileSync(filePath, 'utf8');
      console.log("File contents:", fileContents);

      // Trích xuất tiêu đề từ Markdown front matter
      const match = fileContents.match(/title:\s*(.*)/);
      const title = match ? match[1] : 'No title';

      return {
        title: title,
        link: `/apps/${filename.replace('.md', '')}`,
      };
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ posts }),
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
const fs = require('fs');
const path = require('path');

exports.handler = async function(event, context) {
  try {
    // Sử dụng process.cwd() để lấy thư mục làm việc hiện tại
    const workingDirectory = process.cwd();
    const postsDirectory = path.join(workingDirectory, 'content', 'apps');
    console.log("Posts directory path:", postsDirectory);
    
    // Log cấu trúc thư mục hiện tại
    const currentDirectory = process.cwd();
    console.log("Current directory structure:", fs.readdirSync(currentDirectory));
    
    // Check if directory exists
    if (!fs.existsSync(postsDirectory)) {
      console.error("Directory does not exist:", postsDirectory);
      throw new Error(`Directory does not exist: ${postsDirectory}`);
    }

    const filenames = fs.readdirSync(postsDirectory);
    console.log("Filenames:", filenames);

    const posts = filenames.map(filename => {
      const filePath = path.join(postsDirectory, filename);
      console.log("Reading file:", filePath);
      
      const fileContents = fs.readFileSync(filePath, 'utf8');
      console.log("File contents:", fileContents);

      // Extract the title from the Markdown front matter
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
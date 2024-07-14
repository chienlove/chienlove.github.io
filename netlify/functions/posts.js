const fs = require('fs');
const path = require('path');

exports.handler = async function(event, context) {
  const contentPath = path.join(__dirname, '../../content/apps');
  const files = fs.readdirSync(contentPath);
  const posts = files.map(file => {
    const filePath = path.join(contentPath, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const frontmatterEndIndex = content.indexOf('---', 3) + 3;
    const frontmatter = content.substring(0, frontmatterEndIndex);
    const body = content.substring(frontmatterEndIndex);

    const post = {
      title: frontmatter.match(/title: "([^"]+)"/)[1],
      icon: frontmatter.match(/icon: "([^"]+)"/)[1],
      developer: frontmatter.match(/developer: "([^"]+)"/)[1],
      ios_version: frontmatter.match(/ios_version: "([^"]+)"/)[1],
      app_version: frontmatter.match(/app_version: "([^"]+)"/)[1],
      download_link: frontmatter.match(/download_link: "([^"]+)"/)[1],
      category: frontmatter.match(/category: "([^"]+)"/)[1],
      body: body
    };

    return post;
  });

  return {
    statusCode: 200,
    body: JSON.stringify(posts)
  };
};
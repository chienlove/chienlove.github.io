const fs = require('fs');
const path = require('path');

exports.handler = async function(event, context) {
  const postsDirectory = path.join(__dirname, '../../content/apps');
  const filenames = fs.readdirSync(postsDirectory);

  const posts = filenames.map(filename => {
    const filePath = path.join(postsDirectory, filename);
    const fileContents = fs.readFileSync(filePath, 'utf8');

    // Parse the Markdown content and extract front matter (meta data)
    const post = parseMarkdown(fileContents);

    return {
      title: post.title,
      link: `/apps/${filename.replace('.md', '')}`,
    };
  });

  return {
    statusCode: 200,
    body: JSON.stringify({ posts }),
  };
};

function parseMarkdown(content) {
  const metaMatch = content.match(/---\n([\s\S]+?)\n---/);
  const meta = metaMatch ? metaMatch[1] : '';
  const metaLines = meta.split('\n');
  const metadata = {};
  metaLines.forEach(line => {
    const [key, value] = line.split(':');
    metadata[key.trim()] = value.trim();
  });
  return metadata;
}
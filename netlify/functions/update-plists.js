const axios = require('axios');
const plist = require('plist');

exports.handler = async function(event, context) {
  const owner = 'chienlove';
  const repo = 'chienlove.github.io'; // Thay bằng tên repo của bạn
  const branch = 'master'; // Nhánh mà bạn muốn cập nhật tệp

  const plistMappings = {
    'https://file.jb-apps.me/plist/Unc0ver.plist': 'static/plist/unc0ver.plist',
    'https://file.jb-apps.me/plist/DopamineJB.plist': 'static/plist/dopamine.plist',
    // Thêm các ánh xạ khác ở đây
  };

  try {
    for (const [url, targetFilePath] of Object.entries(plistMappings)) {
      // Lấy nội dung plist từ URL
      const { data: externalPlistContent } = await axios.get(url, {
        headers: {
          Accept: 'application/vnd.github.v3.raw',
        },
      });
      
      // Phân tích nội dung plist từ URL
      const externalPlistData = plist.parse(externalPlistContent);

      // Lấy nội dung của tệp plist từ GitHub
      const { data: fileData } = await axios.get(`https://api.github.com/repos/${owner}/${repo}/contents/${targetFilePath}`, {
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3.raw',
        },
        params: {
          ref: branch,
        },
      });

      // Phân tích nội dung plist từ GitHub
      const targetPlistData = plist.parse(fileData);

      // Thực hiện các thay đổi cần thiết
      targetPlistData.items[0].assets[0].url = externalPlistData.items[0].assets[0].url;
      targetPlistData.items[0].metadata['bundle-version'] = externalPlistData.items[0].metadata['bundle-version'];

      // Chuyển đổi plist thành chuỗi
      const updatedPlistContent = plist.build(targetPlistData);

      // Lấy SHA của tệp hiện tại để ghi đè
      const { data: fileMeta } = await axios.get(`https://api.github.com/repos/${owner}/${repo}/contents/${targetFilePath}`, {
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        },
        params: {
          ref: branch,
        },
      });

      // Ghi tệp đã cập nhật trở lại GitHub
      await axios.put(`https://api.github.com/repos/${owner}/${repo}/contents/${targetFilePath}`, {
        message: `Update ${targetFilePath} via Netlify Function`,
        content: Buffer.from(updatedPlistContent).toString('base64'),
        sha: fileMeta.sha,
        branch: branch,
      }, {
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        },
      });
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Plist files updated successfully' }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to update plist files', details: error.message }),
    };
  }
};
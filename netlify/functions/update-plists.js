const axios = require('axios');
const plist = require('plist');
const crypto = require('crypto');

exports.handler = async function(event, context) {
  const owner = 'chienlove';
  const repo = 'chienlove.github.io'; // Thay bằng tên repo của bạn
  const branch = 'master'; // Nhánh mà bạn muốn cập nhật tệp

  const plistMappings = {
    'https://file.jb-apps.me/plist/Unc0ver.plist': 'static/plist/unc0ver.plist',
    'https://file.jb-apps.me/plist/DopamineJB.plist': 'static/plist/dopamine.plist',
    'https://file.jb-apps.me/plist/XinaA15.plist': 'static/plist/xinaa15.plist',
    'https://file.jb-apps.me/plist/PhoenixJB.plist': 'static/plist/phoenix.plist',
    'https://file.jb-apps.me/plist/Unc0ver_old.plist': 'static/plist/unc0ver_6.1.2.plist',
    'https://file.jb-apps.me/plist/FilzaEscaped15.plist': 'static/plist/filzaescaped15.plist'
    // Thêm các ánh xạ khác ở đây
  };

  try {
    for (const [url, targetFilePath] of Object.entries(plistMappings)) {
      console.log(`Processing ${url} -> ${targetFilePath}`);

      // Fetch external plist content
      const { data: externalPlistContent } = await axios.get(url);
      const externalPlistData = plist.parse(externalPlistContent);
      const externalPlistHash = crypto.createHash('sha256').update(JSON.stringify(externalPlistData)).digest('hex');
      console.log('External plist hash:', externalPlistHash);

      // Fetch GitHub plist content
      let targetPlistData;
      try {
        const { data: fileData } = await axios.get(`https://api.github.com/repos/${owner}/${repo}/contents/${targetFilePath}`, {
          headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3.raw' },
          params: { ref: branch },
        });
        targetPlistData = plist.parse(fileData);
      } catch (error) {
        if (error.response && error.response.status === 404) {
          console.log(`Target file ${targetFilePath} not found, treating as a new file.`);
          targetPlistData = null;
        } else {
          throw error;
        }
      }

      const targetPlistHash = targetPlistData ? crypto.createHash('sha256').update(JSON.stringify(targetPlistData)).digest('hex') : null;
      console.log('Target plist hash:', targetPlistHash);

      // So sánh hash của dữ liệu từ URL và dữ liệu trên GitHub
      if (targetPlistHash === externalPlistHash) {
        console.log(`No update needed for ${targetFilePath}`);
        continue;  // Nếu hash giống nhau, bỏ qua tệp này
      }

      // Update target plist data nếu khác nhau
      if (targetPlistData) {
        if (targetPlistData.items && targetPlistData.items[0] && 
            externalPlistData.items && externalPlistData.items[0]) {
          const targetItem = targetPlistData.items[0];
          const externalItem = externalPlistData.items[0];

          // Update IPA link
          if (targetItem.assets && externalItem.assets) {
            const targetIpaAsset = targetItem.assets.find(asset => asset.kind === 'software-package');
            const externalIpaAsset = externalItem.assets.find(asset => asset.kind === 'software-package');
            if (targetIpaAsset && externalIpaAsset) {
              targetIpaAsset.url = externalIpaAsset.url;
              console.log('Updated IPA URL:', targetIpaAsset.url);
            } else {
              console.warn('Could not find software-package asset in one or both plists');
            }
          }

          // Update metadata
          if (targetItem.metadata && externalItem.metadata) {
            targetItem.metadata['bundle-identifier'] = externalItem.metadata['bundle-identifier'];
            targetItem.metadata['bundle-version'] = externalItem.metadata['bundle-version'];
            console.log('Updated bundle-identifier:', targetItem.metadata['bundle-identifier']);
            console.log('Updated bundle-version:', targetItem.metadata['bundle-version']);
          }
        } else {
          console.error('The structure of plist data is not as expected');
          continue;  // Skip to the next file if structure doesn't match
        }
      } else {
        targetPlistData = externalPlistData; // Nếu tệp chưa tồn tại, tạo mới
      }

      console.log('Updated target plist data:', JSON.stringify(targetPlistData, null, 2));

      // Convert updated plist to string
      const updatedPlistContent = plist.build(targetPlistData);

      // Get current file SHA nếu tệp đã tồn tại
      let fileSha = null;
      if (targetPlistHash) {
        const { data: fileMeta } = await axios.get(`https://api.github.com/repos/${owner}/${repo}/contents/${targetFilePath}`, {
          headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` },
          params: { ref: branch },
        });
        fileSha = fileMeta.sha;
      }

      // Update hoặc tạo mới file trên GitHub
      await axios.put(`https://api.github.com/repos/${owner}/${repo}/contents/${targetFilePath}`, {
        message: `Update ${targetFilePath} via Netlify Function`,
        content: Buffer.from(updatedPlistContent).toString('base64'),
        sha: fileSha,
        branch: branch,
      }, {
        headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` },
      });

      console.log(`Successfully updated ${targetFilePath}`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Plist files updated successfully' }),
    };
  } catch (error) {
    console.error('Error updating plist files:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to update plist files', details: error.message }),
    };
  }
};
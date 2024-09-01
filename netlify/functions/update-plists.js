const axios = require('axios');
const plist = require('plist');
const crypto = require('crypto');

exports.handler = async function(event, context) {
  const owner = 'chienlove';
  const repo = 'chienlove.github.io';
  const branch = 'master';
  const hashFilePath = 'static/plist_hashes.json'; // Tệp JSON để lưu trữ hash

  const plistMappings = {
    'https://file.jb-apps.me/plist/Unc0ver.plist': 'static/plist/unc0ver.plist',
    'https://file.jb-apps.me/plist/DopamineJB.plist': 'static/plist/dopamine.plist',
    'https://file.jb-apps.me/plist/XinaA15.plist': 'static/plist/xinaa15.plist',
    'https://file.jb-apps.me/plist/PhoenixJB.plist': 'static/plist/phoenix.plist',
    'https://file.jb-apps.me/plist/Unc0ver_old.plist': 'static/plist/unc0ver_6.1.2.plist',
    'https://file.jb-apps.me/plist/FilzaEscaped15.plist': 'static/plist/filzaescaped15.plist',
    'https://file.jb-apps.me/plist/Taurine.plist': 'static/plist/taurine.plist'
  };

  try {
    // Fetch hash file from GitHub
    let currentHashes = {};
try {
  const { data: hashFileData } = await axios.get(`https://api.github.com/repos/${owner}/${repo}/contents/${hashFilePath}`, {
    headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3.raw' },
    params: { ref: branch },
  });

  console.log('Raw hash file data:', hashFileData); // Debug xem dữ liệu thô trông như thế nào

  currentHashes = JSON.parse(hashFileData);
} catch (error) {
  console.log('Error fetching or parsing hash file data:', error);
  if (error.response && error.response.status === 404) {
    console.log(`Hash file not found, initializing empty hash object.`);
  } else {
    throw error;
  }
}

    let updatedHashes = { ...currentHashes };

    for (const [url, targetFilePath] of Object.entries(plistMappings)) {
      console.log(`Processing ${url} -> ${targetFilePath}`);

      // Fetch external plist content
      const { data: externalPlistContent } = await axios.get(url);
      const externalPlistData = plist.parse(externalPlistContent);
      const externalPlistHash = crypto.createHash('sha256').update(JSON.stringify(externalPlistData)).digest('hex');
      console.log('External plist hash:', externalPlistHash);

      // Check if the file needs updating
      if (currentHashes[targetFilePath] === externalPlistHash) {
        console.log(`No update needed for ${targetFilePath}`);
        continue;  // Bỏ qua tệp này nếu hash trùng nhau
      }

      // Update target plist data nếu khác nhau hoặc nếu tệp không tồn tại
      let targetPlistData;
      try {
        const { data: fileData } = await axios.get(`https://api.github.com/repos/${owner}/${repo}/contents/${targetFilePath}`, {
          headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3.raw' },
          params: { ref: branch },
        });
        targetPlistData = plist.parse(fileData);

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
      } catch (error) {
        if (error.response && error.response.status === 404) {
          console.log(`Target file ${targetFilePath} not found, treating as a new file.`);
          targetPlistData = externalPlistData; // Tạo mới nếu tệp không tồn tại
        } else {
          throw error;
        }
      }

      console.log('Updated target plist data:', JSON.stringify(targetPlistData, null, 2));

      // Convert updated plist to string
      const updatedPlistContent = plist.build(targetPlistData);

      // Get current file SHA nếu tệp đã tồn tại
      let fileSha = null;
      if (targetPlistData) {
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

      // Update hash table with new hash
      updatedHashes[targetFilePath] = externalPlistHash;
    }

    // Update hash file on GitHub nếu có sự thay đổi
    if (JSON.stringify(currentHashes) !== JSON.stringify(updatedHashes)) {
      const updatedHashContent = Buffer.from(JSON.stringify(updatedHashes, null, 2)).toString('base64');

      // Get SHA of current hash file (if exists)
      let hashFileSha = null;
      try {
        const { data: hashFileMeta } = await axios.get(`https://api.github.com/repos/${owner}/${repo}/contents/${hashFilePath}`, {
          headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` },
          params: { ref: branch },
        });
        hashFileSha = hashFileMeta.sha;
      } catch (error) {
        if (error.response && error.response.status !== 404) {
          throw error;
        }
      }

      await axios.put(`https://api.github.com/repos/${owner}/${repo}/contents/${hashFilePath}`, {
        message: `Update plist hashes via Netlify Function`,
        content: updatedHashContent,
        sha: hashFileSha,
        branch: branch,
      }, {
        headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` },
      });

      console.log('Successfully updated hash file.');
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Plist files and hash file updated successfully' }),
    };
  } catch (error) {
    console.error('Error updating plist files or hash file:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to update plist files or hash file', details: error.message }),
    };
  }
};
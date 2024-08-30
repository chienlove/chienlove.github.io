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
      console.log(`\n--- Processing ${url} -> ${targetFilePath} ---`);

      // Fetch external plist content
      console.log('Fetching external plist content...');
      const { data: externalPlistContent } = await axios.get(url);
      const externalPlistData = plist.parse(externalPlistContent);
      console.log('External plist data:', JSON.stringify(externalPlistData, null, 2));

      // Fetch GitHub plist content
      console.log('Fetching GitHub plist content...');
      const { data: fileData } = await axios.get(`https://api.github.com/repos/${owner}/${repo}/contents/${targetFilePath}`, {
        headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3.raw' },
        params: { ref: branch },
      });
      const targetPlistData = plist.parse(fileData);
      console.log('Target plist data:', JSON.stringify(targetPlistData, null, 2));

      // Update target plist data
      console.log('Updating target plist data...');
      if (targetPlistData.items && targetPlistData.items[0] && 
          externalPlistData.items && externalPlistData.items[0]) {
        const targetItem = targetPlistData.items[0];
        const externalItem = externalPlistData.items[0];

        // Update IPA link
        if (targetItem.assets && externalItem.assets) {
          const targetIpaAsset = targetItem.assets.find(asset => asset.kind === 'software-package');
          const externalIpaAsset = externalItem.assets.find(asset => asset.kind === 'software-package');
          if (targetIpaAsset && externalIpaAsset) {
            console.log('Old IPA URL:', targetIpaAsset.url);
            targetIpaAsset.url = externalIpaAsset.url;
            console.log('New IPA URL:', targetIpaAsset.url);
          } else {
            console.warn('Could not find software-package asset in one or both plists');
          }
        }

        // Update metadata
        if (targetItem.metadata && externalItem.metadata) {
          console.log('Old bundle-identifier:', targetItem.metadata['bundle-identifier']);
          console.log('Old bundle-version:', targetItem.metadata['bundle-version']);
          
          targetItem.metadata['bundle-identifier'] = externalItem.metadata['bundle-identifier'];
          targetItem.metadata['bundle-version'] = externalItem.metadata['bundle-version'];
          
          console.log('New bundle-identifier:', targetItem.metadata['bundle-identifier']);
          console.log('New bundle-version:', targetItem.metadata['bundle-version']);
        }
      } else {
        console.error('The structure of plist data is not as expected');
        continue;  // Skip to the next file if structure doesn't match
      }

      console.log('Updated target plist data:', JSON.stringify(targetPlistData, null, 2));

      // Convert updated plist to string
      console.log('Converting updated plist to string...');
      const updatedPlistContent = plist.build(targetPlistData);

      // Get current file SHA
      console.log('Getting current file SHA...');
      const { data: fileMeta } = await axios.get(`https://api.github.com/repos/${owner}/${repo}/contents/${targetFilePath}`, {
        headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` },
        params: { ref: branch },
      });

      // Update file on GitHub
      console.log('Updating file on GitHub...');
      const response = await axios.put(`https://api.github.com/repos/${owner}/${repo}/contents/${targetFilePath}`, {
        message: `Update ${targetFilePath} via Netlify Function`,
        content: Buffer.from(updatedPlistContent).toString('base64'),
        sha: fileMeta.sha,
        branch: branch,
      }, {
        headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` },
      });

      console.log(`GitHub API response status: ${response.status}`);
      console.log(`GitHub API response data:`, JSON.stringify(response.data, null, 2));

      console.log(`Successfully updated ${targetFilePath}`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Plist files updated successfully' }),
    };
  } catch (error) {
    console.error('Error updating plist files:', error);
    if (error.response) {
      console.error('Error response:', error.response.data);
    }
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to update plist files', details: error.message }),
    };
  }
};
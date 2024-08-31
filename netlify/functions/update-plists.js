cconst axios = require('axios');
const plist = require('plist');

exports.handler = async function(event, context) {
  const owner = 'chienlove';
  const repo = 'chienlove.github.io';
  const branch = 'master';

  const plistMappings = {
    'https://file.jb-apps.me/plist/Unc0ver.plist': 'static/plist/unc0ver.plist',
    'https://file.jb-apps.me/plist/DopamineJB.plist': 'static/plist/dopamine.plist',
    'https://file.jb-apps.me/plist/XinaA15.plist': 'static/plist/xinaa15.plist',
    'https://file.jb-apps.me/plist/PhoenixJB.plist': 'static/plist/phoenix.plist'
    // Thêm các ánh xạ khác ở đây
  };

  try {
    for (const [url, targetFilePath] of Object.entries(plistMappings)) {
      console.log(`Processing ${url} -> ${targetFilePath}`);

      // Fetch external plist content
      const { data: externalPlistContent } = await axios.get(url);
      const externalPlistData = plist.parse(externalPlistContent);

      // Fetch GitHub plist content
      let targetPlistData;
      let fileMeta;
      try {
        const { data: fileData, headers } = await axios.get(`https://api.github.com/repos/${owner}/${repo}/contents/${targetFilePath}`, {
          headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3.raw' },
          params: { ref: branch },
        });
        targetPlistData = plist.parse(fileData);
        fileMeta = JSON.parse(Buffer.from(headers['x-github-media-type'], 'base64').toString());
      } catch (error) {
        if (error.response && error.response.status === 404) {
          console.log(`${targetFilePath} does not exist. Creating new file.`);
          targetPlistData = { items: [{ assets: [], metadata: {} }] };
        } else {
          throw error;
        }
      }

      let updated = false;

      if (targetPlistData.items && targetPlistData.items[0] && 
          externalPlistData.items && externalPlistData.items[0]) {
        const targetItem = targetPlistData.items[0];
        const externalItem = externalPlistData.items[0];

        // Update IPA link
        if (targetItem.assets && externalItem.assets) {
          const targetIpaAsset = targetItem.assets.find(asset => asset.kind === 'software-package');
          const externalIpaAsset = externalItem.assets.find(asset => asset.kind === 'software-package');
          if (targetIpaAsset && externalIpaAsset && targetIpaAsset.url !== externalIpaAsset.url) {
            targetIpaAsset.url = externalIpaAsset.url;
            console.log('Updated IPA URL:', targetIpaAsset.url);
            updated = true;
          }
        }

        // Update metadata
        if (targetItem.metadata && externalItem.metadata) {
          if (targetItem.metadata['bundle-identifier'] !== externalItem.metadata['bundle-identifier']) {
            targetItem.metadata['bundle-identifier'] = externalItem.metadata['bundle-identifier'];
            console.log('Updated bundle-identifier:', targetItem.metadata['bundle-identifier']);
            updated = true;
          }
          if (targetItem.metadata['bundle-version'] !== externalItem.metadata['bundle-version']) {
            targetItem.metadata['bundle-version'] = externalItem.metadata['bundle-version'];
            console.log('Updated bundle-version:', targetItem.metadata['bundle-version']);
            updated = true;
          }
        }
      }

      if (updated) {
        console.log('Changes detected. Updating file on GitHub...');
        
        // Convert updated plist to string
        const updatedPlistContent = plist.build(targetPlistData);

        // Update file on GitHub
        await axios.put(`https://api.github.com/repos/${owner}/${repo}/contents/${targetFilePath}`, {
          message: `Update ${targetFilePath} via Netlify Function`,
          content: Buffer.from(updatedPlistContent).toString('base64'),
          sha: fileMeta ? fileMeta.sha : undefined,
          branch: branch,
        }, {
          headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` },
        });

        console.log(`Successfully updated ${targetFilePath}`);
      } else {
        console.log(`No changes detected for ${targetFilePath}. Skipping update.`);
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Plist files processed successfully' }),
    };
  } catch (error) {
    console.error('Error processing plist files:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to process plist files', details: error.message }),
    };
  }
};
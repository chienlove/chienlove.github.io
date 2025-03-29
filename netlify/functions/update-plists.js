const axios = require('axios');
const plist = require('plist');
const crypto = require('crypto');

exports.handler = async function(event, context) {
  // Sử dụng biến môi trường
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const owner = 'chienlove';
  const repo = 'chienlove.github.io';
  const branch = 'master';
  const hashFilePath = 'static/plist_hashes.json';
  
  // Kiểm tra điều kiện tiên quyết
  if (!GITHUB_TOKEN) {
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'GITHUB_TOKEN is missing',
        timestamp: new Date().toISOString()
      })
    };
  }
  
  // Thiết lập timeout cho function (giảm xuống để tránh timeout của Netlify)
  context.callbackWaitsForEmptyEventLoop = false;
  
  // Danh sách các plist cần cập nhật
  const plistMappings = {
    'https://file.jb-apps.me/plist/Unc0ver.plist': 'static/plist/unc0ver.plist',
    'https://file.jb-apps.me/plist/DopamineJB.plist': 'static/plist/dopamine.plist',
    'https://file.jb-apps.me/plist/XinaA15.plist': 'static/plist/xinaa15.plist',
    'https://file.jb-apps.me/plist/PhoenixJB.plist': 'static/plist/phoenix.plist',
    'https://file.jb-apps.me/plist/Unc0ver_old.plist': 'static/plist/unc0ver_6.1.2.plist',
    'https://file.jb-apps.me/plist/FilzaEscaped15.plist': 'static/plist/filzaescaped15.plist',
    'https://file.jb-apps.me/plist/Taurine.plist': 'static/plist/taurine.plist',
    'https://file.jb-apps.me/plist/NekoJB.plist': 'static/plist/neko.plist',
    'https://file.jb-apps.me/plist/ChimeraJB.plist': 'static/plist/chimera.plist',
    'https://file.jb-apps.me/plist/OdysseyJB.plist': 'static/plist/odyssey.plist',
    'https://file.jb-apps.me/plist/Freya.plist': 'static/plist/freya.plist'
  };

  // Thiết lập axios với timeout ngắn hơn (5 giây thay vì 8)
  const githubAxios = axios.create({
    timeout: 5000,
    headers: { 
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3+json'
    }
  });

  const externalAxios = axios.create({
    timeout: 5000
  });

  let updatesPerformed = false;
  let currentHashes = {};

  try {
    // Lấy hash file hiện tại từ GitHub
    try {
      const response = await githubAxios.get(
        `https://api.github.com/repos/${owner}/${repo}/contents/${hashFilePath}`,
        { params: { ref: branch }}
      );
      
      if (response.data && response.data.content) {
        const content = Buffer.from(response.data.content, 'base64').toString('utf8');
        try {
          currentHashes = JSON.parse(content);
        } catch (e) {
          console.log('Invalid hash file format, starting with empty hash object');
          currentHashes = {};
        }
      }
    } catch (error) {
      console.log(`Error fetching hash file: ${error.message}`);
      currentHashes = {};
    }

    let updatedHashes = { ...currentHashes };
    const updatePromises = [];

    // Xử lý các plist song song thay vì tuần tự
    for (const [url, targetFilePath] of Object.entries(plistMappings)) {
      updatePromises.push(
        processPlistFile(url, targetFilePath, currentHashes, updatedHashes, githubAxios, externalAxios, owner, repo, branch)
          .then(updated => {
            if (updated.success) {
              updatesPerformed = true;
              updatedHashes[targetFilePath] = updated.hash;
              return { targetFilePath, status: 'updated' };
            }
            return { targetFilePath, status: 'skipped' };
          })
          .catch(error => {
            console.log(`Error processing ${targetFilePath}: ${error.message}`);
            return { targetFilePath, status: 'error', error: error.message };
          })
      );
    }

    // Chờ tất cả các xử lý plist hoàn thành (với timeout)
    const updateResults = await Promise.allSettled(updatePromises);
    
    // Cập nhật file hash nếu có thay đổi
    if (JSON.stringify(currentHashes) !== JSON.stringify(updatedHashes)) {
      try {
        const hashFileResponse = await githubAxios.get(
          `https://api.github.com/repos/${owner}/${repo}/contents/${hashFilePath}`,
          { 
            params: { ref: branch },
            headers: { Accept: 'application/json' }
          }
        ).catch(() => ({ data: null }));

        const hashFileSha = hashFileResponse.data ? hashFileResponse.data.sha : null;
        
        await githubAxios({
          method: 'put',
          url: `https://api.github.com/repos/${owner}/${repo}/contents/${hashFilePath}`,
          data: {
            message: `Update plist hashes via Netlify Function`,
            content: Buffer.from(JSON.stringify(updatedHashes, null, 2)).toString('base64'),
            sha: hashFileSha,
            branch: branch
          }
        });

        console.log('Successfully updated hash file');
        updatesPerformed = true;
      } catch (error) {
        console.log(`Error updating hash file: ${error.message}`);
      }
    }

    // Trả về kết quả
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: updatesPerformed 
          ? 'Plist files and/or hash file updated successfully' 
          : 'No updates were necessary. All files are up to date.',
        timestamp: new Date().toISOString(),
        results: updateResults.map(r => r.value || r.reason)
      })
    };
  } catch (error) {
    console.error(`Critical error: ${error.message}`);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to update plist files or hash file', 
        details: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};

/**
 * Xử lý một file plist
 */
async function processPlistFile(url, targetFilePath, currentHashes, updatedHashes, githubAxios, externalAxios, owner, repo, branch) {
  console.log(`Processing ${url} -> ${targetFilePath}`);
  
  // Fetch và parse external plist
  const { data: externalPlistContent } = await externalAxios.get(url);
  const externalPlistData = plist.parse(externalPlistContent);
  
  // Tính hash của dữ liệu mới
  const externalPlistHash = crypto.createHash('sha256')
    .update(JSON.stringify(externalPlistData))
    .digest('hex');
  
  // Kiểm tra xem có cần cập nhật không
  if (currentHashes[targetFilePath] === externalPlistHash) {
    console.log(`No update needed for ${targetFilePath}`);
    return { success: false };
  }
  
  // Lấy dữ liệu plist và SHA hiện tại (nếu có)
  let targetPlistData = externalPlistData; // Mặc định sử dụng dữ liệu ngoài
  let fileSha = null;
  
  try {
    // Lấy thông tin file hiện tại
    const fileResponse = await githubAxios.get(
      `https://api.github.com/repos/${owner}/${repo}/contents/${targetFilePath}`,
      { params: { ref: branch }}
    );
    
    if (fileResponse.data) {
      // Lấy SHA
      fileSha = fileResponse.data.sha;
      
      // Lấy và parse nội dung
      const content = Buffer.from(fileResponse.data.content, 'base64').toString('utf8');
      try {
        targetPlistData = plist.parse(content);
        
        // Cập nhật dữ liệu từ file mới
        if (targetPlistData.items && targetPlistData.items[0] &&
            externalPlistData.items && externalPlistData.items[0]) {
          
          const targetItem = targetPlistData.items[0];
          const externalItem = externalPlistData.items[0];
          
          // Cập nhật IPA link
          if (targetItem.assets && externalItem.assets) {
            const targetIpaAsset = targetItem.assets.find(asset => asset.kind === 'software-package');
            const externalIpaAsset = externalItem.assets.find(asset => asset.kind === 'software-package');
            
            if (targetIpaAsset && externalIpaAsset) {
              targetIpaAsset.url = externalIpaAsset.url;
            }
          }
          
          // Cập nhật metadata
          if (targetItem.metadata && externalItem.metadata) {
            targetItem.metadata['bundle-identifier'] = externalItem.metadata['bundle-identifier'];
            targetItem.metadata['bundle-version'] = externalItem.metadata['bundle-version'];
          }
        } else {
          // Nếu cấu trúc không đúng, sử dụng dữ liệu mới
          targetPlistData = externalPlistData;
        }
      } catch (e) {
        // Parse lỗi, sử dụng dữ liệu mới
        targetPlistData = externalPlistData;
      }
    }
  } catch (error) {
    console.log(`File ${targetFilePath} not found or error: ${error.message}`);
    // Tiếp tục với dữ liệu mặc định (externalPlistData)
  }
  
  // Build plist content
  const updatedPlistContent = plist.build(targetPlistData);
  
  // Cập nhật file trên GitHub
  await githubAxios({
    method: 'put',
    url: `https://api.github.com/repos/${owner}/${repo}/contents/${targetFilePath}`,
    data: {
      message: `Update ${targetFilePath} via Netlify Function`,
      content: Buffer.from(updatedPlistContent).toString('base64'),
      sha: fileSha,
      branch: branch
    }
  });
  
  console.log(`Successfully updated ${targetFilePath}`);
  return { success: true, hash: externalPlistHash };
}
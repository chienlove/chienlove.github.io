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
  
  // Thiết lập timeout cho function
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

    // Xử lý các plist tuần tự thay vì song song để tránh xung đột
    for (const [url, targetFilePath] of Object.entries(plistMappings)) {
      updatePromises.push(
        processPlistFile(url, targetFilePath, currentHashes, updatedHashes, githubAxios, externalAxios, owner, repo, branch)
          .then(updated => {
            if (updated.success) {
              updatesPerformed = true;
              updatedHashes[targetFilePath] = updated.hash;
              return { targetFilePath, status: 'updated' };
            }
            return { targetFilePath, status: 'skipped', reason: updated.reason };
          })
          .catch(error => {
            console.log(`Error processing ${targetFilePath}: ${error.message}`);
            return { targetFilePath, status: 'error', error: error.message };
          })
      );
      
      // Thêm độ trễ 500ms giữa các request để tránh xung đột
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Chờ tất cả các xử lý plist hoàn thành
    const updateResults = await Promise.all(updatePromises);
    
    // Cập nhật file hash nếu có thay đổi
    if (JSON.stringify(currentHashes) !== JSON.stringify(updatedHashes)) {
      try {
        // Đảm bảo lấy phiên bản mới nhất của file hash
        const hashFileResponse = await githubAxios.get(
          `https://api.github.com/repos/${owner}/${repo}/contents/${hashFilePath}`,
          { params: { ref: branch } }
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
        results: updateResults
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
 * Xử lý một file plist với xử lý lỗi 409
 */
async function processPlistFile(url, targetFilePath, currentHashes, updatedHashes, githubAxios, externalAxios, owner, repo, branch) {
  console.log(`Processing ${url} -> ${targetFilePath}`);
  
  try {
    // Fetch và parse external plist
    let externalPlistData;
    try {
      const { data: externalPlistContent } = await externalAxios.get(url);
      externalPlistData = plist.parse(externalPlistContent);
    } catch (error) {
      return { 
        success: false, 
        reason: `Failed to fetch or parse external plist: ${error.message}` 
      };
    }
    
    // Tính hash của dữ liệu mới
    const externalPlistHash = crypto.createHash('sha256')
      .update(JSON.stringify(externalPlistData))
      .digest('hex');
    
    // Kiểm tra xem có cần cập nhật không
    if (currentHashes[targetFilePath] === externalPlistHash) {
      console.log(`No update needed for ${targetFilePath}`);
      return { success: false, reason: 'No update needed' };
    }
    
    // Nỗ lực tối đa 3 lần để cập nhật file
    let attempt = 0;
    const maxAttempts = 3;
    
    while (attempt < maxAttempts) {
      attempt++;
      console.log(`Attempt ${attempt} to update ${targetFilePath}`);
      
      try {
        // Luôn lấy phiên bản mới nhất của file để đảm bảo SHA chính xác
        const fileResponse = await githubAxios.get(
          `https://api.github.com/repos/${owner}/${repo}/contents/${targetFilePath}`,
          { params: { ref: branch } }
        ).catch(error => {
          if (error.response && error.response.status === 404) {
            return { data: null }; // File không tồn tại
          }
          throw error; // Lỗi khác, ném ra ngoài
        });
        
        let targetPlistData;
        let fileSha = null;
        
        if (fileResponse.data) {
          // Lấy SHA hiện tại
          fileSha = fileResponse.data.sha;
          
          // Parse nội dung hiện tại
          try {
            const content = Buffer.from(fileResponse.data.content, 'base64').toString('utf8');
            targetPlistData = plist.parse(content);
            
            // Cập nhật dữ liệu
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
            console.log(`Error parsing current plist: ${e.message}`);
            targetPlistData = externalPlistData;
          }
        } else {
          // File không tồn tại, sử dụng dữ liệu mới
          targetPlistData = externalPlistData;
        }
        
        // Build plist content
        const updatedPlistContent = plist.build(targetPlistData);
        
        // Gửi cập nhật lên GitHub
        await githubAxios({
          method: 'put',
          url: `https://api.github.com/repos/${owner}/${repo}/contents/${targetFilePath}`,
          data: {
            message: `Update ${targetFilePath} via Netlify Function [${new Date().toISOString()}]`,
            content: Buffer.from(updatedPlistContent).toString('base64'),
            sha: fileSha,
            branch: branch
          }
        });
        
        console.log(`Successfully updated ${targetFilePath}`);
        return { success: true, hash: externalPlistHash };
        
      } catch (error) {
        if (error.response && error.response.status === 409) {
          console.log(`Conflict (409) updating ${targetFilePath}, attempt ${attempt}`);
          
          if (attempt < maxAttempts) {
            // Thêm độ trễ ngẫu nhiên trước khi thử lại
            const delay = 1000 + Math.floor(Math.random() * 1000);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue; // Thử lại
          }
        }
        
        throw error; // Ném lỗi ra ngoài nếu không phải 409 hoặc đã hết số lần thử
      }
    }
    
    return { 
      success: false, 
      reason: `Failed after ${maxAttempts} attempts due to conflicts` 
    };
    
  } catch (error) {
    console.log(`Error in processPlistFile for ${targetFilePath}: ${error.message}`);
    throw error;
  }
}
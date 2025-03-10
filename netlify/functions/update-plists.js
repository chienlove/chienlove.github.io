const axios = require('axios');
const plist = require('plist');
const crypto = require('crypto');

exports.handler = async function(event, context) {
  // Thiết lập timeout cho function (vẫn dưới giới hạn 10s của Netlify)
  context.callbackWaitsForEmptyEventLoop = false;
  
  const owner = 'chienlove';
  const repo = 'chienlove.github.io';
  const branch = 'master';
  const hashFilePath = 'static/plist_hashes.json';

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

  // Thiết lập axios với timeout
  const githubAxios = axios.create({
    timeout: 8000, // 8 giây
    headers: { 
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3.raw'
    }
  });

  const externalAxios = axios.create({
    timeout: 8000 // 8 giây
  });

  let updatesPerformed = false;
  let currentHashes = {};

  try {
    // Kiểm tra token GitHub
    if (!process.env.GITHUB_TOKEN) {
      throw new Error('GITHUB_TOKEN is not defined');
    }

    // Fetch hash file từ GitHub với xử lý lỗi tốt hơn
    try {
      const response = await githubAxios.get(
        `https://api.github.com/repos/${owner}/${repo}/contents/${hashFilePath}`,
        { params: { ref: branch } }
      );

      if (typeof response.data === 'string') {
        try {
          currentHashes = JSON.parse(response.data);
        } catch (parseError) {
          console.error('Error parsing hash file as JSON string:', parseError);
          currentHashes = {};
        }
      } else if (typeof response.data === 'object') {
        if (response.data.content) {
          try {
            const decodedContent = Buffer.from(response.data.content, 'base64').toString('utf8');
            currentHashes = JSON.parse(decodedContent);
          } catch (decodeError) {
            console.error('Error decoding or parsing hash file content:', decodeError);
            currentHashes = {};
          }
        } else {
          currentHashes = response.data;
        }
      }
    } catch (error) {
      console.log('Error fetching hash file:', error.message);
      if (error.response) {
        console.log('Status:', error.response.status);
        console.log('Data:', JSON.stringify(error.response.data));
      }
      
      if (error.response && error.response.status === 404) {
        console.log('Hash file not found, starting with empty hash object.');
        currentHashes = {};
      } else {
        // Tiếp tục với hash trống thay vì throw error
        console.log('Using empty hash object due to fetch error.');
        currentHashes = {};
      }
    }

    let updatedHashes = { ...currentHashes };

    // Xử lý từng plist một cách tuần tự để giảm tải
    for (const [url, targetFilePath] of Object.entries(plistMappings)) {
      try {
        console.log(`Processing ${url} -> ${targetFilePath}`);

        // Fetch external plist content với timeout
        let externalPlistContent;
        try {
          const { data } = await externalAxios.get(url);
          externalPlistContent = data;
        } catch (fetchError) {
          console.log(`Error fetching external plist from ${url}:`, fetchError.message);
          continue; // Bỏ qua file này nếu không tải được
        }

        // Parse external plist
        let externalPlistData;
        try {
          externalPlistData = plist.parse(externalPlistContent);
        } catch (parseError) {
          console.log(`Error parsing external plist from ${url}:`, parseError.message);
          continue; // Bỏ qua file này nếu parse lỗi
        }

        // Tính hash
        const externalPlistHash = crypto.createHash('sha256')
          .update(JSON.stringify(externalPlistData))
          .digest('hex');
        
        // Kiểm tra xem có cần cập nhật không
        if (currentHashes[targetFilePath] === externalPlistHash) {
          console.log(`No update needed for ${targetFilePath}`);
          continue;
        }

        // Lấy dữ liệu plist hiện tại từ repo (nếu có)
        let targetPlistData;
        let fileSha = null;
        
        try {
          const { data: fileData } = await githubAxios.get(
            `https://api.github.com/repos/${owner}/${repo}/contents/${targetFilePath}`,
            { params: { ref: branch } }
          );
          
          try {
            targetPlistData = plist.parse(fileData);
          } catch (parseError) {
            console.log(`Error parsing current plist from ${targetFilePath}:`, parseError.message);
            // Nếu parse lỗi, sử dụng plist từ nguồn ngoài
            targetPlistData = externalPlistData;
          }
          
          // Lấy SHA để update
          try {
            const { data: fileMeta } = await githubAxios.get(
              `https://api.github.com/repos/${owner}/${repo}/contents/${targetFilePath}`,
              { 
                params: { ref: branch },
                headers: { 
                  Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, 
                  Accept: 'application/json'
                }
              }
            );
            fileSha = fileMeta.sha;
          } catch (shaError) {
            console.log(`Error getting SHA for ${targetFilePath}:`, shaError.message);
          }
        } catch (error) {
          if (error.response && error.response.status === 404) {
            console.log(`Target file ${targetFilePath} not found, creating new.`);
            targetPlistData = externalPlistData;
          } else {
            console.log(`Error fetching target plist ${targetFilePath}:`, error.message);
            continue; // Bỏ qua file này
          }
        }

        // Xử lý cập nhật dữ liệu
        if (targetPlistData) {
          try {
            // Kiểm tra cấu trúc của plist trước khi update
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
                  console.log(`Updated IPA URL for ${targetFilePath}`);
                } else {
                  console.log(`Missing software-package asset in ${targetFilePath}`);
                }
              }

              // Update metadata
              if (targetItem.metadata && externalItem.metadata) {
                targetItem.metadata['bundle-identifier'] = externalItem.metadata['bundle-identifier'];
                targetItem.metadata['bundle-version'] = externalItem.metadata['bundle-version'];
              }
            } else {
              console.log(`Incorrect plist structure for ${targetFilePath}, using external data`);
              targetPlistData = externalPlistData; // Sử dụng hoàn toàn dữ liệu từ bên ngoài
            }
          } catch (updateError) {
            console.log(`Error updating plist structure for ${targetFilePath}:`, updateError.message);
            targetPlistData = externalPlistData; // Fallback to external data
          }
        } else {
          targetPlistData = externalPlistData;
        }

        // Chuyển đổi dữ liệu plist thành chuỗi
        let updatedPlistContent;
        try {
          updatedPlistContent = plist.build(targetPlistData);
        } catch (buildError) {
          console.log(`Error building plist for ${targetFilePath}:`, buildError.message);
          continue; // Bỏ qua nếu không build được
        }

        // Cập nhật file trên GitHub
        try {
          await githubAxios({
            method: 'put',
            url: `https://api.github.com/repos/${owner}/${repo}/contents/${targetFilePath}`,
            headers: { 
              Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
              Accept: 'application/vnd.github.v3+json'
            },
            data: {
              message: `Update ${targetFilePath} via Netlify Function`,
              content: Buffer.from(updatedPlistContent).toString('base64'),
              sha: fileSha,
              branch: branch
            }
          });

          console.log(`Successfully updated ${targetFilePath}`);
          updatesPerformed = true;
          
          // Cập nhật hash table
          updatedHashes[targetFilePath] = externalPlistHash;
        } catch (updateError) {
          console.log(`Error uploading updated plist ${targetFilePath}:`, updateError.message);
          if (updateError.response) {
            console.log('Status:', updateError.response.status);
            console.log('Data:', JSON.stringify(updateError.response.data));
          }
        }
      } catch (fileProcessingError) {
        console.log(`General error processing ${url} -> ${targetFilePath}:`, fileProcessingError.message);
        // Tiếp tục với file tiếp theo
      }
    }

    // Cập nhật file hash nếu có thay đổi
    if (JSON.stringify(currentHashes) !== JSON.stringify(updatedHashes)) {
      try {
        const updatedHashContent = Buffer.from(JSON.stringify(updatedHashes, null, 2)).toString('base64');

        // Lấy SHA của file hash hiện tại (nếu có)
        let hashFileSha = null;
        try {
          const { data: hashFileMeta } = await githubAxios.get(
            `https://api.github.com/repos/${owner}/${repo}/contents/${hashFilePath}`,
            { 
              headers: { 
                Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
                Accept: 'application/json'
              },
              params: { ref: branch }
            }
          );
          hashFileSha = hashFileMeta.sha;
        } catch (error) {
          if (error.response && error.response.status !== 404) {
            console.log('Error getting hash file SHA:', error.message);
          }
        }

        await githubAxios({
          method: 'put',
          url: `https://api.github.com/repos/${owner}/${repo}/contents/${hashFilePath}`,
          headers: { 
            Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
            Accept: 'application/vnd.github.v3+json'
          },
          data: {
            message: `Update plist hashes via Netlify Function`,
            content: updatedHashContent,
            sha: hashFileSha,
            branch: branch
          }
        });

        console.log('Successfully updated hash file.');
        updatesPerformed = true;
      } catch (hashUpdateError) {
        console.log('Error updating hash file:', hashUpdateError.message);
        if (hashUpdateError.response) {
          console.log('Status:', hashUpdateError.response.status);
          console.log('Data:', JSON.stringify(hashUpdateError.response.data));
        }
      }
    }

    // Trả về kết quả
    if (updatesPerformed) {
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          message: 'Plist files and/or hash file updated successfully',
          timestamp: new Date().toISOString()
        })
      };
    } else {
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          message: 'No updates were necessary. All files are up to date.',
          timestamp: new Date().toISOString()
        })
      };
    }
  } catch (error) {
    console.error('Critical error:', error.message);
    console.error('Stack:', error.stack);
    
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
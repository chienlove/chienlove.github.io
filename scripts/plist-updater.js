#!/usr/bin/env node
const fs = require('fs');
const axios = require('axios');
const plist = require('plist');
const crypto = require('crypto');

// Config - Giữ nguyên như file gốc
const CONFIG = {
  GITHUB_TOKEN: process.env.GITHUB_TOKEN,
  REPO_OWNER: 'chienlove',
  REPO_NAME: 'chienlove.github.io',
  BRANCH: 'master',
  HASH_FILE: 'static/plist_hashes.json',
  PLIST_MAPPINGS: {
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
  }
};

// Khởi tạo Axios
const githubApi = axios.create({
  baseURL: 'https://api.github.com',
  timeout: 5000,
  headers: {
    'Authorization': `Bearer ${CONFIG.GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github.v3+json'
  }
});

const externalApi = axios.create({ timeout: 5000 });

// Hàm chính
async function main() {
  try {
    console.log('🚀 Bắt đầu cập nhật plist...');
    const currentHashes = await getCurrentHashes();
    let updatedHashes = { ...currentHashes };
    let updatesPerformed = false;

    // Xử lý tuần tự từng plist
    for (const [sourceUrl, targetPath] of Object.entries(CONFIG.PLIST_MAPPINGS)) {
      const result = await processPlist(sourceUrl, targetPath, currentHashes);
      if (result.updated) {
        updatedHashes[targetPath] = result.hash;
        updatesPerformed = true;
      }
      await delay(500); // Đợi giữa các request
    }

    // Cập nhật file hash nếu có thay đổi
    if (updatesPerformed) {
      await updateHashFile(updatedHashes);
      console.log('✅ Đã cập nhật file hash');
    }

    console.log(updatesPerformed ? '✨ Hoàn thành!' : '🔄 Không có thay đổi');
    process.exit(0);

  } catch (error) {
    console.error('💥 Lỗi:', error.message);
    process.exit(1);
  }
}

// Chỉ cập nhật link IPA và bundle-identifier (giống yêu cầu)
async function processPlist(sourceUrl, targetPath, currentHashes) {
  console.log(`\n🔍 Đang xử lý: ${targetPath}`);
  
  try {
    // 1. Lấy plist nguồn
    const { data } = await externalApi.get(sourceUrl);
    const sourcePlist = plist.parse(data);
    
    // 2. Tính hash
    const newHash = crypto.createHash('sha256')
      .update(JSON.stringify(sourcePlist))
      .digest('hex');

    // 3. Kiểm tra cần cập nhật không
    if (currentHashes[targetPath] === newHash) {
      console.log('⏩ Bỏ qua (không thay đổi)');
      return { updated: false, hash: newHash };
    }

    // 4. Lấy plist đích hiện tại
    let targetPlist, fileSha;
    try {
      const fileRes = await githubApi.get(
        `/repos/${CONFIG.REPO_OWNER}/${CONFIG.REPO_NAME}/contents/${targetPath}`,
        { params: { ref: CONFIG.BRANCH } }
      );
      fileSha = fileRes.data.sha;
      targetPlist = plist.parse(Buffer.from(fileRes.data.content, 'base64').toString('utf8'));
    } catch (error) {
      if (error.response?.status !== 404) throw error;
      targetPlist = { items: [{}] }; // Tạo mới nếu file không tồn tại
    }

    // 5. Chỉ cập nhật 2 trường theo yêu cầu
    if (sourcePlist.items?.[0]?.assets && targetPlist.items?.[0]?.assets) {
      const sourceIpa = sourcePlist.items[0].assets.find(a => a.kind === 'software-package');
      const targetIpa = targetPlist.items[0].assets.find(a => a.kind === 'software-package');
      if (sourceIpa && targetIpa) targetIpa.url = sourceIpa.url;
    }

    if (sourcePlist.items?.[0]?.metadata && targetPlist.items?.[0]?.metadata) {
      targetPlist.items[0].metadata['bundle-identifier'] = 
        sourcePlist.items[0].metadata['bundle-identifier'];
    }

    // 6. Gửi cập nhật lên GitHub
    await githubApi.put(
      `/repos/${CONFIG.REPO_OWNER}/${CONFIG.REPO_NAME}/contents/${targetPath}`,
      {
        message: `Update ${targetPath.split('/').pop()}`,
        content: Buffer.from(plist.build(targetPlist)).toString('base64'),
        sha: fileSha,
        branch: CONFIG.BRANCH
      }
    );

    console.log('✅ Đã cập nhật link IPA và bundle-identifier');
    return { updated: true, hash: newHash };

  } catch (error) {
    console.error(`❌ Lỗi khi xử lý ${targetPath}:`, error.message);
    throw error;
  }
}

// Các hàm phụ trợ
async function getCurrentHashes() {
  try {
    const { data } = await githubApi.get(
      `/repos/${CONFIG.REPO_OWNER}/${CONFIG.REPO_NAME}/contents/${CONFIG.HASH_FILE}`,
      { params: { ref: CONFIG.BRANCH } }
    );
    return JSON.parse(Buffer.from(data.content, 'base64').toString('utf8'));
  } catch (error) {
    if (error.response?.status === 404) return {};
    throw error;
  }
}

async function updateHashFile(hashes) {
  const current = await getCurrentHashes();
  await githubApi.put(
    `/repos/${CONFIG.REPO_OWNER}/${CONFIG.REPO_NAME}/contents/${CONFIG.HASH_FILE}`,
    {
      message: 'Update plist hashes',
      content: Buffer.from(JSON.stringify(hashes, null, 2)).toString('base64'),
      sha: Object.keys(current).length > 0 ? (await githubApi.get(
        `/repos/${CONFIG.REPO_OWNER}/${CONFIG.REPO_NAME}/contents/${CONFIG.HASH_FILE}`,
        { params: { ref: CONFIG.BRANCH } }
      )).data.sha : null,
      branch: CONFIG.BRANCH
    }
  );
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Chạy chương trình
main();
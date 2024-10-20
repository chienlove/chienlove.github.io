// netlify/functions/download.js
const { execFile } = require('child_process');
const util = require('util');
const fs = require('fs').promises;
const path = require('path');
const fetch = require('node-fetch'); // Cần cài đặt package này
const execFileAsync = util.promisify(execFile);

const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // Đặt token trong biến môi trường

async function downloadFileFromGitHub(owner, repo, filePath) {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Error fetching file: ${response.statusText}`);
  }

  const data = await response.json();
  const downloadUrl = data.download_url;

  const fileResponse = await fetch(downloadUrl);
  if (!fileResponse.ok) {
    throw new Error(`Error downloading file: ${fileResponse.statusText}`);
  }

  return fileResponse.buffer(); // Trả về buffer của file
}

async function saveFile(buffer, filePath) {
  await fs.writeFile(filePath, buffer);
  await fs.chmod(filePath, '755'); // Đặt quyền thực thi cho file
}

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { bundleId, sessionInfo } = JSON.parse(event.body);
    
    // Cập nhật đường dẫn đến ipatool
    const ipatoolPath = path.join('/tmp', 'ipatool'); // Sử dụng đường dẫn tạm thời trong Netlify

    // Kiểm tra xem ipatool có sẵn không, nếu không thì tải xuống
    try {
      await fs.access(ipatoolPath); // Kiểm tra xem file có tồn tại không
    } catch (err) {
      // Nếu không tồn tại, tải xuống từ GitHub
      const ipatoolBuffer = await downloadFileFromGitHub('chienlove', 'chienlove.github.io', 'netlify/functions/bin/ipatool-2.1.4-linux-amd64');
      await saveFile(ipatoolBuffer, ipatoolPath); // Lưu file
    }

    // Use ipatool to download the IPA
    const { stdout } = await execFileAsync(ipatoolPath, ['download', '--bundle-identifier', bundleId, '--session-info', JSON.stringify(sessionInfo)]);
    
    // Parse the output to get the path of the downloaded IPA
    const downloadPath = JSON.parse(stdout).path;

    // Read the IPA file
    const ipaContent = await fs.readFile(downloadPath);

    // Delete the file after reading
    await fs.unlink(downloadPath);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${path.basename(downloadPath)}"`
      },
      body: ipaContent.toString('base64'),
      isBase64Encoded: true
    };
  } catch (error) {
    console.error('Download error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to download IPA',
        details: error.message 
      })
    };
  }
};
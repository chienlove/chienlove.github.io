// netlify/functions/authenticate.js
const { execFile } = require('child_process');
const util = require('util');
const fetch = require('node-fetch'); // Cần cài đặt package này
const execFileAsync = util.promisify(execFile);

const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // Đặt token trong biến môi trường

async function downloadFileFromGitHub(owner, repo, path) {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
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

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { appleId, password } = JSON.parse(event.body);
    
    // Download ipatool binary from GitHub
    const ipatoolBuffer = await downloadFileFromGitHub('chienlove', 'chienlove.github.io', 'netlify/functions/bin/ipatool-2.1.4-linux-amd64');
    
    // Save the ipatool binary temporarily
    const ipatoolPath = '/tmp/ipatool'; // Đường dẫn tạm thời trong môi trường Netlify
    require('fs').writeFileSync(ipatoolPath, ipatoolBuffer);
    require('fs').chmodSync(ipatoolPath, '755'); // Đặt quyền thực thi cho file

    // Use ipatool to authenticate
    const { stdout } = await execFileAsync(ipatoolPath, ['auth', 'login', '--apple-id', appleId, '--password', password]);
    
    // Parse the output to get the session information
    const sessionInfo = JSON.parse(stdout);

    // Use ipatool to get the list of purchased apps
    const { stdout: appsOutput } = await execFileAsync(ipatoolPath, ['list', '--purchased']);
    
    // Parse the output to get the list of apps
    const apps = JSON.parse(appsOutput).map(app => ({
      id: app.adamId,
      name: app.name,
      bundleId: app.bundleId,
      version: app.version
    }));

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        apps,
        sessionInfo
      })
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to authenticate',
        details: error.message 
      })
    };
  }
};
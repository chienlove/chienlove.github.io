const axios = require('axios');
const { plist } = require('plist');
const { GITHUB_TOKEN, GITHUB_REPO, GITHUB_BRANCH, HASH_FILE } = require('./config');

const githubAxios = axios.create({
  baseURL: 'https://api.github.com',
  headers: {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: 'application/vnd.github.v3+json'
  },
  timeout: 10000
});

async function getCurrentHashes() {
  try {
    const { data } = await githubAxios.get(
      `/repos/${GITHUB_REPO}/contents/${HASH_FILE}`,
      { params: { ref: GITHUB_BRANCH } }
    );
    return JSON.parse(Buffer.from(data.content, 'base64').toString('utf8'));
  } catch (error) {
    if (error.response?.status === 404) return {};
    throw error;
  }
}

async function updateHashFile(hashes) {
  try {
    const { data: currentFile } = await githubAxios.get(
      `/repos/${GITHUB_REPO}/contents/${HASH_FILE}`,
      { params: { ref: GITHUB_BRANCH } }
    ).catch(() => ({ data: null }));

    await githubAxios.put(
      `/repos/${GITHUB_REPO}/contents/${HASH_FILE}`,
      {
        message: 'Update plist hashes',
        content: Buffer.from(JSON.stringify(hashes, null, 2)).toString('base64'),
        sha: currentFile?.sha,
        branch: GITHUB_BRANCH
      }
    );
  } catch (error) {
    console.error('Failed to update hash file:', error.message);
    throw error;
  }
}

async function updateGitHubFile(filePath, plistData) {
  try {
    const { data: currentFile } = await githubAxios.get(
      `/repos/${GITHUB_REPO}/contents/${filePath}`,
      { params: { ref: GITHUB_BRANCH } }
    ).catch(() => ({ data: null }));

    const plistContent = plist.build(plistData);
    
    await githubAxios.put(
      `/repos/${GITHUB_REPO}/contents/${filePath}`,
      {
        message: `Update ${path.basename(filePath)}`,
        content: Buffer.from(plistContent).toString('base64'),
        sha: currentFile?.sha,
        branch: GITHUB_BRANCH
      }
    );
  } catch (error) {
    console.error(`Failed to update ${filePath}:`, error.message);
    throw error;
  }
}

module.exports = {
  getCurrentHashes,
  updateHashFile,
  updateGitHubFile
};
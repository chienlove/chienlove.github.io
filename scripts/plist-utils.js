const axios = require('axios');
const plist = require('plist');
const crypto = require('crypto');
const { updateGitHubFile } = require('./github-api');

const RETRY_CONFIG = {
  attempts: 3,
  delay: 1000
};

async function processPlist(url, filePath, currentHash, forceUpdate = false) {
  let attempt = 0;
  let lastError;
  
  while (attempt < RETRY_CONFIG.attempts) {
    try {
      const { data } = await axios.get(url, { timeout: 8000 });
      const plistData = plist.parse(data);
      const newHash = calculateHash(plistData);
      
      if (!forceUpdate && currentHash === newHash) {
        return { updated: false, hash: newHash };
      }
      
      await updateGitHubFile(filePath, plistData);
      return { updated: true, hash: newHash };
      
    } catch (error) {
      lastError = error;
      attempt++;
      if (attempt < RETRY_CONFIG.attempts) {
        await new Promise(resolve => setTimeout(resolve, RETRY_CONFIG.delay));
      }
    }
  }
  
  throw lastError;
}

async function processAllPlists(plistMappings, currentHashes, forceUpdate) {
  const results = [];
  const updatedHashes = { ...currentHashes };
  
  for (const [url, filePath] of Object.entries(plistMappings)) {
    try {
      const result = await processPlist(url, filePath, currentHashes[filePath], forceUpdate);
      results.push({ filePath, ...result, error: null });
      
      if (result.updated) {
        updatedHashes[filePath] = result.hash;
      }
    } catch (error) {
      results.push({ filePath, updated: false, error: error.message });
    }
  }
  
  return { results, updatedHashes };
}

function calculateHash(plistData) {
  return crypto.createHash('sha256')
    .update(JSON.stringify(plistData))
    .digest('hex');
}

module.exports = {
  processAllPlists,
  calculateHash
};
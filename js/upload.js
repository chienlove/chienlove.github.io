const { Octokit } = require('@octokit/rest');
const fs = require('fs');
const path = require('path');

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const owner = process.env.GITHUB_REPOSITORY_OWNER;
const repo = process.env.GITHUB_REPOSITORY_NAME;
const filePath = process.env.FILE_PATH;
const fileName = path.basename(filePath);

async function run() {
  try {
    const release = await octokit.repos.createRelease({
      owner,
      repo,
      tag_name: `v${Date.now()}`,
      name: 'New Release'
    });

    await octokit.repos.uploadReleaseAsset({
      owner,
      repo,
      release_id: release.data.id,
      name: fileName,
      data: fs.createReadStream(filePath),
      headers: {
        'content-length': fs.statSync(filePath).size,
        'content-type': 'application/octet-stream'
      }
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    process.exit(1);
  }
}

run();
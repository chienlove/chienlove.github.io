import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

const secret = process.env.JWT_SECRET;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = 'chienlove'; // Thay bằng thực tế
const REPO_NAME = 'chienlove.github.io'; // Thay bằng thực tế

export default async function handler(req, res) {
  const { id: releaseTag, token } = req.query;

  try {
    // 1. Verify JWT
    const decoded = jwt.verify(token, secret);
    if (decoded.id !== releaseTag) {
      return res.status(403).send('Invalid token');
    }

    // 2. Fetch release from GitHub
    const releaseUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/tags/${releaseTag}`;
    const releaseRes = await fetch(releaseUrl, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3+json"
      }
    });

    if (!releaseRes.ok) {
      const errorData = await releaseRes.json();
      console.error('GitHub API error:', errorData);
      return res.status(404).send('Release not found');
    }

    const releaseData = await releaseRes.json();
    const ipaAsset = releaseData.assets.find(a => a.name.endsWith('.ipa'));

    if (!ipaAsset) {
      return res.status(404).send('IPA file not found in release');
    }

    // 3. Load plist file
    const ipaName = ipaAsset.name.replace('.ipa', '');
    const plistPath = path.join(process.cwd(), 'secure/plist', `${ipaName}.plist`);

    if (!fs.existsSync(plistPath)) {
      return res.status(404).send('Plist file not found');
    }

    // 4. Return plist
    res.setHeader('Content-Type', 'application/x-plist');
    fs.createReadStream(plistPath).pipe(res);

  } catch (err) {
    console.error('Error in plist handler:', err);
    res.status(500).send('Internal Server Error');
  }
}
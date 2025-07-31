import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

const secret = process.env.JWT_SECRET;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = 'chienlove';
const REPO_NAME = 'chienlove.github.io';

export default async function handler(req, res) {
  const { id, token } = req.query;

  if (!id || !token) {
    return res.status(400).send('Missing id or token');
  }

  try {
    // Xác thực JWT
    const decoded = jwt.verify(token, secret);
    if (decoded.id !== id) return res.status(403).send('Invalid token');

    // Lấy thông tin release từ GitHub API
    const releaseUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/tags/${id}`;
    const releaseResponse = await fetch(releaseUrl, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!releaseResponse.ok) {
      return res.status(404).send('Release not found');
    }

    const releaseData = await releaseResponse.json();
    const ipaAsset = releaseData.assets.find((asset) => asset.name.endsWith('.ipa'));

    if (!ipaAsset) {
      return res.status(404).send('No IPA file found in release');
    }

    // Lấy tên IPA (bỏ đuôi .ipa)
    const ipaName = ipaAsset.name.replace('.ipa', '');
    const plistPath = path.join(process.cwd(), 'secure/plist', `${ipaName}.plist`);

    if (!fs.existsSync(plistPath)) {
      return res.status(404).send('Plist not found');
    }

    // Trả về plist
    res.setHeader('Content-Type', 'application/xml');
    fs.createReadStream(plistPath).pipe(res);
  } catch (err) {
    console.error(err);
    return res.status(500).send('Internal Server Error');
  }
}
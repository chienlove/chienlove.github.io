import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

const secret = process.env.JWT_SECRET;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = 'chienlgove';
const REPO_NAME = 'chienlove.github.io';

export default async function handler(req, res) {
  console.log('--- New plist request ---');
  console.log('Query params:', req.query);

  const { id, token } = req.query;

  try {
    // 1. Validate input
    if (!id || !token) {
      console.error('Missing id or token');
      return res.status(400).send('Missing id or token');
    }

    // 2. Verify JWT
    console.log('Verifying JWT...');
    const decoded = jwt.verify(token, secret);
    console.log('Decoded JWT:', decoded);

    if (decoded.id !== id) {
      console.error('Token ID mismatch');
      return res.status(403).send('Invalid token');
    }

    // 3. Get release info from GitHub
    console.log('Fetching release from GitHub...');
    const releaseUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/tags/${id}`;
    console.log('GitHub API URL:', releaseUrl);

    const releaseResponse = await fetch(releaseUrl, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!releaseResponse.ok) {
      console.error('GitHub API error:', releaseResponse.status, await releaseResponse.text());
      return res.status(404).send('Release not found');
    }

    const releaseData = await releaseResponse.json();
    console.log('Release data:', JSON.stringify(releaseData, null, 2));

    // 4. Find IPA asset
    const ipaAsset = releaseData.assets.find((asset) => asset.name.endsWith('.ipa'));
    if (!ipaAsset) {
      console.error('No IPA asset found');
      return res.status(404).send('No IPA file found in release');
    }

    // 5. Get plist path
    const ipaName = ipaAsset.name.replace('.ipa', '');
    const plistPath = path.join(process.cwd(), 'secure/plist', `${ipaName}.plist`);
    console.log('Looking for plist at:', plistPath);

    if (!fs.existsSync(plistPath)) {
      console.error('Plist file not found');
      return res.status(404).send('Plist not found');
    }

    // 6. Return plist
    console.log('Sending plist file...');
    res.setHeader('Content-Type', 'application/x-plist');
    fs.createReadStream(plistPath).pipe(res);

  } catch (err) {
    console.error('--- ERROR ---');
    console.error(err.stack);
    
    // Send detailed error in development
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? err.message 
      : 'Internal Server Error';
      
    res.status(500).send(errorMessage);
  }
}
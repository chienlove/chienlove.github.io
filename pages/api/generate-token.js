// pages/api/generate-token.js
import jwt from 'jsonwebtoken';

const secret = process.env.JWT_SECRET;

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST method is allowed' });
  }

  const { id, ipa_name } = req.body;

  if (!ipa_name) {
    return res.status(400).json({ error: 'Missing ipa_name in body' });
  }

  const payload = { ipa_name: encodeURIComponent(ipa_name) };
  if (id) payload.id = id;

  const token = jwt.sign(payload, secret, { expiresIn: '30s' });

  const installUrl = `itms-services://?action=download-manifest&url=${
    encodeURIComponent(`https://storeios.net/api/plist?ipa_name=${encodeURIComponent(ipa_name)}&token=${token}`)
  }`;

  res.status(200).json({ installUrl, token });
}
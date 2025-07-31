import jwt from 'jsonwebtoken';

const secret = process.env.JWT_SECRET;

export default function handler(req, res) {
  const { id, ipa_name } = req.query; // Thêm ipa_name từ client

  if (!id || !ipa_name) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  const token = jwt.sign({ 
    id,
    ipa_name // Thêm ipa_name vào token
  }, secret, { expiresIn: '5m' });

  const plistUrl = `https://storeios.net/api/plist?ipa_name=${encodeURIComponent(ipa_name)}&token=${encodeURIComponent(token)}`;
  const installUrl = `itms-services://?action=download-manifest&url=${encodeURIComponent(plistUrl)}`;

  res.status(200).json({ installUrl });
}
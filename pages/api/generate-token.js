import jwt from 'jsonwebtoken';

const secret = process.env.JWT_SECRET;

export default function handler(req, res) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid ID' });
  }

  const token = jwt.sign({ id }, secret, { expiresIn: '60s' });
  const plistUrl = `https://storeios.net/api/plist?id=${id}&token=${encodeURIComponent(token)}`;
  const installUrl = `itms-services://?action=download-manifest&url=${encodeURIComponent(plistUrl)}`;

  res.status(200).json({ installUrl });
}
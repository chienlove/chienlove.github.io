import jwt from 'jsonwebtoken';

const secret = process.env.JWT_SECRET;

export default function handler(req, res) {
  const { id, ipa_name } = req.query;

  if (!id || !ipa_name) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  // Giữ nguyên tên IPA (không chuẩn hóa) nhưng encode URI component
  const token = jwt.sign({ 
    id,
    ipa_name: encodeURIComponent(ipa_name) // Thêm encodeURIComponent ở đây
  }, secret, { expiresIn: '5m' });

  const installUrl = `itms-services://?action=download-manifest&url=${
    encodeURIComponent(`https://storeios.net/api/plist?ipa_name=${encodeURIComponent(ipa_name)}&token=${token}`)
  }`;

  res.status(200).json({ installUrl });
}
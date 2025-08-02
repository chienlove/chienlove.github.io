import jwt from 'jsonwebtoken';

const secret = process.env.JWT_SECRET;

export default function handler(req, res) {
  const { id, ipa_name } = req.query;

  if (!ipa_name) {
    return res.status(400).json({ error: 'Missing ipa_name parameter' });
  }

  const payload = {
    ipa_name: encodeURIComponent(ipa_name),
  };

  if (id) {
    payload.id = id;
  }

  const token = jwt.sign(payload, secret, { expiresIn: '2m' });

  const installUrl = `itms-services://?action=download-manifest&url=${
    encodeURIComponent(`https://storeios.net/api/plist?ipa_name=${encodeURIComponent(ipa_name)}&token=${token}`)
  }`;

  res.status(200).json({ installUrl, token });
}

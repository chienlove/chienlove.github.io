// pages/api/admin/generate-install-url.js
import jwt from 'jsonwebtoken';

const secret = process.env.JWT_SECRET;

export default function handler(req, res) {
  // Chỉ cho phép POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id, ipa_name } = req.body;

  // Kiểm tra tham số
  if (!id || !ipa_name) {
    return res.status(400).json({ error: 'Missing id or ipa_name' });
  }

  // Kiểm tra JWT_SECRET
  if (!secret) {
    console.error('JWT_SECRET is not set in environment variables');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    // Tạo token, giữ nguyên tên ipa_name nhưng encode khi dựng URL
    const token = jwt.sign(
      { id, ipa_name },
      secret,
      { expiresIn: '5m' }
    );

    const plistUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/api/plist?ipa_name=${encodeURIComponent(
      ipa_name
    )}&token=${token}`;

    const installUrl = `itms-services://?action=download-manifest&url=${encodeURIComponent(plistUrl)}`;

    res.status(200).json({ installUrl });
  } catch (err) {
    console.error('JWT Sign Error:', err);
    res.status(500).json({ error: 'Could not generate token' });
  }
}
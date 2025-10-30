// pages/api/plist.js
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const secret = process.env.JWT_SECRET;
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

export default async function handler(req, res) {
  const { ipa_name: encodedIpaName, token, source, install } = req.query || {};
  try {
    if (!encodedIpaName || !token) return res.status(400).send('Missing params');

    // HEAD check không đếm
    const isHEAD = req.method === 'HEAD';

    const decoded = jwt.verify(token, secret);
    const requestedIpaName = decodeURIComponent(encodedIpaName);
    const tokenIpaName = decodeURIComponent(decoded.ipa_name || '');

    if (tokenIpaName !== requestedIpaName) {
      console.error(`Tên IPA không khớp: ${tokenIpaName} (token) vs ${requestedIpaName} (request)`);
      return res.status(403).send('Invalid token');
    }

    // ✅ Đếm INSTALLS: chỉ khi GET thực sự để cài, có install=1 và không phải proxy
    if (!isHEAD && install === '1' && source !== 'proxy' && decoded.id) {
      await supabase.rpc('increment_app_installs', { app_id: decoded.id }).catch(console.error);
    }

    // Trả về file .plist sẵn có
    const plistPath = path.join(process.cwd(), 'secure/plist', `${requestedIpaName}.plist`);
    if (!fs.existsSync(plistPath)) {
      console.error('Không tìm thấy file:', plistPath);
      return res.status(404).send(`Plist not found for ${requestedIpaName}`);
    }

    res.setHeader('Content-Type', 'application/x-plist');

    // HEAD sẽ chỉ trả header 200/Content-Type
    if (isHEAD) return res.status(200).end();

    fs.createReadStream(plistPath).pipe(res);
  } catch (err) {
    console.error('plist error:', err);
    res.status(/token|expired|jwt/i.test(err?.message) ? 401 : 500).send('Internal Server Error');
  }
}
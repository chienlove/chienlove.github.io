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

    // HEAD check: chỉ xác minh, không stream, không đếm
    const isHEAD = req.method === 'HEAD';

    const decoded = jwt.verify(token, secret);
    const requestedIpaName = decodeURIComponent(encodedIpaName);
    const tokenIpaName = decodeURIComponent(decoded.ipa_name || '');

    if (tokenIpaName !== requestedIpaName) {
      console.error(`Tên IPA không khớp: ${tokenIpaName} (token) vs ${requestedIpaName} (request)`);
      return res.status(403).send('Invalid token');
    }

    // ✅ Đếm INSTalls: chỉ khi GET thật sự cài (install=1) và không phải proxy
    if (!isHEAD && install === '1' && source !== 'proxy' && decoded.id) {
      try {
        const { error } = await supabase.rpc('increment_app_installs', { app_id: decoded.id });
        if (error) console.error('increment_app_installs error:', error);
      } catch (e) {
        console.error('RPC installs try/catch:', e);
      }
    }

    // Trả về file .plist
    const plistPath = path.join(process.cwd(), 'secure', 'plist', `${requestedIpaName}.plist`);
    if (!fs.existsSync(plistPath)) {
      console.error('Không tìm thấy file:', plistPath);
      return res.status(404).send(`Plist not found for ${requestedIpaName}`);
    }

    res.setHeader('Content-Type', 'application/x-plist');

    // HEAD: đủ header là pass
    if (isHEAD) return res.status(200).end();

    fs.createReadStream(plistPath).pipe(res);
  } catch (err) {
    console.error('plist error:', err);
    const status = /expired|jwt|signature|token/i.test(String(err?.message)) ? 401 : 500;
    res.status(status).send(status === 401 ? 'Unauthorized' : 'Internal Server Error');
  }
}
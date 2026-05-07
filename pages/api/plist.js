// pages/api/plist.js
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

export const config = { api: { responseLimit: false } };

const secret = process.env.JWT_SECRET;
if (!secret) {
  throw new Error('Missing JWT_SECRET');
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

export default async function handler(req, res) {
  try {
    const { ipa_name: encodedIpaName, token } = req.query || {};
    const installFlag = req.query?.install === '1';
    const source = req.query?.source || ''; // dùng 'proxy' để tránh double count nếu cần

    if (!encodedIpaName || !token) {
      return res.status(400).send('Missing params');
    }

    // 1) Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch (e) {
      return res.status(403).send('Invalid token');
    }

    const requestedIpaName = decodeURIComponent(encodedIpaName);
    const tokenIpaName = decodeURIComponent(decoded.ipa_name || '');
    if (tokenIpaName !== requestedIpaName) {
      return res.status(403).send('Invalid token payload');
    }

    // 2) Resolve plist path
    const plistPath = path.join(process.cwd(), 'secure/plist', `${requestedIpaName}.plist`);
    if (req.method === 'HEAD') {
      // Chỉ kiểm tra tồn tại
      return fs.existsSync(plistPath) ? res.status(200).end() : res.status(404).end();
    }

    if (!fs.existsSync(plistPath)) {
      return res.status(404).send(`Plist not found for ${requestedIpaName}`);
    }

    // 3) Đếm installs nếu có id và đây là yêu cầu cài đặt thực sự
    if (installFlag && source !== 'proxy' && decoded.id) {
      try {
        const { error } = await supabase.rpc('increment_app_installs', { app_id: decoded.id });
        if (error) console.error('[RPC installs] error:', error, 'app_id:', decoded.id);
      } catch (e) {
        console.error('[RPC installs] try/catch:', e, 'app_id:', decoded.id);
      }
    }

    // 4) Stream file .plist
    res.setHeader('Content-Type', 'application/x-plist');
    const stream = fs.createReadStream(plistPath);
    stream.on('error', (e) => {
      console.error('Plist stream error:', e);
      res.status(500).end('Stream error');
    });
    stream.pipe(res);
  } catch (err) {
    console.error('plist error:', err);
    res.status(500).send('Internal Server Error');
  }
}
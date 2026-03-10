// pages/api/download-ipa.js
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

export const config = { api: { responseLimit: false } };

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

function verifyTokenOrThrow(token, ua) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('Missing JWT_SECRET');
  const decoded = jwt.verify(token, secret);

  const uaHash = crypto.createHash('sha256').update(ua || '').digest('hex');
  if (decoded.ua && decoded.ua !== uaHash) throw new Error('UA mismatch');

  return decoded;
}

async function getAppBySlugOrId({ slug, id }) {
  if (slug) {
    const { data, error } = await supabase
      .from('apps')
      .select('*')
      .ilike('slug', String(slug))
      .single();
    if (!error && data) return data;
  }

  if (id) {
    const { data } = await supabase
      .from('apps')
      .select('*')
      .eq('id', id)
      .single();
    if (data) return data;
  }

  return null;
}

// Trích url .ipa từ plist
function extractIpaUrlFromPlist(plistText) {
  const m = String(plistText).match(
    /<key>url<\/key>\s*<string>([^<]+\.ipa)<\/string>/i
  );
  return m?.[1] || null;
}

export default async function handler(req, res) {
  try {
    // Chỉ cho GET
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { slug, token } = req.query || {};
    if (!slug || !token) return res.status(400).json({ error: 'Missing slug or token' });

    // Verify JWT + UA
    const payload = verifyTokenOrThrow(token, req.headers['user-agent']);

    // Lấy app
    const app = await getAppBySlugOrId({ slug, id: payload.id });
    if (!app) return res.status(404).json({ error: 'App not found' });

    // Lấy plistName từ app.download_link
    const plistName = (app.download_link || '').trim();
    if (!plistName) return res.status(400).json({ error: 'No ipa mapping' });

    // TỐI ƯU: Thay vì fetch HTTP qua /api/plist, ta đọc trực tiếp file từ hệ thống
    const plistPath = path.join(process.cwd(), 'secure/plist', `${plistName}.plist`);
    
    if (!fs.existsSync(plistPath)) {
      return res.status(404).json({ error: `Plist file not found for ${plistName}` });
    }

    // Đọc file và lấy URL IPA
    const plistText = fs.readFileSync(plistPath, 'utf8');
    const ipaUrl = extractIpaUrlFromPlist(plistText);
    
    if (!ipaUrl) {
      return res.status(500).json({ error: 'IPA url not found in plist' });
    }

    // Đếm downloads (server side)
    try {
      const { error } = await supabase.rpc('increment_app_downloads', { app_id: app.id });
      if (error) console.error('[RPC downloads] error:', error, 'app_id:', app.id);
    } catch (e) {
      console.error('[RPC downloads] try/catch:', e, 'app_id:', app.id);
    }

    // Redirect thẳng đến link IPA
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.setHeader('Referrer-Policy', 'no-referrer');

    return res.redirect(302, ipaUrl);

  } catch (err) {
    console.error('download-ipa error:', err);

    const msg = err?.message || 'Bad Request';
    const status =
      /expired|jwt|signature|token|UA mismatch/i.test(String(msg)) ? 401 : 400;

    return res.status(status).json({ error: msg });
  }
}

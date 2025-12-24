// pages/api/download-ipa.js
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// Không cần responseLimit false nữa vì không stream,
// nhưng giữ lại cũng không sao.
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

  return decoded; // { id, ipa_name, iat, exp, ... }
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

// Trích url .ipa từ plist (giữ regex giống bạn)
function extractIpaUrlFromPlist(plistText) {
  const m = String(plistText).match(
    /<key>url<\/key>\s*<string>([^<]+\.ipa)<\/string>/i
  );
  return m?.[1] || null;
}

export default async function handler(req, res) {
  try {
    // Chỉ cho GET (tránh bot post lung tung)
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { slug, token } = req.query || {};
    if (!slug || !token) return res.status(400).json({ error: 'Missing slug or token' });

    // Verify JWT (ngắn hạn) + UA
    const payload = verifyTokenOrThrow(token, req.headers['user-agent']);

    // Lấy app
    const app = await getAppBySlugOrId({ slug, id: payload.id });
    if (!app) return res.status(404).json({ error: 'App not found' });

    // Lấy plistName từ app.download_link
    const plistName = (app.download_link || '').trim();
    if (!plistName) return res.status(400).json({ error: 'No ipa mapping' });

    // Base URL để gọi nội bộ các API khác
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const host  = req.headers['x-forwarded-host'] || req.headers.host;
    const base  = `${proto}://${host}`;

    // 1) Lấy token cho /api/plist (để đọc URL IPA từ manifest)
    const tRes = await fetch(`${base}/api/generate-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Giữ nguyên input như code bạn
      body: JSON.stringify({ ipa_name: plistName, id: app.id })
    });

    if (!tRes.ok) {
      return res.status(500).json({ error: `Cannot get plist token: HTTP ${tRes.status}` });
    }

    const tJson = await tRes.json().catch(() => ({}));
    const plistToken = tJson?.token;
    if (!plistToken) return res.status(500).json({ error: 'Missing plist token' });

    // 2) Fetch plist và trích xuất ipaUrl
    const plistUrl = `${base}/api/plist?ipa_name=${encodeURIComponent(plistName)}&token=${encodeURIComponent(plistToken)}`;
    const pRes = await fetch(plistUrl);

    if (!pRes.ok) {
      // Nếu token hết hạn / sai -> trả 403/401 tuỳ api/plist của bạn
      return res.status(500).json({ error: `Cannot fetch plist: HTTP ${pRes.status}` });
    }

    const plistText = await pRes.text();
    const ipaUrl = extractIpaUrlFromPlist(plistText);
    if (!ipaUrl) return res.status(500).json({ error: 'IPA url not found in plist' });

    // 3) Đếm downloads (server side) -- giữ RPC bạn đang dùng
    try {
      const { error } = await supabase.rpc('increment_app_downloads', { app_id: app.id });
      if (error) console.error('[RPC downloads] error:', error, 'app_id:', app.id);
    } catch (e) {
      console.error('[RPC downloads] try/catch:', e, 'app_id:', app.id);
    }

    // 4) Redirect 302 thẳng đến ipaUrl (KHÔNG stream qua Vercel)
    // - no-store để tránh cache sai token/đếm
    // - Referrer-Policy để hạn chế lộ URL trang nếu muốn
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.setHeader('Referrer-Policy', 'no-referrer');

    // Nếu bạn muốn "ép download tên file" thì phải làm ở host đích.
    // GitHub Releases thường trả attachment đúng rồi.
    return res.redirect(302, ipaUrl);

  } catch (err) {
    console.error('download-ipa error:', err);

    const msg = err?.message || 'Bad Request';
    const status =
      /expired|jwt|signature|token|UA mismatch/i.test(String(msg)) ? 401 : 400;

    return res.status(status).json({ error: msg });
  }
}
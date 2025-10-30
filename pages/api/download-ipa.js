// pages/api/download-ipa.js
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
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

export default async function handler(req, res) {
  try {
    const { slug, token } = req.query || {};
    if (!slug || !token) return res.status(400).json({ error: 'Missing slug or token' });

    const payload = verifyTokenOrThrow(token, req.headers['user-agent']);
    const app = await getAppBySlugOrId({ slug, id: payload.id });
    if (!app) return res.status(404).json({ error: 'App not found' });

    const plistName = (app.download_link || '').trim();
    if (!plistName) return res.status(400).json({ error: 'No ipa mapping' });

    const proto = req.headers['x-forwarded-proto'] || 'https';
    const host  = req.headers['x-forwarded-host'] || req.headers.host;
    const base  = `${proto}://${host}`;

    // Lấy token cho /api/plist (để đọc URL IPA từ manifest)
    const tRes = await fetch(`${base}/api/generate-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ipa_name: plistName, id: app.id })
    });
    if (!tRes.ok) return res.status(500).json({ error: `Cannot get plist token: HTTP ${tRes.status}` });
    const { token: plistToken } = await tRes.json();
    if (!plistToken) return res.status(500).json({ error: 'Missing plist token' });

    // Lấy manifest và trích xuất URL IPA
    const plistUrl = `${base}/api/plist?ipa_name=${encodeURIComponent(plistName)}&token=${encodeURIComponent(plistToken)}`;
    const pRes = await fetch(plistUrl);
    if (!pRes.ok) return res.status(500).json({ error: `Cannot fetch plist: HTTP ${pRes.status}` });
    const plistText = await pRes.text();
    const m = plistText.match(/<key>url<\/key>\s*<string>([^<]+\.ipa)<\/string>/i);
    if (!m || !m[1]) return res.status(500).json({ error: 'IPA url not found in plist' });
    const ipaUrl = m[1];

    // Tải IPA thật & stream về client
    const upstream = await fetch(ipaUrl, { method: 'GET' });
    if (!upstream.ok) return res.status(upstream.status).end();

    // ✅ Đếm downloads (server side)
    try {
      const { error } = await supabase.rpc('increment_app_downloads', { app_id: app.id });
      if (error) console.error('[RPC downloads] error:', error, 'app_id:', app.id);
    } catch (e) {
      console.error('[RPC downloads] try/catch:', e, 'app_id:', app.id);
    }

    const filename = `${app.slug || 'app'}.ipa`;
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    const len = upstream.headers.get('content-length');
    if (len) res.setHeader('Content-Length', len);

    if (upstream.body?.pipe) {
      upstream.body.pipe(res);
    } else if (upstream.body?.getReader) {
      const reader = upstream.body.getReader();
      const pump = async () => {
        const { value, done } = await reader.read();
        if (done) return res.end();
        res.write(Buffer.isBuffer(value) ? value : Buffer.from(value));
        return pump();
      };
      await pump();
    } else {
      const buf = Buffer.from(await upstream.arrayBuffer());
      res.end(buf);
    }
  } catch (err) {
    console.error('download-ipa error:', err);
    const status = /expired|jwt|signature|token|UA mismatch/i.test(String(err?.message)) ? 401 : 400;
    return res.status(status).json({ error: err?.message || 'Bad Request' });
  }
}
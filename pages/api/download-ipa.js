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
  return decoded; // { id?, ipa_name, ua?, iat, exp }
}

async function getApp({ slug, id }) {
  if (slug) {
    const { data } = await supabase.from('apps').select('*').ilike('slug', String(slug)).single();
    if (data) return data;
  }
  if (id) {
    const { data } = await supabase.from('apps').select('*').eq('id', id).single();
    if (data) return data;
  }
  return null;
}

export default async function handler(req, res) {
  try {
    const { slug, token } = req.query || {};
    if (!slug || !token) return res.status(400).json({ error: 'Missing params' });

    const payload = verifyTokenOrThrow(token, req.headers['user-agent']);
    const app = await getApp({ slug, id: payload.id });
    if (!app) return res.status(404).json({ error: 'App not found' });

    const plistName = (app.download_link || '').trim();
    if (!plistName) return res.status(400).json({ error: 'No ipa mapping' });

    const proto = req.headers['x-forwarded-proto'] || 'https';
    const host  = req.headers['x-forwarded-host'] || req.headers.host;
    const base  = `${proto}://${host}`;

    // Lấy token cho /api/plist
    const tRes = await fetch(`${base}/api/generate-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ipa_name: plistName, id: app.id })
    });
    if (!tRes.ok) return res.status(500).json({ error: 'Token error' });
    const { token: plistToken } = await tRes.json();

    // Thêm source=proxy để /api/plist không cộng installs
    const plistUrl = `${base}/api/plist?ipa_name=${encodeURIComponent(plistName)}&token=${encodeURIComponent(plistToken)}&source=proxy`;
    const pRes = await fetch(plistUrl);
    if (!pRes.ok) return res.status(500).json({ error: 'Manifest fail' });

    const plistText = await pRes.text();
    const m = plistText.match(/<key>url<\/key>\s*<string>([^<]+\.ipa)<\/string>/i);
    if (!m || !m[1]) return res.status(500).json({ error: 'IPA missing' });
    const ipaUrl = m[1];

    // Proxy stream IPA
    const upstream = await fetch(ipaUrl);
    if (!upstream.ok) return res.status(upstream.status).end();

    // ✅ Đếm DOWNLOADS (server side)
    await supabase.rpc('increment_app_downloads', { app_id: app.id }).catch(console.error);

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${app.slug}.ipa"`);
    const len = upstream.headers.get('content-length');
    if (len) res.setHeader('Content-Length', len);

    if (upstream.body?.pipe) {
      upstream.body.pipe(res);
    } else if (upstream.body?.getReader) {
      const reader = upstream.body.getReader();
      const pump = async () => {
        const { value, done } = await reader.read();
        if (done) return res.end();
        res.write(Buffer.from(value));
        return pump();
      };
      await pump();
    } else {
      const buf = Buffer.from(await upstream.arrayBuffer());
      res.end(buf);
    }
  } catch (err) {
    console.error('download-ipa error:', err);
    return res.status(/token|expired|jwt/i.test(err.message) ? 401 : 400).json({ error: err.message });
  }
}
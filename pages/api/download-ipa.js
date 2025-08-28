// pages/api/download-ipa.js
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

export const config = { api: { responseLimit: false } }; // cho phép stream file lớn

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

function verifyTokenOrThrow(token, ua) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('Missing JWT_SECRET');
  const decoded = jwt.verify(token, secret); // sẽ throw nếu invalid/expired

  // Ánh xạ user-agent để hạn chế share link
  const uaHash = crypto.createHash('sha256').update(ua || '').digest('hex');
  if (decoded.ua && decoded.ua !== uaHash) {
    throw new Error('UA mismatch');
  }
  return decoded; // { id, slug, ua, jti, iat, exp }
}

async function getAppBySlugOrId({ slug, id }) {
  // Ưu tiên slug từ query, fallback id từ token
  if (slug) {
    const { data, error } = await supabase.from('apps').select('*').ilike('slug', String(slug)).single();
    if (!error && data) return data;
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
    if (!slug || !token) {
      return res.status(400).json({ error: 'Missing slug or token' });
    }

    // 1) Verify token (jsonwebtoken)
    const payload = verifyTokenOrThrow(token, req.headers['user-agent']);

    // (Tuỳ chọn) kiểm tra jti 1-lần-dùng tại đây nếu bạn muốn
    // await assertJtiNotUsed(payload.jti); await markJtiUsed(payload.jti);

    // 2) Lấy app theo slug (ưu tiên), nếu không có thì theo id trong token
    const app = await getAppBySlugOrId({ slug, id: payload.id });
    if (!app) return res.status(404).json({ error: 'App not found' });

    // 3) Lấy tên "plist/ipa name" từ DB (bạn đang dùng cột download_link làm tên plist)
    const plistName = (app.download_link || '').trim();
    if (!plistName) return res.status(400).json({ error: 'No plist/ipa mapping for this app' });

    // >>> Cách B: tự suy ra base từ header, bỏ phụ thuộc NEXT_PUBLIC_BASE_URL
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const host  = req.headers['x-forwarded-host'] || req.headers.host;
    const base  = `${proto}://${host}`;

    // 4) Gọi API generate-token đã có sẵn của bạn để lấy token cho /api/plist
    const tRes = await fetch(`${base}/api/generate-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // /api/generate-token cần "ipa_name"
      body: JSON.stringify({ ipa_name: plistName, id: app.id })
    });
    if (!tRes.ok) return res.status(500).json({ error: `Cannot get plist token: HTTP ${tRes.status}` });
    const { token: plistToken } = await tRes.json();
    if (!plistToken) return res.status(500).json({ error: 'Missing plist token' });

    // 5) Gọi /api/plist để lấy nội dung manifest và trích URL .ipa
    const plistUrl = `${base}/api/plist?ipa_name=${encodeURIComponent(plistName)}&token=${encodeURIComponent(plistToken)}`;
    const pRes = await fetch(plistUrl);
    if (!pRes.ok) return res.status(500).json({ error: `Cannot fetch plist: HTTP ${pRes.status}` });

    const plistText = await pRes.text();
    const m = plistText.match(/<key>url<\/key>\s*<string>([^<]+\.ipa)<\/string>/i);
    if (!m || !m[1]) return res.status(500).json({ error: 'IPA url not found in plist' });
    const ipaUrl = m[1];

    // 6) Proxy stream IPA về client (ẩn ipaUrl thật)
    const upstream = await fetch(ipaUrl, { method: 'GET' });
    if (!upstream.ok) return res.status(upstream.status).end();

    // Gợi ý filename tải về
    const filename = `${app.slug || 'app'}.ipa`;
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const len = upstream.headers.get('content-length');
    if (len) res.setHeader('Content-Length', len);

    // Node.js runtime: upstream.body là ReadableStream (Web) trong Next 13+
    if (upstream.body && typeof upstream.body.pipe === 'function') {
      // (Trong một số môi trường fetch trả về Node stream)
      upstream.body.pipe(res);
    } else if (upstream.body && upstream.body.getReader) {
      // (Web stream) -- đọc tuần tự và ghi ra response
      const reader = upstream.body.getReader();
      const pump = async () => {
        const { value, done } = await reader.read();
        if (done) return res.end();
        res.write(Buffer.isBuffer(value) ? value : Buffer.from(value));
        return pump();
      };
      await pump();
    } else {
      // Fallback: đọc toàn bộ
      const buf = Buffer.from(await upstream.arrayBuffer());
      res.end(buf);
    }

    // 7) (khuyên dùng) tăng download counter & mark jti used (async)
    // fetch(`${base}/api/admin/add-download?id=${app.id}`, { method: 'POST' }).catch(() => {});
    // await markJtiUsed(payload.jti);

  } catch (err) {
    console.error('download-ipa error:', err);
    const status = /expired|jwt|signature|token|UA mismatch/i.test(String(err?.message)) ? 401 : 400;
    return res.status(status).json({ error: err?.message || 'Bad Request' });
  }
}
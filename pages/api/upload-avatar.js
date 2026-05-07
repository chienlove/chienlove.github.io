// pages/api/upload-avatar.js
export const config = { api: { bodyParser: false } };

import { createClient } from '@supabase/supabase-js';

// Dùng service role ở server
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

function readRaw(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (d) => chunks.push(d));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// Lấy đuôi file từ content-type hoặc tên gốc
function extFrom(contentType = '', filename = '') {
  const byCT = contentType.split('/')[1]?.split(';')[0]?.trim();
  if (byCT) {
    if (byCT === 'jpeg') return 'jpg';
    return byCT;
  }
  const m = filename.toLowerCase().match(/\.(png|jpg|jpeg|gif|webp|avif|bmp)$/i);
  return m ? m[1].replace('jpeg','jpg') : 'png';
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const uid = req.headers['x-user-uid'];
    const filenameEnc = req.headers['x-file-name'] || '';
    const filename = decodeURIComponent(String(filenameEnc));
    const contentType = req.headers['x-content-type'] || 'application/octet-stream';
    if (!uid || !filename) return res.status(400).json({ error: 'Missing uid or filename' });

    const buf = await readRaw(req);

    // ✅ Chỉ 1 file/avatar duy nhất -> đặt path cố định
    const ext = extFrom(contentType, filename);
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'avatars';
    const fixedPath = `${uid}/avatar.${ext}`;

    // Upload với upsert = true để GHI ĐÈ
    const { error: upErr } = await supabaseAdmin
      .storage
      .from(bucket)
      .upload(fixedPath, buf, { contentType, upsert: true });

    if (upErr) return res.status(500).json({ error: upErr.message });

    // (Tuỳ chọn) DỌN RÁC: xoá các file khác trong thư mục uid/
    try {
      const { data: list } = await supabaseAdmin.storage.from(bucket).list(uid, { limit: 100 });
      const toRemove = (list || [])
        .map(it => it.name)
        .filter(name => name !== `avatar.${ext}`) // giữ lại duy nhất avatar.ext mới
        .map(name => `${uid}/${name}`);

      if (toRemove.length) {
        await supabaseAdmin.storage.from(bucket).remove(toRemove);
      }
    } catch { /* bỏ qua nếu list/remove lỗi, không ảnh hưởng chức năng chính */ }

    // Lấy public URL (vì bucket public). Thêm ?v để phá cache CDN
    const { data: pub } = supabaseAdmin.storage.from(bucket).getPublicUrl(fixedPath);
    const version = Date.now();
    const url = pub?.publicUrl ? `${pub.publicUrl}?v=${version}` : null;

    return res.status(200).json({ url, path: fixedPath, version });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}